import {
  BufferGeometry,
  Float32BufferAttribute,
  LineSegments,
} from 'three/webgpu';
import {
  VIEWPORT_HELPER_GROUND_OFFSET_M,
  VIEWPORT_HELPER_RENDER_ORDER,
  VIEWPORT_ORIGIN_AXIS_LENGTH_M,
} from '@/constants';
import { createViewportHelperLineMaterial } from './viewport-helper-material';

export function createWorldOriginHelper(): LineSegments {
  const y0 = VIEWPORT_HELPER_GROUND_OFFSET_M;
  const len = VIEWPORT_ORIGIN_AXIS_LENGTH_M;
  const positions = [
    0, y0, 0, len, y0, 0,
    0, y0, 0, 0, len, 0,
    0, y0, 0, 0, y0, len,
  ];
  const colors = [
    1, 0.2, 0.2, 1, 0.2, 0.2,
    0.2, 1, 0.2, 0.2, 1, 0.2,
    0.3, 0.5, 1, 0.3, 0.5, 1,
  ];

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

  const material = createViewportHelperLineMaterial(0xffffff);
  material.vertexColors = true;

  const axes = new LineSegments(geometry, material);
  axes.renderOrder = VIEWPORT_HELPER_RENDER_ORDER + 2;
  axes.castShadow = false;
  axes.receiveShadow = false;
  axes.frustumCulled = false;
  return axes;
}
