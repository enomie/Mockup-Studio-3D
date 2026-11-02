import { Group, MeshBasicMaterial } from 'three/webgpu';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultBeverageCanParams } from '@/scene/asset-beverage-can';
import { defaultPenParams, penNominalFootprintM, resolvePenProfile } from '@/scene/asset-pen';
import {
  clampWheelCarParams,
  defaultWheelCarParams,
  resolveWheelCarProfile,
  wheelCarDimensionsM,
} from '@/scene/asset-wheel-car';
import {
  beverageCanProfileMm,
  resolveBeverageCanProfile,
} from '@/scene/beverage-can-profile-metrics';
import type { AssetEntity } from '@/scene/entity-types';
import { BUILTIN_PROFILES, type ProfileEntry } from '@/scene/profile-library';
import { setRegisteredUserProfiles } from '@/scene/profile-registry';
import { entityProfileId } from '@/scene/profile-usage';
import { MaterialResolver } from './material-resolver';
import { addWheelCar } from './asset-meshes/populate-wheel-car';
import { buildBeverageCanMeshes } from './beverage-can-geometry';
import { buildPenMeshes } from './pen-geometry';

const stub = () => new MeshBasicMaterial();

function userCopy(sourceId: string, id: string, keepSlots?: number[]): ProfileEntry {
  const source = BUILTIN_PROFILES.find((entry) => entry.id === sourceId);
  if (!source) {throw new Error(sourceId);}
  const paths = structuredClone(source.paths).filter(
    (path) => !keepSlots || keepSlots.includes(path.slot),
  );
  return { id, name: 'Copy', source: 'user', paths };
}

describe('pen, can and wheel with any profile', () => {
  afterEach(() => { setRegisteredUserProfiles([]); });

  it('keeps legacy profile names working with identical sizes', () => {
    expect(penNominalFootprintM('marker')).toEqual(penNominalFootprintM('pen-marker'));
    expect(defaultPenParams('fountain').penBodyProfile).toBe('pen-fountain');
    expect(beverageCanProfileMm('sleek')).toEqual(beverageCanProfileMm('can-330-sleek'));
    expect(defaultBeverageCanParams('standard').canBodyProfile).toBe('can-330-classic');
    expect(wheelCarDimensionsM(1)).toEqual(wheelCarDimensionsM(1, 'wheel-car'));
    // Wheels saved before profiles existed get the built-in wheel.
    const legacy = { spokeCount: 5 } as unknown as ReturnType<typeof defaultWheelCarParams>;
    expect(clampWheelCarParams({}, legacy).profileId).toBe('wheel-car');
  });

  it('falls back when the required path is missing', () => {
    setRegisteredUserProfiles([
      userCopy('pen-marker', 'user-no-body', [0, 1]),
      userCopy('can-330-classic', 'user-no-can-body', [1]),
      userCopy('wheel-car', 'user-no-tire', [1, 2]),
    ]);
    expect(resolvePenProfile('user-no-body')).toMatchObject({ missing: true, entry: { id: 'pen-marker' } });
    expect(resolveBeverageCanProfile('user-no-can-body').entry.id).toBe('can-330-classic');
    expect(resolveWheelCarProfile('user-no-tire').entry.id).toBe('wheel-car');
  });

  it('builds a pen from a user profile', async () => {
    setRegisteredUserProfiles([userCopy('pen-fountain', 'user-pen')]);
    const result = await buildPenMeshes({
      penParams: { penBodyProfile: 'user-pen' },
      sizeScale: 1,
      capMaterial: stub(),
      ringMaterial: stub(),
      bodyMaterial: stub(),
    });
    expect(result.bodyMesh.geometry.getAttribute('position').count).toBeGreaterThan(0);
  });

  it('builds a can from a user profile, also without a top ring', async () => {
    setRegisteredUserProfiles([userCopy('can-330-classic', 'user-can-no-ring', [0])]);
    expect(beverageCanProfileMm('user-can-no-ring').labelTopFromFootMm).toBeGreaterThan(100);
    const result = await buildBeverageCanMeshes({
      params: { ...defaultBeverageCanParams(), canBodyProfile: 'user-can-no-ring' },
      sizeScale: 1,
      bodyMetalMaterial: stub(),
      topRingMetalMaterial: stub(),
    });
    expect(result.bodyMesh.geometry.getAttribute('position').count).toBeGreaterThan(0);
    expect(result.topRingMesh.visible).toBe(false);
  });

  it('builds a wheel from a user profile and reports it for rebuilds', async () => {
    setRegisteredUserProfiles([userCopy('wheel-car', 'user-wheel')]);
    const group = new Group();
    await addWheelCar(group, new MaterialResolver(), {}, {
      ...defaultWheelCarParams(),
      profileId: 'user-wheel',
    });
    expect(group.children.length).toBeGreaterThan(0);
    const wheel = { assetKind: 'wheel-car', wheelCarParams: { spokeCount: 5, profileId: 'user-wheel' } };
    expect(entityProfileId(wheel as unknown as AssetEntity)).toBe('user-wheel');
    expect(entityProfileId({ assetKind: 'wheel-car' } as unknown as AssetEntity)).toBe('wheel-car');
  });
});
