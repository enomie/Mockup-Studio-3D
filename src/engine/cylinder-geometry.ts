import { CylinderGeometry, LatheGeometry, Vector2, type BufferGeometry } from 'three/webgpu';
import {
  effectiveCylinderCornerRadiusM,
  type CylinderParams,
} from '@/scene/asset-cylinder';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';

const LATHE_SEGMENTS = 48;
const FILLET_SEGMENTS = 6;

function translateBottomPivot(geometry: BufferGeometry, heightM: number): void {
  geometry.translate(0, heightM / 2, 0);
}

function buildRoundedCylinderLathe(params: CylinderParams): BufferGeometry {
  const { radiusM: R, heightM: H } = params;
  const f = effectiveCylinderCornerRadiusM(params);
  const points: { x: number; y: number }[] = [];

  if (f <= 0) {
    points.push({ x: 0, y: 0 }, { x: R, y: 0 }, { x: R, y: H }, { x: 0, y: H });
  } else {
    points.push({ x: 0, y: 0 });
    points.push({ x: R - f, y: 0 });
    for (let i = 1; i <= FILLET_SEGMENTS; i += 1) {
      const t = (i / FILLET_SEGMENTS) * (Math.PI / 2);
      points.push({
        x: R - f + f * Math.sin(t),
        y: f - f * Math.cos(t),
      });
    }
    points.push({ x: R, y: H - f });
    for (let i = 1; i <= FILLET_SEGMENTS; i += 1) {
      const t = (i / FILLET_SEGMENTS) * (Math.PI / 2);
      points.push({
        x: R - f + f * Math.cos(t),
        y: H - f + f * Math.sin(t),
      });
    }
    points.push({ x: R - f, y: H }, { x: 0, y: H });
  }

  const geometry = new LatheGeometry(
    points.map((p) => new Vector2(p.x, p.y)),
    LATHE_SEGMENTS,
  );
  return geometry;
}

export function buildCylinderGeometry(params: CylinderParams): BufferGeometry {
  const f = effectiveCylinderCornerRadiusM(params);
  let geometry: BufferGeometry;
  if (f <= 0) {
    geometry = new CylinderGeometry(
      params.radiusM,
      params.radiusM,
      params.heightM,
      LATHE_SEGMENTS,
    );
  } else {
    geometry = buildRoundedCylinderLathe(params);
  }
  translateBottomPivot(geometry, params.heightM);
  ensureGeometryTangents(geometry);
  return geometry;
}
