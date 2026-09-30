import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../scripts/contrast-check';

describe('smoke', () => {
  it('computes WCAG contrast', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });
});
