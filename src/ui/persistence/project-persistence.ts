import { ARRANGEMENT_PRESETS } from '@/data/builtin-arrangements';
import { cloneColorPreset, COLOR_PRESETS } from '@/data/color-presets';
import { cloneEnvironmentPreset, ENVIRONMENT_PRESETS } from '@/data/builtin-environments';
import { cloneLightingPreset, LIGHTING_PRESETS } from '@/data/builtin-light-rigs';
import { STARTER_IMAGES, type ImageAsset } from '@/data/image-assets';
import { cloneMaterialPreset, MATERIAL_PRESETS } from '@/data/material-presets';
import { cloneArrangementPreset } from '@/scene/arrangement-types';
import type { SceneApi, SceneSessionState } from '@/scene/scene-api';
import * as store from '@/ui/store/app-store-internals';
import { getImageBlob, registerImageBlob } from './image-blob-registry';
import {
  clearProjectDb,
  isProjectDbAvailable,
  listImageBlobIds,
  readImageBlobs,
  readProjectRecord,
  writeProject,
} from './project-db';
import {
  captureProjectSnapshot,
  mergeLibrary,
  parseProjectSnapshot,
  withUserEntries,
  type ProjectSnapshot,
} from './project-snapshot';

/** Quiet time after the last change before the project is written. */
const SAVE_DEBOUNCE_MS = 500;

let pendingSession: SceneSessionState | null = null;
let storedImageIds = new Set<string>();
let autosaveUnsubscribe: (() => void) | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saveChain: Promise<void> = Promise.resolve();
let resetting = false;

function restoreImages(snapshot: ProjectSnapshot, blobs: ReadonlyMap<string, Blob>): ImageAsset[] {
  const images: ImageAsset[] = [];
  for (const image of snapshot.libraries.images) {
    const blob = blobs.get(image.id);
    if (!blob) {continue;}
    const objectUrl = URL.createObjectURL(blob);
    registerImageBlob(image.id, blob);
    images.push({ ...image, url: objectUrl, objectUrl });
  }
  return images;
}

function applySnapshotToStore(snapshot: ProjectSnapshot, userImages: ImageAsset[]): void {
  const { settings, libraries, scene } = snapshot;
  const { state } = store;
  store.setAppState({
    ...state,
    ...settings,
    images: [...STARTER_IMAGES, ...userImages],
    materials: mergeLibrary(MATERIAL_PRESETS.map(cloneMaterialPreset), libraries.materials),
    colors: mergeLibrary(COLOR_PRESETS.map(cloneColorPreset), libraries.colors),
    environments: withUserEntries(
      ENVIRONMENT_PRESETS.map(cloneEnvironmentPreset),
      libraries.environments,
    ),
    lightingPresets: withUserEntries(
      LIGHTING_PRESETS.map(cloneLightingPreset),
      libraries.lightingPresets,
    ),
    arrangements: withUserEntries(
      ARRANGEMENT_PRESETS.map(cloneArrangementPreset),
      libraries.arrangements,
    ),
    userBakedAssets: libraries.userBakedAssets,
    userProfiles: (libraries.profiles ?? []).filter((entry) => entry.source === 'user'),
    physics: { ...state.physics, gravityScale: scene.gravityScale },
    camera: { ...state.camera, slots: scene.cameraSlots },
  });
}

/** Loads the saved project into the store; the scene part waits for the engine. */
export async function loadPersistedProject(): Promise<void> {
  if (!isProjectDbAvailable()) {return;}
  try {
    const snapshot = parseProjectSnapshot(await readProjectRecord());
    storedImageIds = new Set(await listImageBlobIds());
    if (!snapshot) {return;}
    const blobs = await readImageBlobs(snapshot.libraries.images.map((image) => image.id));
    applySnapshotToStore(snapshot, restoreImages(snapshot, blobs));
    pendingSession = snapshot.scene;
    store.emit();
  } catch (error) {
    console.warn('Could not load the saved project; starting fresh.', error);
  }
}

function captureSession(api: SceneApi): SceneSessionState {
  return {
    entities: api.getEntities(),
    patchNodes: api.getPatchNodes(),
    cameraView: api.getCameraViewState(),
    cameraSlots: api.getCameraSettings().slots,
    gravityScale: store.state.physics.gravityScale,
  };
}

async function saveNow(): Promise<void> {
  const api = store.sceneApi;
  if (!api || resetting) {return;}
  const snapshot = captureProjectSnapshot(store.state, captureSession(api));

  const usedImageIds = new Set(snapshot.libraries.images.map((image) => image.id));
  const addImages = new Map<string, Blob>();
  for (const id of usedImageIds) {
    const blob = getImageBlob(id);
    if (blob && !storedImageIds.has(id)) {addImages.set(id, blob);}
  }
  const deleteImageIds = [...storedImageIds].filter((id) => !usedImageIds.has(id));

  await writeProject(snapshot, addImages, deleteImageIds);
  for (const id of addImages.keys()) {storedImageIds.add(id);}
  for (const id of deleteImageIds) {storedImageIds.delete(id);}
}

function queueSave(): void {
  saveChain = saveChain
    .then(saveNow)
    .catch((error: unknown) => { console.warn('Could not save the project.', error); });
}

function scheduleSave(): void {
  if (saveTimer) {clearTimeout(saveTimer);}
  saveTimer = setTimeout(() => {
    saveTimer = null;
    queueSave();
  }, SAVE_DEBOUNCE_MS);
}

function flushPendingSave(): void {
  if (!saveTimer) {return;}
  clearTimeout(saveTimer);
  saveTimer = null;
  queueSave();
}

function onPageHide(): void {
  // Camera orbiting does not always reach the store; save the latest view on leave.
  if (saveTimer === null) {queueSave();} else {flushPendingSave();}
}

function startAutosave(): void {
  if (autosaveUnsubscribe || resetting) {return;}
  const unsubscribe = store.subscribe(scheduleSave);
  window.addEventListener('pagehide', onPageHide);
  autosaveUnsubscribe = () => {
    unsubscribe();
    window.removeEventListener('pagehide', onPageHide);
  };
}

function stopAutosave(): void {
  autosaveUnsubscribe?.();
  autosaveUnsubscribe = null;
  if (saveTimer) {clearTimeout(saveTimer);}
  saveTimer = null;
}

/** Called once the engine is connected: restores the saved scene, then starts autosave. */
export function onSceneApiConnected(api: SceneApi): void {
  if (!isProjectDbAvailable()) {return;}
  const session = pendingSession;
  if (!session) {
    startAutosave();
    return;
  }
  api.restoreSession(session)
    .then(() => {
      if (store.sceneApi !== api) {return;}
      pendingSession = null;
      startAutosave();
    })
    .catch((error: unknown) => {
      console.warn('Could not restore the saved scene.', error);
      pendingSession = null;
      startAutosave();
    });
}

export function onSceneApiDisconnected(): void {
  flushPendingSave();
  stopAutosave();
}

/** Deletes everything saved in this browser and restarts the app in its default state. */
export async function resetProject(): Promise<void> {
  resetting = true;
  stopAutosave();
  await saveChain;
  if (isProjectDbAvailable()) {await clearProjectDb();}
  window.location.reload();
}
