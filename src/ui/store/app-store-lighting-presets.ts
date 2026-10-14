import {
  BUILTIN_LIGHT_DEFAULT_ID,
  cloneLightingPreset,
} from '@/data/builtin-light-rigs';
import {
  cloneLightingSettings,
  type LightingPreset,
} from '@/scene/lighting-preset-types';
import * as store from './app-store-internals';

export function loadLightingPreset(id: string): void {
  const preset = store.getLightingPresetById(id);
  if (!preset) {return;}
  store.applyLightingToStateAndScene(
    cloneLightingSettings(preset.snapshot),
    id,
  );
}


export function saveCurrentAsLightingPreset(): string {
  const id = `user-light-${crypto.randomUUID()}`;
  const preset: LightingPreset = {
    id,
    name: store.nextLightingPresetSaveName(),
    source: 'user',
    createdAt: new Date().toISOString(),
    snapshot: store.captureLightingFromState(),
  };

  store.setAppState({
    ...store.state,
    lightingPresets: [...store.state.lightingPresets, preset],
    activeLightingPresetId: id,
  });
  store.emit();
  return id;
}


export function updateLightingPreset(
  id: string,
  partial: Pick<LightingPreset, 'name'>,
): void {
  const index = store.state.lightingPresets.findIndex((entry) => entry.id === id);
  if (index < 0) {return;}
  const current = store.state.lightingPresets[index];
  if (current.source !== 'user') {return;}

  const lightingPresets = [...store.state.lightingPresets];
  lightingPresets[index] = { ...current, ...partial };
  store.setAppState({ ...store.state, lightingPresets });
  store.emit();
}


export function duplicateLightingPreset(id: string): string | null {
  const source = store.getLightingPresetById(id);
  if (!source) {return null;}

  const newId = `user-light-${crypto.randomUUID()}`;
  const copy: LightingPreset = {
    ...cloneLightingPreset(source),
    id: newId,
    name: `${source.name} copy`,
    source: 'user',
    description: undefined,
    createdAt: new Date().toISOString(),
  };

  store.setAppState({
    ...store.state,
    lightingPresets: [...store.state.lightingPresets, copy],
    activeLightingPresetId: newId,
  });
  store.applyLightingToStateAndScene(cloneLightingSettings(copy.snapshot), newId);
  return newId;
}


export function removeLightingPreset(id: string): void {
  const preset = store.state.lightingPresets.find((entry) => entry.id === id);
  if (preset?.source !== 'user') {return;}

  const wasActive = store.state.activeLightingPresetId === id;
  store.setAppState({
    ...store.state,
    lightingPresets: store.state.lightingPresets.filter((entry) => entry.id !== id),
    activeLightingPresetId: wasActive
      ? BUILTIN_LIGHT_DEFAULT_ID
      : store.state.activeLightingPresetId,
  });

  if (wasActive) {
    loadLightingPreset(BUILTIN_LIGHT_DEFAULT_ID);
  } else {
    store.emit();
  }
}

