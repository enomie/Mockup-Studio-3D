import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BoxGeometry, type BufferGeometry } from 'three/webgpu';
import {
  effectiveBlockCornerRadiusM,
  type BlockParams,
} from '@/scene/asset-block';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';

const ROUNDED_BOX_SEGMENTS = 4;

function translateBottomPivot(geometry: BufferGeometry, heightM: number): void {
  geometry.translate(0, heightM / 2, 0);
}

export function buildBlockGeometry(params: BlockParams): BufferGeometry {
  const { widthM, heightM, depthM } = params;
  const radiusM = effectiveBlockCornerRadiusM(params);

  let geometry: BufferGeometry;
  if (radiusM <= 0) {
    geometry = new BoxGeometry(widthM, heightM, depthM);
  } else {
    geometry = new RoundedBoxGeometry(
      widthM,
      heightM,
      depthM,
      ROUNDED_BOX_SEGMENTS,
      radiusM,
    );
  }

  translateBottomPivot(geometry, heightM);
  ensureGeometryTangents(geometry);
  return geometry;
}
