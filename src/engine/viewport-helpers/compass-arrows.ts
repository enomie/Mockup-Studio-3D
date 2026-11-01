import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
} from 'three/webgpu';
import {
  VIEWPORT_COMPASS_ARROW_HEAD_LENGTH_M,
  VIEWPORT_COMPASS_ARROW_HEAD_WIDTH_M,
  VIEWPORT_COMPASS_ARROW_LENGTH_M,
  VIEWPORT_COMPASS_ARROW_SHAFT_WIDTH_M,
  VIEWPORT_COMPASS_NORTH_LENGTH_SCALE,
  VIEWPORT_HELPER_GROUND_OFFSET_M,
  VIEWPORT_HELPER_RENDER_ORDER,
} from '@/constants';
import { CARDINAL_DIRECTIONS, cardinalYaw } from '@/engine/world-compass';
import { createViewportHelperMeshMaterial } from './viewport-helper-material';

/**
 * Filled block arrow on XZ, tip at +Z (top view). Rotated per direction by yaw.
 */
function buildArrowGeometry(total: number): BufferGeometry {
  const y = VIEWPORT_HELPER_GROUND_OFFSET_M;
  const headLen = VIEWPORT_COMPASS_ARROW_HEAD_LENGTH_M;
  const headHalf = VIEWPORT_COMPASS_ARROW_HEAD_WIDTH_M / 2;
  const shaftHalf = VIEWPORT_COMPASS_ARROW_SHAFT_WIDTH_M / 2;
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

/** Four colored arrows (N, E, S, W) from the reference center; North is longer. */
export function createCompassArrowsHelper(): Group {
  const group = new Group();
  group.name = 'compass-arrows';
  for (const direction of CARDINAL_DIRECTIONS) {
    const scale = direction.id === 'north' ? VIEWPORT_COMPASS_NORTH_LENGTH_SCALE : 1;
    const geometry = buildArrowGeometry(VIEWPORT_COMPASS_ARROW_LENGTH_M * scale);
    const material = createViewportHelperMeshMaterial(direction.color);
    const mesh = new Mesh(geometry, material);
    mesh.name = `compass-arrow-${direction.id}`;
    mesh.rotation.y = cardinalYaw(direction);
    mesh.renderOrder = VIEWPORT_HELPER_RENDER_ORDER + 3;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  return group;
}
