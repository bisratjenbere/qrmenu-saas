// ─── Menu Visual Themes ──────────────────────────────────────────
// 6 professionally designed themes for Ethiopian restaurant customer menus.
// Each theme defines CSS custom property overrides that MenuView applies dynamically.
// Managed by Super Admin, selected by Branch Admin.

export interface MenuTheme {
  id: string;
  name: string;
  nameAmharic: string;
  description: string;
  icon: string;
  preview: {
    bg: string;
    card: string;
    primary: string;
    text: string;
    accent: string;
  };
  cssVariables: Record<string, string>;
}

export const MENU_THEMES: MenuTheme[] = [
  {
    id: 'mesob-classic',
    name: 'Mesob Classic',
    nameAmharic: 'ሜሶብ ክላሲክ',
    description: 'Dark charcoal with warm gold accents — authentic Ethiopian feel',
    icon: '☕',
    preview: {
      bg: '#1a1a1a',
      card: '#2a2a2a',
      primary: '#d4a542',
      text: '#f5f0e8',
      accent: '#b8860b',
    },
    cssVariables: {
      '--color-bg': '#1a1a1a',
      '--color-surface': '#2a2a2a',
      '--color-primary': '#d4a542',
      '--color-primary-hover': '#e8b84a',
      '--color-text': '#f5f0e8',
      '--color-text-muted': '#a89b8c',
      '--color-border': 'rgba(212, 165, 66, 0.2)',
      '--color-card-shadow': 'rgba(0, 0, 0, 0.4)',
      '--font-heading': "'Playfair Display', serif",
      '--border-radius-card': '1rem',
      '--border-radius-button': '9999px',
    },
  },
  {
    id: 'modern-addis',
    name: 'Modern Addis',
    nameAmharic: 'ዘመናዊ አዲስ',
    description: 'Clean white with Ethiopian green & red accents — fresh and modern',
    icon: '🌿',
    preview: {
      bg: '#fafafa',
      card: '#ffffff',
      primary: '#00A651',
      text: '#1a1a1a',
      accent: '#E21E26',
    },
    cssVariables: {
      '--color-bg': '#fafafa',
      '--color-surface': '#ffffff',
      '--color-primary': '#00A651',
      '--color-primary-hover': '#008f45',
      '--color-text': '#1a1a1a',
      '--color-text-muted': '#6b7280',
      '--color-border': 'rgba(0, 0, 0, 0.08)',
      '--color-card-shadow': 'rgba(0, 0, 0, 0.06)',
      '--font-heading': "'Inter', sans-serif",
      '--border-radius-card': '1.25rem',
      '--border-radius-button': '0.75rem',
    },
  },
  {
    id: 'royal-abyssinia',
    name: 'Royal Abyssinia',
    nameAmharic: 'ንጉሣዊ አቢሲኒያ',
    description: 'Deep burgundy with ornate gold — luxurious fine dining',
    icon: '👑',
    preview: {
      bg: '#1c0a12',
      card: '#2d1520',
      primary: '#c9a84c',
      text: '#f8f0e3',
      accent: '#8b1a3a',
    },
    cssVariables: {
      '--color-bg': '#1c0a12',
      '--color-surface': '#2d1520',
      '--color-primary': '#c9a84c',
      '--color-primary-hover': '#daba5e',
      '--color-text': '#f8f0e3',
      '--color-text-muted': '#b09a8a',
      '--color-border': 'rgba(201, 168, 76, 0.15)',
      '--color-card-shadow': 'rgba(0, 0, 0, 0.5)',
      '--font-heading': "'Playfair Display', serif",
      '--border-radius-card': '0.5rem',
      '--border-radius-button': '0.25rem',
    },
  },
  {
    id: 'coffee-house',
    name: 'Coffee House',
    nameAmharic: 'ቡና ቤት',
    description: 'Warm brown gradients with cream — cozy café atmosphere',
    icon: '🌅',
    preview: {
      bg: '#f5ebe0',
      card: '#fefcf8',
      primary: '#8b5e34',
      text: '#3d2b1f',
      accent: '#d4a574',
    },
    cssVariables: {
      '--color-bg': '#f5ebe0',
      '--color-surface': '#fefcf8',
      '--color-primary': '#8b5e34',
      '--color-primary-hover': '#7a5030',
      '--color-text': '#3d2b1f',
      '--color-text-muted': '#8b7355',
      '--color-border': 'rgba(139, 94, 52, 0.15)',
      '--color-card-shadow': 'rgba(61, 43, 31, 0.08)',
      '--font-heading': "'Libre Baskerville', serif",
      '--border-radius-card': '1.5rem',
      '--border-radius-button': '9999px',
    },
  },
  {
    id: 'fasting-garden',
    name: 'Fasting Garden',
    nameAmharic: 'የጾም ገነት',
    description: 'Soft sage green with earth tones — organic and peaceful',
    icon: '🍃',
    preview: {
      bg: '#f0f5ef',
      card: '#fafcf9',
      primary: '#4a7c59',
      text: '#2d3b2e',
      accent: '#7fb069',
    },
    cssVariables: {
      '--color-bg': '#f0f5ef',
      '--color-surface': '#fafcf9',
      '--color-primary': '#4a7c59',
      '--color-primary-hover': '#3d6a4c',
      '--color-text': '#2d3b2e',
      '--color-text-muted': '#6b7f6e',
      '--color-border': 'rgba(74, 124, 89, 0.12)',
      '--color-card-shadow': 'rgba(45, 59, 46, 0.06)',
      '--font-heading': "'DM Serif Display', serif",
      '--border-radius-card': '1.25rem',
      '--border-radius-button': '9999px',
    },
  },
  {
    id: 'night-market',
    name: 'Night Market',
    nameAmharic: 'የምሽት ገበያ',
    description: 'True black with neon amber glow — trendy nightlife vibe',
    icon: '🌙',
    preview: {
      bg: '#0a0a0a',
      card: '#161616',
      primary: '#ff9f1c',
      text: '#f0f0f0',
      accent: '#ff6b35',
    },
    cssVariables: {
      '--color-bg': '#0a0a0a',
      '--color-surface': '#161616',
      '--color-primary': '#ff9f1c',
      '--color-primary-hover': '#ffb347',
      '--color-text': '#f0f0f0',
      '--color-text-muted': '#888888',
      '--color-border': 'rgba(255, 159, 28, 0.15)',
      '--color-card-shadow': 'rgba(255, 159, 28, 0.08)',
      '--font-heading': "'Space Grotesk', sans-serif",
      '--border-radius-card': '1rem',
      '--border-radius-button': '0.5rem',
    },
  },
];

export function getThemeById(id: string): MenuTheme | undefined {
  return MENU_THEMES.find(t => t.id === id);
}

export const DEFAULT_THEME_ID = 'mesob-classic';
