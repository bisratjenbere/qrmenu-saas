import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireStaff } from '../middleware/auth.middleware.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { sseService } from '../services/sse.service.js';
import { assertBranchAccess } from '../utils/tenant-scope.js';

export async function kitchenRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireStaff);

  // 1. GET /api/kitchen/:branchId/active
  fastify.get('/:branchId/active', async (request: any, reply) => {
    const { branchId } = request.params;

    await assertBranchAccess(fastify.prisma, request.staff, branchId, 'Branch not found');

    const items = await fastify.prisma.orderItem.findMany({
      where: {
        order: {
          branchId,
          status: { in: ['NEW', 'SEEN'] }
        }
      },
      include: {
        order: true
      },
      orderBy: {
        order: { createdAt: 'asc' }
      }
    });

    const aggregationMap = new Map<string, { menuItemId: string, name: string, status: string, count: number }>();
    for (const item of items) {
      const key = `${item.menuItemId}-${item.status}`;
      const existing = aggregationMap.get(key);
      if (existing) {
        existing.count += item.quantity;
      } else {
        aggregationMap.set(key, {
          menuItemId: item.menuItemId,
          name: item.itemNameSnapshot,
          status: item.status,
          count: item.quantity
        });
      }
    }
    const aggregated = Array.from(aggregationMap.values());

    const formattedItems = items.map(i => ({
      id: i.id,
      orderId: i.orderId,
      menuItemId: i.menuItemId,
      itemNameSnapshot: i.itemNameSnapshot,
      priceSnapshot: Number(i.priceSnapshot),
      quantity: i.quantity,
      notes: i.notes,
      status: i.status,
      order: {
        tableNumber: i.order.tableNumber,
        createdAt: i.order.createdAt
      }
    }));

    return reply.status(200).send({
      items: formattedItems,
      aggregated
    });
  });

  // 2. PATCH /api/kitchen/items/:orderItemId
  fastify.patch('/items/:orderItemId', async (request: any, reply) => {
    const { orderItemId } = request.params;
    
    const schema = z.object({
      status: z.enum(['PENDING', 'PREPARING', 'READY'])
    });
    const { status } = schema.parse(request.body);

    const orderItem = await fastify.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: { include: { branch: true } } }
    });

    if (!orderItem) {
      throw new NotFoundError('Order item not found');
    }

    await assertBranchAccess(fastify.prisma, request.staff, orderItem.order.branchId, 'Order item not found');

    const updated = await fastify.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status }
    });

    // Notify all waiters via SSE
    sseService.emitEvent(orderItem.order.branchId, 'order-item-updated', {
      id: orderItemId,
      orderId: orderItem.orderId,
      status
    });

    return reply.status(200).send({
      id: updated.id,
      status: updated.status
    });
  });
}
