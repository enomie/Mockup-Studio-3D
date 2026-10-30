import { parseHexColorRequired } from '@/colors/color-format';
import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import { SHADOW_SOFTNESS_DEFAULT } from '@/constants';
import {
  MATERIAL_GLOSSY_PRINT_ID,
  MATERIAL_PLASTIC_MATTE_ID,
} from '@/scene/material-ids';
import { defaultTransform } from '@/scene/entity-types';
import {
  cloneAtmosphereSnapshot,
  cloneEnvironmentPreset,
  type AtmosphereSnapshot,
  type EnvironmentPreset,
} from '@/scene/environment-preset-types';
import { cloneLightingSettings } from '@/scene/lighting-preset-types';

export const BUILTIN_ENV_DEFAULT_ID = 'builtin-env-default';
export const BUILTIN_ENV_SOFTBOX_ID = 'builtin-env-softbox';
export const BUILTIN_ENV_DARK_STAGE_ID = 'builtin-env-dark-stage';

/** Snapshot aligned with SCENE_DEFAULTS — single source for the Default preset. */
export function atmosphereFromSceneDefaults(): AtmosphereSnapshot {
  const { environment, ground, lighting } = SCENE_DEFAULTS;
  return cloneAtmosphereSnapshot({
    environment: {
      skyEnabled: environment.skyEnabled,
      skyHorizonColor: { ...environment.skyHorizonColor },
      skyZenithColor: { ...environment.skyZenithColor },
      skyGradientFade: environment.skyGradientFade,
      fogEnabled: environment.fogEnabled,
      fogColor: { ...environment.fogColor },
      fogNear: environment.fogNear,
      fogFar: environment.fogFar,
      reflectionEnabled: environment.reflectionEnabled,
      reflectionIntensity: environment.reflectionIntensity,
      reflectionSource: environment.reflectionSource,
    },
    ground: {
      visible: ground.visible,
      materialId: ground.materialId,
      receiveShadow: ground.receiveShadow,
      mirrorEnabled: ground.mirrorEnabled,
      mirrorOpacity: ground.mirrorOpacity,
    },
    lighting: cloneLightingSettings(lighting),
  });
}

const SKY_HORIZON_NEUTRAL = parseHexColorRequired('#D8DCE0');
const SKY_ZENITH_NEUTRAL = parseHexColorRequired('#A8B0B8');

/** Soft shadows on light gray — lower IBL so contact shadows read on devices. */
function buildSoftboxSnapshot(): AtmosphereSnapshot {
  const base = atmosphereFromSceneDefaults();
  return cloneAtmosphereSnapshot({
    environment: {
      ...base.environment,
      skyHorizonColor: { ...SKY_HORIZON_NEUTRAL },
      skyZenithColor: { ...SKY_ZENITH_NEUTRAL },
      skyGradientFade: 0.45,
      fogEnabled: false,
      reflectionEnabled: true,
      reflectionIntensity: 0.42,
    },
    ground: {
      ...base.ground,
      materialId: MATERIAL_GLOSSY_PRINT_ID,
    },
    lighting: {
      ...base.lighting,
      ambient: {
        ...base.lighting.ambient,
        intensity: 0.06,
      },
      key: {
        ...base.lighting.key,
        shadowSoftness: 10,
      },
      fill: {
        ...base.lighting.fill,
        intensityRatio: 0.62,
        distance: 0.85,
        shadowSoftness: 10,
      },
    },
  });
}

const SKY_HORIZON_DARK = parseHexColorRequired('#2A3038');
const SKY_ZENITH_DARK = parseHexColorRequired('#0A0E14');

/** Dramatic product shot — dark floor, subdued IBL, harder key. */
function buildDarkStageSnapshot(): AtmosphereSnapshot {
  const base = atmosphereFromSceneDefaults();
  return cloneAtmosphereSnapshot({
    environment: {
      ...base.environment,
      skyHorizonColor: { ...SKY_HORIZON_DARK },
      skyZenithColor: { ...SKY_ZENITH_DARK },
      skyGradientFade: 0.55,
      fogEnabled: true,
      fogColor: { ...SKY_HORIZON_DARK },
      fogNear: 30,
      fogFar: 120,
      reflectionIntensity: 0.25,
    },
    ground: {
      ...base.ground,
      materialId: MATERIAL_PLASTIC_MATTE_ID,
    },
    lighting: {
      ...base.lighting,
      ambient: {
        ...base.lighting.ambient,
        intensity: 0.04,
      },
      key: {
        ...base.lighting.key,
        shadowSoftness: SHADOW_SOFTNESS_DEFAULT,
        intensity: 1.15,
      },
      fill: {
        ...base.lighting.fill,
        intensityRatio: 0.28,
        castShadow: false,
        shadowSoftness: SHADOW_SOFTNESS_DEFAULT,
        transformOffset: defaultTransform(),
      },
    },
  });
}

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = [
  {
    id: BUILTIN_ENV_DEFAULT_ID,
    name: 'Default',
    source: 'builtin',
    description: 'App start — Print Matt ground, blue-gray sky.',
    snapshot: atmosphereFromSceneDefaults(),
  },
  {
    id: BUILTIN_ENV_SOFTBOX_ID,
    name: 'Softbox',
    source: 'builtin',
    description: 'Light gray studio, soft shadows, moderate reflections.',
    snapshot: buildSoftboxSnapshot(),
  },
  {
    id: BUILTIN_ENV_DARK_STAGE_ID,
    name: 'Dark Stage',
    source: 'builtin',
    description: 'Dark floor and sky, stronger key, low IBL.',
    snapshot: buildDarkStageSnapshot(),
  },
];

export function resolveBuiltinEnvironmentPreset(
  id: string,
): EnvironmentPreset | undefined {
  const preset = ENVIRONMENT_PRESETS.find((entry) => entry.id === id);
  return preset ? cloneEnvironmentPreset(preset) : undefined;
}

export { cloneEnvironmentPreset };
