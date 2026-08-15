import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { applyTemplateSchema, menuTemplateSectionsSchema } from '@qrmenu/shared';
import { requireAdmin } from '../../middleware/auth.middleware.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import {
  runPublishPreflight,
  normalizeSectionSortOrders,
} from '../../services/menu.service.js';
import { formatModifierGroups } from '../../services/menu-formatter.service.js';
import { numberFromDecimal } from '@qrmenu/shared';

function formatAdminMenu(menu: any) {
  return {
    ...menu,
    sections: menu.sections.map((s: any) => ({
      ...s,
      items: s.items.map((i: any) => ({
        ...i,
        price: numberFromDecimal(i.price),
        comboPrice: i.comboPrice ? numberFromDecimal(i.comboPrice) : null,
        modifierGroups: i.modifierGroups
          ? formatModifierGroups(i.modifierGroups)
          : [],
      })),
    })),
  };
}

export async function adminMenuRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  fastify.get('/branches/:branchId/menu', async (request: any, reply) => {
    const { branchId } = request.params;

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
            items: {
              orderBy: { sortOrder: 'asc' },
              include: {
                modifierGroups: {
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    options: { orderBy: { sortOrder: 'asc' } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return reply.status(200).send(menus.map(formatAdminMenu));
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
      include: { branch: true },
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

  fastify.get('/menus/:id/preflight', async (request: any, reply) => {
    const { id } = request.params;
    const menu = await fastify.prisma.menu.findFirst({
      where: { id, branch: { companyId: request.staff.companyId } },
    });
    if (!menu) throw new NotFoundError('Menu not found');

    const result = await runPublishPreflight(fastify.prisma, id);
    return reply.status(200).send(result);
  });

  fastify.post('/menus/:id/publish', async (request: any, reply) => {
    const { id } = request.params;

    const menu = await fastify.prisma.menu.findFirst({
      where: { id, branch: { companyId: request.staff.companyId } },
      include: { branch: true },
    });
    if (!menu) throw new NotFoundError('Menu not found');

    const preflight = await runPublishPreflight(fastify.prisma, id);
    if (!preflight.canPublish) {
      throw new ValidationError(
        `Cannot publish: ${preflight.errors.join('; ')}`
      );
    }

    await fastify.prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.menu.updateMany({
        where: { branchId: menu.branchId, status: 'PUBLISHED' },
        data: { status: 'ARCHIVED', archivedAt: now },
      });
      await tx.menu.update({
        where: { id },
        data: { status: 'PUBLISHED', publishedAt: now, archivedAt: null },
      });
      await tx.branch.update({
        where: { id: menu.branchId },
        data: {
          setupStep: 7,
          setupStartedAt: menu.branch.setupStartedAt ?? now,
          setupCompletedAt: menu.branch.setupCompletedAt ?? now,
          firstPublishedAt: menu.branch.firstPublishedAt ?? now,
        },
      });
    });

    return reply.status(200).send({ success: true, warnings: preflight.warnings });
  });

  fastify.post('/menus/:id/unpublish', async (request: any, reply) => {
    const { id } = request.params;

    const menu = await fastify.prisma.menu.findFirst({
      where: { id, branch: { companyId: request.staff.companyId } },
      include: { branch: true },
    });
    if (!menu) throw new NotFoundError('Menu not found');

    const updated = await fastify.prisma.menu.update({
      where: { id },
      data: { status: 'DRAFT' },
    });
    return reply.status(200).send(updated);
  });

  fastify.post('/menus/:id/restore', async (request: any, reply) => {
    const { id } = request.params;

    const menu = await fastify.prisma.menu.findFirst({
      where: { id, branch: { companyId: request.staff.companyId }, status: 'ARCHIVED' },
    });
    if (!menu) throw new NotFoundError('Archived menu not found');

    const preflight = await runPublishPreflight(fastify.prisma, id);
    if (!preflight.canPublish) {
      throw new ValidationError(`Cannot restore: ${preflight.errors.join('; ')}`);
    }

    await fastify.prisma.$transaction(async (tx) => {
      await tx.menu.updateMany({
        where: { branchId: menu.branchId, status: 'PUBLISHED' },
        data: { status: 'ARCHIVED', archivedAt: new Date() },
      });
      await tx.menu.update({
        where: { id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
    });

    return reply.status(200).send({ success: true });
  });

  fastify.post('/menus/:id/reorder-sections', async (request: any, reply) => {
    const { id } = request.params;
    const schema = z.object({ orderedIds: z.array(z.string().uuid()) });
    const { orderedIds } = schema.parse(request.body);

    const menu = await fastify.prisma.menu.findFirst({
      where: { id, branch: { companyId: request.staff.companyId } },
    });
    if (!menu) throw new NotFoundError('Menu not found');

    await normalizeSectionSortOrders(fastify.prisma, id, orderedIds);
    return reply.status(200).send({ success: true });
  });

  fastify.get('/menu-templates', async (_request, reply) => {
    const templates = await fastify.prisma.menuPresetTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return reply.status(200).send(templates);
  });

  fastify.get('/menus/:id/template-impact', async (request: any, reply) => {
    const { id } = request.params;
    const menu = await fastify.prisma.menu.findFirst({
      where: { id, branch: { companyId: request.staff.companyId } },
      include: {
        sections: { include: { items: { include: { modifierGroups: true } } } },
      },
    });
    if (!menu) throw new NotFoundError('Menu not found');

    const sectionsToReplace = menu.sections.length;
    const itemsToReplace = menu.sections.reduce((n, s) => n + s.items.length, 0);
    const modifierGroupsAffected = menu.sections.reduce(
      (n, s) => n + s.items.reduce((m, i) => m + i.modifierGroups.length, 0),
      0
    );

    return reply.status(200).send({
      sectionsToReplace,
      itemsToReplace,
      modifierGroupsAffected,
      backupAvailable: !!menu.branchId,
    });
  });

  fastify.post('/menus/:id/apply-template', async (request: any, reply) => {
    const { id } = request.params;
    const body = applyTemplateSchema.parse(request.body || {});

    const menu = await fastify.prisma.menu.findFirst({
      where: { id, branch: { companyId: request.staff.companyId } },
      include: {
        sections: { include: { items: { include: { modifierGroups: true } } } },
        branch: true,
      },
    });
    if (!menu) throw new NotFoundError('Menu not found');

    if (!body.confirmReplace) {
      throw new ValidationError(
        'Template application requires confirmReplace=true after reviewing impact'
      );
    }

    let templateSections = body.sections;
    if (!templateSections && body.templateId) {
      const template = await fastify.prisma.menuPresetTemplate.findUnique({
        where: { id: body.templateId },
      });
      if (template) {
        try {
          templateSections = menuTemplateSectionsSchema.parse(JSON.parse(template.sectionsJson));
        } catch {
          throw new ValidationError('This template has invalid or incomplete menu content');
        }
      }
    }

    if (!templateSections || !Array.isArray(templateSections)) {
      throw new ValidationError('Invalid template data');
    }

    const backupJson = JSON.stringify({
      sections: menu.sections,
      savedAt: new Date().toISOString(),
    });

    await fastify.prisma.branch.update({
      where: { id: menu.branchId },
      data: {
        setupDraftBackupJson: backupJson,
        setupStep: Math.max(3, menu.branch.setupStep),
      },
    });

    await fastify.prisma.$transaction(async (tx) => {
      await tx.menuSection.deleteMany({ where: { menuId: menu.id } });

      for (let sIndex = 0; sIndex < templateSections!.length; sIndex++) {
        const sec = templateSections![sIndex];
        const createdSec = await tx.menuSection.create({
          data: {
            menuId: menu.id,
            name: sec.name,
            nameAmharic: sec.nameAmharic || null,
            timeSlot: sec.timeSlot || 'ALL_DAY',
            sortOrder: sIndex,
            isVisible: sec.isVisible ?? true,
          },
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
                descriptionAmharic: item.descriptionAmharic || null,
                price: item.price || 0,
                spiceLevel: item.spiceLevel || 0,
                dietaryLabels: item.dietaryLabels || [],
                allergens: item.allergens || [],
                servingSize: item.servingSize || null,
                isCombo: item.isCombo || false,
                comboItemCount: item.comboItemCount || null,
                comboPrice: item.comboPrice || null,
                prepTimeMin: item.prepTimeMin || null,
                isAvailable: true,
                sortOrder: iIndex,
              },
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
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
              include: {
                modifierGroups: {
                  include: { options: true },
                },
              },
            },
          },
        },
      },
    });

    return reply.status(200).send(formatAdminMenu(updatedMenu!));
  });

  fastify.post('/menus/:id/restore-backup', async (request: any, reply) => {
    const { id } = request.params;

    const menu = await fastify.prisma.menu.findFirst({
      where: { id, branch: { companyId: request.staff.companyId } },
      include: { branch: true },
    });
    if (!menu) throw new NotFoundError('Menu not found');

    const backup = menu.branch.setupDraftBackupJson;
    if (!backup) throw new ValidationError('No draft backup available');

    const parsed = JSON.parse(backup);
    if (!parsed.sections) throw new ValidationError('Invalid backup data');

    await fastify.prisma.$transaction(async (tx) => {
      await tx.menuSection.deleteMany({ where: { menuId: menu.id } });

      for (let sIndex = 0; sIndex < parsed.sections.length; sIndex++) {
        const sec = parsed.sections[sIndex];
        const createdSec = await tx.menuSection.create({
          data: {
            menuId: menu.id,
            name: sec.name,
            nameAmharic: sec.nameAmharic || null,
            timeSlot: sec.timeSlot || 'ALL_DAY',
            sortOrder: sIndex,
            isVisible: sec.isVisible ?? true,
          },
        });

        for (let iIndex = 0; iIndex < (sec.items || []).length; iIndex++) {
          const item = sec.items[iIndex];
          await tx.menuItem.create({
            data: {
              sectionId: createdSec.id,
              name: item.name,
              nameAmharic: item.nameAmharic || null,
              description: item.description || null,
              descriptionAmharic: item.descriptionAmharic || null,
              price: item.price || 0,
              spiceLevel: item.spiceLevel || 0,
              dietaryLabels: item.dietaryLabels || [],
              allergens: item.allergens || [],
              servingSize: item.servingSize || null,
              isCombo: item.isCombo || false,
              comboItemCount: item.comboItemCount || null,
              comboPrice: item.comboPrice || null,
              isAvailable: item.isAvailable ?? true,
              sortOrder: iIndex,
            },
          });
        }
      }
    });

    return reply.status(200).send({ success: true });
  });

  fastify.patch('/branches/:branchId/theme', async (request: any, reply) => {
    const { branchId } = request.params;
    const { themeId } = request.body || {};

    const branch = await fastify.prisma.branch.findFirst({
      where: { id: branchId, companyId: request.staff.companyId },
    });
    if (!branch) throw new NotFoundError('Branch not found');

    const updated = await fastify.prisma.branch.update({
      where: { id: branchId },
      data: { themeId: themeId || 'mesob-classic' },
    });

    return reply.status(200).send(updated);
  });
}
