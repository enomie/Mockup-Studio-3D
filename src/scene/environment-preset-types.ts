import { normalizeGroundSettings } from './ground-settings';
import type {
  EnvironmentState,
  GroundSettings,
  LightingSettings,
} from './scene-api';

export type EnvironmentSource = 'builtin' | 'user';

export interface AtmosphereSnapshot {
  environment: EnvironmentState;
  ground: GroundSettings;
  lighting: LightingSettings;
}

export interface EnvironmentPreset {
  id: string;
  name: string;
  source: EnvironmentSource;
  description?: string;
  createdAt?: string;
  snapshot: AtmosphereSnapshot;
}

function cloneRgb(rgb: { r: number; g: number; b: number }): {
  r: number;
  g: number;
  b: number;
} {
  return { r: rgb.r, g: rgb.g, b: rgb.b };
}

function cloneLighting(settings: LightingSettings): LightingSettings {
  return {
    referenceMode: settings.referenceMode,
    showFixtures: settings.showFixtures,
    fixturesReflectInMirror: settings.fixturesReflectInMirror,
    ambient: {
      enabled: settings.ambient.enabled,
      color: cloneRgb(settings.ambient.color),
      intensity: settings.ambient.intensity,
    },
    key: {
      enabled: settings.key.enabled,
      side: settings.key.side,
      color: cloneRgb(settings.key.color),
      intensity: settings.key.intensity,
      castShadow: settings.key.castShadow,
      shadowSoftness: settings.key.shadowSoftness,
      transformOffset: {
        position: { ...settings.key.transformOffset.position },
        rotation: { ...settings.key.transformOffset.rotation },
      },
    },
    fill: {
      enabled: settings.fill.enabled,
      color: cloneRgb(settings.fill.color),
      intensityRatio: settings.fill.intensityRatio,
      distance: settings.fill.distance,
      castShadow: settings.fill.castShadow,
      shadowSoftness: settings.fill.shadowSoftness,
      transformOffset: {
        position: { ...settings.fill.transformOffset.position },
        rotation: { ...settings.fill.transformOffset.rotation },
      },
    },
  };
}

function cloneGround(settings: GroundSettings): GroundSettings {
  return normalizeGroundSettings(settings);
}

function cloneEnvironment(environment: EnvironmentState): EnvironmentState {
  return {
    skyEnabled: environment.skyEnabled,
    skyHorizonColor: cloneRgb(environment.skyHorizonColor),
    skyZenithColor: cloneRgb(environment.skyZenithColor),
    skyGradientFade: environment.skyGradientFade,
    fogEnabled: environment.fogEnabled,
    fogColor: cloneRgb(environment.fogColor),
    fogNear: environment.fogNear,
    fogFar: environment.fogFar,
    reflectionEnabled: environment.reflectionEnabled,
    reflectionIntensity: environment.reflectionIntensity,
    reflectionSource: environment.reflectionSource,
  };
}

export function cloneAtmosphereSnapshot(
  snapshot: AtmosphereSnapshot,
): AtmosphereSnapshot {
  return {
    environment: cloneEnvironment(snapshot.environment),
    ground: cloneGround(snapshot.ground),
    lighting: cloneLighting(snapshot.lighting),
  };
}

export function cloneEnvironmentPreset(
  preset: EnvironmentPreset,
): EnvironmentPreset {
  return {
    ...preset,
    snapshot: cloneAtmosphereSnapshot(preset.snapshot),
  };
}
