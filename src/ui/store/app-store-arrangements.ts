import * as store from './app-store-internals';
import { resolveBuiltinArrangementPreset } from '@/data/builtin-arrangements';
import {
  cloneArrangementPreset,
  type ArrangementPreset,
} from '@/scene/arrangement-types';

const USER_ARRANGEMENT_ID_PREFIX = 'user-arrangement-';

function getArrangementPresetById(id: string): ArrangementPreset | undefined {
  return (
    store.state.arrangements.find((entry) => entry.id === id) ??
    resolveBuiltinArrangementPreset(id)
  );
}

export function nextArrangementSaveName(
  arrangements: readonly ArrangementPreset[] = store.state.arrangements,
): string {
  const base = 'My arrangement';
  const names = new Set(
    arrangements.filter((entry) => entry.source === 'user').map((entry) => entry.name),
  );
  if (!names.has(base)) {return base;}
  let index = 2;
  while (names.has(`${base} ${index}`)) {
    index += 1;
  }
  return `${base} ${index}`;
}

/** Replaces all scene assets with the arrangement; undo restores the previous scene. */
export function loadArrangement(id: string): void {
  const preset = getArrangementPresetById(id);
  if (!preset || !store.sceneApi) {return;}
  void store.sceneApi.applyArrangement(preset.content, `Load arrangement ${preset.name}`, () => {
    store.setAppState({ ...store.state, activeArrangementId: id });
    store.emit();
  });
}

/** Stores the current scene assets as a new user arrangement. */
export function saveCurrentAsArrangement(): string {
  const id = `${USER_ARRANGEMENT_ID_PREFIX}${crypto.randomUUID()}`;
  const entities = store.sceneApi?.getEntities() ?? store.state.entities;
  const preset: ArrangementPreset = {
    id,
    name: nextArrangementSaveName(),
    source: 'user',
    createdAt: new Date().toISOString(),
    content: { kind: 'entities', entities: [...entities] },
  };
  store.setAppState({
    ...store.state,
    arrangements: [...store.state.arrangements, preset],
    activeArrangementId: id,
  });
  store.emit();
  return id;
}

export function updateArrangement(
  id: string,
  partial: Pick<ArrangementPreset, 'name'>,
): void {
  const index = store.state.arrangements.findIndex((entry) => entry.id === id);
  if (index < 0) {return;}
  const current = store.state.arrangements[index];
  if (current.source !== 'user') {return;}

  const arrangements = [...store.state.arrangements];
  arrangements[index] = { ...current, ...partial };
  store.setAppState({ ...store.state, arrangements });
  store.emit();
}

/** Copies an arrangement into a new user entry; the scene stays as it is. */
export function duplicateArrangement(id: string): string | null {
  const source = getArrangementPresetById(id);
  if (!source) {return null;}

  const newId = `${USER_ARRANGEMENT_ID_PREFIX}${crypto.randomUUID()}`;
  const copy: ArrangementPreset = {
    ...cloneArrangementPreset(source),
    id: newId,
    name: `${source.name} copy`,
    source: 'user',
    description: undefined,
    createdAt: new Date().toISOString(),
  };
  store.setAppState({
    ...store.state,
    arrangements: [...store.state.arrangements, copy],
    activeArrangementId: newId,
  });
  store.emit();
  return newId;
}

/** Deletes a user arrangement; the scene assets stay as they are. */
export function removeArrangement(id: string): void {
  const preset = store.state.arrangements.find((entry) => entry.id === id);
  if (preset?.source !== 'user') {return;}

  store.setAppState({
    ...store.state,
    arrangements: store.state.arrangements.filter((entry) => entry.id !== id),
    activeArrangementId:
      store.state.activeArrangementId === id ? null : store.state.activeArrangementId,
  });
  store.emit();
}
