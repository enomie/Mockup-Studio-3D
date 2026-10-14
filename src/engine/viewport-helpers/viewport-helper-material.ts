import {
  LineBasicNodeMaterial,
  MeshBasicNodeMaterial,
  type Material,
} from 'three/webgpu';
import { VIEWPORT_HELPER_LINE_OPACITY, VIEWPORT_HELPER_OPACITY } from '@/constants';

export function applyViewportHelperXRay(material: Material): void {
  material.transparent = true;
  material.depthWrite = false;
  material.depthTest = false;
  material.toneMapped = false;
}

export function createViewportHelperLineMaterial(color: number): LineBasicNodeMaterial {
  const material = new LineBasicNodeMaterial({
    color,
    transparent: true,
    opacity: VIEWPORT_HELPER_LINE_OPACITY,
  });
  applyViewportHelperXRay(material);
  return material;
}

export function createViewportHelperMeshMaterial(color: number): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial({
    color,
    transparent: true,
    opacity: VIEWPORT_HELPER_OPACITY,
  });
  applyViewportHelperXRay(material);
  return material;
}
