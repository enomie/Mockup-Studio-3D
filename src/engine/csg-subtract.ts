import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  MeshBasicMaterial,
  type BufferGeometry,
  type Vector3,
} from 'three/webgpu';

const csgMaterial = new MeshBasicMaterial({ visible: false });
const csgEvaluator = new Evaluator();

export interface CsgCutterPlacement {
  geometry: BufferGeometry;
  position?: Vector3;
}

/**
 * Sequential CSG subtraction (frame/wall booleans). Disposes base geometry and caller-owned cutters after use.
 */
export function subtractGeometries(
  baseGeometry: BufferGeometry,
  cutters: CsgCutterPlacement[],
): BufferGeometry {
  let frameBrush = new Brush(baseGeometry, csgMaterial);
  frameBrush.updateMatrixWorld();

  for (const cutter of cutters) {
    const cutterBrush = new Brush(cutter.geometry, csgMaterial);
    if (cutter.position) {
      cutterBrush.position.copy(cutter.position);
    }
    cutterBrush.updateMatrixWorld();
    frameBrush = csgEvaluator.evaluate(frameBrush, cutterBrush, SUBTRACTION);
    cutterBrush.disposeCacheData();
  }

  const resultGeometry = frameBrush.geometry;
  frameBrush.disposeCacheData();
  baseGeometry.dispose();
  toCreasedNormals(resultGeometry, Math.PI / 2);

  return resultGeometry;
}
