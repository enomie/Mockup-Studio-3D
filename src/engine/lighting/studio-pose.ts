import type { EntityTransform, Vec3 } from '@/scene/entity-types';
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

/** Studio light pose on an orbit around `center`, aimed at `center`. */
export function computeOrbitPose(
  center: Vec3,
  azimuthDeg: number,
  elevationDeg: number,
  distanceMultiplier = 1,
): StudioPose {
  const distance = STUDIO_BASE_DISTANCE * distanceMultiplier;
  const position = sphericalToPosition(center, azimuthDeg, elevationDeg, distance);
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
