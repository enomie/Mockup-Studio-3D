import { beforeEach, describe, expect, it } from 'vitest';
import { BUILTIN_PROFILES } from '@/scene/profile-library';
import {
  addProfile,
  duplicateProfile,
  getAppState,
  removeProfile,
  renameProfile,
  renameProfilePath,
} from './app-store';
import * as store from './app-store-internals';

describe('profile store', () => {
  beforeEach(() => {
    store.setAppState({ ...store.state, userProfiles: [], selectedProfileId: null });
  });

  it('duplicates a built-in into an independent user profile', () => {
    const source = BUILTIN_PROFILES[0];
    const id = duplicateProfile(source.id);
    const state = getAppState();
    const copy = state.userProfiles.find((entry) => entry.id === id);
    expect(copy?.name).toBe(`${source.name} copy`);
    expect(copy?.source).toBe('user');
    expect(copy?.file).toBeUndefined();
    expect(state.selectedProfileId).toBe(id);

    renameProfilePath(id ?? '', copy?.paths[0].id ?? '', 'Bottle glass');
    expect(getAppState().userProfiles[0].paths[0].name).toBe('Bottle glass');
    expect(source.paths[0].name).toBe('Glass');
  });

  it('adds, renames and removes user profiles', () => {
    const id = addProfile();
    expect(getAppState().userProfiles[0].name).toBe('New profile');
    expect(addProfile()).not.toBe(id);
    expect(getAppState().userProfiles[1].name).toBe('New profile 2');

    renameProfile(id, 'Logo');
    expect(getAppState().userProfiles[0].name).toBe('Logo');

    removeProfile(id);
    expect(getAppState().userProfiles.map((entry) => entry.id)).not.toContain(id);
  });

  it('never removes or renames built-ins', () => {
    const builtin = BUILTIN_PROFILES[0];
    removeProfile(builtin.id);
    renameProfile(builtin.id, 'Changed');
    expect(builtin.name).not.toBe('Changed');
    expect(getAppState().userProfiles).toHaveLength(0);
  });
});
