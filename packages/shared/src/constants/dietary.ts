// ─── Structured dietary labels (shared API + frontend) ────────────

export const DietaryLabel = {
  FASTING: 'FASTING',
  VEGAN: 'VEGAN',
  VEGETARIAN: 'VEGETARIAN',
  HALAL: 'HALAL',
  GLUTEN_FREE: 'GLUTEN_FREE',
  SPICY: 'SPICY',
} as const;
export type DietaryLabel = (typeof DietaryLabel)[keyof typeof DietaryLabel];

export const ALL_DIETARY_LABELS = Object.values(DietaryLabel);

export const DIETARY_LABEL_DISPLAY: Record<DietaryLabel, { EN: string; AM: string }> = {
  [DietaryLabel.FASTING]: { EN: 'Fasting / የጾም', AM: 'የጾም' },
  [DietaryLabel.VEGAN]: { EN: 'Vegan', AM: 'ቬጋን' },
  [DietaryLabel.VEGETARIAN]: { EN: 'Vegetarian', AM: 'አሳታይ' },
  [DietaryLabel.HALAL]: { EN: 'Halal', AM: 'ሐላል' },
  [DietaryLabel.GLUTEN_FREE]: { EN: 'Gluten-free', AM: 'ግሉተን-ፍሪ' },
  [DietaryLabel.SPICY]: { EN: 'Spicy', AM: 'ቅመም' },
};

/** Normalize legacy GF shorthand to GLUTEN_FREE */
export function normalizeDietaryLabels(labels: string[]): DietaryLabel[] {
  return labels
    .map(l => (l === 'GF' ? DietaryLabel.GLUTEN_FREE : l))
    .filter((l): l is DietaryLabel => ALL_DIETARY_LABELS.includes(l as DietaryLabel));
}

export const ALLERGEN_OPTIONS = [
  'GLUTEN',
  'DAIRY',
  'EGGS',
  'NUTS',
  'SESAME',
  'SOY',
  'SHELLFISH',
  'FISH',
] as const;
export type Allergen = (typeof ALLERGEN_OPTIONS)[number];

export const SPICE_LEVEL_LABELS = [
  { level: 0, EN: 'Alicha (Mild)', AM: 'አልጫ (ቀለል)' },
  { level: 1, EN: 'Qey (Medium)', AM: 'ቀይ (መካከለኛ)' },
  { level: 2, EN: 'Berbere (Spicy)', AM: 'በርበሬ (ቅመም)' },
  { level: 3, EN: 'Mitmita (Very Hot)', AM: 'ሚጥሚጣ (በጣም ትኩስ)' },
] as const;

export function getSpiceLabel(level: number, locale: 'EN' | 'AM' = 'EN'): string | null {
  const entry = SPICE_LEVEL_LABELS.find(s => s.level === level);
  return entry ? entry[locale] : null;
}
