import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three/webgpu';
import { defaultTrianglePatchParams } from './asset-triangle-patch';
import {
  groupTransformMatrix,
  patchPointsCenter,
  togglePointId,
  transformPatchPoints,
  translatePatchPoints,
} from './triangle-patch-group-edit';

const params = defaultTrianglePatchParams();
const [a, b, c] = params.points;
const ids = [a.id, b.id];

describe('patchPointsCenter', () => {
  it('averages the anchors of the selected points', () => {
    const center = patchPointsCenter(params.points, ids);
    expect(center?.x).toBeCloseTo((a.pos.x + b.pos.x) / 2);
    expect(center?.y).toBeCloseTo((a.pos.y + b.pos.y) / 2);
    expect(center?.z).toBeCloseTo((a.pos.z + b.pos.z) / 2);
  });

  it('is null without a matching point', () => {
    expect(patchPointsCenter(params.points, ['nope'])).toBeNull();
  });
});

describe('translatePatchPoints', () => {
  it('moves anchors and handles of the selected points only', () => {
    const moved = translatePatchPoints(params.points, ids, { x: 1, y: 2, z: 3 });
    expect(moved[0].pos.x).toBeCloseTo(a.pos.x + 1);
    expect(moved[0].handleNext.y).toBeCloseTo(a.handleNext.y + 2);
    expect(moved[1].handleCrossIn.z).toBeCloseTo(b.handleCrossIn.z + 3);
    expect(moved[2]).toBe(c);
  });
});

describe('transformPatchPoints', () => {
  it('turns points and their handles about the group centre', () => {
    const center = patchPointsCenter(params.points, ids) ?? { x: 0, y: 0, z: 0 };
    const half = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);
    const turned = transformPatchPoints(params.points, ids, groupTransformMatrix(center, half, 1));
    // A half turn about the centre swaps the two anchors' horizontal offsets.
    expect(turned[0].pos.x).toBeCloseTo(2 * center.x - a.pos.x);
    expect(turned[0].pos.z).toBeCloseTo(2 * center.z - a.pos.z);
    expect(turned[0].pos.y).toBeCloseTo(a.pos.y);
    const handleBefore = new Vector3(a.handleNext.x - a.pos.x, 0, a.handleNext.z - a.pos.z);
    const handleAfter = new Vector3(turned[0].handleNext.x - turned[0].pos.x, 0, turned[0].handleNext.z - turned[0].pos.z);
    expect(handleAfter.x).toBeCloseTo(-handleBefore.x);
    expect(handleAfter.z).toBeCloseTo(-handleBefore.z);
  });

  it('scales distances to the centre and handle lengths', () => {
    const center = patchPointsCenter(params.points, ids) ?? { x: 0, y: 0, z: 0 };
    const scaled = transformPatchPoints(params.points, ids, groupTransformMatrix(center, new Quaternion(), 2));
    expect(scaled[0].pos.x).toBeCloseTo(center.x + (a.pos.x - center.x) * 2);
    const lengthBefore = Math.hypot(a.handleNext.x - a.pos.x, a.handleNext.y - a.pos.y, a.handleNext.z - a.pos.z);
    const p = scaled[0];
    const lengthAfter = Math.hypot(p.handleNext.x - p.pos.x, p.handleNext.y - p.pos.y, p.handleNext.z - p.pos.z);
    expect(lengthAfter).toBeCloseTo(lengthBefore * 2);
  });
});

describe('togglePointId', () => {
  it('adds and removes ids but never empties the selection', () => {
    expect(togglePointId(['a'], 'b')).toEqual(['a', 'b']);
    expect(togglePointId(['a', 'b'], 'a')).toEqual(['b']);
    expect(togglePointId(['a'], 'a')).toEqual(['a']);
  });
});
