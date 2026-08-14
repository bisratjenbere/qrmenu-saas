// ─── Reusable Ethiopian modifier presets ──────────────────────────

export interface ModifierPresetOption {
  name: string;
  nameAmharic: string;
  priceDelta?: number;
}

export interface ModifierPresetGroup {
  id: string;
  name: string;
  nameAmharic: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierPresetOption[];
}

export const MODIFIER_PRESETS: Record<string, ModifierPresetGroup> = {
  portion: {
    id: 'portion',
    name: 'Portion',
    nameAmharic: 'መጠን',
    required: true,
    minSelect: 1,
    maxSelect: 1,
    options: [
      { name: 'Half', nameAmharic: 'ግማሽ', priceDelta: 0 },
      { name: 'Full', nameAmharic: 'ሙሉ', priceDelta: 0 },
      { name: 'Serves 1–2', nameAmharic: 'ለ 1–2 ሰው', priceDelta: 0 },
      { name: 'Serves 2–4', nameAmharic: 'ለ 2–4 ሰው', priceDelta: 0 },
    ],
  },
  kitfoCooking: {
    id: 'kitfoCooking',
    name: 'Kitfo cooking',
    nameAmharic: 'የክትፎ ምግብ',
    required: true,
    minSelect: 1,
    maxSelect: 1,
    options: [
      { name: 'Raw (Tere)', nameAmharic: 'ቴሬ', priceDelta: 0 },
      { name: 'Rare (Leb leb)', nameAmharic: 'leb leb', priceDelta: 0 },
      { name: 'Medium', nameAmharic: 'መካከለኛ', priceDelta: 0 },
      { name: 'Well done', nameAmharic: 'ደህንነቱ የተጠበቀ', priceDelta: 0 },
    ],
  },
  tibsPrep: {
    id: 'tibsPrep',
    name: 'Tibs preparation',
    nameAmharic: 'የጥብስ አዘገጃጀት',
    required: false,
    minSelect: 0,
    maxSelect: 2,
    options: [
      { name: 'With rosemary', nameAmharic: 'በሮዝማሪ', priceDelta: 0 },
      { name: 'Extra spicy', nameAmharic: 'ተጨማሪ ቅመም', priceDelta: 0 },
      { name: 'Mild (Alicha)', nameAmharic: 'አልጫ', priceDelta: 0 },
    ],
  },
  sideChoice: {
    id: 'sideChoice',
    name: 'Side',
    nameAmharic: 'ተጨማሪ',
    required: true,
    minSelect: 1,
    maxSelect: 1,
    options: [
      { name: 'Injera', nameAmharic: 'እንጀራ', priceDelta: 0 },
      { name: 'Rice', nameAmharic: 'ሩዝ', priceDelta: 30 },
      { name: 'Bread', nameAmharic: 'ዳቦ', priceDelta: 20 },
      { name: 'Kocho', nameAmharic: 'ቆጮ', priceDelta: 40 },
    ],
  },
  extras: {
    id: 'extras',
    name: 'Extras',
    nameAmharic: 'ተጨማሪ',
    required: false,
    minSelect: 0,
    maxSelect: 5,
    options: [
      { name: 'Extra injera', nameAmharic: 'ተጨማሪ እንጀራ', priceDelta: 25 },
      { name: 'Ayib', nameAmharic: 'አይብ', priceDelta: 40 },
      { name: 'Salad', nameAmharic: 'ሰላጣ', priceDelta: 35 },
    ],
  },
};

export const RESTAURANT_TEMPLATES = [
  { id: 'traditional', name: 'Traditional Ethiopian', nameAmharic: 'ባህላዊ ኢትዮጵያ', sections: ['popular', 'wot', 'tibs', 'kitfo', 'beyaynetu', 'sides', 'coffee', 'beverages'] },
  { id: 'fasting', name: 'Fasting-focused Ethiopian', nameAmharic: 'የጾም ምግብ ቤት', sections: ['fasting', 'wot', 'sides', 'beverages'] },
  { id: 'cafe', name: 'Ethiopian café/breakfast', nameAmharic: 'ካፌ እና ቁርስ', sections: ['breakfast', 'firfir', 'coffee', 'beverages'] },
  { id: 'international', name: 'Ethiopian + international', nameAmharic: 'ኢትዮጵያ + ዓለም አቀፍ', sections: ['popular', 'wot', 'tibs', 'international', 'beverages'] },
  { id: 'hotel', name: 'Hotel restaurant', nameAmharic: 'ሆቴል ምግብ ቤት', sections: ['popular', 'beyaynetu', 'wot', 'international', 'coffee', 'beverages'] },
  { id: 'blank', name: 'Blank menu', nameAmharic: 'ባዶ ምናሌ', sections: [] },
] as const;

export const SECTION_PRESETS = [
  { key: 'popular', name: 'Popular', nameAmharic: 'ተወዳጅ', timeSlot: 'ALL_DAY' },
  { key: 'fasting', name: 'Fasting', nameAmharic: 'የጾም', timeSlot: 'ALL_DAY' },
  { key: 'beyaynetu', name: 'Beyaynetu / Sharing Platters', nameAmharic: 'በያይነቱ', timeSlot: 'ALL_DAY' },
  { key: 'wot', name: 'Wot', nameAmharic: 'ወጥ', timeSlot: 'LUNCH_DINNER' },
  { key: 'tibs', name: 'Tibs', nameAmharic: 'ጥብስ', timeSlot: 'LUNCH_DINNER' },
  { key: 'kitfo', name: 'Kitfo & Specialties', nameAmharic: 'ክትፎ እና ልዩ', timeSlot: 'LUNCH_DINNER' },
  { key: 'firfir', name: 'Firfir & Breakfast', nameAmharic: 'ፍርፍር እና ቁርስ', timeSlot: 'BREAKFAST' },
  { key: 'sides', name: 'Sides, Injera & Extras', nameAmharic: 'ተጨማሪ', timeSlot: 'ALL_DAY' },
  { key: 'coffee', name: 'Coffee Ceremony', nameAmharic: 'የቡና ስነ-ስርዓት', timeSlot: 'ALL_DAY' },
  { key: 'beverages', name: 'Coffee, Tea & Drinks', nameAmharic: 'መጠጦች', timeSlot: 'ALL_DAY' },
  { key: 'international', name: 'Café / International', nameAmharic: 'ካፌ / ዓለም አቀፍ', timeSlot: 'ALL_DAY' },
] as const;
