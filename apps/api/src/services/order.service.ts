import type { PrismaClient } from '@qrmenu/db';
import {
  calculateLineTotal,
  calculateOrderTotals,
  numberFromDecimal,
  ServiceMode,
  FulfillmentType,
  type CreateOrderInput,
  type OrderLineModifierSnapshot,
} from '@qrmenu/shared';
import { ValidationError } from '../utils/errors.js';

type MenuItemWithModifiers = Awaited<ReturnType<typeof loadMenuItems>>[number];

async function loadMenuItems(prisma: PrismaClient, menuId: string, itemIds: string[]) {
  return prisma.menuItem.findMany({
    where: {
      id: { in: itemIds },
      section: { menuId, isVisible: true },
    },
    include: {
      modifierGroups: {
        orderBy: { sortOrder: 'asc' },
        include: {
          options: { orderBy: { sortOrder: 'asc' } },
        },
      },
      section: true,
    },
  });
}

export interface ValidatedOrderLine {
  clientLineId: string;
  menuItemId: string;
  quantity: number;
  notes: string | null;
  itemNameSnapshot: string;
  itemNameAmSnapshot: string | null;
  priceSnapshot: number;
  modifiersSnapshot: OrderLineModifierSnapshot[];
  lineTotal: number;
}

export interface FulfillmentContext {
  fulfillmentType: FulfillmentType;
  tableNumber: string;
  tableId: string | null;
}

export async function resolveFulfillmentContext(
  prisma: PrismaClient,
  branch: {
    id: string;
    serviceMode: string;
    enableTakeaway: boolean;
    enableRoomService: boolean;
    tableInputMode: string;
  },
  input: CreateOrderInput
): Promise<FulfillmentContext> {
  if (branch.serviceMode === ServiceMode.MENU_ONLY) {
    throw new ValidationError('Ordering is not enabled for this branch');
  }

  const { fulfillmentType, tableNumber, tableToken } = input;

  if (branch.serviceMode === ServiceMode.PER_TABLE_QR) {
    if (fulfillmentType === FulfillmentType.TAKEAWAY) {
      if (!branch.enableTakeaway) {
        throw new ValidationError('Takeaway is not enabled');
      }
      return { fulfillmentType, tableNumber: 'takeaway', tableId: null };
    }

    if (!tableToken) {
      throw new ValidationError('Table token is required');
    }

    const table = await prisma.table.findFirst({
      where: {
        branchId: branch.id,
        qrToken: tableToken,
        qrTokenRevokedAt: null,
      },
    });
    if (!table) throw new ValidationError('Invalid or revoked table token');

    return {
      fulfillmentType: FulfillmentType.DINE_IN,
      tableNumber: table.label,
      tableId: table.id,
    };
  }

  if (fulfillmentType === FulfillmentType.TAKEAWAY) {
    if (!branch.enableTakeaway) throw new ValidationError('Takeaway is not enabled');
    return { fulfillmentType, tableNumber: 'takeaway', tableId: null };
  }

  if (fulfillmentType === FulfillmentType.ROOM_SERVICE) {
    if (!branch.enableRoomService) throw new ValidationError('Room service is not enabled');
    const room = tableNumber?.trim();
    if (!room) throw new ValidationError('Room number is required');
    return { fulfillmentType, tableNumber: room, tableId: null };
  }

  // DINE_IN for single QR
  const label = tableNumber?.trim();
  if (!label) throw new ValidationError('Table number is required');

  if (branch.tableInputMode === 'VALIDATED') {
    const table = await prisma.table.findFirst({
      where: { branchId: branch.id, label },
    });
    if (!table) throw new ValidationError('Invalid table number');
    return { fulfillmentType: FulfillmentType.DINE_IN, tableNumber: label, tableId: table.id };
  }

  return { fulfillmentType: FulfillmentType.DINE_IN, tableNumber: label, tableId: null };
}

function validateModifiers(
  item: MenuItemWithModifiers,
  selectedModifiers: CreateOrderInput['items'][0]['selectedModifiers']
): OrderLineModifierSnapshot[] {
  const groups = item.modifierGroups;
  const snapshot: OrderLineModifierSnapshot[] = [];

  for (const group of groups) {
    const selected = selectedModifiers.filter(m => m.groupId === group.id);
    const availableOptionIds = new Set(
      group.options.filter(o => o.isAvailable).map(o => o.id)
    );

    if (group.required && selected.length < Math.max(group.minSelect, 1)) {
      throw new ValidationError(`Required modifier group "${group.name}" is incomplete for ${item.name}`);
    }

    if (selected.length < group.minSelect || selected.length > group.maxSelect) {
      throw new ValidationError(
        `Modifier group "${group.name}" requires ${group.minSelect}-${group.maxSelect} selections`
      );
    }

    for (const sel of selected) {
      if (!availableOptionIds.has(sel.optionId)) {
        throw new ValidationError(`Invalid or unavailable modifier option for ${item.name}`);
      }
      const option = group.options.find(o => o.id === sel.optionId)!;
      snapshot.push({
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        optionName: option.name,
        priceDelta: numberFromDecimal(option.priceDelta),
      });
    }
  }

  // Reject options from unknown groups
  for (const sel of selectedModifiers) {
    if (!groups.some(g => g.id === sel.groupId)) {
      throw new ValidationError(`Modifier group does not belong to ${item.name}`);
    }
  }

  // Combo / platter count validation
  if (item.isCombo && item.comboItemCount) {
    const platterGroup = groups.find(g => g.maxSelect === item.comboItemCount);
    if (platterGroup) {
      const platterSelections = selectedModifiers.filter(m => m.groupId === platterGroup.id);
      if (platterSelections.length !== item.comboItemCount) {
        throw new ValidationError(
          `Platter "${item.name}" requires exactly ${item.comboItemCount} selections`
        );
      }
    }
  }

  return snapshot;
}

