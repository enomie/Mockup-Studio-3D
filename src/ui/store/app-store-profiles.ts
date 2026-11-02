import { getProfile, type ProfileEntry } from '@/scene/profile-library';
import type { ProfilePath, ProfileVec2 } from '@/scene/profile-model';
import {
  appendPenNode,
  finishPenPath,
  orientForDrawing,
  startPenPath,
  breakAtNode,
  breakAtSegment,
  joinEndpoints,
  type BreakResult,
  type PathPoint,
} from '@/scene/profile-edit';
import * as store from './app-store-internals';
import type { ProfileEditorTool, ProfileNodeSelection } from './app-store-internals';

const USER_PROFILE_ID_PREFIX = 'user-profile-';

export function selectProfile(profileId: string | null): void {
  const keepEditor = profileId !== null && profileId === store.state.editingProfileId;
  store.setAppState({
    ...store.state,
    selectedProfileId: profileId,
    editingProfileId: keepEditor ? store.state.editingProfileId : null,
    profileNodeSelection: keepEditor ? store.state.profileNodeSelection : null,
  });
  store.emit();
}

/** Opens a user profile in the 2D editor; built-ins are read-only. */
export function openProfileEditor(id: string): void {
  if (!store.state.userProfiles.some((entry) => entry.id === id)) {return;}
  store.setAppState({
    ...store.state,
    selectedProfileId: id,
    editingProfileId: id,
    profileNodeSelection: null,
    hiddenProfilePathIds: [],
    profileEditorTool: 'select',
    profilePenPathId: null,
  });
  store.emit();
}

export function closeProfileEditor(): void {
  if (store.state.editingProfileId === null) {return;}
  finishProfilePen();
  store.setAppState({ ...store.state, editingProfileId: null, profileNodeSelection: null });
  store.emit();
}

export function selectProfileNode(selection: ProfileNodeSelection | null): void {
  store.setAppState({ ...store.state, profileNodeSelection: selection, profileJoinTarget: null });
  store.emit();
}

/** Picks a second end point (Shift-click) to join with the selected one. */
export function setProfileJoinTarget(target: PathPoint | null): void {
  store.setAppState({ ...store.state, profileJoinTarget: target });
  store.emit();
}

function applyPathsResult(id: string, run: (paths: ProfilePath[]) => BreakResult | null): boolean {
  const profile = store.state.userProfiles.find((entry) => entry.id === id);
  if (!profile) {return false;}
  const result = run(profile.paths);
  if (!result) {return false;}
  editProfilePaths(id, () => result.paths);
  selectProfileNode(result.select);
  return true;
}

/** Scissors on a point: opens a closed path or splits an open one. */
export function breakProfileAtNode(id: string, pathId: string, index: number): boolean {
  return applyPathsResult(id, (paths) => breakAtNode(paths, pathId, index));
}

/** Scissors on a segment at parameter t. */
export function breakProfileAtSegment(id: string, pathId: string, segment: number, t: number): boolean {
  return applyPathsResult(id, (paths) => breakAtSegment(paths, pathId, segment, t));
}

/** Joins two open end points (or closes a path when they are its start and end). */
export function joinProfileEndpoints(id: string, a: PathPoint, b: PathPoint): boolean {
  return applyPathsResult(id, (paths) => joinEndpoints(paths, a, b));
}

/** Applies a pure edit to one path of a user profile. */
export function editProfilePath(
  id: string,
  pathId: string,
  edit: (path: ProfilePath) => ProfilePath,
): void {
  updateUserProfile(id, (profile) => ({
    ...profile,
    paths: profile.paths.map((path) => (path.id === pathId ? edit(path) : path)),
  }));
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
    editingProfileId: store.state.editingProfileId === id ? null : store.state.editingProfileId,
    profileNodeSelection:
      store.state.editingProfileId === id ? null : store.state.profileNodeSelection,
  });
  store.emit();
}

/** Shows the Profiles tab in the left panel. */
export function showProfilesPanel(): void {
  const seq = (store.state.leftPanelRequest?.seq ?? 0) + 1;
  store.setAppState({ ...store.state, leftPanelRequest: { id: 'profiles', seq } });
  store.emit();
}

