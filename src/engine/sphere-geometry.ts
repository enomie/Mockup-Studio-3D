import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { IcosahedronGeometry, type BufferGeometry } from 'three/webgpu';
import type { SphereParams } from '@/scene/asset-sphere';

/** Subdivision level for render mesh — matches tsl-textures online ball (IcosahedronGeometry detail 20). */
export const SPHERE_RENDER_ICOSAEDRON_DETAIL = 20;

export function buildSphereGeometry(params: SphereParams): BufferGeometry {
  const { radiusM } = params;
  const raw = new IcosahedronGeometry(radiusM, SPHERE_RENDER_ICOSAEDRON_DETAIL);
  const geometry = mergeVertices(raw);
  raw.dispose();
  geometry.computeTangents();
  geometry.translate(0, radiusM, 0);
  return geometry;
}
