import { describe, expect, it } from 'vitest';
import {
  defaultWineBottleParams,
  wineBottleFootprintAspect,
  wineBottleMaxOuterDiameterM,
} from './asset-wine-bottle';
import { resolveAssetAspectRatio } from './asset-sizing';
import { DEFAULT_SIZE_SCALE, defaultTransform, type AssetEntity } from './entity-types';

function wineEntity(profile: 'bordeaux' | 'alsace' | 'sparkling'): AssetEntity {
  return {
    id: 'w1',
    type: 'asset',
    name: 'Bottle Wine 1',
    assetKind: 'wine-bottle',
    screenImageId: null,
    sizeScale: DEFAULT_SIZE_SCALE,
    wineBottleParams: defaultWineBottleParams(profile),
    visible: true,
    transform: defaultTransform(),
  };
}

describe('wine bottle footprint aspect', () => {
  it('uses belly diameter / height per profile', () => {
    const heightM = 0.29;
    // Belly diameter is measured from the SVG (≈ 76 / 88 mm, within 0.5 mm).
    expect(wineBottleFootprintAspect('bordeaux', heightM) * heightM).toBeCloseTo(0.076, 3);
    expect(wineBottleFootprintAspect('sparkling', heightM) * heightM).toBeCloseTo(0.088, 3);
    expect(wineBottleMaxOuterDiameterM('bordeaux')).toBeCloseTo(0.07628, 4);
  });

  it('resolveAssetAspectRatio follows wineBottleBodyProfile', () => {
    const bordeaux = resolveAssetAspectRatio('wine-bottle', undefined, undefined, wineEntity('bordeaux'));
    const sparkling = resolveAssetAspectRatio('wine-bottle', undefined, undefined, wineEntity('sparkling'));
    expect(sparkling).toBeGreaterThan(bordeaux);
    expect(bordeaux).toBeCloseTo(0.076 / 0.29, 2);
    expect(sparkling).toBeCloseTo(0.088 / 0.29, 2);
    expect(defaultWineBottleParams('bordeaux').heightM).toBeCloseTo(0.29, 6);
  });
});
