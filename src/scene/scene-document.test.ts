import { describe, expect, it } from 'vitest';
import { removeSceneEntry, uniqueSceneName } from './scene-document';

describe('uniqueSceneName', () => {
  it('keeps free names and numbers taken ones', () => {
    expect(uniqueSceneName('Scene', [])).toBe('Scene');
    expect(uniqueSceneName('Scene', [{ name: 'Scene' }])).toBe('Scene 2');
    expect(uniqueSceneName('Scene', [{ name: 'Scene' }, { name: 'Scene 2' }])).toBe('Scene 3');
  });
});

describe('removeSceneEntry', () => {
  const scenes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('keeps the active scene when another one is removed', () => {
    expect(removeSceneEntry(scenes, 'a', 'b')).toEqual({
      scenes: [{ id: 'a' }, { id: 'c' }],
      nextActiveId: null,
    });
  });

  it('opens the next scene, or the previous one at the end, when the active one is removed', () => {
    expect(removeSceneEntry(scenes, 'b', 'b')?.nextActiveId).toBe('c');
    expect(removeSceneEntry(scenes, 'c', 'c')?.nextActiveId).toBe('b');
  });

  it('never removes the last scene or an unknown one', () => {
    expect(removeSceneEntry([{ id: 'a' }], 'a', 'a')).toBeNull();
    expect(removeSceneEntry(scenes, 'a', 'x')).toBeNull();
  });
});
