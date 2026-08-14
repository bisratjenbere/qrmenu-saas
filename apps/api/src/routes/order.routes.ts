import { FastifyInstance } from 'fastify';
import { createOrderSchema, updateOrderStatusSchema } from '@qrmenu/shared';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { requireStaff } from '../middleware/auth.middleware.js';
import { sseService } from '../services/sse.service.js';
import { assertBranchAccess } from '../utils/tenant-scope.js';
import {
  resolveFulfillmentContext,
  validateAndPriceOrderLines,
  buildOrderMoney,
  formatOrderResponse,
} from '../services/order.service.js';

export async function orderRoutes(fastify: FastifyInstance) {
  fastify.post('/', async (request: any, reply) => {
    const data = createOrderSchema.parse(request.body);

    const branch = await fastify.prisma.branch.findUnique({
      where: { id: data.branchId },
    });
    if (!branch) throw new NotFoundError('Branch not found');

    const publishedMenu = await fastify.prisma.menu.findFirst({
      where: { branchId: branch.id, status: 'PUBLISHED' },
    });
    if (!publishedMenu) throw new ValidationError('Branch has no published menu');

    const fulfillment = await resolveFulfillmentContext(fastify.prisma, branch, data);
    const lines = await validateAndPriceOrderLines(
      fastify.prisma,
      publishedMenu.id,
      data.items
    );
    const money = buildOrderMoney(lines, branch);

    let order;
    try {
      order = await fastify.prisma.$transaction(async (tx) => {
        for (const line of lines) {
          await tx.menuItem.update({
            where: { id: line.menuItemId },
            data: { popularityScore: { increment: line.quantity } },
          });
        }

        return tx.order.create({
          data: {
            branchId: branch.id,
            tableNumber: fulfillment.tableNumber,
            tableId: fulfillment.tableId,
            fulfillmentType: fulfillment.fulfillmentType,
            idempotencyKey: data.idempotencyKey,
            status: 'NEW',
            currency: money.currency,
            subtotal: money.subtotal,
            serviceChargeRate: money.serviceChargeRate,
            serviceChargeAmount: money.serviceChargeAmount,
            vatRate: money.vatRate,
            vatAmount: money.vatAmount,
            grandTotal: money.grandTotal,
            items: {
              create: lines.map(line => ({
                clientLineId: line.clientLineId,
                menuItemId: line.menuItemId,
                itemNameSnapshot: line.itemNameSnapshot,
                itemNameAmSnapshot: line.itemNameAmSnapshot,
                priceSnapshot: line.priceSnapshot,
                modifiersSnapshot: line.modifiersSnapshot as object,
                lineTotal: line.lineTotal,
                quantity: line.quantity,
                notes: line.notes,
              })),
            },
          },
          include: { items: true },
        });
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const existingOrder = await fastify.prisma.order.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
          include: { items: true },
        });
        if (existingOrder) {
          return reply.status(200).send(formatOrderResponse(existingOrder));
        }
      }
      throw error;
    }

    const formattedOrder = formatOrderResponse(order);
    sseService.emitEvent(branch.id, 'new-order', formattedOrder);
    return reply.status(201).send(formattedOrder);
  });

  fastify.get('/', { preHandler: [requireStaff] }, async (request: any, reply) => {
    const { branchId, status } = request.query;
    if (!branchId) throw new ValidationError('branchId query param is required');

    await assertBranchAccess(fastify.prisma, request.staff, branchId, 'Order not found');

    const whereClause: any = { branchId };
    if (status) whereClause.status = status;

    const orders = await fastify.prisma.order.findMany({
      where: whereClause,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return reply.status(200).send(orders.map(formatOrderResponse));
  });

  fastify.patch('/:id', { preHandler: [requireStaff] }, async (request: any, reply) => {
    const { id } = request.params;
    const data = updateOrderStatusSchema.parse(request.body);

    const existing = await fastify.prisma.order.findUnique({
      where: { id },
      include: { branch: true, items: true },
    });
    if (!existing) throw new NotFoundError('Order not found');

    await assertBranchAccess(fastify.prisma, request.staff, existing.branchId, 'Order not found');

    if (existing.status === data.status) {
      return reply.status(200).send(formatOrderResponse(existing));
    }

    const stateTransitions: Record<string, string[]> = {
      NEW: ['SEEN'],
      SEEN: ['SERVED'],
      SERVED: [],
    };

    if (!stateTransitions[existing.status].includes(data.status)) {
      throw new ValidationError(`Cannot transition from ${existing.status} to ${data.status}`);
    }

    const updated = await fastify.prisma.order.update({
      where: { id },
      data: { status: data.status },
      include: { items: true },
    });

    const formattedOrder = formatOrderResponse(updated);
    sseService.emitEvent(updated.branchId, 'order-updated', {
      id: updated.id,
      status: updated.status,
    });

    return reply.status(200).send(formattedOrder);
  });
}
