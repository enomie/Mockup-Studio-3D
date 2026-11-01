import {
  BoxGeometry,
  Path,
  Shape,
  ShapeGeometry,
  Vector3,
  type BufferGeometry,
} from 'three/webgpu';
import { subtractGeometries } from './csg-subtract';
import type { AssetKind } from '@/scene/asset-kind';
import {
  DOOR_HEIGHT_M,
  DOOR_LEFT_INSET_M,
  DOOR_WIDTH_M,
  doorCutterCenterX,
  type WallParams,
} from '@/scene/asset-wall';
import { HANDHELD_CSG_EPSILON_M } from './handheld-geometry';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';

function subtractDoorFromWall(
  wallGeometry: BufferGeometry,
  cutterGeometry: BufferGeometry,
  cutterPosition: Vector3,
): BufferGeometry {
  const result = subtractGeometries(wallGeometry, [
    { geometry: cutterGeometry, position: cutterPosition },
  ]);
  cutterGeometry.dispose();
  return result;
}

export function createWallSolidBoxGeometry(
  widthM: number,
  heightM: number,
  thicknessM: number,
): BufferGeometry {
  const geometry = new BoxGeometry(widthM, heightM, thicknessM);
  geometry.translate(0, heightM / 2, 0);
  ensureGeometryTangents(geometry);
  return geometry;
}

function createDoorCutterGeometry(thicknessM: number): BufferGeometry {
  const depth = thicknessM + 2 * HANDHELD_CSG_EPSILON_M;
  return new BoxGeometry(DOOR_WIDTH_M, DOOR_HEIGHT_M, depth);
}

export function buildWallBodyGeometry(
  assetKind: AssetKind,
  params: WallParams,
): BufferGeometry {
  const { widthM, heightM, thicknessM } = params;
  const solid = createWallSolidBoxGeometry(widthM, heightM, thicknessM);

  if (assetKind !== 'wall-door') {
    ensureGeometryTangents(solid);
    return solid;
  }

  const cutter = createDoorCutterGeometry(thicknessM);
  const centerX = doorCutterCenterX(widthM);
  const centerY = DOOR_HEIGHT_M / 2;
  const result = subtractDoorFromWall(solid, cutter, new Vector3(centerX, centerY, 0));
  ensureGeometryTangents(result);
  return result;
}

function addDoorHoleToShape(shape: Shape, widthM: number): void {
  const left = -widthM / 2 + DOOR_LEFT_INSET_M;
  const bottom = 0;
  const hole = new Path();
  hole.moveTo(left, bottom);
  hole.lineTo(left + DOOR_WIDTH_M, bottom);
  hole.lineTo(left + DOOR_WIDTH_M, bottom + DOOR_HEIGHT_M);
  hole.lineTo(left, bottom + DOOR_HEIGHT_M);
  hole.lineTo(left, bottom);
  shape.holes.push(hole);
}

function createWallFrontShape(
  widthM: number,
  heightM: number,
  withDoor: boolean,
): Shape {
  const halfW = widthM / 2;
  const shape = new Shape();
  shape.moveTo(-halfW, 0);
  shape.lineTo(halfW, 0);
  shape.lineTo(halfW, heightM);
  shape.lineTo(-halfW, heightM);
  shape.lineTo(-halfW, 0);

  if (withDoor) {
    addDoorHoleToShape(shape, widthM);
  }

  return shape;
}

export function createWallFrontGeometry(
  widthM: number,
  heightM: number,
  withDoor: boolean,
): BufferGeometry {
  const shape = createWallFrontShape(widthM, heightM, withDoor);
  return new ShapeGeometry(shape);
}
