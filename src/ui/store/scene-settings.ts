import type { AppState } from './app-store-internals';

/** Store fields every scene owns itself (light, sky, fog, reflections, ground, active presets). */
export const PER_SCENE_SETTING_KEYS = [
  'lighting',
  'skyEnabled',
  'skyHorizonColor',
  'skyZenithColor',
  'skyGradientFade',
  'fogEnabled',
  'fogColor',
  'fogNear',
  'fogFar',
  'reflectionEnabled',
  'reflectionIntensity',
  'reflectionSource',
  'ground',
  'activeEnvironmentId',
  'activeLightingPresetId',
  'activeArrangementId',
] as const satisfies readonly (keyof AppState)[];

export type PerSceneSettings = Pick<AppState, (typeof PER_SCENE_SETTING_KEYS)[number]>;

export function capturePerSceneSettings(state: AppState): PerSceneSettings {
  const settings = {} as Record<string, unknown>;
  for (const key of PER_SCENE_SETTING_KEYS) {settings[key] = structuredClone(state[key]);}
  return settings as PerSceneSettings;
}
