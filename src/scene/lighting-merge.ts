import type { Rgb } from '@/colors/rgb';
import { cloneTransform, defaultTransform, type EntityTransform } from './entity-types';
import type { DeepPartial, LightingSettings, StudioLightSide } from './scene-api';

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
  if (!partial) {return cloneTransform(current);}
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

/**
 * Saved payloads may still carry legacy fields: root-level shadowSoftness (before per-light
 * split), key.side (before orbit angles) and fill.intensityRatio (before independent intensity).
 */
type LegacyLightingPartial = DeepPartial<LightingSettings> & {
  shadowSoftness?: number;
  key?: { side?: StudioLightSide };
  fill?: { intensityRatio?: number };
};

const LEGACY_SIDE_KEY_AZIMUTH: Record<StudioLightSide, number> = { left: 315, right: 45 };
const LEGACY_SIDE_FILL_AZIMUTH: Record<StudioLightSide, number> = { left: 45, right: 315 };

function normalizeAzimuth(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function mergeLightingSettings(
  current: LightingSettings,
  partial: DeepPartial<LightingSettings>,
): LightingSettings {
  const legacy = partial as LegacyLightingPartial;
  const rootShadowSoftness = legacy.shadowSoftness;
  const legacySide = legacy.key?.side;
  const legacyRatio = legacy.fill?.intensityRatio;
  const keyIntensity = partial.key?.intensity ?? current.key.intensity;

  const next: LightingSettings = {
    referenceMode: partial.referenceMode ?? current.referenceMode,
    showFixtures: partial.showFixtures ?? current.showFixtures,
    fixturesReflectInMirror:
      partial.fixturesReflectInMirror ?? current.fixturesReflectInMirror,
    ambient: {
      enabled: partial.ambient?.enabled ?? current.ambient.enabled,
      color: mergeRgb(current.ambient.color, partial.ambient?.color),
      intensity: partial.ambient?.intensity ?? current.ambient.intensity,
    },
    key: {
      enabled: partial.key?.enabled ?? current.key.enabled,
      azimuthDeg: normalizeAzimuth(
        partial.key?.azimuthDeg ??
          (legacySide ? LEGACY_SIDE_KEY_AZIMUTH[legacySide] : current.key.azimuthDeg),
      ),
      elevationDeg: partial.key?.elevationDeg ?? current.key.elevationDeg,
      color: mergeRgb(current.key.color, partial.key?.color),
      intensity: keyIntensity,
      castShadow: partial.key?.castShadow ?? current.key.castShadow,
      shadowSoftness:
        partial.key?.shadowSoftness ??
        rootShadowSoftness ??
        current.key.shadowSoftness,
      transformOffset: mergeTransform(current.key.transformOffset, partial.key?.transformOffset),
    },
    fill: {
      enabled: partial.fill?.enabled ?? current.fill.enabled,
      color: mergeRgb(current.fill.color, partial.fill?.color),
      azimuthDeg: normalizeAzimuth(
        partial.fill?.azimuthDeg ??
          (legacySide ? LEGACY_SIDE_FILL_AZIMUTH[legacySide] : current.fill.azimuthDeg),
      ),
      elevationDeg: partial.fill?.elevationDeg ?? current.fill.elevationDeg,
      intensity:
        partial.fill?.intensity ??
        (legacyRatio !== undefined ? keyIntensity * legacyRatio : current.fill.intensity),
      distance: partial.fill?.distance ?? current.fill.distance,
      castShadow: partial.fill?.castShadow ?? current.fill.castShadow,
      shadowSoftness:
        partial.fill?.shadowSoftness ??
        rootShadowSoftness ??
        current.fill.shadowSoftness,
      transformOffset: mergeTransform(current.fill.transformOffset, partial.fill?.transformOffset),
    },
  };

  // Orbit change re-bases the light — drop stale gizmo offsets unless the patch sets them.
  if (
    partial.key?.transformOffset === undefined &&
    (next.key.azimuthDeg !== current.key.azimuthDeg ||
      next.key.elevationDeg !== current.key.elevationDeg)
  ) {
    next.key.transformOffset = defaultTransform();
  }
  if (
    partial.fill?.transformOffset === undefined &&
    (next.fill.azimuthDeg !== current.fill.azimuthDeg ||
      next.fill.elevationDeg !== current.fill.elevationDeg)
  ) {
    next.fill.transformOffset = defaultTransform();
  }

  return next;
}
