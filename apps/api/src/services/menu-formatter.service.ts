import { normalizeDietaryLabels, numberFromDecimal } from '@qrmenu/shared';
import type { MenuResponse, ModifierGroupResponse } from '@qrmenu/shared';

export function formatModifierGroups(groups: any[]): ModifierGroupResponse[] {
  return groups.map(g => ({
    id: g.id,
    name: g.name,
    nameAmharic: g.nameAmharic,
    required: g.required,
    minSelect: g.minSelect,
    maxSelect: g.maxSelect,
    sortOrder: g.sortOrder,
    options: g.options.map((o: any) => ({
      id: o.id,
      name: o.name,
      nameAmharic: o.nameAmharic,
      priceDelta: numberFromDecimal(o.priceDelta),
      isAvailable: o.isAvailable,
      sortOrder: o.sortOrder,
    })),
  }));
}

export function formatPublicMenu(branch: any, menu: any): MenuResponse {
  return {
    id: menu.id,
    name: menu.name,
    status: menu.status,
    version: menu.version,
    branch: {
      id: branch.id,
      name: branch.name,
      slug: branch.slug,
      qrMode: branch.qrMode,
      serviceMode: branch.serviceMode,
      themeId: branch.themeId,
      coverImageUrl: branch.coverImageUrl,
      logoUrl: branch.logoUrl,
      tagline: branch.tagline,
      description: branch.description,
      phone: branch.phone,
      address: branch.address,
      mapUrl: branch.mapUrl,
      wifiSsid: branch.wifiSsid,
      wifiPassword: branch.wifiPassword,
      openingHoursJson: branch.openingHoursJson,
      instagramUrl: branch.instagramUrl,
      facebookUrl: branch.facebookUrl,
      currency: branch.currency || 'ETB',
      serviceChargePercent: branch.serviceChargePercent || 0,
      vatPercent: branch.vatPercent || 0,
      primaryLanguage: branch.primaryLanguage || 'AM',
      tableInputMode: branch.tableInputMode || 'VALIDATED',
      enableTakeaway: branch.enableTakeaway ?? true,
      enableRoomService: branch.enableRoomService ?? false,
      callWaiterEnabled: branch.callWaiterEnabled ?? false,
      requestBillEnabled: branch.requestBillEnabled ?? false,
      whatsappNumber: branch.whatsappNumber,
    },
    sections: menu.sections
      .filter((s: any) => s.isVisible !== false)
      .map((s: any) => ({
        id: s.id,
        name: s.name,
        nameAmharic: s.nameAmharic,
        sortOrder: s.sortOrder,
        timeSlot: s.timeSlot || 'ALL_DAY',
        isVisible: s.isVisible ?? true,
        items: s.items.map((i: any) => ({
          id: i.id,
          name: i.name,
          nameAmharic: i.nameAmharic,
          description: i.description,
          descriptionAmharic: i.descriptionAmharic,
          price: numberFromDecimal(i.price),
          photoUrl: i.photoUrl,
          isAvailable: i.isAvailable,
          unavailableReason: i.unavailableReason,
          unavailableUntil: i.unavailableUntil?.toISOString?.() ?? i.unavailableUntil,
          sortOrder: i.sortOrder,
          popularityScore: i.popularityScore,
          dietaryLabels: normalizeDietaryLabels(i.dietaryLabels || []),
          allergens: i.allergens || [],
          spiceLevel: i.spiceLevel || 0,
          prepTimeMin: i.prepTimeMin,
          calories: i.calories,
          servingSize: i.servingSize,
          isCombo: i.isCombo || false,
          comboItemCount: i.comboItemCount,
          comboPrice: i.comboPrice ? numberFromDecimal(i.comboPrice) : null,
          upsellIds: (i.upsellSources || []).map((us: any) => us.targetItemId),
          modifierGroups: i.modifierGroups
            ? formatModifierGroups(i.modifierGroups)
            : undefined,
        })),
      })),
  };
}
