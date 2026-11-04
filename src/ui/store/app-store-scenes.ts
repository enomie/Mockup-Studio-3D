import type { SceneApi, SceneSessionState } from '@/scene/scene-api';
import {
  removeSceneEntry,
  uniqueSceneName,
  type SceneData,
  type SceneEntry,
} from '@/scene/scene-document';
import * as store from './app-store-internals';
import { capturePerSceneSettings, type PerSceneSettings } from './scene-settings';

type SceneSlot = SceneEntry<PerSceneSettings>;

const SCENE_ID_PREFIX = 'scene-';

export function captureSceneSession(api: SceneApi): SceneSessionState {
  return {
    entities: api.getEntities(),
    patchNodes: api.getPatchNodes(),
    cameraView: api.getCameraViewState(),
    cameraSlots: api.getCameraSettings().slots,
    gravityScale: store.state.physics.gravityScale,
  };
}

function captureActiveData(api: SceneApi): SceneData<PerSceneSettings> {
  return {
    session: captureSceneSession(api),
    settings: capturePerSceneSettings(store.state),
  };
}

/** Scene list with the live state of the active scene written back into its entry. */
function scenesWithActiveCaptured(api: SceneApi): SceneSlot[] {
  const data = captureActiveData(api);
  return store.state.scenes.map((entry) =>
    entry.id === store.state.activeSceneId ? { ...entry, data } : entry,
  );
}

/**
 * Makes `targetId` the active scene: stores the live scene back, then loads the target.
 * The undo history starts empty for the loaded scene.
 */
async function activateScene(
  api: SceneApi,
  scenes: SceneSlot[],
  targetId: string,
): Promise<void> {
  const target = scenes.find((entry) => entry.id === targetId);
  if (!target?.data) {return;}
  const { data } = target;

  store.setSceneSwitchInFlight(true);
  try {
    store.setAppState({
      ...store.state,
      ...data.settings,
      scenes: scenes.map((entry) => (entry.id === targetId ? { ...entry, data: null } : entry)),
      activeSceneId: targetId,
    });
    store.syncEnvironmentToScene();
    store.syncGroundToScene();
    store.syncLightingToScene();
    await api.restoreSession(data.session);
  } finally {
    store.setSceneSwitchInFlight(false);
    store.emit();
  }
}

export async function switchScene(id: string): Promise<void> {
  const api = store.sceneApi;
  if (!api || store.sceneSwitchInFlight || id === store.state.activeSceneId) {return;}
  if (!store.state.scenes.some((entry) => entry.id === id)) {return;}
  await activateScene(api, scenesWithActiveCaptured(api), id);
}

/**
 * Adds a copy of the current scene and opens it; returns its id.
 * `name` defaults to "<current name> copy".
 */
export async function addScene(name?: string): Promise<string | null> {
  const api = store.sceneApi;
  if (!api || store.sceneSwitchInFlight) {return null;}
  const scenes = scenesWithActiveCaptured(api);
  const current = scenes.find((entry) => entry.id === store.state.activeSceneId);
  if (!current?.data) {return null;}

  const id = `${SCENE_ID_PREFIX}${crypto.randomUUID()}`;
  const copy: SceneSlot = {
    id,
    name: uniqueSceneName(name ?? `${current.name} copy`, scenes),
    createdAt: new Date().toISOString(),
    data: structuredClone(current.data),
  };
  await activateScene(api, [...scenes, copy], id);
  return id;
}

export function renameScene(id: string, name: string): void {
  const trimmed = name.trim();
  if (trimmed === '' || !store.state.scenes.some((entry) => entry.id === id)) {return;}
  store.setAppState({
    ...store.state,
    scenes: store.state.scenes.map((entry) => (entry.id === id ? { ...entry, name: trimmed } : entry)),
  });
  store.emit();
}

/** Removes a scene; the last one cannot be removed. Removing the active scene opens its neighbour. */
export async function removeScene(id: string): Promise<void> {
  const api = store.sceneApi;
  if (!api || store.sceneSwitchInFlight) {return;}
  const result = removeSceneEntry(store.state.scenes, store.state.activeSceneId, id);
  if (!result) {return;}

  if (result.nextActiveId === null) {
    store.setAppState({ ...store.state, scenes: result.scenes });
    store.emit();
    return;
  }
  // The removed scene is not stored back; only the neighbour is loaded.
  await activateScene(api, result.scenes, result.nextActiveId);
}
