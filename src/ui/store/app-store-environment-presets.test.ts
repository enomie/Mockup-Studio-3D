import { describe, expect, it } from 'vitest';
import { BUILTIN_ENV_DARK_STAGE_ID, BUILTIN_ENV_DEFAULT_ID } from '@/data/builtin-environments';
import {
  BUILTIN_LIGHT_DEFAULT_ID,
  BUILTIN_LIGHT_DRAMATIC_ID,
} from '@/data/builtin-light-rigs';
import { getAppState } from './app-store-internals';
import { loadEnvironment, saveCurrentAsEnvironment } from './app-store-environment-presets';
import { loadLightingPreset } from './app-store-lighting-presets';

describe('environments and light rigs are independent', () => {
  it('starts with the Default environment and the Default light rig', () => {
    expect(getAppState().activeEnvironmentId).toBe(BUILTIN_ENV_DEFAULT_ID);
    expect(getAppState().activeLightingPresetId).toBe(BUILTIN_LIGHT_DEFAULT_ID);
  });

  it('loading an environment keeps lights and the active light rig', () => {
    loadLightingPreset(BUILTIN_LIGHT_DRAMATIC_ID);
    const lighting = getAppState().lighting;

    loadEnvironment(BUILTIN_ENV_DARK_STAGE_ID);

    expect(getAppState().activeEnvironmentId).toBe(BUILTIN_ENV_DARK_STAGE_ID);
    expect(getAppState().activeLightingPresetId).toBe(BUILTIN_LIGHT_DRAMATIC_ID);
    expect(getAppState().lighting).toEqual(lighting);
  });

  it('loading a light rig keeps the environment', () => {
    loadEnvironment(BUILTIN_ENV_DARK_STAGE_ID);
    const { skyHorizonColor, ground } = getAppState();

    loadLightingPreset(BUILTIN_LIGHT_DEFAULT_ID);

    expect(getAppState().activeEnvironmentId).toBe(BUILTIN_ENV_DARK_STAGE_ID);
    expect(getAppState().skyHorizonColor).toEqual(skyHorizonColor);
    expect(getAppState().ground).toEqual(ground);
  });

  it('saving an environment stores no lights', () => {
    const id = saveCurrentAsEnvironment();
    const preset = getAppState().environments.find((entry) => entry.id === id);
    expect(preset && Object.keys(preset.snapshot).sort()).toEqual(['environment', 'ground']);
  });
});
