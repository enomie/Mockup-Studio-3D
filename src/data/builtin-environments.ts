import { parseHexColorRequired } from '@/colors/color-format';
import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import { MATERIAL_PLASTIC_MATTE_ID } from '@/scene/material-ids';
import {
  cloneEnvironmentPreset,
  cloneEnvironmentSnapshot,
  type EnvironmentPreset,
  type EnvironmentSnapshot,
} from '@/scene/environment-preset-types';

export const BUILTIN_ENV_DEFAULT_ID = 'builtin-env-default';
export const BUILTIN_ENV_BLUE_SKY_ID = 'builtin-env-blue-sky';
export const BUILTIN_ENV_DARK_STAGE_ID = 'builtin-env-dark-stage';

/** Snapshot aligned with SCENE_DEFAULTS — single source for the Default environment. */
export function environmentFromSceneDefaults(): EnvironmentSnapshot {
  const { environment, ground } = SCENE_DEFAULTS;
  return cloneEnvironmentSnapshot({
    environment: {
      ...environment,
      skyHorizonColor: { ...environment.skyHorizonColor },
      skyZenithColor: { ...environment.skyZenithColor },
      fogColor: { ...environment.fogColor },
    },
    ground: { ...ground },
  });
}

const SKY_HORIZON_BLUE = parseHexColorRequired('#A8C7DB');
const SKY_ZENITH_BLUE = parseHexColorRequired('#1F61B8');

/** Blue-gray sky with distant haze (former app default). */
function buildBlueSkySnapshot(): EnvironmentSnapshot {
  const base = environmentFromSceneDefaults();
  return cloneEnvironmentSnapshot({
    ...base,
    environment: {
      ...base.environment,
      skyHorizonColor: { ...SKY_HORIZON_BLUE },
      skyZenithColor: { ...SKY_ZENITH_BLUE },
      skyGradientFade: 0.35,
      fogEnabled: true,
      fogColor: { ...SKY_HORIZON_BLUE },
      fogNear: 25,
      fogFar: 100,
    },
  });
}

const SKY_HORIZON_DARK = parseHexColorRequired('#2A3038');
const SKY_ZENITH_DARK = parseHexColorRequired('#0A0E14');

/** Dark floor and sky, subdued reflections. */
function buildDarkStageSnapshot(): EnvironmentSnapshot {
  const base = environmentFromSceneDefaults();
  return cloneEnvironmentSnapshot({
    environment: {
      ...base.environment,
      skyHorizonColor: { ...SKY_HORIZON_DARK },
      skyZenithColor: { ...SKY_ZENITH_DARK },
      skyGradientFade: 0.55,
      fogEnabled: true,
      fogColor: { ...SKY_HORIZON_DARK },
      fogNear: 30,
      fogFar: 120,
      reflectionIntensity: 0.35,
    },
    ground: {
      ...base.ground,
      materialId: MATERIAL_PLASTIC_MATTE_ID,
    },
  });
}

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = [
  {
    id: BUILTIN_ENV_DEFAULT_ID,
    name: 'Default',
    source: 'builtin',
    description: 'Neutral light gray studio, Print Matt ground, studio reflections.',
    snapshot: environmentFromSceneDefaults(),
  },
  {
    id: BUILTIN_ENV_BLUE_SKY_ID,
    name: 'Blue Sky',
    source: 'builtin',
    description: 'Blue-gray sky with distant haze, Print Matt ground.',
    snapshot: buildBlueSkySnapshot(),
  },
  {
    id: BUILTIN_ENV_DARK_STAGE_ID,
    name: 'Dark Stage',
    source: 'builtin',
    description: 'Dark floor and sky, subdued reflections.',
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
