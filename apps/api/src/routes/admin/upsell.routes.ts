import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../../middleware/auth.middleware.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';

export async function adminUpsellRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  // 1. POST /api/admin/items/:itemId/upsells
  fastify.post('/items/:itemId/upsells', async (request: any, reply) => {
    const { itemId } = request.params;
    const schema = z.object({
      targetItemIds: z.array(z.string().uuid())
    });
    const { targetItemIds } = schema.parse(request.body);

    // Verify source item belongs to admin's company
    const sourceItem = await fastify.prisma.menuItem.findFirst({
      where: {
        id: itemId,
        section: { menu: { branch: { companyId: request.staff.companyId } } }
      }
    });

    if (!sourceItem) {
      throw new NotFoundError('Source item not found');
    }

    // Verify all target items belong to the same company
    const targetItems = await fastify.prisma.menuItem.findMany({
      where: {
        id: { in: targetItemIds },
        section: { menu: { branch: { companyId: request.staff.companyId } } }
      }
    });

    if (targetItems.length !== targetItemIds.length) {
      throw new ValidationError('One or more target items are invalid or belong to another company');
    }

    // Create the junction links inside a transaction
    await fastify.prisma.$transaction(async (tx) => {
      // Clear existing upsells first to make updates clean
      await tx.menuItemUpsell.deleteMany({
        where: { sourceItemId: itemId }
      });

      const links = targetItemIds.map(targetId => ({
        sourceItemId: itemId,
        targetItemId: targetId
      }));

      if (links.length > 0) {
        await tx.menuItemUpsell.createMany({
          data: links
        });
      }
    });

    return reply.status(200).send({ success: true });
  });

  // 2. DELETE /api/admin/items/:itemId/upsells/:targetId
  fastify.delete('/items/:itemId/upsells/:targetId', async (request: any, reply) => {
    const { itemId, targetId } = request.params;

    // Verify source item ownership
    const sourceItem = await fastify.prisma.menuItem.findFirst({
      where: {
        id: itemId,
        section: { menu: { branch: { companyId: request.staff.companyId } } }
      }
    });

    if (!sourceItem) {
      throw new NotFoundError('Source item not found');
    }

    const deleted = await fastify.prisma.menuItemUpsell.deleteMany({
      where: {
        sourceItemId: itemId,
        targetItemId: targetId
      }
    });

    if (deleted.count === 0) {
      throw new NotFoundError('Upsell link not found');
    }

    return reply.status(204).send();
  });
}

// Inline ValidationError helper
class ValidationError extends Error {
  statusCode = 422;
  code = 'VALIDATION_ERROR';
}
