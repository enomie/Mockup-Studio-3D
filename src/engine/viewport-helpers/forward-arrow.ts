import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  type MeshBasicNodeMaterial,
} from 'three/webgpu';
import {
  VIEWPORT_FORWARD_ARROW_HEAD_LENGTH_M,
  VIEWPORT_FORWARD_ARROW_HEAD_WIDTH_M,
  VIEWPORT_FORWARD_ARROW_LENGTH_M,
  VIEWPORT_FORWARD_ARROW_SHAFT_WIDTH_M,
  VIEWPORT_HELPER_GROUND_OFFSET_M,
  VIEWPORT_HELPER_RENDER_ORDER,
} from '@/constants';
import { createViewportHelperMeshMaterial } from './viewport-helper-material';

/** Matches world-origin +Z axis blue (see world-origin.ts vertex colors). */
const FORWARD_ARROW_COLOR = 0x4d80ff;

/**
 * Filled block arrow on XZ, tip at +Z — classic shaft + triangular head (top view).
 */
function buildArrowGeometry(): BufferGeometry {
  const y = VIEWPORT_HELPER_GROUND_OFFSET_M;
  const total = VIEWPORT_FORWARD_ARROW_LENGTH_M;
  const headLen = VIEWPORT_FORWARD_ARROW_HEAD_LENGTH_M;
  const headHalf = VIEWPORT_FORWARD_ARROW_HEAD_WIDTH_M / 2;
  const shaftHalf = VIEWPORT_FORWARD_ARROW_SHAFT_WIDTH_M / 2;
  const shaftEnd = total - headLen;

  const xz: [number, number][] = [
    [0, total],
    [headHalf, shaftEnd],
    [shaftHalf, shaftEnd],
    [shaftHalf, 0],
    [-shaftHalf, 0],
    [-shaftHalf, shaftEnd],
    [-headHalf, shaftEnd],
  ];

  const positions = new Float32Array(xz.length * 3);
  for (let i = 0; i < xz.length; i++) {
    positions[i * 3] = xz[i][0];
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = xz[i][1];
  }

  const indices: number[] = [];
  for (let i = 1; i < xz.length - 1; i++) {
    indices.push(0, i, i + 1);
  }
  indices.push(0, xz.length - 1, 1);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createForwardArrowHelper(): Mesh {
  const geometry = buildArrowGeometry();
  const material = createViewportHelperMeshMaterial(FORWARD_ARROW_COLOR);
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = VIEWPORT_HELPER_RENDER_ORDER + 3;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  return mesh;
}

export function disposeForwardArrowHelper(mesh: Mesh): void {
  mesh.geometry.dispose();
  (mesh.material as MeshBasicNodeMaterial).dispose();
}
