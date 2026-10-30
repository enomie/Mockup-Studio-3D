import {
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicNodeMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three/webgpu';
import {
  VIEWPORT_HELPER_GROUND_OFFSET_M,
  VIEWPORT_HELPER_RENDER_ORDER,
  VIEWPORT_QUADRANT_FILL_OPACITY,
  VIEWPORT_QUADRANT_LABEL_SIZE_M,
  VIEWPORT_QUADRANT_SIZE_M,
} from '@/constants';
import { PLAN_QUADRANTS, type PlanQuadrant } from '@/engine/world-compass';
import { applyViewportHelperXRay, createViewportHelperMeshMaterial } from './viewport-helper-material';

const LABEL_CANVAS_PX = 256;

function hexColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Plane on XZ with its normal +Y; local +Y of the plane maps to world -Z (North). */
function createFloorPlane(size: number, material: MeshBasicNodeMaterial): Mesh {
  const mesh = new Mesh(new PlaneGeometry(size, size), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  return mesh;
}

function createLabelTexture(quadrant: PlanQuadrant): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_CANVAS_PX;
  canvas.height = LABEL_CANVAS_PX;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const mid = LABEL_CANVAS_PX / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hexColor(quadrant.color);
    ctx.font = 'bold 72px sans-serif';
    ctx.fillText(quadrant.id, mid, mid - 30);
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText(quadrant.short, mid, mid + 45);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createQuadrant(quadrant: PlanQuadrant): Group {
  const group = new Group();
  group.name = `quadrant-${quadrant.id}`;
  const half = VIEWPORT_QUADRANT_SIZE_M / 2;
  group.position.set(quadrant.signX * half, VIEWPORT_HELPER_GROUND_OFFSET_M, quadrant.signZ * half);

  const fillMaterial = createViewportHelperMeshMaterial(quadrant.color);
  fillMaterial.opacity = VIEWPORT_QUADRANT_FILL_OPACITY;
  const fill = createFloorPlane(VIEWPORT_QUADRANT_SIZE_M, fillMaterial);
  fill.renderOrder = VIEWPORT_HELPER_RENDER_ORDER;
  group.add(fill);

  const labelMaterial = new MeshBasicNodeMaterial({
    map: createLabelTexture(quadrant),
    transparent: true,
  });
  applyViewportHelperXRay(labelMaterial);
  const label = createFloorPlane(VIEWPORT_QUADRANT_LABEL_SIZE_M, labelMaterial);
  label.renderOrder = VIEWPORT_HELPER_RENDER_ORDER + 1;
  group.add(label);

  return group;
}

/** Four tinted floor squares (alpha NE, beta SE, gamma SW, delta NW) around the reference center. */
export function createQuadrantGridHelper(): Group {
  const group = new Group();
  group.name = 'quadrant-grid';
  for (const quadrant of PLAN_QUADRANTS) {
    group.add(createQuadrant(quadrant));
  }
  return group;
}
