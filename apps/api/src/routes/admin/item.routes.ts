import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createMenuItemSchema,
  updateMenuItemSchema,
  toggleAvailabilitySchema,
  upsertModifierGroupsSchema,
  reorderSectionsSchema,
} from '@qrmenu/shared';
import { requireAdmin } from '../../middleware/auth.middleware.js';
import { NotFoundError } from '../../utils/errors.js';
import { normalizeItemSortOrders } from '../../services/menu.service.js';
import { formatModifierGroups } from '../../services/menu-formatter.service.js';
import { numberFromDecimal } from '@qrmenu/shared';

function formatItem(item: any) {
  return {
    ...item,
    price: numberFromDecimal(item.price),
    comboPrice: item.comboPrice ? numberFromDecimal(item.comboPrice) : null,
    modifierGroups: item.modifierGroups
      ? formatModifierGroups(item.modifierGroups)
      : undefined,
  };
}

export async function adminItemRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  fastify.post('/sections/:sectionId/items', async (request: any, reply) => {
    const { sectionId } = request.params;

    const section = await fastify.prisma.menuSection.findFirst({
      where: { id: sectionId, menu: { branch: { companyId: request.staff.companyId } } },
    });
    if (!section) throw new NotFoundError('Section not found');

    const data = createMenuItemSchema.parse(request.body);

    const item = await fastify.prisma.menuItem.create({
      data: { ...data, sectionId },
    });
    return reply.status(201).send(formatItem(item));
  });

  fastify.patch('/items/:id', async (request: any, reply) => {
    const { id } = request.params;

    const item = await fastify.prisma.menuItem.findFirst({
      where: { id, section: { menu: { branch: { companyId: request.staff.companyId } } } },
    });
    if (!item) throw new NotFoundError('Item not found');

    const data = updateMenuItemSchema.parse(request.body);

    const updated = await fastify.prisma.menuItem.update({
      where: { id },
      data,
    });
    return reply.status(200).send(formatItem(updated));
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

    const data = toggleAvailabilitySchema.parse(request.body);

    const updated = await fastify.prisma.menuItem.update({
      where: { id },
      data: {
        isAvailable: data.isAvailable,
        unavailableReason: data.isAvailable ? null : data.unavailableReason,
        unavailableUntil: data.isAvailable
          ? null
          : data.unavailableUntil
            ? new Date(data.unavailableUntil)
            : null,
      },
    });
    return reply.status(200).send(formatItem(updated));
  });

  fastify.put('/items/:id/modifiers', async (request: any, reply) => {
    const { id } = request.params;

    const item = await fastify.prisma.menuItem.findFirst({
      where: { id, section: { menu: { branch: { companyId: request.staff.companyId } } } },
    });
    if (!item) throw new NotFoundError('Item not found');

    const { groups } = upsertModifierGroupsSchema.parse(request.body);

    await fastify.prisma.$transaction(async (tx) => {
      await tx.modifierGroup.deleteMany({ where: { menuItemId: id } });

      for (let gIndex = 0; gIndex < groups.length; gIndex++) {
        const group = groups[gIndex];
        const createdGroup = await tx.modifierGroup.create({
          data: {
            menuItemId: id,
            name: group.name,
            nameAmharic: group.nameAmharic || null,
            required: group.required ?? false,
            minSelect: group.minSelect ?? 0,
            maxSelect: group.maxSelect ?? 1,
            sortOrder: group.sortOrder ?? gIndex,
          },
        });

        for (let oIndex = 0; oIndex < group.options.length; oIndex++) {
          const opt = group.options[oIndex];
          await tx.modifierOption.create({
            data: {
              groupId: createdGroup.id,
              name: opt.name,
              nameAmharic: opt.nameAmharic || null,
              priceDelta: opt.priceDelta ?? 0,
              isAvailable: opt.isAvailable ?? true,
              sortOrder: opt.sortOrder ?? oIndex,
            },
          });
        }
      }
    });

    const updated = await fastify.prisma.menuItem.findUnique({
      where: { id },
      include: {
        modifierGroups: {
          orderBy: { sortOrder: 'asc' },
          include: { options: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });

    return reply.status(200).send(formatItem(updated!));
  });

  fastify.post('/sections/:sectionId/reorder-items', async (request: any, reply) => {
    const { sectionId } = request.params;
    const schema = z.object({ orderedIds: z.array(z.string().uuid()) });
    const { orderedIds } = schema.parse(request.body);

    const section = await fastify.prisma.menuSection.findFirst({
      where: { id: sectionId, menu: { branch: { companyId: request.staff.companyId } } },
    });
    if (!section) throw new NotFoundError('Section not found');

    await normalizeItemSortOrders(fastify.prisma, sectionId, orderedIds);
    return reply.status(200).send({ success: true });
  });
}