/** Opens a user profile in the 2D editor and shows the Profiles tab. */
export function editProfileFromAsset(profileId: string): void {
  openProfileEditor(profileId);
  showProfilesPanel();
}

/** Applies a pure edit to all paths of a user profile (add, remove, reorder slots). */
export function editProfilePaths(
  id: string,
  edit: (paths: ProfilePath[]) => ProfilePath[] | null,
): void {
  updateUserProfile(id, (profile) => {
    const paths = edit(profile.paths);
    return paths ? { ...profile, paths } : profile;
  });
}

/** Makes a path active without selecting a point. */
export function selectProfilePath(pathId: string | null): void {
  selectProfileNode(pathId ? { pathId, index: null } : null);
}

export function toggleProfilePathHidden(pathId: string): void {
  const hidden = store.state.hiddenProfilePathIds;
  store.setAppState({
    ...store.state,
    hiddenProfilePathIds: hidden.includes(pathId)
      ? hidden.filter((id) => id !== pathId)
      : [...hidden, pathId],
  });
  store.emit();
}

export function setProfileEditorTool(tool: ProfileEditorTool): void {
  finishProfilePen();
  store.setAppState({ ...store.state, profileEditorTool: tool });
  store.emit();
}

/** Pen: starts a new path at `at`, or continues an open path from one of its end points. */
export function startProfilePen(id: string, at: ProfileVec2, continueFrom?: PathPoint): boolean {
  const profile = store.state.userProfiles.find((entry) => entry.id === id);
  if (!profile) {return false;}
  if (continueFrom) {
    editProfilePath(id, continueFrom.pathId, (path) => orientForDrawing(path, continueFrom.index));
    const path = store.state.userProfiles.find((entry) => entry.id === id)?.paths
      .find((entry) => entry.id === continueFrom.pathId);
    store.setAppState({
      ...store.state,
      profilePenPathId: continueFrom.pathId,
      profileNodeSelection: path ? { pathId: path.id, index: path.nodes.length - 1 } : null,
    });
    store.emit();
    return true;
  }
  const started = startPenPath(profile.paths, at);
  if (!started) {return false;}
  editProfilePaths(id, () => started.paths);
  store.setAppState({
    ...store.state,
    profilePenPathId: started.pathId,
    profileNodeSelection: { pathId: started.pathId, index: 0 },
    profileJoinTarget: null,
  });
  store.emit();
  return true;
}

/** Pen: adds a point at the end of the path being drawn; returns its index. */
export function appendProfilePenNode(id: string, at: ProfileVec2): number | null {
  const pathId = store.state.profilePenPathId;
  const path = store.state.userProfiles
    .find((entry) => entry.id === id)?.paths.find((entry) => entry.id === pathId);
  if (!pathId || !path) {return null;}
  const index = path.nodes.length;
  editProfilePath(id, pathId, (current) => appendPenNode(current, at));
  store.setAppState({ ...store.state, profileNodeSelection: { pathId, index } });
  store.emit();
  return index;
}

/** Pen: closes the path being drawn (click on its first point). */
export function closeProfilePen(id: string): void {
  const pathId = store.state.profilePenPathId;
  if (!pathId) {return;}
  editProfilePath(id, pathId, (path) => (path.nodes.length >= 3 ? { ...path, closed: true } : path));
  finishProfilePen();
}

/** Ends drawing; a path with a single point is removed. */
export function finishProfilePen(): void {
  const pathId = store.state.profilePenPathId;
  const id = store.state.editingProfileId;
  if (!pathId) {return;}
  if (id) {editProfilePaths(id, (paths) => finishPenPath(paths, pathId));}
  const stillThere = store.state.userProfiles.some(
    (entry) => entry.id === id && entry.paths.some((path) => path.id === pathId),
  );
  store.setAppState({
    ...store.state,
    profilePenPathId: null,
    profileNodeSelection: stillThere ? { pathId, index: null } : null,
  });
  store.emit();
}

export function setProfileSnap(kind: 'grid' | 'points', on: boolean): void {
  store.setAppState({
    ...store.state,
    ...(kind === 'grid' ? { profileSnapGrid: on } : { profileSnapPoints: on }),
  });
  store.emit();
}
