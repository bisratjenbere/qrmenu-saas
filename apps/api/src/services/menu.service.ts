import type { PrismaClient } from '@qrmenu/db';
import { numberFromDecimal } from '@qrmenu/shared';
import type { PublishPreflightResult } from '@qrmenu/shared';

export async function runPublishPreflight(
  prisma: PrismaClient,
  menuId: string
): Promise<PublishPreflightResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    include: {
      branch: true,
      sections: {
        where: { isVisible: true },
        include: {
          items: {
            include: {
              modifierGroups: { include: { options: true } },
            },
          },
        },
      },
    },
  });

  if (!menu) {
    return { canPublish: false, errors: ['Menu not found'], warnings: [] };
  }

  const sellableItems = menu.sections.flatMap(s => s.items).filter(i => i.isAvailable);
  if (sellableItems.length === 0) {
    errors.push('No available sellable items');
  }

  for (const item of menu.sections.flatMap(s => s.items)) {
    const price = numberFromDecimal(item.price);
    if (price <= 0) {
      errors.push(`Invalid price for "${item.name}"`);
    }
    if (!item.name?.trim() && !item.nameAmharic?.trim()) {
      errors.push(`Item missing name in at least one language`);
    }
    if (!item.photoUrl) warnings.push(`"${item.name}" has no image`);
    if (!item.description && !item.descriptionAmharic) {
      warnings.push(`"${item.name}" has no description`);
    }
    if (item.name && !item.nameAmharic) {
      warnings.push(`"${item.name}" missing Amharic translation`);
    }

    for (const group of item.modifierGroups) {
      const availableOptions = group.options.filter(o => o.isAvailable);
      if (availableOptions.length === 0) {
        errors.push(`Modifier group "${group.name}" on "${item.name}" has no available options`);
      }
      if (group.required && group.minSelect > availableOptions.length) {
        errors.push(`Modifier group "${group.name}" on "${item.name}" cannot satisfy minSelect`);
      }
      if (item.isCombo && item.comboItemCount && group.maxSelect === item.comboItemCount) {
        if (availableOptions.length < item.comboItemCount) {
          errors.push(`Platter "${item.name}" lacks enough eligible options`);
        }
      }
    }
  }

  if (menu.branch.serviceChargePercent < 0 || menu.branch.vatPercent < 0) {
    errors.push('Invalid tax or service charge configuration');
  }

  const orderingModes = ['SINGLE_QR_SELF_ORDER', 'PER_TABLE_QR'];
  if (
    orderingModes.includes(menu.branch.serviceMode) &&
    sellableItems.length === 0
  ) {
    errors.push('Public ordering enabled but no sellable items');
  }

  return {
    canPublish: errors.length === 0,
    errors,
    warnings,
  };
}

export async function normalizeSectionSortOrders(
  prisma: PrismaClient,
  menuId: string,
  orderedIds: string[]
) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.menuSection.update({
        where: { id, menuId },
        data: { sortOrder: index },
      })
    )
  );
}

export async function normalizeItemSortOrders(
  prisma: PrismaClient,
  sectionId: string,
  orderedIds: string[]
) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.menuItem.update({
        where: { id, sectionId },
        data: { sortOrder: index },
      })
    )
  );
}
