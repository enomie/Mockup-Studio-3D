import { getProfile, type ProfileEntry } from '@/scene/profile-library';
import type { ProfilePath } from '@/scene/profile-model';
import * as store from './app-store-internals';

const USER_PROFILE_ID_PREFIX = 'user-profile-';

export function selectProfile(profileId: string | null): void {
  store.setAppState({ ...store.state, selectedProfileId: profileId });
  store.emit();
}

function newUserProfileId(): string {
  return `${USER_PROFILE_ID_PREFIX}${crypto.randomUUID()}`;
}

function nextName(base: string): string {
  const names = new Set(store.state.userProfiles.map((entry) => entry.name));
  if (!names.has(base)) {return base;}
  let index = 2;
  while (names.has(`${base} ${index}`)) {
    index += 1;
  }
  return `${base} ${index}`;
}

function clonePaths(paths: readonly ProfilePath[]): ProfilePath[] {
  return structuredClone(paths) as ProfilePath[];
}

function addUserProfile(profile: ProfileEntry): string {
  store.setAppState({
    ...store.state,
    userProfiles: [...store.state.userProfiles, profile],
    selectedProfileId: profile.id,
  });
  store.emit();
  return profile.id;
}

/** Default shape for a new profile: one closed 50 × 50 mm square. */
function defaultPaths(): ProfilePath[] {
  return [
    {
      id: 'path-1',
      name: 'Path 1',
      slot: 0,
      closed: true,
      nodes: [
        { x: 0, y: 0, mode: 'corner' },
        { x: 50, y: 0, mode: 'corner' },
        { x: 50, y: 50, mode: 'corner' },
        { x: 0, y: 50, mode: 'corner' },
      ],
    },
  ];
}

export function addProfile(): string {
  return addUserProfile({
    id: newUserProfileId(),
    name: nextName('New profile'),
    source: 'user',
    paths: defaultPaths(),
  });
}

/** Copies any profile (built-in or user) into a new, editable user profile. */
export function duplicateProfile(id: string): string | null {
  const source = getProfile(id, store.state.userProfiles);
  if (!source) {return null;}
  return addUserProfile({
    id: newUserProfileId(),
    name: nextName(`${source.name} copy`),
    source: 'user',
    paths: clonePaths(source.paths),
  });
}

function updateUserProfile(id: string, update: (profile: ProfileEntry) => ProfileEntry): void {
  const index = store.state.userProfiles.findIndex((entry) => entry.id === id);
  if (index < 0) {return;}
  const userProfiles = [...store.state.userProfiles];
  userProfiles[index] = update(userProfiles[index]);
  store.setAppState({ ...store.state, userProfiles });
  store.emit();
}

export function renameProfile(id: string, name: string): void {
  updateUserProfile(id, (profile) => ({ ...profile, name }));
}

export function renameProfilePath(id: string, pathId: string, name: string): void {
  updateUserProfile(id, (profile) => ({
    ...profile,
    paths: profile.paths.map((path) => (path.id === pathId ? { ...path, name } : path)),
  }));
}

/** Deletes a user profile; built-ins cannot be removed. */
export function removeProfile(id: string): void {
  if (!store.state.userProfiles.some((entry) => entry.id === id)) {return;}
  store.setAppState({
    ...store.state,
    userProfiles: store.state.userProfiles.filter((entry) => entry.id !== id),
    selectedProfileId:
      store.state.selectedProfileId === id ? null : store.state.selectedProfileId,
  });
  store.emit();
}
