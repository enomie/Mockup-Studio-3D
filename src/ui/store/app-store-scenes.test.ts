import { describe, expect, it, vi } from 'vitest';
import type { SceneApi, SceneSessionState } from '@/scene/scene-api';
import * as store from './app-store-internals';
import { addScene, removeScene, renameScene, switchScene } from './app-store-scenes';

function session(gravityScale: number): SceneSessionState {
  return {
    entities: [],
    patchNodes: [],
    cameraView: {
      projection: 'perspective',
      position: { x: 0, y: 1, z: 2 },
      target: { x: 0, y: 0, z: 0 },
      fov: 40,
      orthoZoom: 1,
    },
    cameraSlots: [null, null, null],
    gravityScale,
  };
}

/** Minimal engine stand-in: remembers the restored session so switches can be observed. */
function fakeApi() {
  let current = session(1);
  // The real engine reports gravity back into the store; mirror that here.
  const setGravity = (gravityScale: number) => {
    store.setAppState({ ...store.state, physics: { ...store.state.physics, gravityScale } });
  };
  const restoreSession = vi.fn((next: SceneSessionState) => {
    current = next;
    setGravity(next.gravityScale);
    return Promise.resolve();
  });
  const api = {
    getEntities: () => current.entities,
    getPatchNodes: () => current.patchNodes,
    getCameraViewState: () => current.cameraView,
    getCameraSettings: () => ({ slots: current.cameraSlots }),
    restoreSession,
    applyEnvironment: vi.fn(),
    applyGround: vi.fn(),
    applyLighting: vi.fn(),
  } as unknown as SceneApi;
  return {
    api,
    restoreSession,
    edit: (gravityScale: number) => { current = session(gravityScale); setGravity(gravityScale); },
    current: () => current,
  };
}

describe('scenes', () => {
  it('copies the current scene, keeps edits per scene and restores them on switching', async () => {
    const fake = fakeApi();
    store.setSceneApiRef(fake.api);
    const firstId = store.state.activeSceneId;
    store.setAppState({ ...store.state, activeEnvironmentId: 'env-first' });
    fake.edit(3);

    const secondId = await addScene();
    expect(secondId).not.toBeNull();
    expect(store.state.activeSceneId).toBe(secondId);
    expect(store.state.scenes.map((entry) => entry.name)).toEqual(['Scene', 'Scene copy']);
    expect(fake.current().gravityScale).toBe(3);
    expect(store.state.activeEnvironmentId).toBe('env-first');

    store.setAppState({ ...store.state, activeEnvironmentId: 'env-second' });
    fake.edit(5);

    await switchScene(firstId);
    expect(fake.current().gravityScale).toBe(3);
    expect(store.state.activeEnvironmentId).toBe('env-first');

    await switchScene(secondId!);
    expect(fake.current().gravityScale).toBe(5);
    expect(store.state.activeEnvironmentId).toBe('env-second');
    expect(store.sceneSwitchInFlight).toBe(false);
  });

  it('renames scenes and removes them, opening the neighbour when the active one goes', async () => {
    const fake = fakeApi();
    store.setSceneApiRef(fake.api);
    const [first, second] = store.state.scenes;
    renameScene(first.id, '  Studio ');
    expect(store.state.scenes[0].name).toBe('Studio');
    renameScene(first.id, '   ');
    expect(store.state.scenes[0].name).toBe('Studio');

    await removeScene(second.id);
    expect(store.state.scenes.map((entry) => entry.id)).toEqual([first.id]);
    await removeScene(first.id);
    expect(store.state.scenes).toHaveLength(1);
  });
});