export async function validateAndPriceOrderLines(
  prisma: PrismaClient,
  menuId: string,
  items: CreateOrderInput['items']
): Promise<ValidatedOrderLine[]> {
  const itemIds = items.map(i => i.menuItemId);
  const menuItems = await loadMenuItems(prisma, menuId, itemIds);

  if (menuItems.length !== new Set(itemIds).size) {
    throw new ValidationError('Some items are invalid or not from this menu');
  }

  const itemMap = new Map(menuItems.map(i => [i.id, i]));
  const lines: ValidatedOrderLine[] = [];

  for (const line of items) {
    const item = itemMap.get(line.menuItemId)!;

    if (!item.name?.trim()) {
      throw new ValidationError('Item name cannot be blank');
    }

    const basePrice = numberFromDecimal(item.price);
    if (basePrice <= 0) {
      throw new ValidationError(`Invalid price for ${item.name}`);
    }

    if (!item.isAvailable) {
      throw new ValidationError(`Item ${item.name} is currently unavailable`);
    }

    if (item.unavailableUntil && new Date(item.unavailableUntil) > new Date()) {
      throw new ValidationError(`Item ${item.name} is temporarily unavailable`);
    }

    const modifiersSnapshot = validateModifiers(item, line.selectedModifiers);
    const modifierDeltas = modifiersSnapshot.map(m => m.priceDelta);
    const lineTotal = calculateLineTotal({
      basePrice,
      quantity: line.quantity,
      modifierDeltas,
    });

    lines.push({
      clientLineId: line.clientLineId,
      menuItemId: line.menuItemId,
      quantity: line.quantity,
      notes: line.notes || null,
      itemNameSnapshot: item.name,
      itemNameAmSnapshot: item.nameAmharic,
      priceSnapshot: basePrice,
      modifiersSnapshot,
      lineTotal,
    });
  }

  return lines;
}

export function buildOrderMoney(
  lines: ValidatedOrderLine[],
  branch: { currency: string; serviceChargePercent: number; vatPercent: number }
) {
  return calculateOrderTotals(
    lines.map(l => l.lineTotal),
    branch.serviceChargePercent,
    branch.vatPercent,
    branch.currency || 'ETB'
  );
}

export function formatOrderResponse(order: any) {
  const items = order.items.map((i: any) => ({
    id: i.id,
    clientLineId: i.clientLineId,
    menuItemId: i.menuItemId,
    itemNameSnapshot: i.itemNameSnapshot,
    itemNameAmSnapshot: i.itemNameAmSnapshot,
    priceSnapshot: numberFromDecimal(i.priceSnapshot),
    modifiersSnapshot: i.modifiersSnapshot || [],
    lineTotal: numberFromDecimal(i.lineTotal),
    quantity: i.quantity,
    notes: i.notes,
    status: i.status,
  }));

  const money = {
    currency: order.currency,
    subtotal: numberFromDecimal(order.subtotal),
    serviceChargeRate: numberFromDecimal(order.serviceChargeRate),
    serviceChargeAmount: numberFromDecimal(order.serviceChargeAmount),
    vatRate: numberFromDecimal(order.vatRate),
    vatAmount: numberFromDecimal(order.vatAmount),
    grandTotal: numberFromDecimal(order.grandTotal),
  };

  return {
    ...order,
    ...money,
    total: money.grandTotal,
    guestAccessToken: order.guestAccessToken,
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    pickupNote: order.pickupNote,
    pickupTime: order.pickupTime,
    items,
  };
}

/** Minimal response for a public guest tracking link. Never expose staff/internal fields. */
export function formatGuestOrderResponse(order: any) {
  const formatted = formatOrderResponse(order);
  return {
    id: formatted.id,
    tableNumber: formatted.tableNumber,
    fulfillmentType: formatted.fulfillmentType,
    status: formatted.status,
    createdAt: formatted.createdAt,
    currency: formatted.currency,
    subtotal: formatted.subtotal,
    serviceChargeAmount: formatted.serviceChargeAmount,
    vatAmount: formatted.vatAmount,
    grandTotal: formatted.grandTotal,
    total: formatted.total,
    items: formatted.items.map((item: any) => ({
      id: item.id,
      itemNameSnapshot: item.itemNameSnapshot,
      itemNameAmSnapshot: item.itemNameAmSnapshot,
      modifiersSnapshot: item.modifiersSnapshot,
      lineTotal: item.lineTotal,
      quantity: item.quantity,
      notes: item.notes,
      status: item.status,
    })),
  };
}
