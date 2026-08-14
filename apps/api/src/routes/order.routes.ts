import { FastifyInstance } from 'fastify';
import { createOrderSchema, updateOrderStatusSchema } from '@qrmenu/shared';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';
import { requireStaff } from '../middleware/auth.middleware.js';
import { sseService } from '../services/sse.service.js';
import { assertBranchAccess } from '../utils/tenant-scope.js';

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

    if (branch.qrMode === 'PER_TABLE' && data.tableNumber !== 'takeaway') {
      const table = await fastify.prisma.table.findFirst({
        where: { branchId: branch.id, label: data.tableNumber },
      });
      if (!table) throw new ValidationError('Invalid table number');
    }

    const itemIds = data.items.map(i => i.menuItemId);
    const menuItems = await fastify.prisma.menuItem.findMany({
      where: {
        id: { in: itemIds },
        section: { menuId: publishedMenu.id },
      },
    });

    if (menuItems.length !== new Set(itemIds).size) {
      throw new ValidationError('Some items are invalid or not from this menu');
    }

    for (const item of menuItems) {
      if (!item.isAvailable) throw new ValidationError(`Item ${item.name} is currently unavailable`);
    }

    const itemMap = new Map(menuItems.map(i => [i.id, i]));

    let order;
    try {
      order = await fastify.prisma.$transaction(async (tx) => {
        for (const item of data.items) {
          await tx.menuItem.update({
            where: { id: item.menuItemId },
            data: { popularityScore: { increment: item.quantity } }
          });
        }

        return await tx.order.create({
          data: {
            branchId: branch.id,
            tableNumber: data.tableNumber,
            idempotencyKey: data.idempotencyKey,
            status: 'NEW',
            items: {
              create: data.items.map(i => {
                const mi = itemMap.get(i.menuItemId)!;
                return {
                  menuItemId: i.menuItemId,
                  itemNameSnapshot: mi.name,
                  priceSnapshot: mi.price,
                  quantity: i.quantity,
                  notes: i.notes || null,
                };
              })
            }
          },
          include: { items: true }
        });
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const existingOrder = await fastify.prisma.order.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
          include: { items: true }
        });
        if (existingOrder) {
          return reply.status(200).send({
            ...existingOrder,
            items: existingOrder.items.map(i => ({
              ...i,
              priceSnapshot: Number(i.priceSnapshot)
            })),
            total: existingOrder.items.reduce((acc, curr) => acc + (Number(curr.priceSnapshot) * curr.quantity), 0)
          });
        }
      }
      throw error;
    }

    const formattedOrder = {
      ...order,
      items: order.items.map(i => ({
        ...i,
        priceSnapshot: Number(i.priceSnapshot)
      })),
      total: order.items.reduce((acc, curr) => acc + (Number(curr.priceSnapshot) * curr.quantity), 0)
    };

    sseService.emitEvent(branch.id, 'new-order', formattedOrder);

    return reply.status(201).send(formattedOrder);
  });

  fastify.get('/', { preHandler: [requireStaff] }, async (request: any, reply) => {
    const { branchId, status } = request.query;
    
    if (!branchId) throw new ValidationError('branchId query param is required');

    await assertBranchAccess(fastify.prisma, request.staff, branchId, 'Order not found');

    const whereClause: any = { branchId };
    if (status) {
      whereClause.status = status;
    }

    const orders = await fastify.prisma.order.findMany({
      where: whereClause,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = orders.map(o => ({
      ...o,
      items: o.items.map(i => ({
        ...i,
        priceSnapshot: Number(i.priceSnapshot)
      })),
      total: o.items.reduce((acc, curr) => acc + (Number(curr.priceSnapshot) * curr.quantity), 0)
    }));

    return reply.status(200).send(formatted);
  });

  fastify.patch('/:id', { preHandler: [requireStaff] }, async (request: any, reply) => {
    const { id } = request.params;
    const data = updateOrderStatusSchema.parse(request.body);

    const existing = await fastify.prisma.order.findUnique({
      where: { id },
      include: { branch: true }
    });
    if (!existing) throw new NotFoundError('Order not found');

    await assertBranchAccess(fastify.prisma, request.staff, existing.branchId, 'Order not found');

    if (existing.status === data.status) {
      return reply.status(200).send(existing);
    }

    const stateTransitions: Record<string, string[]> = {
      'NEW': ['SEEN'],
      'SEEN': ['SERVED'],
      'SERVED': [],
    };

    if (!stateTransitions[existing.status].includes(data.status)) {
      throw new ValidationError(`Cannot transition from ${existing.status} to ${data.status}`);
    }

    const updated = await fastify.prisma.order.update({
      where: { id },
      data: { status: data.status },
      include: { items: true }
    });

    const formattedOrder = {
      ...updated,
      items: updated.items.map(i => ({
        ...i,
        priceSnapshot: Number(i.priceSnapshot)
      })),
      total: updated.items.reduce((acc, curr) => acc + (Number(curr.priceSnapshot) * curr.quantity), 0)
    };

    sseService.emitEvent(updated.branchId, 'order-updated', {
      id: updated.id,
      status: updated.status
    });

    return reply.status(200).send(formattedOrder);
  });
}
