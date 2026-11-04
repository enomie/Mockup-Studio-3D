import {
  copyProfileSelection,
  cutProfileSelection,
  pasteProfileFragments,
  type ProfileClipboardFragment,
} from '@/scene/profile-clipboard';
import * as store from './app-store-internals';
import {
  editProfilePaths,
  getProfileSelectedNodes,
  selectProfileNode,
  selectProfileNodes,
  setProfileEditorTool,
} from './app-store-profiles';

/** Shift per paste in the 2D editor (mm); repeated pastes step further. */
export const PROFILE_PASTE_OFFSET_MM = 5;

/** Clipboard of the 2D profile editor (separate from the 3D scene clipboard; not persisted). */
let fragments: readonly ProfileClipboardFragment[] = [];
let pasteCount = 0;

/** Test helper. */
export function clearProfileClipboard(): void {
  fragments = [];
  pasteCount = 0;
}

function editingPaths() {
  const id = store.state.editingProfileId;
  const profile = id ? store.state.userProfiles.find((entry) => entry.id === id) : undefined;
  return profile ? { id: profile.id, paths: profile.paths } : null;
}

function pathOnlyId(): string | null {
  const current = store.state.profileNodeSelection;
  return current?.index === null ? current.pathId : null;
}

export function copyProfileNodes(): boolean {
  const editing = editingPaths();
  if (!editing) {return false;}
  const copied = copyProfileSelection(editing.paths, getProfileSelectedNodes(), pathOnlyId());
  if (copied.length === 0) {return false;}
  fragments = copied;
  pasteCount = 0;
  return true;
}

export function cutProfileNodes(): boolean {
  const editing = editingPaths();
  if (!editing || !copyProfileNodes()) {return false;}
  const nodes = getProfileSelectedNodes();
  const pathId = pathOnlyId();
  pasteCount = -1;
  editProfilePaths(editing.id, (paths) => cutProfileSelection(paths, nodes, pathId));
  selectProfileNode(null);
  return true;
}

function insertFragments(source: readonly ProfileClipboardFragment[], step: number): boolean {
  const editing = editingPaths();
  if (!editing || source.length === 0) {return false;}
  const offset = { x: step * PROFILE_PASTE_OFFSET_MM, y: step * PROFILE_PASTE_OFFSET_MM };
  const result = pasteProfileFragments(editing.paths, source, offset);
  if (result.pasted.length === 0) {return false;}
  editProfilePaths(editing.id, () => result.paths);
  setProfileEditorTool('select');
  selectProfileNodes(result.pasted);
  return true;
}

/** Ctrl/Cmd+V shifted (select tool active, pasted nodes selected); `inPlace` for Shift. */
export function pasteProfileNodes(options: { inPlace?: boolean } = {}): boolean {
  let step = 0;
  if (!options.inPlace) {
    pasteCount += 1;
    step = Math.max(pasteCount, 0);
  }
  return insertFragments(fragments, step);
}

/** Ctrl/Cmd+D: duplicates the selection shifted, clipboard untouched. */
export function duplicateProfileNodes(): boolean {
  const editing = editingPaths();
  if (!editing) {return false;}
  return insertFragments(copyProfileSelection(editing.paths, getProfileSelectedNodes(), pathOnlyId()), 1);
}
