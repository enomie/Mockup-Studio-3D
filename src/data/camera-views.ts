import {
  CAMERA_DEFAULT_AZIMUTH_DEG,
  CAMERA_DEFAULT_ELEVATION_DEG,
  CAMERA_ORBIT_DEFAULT_RADIUS,
  CAMERA_TARGET_Y,
} from '@/constants';
import { DEG_TO_RAD } from '@/units/angle';
import type { BuiltinCameraViewId, CameraSlotIndex } from '@/scene/scene-api';
import type { Vec3 } from '@/scene/entity-types';

export interface BuiltinCameraViewDefinition {
  id: BuiltinCameraViewId;
  label: string;
  shortcut: string;
  spherical: { radius: number; phi: number; theta: number };
  target: Vec3;
}

export interface CameraUserSlotDefinition {
  index: CameraSlotIndex;
  label: string;
  shortcut: string;
}

export type CameraKeyAction =
  | { type: 'builtin'; id: BuiltinCameraViewId }
  | { type: 'slot'; index: CameraSlotIndex };

const SCENE_CENTER: Vec3 = { x: 0, y: CAMERA_TARGET_Y, z: 0 };
const AXIS_RADIUS = CAMERA_ORBIT_DEFAULT_RADIUS;
const HALF_PI = Math.PI / 2;

export const BUILTIN_CAMERA_VIEWS: BuiltinCameraViewDefinition[] = [
  {
    id: 'normal',
    label: 'Default',
    shortcut: '1',
    spherical: {
      radius: AXIS_RADIUS,
      phi: Math.PI / 2 - CAMERA_DEFAULT_ELEVATION_DEG * DEG_TO_RAD,
      theta: CAMERA_DEFAULT_AZIMUTH_DEG * DEG_TO_RAD,
    },
    target: SCENE_CENTER,
  },
  {
    id: 'front',
    label: 'Front',
    shortcut: '2',
    spherical: { radius: AXIS_RADIUS, phi: HALF_PI, theta: 0 },
    target: SCENE_CENTER,
  },
  {
    id: 'top',
    label: 'Top',
    shortcut: '3',
    spherical: { radius: AXIS_RADIUS, phi: 0, theta: 0 },
    target: SCENE_CENTER,
  },
  {
    id: 'back',
    label: 'Back',
    shortcut: '4',
    spherical: { radius: AXIS_RADIUS, phi: HALF_PI, theta: Math.PI },
    target: SCENE_CENTER,
  },
  {
    id: 'bottom',
    label: 'Bottom',
    shortcut: '5',
    spherical: { radius: AXIS_RADIUS, phi: Math.PI, theta: 0 },
    target: SCENE_CENTER,
  },
  {
    id: 'left',
    label: 'Left',
    shortcut: '6',
    spherical: { radius: AXIS_RADIUS, phi: HALF_PI, theta: -HALF_PI },
    target: SCENE_CENTER,
  },
  {
    id: 'right',
    label: 'Right',
    shortcut: '7',
    spherical: { radius: AXIS_RADIUS, phi: HALF_PI, theta: HALF_PI },
    target: SCENE_CENTER,
  },
];

export const CAMERA_USER_SLOTS: CameraUserSlotDefinition[] = [
  { index: 1, label: 'Slot 1', shortcut: '8' },
  { index: 2, label: 'Slot 2', shortcut: '9' },
  { index: 3, label: 'Slot 3', shortcut: '0' },
];

export const CAMERA_ACTION_BY_KEY: Record<string, CameraKeyAction> = {
  ...Object.fromEntries(
    BUILTIN_CAMERA_VIEWS.map((view) => [
      view.shortcut,
      { type: 'builtin' as const, id: view.id },
    ]),
  ),
  ...Object.fromEntries(
    CAMERA_USER_SLOTS.map((slot) => [
      slot.shortcut,
      { type: 'slot' as const, index: slot.index },
    ]),
  ),
};

export function getBuiltinCameraView(
  id: BuiltinCameraViewId,
): BuiltinCameraViewDefinition | undefined {
  return BUILTIN_CAMERA_VIEWS.find((view) => view.id === id);
}

export function builtinCameraViewLabel(view: BuiltinCameraViewDefinition): string {
  return `${view.label} (${view.shortcut})`;
}

export function cameraSlotLabel(
  slot: CameraUserSlotDefinition,
  name?: string | null,
): string {
  const displayName = name?.trim() ? name : slot.label;
  return `${displayName} (${slot.shortcut})`;
}