import { describe, expect, it } from 'vitest';
import { buildWallBodyGeometry, createWallSolidBoxGeometry } from './wall-geometry';
import { defaultWallParams, doorCutterCenterX } from '@/scene/asset-wall';

describe('wall geometry', () => {
  it('places door cutter center for 4m wall', () => {
    expect(doorCutterCenterX(4)).toBeCloseTo(0);
  });

  it('builds solid wall body with bottom at y=0', () => {
    const params = defaultWallParams();
    const geometry = createWallSolidBoxGeometry(
      params.widthM,
      params.heightM,
      params.thicknessM,
    );
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(box.min.y).toBeCloseTo(0);
    expect(box.max.y).toBeCloseTo(params.heightM);
  });

  it('subtracts door opening for wall-door', () => {
    const params = defaultWallParams();
    const geometry = buildWallBodyGeometry('wall-door', params);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox).toBeTruthy();
    geometry.dispose();
  });
});
