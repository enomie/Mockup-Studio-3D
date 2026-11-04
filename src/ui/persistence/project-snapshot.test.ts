import { describe, expect, it } from 'vitest';
import type { SceneSessionState } from '@/scene/scene-api';
import { getAppState } from '@/ui/store/app-store-internals';
import {
  captureProjectSnapshot,
  mergeLibrary,
  parseProjectSnapshot,
  PROJECT_SCHEMA_VERSION,
  withUserEntries,
} from './project-snapshot';

const scene: SceneSessionState = {
  entities: [],
  patchNodes: [],
  cameraView: {
    projection: 'perspective',
    position: { x: 1, y: 1, z: 1 },
    target: { x: 0, y: 0, z: 0 },
    fov: 40,
    orthoZoom: 1,
  },
  cameraSlots: [null, null, null],
  gravityScale: 1,
};

describe('project snapshot', () => {
  it('round-trips through structured clone and parse', () => {
    const snapshot = captureProjectSnapshot(getAppState(), scene, '2026-01-01T00:00:00.000Z');
    const parsed = parseProjectSnapshot(structuredClone(snapshot));
    expect(parsed).toEqual(snapshot);
  });

  it('stores only user entries of read-only libraries and no image urls', () => {
    const state = getAppState();
    const snapshot = captureProjectSnapshot({
      ...state,
      images: [
        ...state.images,
        {
          id: 'user-1', name: 'a.png', url: 'blob:x', objectUrl: 'blob:x',
          width: 1, height: 1, orientation: 'square', source: 'user',
        },
      ],
    }, scene);
    expect(snapshot.libraries.environments).toEqual([]);
    expect(snapshot.libraries.arrangements).toEqual([]);
    expect(snapshot.libraries.images).toEqual([
      { id: 'user-1', name: 'a.png', width: 1, height: 1, orientation: 'square', source: 'user' },
    ]);
    expect(snapshot.libraries.materials.length).toBe(state.materials.length);
  });

  it('stores user profiles and accepts snapshots saved before profiles existed', () => {
    const state = getAppState();
    const profile = {
      id: 'user-profile-1',
      name: 'Logo',
      source: 'user' as const,
      paths: [{ id: 'p', name: 'Outline', slot: 0, closed: true, nodes: [{ x: 0, y: 0, mode: 'corner' as const }] }],
    };
    const snapshot = captureProjectSnapshot({ ...state, userProfiles: [profile] }, scene);
    expect(snapshot.libraries.profiles).toEqual([profile]);

    const { profiles: _profiles, ...legacyLibraries } = snapshot.libraries;
    expect(parseProjectSnapshot({ ...snapshot, libraries: legacyLibraries })).not.toBeNull();
  });

  it('rejects other schema versions and broken data', () => {
    const snapshot = captureProjectSnapshot(getAppState(), scene);
    expect(parseProjectSnapshot({ ...snapshot, schemaVersion: PROJECT_SCHEMA_VERSION + 1 })).toBeNull();
    const [first] = snapshot.scenes;
    const broken = { ...first, data: { ...first.data, session: { ...scene, entities: 'x' } } };
    expect(parseProjectSnapshot({ ...snapshot, scenes: [broken] })).toBeNull();
    expect(parseProjectSnapshot({ ...snapshot, activeSceneId: 'missing' })).toBeNull();
    expect(parseProjectSnapshot({ ...snapshot, scenes: [] })).toBeNull();
    expect(parseProjectSnapshot(undefined)).toBeNull();
  });
});

describe('scenes in the snapshot', () => {
  it('stores every scene; the active one comes live, the others as stored', () => {
    const state = getAppState();
    const stored = captureProjectSnapshot(state, scene).scenes[0].data;
    const otherSession = { ...scene, gravityScale: 2 };
    const snapshot = captureProjectSnapshot({
      ...state,
      scenes: [
        { ...state.scenes[0], data: null },
        { id: 'scene-b', name: 'B', createdAt: '2026-01-01T00:00:00.000Z', data: { ...stored, session: otherSession } },
      ],
    }, scene);
    expect(snapshot.scenes.map((entry) => entry.name)).toEqual(['Scene', 'B']);
    expect(snapshot.scenes[0].data.session).toEqual(scene);
    expect(snapshot.scenes[1].data.session.gravityScale).toBe(2);
    expect(snapshot.activeSceneId).toBe(state.activeSceneId);
    expect(parseProjectSnapshot(structuredClone(snapshot))).toEqual(snapshot);
  });
});

describe('library merge', () => {
  const builtinA = { id: 'a', source: 'builtin', name: 'A new' };
  const builtinB = { id: 'b', source: 'builtin', name: 'B' };

  it('keeps stored entries and appends new built-ins', () => {
    const stored = [{ id: 'a', source: 'builtin', name: 'A edited' }, { id: 'u', source: 'user', name: 'U' }];
    expect(mergeLibrary([builtinA, builtinB], stored).map((entry) => entry.name))
      .toEqual(['A edited', 'U', 'B']);
  });

  it('takes built-ins from code and adds stored user entries', () => {
    const stored = [{ id: 'a', source: 'builtin', name: 'A old' }, { id: 'u', source: 'user', name: 'U' }];
    expect(withUserEntries([builtinA, builtinB], stored).map((entry) => entry.name))
      .toEqual(['A new', 'B', 'U']);
  });
});

describe('optional editor settings', () => {
  it('saves snapping and still accepts snapshots saved before it existed', () => {
    const snapshot = captureProjectSnapshot({ ...getAppState(), profileSnapGrid: false }, scene);
    expect(snapshot.settings.profileSnapGrid).toBe(false);
    const { profileSnapGrid: _grid, profileSnapPoints: _points, ...legacy } = snapshot.settings;
    expect(parseProjectSnapshot({ ...snapshot, settings: legacy })).not.toBeNull();
  });
});
