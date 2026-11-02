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

describe('extrusion holes', () => {
  const square = (id: string, slot: number, x: number, size: number, extra = {}) => ({
    id,
    name: id,
    slot,
    closed: true,
    nodes: [
      { x, y: x, mode: 'corner' as const },
      { x: x + size, y: x, mode: 'corner' as const },
      { x: x + size, y: x + size, mode: 'corner' as const },
      { x, y: x + size, mode: 'corner' as const },
    ],
    ...extra,
  });

  it('cuts a hole with its own wall material group', () => {
    const outer = square('outer', 0, 0, 100);
    const hole = square('hole', 1, 30, 40);
    const body = stub();
    const wall = stub();
    const [mesh] = buildExtrusionMeshes({
      paths: [{ path: outer, material: body, holes: [{ path: hole, wallMaterial: wall }] }],
      bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
      depthM: 0.01,
      sizeScale: 1,
    });
    expect(mesh.material).toEqual([body, wall]);
    expect(mesh.geometry.groups.map((group) => group.materialIndex)).toEqual([0, 1]);
    // Hole wall triangles lie on the hole outline (x within 30…70 mm around the centre).
    const position = mesh.geometry.getAttribute('position');
    const holeGroup = mesh.geometry.groups[1];
    for (let v = holeGroup.start; v < holeGroup.start + holeGroup.count; v++) {
      expect(Math.abs(position.getX(v))).toBeLessThanOrEqual(0.0201);
    }
    // No cap triangle covers the centre of the hole.
    const caps = mesh.geometry.groups[0];
    let centreCovered = false;
    for (let v = caps.start; v < caps.start + caps.count; v += 3) {
      const xs = [0, 1, 2].map((k) => position.getX(v + k));
      const ys = [0, 1, 2].map((k) => position.getY(v + k));
      if (Math.max(...xs) < 0.01 && Math.min(...xs) > -0.01 && Math.max(...ys) < 0.06 && Math.min(...ys) > 0.04) {
        centreCovered = true;
      }
    }
    expect(centreCovered).toBe(false);
  });
});
