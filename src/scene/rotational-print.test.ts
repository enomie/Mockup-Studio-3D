import { describe, expect, it } from 'vitest';
import {
  defaultRotationalPrintSettings,
  isRotationalPrintAssetKind,
  resolveRotationalPrintSettings,
} from './rotational-print';

describe('rotational print settings', () => {
  it('uses per-asset substrate defaults', () => {
    expect(defaultRotationalPrintSettings('beverage-can').substrate).toBe(1);
    expect(defaultRotationalPrintSettings('tin-can').substrate).toBe(0);
    expect(defaultRotationalPrintSettings('wine-bottle').substrate).toBe(0);
    expect(defaultRotationalPrintSettings('pen').substrate).toBe(1);
  });

  it('prefers stored values over defaults', () => {
    expect(resolveRotationalPrintSettings({ substrate: 0.4 }, 'pen')).toEqual({
      substrate: 0.4,
      inkOpacity: 1,
    });
  });

  it('only covers lathe print assets', () => {
    expect(isRotationalPrintAssetKind('pen')).toBe(true);
    expect(isRotationalPrintAssetKind('picture')).toBe(false);
  });
});
