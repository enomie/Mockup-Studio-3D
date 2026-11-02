import { describe, expect, it } from 'vitest';
import { defaultMaterialsForKind } from '@/data/material-presets';
import type { AssetEntity } from '@/scene/entity-types';
import { MATERIAL_CHROME_ID, MATERIAL_PAPER_ID } from '@/scene/material-ids';
import { MATERIAL_ENTITY_SLOTS } from '@/scene/material-types';
import { collectEntityMaterialIds, entityUsesMaterial } from './entity-material-usage';

function entity(partial: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: 'e1',
    type: 'asset',
    name: 'Test',
    assetKind: 'block',
    screenImageId: null,
    sizeScale: 1,
    visible: true,
    transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    ...partial,
  };
}

describe('entityUsesMaterial', () => {
  it.each(MATERIAL_ENTITY_SLOTS)('detects material assigned via %s', (slot) => {
    const e = entity({ materials: { [slot]: 'user-x' } });
    expect(entityUsesMaterial(e, 'user-x')).toBe(true);
    expect(entityUsesMaterial(e, 'user-y')).toBe(false);
  });

  it('falls back to kind default slots when the entity has none', () => {
    const defaults = Object.values(defaultMaterialsForKind('block')).filter(
      (value): value is string => typeof value === 'string',
    );
    expect(defaults.length).toBeGreaterThan(0);
    expect(entityUsesMaterial(entity(), defaults[0])).toBe(true);
  });

  it('treats image content as using the Paper preset', () => {
    expect(entityUsesMaterial(entity({ materials: {}, screenImageId: 'img' }), MATERIAL_PAPER_ID)).toBe(true);
    expect(collectEntityMaterialIds(entity({ materials: {} })).has(MATERIAL_PAPER_ID)).toBe(false);
  });

  it('matches legacy material ids after migration', () => {
    const e = entity({ materials: { blockMaterialId: 'material-silver' } });
    expect(entityUsesMaterial(e, MATERIAL_CHROME_ID)).toBe(true);
    expect(entityUsesMaterial(e, 'material-silver')).toBe(true);
  });
});
