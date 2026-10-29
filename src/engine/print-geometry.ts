import {
  type BufferGeometry,
  CylinderGeometry,
  PlaneGeometry,
} from 'three/webgpu';
import type { AssetFaceId } from '@/scene/asset-faces';
import { createRoundedScreenGeometry } from './handheld-geometry';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';

export interface PrintFacePlacement {
  faceId: AssetFaceId;
  geometry: BufferGeometry;
  position: [number, number, number];
  rotation: [number, number, number];
}

function buildSharpPrintFacePlacements(
  faceWidth: number,
  faceHeight: number,
  depth: number,
): PrintFacePlacement[] {
  const halfW = faceWidth * 0.5;
  const halfH = faceHeight * 0.5;
  const halfD = depth * 0.5;

  const placements: PrintFacePlacement[] = [
    {
      faceId: 'front',
      geometry: new PlaneGeometry(faceWidth, faceHeight),
      position: [0, 0, halfD],
      rotation: [0, 0, 0],
    },
    {
      faceId: 'back',
      geometry: new PlaneGeometry(faceWidth, faceHeight),
      position: [0, 0, -halfD],
      rotation: [0, Math.PI, 0],
    },
    {
      faceId: 'right',
      geometry: new PlaneGeometry(depth, faceHeight),
      position: [halfW, 0, 0],
      rotation: [0, Math.PI / 2, 0],
    },
    {
      faceId: 'left',
      geometry: new PlaneGeometry(depth, faceHeight),
      position: [-halfW, 0, 0],
      rotation: [0, -Math.PI / 2, 0],
    },
    {
      faceId: 'top',
      geometry: new PlaneGeometry(faceWidth, depth),
      position: [0, halfH, 0],
      rotation: [-Math.PI / 2, 0, 0],
    },
    {
      faceId: 'bottom',
      geometry: new PlaneGeometry(faceWidth, depth),
      position: [0, -halfH, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
  ];
  for (const placement of placements) {
    ensureGeometryTangents(placement.geometry);
  }
  return placements;
}

function createQuarterCylinderWall(
  radius: number,
  depth: number,
  thetaStart: number,
): BufferGeometry {
  const geometry = new CylinderGeometry(
    radius,
    radius,
    depth,
    8,
    1,
    true,
    thetaStart,
    Math.PI / 2,
  );
  geometry.rotateX(Math.PI / 2);
  ensureGeometryTangents(geometry);
  return geometry;
}

interface CornerSpec {
  faceId: AssetFaceId;
  x: number;
  y: number;
  thetaStart: number;
}

function buildRoundedPrintFacePlacements(
  faceWidth: number,
  faceHeight: number,
  depth: number,
  cornerRadius: number,
): PrintFacePlacement[] {
  const halfW = faceWidth * 0.5;
  const halfH = faceHeight * 0.5;
  const halfD = depth * 0.5;
  const r = cornerRadius;
  const innerW = Math.max(0, faceWidth - r * 2);
  const innerH = Math.max(0, faceHeight - r * 2);

  const placements: PrintFacePlacement[] = [
    {
      faceId: 'front',
      geometry: createRoundedScreenGeometry(faceWidth, faceHeight, r),
      position: [0, 0, halfD],
      rotation: [0, 0, 0],
    },
    {
      faceId: 'back',
      geometry: createRoundedScreenGeometry(faceWidth, faceHeight, r),
      position: [0, 0, -halfD],
      rotation: [0, Math.PI, 0],
    },
    {
      faceId: 'right',
      geometry: new PlaneGeometry(depth, innerH),
      position: [halfW, 0, 0],
      rotation: [0, Math.PI / 2, 0],
    },
    {
      faceId: 'left',
      geometry: new PlaneGeometry(depth, innerH),
      position: [-halfW, 0, 0],
      rotation: [0, -Math.PI / 2, 0],
    },
    {
      faceId: 'top',
      geometry: new PlaneGeometry(innerW, depth),
      position: [0, halfH, 0],
      rotation: [-Math.PI / 2, 0, 0],
    },
    {
      faceId: 'bottom',
      geometry: new PlaneGeometry(innerW, depth),
      position: [0, -halfH, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
  ];

  const corners: CornerSpec[] = [
    {
      faceId: 'top',
      x: -halfW + r,
      y: halfH - r,
      thetaStart: Math.PI,
    },
    {
      faceId: 'top',
      x: halfW - r,
      y: halfH - r,
      thetaStart: Math.PI / 2,
    },
    {
      faceId: 'bottom',
      x: halfW - r,
      y: -halfH + r,
      thetaStart: 0,
    },
    {
      faceId: 'bottom',
      x: -halfW + r,
      y: -halfH + r,
      thetaStart: (Math.PI * 3) / 2,
    },
  ];

  for (const corner of corners) {
    placements.push({
      faceId: corner.faceId,
      geometry: createQuarterCylinderWall(r, depth, corner.thetaStart),
      position: [corner.x, corner.y, 0],
      rotation: [0, 0, 0],
    });
  }

  for (const placement of placements) {
    ensureGeometryTangents(placement.geometry);
  }

  return placements;
}

export function buildPrintFacePlacements(
  faceWidth: number,
  faceHeight: number,
  depth: number,
  cornerRadius: number,
): PrintFacePlacement[] {
  if (cornerRadius <= 0) {
    return buildSharpPrintFacePlacements(faceWidth, faceHeight, depth);
  }
  return buildRoundedPrintFacePlacements(faceWidth, faceHeight, depth, cornerRadius);
}
