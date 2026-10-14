import {
  BufferGeometry,
  Float32BufferAttribute,
  LineSegments,
} from 'three/webgpu';
import {
  VIEWPORT_GRID_CELL_M,
  VIEWPORT_GRID_HALF_EXTENT_M,
  VIEWPORT_GRID_MAJOR_EVERY,
  VIEWPORT_HELPER_GROUND_OFFSET_M,
  VIEWPORT_HELPER_RENDER_ORDER,
} from '@/constants';
import { createViewportHelperLineMaterial } from './viewport-helper-material';

const MINOR_COLOR = 0x707070;
const MAJOR_COLOR = 0xa8a8a8;

function appendLine(
  positions: number[],
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  y: number,
): void {
  positions.push(x1, y, z1, x2, y, z2);
}

function buildGridGeometry(): BufferGeometry {
  const minor: number[] = [];
  const major: number[] = [];
  const extent = VIEWPORT_GRID_HALF_EXTENT_M;
  const step = VIEWPORT_GRID_CELL_M;
  const y = VIEWPORT_HELPER_GROUND_OFFSET_M;
  const cellIndex = (value: number): number => Math.round(value / step);

  for (let v = -extent; v <= extent; v += step) {
    const majorLine = cellIndex(v) % VIEWPORT_GRID_MAJOR_EVERY === 0;
    const bucket = majorLine ? major : minor;
    appendLine(bucket, -extent, v, extent, v, y);
    appendLine(bucket, v, -extent, v, extent, y);
  }

  const positions = [...major, ...minor];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
}

export function createFloorGridHelper(): LineSegments {
  const geometry = buildGridGeometry();
  const material = createViewportHelperLineMaterial(MINOR_COLOR);
  const grid = new LineSegments(geometry, material);
  grid.renderOrder = VIEWPORT_HELPER_RENDER_ORDER;
  grid.castShadow = false;
  grid.receiveShadow = false;
  grid.frustumCulled = false;
  return grid;
}

/** Major lines overlay (brighter) on top of minor grid. */
export function createFloorGridMajorHelper(): LineSegments {
  const extent = VIEWPORT_GRID_HALF_EXTENT_M;
  const step = VIEWPORT_GRID_CELL_M;
  const y = VIEWPORT_HELPER_GROUND_OFFSET_M;
  const major: number[] = [];
  const cellIndex = (value: number): number => Math.round(value / step);

  for (let v = -extent; v <= extent; v += step) {
    if (cellIndex(v) % VIEWPORT_GRID_MAJOR_EVERY !== 0) {continue;}
    appendLine(major, -extent, v, extent, v, y);
    appendLine(major, v, -extent, v, extent, y);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(major, 3));
  const material = createViewportHelperLineMaterial(MAJOR_COLOR);
  const lines = new LineSegments(geometry, material);
  lines.renderOrder = VIEWPORT_HELPER_RENDER_ORDER + 1;
  lines.castShadow = false;
  lines.receiveShadow = false;
  lines.frustumCulled = false;
  return lines;
}
