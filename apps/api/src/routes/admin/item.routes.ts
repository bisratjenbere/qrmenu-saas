import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../../middleware/auth.middleware.js';
import { NotFoundError } from '../../utils/errors.js';

export async function adminItemRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  fastify.post('/sections/:sectionId/items', async (request: any, reply) => {
    const { sectionId } = request.params;
    
    const section = await fastify.prisma.menuSection.findFirst({
      where: { id: sectionId, menu: { branch: { companyId: request.staff.companyId } } },
    });
    if (!section) throw new NotFoundError('Section not found');

    const schema = z.object({
      name: z.string(),
      nameAmharic: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      price: z.number(),
      photoUrl: z.string().nullable().optional(),
      isAvailable: z.boolean().optional().default(true),
      sortOrder: z.number().optional().default(0),
      dietaryLabels: z.array(z.string()).optional().default([]),
      allergens: z.array(z.string()).optional().default([]),
      spiceLevel: z.number().optional().default(0),
      prepTimeMin: z.number().nullable().optional(),
      calories: z.number().nullable().optional(),
      servingSize: z.string().nullable().optional(),
      isCombo: z.boolean().optional().default(false),
      comboItemCount: z.number().nullable().optional(),
      comboPrice: z.number().nullable().optional(),
    });
    const data = schema.parse(request.body);

    const item = await fastify.prisma.menuItem.create({
      data: { ...data, sectionId },
    });
    return reply.status(201).send({ ...item, price: Number(item.price), comboPrice: item.comboPrice ? Number(item.comboPrice) : null });
  });

  fastify.patch('/items/:id', async (request: any, reply) => {
    const { id } = request.params;
    
    const item = await fastify.prisma.menuItem.findFirst({
      where: { id, section: { menu: { branch: { companyId: request.staff.companyId } } } },
    });
    if (!item) throw new NotFoundError('Item not found');

    const schema = z.object({
      name: z.string().optional(),
      nameAmharic: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      price: z.number().optional(),
      photoUrl: z.string().nullable().optional(),
      isAvailable: z.boolean().optional(),
      sortOrder: z.number().optional(),
      dietaryLabels: z.array(z.string()).optional(),
      allergens: z.array(z.string()).optional(),
      spiceLevel: z.number().optional(),
      prepTimeMin: z.number().nullable().optional(),
      calories: z.number().nullable().optional(),
      servingSize: z.string().nullable().optional(),
      isCombo: z.boolean().optional(),
      comboItemCount: z.number().nullable().optional(),
      comboPrice: z.number().nullable().optional(),
    });
    const data = schema.parse(request.body);

    const updated = await fastify.prisma.menuItem.update({
      where: { id },
      data,
    });
    return reply.status(200).send({ ...updated, price: Number(updated.price) });
  });

  fastify.delete('/items/:id', async (request: any, reply) => {
    const { id } = request.params;
    
    const item = await fastify.prisma.menuItem.findFirst({
      where: { id, section: { menu: { branch: { companyId: request.staff.companyId } } } },
    });
    if (!item) throw new NotFoundError('Item not found');

    await fastify.prisma.menuItem.delete({ where: { id } });
    return reply.status(204).send();
  });

  fastify.patch('/items/:id/availability', async (request: any, reply) => {
    const { id } = request.params;
    
    const item = await fastify.prisma.menuItem.findFirst({
      where: { id, section: { menu: { branch: { companyId: request.staff.companyId } } } },
    });
    if (!item) throw new NotFoundError('Item not found');

    const schema = z.object({
      isAvailable: z.boolean(),
    });
    const { isAvailable } = schema.parse(request.body);

    const updated = await fastify.prisma.menuItem.update({
      where: { id },
      data: { isAvailable },
    });
    return reply.status(200).send({ ...updated, price: Number(updated.price) });
  });
}
