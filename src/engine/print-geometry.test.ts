import { describe, expect, it } from 'vitest';
import { buildPrintFacePlacements } from './print-geometry';

describe('buildPrintFacePlacements', () => {
  const faceWidth = 0.6;
  const faceHeight = 0.4;
  const depth = 0.002;

  it('returns 6 plane placements when corner radius is zero', () => {
    const placements = buildPrintFacePlacements(faceWidth, faceHeight, depth, 0);
    expect(placements).toHaveLength(6);
    const faceIds = placements.map((placement) => placement.faceId);
    expect(faceIds).toEqual(['front', 'back', 'right', 'left', 'top', 'bottom']);
  });

  it('returns 10 placements when corner radius is positive', () => {
    const placements = buildPrintFacePlacements(faceWidth, faceHeight, depth, 0.01);
    expect(placements).toHaveLength(10);
    expect(placements.filter((placement) => placement.faceId === 'front')).toHaveLength(1);
    expect(placements.filter((placement) => placement.faceId === 'top')).toHaveLength(3);
  });

  it('keeps front face bounding box at full width and height', () => {
    const placements = buildPrintFacePlacements(faceWidth, faceHeight, depth, 0.01);
    const front = placements.find((placement) => placement.faceId === 'front');
    expect(front).toBeDefined();
    front!.geometry.computeBoundingBox();
    const box = front!.geometry.boundingBox;
    expect(box).toBeDefined();
    expect(box!.max.x - box!.min.x).toBeCloseTo(faceWidth, 4);
    expect(box!.max.y - box!.min.y).toBeCloseTo(faceHeight, 4);
  });
});
