// ─── Admin UI Translation Dictionary ──────────────────────────────
// Complete bilingual text for the admin interface.
// Used by LanguageContext to toggle between EN and AM modes.

export type Locale = 'EN' | 'AM';

export interface Translations {
  [key: string]: { EN: string; AM: string };
}

export const ADMIN_TRANSLATIONS: Translations = {
  // ─── Navigation & Headers ─────────────────────────
  'menu_editor': { EN: 'Menu Editor', AM: 'ምናሌ አርታኢ' },
  'dashboard': { EN: 'Dashboard', AM: 'ዳሽቦርድ' },
  'branches': { EN: 'Branches', AM: 'ቅርንጫፎች' },
  'staff': { EN: 'Staff', AM: 'ሰራተኞች' },
  'orders': { EN: 'Orders', AM: 'ትዕዛዞች' },
  'settings': { EN: 'Settings', AM: 'ቅንብሮች' },

  // ─── Buttons ──────────────────────────────────────
  'save': { EN: 'Save', AM: 'ያስቀምጡ' },
  'cancel': { EN: 'Cancel', AM: 'ይሰርዙ' },
  'delete': { EN: 'Delete', AM: 'ያጥፉ' },
  'edit': { EN: 'Edit', AM: 'ያስተካክሉ' },
  'close': { EN: 'Close', AM: 'ይዝጉ' },
  'confirm': { EN: 'Confirm', AM: 'ያረጋግጡ' },
  'publish_menu': { EN: 'Publish Menu', AM: 'ምናሌ ያትሙ' },
  'preview_menu': { EN: 'Preview Menu', AM: 'ምናሌ ይቃኙ' },
  'add_section': { EN: 'Add Section', AM: 'ክፍል ይጨምሩ' },
  'add_item': { EN: 'Add Item', AM: 'ምግብ ያክሉ' },
  'quick_add': { EN: 'Quick Add', AM: 'ፈጣን ማከል' },
  'browse_catalog': { EN: 'Browse Dish Catalog', AM: 'ከምግብ ካታሎግ ይምረጡ' },
  'create_custom': { EN: 'Create Custom Dish', AM: 'ብጁ ምግብ ይፍጠሩ' },
  'use_template': { EN: 'Use Template', AM: 'ቅንብር ይጠቀሙ' },
  'start_empty': { EN: 'Start from Scratch', AM: 'ባዶ ምናሌ ይጀምሩ' },
  'more_details': { EN: 'More Details', AM: 'ተጨማሪ ዝርዝሮች' },
  'less_details': { EN: 'Less Details', AM: 'ያሳጥሩ' },
  'available': { EN: 'Available', AM: 'ይገኛል' },
  'unavailable': { EN: 'Unavailable', AM: 'አይገኝም' },
  'select_theme': { EN: 'Select Theme', AM: 'ገጽታ ይምረጡ' },

  // ─── Form Labels ──────────────────────────────────
  'section_name': { EN: 'Section Name', AM: 'የክፍል ስም' },
  'amharic_name': { EN: 'Amharic Name', AM: 'አማርኛ ስም' },
  'item_name': { EN: 'Item Name', AM: 'የምግብ ስም' },
  'english_name': { EN: 'English Name', AM: 'እንግሊዝኛ ስም' },
  'description': { EN: 'Description', AM: 'ገለጻ' },
  'price': { EN: 'Price', AM: 'ዋጋ' },
  'price_etb': { EN: 'Price (ETB)', AM: 'ዋጋ (ብር)' },
  'photo': { EN: 'Photo', AM: 'ፎቶ' },
  'dietary_labels': { EN: 'Dietary Labels', AM: 'የአመጋገብ ምልክቶች' },
  'spice_level': { EN: 'Spice Level', AM: 'የቅመም ደረጃ' },
  'prep_time': { EN: 'Prep Time (min)', AM: 'የዝግጅት ጊዜ (ደቂቃ)' },
  'calories': { EN: 'Calories', AM: 'ካሎሪ' },
  'serving_size': { EN: 'Serving Size', AM: 'የምግብ መጠን' },
  'time_slot': { EN: 'Time Slot', AM: 'የምግብ ሰዓት' },

  // ─── Time Slots ───────────────────────────────────
  'all_day': { EN: 'All Day', AM: 'ሙሉ ቀን' },
  'breakfast': { EN: 'Breakfast', AM: 'ቁርስ' },
  'lunch_dinner': { EN: 'Lunch & Dinner', AM: 'ምሳ እና ራት' },

  // ─── Spice Levels ─────────────────────────────────
  'spice_alicha': { EN: 'Alicha (Mild)', AM: 'አልጫ (ቀለል)' },
  'spice_qey': { EN: 'Qey (Medium)', AM: 'ቀይ (መካከለኛ)' },
  'spice_berbere': { EN: '🌶️ Berbere (Spicy)', AM: '🌶️ በርበሬ (ቅመም)' },
  'spice_mitmita': { EN: '🔥 Mitmita (Very Hot)', AM: '🔥 ሚጥሚጣ (በጣም ትኩስ)' },

  // ─── Dietary Labels ───────────────────────────────
  'label_fasting': { EN: '🕌 Fasting', AM: '🕌 የጾም' },
  'label_vegan': { EN: '🌱 Vegan', AM: '🌱 ቬጋን' },
  'label_gf': { EN: '🌾 Gluten-Free', AM: '🌾 ግሉተን ፍሪ' },
  'label_halal': { EN: '🕌 Halal', AM: '🕌 ሐላል' },
  'label_spicy': { EN: '🌶️ Spicy', AM: '🌶️ ቅመም' },

  // ─── Combo / Beyaynetu ────────────────────────────
  'is_combo': { EN: 'This is a Combo / Beyaynetu Platter', AM: 'ይህ በያይነቱ/ኮምቦ ነው' },
  'combo_item_count': { EN: 'Number of Stews', AM: 'የወጥ ብዛት' },
  'combo_price': { EN: 'Combo Price', AM: 'የኮምቦ ዋጋ' },

  // ─── Section Modals ───────────────────────────────
  'create_section': { EN: 'Create Section', AM: 'ክፍል ይፍጠሩ' },
  'create_item': { EN: 'Create Item', AM: 'ምግብ ይፍጠሩ' },
  'edit_item': { EN: 'Edit Item', AM: 'ምግብ ያስተካክሉ' },
  'delete_section': { EN: 'Delete Section', AM: 'ክፍል ያጥፉ' },
  'delete_item': { EN: 'Delete Item', AM: 'ምግብ ያጥፉ' },
  'delete_confirm': { EN: 'Are you sure you want to delete this?', AM: 'ይህንን ማጥፋት ይፈልጋሉ?' },

  // ─── Template Picker ──────────────────────────────
  'choose_template': { EN: 'Choose a Template to Get Started', AM: 'ምናሌ ቅንብር ይምረጡ' },
  'template_traditional': { EN: 'Traditional Ethiopian Restaurant', AM: 'ባህላዊ ኢትዮጵያ ምግብ ቤት' },
  'template_cafe': { EN: 'Ethiopian Café & Bakery', AM: 'ካፌ እና ዳቦ ቤት' },
  'template_fasting': { EN: 'Fasting Specialty House', AM: 'የጾም ምግብ ቤት' },
  'template_modern': { EN: 'Modern Bistro & Lounge', AM: 'ዘመናዊ ምግብ ቤት' },

  // ─── Section Presets ──────────────────────────────
  'preset_appetizers': { EN: '🥗 Appetizers', AM: '🥗 ምግብ ማስጀመሪያ' },
  'preset_beyaynetu': { EN: '🍽 Beyaynetu', AM: '🍽 በያይነቱ' },
  'preset_tibs': { EN: '🥩 Tibs', AM: '🥩 ጥብስ' },
  'preset_wot': { EN: '🍲 Wot / Stews', AM: '🍲 ወጥ' },
  'preset_kitfo': { EN: '🔪 Kitfo', AM: '🔪 ክትፎ' },
  'preset_fasting': { EN: '🌿 Fasting Menu', AM: '🌿 የጾም ምግቦች' },
  'preset_breakfast': { EN: '☀️ Breakfast', AM: '☀️ ቁርስ' },
  'preset_beverages': { EN: '🥤 Beverages', AM: '🥤 መጠጦች' },
  'preset_coffee': { EN: '☕ Coffee', AM: '☕ ቡና' },
  'preset_desserts': { EN: '🍰 Desserts', AM: '🍰 ጣፋጭ' },

  // ─── Status & Messages ────────────────────────────
  'status_draft': { EN: 'DRAFT', AM: 'ረቂቅ' },
  'status_published': { EN: 'PUBLISHED', AM: 'ታትሟል' },
  'section_created': { EN: 'Section created', AM: 'ክፍል ተፈጥሯል' },
  'item_created': { EN: 'Item created', AM: 'ምግብ ተፈጥሯል' },
  'item_updated': { EN: 'Item updated', AM: 'ምግብ ተስተካክሏል' },
  'menu_published': { EN: 'Menu published successfully', AM: 'ምናሌ በተሳካ ሁኔታ ታትሟል' },
  'failed_publish': { EN: 'Failed to publish', AM: 'ማተም አልተሳካም' },
  'failed_create': { EN: 'Failed to create', AM: 'መፍጠር አልተሳካም' },
  'failed_update': { EN: 'Failed to update', AM: 'ማስተካከል አልተሳካም' },
  'failed_delete': { EN: 'Failed to delete', AM: 'ማጥፋት አልተሳካም' },

  // ─── Drag & Drop / Photo ──────────────────────────
  'drag_drop_photo': { EN: 'Drag & drop an image here, or click to select', AM: 'ፎቶ ይጎትቱ ወይም ይምረጡ' },
  'change_image': { EN: 'Click or drag to change image', AM: 'ፎቶ ለመቀየር ይጫኑ' },

  // ─── Placeholders ─────────────────────────────────
  'placeholder_section_name': { EN: 'e.g. Appetizers', AM: 'ለምሳሌ ምግብ ማስጀመሪያ' },
  'placeholder_section_amharic': { EN: 'e.g. የጾም ምግቦች', AM: 'ለምሳሌ የጾም ምግቦች' },
  'placeholder_item_name': { EN: 'e.g. Doro Wot', AM: 'ለምሳሌ ድሮ ወጥ' },
  'placeholder_item_amharic': { EN: 'e.g. ድሮ ወጥ', AM: 'ለምሳሌ ድሮ ወጥ' },
  'placeholder_description': { EN: 'Describe the dish...', AM: 'ምግቡን ይግለጹ...' },
  'placeholder_price': { EN: 'e.g. 350', AM: 'ለምሳሌ 350' },
  'placeholder_serving': { EN: 'e.g. Serves 2-3', AM: 'ለምሳሌ ለ2-3 ሰው' },
  'placeholder_search_dishes': { EN: 'Search dishes...', AM: 'ምግብ ይፈልጉ...' },

  // ─── Theme Picker ─────────────────────────────────
  'choose_theme': { EN: 'Choose Menu Theme', AM: 'የምናሌ ገጽታ ይምረጡ' },
  'theme_description': { EN: 'This theme controls how customers see your menu', AM: 'ይህ ገጽታ ደንበኞች ምናሌዎን እንዴት እንደሚያዩ ይቆጣጠራል' },
};

// ─── Helper ─────────────────────────────────────────────────────
export function t(key: string, locale: Locale): string {
  const entry = ADMIN_TRANSLATIONS[key];
  if (!entry) return key;
  return entry[locale] || entry['EN'] || key;
}
