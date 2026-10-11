import type { Rgb } from '@/colors/rgb';
import { cloneTransform, defaultTransform, type EntityTransform } from './entity-types';
import type { DeepPartial, LightingSettings } from './scene-api';

function mergeRgb(current: Rgb, partial?: DeepPartial<Rgb>): Rgb {
  return {
    r: partial?.r ?? current.r,
    g: partial?.g ?? current.g,
    b: partial?.b ?? current.b,
  };
}

function mergeTransform(
  current: EntityTransform,
  partial?: DeepPartial<EntityTransform>,
): EntityTransform {
  if (!partial) return cloneTransform(current);
  return {
    position: {
      x: partial.position?.x ?? current.position.x,
      y: partial.position?.y ?? current.position.y,
      z: partial.position?.z ?? current.position.z,
    },
    rotation: {
      x: partial.rotation?.x ?? current.rotation.x,
      y: partial.rotation?.y ?? current.rotation.y,
      z: partial.rotation?.z ?? current.rotation.z,
    },
  };
}

/** @deprecated Root-level shadowSoftness before per-light split. */
type LegacyLightingPartial = DeepPartial<LightingSettings> & {
  shadowSoftness?: number;
};

export function mergeLightingSettings(
  current: LightingSettings,
  partial: DeepPartial<LightingSettings>,
): LightingSettings {
  const legacy = partial as LegacyLightingPartial;
  const legacyShadowSoftness = legacy.shadowSoftness;

  const prevKeySide = current.key.side;
  const next: LightingSettings = {
    referenceMode: partial.referenceMode ?? current.referenceMode,
    ambient: {
      enabled: partial.ambient?.enabled ?? current.ambient.enabled,
      color: mergeRgb(current.ambient.color, partial.ambient?.color),
      intensity: partial.ambient?.intensity ?? current.ambient.intensity,
    },
    key: {
      enabled: partial.key?.enabled ?? current.key.enabled,
      side: partial.key?.side ?? current.key.side,
      color: mergeRgb(current.key.color, partial.key?.color),
      intensity: partial.key?.intensity ?? current.key.intensity,
      castShadow: partial.key?.castShadow ?? current.key.castShadow,
      shadowSoftness:
        partial.key?.shadowSoftness ??
        legacyShadowSoftness ??
        current.key.shadowSoftness,
      transformOffset: mergeTransform(current.key.transformOffset, partial.key?.transformOffset),
    },
    fill: {
      enabled: partial.fill?.enabled ?? current.fill.enabled,
      color: mergeRgb(current.fill.color, partial.fill?.color),
      intensityRatio: partial.fill?.intensityRatio ?? current.fill.intensityRatio,
      distance: partial.fill?.distance ?? current.fill.distance,
      castShadow: partial.fill?.castShadow ?? current.fill.castShadow,
      shadowSoftness:
        partial.fill?.shadowSoftness ??
        legacyShadowSoftness ??
        current.fill.shadowSoftness,
      transformOffset: mergeTransform(current.fill.transformOffset, partial.fill?.transformOffset),
    },
  };

  if (partial.key?.side !== undefined && partial.key.side !== prevKeySide) {
    next.key.transformOffset = defaultTransform();
    next.fill.transformOffset = defaultTransform();
  }

  return next;
}
