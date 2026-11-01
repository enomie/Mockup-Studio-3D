import type { HistorySettingsAdapter } from '@/engine/history/scene-history-controller';
import * as store from './app-store-internals';
import type { AppState } from './app-store-internals';

/** Store fields that undo/redo restores besides scene objects, grouped by UI label. */
const SETTINGS_GROUPS = {
  lighting: ['lighting', 'lightingPresets', 'activeLightingPresetId'],
  environment: [
    'skyEnabled', 'skyHorizonColor', 'skyZenithColor', 'skyGradientFade',
    'fogEnabled', 'fogColor', 'fogNear', 'fogFar',
    'reflectionEnabled', 'reflectionIntensity', 'reflectionSource',
    'environments', 'activeEnvironmentId',
  ],
  ground: ['ground'],
  arrangements: ['arrangements', 'activeArrangementId'],
  profiles: ['userProfiles'],
  materials: ['materials'],
  colors: ['colors'],
  images: ['images'],
} as const satisfies Record<string, readonly (keyof AppState)[]>;

type SettingsGroup = keyof typeof SETTINGS_GROUPS;
type SettingsKey = (typeof SETTINGS_GROUPS)[SettingsGroup][number];
export type HistorySettingsSnapshot = Pick<AppState, SettingsKey>;

const GROUPS = Object.keys(SETTINGS_GROUPS) as SettingsGroup[];

/** Structural equality; arrays of images compare by entry identity (their URLs can be huge). */
function valueEquals(key: SettingsKey, a: unknown, b: unknown): boolean {
  if (a === b) {return true;}
  if (key === 'images') {
    const left = a as AppState['images'];
    const right = b as AppState['images'];
    return left.length === right.length && left.every((image, i) => image === right[i]);
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

function changedGroups(a: HistorySettingsSnapshot, b: HistorySettingsSnapshot): SettingsGroup[] {
  return GROUPS.filter((group) =>
    SETTINGS_GROUPS[group].some((key) => !valueEquals(key, a[key], b[key])),
  );
}

export function captureHistorySettings(state: AppState = store.state): HistorySettingsSnapshot {
  const snapshot = {} as Record<SettingsKey, unknown>;
  for (const group of GROUPS) {
    for (const key of SETTINGS_GROUPS[group]) {snapshot[key] = state[key];}
  }
  return snapshot as HistorySettingsSnapshot;
}

export function describeHistorySettingsChange(
  before: HistorySettingsSnapshot,
  after: HistorySettingsSnapshot,
): string | null {
  const groups = changedGroups(before, after);
  if (groups.length === 0) {return null;}
  return groups.length === 1 ? `Edit ${groups[0]}` : `Edit ${groups.join(', ')}`;
}

/** Writes a snapshot back into the store and pushes the affected parts to the scene. */
function restoreHistorySettings(snapshot: HistorySettingsSnapshot): void {
  const previous = captureHistorySettings();
  const groups = changedGroups(previous, snapshot);
  store.setAppState({ ...store.state, ...snapshot });

  if (groups.includes('environment')) {store.syncEnvironmentToScene();}
  if (groups.includes('ground')) {store.syncGroundToScene();}
  if (groups.includes('lighting')) {store.syncLightingToScene();}
  if (groups.includes('materials')) {
    const before = new Map(previous.materials.map((m) => [m.id, m]));
    for (const material of snapshot.materials) {
      if (before.get(material.id) !== material) {store.scheduleMaterialInvalidation(material.id);}
    }
  }
  store.emit();
}

export const historySettingsAdapter: HistorySettingsAdapter = {
  capture: () => captureHistorySettings(),
  equals: (a, b) => changedGroups(a as HistorySettingsSnapshot, b as HistorySettingsSnapshot).length === 0,
  describe: (a, b) => describeHistorySettingsChange(a as HistorySettingsSnapshot, b as HistorySettingsSnapshot),
  restore: (snapshot) => { restoreHistorySettings(snapshot as HistorySettingsSnapshot); },
};
