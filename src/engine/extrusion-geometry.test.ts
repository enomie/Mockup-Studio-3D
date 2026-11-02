import { Box3, MeshBasicMaterial } from 'three/webgpu';
import { afterEach, describe, expect, it } from 'vitest';
import {
  clampExtrusionParams,
  defaultExtrusionParams,
  extrusionSizeM,
  resolveExtrusionProfile,
} from '@/scene/asset-extrusion';
import type { AssetEntity } from '@/scene/entity-types';
import { findProfile, registeredProfileMetrics, setRegisteredUserProfiles } from '@/scene/profile-registry';
import { entityProfileId } from '@/scene/profile-usage';
import { buildExtrusionMeshes } from './extrusion-geometry';

const stub = () => new MeshBasicMaterial();

function build(profileId: string, depthM = 0.02, sizeScale = 1) {
  const { entry } = resolveExtrusionProfile(profileId);
  const metrics = registeredProfileMetrics(entry);
  if (!metrics) {throw new Error('no metrics');}
  return buildExtrusionMeshes({
    paths: entry.paths.map((path) => ({ path, material: stub() })),
    bounds: metrics.bounds,
    depthM,
    sizeScale,
  });
}

describe('extrusion', () => {
  afterEach(() => { setRegisteredUserProfiles([]); });

  it('extrudes the default rounded rectangle into a solid standing on the ground', () => {
    const [mesh] = build('extrude-rounded-rect', 0.02);
    const box = new Box3().setFromObject(mesh);
    expect(box.max.x - box.min.x).toBeCloseTo(0.1, 4);
    expect(box.max.y - box.min.y).toBeCloseTo(0.06, 4);
    expect(box.max.z - box.min.z).toBeCloseTo(0.02, 6);
    expect(box.min.y).toBeCloseTo(0, 6);
    expect(box.min.x).toBeCloseTo(-0.05, 4);
  });

  it('builds one part per path of a mixed profile; open paths become double-sided shells', () => {
    const meshes = build('bottle-bordeaux');
    expect(meshes.map((mesh) => mesh.name)).toEqual(['extrusion-path-0', 'extrusion-path-1', 'extrusion-path-2', 'extrusion-path-3']);
    const glass = meshes[0];
    const positions = glass.geometry.getAttribute('position').array as Float32Array;
    expect(positions.every((value) => Number.isFinite(value))).toBe(true);
    expect((glass.material as MeshBasicMaterial).side).toBe(2); // DoubleSide
  });

  it('applies size scale and clamps depth', () => {
    const [mesh] = build('extrude-rounded-rect', 0.02, 2);
    const box = new Box3().setFromObject(mesh);
    expect(box.max.x - box.min.x).toBeCloseTo(0.2, 4);
    expect(clampExtrusionParams({ depthM: 10 }, defaultExtrusionParams()).depthM).toBe(2);
    expect(clampExtrusionParams({ depthM: 0 }, defaultExtrusionParams()).depthM).toBe(0.0005);
  });

  it('falls back to the rounded rectangle for missing profiles', () => {
    const resolved = resolveExtrusionProfile('user-gone');
    expect(resolved.missing).toBe(true);
    expect(resolved.entry.id).toBe('extrude-rounded-rect');
    expect(extrusionSizeM({ profileId: 'user-gone', depthM: 0.01 }).widthM).toBeCloseTo(0.1, 4);
  });

  it('uses user profiles and reports them for rebuilds', () => {
    const source = findProfile('extrude-rounded-rect');
    if (!source) {throw new Error('missing');}
    setRegisteredUserProfiles([{ id: 'user-logo', name: 'Logo', source: 'user', paths: structuredClone(source.paths) }]);
    expect(resolveExtrusionProfile('user-logo').missing).toBe(false);
    const entity = {
      assetKind: 'extrusion',
      extrusionParams: { profileId: 'user-logo', depthM: 0.01 },
    } as unknown as AssetEntity;
    expect(entityProfileId(entity)).toBe('user-logo');
  });
});
