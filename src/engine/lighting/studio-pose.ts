import type { EntityTransform, Vec3 } from '@/scene/entity-types';
import type { StudioLightSide } from '@/scene/scene-api';
import { DEG_TO_RAD } from '@/units/angle';

const STUDIO_BASE_DISTANCE = 8;

export interface StudioPose {
  position: Vec3;
  rotation: Vec3;
}

export function computeSceneCenter(
  positions: readonly Vec3[],
): Vec3 {
  if (positions.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  let x = 0;
  let y = 0;
  let z = 0;
  for (const position of positions) {
    x += position.x;
    y += position.y;
    z += position.z;
  }
  const count = positions.length;
  return { x: x / count, y: y / count, z: z / count };
}

function sphericalToPosition(
  center: Vec3,
  azimuthDeg: number,
  elevationDeg: number,
  distance: number,
): Vec3 {
  const azimuth = azimuthDeg * DEG_TO_RAD;
  const elevation = elevationDeg * DEG_TO_RAD;
  const horizontal = distance * Math.cos(elevation);

  return {
    x: center.x + horizontal * Math.sin(azimuth),
    y: center.y + distance * Math.sin(elevation),
    z: center.z + horizontal * Math.cos(azimuth),
  };
}

function lookAtRotation(from: Vec3, to: Vec3): Vec3 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const yaw = Math.atan2(dx, dz);
  const horizontal = Math.hypot(dx, dz);
  const pitch = -Math.atan2(dy, horizontal);
  return { x: pitch, y: yaw, z: 0 };
}

export function computeKeyPose(
  center: Vec3,
  side: StudioLightSide,
  distanceMultiplier = 1,
): StudioPose {
  const azimuth = side === 'left' ? -45 : 45;
  const distance = STUDIO_BASE_DISTANCE * distanceMultiplier;
  const position = sphericalToPosition(center, azimuth, 45, distance);
  const rotation = lookAtRotation(position, center);
  return { position, rotation };
}

export function computeFillPose(
  center: Vec3,
  keySide: StudioLightSide,
  distanceMultiplier = 1,
): StudioPose {
  const fillSide = keySide === 'left' ? 'right' : 'left';
  const azimuth = fillSide === 'left' ? -45 : 45;
  const distance = STUDIO_BASE_DISTANCE * distanceMultiplier;
  const position = sphericalToPosition(center, azimuth, 35, distance);
  const rotation = lookAtRotation(position, center);
  return { position, rotation };
}

export function applyTransformOffset(base: StudioPose, offset: EntityTransform): StudioPose {
  return {
    position: {
      x: base.position.x + offset.position.x,
      y: base.position.y + offset.position.y,
      z: base.position.z + offset.position.z,
    },
    rotation: {
      x: base.rotation.x + offset.rotation.x,
      y: base.rotation.y + offset.rotation.y,
      z: base.rotation.z + offset.rotation.z,
    },
  };
}

export function computeOffsetFromWorld(
  base: StudioPose,
  world: EntityTransform,
): EntityTransform {
  return {
    position: {
      x: world.position.x - base.position.x,
      y: world.position.y - base.position.y,
      z: world.position.z - base.position.z,
    },
    rotation: {
      x: world.rotation.x - base.rotation.x,
      y: world.rotation.y - base.rotation.y,
      z: world.rotation.z - base.rotation.z,
    },
  };
}
