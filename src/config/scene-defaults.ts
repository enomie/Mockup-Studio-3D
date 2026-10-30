import { parseHexColorRequired } from '@/colors/color-format';
import type { Rgb } from '@/colors/rgb';
import {
  CAMERA_DEFAULT_AZIMUTH_DEG,
  CAMERA_DEFAULT_ELEVATION_DEG,
  CAMERA_FOV,
  CAMERA_ORBIT_DEFAULT_RADIUS,
  CAMERA_TARGET_Y,
  SHADOW_SOFTNESS_DEFAULT,
} from '@/constants';
import { DEG_TO_RAD } from '@/units/angle';
import { MATERIAL_PAPER_ID } from '@/scene/material-ids';
import type {
  CameraSettings,
  GroundSettings,
  LightingSettings,
  ViewportHelpersState,
} from '@/scene/scene-api';
import { defaultTransform } from '@/scene/entity-types';

export interface EnvironmentDefaults {
  skyEnabled: boolean;
  skyHorizonColor: Rgb;
  skyZenithColor: Rgb;
  skyGradientFade: number;
  fogEnabled: boolean;
  fogColor: Rgb;
  fogNear: number;
  fogFar: number;
  reflectionEnabled: boolean;
  reflectionIntensity: number;
}

export type GroundDefaults = GroundSettings;

export type LightingDefaults = LightingSettings;

export interface CameraNormalViewDefaults {
  target: { x: number; y: number; z: number };
  spherical: { radius: number; phi: number; theta: number };
  fov: number;
  orthoZoom: number;
}

export interface CameraDefaults {
  normalView: CameraNormalViewDefaults;
  settings: CameraSettings;
}

export type ViewportHelpersDefaults = ViewportHelpersState;

const AMBIENT_COLOR = parseHexColorRequired('#FFF9F5');
const KEY_COLOR = parseHexColorRequired('#FFF5EB');
const FILL_COLOR = parseHexColorRequired('#F0F4FA');

/** Single source of truth for panel + engine initial scene values. */
export const SCENE_DEFAULTS = {
  environment: {
    skyEnabled: true,
    /** Blue-gray at horizon and nadir — #A8C7DB */
    skyHorizonColor: { r: 0.66, g: 0.78, b: 0.86 },
    /** Deeper blue at zenith */
    skyZenithColor: { r: 0.12, g: 0.38, b: 0.72 },
    /** Mid fade — visible gradient without sharp horizon band */
    skyGradientFade: 0.35,
    fogEnabled: true,
    /** Blue-gray haze matching sky — not white-out */
    fogColor: { r: 0.66, g: 0.78, b: 0.86 },
    fogNear: 25,
    fogFar: 100,
    reflectionEnabled: true,
    reflectionIntensity: 0.85,
  },
  ground: {
    visible: true,
    materialId: MATERIAL_PAPER_ID,
    receiveShadow: true,
    mirrorEnabled: false,
    mirrorOpacity: 1,
  },
  viewportHelpers: {
    floorGrid: false,
    worldOrigin: false,
    compassArrows: false,
    lightHandles: false,
  },
  lighting: {
    referenceMode: 'scene-center',
    showFixtures: true,
    fixturesReflectInMirror: true,
    ambient: {
      enabled: true,
      color: { ...AMBIENT_COLOR },
      intensity: 0.08,
    },
    key: {
      enabled: true,
      side: 'left',
      color: { ...KEY_COLOR },
      intensity: 1,
      castShadow: true,
      shadowSoftness: SHADOW_SOFTNESS_DEFAULT,
      transformOffset: defaultTransform(),
    },
    fill: {
      enabled: true,
      color: { ...FILL_COLOR },
      intensityRatio: 0.5,
      distance: 1,
      castShadow: true,
      shadowSoftness: SHADOW_SOFTNESS_DEFAULT,
      transformOffset: defaultTransform(),
    },
  },
  camera: {
    normalView: {
      target: { x: 0, y: CAMERA_TARGET_Y, z: 0 },
      spherical: {
        radius: CAMERA_ORBIT_DEFAULT_RADIUS,
        phi: Math.PI / 2 - CAMERA_DEFAULT_ELEVATION_DEG * DEG_TO_RAD,
        theta: CAMERA_DEFAULT_AZIMUTH_DEG * DEG_TO_RAD,
      },
      fov: CAMERA_FOV,
      orthoZoom: 1,
    },
    settings: {
      projection: 'perspective',
      fov: CAMERA_FOV,
      orthoZoom: 1,
      slots: [null, null, null],
    },
  },
} as const satisfies {
  environment: EnvironmentDefaults;
  ground: GroundDefaults;
  viewportHelpers: ViewportHelpersDefaults;
  lighting: LightingDefaults;
  camera: CameraDefaults;
};
