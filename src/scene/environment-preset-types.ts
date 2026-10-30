import { normalizeGroundSettings } from './ground-settings';
import type {
  EnvironmentState,
  GroundSettings,
} from './scene-api';

export type EnvironmentSource = 'builtin' | 'user';

/** Environment preset content: sky, reflections, fog and ground. Lights live in light rigs. */
export interface EnvironmentSnapshot {
  environment: EnvironmentState;
  ground: GroundSettings;
}

export interface EnvironmentPreset {
  id: string;
  name: string;
  source: EnvironmentSource;
  description?: string;
  createdAt?: string;
  snapshot: EnvironmentSnapshot;
}

function cloneRgb(rgb: { r: number; g: number; b: number }): {
  r: number;
  g: number;
  b: number;
} {
  return { r: rgb.r, g: rgb.g, b: rgb.b };
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

export function cloneEnvironmentSnapshot(
  snapshot: EnvironmentSnapshot,
): EnvironmentSnapshot {
  return {
    environment: cloneEnvironment(snapshot.environment),
    ground: cloneGround(snapshot.ground),
  };
}

export function cloneEnvironmentPreset(
  preset: EnvironmentPreset,
): EnvironmentPreset {
  return {
    ...preset,
    snapshot: cloneEnvironmentSnapshot(preset.snapshot),
  };
}
