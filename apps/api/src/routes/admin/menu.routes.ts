import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../../middleware/auth.middleware.js';
import { NotFoundError } from '../../utils/errors.js';

export async function adminMenuRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  fastify.get('/branches/:branchId/menu', async (request: any, reply) => {
    const { branchId } = request.params;
    
    // Check branch
    const branch = await fastify.prisma.branch.findFirst({
      where: { id: branchId, companyId: request.staff.companyId },
    });
    if (!branch) throw new NotFoundError('Branch not found');

    const menus = await fastify.prisma.menu.findMany({
      where: { branchId },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            items: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });
    
    const formattedMenus = menus.map(m => ({
      ...m,
      sections: m.sections.map(s => ({
        ...s,
        items: s.items.map(i => ({
          ...i,
          price: Number(i.price)
        }))
      }))
    }));

    return reply.status(200).send(formattedMenus);
  });

  fastify.post('/branches/:branchId/menu', async (request: any, reply) => {
    const { branchId } = request.params;
    
    const branch = await fastify.prisma.branch.findFirst({
      where: { id: branchId, companyId: request.staff.companyId },
    });
    if (!branch) throw new NotFoundError('Branch not found');

    const schema = z.object({ name: z.string().optional() });
    const { name } = schema.parse(request.body || {});

    const menu = await fastify.prisma.menu.create({
      data: {
        branchId,
        name: name || 'Draft Menu',
        status: 'DRAFT',
      },
    });
    return reply.status(201).send(menu);
  });

  fastify.patch('/menus/:id', async (request: any, reply) => {
    const { id } = request.params;
    
    const menu = await fastify.prisma.menu.findFirst({
      where: { id, branch: { companyId: request.staff.companyId } },
    });
    if (!menu) throw new NotFoundError('Menu not found');

    const schema = z.object({ name: z.string() });
    const { name } = schema.parse(request.body);

    const updated = await fastify.prisma.menu.update({
      where: { id },
      data: { name },
    });
    return reply.status(200).send(updated);
  });

  fastify.post('/menus/:id/publish', async (request: any, reply) => {
    const { id } = request.params;
    
    const menu = await fastify.prisma.menu.findFirst({
      where: { id, branch: { companyId: request.staff.companyId } },
    });
    if (!menu) throw new NotFoundError('Menu not found');

    await fastify.prisma.$transaction(async (tx) => {
      // Unpublish existing
      await tx.menu.updateMany({
        where: { branchId: menu.branchId, status: 'PUBLISHED' },
        data: { status: 'DRAFT' },
      });
      // Publish new
      await tx.menu.update({
        where: { id },
        data: { status: 'PUBLISHED' },
      });
    });

    return reply.status(200).send({ success: true });
  });

  fastify.post('/menus/:id/unpublish', async (request: any, reply) => {
    const { id } = request.params;
    
    const menu = await fastify.prisma.menu.findFirst({
      where: { id, branch: { companyId: request.staff.companyId } },
    });
    if (!menu) throw new NotFoundError('Menu not found');

    const updated = await fastify.prisma.menu.update({
      where: { id },
      data: { status: 'DRAFT' },
    });
    return reply.status(200).send(updated);
  });

  // ─── GET /menu-templates ──────────────────────────────
  fastify.get('/menu-templates', async (request, reply) => {
    const templates = await fastify.prisma.menuPresetTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return reply.status(200).send(templates);
  });

  // ─── POST /menus/:id/apply-template ───────────────────
  fastify.post('/menus/:id/apply-template', async (request: any, reply) => {
    const { id } = request.params;
    const { templateId, sections } = request.body || {};

    const menu = await fastify.prisma.menu.findFirst({
      where: { id, branch: { companyId: request.staff.companyId } },
    });
    if (!menu) throw new NotFoundError('Menu not found');

    let templateSections = sections;
    if (!templateSections && templateId) {
      const template = await fastify.prisma.menuPresetTemplate.findUnique({
        where: { id: templateId }
      });
      if (template) {
        templateSections = JSON.parse(template.sectionsJson);
      }
    }

    if (!templateSections || !Array.isArray(templateSections)) {
      throw new Error('Invalid template data');
    }

    // Apply template in transaction
    await fastify.prisma.$transaction(async (tx) => {
      // 1. Clear existing sections
      await tx.menuSection.deleteMany({ where: { menuId: menu.id } });

      // 2. Create sections and items
      for (let sIndex = 0; sIndex < templateSections.length; sIndex++) {
        const sec = templateSections[sIndex];
        const createdSec = await tx.menuSection.create({
          data: {
            menuId: menu.id,
            name: sec.name,
            nameAmharic: sec.nameAmharic || null,
            timeSlot: sec.timeSlot || 'ALL_DAY',
            sortOrder: sIndex,
          }
        });

        if (sec.items && Array.isArray(sec.items)) {
          for (let iIndex = 0; iIndex < sec.items.length; iIndex++) {
            const item = sec.items[iIndex];
            await tx.menuItem.create({
              data: {
                sectionId: createdSec.id,
                name: item.name,
                nameAmharic: item.nameAmharic || null,
                description: item.description || null,
                price: item.price || 0,
                spiceLevel: item.spiceLevel || 0,
                dietaryLabels: item.dietaryLabels || [],
                servingSize: item.servingSize || null,
                isCombo: item.isCombo || false,
                comboItemCount: item.comboItemCount || null,
                comboPrice: item.comboPrice || null,
                isAvailable: true,
                sortOrder: iIndex,
              }
            });
          }
        }
      }
    });

    const updatedMenu = await fastify.prisma.menu.findUnique({
      where: { id: menu.id },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: { items: { orderBy: { sortOrder: 'asc' } } }
        }
      }
    });

    return reply.status(200).send(updatedMenu);
  });

  // ─── PATCH /branches/:branchId/theme ──────────────────
  fastify.patch('/branches/:branchId/theme', async (request: any, reply) => {
    const { branchId } = request.params;
    const { themeId } = request.body || {};

    const branch = await fastify.prisma.branch.findFirst({
      where: { id: branchId, companyId: request.staff.companyId },
    });
    if (!branch) throw new NotFoundError('Branch not found');

    const updated = await fastify.prisma.branch.update({
      where: { id: branchId },
      data: { themeId: themeId || 'mesob-classic' }
    });

    return reply.status(200).send(updated);
  });
}
