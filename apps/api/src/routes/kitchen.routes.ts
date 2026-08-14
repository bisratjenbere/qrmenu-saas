import { FastifyInstance } from 'fastify';
import {
  updateOrderItemStatusSchema,
  VALID_ORDER_ITEM_TRANSITIONS,
  numberFromDecimal,
} from '@qrmenu/shared';
import { requireStaff } from '../middleware/auth.middleware.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { sseService } from '../services/sse.service.js';
import { assertBranchAccess } from '../utils/tenant-scope.js';

export async function kitchenRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireStaff);

  fastify.get('/:branchId/active', async (request: any, reply) => {
    const { branchId } = request.params;

    await assertBranchAccess(fastify.prisma, request.staff, branchId, 'Branch not found');

    const items = await fastify.prisma.orderItem.findMany({
      where: {
        order: {
          branchId,
          status: { in: ['NEW', 'SEEN'] },
        },
      },
      include: { order: true },
      orderBy: { order: { createdAt: 'asc' } },
    });

    const formattedItems = items.map(i => ({
      id: i.id,
      orderId: i.orderId,
      menuItemId: i.menuItemId,
      clientLineId: i.clientLineId,
      itemNameSnapshot: i.itemNameSnapshot,
      itemNameAmSnapshot: i.itemNameAmSnapshot,
      priceSnapshot: numberFromDecimal(i.priceSnapshot),
      modifiersSnapshot: i.modifiersSnapshot || [],
      lineTotal: numberFromDecimal(i.lineTotal),
      quantity: i.quantity,
      notes: i.notes,
      status: i.status,
      order: {
        tableNumber: i.order.tableNumber,
        fulfillmentType: i.order.fulfillmentType,
        createdAt: i.order.createdAt,
        grandTotal: numberFromDecimal(i.order.grandTotal),
      },
    }));

    return reply.status(200).send({ items: formattedItems });
  });

  fastify.patch('/items/:orderItemId', async (request: any, reply) => {
    const { orderItemId } = request.params;
    const { status, undo } = updateOrderItemStatusSchema.parse(request.body);

    const orderItem = await fastify.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: { include: { branch: true } } },
    });

    if (!orderItem) throw new NotFoundError('Order item not found');

    await assertBranchAccess(
      fastify.prisma,
      request.staff,
      orderItem.order.branchId,
      'Order item not found'
    );

    let newStatus = status;
    if (undo && orderItem.previousStatus) {
      newStatus = orderItem.previousStatus;
    } else if (!undo) {
      const allowed = VALID_ORDER_ITEM_TRANSITIONS[orderItem.status] || [];
      if (!allowed.includes(status)) {
        throw new ValidationError(
          `Cannot transition from ${orderItem.status} to ${status}`
        );
      }
    }

    const updated = await fastify.prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        previousStatus: undo ? null : orderItem.status,
        status: newStatus,
      },
    });

    sseService.emitEvent(orderItem.order.branchId, 'order-item-updated', {
      id: orderItemId,
      orderId: orderItem.orderId,
      status: newStatus,
    });

    return reply.status(200).send({
      id: updated.id,
      status: updated.status,
    });
  });
}
