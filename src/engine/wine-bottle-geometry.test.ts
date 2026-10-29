import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MeshBasicMaterial } from 'three/webgpu';
import { describe, expect, it, beforeEach } from 'vitest';
import { defaultWineBottleParams } from '@/scene/asset-wine-bottle';
import { buildWineBottleMeshes } from './wine-bottle-geometry';
import {
  clearRawWineBottleSvgPointsCache,
  extractOpenPathPointsFromSvgText,
  setRawWineBottleSvgPointsCache,
} from './wine-bottle-svg-profile';

const PUBLIC_LATHE = join(process.cwd(), 'public', 'profiles', 'lathe');
const stubMaterial = new MeshBasicMaterial();

function syntheticOpenWallRaw() {
  const yFoot = 820;
  return [
    { x: 1, y: yFoot },
    { x: 50, y: yFoot },
    { x: 50, y: 0 },
    { x: 3, y: 0 },
    { x: 3, y: yFoot },
    { x: 1, y: yFoot + 7 },
    { x: 1, y: yFoot },
  ];
}

function cacheSyntheticBottleSvg(): void {
  const raw = syntheticOpenWallRaw();
  for (const profile of ['bordeaux', 'alsace', 'sparkling'] as const) {
    setRawWineBottleSvgPointsCache(profile, raw);
  }
}

describe('wine-bottle-geometry', () => {
  beforeEach(() => {
    clearRawWineBottleSvgPointsCache();
    cacheSyntheticBottleSvg();
  });

  it('glass lathe foot sits at y=0 after pivot', async () => {
    const result = await buildWineBottleMeshes({
      params: defaultWineBottleParams('bordeaux'),
      sizeScale: 1,
      labelPrintVisible: false,
      glassMaterial: stubMaterial,
      corkMaterial: stubMaterial,
      foilMaterial: stubMaterial,
      discMaterial: stubMaterial,
      labelMaterial: stubMaterial,
    });
    result.bodyMesh.geometry.computeBoundingBox();
    const footY = result.bodyMesh.geometry.boundingBox?.min.y ?? 0;
    expect(footY).toBeGreaterThanOrEqual(-1e-5);
    expect(footY).toBeLessThan(1e-5);
    result.bodyMesh.geometry.dispose();
  });

  it('glass lathe positions have no NaN (closed wall ring)', async () => {
    const result = await buildWineBottleMeshes({
      params: defaultWineBottleParams('alsace'),
      sizeScale: 1,
      labelPrintVisible: false,
      glassMaterial: stubMaterial,
      corkMaterial: stubMaterial,
      foilMaterial: stubMaterial,
      discMaterial: stubMaterial,
      labelMaterial: stubMaterial,
    });
    const pos = result.bodyMesh.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i += 1) {
      expect(Number.isFinite(pos.getX(i))).toBe(true);
      expect(Number.isFinite(pos.getY(i))).toBe(true);
      expect(Number.isFinite(pos.getZ(i))).toBe(true);
    }
    result.bodyMesh.geometry.dispose();
  });

  it('builds glass from real bordeaux-open SVG', async () => {
    const svgText = readFileSync(join(PUBLIC_LATHE, 'lathe-y-bottle-bordeaux-open.svg'), 'utf8');
    const raw = extractOpenPathPointsFromSvgText(svgText, 48);
    setRawWineBottleSvgPointsCache('bordeaux', raw);
    const result = await buildWineBottleMeshes({
      params: defaultWineBottleParams('bordeaux'),
      sizeScale: 1,
      labelPrintVisible: false,
      glassMaterial: stubMaterial,
      corkMaterial: stubMaterial,
      foilMaterial: stubMaterial,
      discMaterial: stubMaterial,
      labelMaterial: stubMaterial,
    });
    expect(result.bodyMesh.geometry.getAttribute('position').count).toBeGreaterThan(100);
    result.bodyMesh.geometry.dispose();
  });

  it('builds no label mesh without image', async () => {
    const result = await buildWineBottleMeshes({
      params: defaultWineBottleParams('bordeaux'),
      sizeScale: 1,
      labelPrintVisible: false,
      glassMaterial: stubMaterial,
      corkMaterial: stubMaterial,
      foilMaterial: stubMaterial,
      discMaterial: stubMaterial,
      labelMaterial: stubMaterial,
    });
    expect(result.labelMesh).toBeNull();
    expect(result.bodyMesh).toBeTruthy();
  });

  it('foil radius at lip is at least glass outer radius', async () => {
    const params = defaultWineBottleParams('bordeaux');
    const result = await buildWineBottleMeshes({
      params,
      sizeScale: 1,
      labelPrintVisible: false,
      glassMaterial: stubMaterial,
      corkMaterial: stubMaterial,
      foilMaterial: stubMaterial,
      discMaterial: stubMaterial,
      labelMaterial: stubMaterial,
    });
    expect(result.foilMesh).toBeTruthy();
    result.foilMesh!.geometry.computeBoundingBox();
    const box = result.foilMesh!.geometry.boundingBox!;
    const foilMaxR = Math.max(
      Math.hypot(box.min.x, box.min.z),
      Math.hypot(box.max.x, box.max.z),
    );
    result.bodyMesh.geometry.computeBoundingBox();
    const bodyBox = result.bodyMesh.geometry.boundingBox!;
    const glassMaxR = Math.max(
      Math.hypot(bodyBox.min.x, bodyBox.min.z),
      Math.hypot(bodyBox.max.x, bodyBox.max.z),
    );
    expect(foilMaxR).toBeGreaterThanOrEqual(glassMaxR * 0.95);
  });
});
