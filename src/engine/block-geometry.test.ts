import { describe, expect, it } from 'vitest';
import { Box3 } from 'three/webgpu';
import { defaultBlockParams } from '@/scene/asset-block';
import { buildBlockGeometry } from './block-geometry';

function boundingHeight(geometry: ReturnType<typeof buildBlockGeometry>): number {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox ?? new Box3();
  return box.max.y - box.min.y;
}

describe('buildBlockGeometry', () => {
  it('spans heightM with bottom pivot at y=0', () => {
    const geometry = buildBlockGeometry({ ...defaultBlockParams(), heightM: 2 });
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(box.min.y).toBeCloseTo(0);
    expect(box.max.y).toBeCloseTo(2);
    geometry.dispose();
  });

  it('uses more vertices when corner radius is positive', () => {
    const sharp = buildBlockGeometry({ ...defaultBlockParams(), cornerRadiusMm: 0 });
    const rounded = buildBlockGeometry(defaultBlockParams());
    const sharpCount = sharp.getAttribute('position').count;
    const roundedCount = rounded.getAttribute('position').count;
    expect(roundedCount).toBeGreaterThan(sharpCount);
    sharp.dispose();
    rounded.dispose();
  });

  it('bounding height matches params', () => {
    const geometry = buildBlockGeometry(defaultBlockParams());
    expect(boundingHeight(geometry)).toBeCloseTo(1);
    geometry.dispose();
  });
});
