import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import { SHADOW_SOFTNESS_DEFAULT } from '@/constants';
import { defaultTransform } from '@/scene/entity-types';
import {
  cloneLightingPreset,
  cloneLightingSettings,
  type LightingPreset,
} from '@/scene/lighting-preset-types';
import type { LightingSettings } from '@/scene/scene-api';

export const BUILTIN_LIGHT_DEFAULT_ID = 'builtin-light-default';
export const BUILTIN_LIGHT_SOFTBOX_ID = 'builtin-light-softbox';
export const BUILTIN_LIGHT_DRAMATIC_ID = 'builtin-light-dramatic';

/** Single source for Default light rig — mirrors SCENE_DEFAULTS.lighting. */
export function lightingFromSceneDefaults(): LightingSettings {
  const { lighting } = SCENE_DEFAULTS;
  return cloneLightingSettings({
    referenceMode: lighting.referenceMode,
    showFixtures: lighting.showFixtures,
    fixturesReflectInMirror: lighting.fixturesReflectInMirror,
    ambient: {
      enabled: lighting.ambient.enabled,
      color: { ...lighting.ambient.color },
      intensity: lighting.ambient.intensity,
    },
    key: {
      enabled: lighting.key.enabled,
      side: lighting.key.side,
      color: { ...lighting.key.color },
      intensity: lighting.key.intensity,
      castShadow: lighting.key.castShadow,
      shadowSoftness: lighting.key.shadowSoftness,
      transformOffset: {
        position: { ...lighting.key.transformOffset.position },
        rotation: { ...lighting.key.transformOffset.rotation },
      },
    },
    fill: {
      enabled: lighting.fill.enabled,
      color: { ...lighting.fill.color },
      intensityRatio: lighting.fill.intensityRatio,
      distance: lighting.fill.distance,
      castShadow: lighting.fill.castShadow,
      shadowSoftness: lighting.fill.shadowSoftness,
      transformOffset: {
        position: { ...lighting.fill.transformOffset.position },
        rotation: { ...lighting.fill.transformOffset.rotation },
      },
    },
  });
}

/** Keep lighting branch in sync with builtin-environments buildSoftboxSnapshot. */
function buildSoftboxLighting(): LightingSettings {
  const base = lightingFromSceneDefaults();
  return cloneLightingSettings({
    ...base,
    ambient: {
      ...base.ambient,
      intensity: 0.06,
    },
    key: {
      ...base.key,
      shadowSoftness: 10,
    },
    fill: {
      ...base.fill,
      intensityRatio: 0.62,
      distance: 0.85,
      shadowSoftness: 10,
    },
  });
}

/** Keep lighting branch in sync with builtin-environments buildDarkStageSnapshot. */
function buildDramaticLighting(): LightingSettings {
  const base = lightingFromSceneDefaults();
  return cloneLightingSettings({
    ...base,
    ambient: {
      ...base.ambient,
      intensity: 0.04,
    },
    key: {
      ...base.key,
      shadowSoftness: SHADOW_SOFTNESS_DEFAULT,
      intensity: 1.15,
    },
    fill: {
      ...base.fill,
      intensityRatio: 0.28,
      castShadow: false,
      shadowSoftness: SHADOW_SOFTNESS_DEFAULT,
      transformOffset: defaultTransform(),
    },
  });
}

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: BUILTIN_LIGHT_DEFAULT_ID,
    name: 'Default',
    source: 'builtin',
    description: 'Studio rig from SCENE_DEFAULTS.',
    snapshot: lightingFromSceneDefaults(),
  },
  {
    id: BUILTIN_LIGHT_SOFTBOX_ID,
    name: 'Softbox',
    source: 'builtin',
    description: 'Soft shadows — lighting only (no sky/ground).',
    snapshot: buildSoftboxLighting(),
  },
  {
    id: BUILTIN_LIGHT_DRAMATIC_ID,
    name: 'Dramatic',
    source: 'builtin',
    description: 'Strong key, weak fill — lighting only.',
    snapshot: buildDramaticLighting(),
  },
];

export function resolveBuiltinLightingPreset(
  id: string,
): LightingPreset | undefined {
  const preset = LIGHTING_PRESETS.find((entry) => entry.id === id);
  return preset ? cloneLightingPreset(preset) : undefined;
}

export { cloneLightingPreset };
