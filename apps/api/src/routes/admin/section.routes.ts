import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../../middleware/auth.middleware.js';
import { NotFoundError } from '../../utils/errors.js';

export async function adminSectionRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  fastify.post('/menus/:menuId/sections', async (request: any, reply) => {
    const { menuId } = request.params;
    
    const menu = await fastify.prisma.menu.findFirst({
      where: { id: menuId, branch: { companyId: request.staff.companyId } },
    });
    if (!menu) throw new NotFoundError('Menu not found');

    const schema = z.object({
      name: z.string(),
      nameAmharic: z.string().nullable().optional(),
      sortOrder: z.number().optional().default(0),
      timeSlot: z.string().optional().default('ALL_DAY'),
    });
    const data = schema.parse(request.body);

    const section = await fastify.prisma.menuSection.create({
      data: { ...data, menuId },
    });
    return reply.status(201).send(section);
  });

  fastify.patch('/sections/:id', async (request: any, reply) => {
    const { id } = request.params;
    
    const section = await fastify.prisma.menuSection.findFirst({
      where: { id, menu: { branch: { companyId: request.staff.companyId } } },
    });
    if (!section) throw new NotFoundError('Section not found');

    const schema = z.object({
      name: z.string().optional(),
      nameAmharic: z.string().nullable().optional(),
      sortOrder: z.number().optional(),
      timeSlot: z.string().optional(),
    });
    const data = schema.parse(request.body);

    const updated = await fastify.prisma.menuSection.update({
      where: { id },
      data,
    });
    return reply.status(200).send(updated);
  });

  fastify.delete('/sections/:id', async (request: any, reply) => {
    const { id } = request.params;
    
    const section = await fastify.prisma.menuSection.findFirst({
      where: { id, menu: { branch: { companyId: request.staff.companyId } } },
    });
    if (!section) throw new NotFoundError('Section not found');

    await fastify.prisma.menuSection.delete({ where: { id } });
    return reply.status(204).send();
  });

  fastify.patch('/menus/:menuId/sections/reorder', async (request: any, reply) => {
    const { menuId } = request.params;
    
    const menu = await fastify.prisma.menu.findFirst({
      where: { id: menuId, branch: { companyId: request.staff.companyId } },
    });
    if (!menu) throw new NotFoundError('Menu not found');

    const schema = z.object({
      sections: z.array(z.object({
        id: z.string(),
        sortOrder: z.number()
      }))
    });
    const { sections } = schema.parse(request.body);

    const sectionIds = sections.map((s) => s.id);
    const existingSections = await fastify.prisma.menuSection.findMany({
      where: {
        id: { in: sectionIds },
        menuId,
        menu: { branch: { companyId: request.staff.companyId } }
      }
    });

    if (existingSections.length !== sectionIds.length) {
      throw new NotFoundError('One or more sections not found or not owned by company');
    }

    await fastify.prisma.$transaction(
      sections.map((s) => fastify.prisma.menuSection.update({
        where: { id: s.id },
        data: { sortOrder: s.sortOrder }
      }))
    );

    return reply.status(200).send({ success: true });
  });
}
