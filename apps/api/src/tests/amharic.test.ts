import { describe, it, expect } from 'vitest';
import {
  validateAmharicSmokeStrings,
  AMHARIC_SMOKE_STRINGS,
  ct,
} from '@qrmenu/shared';

describe('Amharic localization smoke tests', () => {
  it('validates critical Amharic UTF-8 strings', () => {
    expect(validateAmharicSmokeStrings()).toBe(true);
    for (const s of AMHARIC_SMOKE_STRINGS) {
      expect(s.length).toBeGreaterThan(0);
      expect(s).not.toMatch(/Ã.|Â./);
    }
  });

  it('returns Amharic customer translations', () => {
    expect(ct('fasting', 'AM')).toBe('የጾም');
    expect(ct('place_order', 'AM')).toContain('ትዕዛዝ');
    expect(ct('fasting', 'EN')).toBe('Fasting');
  });
});
