import { describe, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three/webgpu';
import { defaultPatchParamsForKind, type PatchParams } from '@/scene/asset-triangle-patch';
import type { AssetEntity, EntityTransform } from '@/scene/entity-types';
import { joinSharedEdge } from '@/scene/patch-nodes';
import { listPatchSegments } from '@/scene/triangle-patch-edge-link';
import { evalEdgeCorrectedSurface, prepareEdgeCorrection } from './patch-edge-correction';

function patch(id: string, transform: EntityTransform): AssetEntity {
  return {
    id, type: 'asset', name: id, assetKind: 'triangle-patch', screenImageId: null, sizeScale: 1, visible: true,
    transform, patchParams: defaultPatchParamsForKind('triangle-patch'),
  };
}

/** World normal of a patch at (t, 0) on `edge`, from the corrected surface. */
function normalAt(entity: AssetEntity, edge: number, t: number): Vector3 {
  const prepared = prepareEdgeCorrection(entity.patchParams as PatchParams);
  if (!prepared) {throw new Error('no correction');}
  const at = (tt: number, d: number) => evalEdgeCorrectedSurface(prepared, prepared.fromEdge(edge, tt, d));
  const h = 1e-6;
  const p = at(t, 0);
  const along = at(t + h, 0).sub(p);
  const inward = at(t, h).sub(p);
  const q = new Quaternion().setFromEuler(new Euler(entity.transform.rotation.x, entity.transform.rotation.y, entity.transform.rotation.z, 'XYZ'));
  return along.cross(inward).normalize().applyQuaternion(q);
}

describe('shared nodes: smooth transition', () => {
  it('two patches joined into shared nodes meet without a crease', () => {
    const A = patch('A', { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } });
    const B = patch('B', { position: { x: 0.2, y: 0.1, z: 0.1 }, rotation: { x: 0.2, y: 1.1, z: -0.1 } });
    const segA = listPatchSegments(A.patchParams as PatchParams)[0]; // edge 0
    const segB = listPatchSegments(B.patchParams as PatchParams)[1]; // edge 1
    let n = 0;
    const joined = joinSharedEdge(
      { entity: A, segment: segA },
      { entity: B, segment: { startPointId: segB.endPointId, endPointId: segB.startPointId } },
      () => `n${++n}`,
    );
    if (!joined) {throw new Error('join failed');}
    const A2 = { ...A, patchParams: joined.aParams };
    const B2 = { ...B, patchParams: joined.bParams };
    let worst = 0;
    for (const t of [0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95]) {
      // B runs the shared edge reversed.
      const dot = Math.abs(normalAt(A2, 0, t).dot(normalAt(B2, 1, 1 - t)));
      worst = Math.max(worst, (Math.acos(Math.min(1, dot)) * 180) / Math.PI);
    }
    expect(worst).toBeLessThan(0.1);
  });
});
