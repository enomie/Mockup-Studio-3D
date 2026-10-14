import * as store from './app-store-internals';
import {
  BUILTIN_ENV_DEFAULT_ID,
  cloneEnvironmentPreset,
  resolveBuiltinEnvironmentPreset,
} from '@/data/builtin-environments';
import {
  cloneAtmosphereSnapshot,
  type EnvironmentPreset,
} from '@/scene/environment-preset-types';

function getEnvironmentPresetById(id: string): EnvironmentPreset | undefined {
  return (
    store.state.environments.find((entry) => entry.id === id) ??
    resolveBuiltinEnvironmentPreset(id)
  );
}

function nextEnvironmentSaveName(): string {
  const base = 'My environment';
  const names = new Set(
    store.state.environments
      .filter((entry) => entry.source === 'user')
      .map((entry) => entry.name),
  );
  if (!names.has(base)) {return base;}
  let index = 2;
  while (names.has(`${base} ${index}`)) {
    index += 1;
  }
  return `${base} ${index}`;
}


export function loadEnvironment(id: string): void {
  const preset = getEnvironmentPresetById(id);
  if (!preset) {return;}
  store.applyAtmosphereToStateAndScene(
    cloneAtmosphereSnapshot(preset.snapshot),
    id,
  );
}

export function saveCurrentAsEnvironment(): string {
  const id = `user-env-${crypto.randomUUID()}`;
  const preset: EnvironmentPreset = {
    id,
    name: nextEnvironmentSaveName(),
    source: 'user',
    createdAt: new Date().toISOString(),
    snapshot: store.captureAtmosphereFromState(),
  };

  store.setAppState({
    ...store.state,
    environments: [...store.state.environments, preset],
    activeEnvironmentId: id,
  });
  store.emit();
  return id;
}

export function updateEnvironment(
  id: string,
  partial: Pick<EnvironmentPreset, 'name'>,
): void {
  const index = store.state.environments.findIndex((entry) => entry.id === id);
  if (index < 0) {return;}
  const current = store.state.environments[index];
  if (current.source !== 'user') {return;}

  const environments = [...store.state.environments];
  environments[index] = { ...current, ...partial };
  store.setAppState({ ...store.state, environments });
  store.emit();
}

export function duplicateEnvironment(id: string): string | null {
  const source =
    getEnvironmentPresetById(id) ??
    store.state.environments.find((entry) => entry.id === id);
  if (!source) {return null;}

  const newId = `user-env-${crypto.randomUUID()}`;
  const copy: EnvironmentPreset = {
    ...cloneEnvironmentPreset(source),
    id: newId,
    name: `${source.name} copy`,
    source: 'user',
    description: undefined,
    createdAt: new Date().toISOString(),
  };

  store.setAppState({
    ...store.state,
    environments: [...store.state.environments, copy],
    activeEnvironmentId: newId,
  });
  store.applyAtmosphereToStateAndScene(cloneAtmosphereSnapshot(copy.snapshot), newId);
  return newId;
}

export function removeEnvironment(id: string): void {
  const preset = store.state.environments.find((entry) => entry.id === id);
  if (preset?.source !== 'user') {return;}

  const wasActive = store.state.activeEnvironmentId === id;
  store.setAppState({
    ...store.state,
    environments: store.state.environments.filter((entry) => entry.id !== id),
    activeEnvironmentId: wasActive ? BUILTIN_ENV_DEFAULT_ID : store.state.activeEnvironmentId,
  });

  if (wasActive) {
    loadEnvironment(BUILTIN_ENV_DEFAULT_ID);
  } else {
    store.emit();
  }
}

