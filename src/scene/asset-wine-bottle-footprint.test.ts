import { describe, expect, it } from 'vitest';
import { defaultWineBottleParams, wineBottleFootprintAspect } from './asset-wine-bottle';
import { resolveAssetAspectRatio } from './asset-sizing';
import { DEFAULT_SIZE_SCALE, defaultTransform, type AssetEntity } from './entity-types';

function wineEntity(profile: 'bordeaux' | 'alsace' | 'sparkling'): AssetEntity {
  return {
    id: 'w1',
    type: 'asset',
    name: 'Wine bottle 1',
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
    expect(wineBottleFootprintAspect('bordeaux', heightM)).toBeCloseTo(0.076 / heightM, 4);
    expect(wineBottleFootprintAspect('sparkling', heightM)).toBeCloseTo(0.088 / heightM, 4);
  });

  it('resolveAssetAspectRatio follows wineBottleBodyProfile', () => {
    const bordeaux = resolveAssetAspectRatio('wine-bottle', undefined, undefined, wineEntity('bordeaux'));
    const sparkling = resolveAssetAspectRatio('wine-bottle', undefined, undefined, wineEntity('sparkling'));
    expect(sparkling).toBeGreaterThan(bordeaux);
    expect(bordeaux).toBeCloseTo(0.076 / 0.29, 3);
    expect(sparkling).toBeCloseTo(0.088 / 0.29, 3);
  });
});
