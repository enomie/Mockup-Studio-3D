import { describe, expect, it } from 'vitest';
import { MATERIAL_FABRIC_ID } from '@/scene/material-ids';
import {
  fabricDrapeProfileForMaterialId,
  legacyRubberyFabricDrapeParams,
  resolveFabricDrape,
} from './fabric-cloth-drape';

describe('resolveFabricDrape', () => {
  it('maps material-silk to silk profile', () => {
    const drape = resolveFabricDrape('material-silk');
    expect(drape.profile).toBe('silk');
    expect(drape.edgeSoftness.naturalFrequency).toBeGreaterThan(20);
  });

  it('maps material-fabric to linen profile', () => {
    expect(fabricDrapeProfileForMaterialId(MATERIAL_FABRIC_ID)).toBe('linen');
  });

  it('falls back to linen for unknown material ids', () => {
    expect(resolveFabricDrape('material-unknown')).toMatchObject({ profile: 'linen' });
  });

  it('legacy rubbery params stay very soft (regression guard)', () => {
    const legacy = legacyRubberyFabricDrapeParams();
    const silk = resolveFabricDrape('material-silk');
    expect(silk.edgeSoftness.naturalFrequency).toBeGreaterThan(
      legacy.edgeSoftness.naturalFrequency * 10,
    );
  });
});
