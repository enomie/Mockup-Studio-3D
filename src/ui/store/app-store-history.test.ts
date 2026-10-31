import { describe, expect, it } from 'vitest';
import { captureHistorySettings, describeHistorySettingsChange } from './app-store-history';
import { getAppState } from './app-store-internals';

describe('history settings snapshot', () => {
  it('reports no change for structurally equal copies', () => {
    const state = getAppState();
    const a = captureHistorySettings(state);
    const b = captureHistorySettings({ ...state, lighting: structuredClone(state.lighting) });
    expect(describeHistorySettingsChange(a, b)).toBeNull();
  });

  it('labels the changed groups', () => {
    const state = getAppState();
    const a = captureHistorySettings(state);
    const b = captureHistorySettings({ ...state, fogNear: state.fogNear + 1 });
    expect(describeHistorySettingsChange(a, b)).toBe('Edit environment');
    const c = captureHistorySettings({
      ...state,
      fogNear: state.fogNear + 1,
      ground: { ...state.ground, visible: !state.ground.visible },
    });
    expect(describeHistorySettingsChange(a, c)).toBe('Edit environment, ground');
  });
});
