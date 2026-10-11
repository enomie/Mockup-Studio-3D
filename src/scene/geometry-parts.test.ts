import { describe, expect, it } from 'vitest';
import {
  geometryPartMaterialSlot,
  geometryVisibilityFromPartDescriptors,
} from './geometry-parts';

describe('geometryVisibilityFromPartDescriptors', () => {
  it('defaults all listed parts to visible', () => {
    expect(
      geometryVisibilityFromPartDescriptors([
        { part: 'frame', label: 'Frame', ui: 'visibility-and-material', materialSlot: 'frameMaterialId' },
        { part: 'label', label: 'Label', ui: 'visibility-only' },
      ]),
    ).toEqual({ frame: true, label: true });
  });

  it('respects defaultVisible false', () => {
    expect(
      geometryVisibilityFromPartDescriptors([
        {
          part: 'glazing',
          label: 'Glass',
          ui: 'visibility-and-material',
          materialSlot: 'glazingMaterialId',
          defaultVisible: false,
        },
      ]),
    ).toEqual({ glazing: false });
  });
});

describe('geometryPartMaterialSlot', () => {
  it('returns slot for visibility-and-material parts', () => {
    expect(
      geometryPartMaterialSlot({
        part: 'body',
        label: 'Glass',
        ui: 'visibility-and-material',
        materialSlot: 'glassMaterialId',
      }),
    ).toBe('glassMaterialId');
  });

  it('throws for visibility-only parts', () => {
    expect(() =>
      geometryPartMaterialSlot({
        part: 'label',
        label: 'Label',
        ui: 'visibility-only',
      }),
    ).toThrow(/no material slot/);
  });
});
