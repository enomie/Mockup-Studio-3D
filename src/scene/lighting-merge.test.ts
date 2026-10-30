import { describe, expect, it } from 'vitest';
import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import { mergeLightingSettings } from './lighting-merge';
import { cloneLightingSettings } from './lighting-preset-types';
import type { DeepPartial, LightingSettings } from './scene-api';

function defaults(): LightingSettings {
  return cloneLightingSettings(SCENE_DEFAULTS.lighting as LightingSettings);
}

describe('mergeLightingSettings', () => {
  it('migrates legacy key.side to orbit azimuths', () => {
    const legacy = { key: { side: 'right' } } as unknown as DeepPartial<LightingSettings>;
    const next = mergeLightingSettings(defaults(), legacy);
    expect(next.key.azimuthDeg).toBe(45);
    expect(next.fill.azimuthDeg).toBe(315);
  });

  it('migrates legacy fill.intensityRatio to absolute fill intensity', () => {
    const legacy = {
      key: { intensity: 2 },
      fill: { intensityRatio: 0.25 },
    } as unknown as DeepPartial<LightingSettings>;
    expect(mergeLightingSettings(defaults(), legacy).fill.intensity).toBe(0.5);
  });

  it('keeps fill intensity independent of key intensity', () => {
    const next = mergeLightingSettings(defaults(), { key: { intensity: 3 } });
    expect(next.fill.intensity).toBe(defaults().fill.intensity);
  });

  it('wraps azimuth to 0–360 and resets the gizmo offset on orbit change', () => {
    const current = defaults();
    current.key.transformOffset.position.x = 1;
    const next = mergeLightingSettings(current, { key: { azimuthDeg: 360 } });
    expect(next.key.azimuthDeg).toBe(0);
    expect(next.key.transformOffset.position.x).toBe(0);
  });
});
