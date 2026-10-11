import { BoxGeometry, ExtrudeGeometry, type BufferGeometry } from 'three/webgpu';
import { createRoundedRectShape } from './handheld-geometry';

/** Rounded stand plate in XZ; extruded along +Y; bottom face at y = 0. */
export function createStandBaseGeometry(
  widthM: number,
  depthM: number,
  heightM: number,
  cornerRadiusM: number,
): BufferGeometry {
  const maxR = Math.min(
    cornerRadiusM,
    widthM * 0.5 - 1e-6,
    depthM * 0.5 - 1e-6,
  );
  const shape = createRoundedRectShape(widthM, depthM, Math.max(0, maxR));
  const geometry = new ExtrudeGeometry(shape, {
    depth: heightM,
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (box) {
    geometry.translate(0, -box.min.y, 0);
  }
  return geometry;
}

export function createStandFootGeometry(
  widthM: number,
  depthM: number,
  heightM: number,
): BoxGeometry {
  return new BoxGeometry(widthM, heightM, depthM);
}
