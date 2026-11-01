import type { LightingSettings } from './scene-api';

type LightingPresetSource = 'builtin' | 'user';

export interface LightingPreset {
  id: string;
  name: string;
  source: LightingPresetSource;
  description?: string;
  createdAt?: string;
  snapshot: LightingSettings;
}

export function cloneLightingSettings(
  settings: LightingSettings,
): LightingSettings {
  return {
    showFixtures: settings.showFixtures,
    fixturesReflectInMirror: settings.fixturesReflectInMirror,
    ambient: {
      enabled: settings.ambient.enabled,
      color: { ...settings.ambient.color },
      intensity: settings.ambient.intensity,
    },
    key: {
      enabled: settings.key.enabled,
      azimuthDeg: settings.key.azimuthDeg,
      elevationDeg: settings.key.elevationDeg,
      color: { ...settings.key.color },
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
      color: { ...settings.fill.color },
      azimuthDeg: settings.fill.azimuthDeg,
      elevationDeg: settings.fill.elevationDeg,
      intensity: settings.fill.intensity,
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

export function cloneLightingPreset(preset: LightingPreset): LightingPreset {
  return {
    ...preset,
    snapshot: cloneLightingSettings(preset.snapshot),
  };
}
