import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Box3, Group, MeshBasicMaterial, Vector3, type Mesh } from 'three/webgpu';
import {
  addWheelCarMeshesFromSvg,
  buildWheelCarLatheGeometry,
} from './wheel-car-geometry';
import {
  extractWheelCarPathsFromSvgText,
  normalizeWheelCarPaths,
} from './wheel-car-svg-profile';
import { defaultWheelCarParams, wheelCarDimensionsM } from '@/scene/asset-wheel-car';

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../public/profiles/lathe',
);

function loadFixtureProfiles(sizeScale = 1) {
  const svgText = readFileSync(join(FIXTURE_DIR, 'lathe-x-wheel-car.svg'), 'utf8');
  const raw = extractWheelCarPathsFromSvgText(svgText);
  return normalizeWheelCarPaths(raw, sizeScale);
}

describe('wheel-car-geometry', () => {
  it('builds lathe geometry without NaN', () => {
    const profiles = loadFixtureProfiles();
    const geometry = buildWheelCarLatheGeometry(profiles.tire);
    const pos = geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i += 1) {
      expect(Number.isFinite(pos.getX(i))).toBe(true);
      expect(Number.isFinite(pos.getY(i))).toBe(true);
      expect(Number.isFinite(pos.getZ(i))).toBe(true);
    }
    geometry.dispose();
  });

  it('wheel group bounding box matches outer diameter with foot at y=0', () => {
    const params = defaultWheelCarParams();
    const { outerRadiusM } = wheelCarDimensionsM();
    const profiles = loadFixtureProfiles();
    const group = new Group();
    const mat = new MeshBasicMaterial();
    addWheelCarMeshesFromSvg(group, profiles, params, 1, mat, mat);
    const box = new Box3().setFromObject(group);
    const size = new Vector3();
    box.getSize(size);
    const maxExtent = Math.max(size.x, size.y, size.z);
    expect(maxExtent).toBeGreaterThan(outerRadiusM * 1.9);
    expect(maxExtent).toBeLessThan(outerRadiusM * 2.1);
    expect(box.min.y).toBeGreaterThanOrEqual(-0.002);
    expect(box.max.y).toBeLessThanOrEqual(outerRadiusM * 2 + 0.002);
    mat.dispose();
  });

  it('keeps vertex count within budget', () => {
    const profiles = loadFixtureProfiles();
    const geometry = buildWheelCarLatheGeometry(profiles.tire);
    expect(geometry.getAttribute('position').count).toBeLessThan(20_000);
    geometry.dispose();
  });

  it('builds spokes from the SVG side view (no extra stirn rings) and scales with sizeScale', () => {
    const params = defaultWheelCarParams();
    for (const sizeScale of [1, 2]) {
      const group = new Group();
      const mat = new MeshBasicMaterial();
      addWheelCarMeshesFromSvg(group, loadFixtureProfiles(sizeScale), params, sizeScale, mat, mat);
      const roles = group.children.map((c) => c.userData.assetMeshRole as string);
      expect(roles.filter((r) => r === 'wheelSpoke')).toHaveLength(params.spokeCount);
      expect(roles.some((r) => r.includes('Stirn'))).toBe(false);
      const size = new Box3().setFromObject(group).getSize(new Vector3());
      expect(size.y).toBeCloseTo(wheelCarDimensionsM(sizeScale).outerRadiusM * 2, 3);
      // Spokes reach from the hub to the rim ring (SVG: 46.5 … 236.9 mm, incl. 1 mm overlap).
      for (const child of group.children.filter((c) => c.userData.assetMeshRole === 'wheelSpoke')) {
        const pos = (child as Mesh).geometry.getAttribute('position');
        let maxR = 0;
        let minR = Infinity;
        for (let i = 0; i < pos.count; i += 1) {
          const r = Math.hypot(pos.getX(i), pos.getZ(i));
          maxR = Math.max(maxR, r);
          minR = Math.min(minR, r);
        }
        expect(maxR).toBeCloseTo(0.23691 * sizeScale, 3);
        expect(minR).toBeGreaterThan(0.046 * sizeScale);
      }
      mat.dispose();
    }
  });
});
