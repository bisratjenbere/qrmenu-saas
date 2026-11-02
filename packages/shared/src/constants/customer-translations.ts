import { Locale } from './admin-translations.js';

export interface CustomerTranslations {
  [key: string]: { EN: string; AM: string };
}

export const CUSTOMER_TRANSLATIONS: CustomerTranslations = {
  all: { EN: 'All', AM: 'ሁሉም' },
  popular: { EN: 'Popular', AM: 'ተወዳጅ' },
  fasting: { EN: 'Fasting', AM: 'የጾም' },
  mild: { EN: 'Mild', AM: 'ቀለል' },
  spicy: { EN: 'Spicy', AM: 'ቅመም' },
  vegan: { EN: 'Vegan', AM: 'ቬጋን' },
  gluten_free: { EN: 'Gluten-free', AM: 'ግሉተን-ፍሪ' },
  add_to_basket: { EN: 'Add to basket', AM: 'ወደ ቅርጫት ጨምር' },
  basket: { EN: 'Basket', AM: 'ቅርጫት' },
  checkout: { EN: 'Checkout', AM: 'ትዕዛዝ ስጥ' },
  place_order: { EN: 'Place order', AM: 'ትዕዛዝ አስገባ' },
  order_success: { EN: 'Order placed!', AM: 'ትዕዛዝዎ ተሳክቷል!' },
  cancel: { EN: 'Cancel', AM: 'ሰርዝ' },
  close: { EN: 'Close', AM: 'ዝጋ' },
  back_to_menu: { EN: 'Back to Menu', AM: 'ወደ ሜኑ ተመለስ' },
  search_placeholder: { EN: 'Search dishes, drinks...', AM: 'ምግብ፣ መጠጥ ይፈልጉ...' },
  fasting_only: { EN: 'Fasting Only (የጾም)', AM: 'የጾም ብቻ' },
  all_dishes: { EN: 'All Dishes', AM: 'ሁሉም ምግቦች' },
  customize: { EN: 'Customize', AM: 'አብጅ' },
  add: { EN: 'Add', AM: 'ጨምር' },
  empty_cart: { EN: 'Your basket is empty', AM: 'ቅርጫትዎ ባዶ ነው' },
  items: { EN: 'items', AM: 'ዕቃዎች' },
  unavailable: { EN: 'Unavailable', AM: 'አይገኝም' },
  sold_out: { EN: 'Sold out', AM: 'ተጠናቋል' },
  required_choices: { EN: 'Required choices', AM: 'አስፈላጊ ምርጫዎች' },
  optional_extras: { EN: 'Optional extras', AM: 'አማራጭ ተጨማሪ' },
  guest_notes: { EN: 'Special requests', AM: 'ልዩ ጥያቄ' },
  subtotal: { EN: 'Subtotal', AM: 'ንዑስ ድምር' },
  service_charge: { EN: 'Service charge', AM: 'የአገልግሎት ክፍያ' },
  vat: { EN: 'VAT', AM: 'VAT' },
  total: { EN: 'Total', AM: 'ጠቅላላ' },
  dine_in: { EN: 'Dine in', AM: 'በቦታ መብላት' },
  takeaway: { EN: 'Takeaway', AM: 'ወሰድ' },
  room_service: { EN: 'Room service', AM: 'የክፍል አገልግሎት' },
  table_number: { EN: 'Table', AM: 'የጠረጴዛ ቁጥር' },
  select_table: { EN: 'Select table', AM: 'ጠረጴዛ ይምረጡ' },
  menu_only_notice: { EN: 'Browse only — ordering is disabled at this branch.', AM: 'ለማየት ብቻ — ትዕዛዝ በዚህ ቅርንጫፍ አይደገፍም።' },
  call_waiter: { EN: 'Call waiter', AM: 'አገልጋይ ጥራ' },
  request_bill: { EN: 'Request bill', AM: 'ቢል ጠይቅ' },
  whatsapp: { EN: 'WhatsApp', AM: 'ዋትስአፕ' },
  no_results: { EN: 'No dishes match your filters.', AM: 'ምግቦች አልተገኙም።' },
  switch_takeaway: { EN: 'Order takeaway instead', AM: 'ወሰድ ትዕዛዝ' },
  locked_table: { EN: 'Table', AM: 'ጠረጴዛ' },
  prep_time: { EN: 'Prep time', AM: 'የዝግጅት ጊዜ' },
  allergens: { EN: 'Allergens', AM: 'አለርጂዎች' },
  serving_size: { EN: 'Serving size', AM: 'መጠን' },
  explainer_injera: {
    EN: 'Injera is a spongy sourdough flatbread used to scoop stews and salads.',
    AM: 'እንጀራ የወጥ እና ሰላጣ ለመቀበል የሚያገለግል ምግብ ነው።',
  },
  explainer_beyaynetu: {
    EN: 'Beyaynetu is a sharing platter with several wots on injera — great for groups.',
    AM: 'በያይነቱ በአንድ እንጀራ ላይ ብዙ ወጦችን የያዘ ለማጋራት የሚሆን ምግብ ነው።',
  },
  explainer_fasting: {
    EN: 'Fasting dishes contain no animal products — suitable for Ethiopian Orthodox fasting days.',
    AM: 'የጾም ምግቦች ስጋ/ወተት አይካተቱም — ለጾም ቀናት ተስማሚ ናቸው።',
  },
  explainer_spice: {
    EN: 'Alicha = mild, Qey = medium, Berbere = spicy, Mitmita = very hot.',
    AM: 'አልጫ = ቀለል፣ ቀይ = መካከለኛ፣ በርበሬ = ቅመም፣ ሚጥሚጣ = በጣም ትኩስ።',
  },
  show_explainers: { EN: 'New to Ethiopian food?', AM: 'የኢትዮጵያ ምግብ መመሪያ' },
  hide_explainers: { EN: 'Hide tips', AM: 'መመሪያ ደብቅ' },
};

Object.assign(CUSTOMER_TRANSLATIONS, {
  bill_requested: { EN: 'Bill requested', AM: 'ቢል ተጠይቋል' },
  waiter_notified: { EN: 'Waiter notified', AM: 'አገልጋይ ተጠርቷል' },
  staff_notified: { EN: 'Staff notified.', AM: 'አገልጋዮች ተጠርተዋል።' },
  staff_on_the_way: { EN: 'A staff member is on the way.', AM: 'አገልጋይ በመምጣት ላይ ነው።' },
  request_completed: { EN: 'Your request has been completed.', AM: 'ጥያቄዎ ተጠናቋል።' },
  which_table: { EN: 'Which table are you at?', AM: 'በየትኛው ጠረጴዛ ላይ ነዎት?' },
  track_order: { EN: 'Track your order', AM: 'ትዕዛዝዎን ይከታተሉ' },
});

export function ct(key: string, locale: Locale): string {
  const entry = CUSTOMER_TRANSLATIONS[key];
  if (!entry) return key;
  return entry[locale] || entry.EN || key;
}

/** Smoke-test helper: ensure critical Amharic strings are valid UTF-8 */
export const AMHARIC_SMOKE_STRINGS = [
  CUSTOMER_TRANSLATIONS.fasting.AM,
  CUSTOMER_TRANSLATIONS.basket.AM,
  CUSTOMER_TRANSLATIONS.place_order.AM,
  'የጾም',
  'ተወዳጅ',
  'በያይነቱ',
] as const;

export function validateAmharicSmokeStrings(): boolean {
  return AMHARIC_SMOKE_STRINGS.every(s => /[\u1200-\u137F]/.test(s));
}
