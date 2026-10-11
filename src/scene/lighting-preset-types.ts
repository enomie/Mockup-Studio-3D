import type { LightingSettings } from './scene-api';

export type LightingPresetSource = 'builtin' | 'user';

export type LightingPreset = {
  id: string;
  name: string;
  source: LightingPresetSource;
  description?: string;
  createdAt?: string;
  snapshot: LightingSettings;
};

export function cloneLightingSettings(
  settings: LightingSettings,
): LightingSettings {
  return {
    referenceMode: settings.referenceMode,
    ambient: {
      enabled: settings.ambient.enabled,
      color: { ...settings.ambient.color },
      intensity: settings.ambient.intensity,
    },
    key: {
      enabled: settings.key.enabled,
      side: settings.key.side,
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

export function cloneLightingPreset(preset: LightingPreset): LightingPreset {
  return {
    ...preset,
    snapshot: cloneLightingSettings(preset.snapshot),
  };
}
