import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Box3, Group, MeshBasicMaterial, Vector3 } from 'three/webgpu';
import {
  addWheelCarMeshesFromSvg,
  buildWheelCarLatheGeometry,
} from './wheel-car-geometry';
import {
  extractWheelCarPathsFromSvgText,
  normalizeWheelCarPaths,
} from './wheel-car-svg-profile';
import { defaultWheelCarParams } from '@/scene/asset-wheel-car';

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../public/profiles/lathe',
);

function loadFixtureProfiles(outerRadiusM: number) {
  const svgText = readFileSync(join(FIXTURE_DIR, 'lathe-x-wheel-car.svg'), 'utf8');
  const raw = extractWheelCarPathsFromSvgText(svgText);
  return normalizeWheelCarPaths(raw, outerRadiusM);
}

describe('wheel-car-geometry', () => {
  it('builds lathe geometry without NaN', () => {
    const profiles = loadFixtureProfiles(defaultWheelCarParams().outerRadiusM);
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
    const profiles = loadFixtureProfiles(params.outerRadiusM);
    const group = new Group();
    const mat = new MeshBasicMaterial();
    addWheelCarMeshesFromSvg(group, profiles, params, mat, mat);
    const box = new Box3().setFromObject(group);
    const size = new Vector3();
    box.getSize(size);
    const maxExtent = Math.max(size.x, size.y, size.z);
    expect(maxExtent).toBeGreaterThan(params.outerRadiusM * 1.9);
    expect(maxExtent).toBeLessThan(params.outerRadiusM * 2.1);
    expect(box.min.y).toBeGreaterThanOrEqual(-0.002);
    expect(box.max.y).toBeLessThanOrEqual(params.outerRadiusM * 2 + 0.002);
    mat.dispose();
  });

  it('keeps vertex count within budget', () => {
    const profiles = loadFixtureProfiles(defaultWheelCarParams().outerRadiusM);
    const geometry = buildWheelCarLatheGeometry(profiles.tire);
    expect(geometry.getAttribute('position').count).toBeLessThan(20_000);
    geometry.dispose();
  });
});
