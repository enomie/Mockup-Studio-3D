import type { ImageAsset } from '@/data/image-assets';
import type { ArrangementPreset } from '@/scene/arrangement-types';
import type { ColorPreset } from '@/scene/color-types';
import type { EnvironmentPreset } from '@/scene/environment-preset-types';
import type { MaterialPreset } from '@/scene/entity-types';
import type { ProfileEntry } from '@/scene/profile-library';
import type { LightingPreset } from '@/scene/lighting-preset-types';
import type { SceneSessionState } from '@/scene/scene-api';
import type { SceneData, SceneEntry } from '@/scene/scene-document';
import { capturePerSceneSettings, PER_SCENE_SETTING_KEYS, type PerSceneSettings } from '@/ui/store/scene-settings';
import type { UserBakedAsset } from '@/scene/user-baked-asset';
import type { AppState } from '@/ui/store/app-store-internals';

/** Bump when the stored shape changes incompatibly; older snapshots are discarded. */
export const PROJECT_SCHEMA_VERSION = 2;

/** User image without its (session-only) object URL; the file data is stored separately. */
type PersistedImage = Omit<ImageAsset, 'url' | 'objectUrl'>;

/** Store fields restored as they are. */
const PERSISTED_SETTING_KEYS = [
  'viewportHelpers',
  'exportImageFormat',
  'exportGroundSurface',
  'exportSize',
] as const satisfies readonly (keyof AppState)[];

/** Store fields restored when present; older snapshots without them keep the defaults. */
const OPTIONAL_SETTING_KEYS = [
  'profileSnapGrid',
  'profileSnapPoints',
] as const satisfies readonly (keyof AppState)[];

type PersistedSettings = Pick<AppState, (typeof PERSISTED_SETTING_KEYS)[number]> &
  Partial<Pick<AppState, (typeof OPTIONAL_SETTING_KEYS)[number]>>;

interface PersistedLibraries {
  images: PersistedImage[];
  materials: MaterialPreset[];
  colors: ColorPreset[];
  environments: EnvironmentPreset[];
  lightingPresets: LightingPreset[];
  arrangements: ArrangementPreset[];
  userBakedAssets: UserBakedAsset[];
  /** Optional: snapshots saved before profiles existed have no entry. */
  profiles?: ProfileEntry[];
}

export interface ProjectSnapshot {
  schemaVersion: number;
  savedAt: string;
  settings: PersistedSettings;
  libraries: PersistedLibraries;
  /** Every scene with its data (the active one captured live). */
  scenes: (SceneEntry<PerSceneSettings> & { data: SceneData<PerSceneSettings> })[];
  activeSceneId: string;
}

interface SourcedEntry {
  id: string;
  source: string;
}

function onlyUser<T extends SourcedEntry>(entries: readonly T[]): T[] {
  return entries.filter((entry) => entry.source === 'user');
}

export function captureProjectSnapshot(
  state: AppState,
  activeSession: SceneSessionState,
  savedAt = new Date().toISOString(),
): ProjectSnapshot {
  const settings = {} as Record<string, unknown>;
  for (const key of [...PERSISTED_SETTING_KEYS, ...OPTIONAL_SETTING_KEYS]) {settings[key] = state[key];}

  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    savedAt,
    settings: settings as PersistedSettings,
    libraries: {
      images: onlyUser(state.images).map(({ url: _url, objectUrl: _objectUrl, ...image }) => image),
      // Built-in materials and colors are editable, so they are stored with their edits.
      materials: [...state.materials],
      colors: [...state.colors],
      environments: onlyUser(state.environments),
      lightingPresets: onlyUser(state.lightingPresets),
      arrangements: onlyUser(state.arrangements),
      userBakedAssets: [...state.userBakedAssets],
      profiles: [...state.userProfiles],
    },
    scenes: state.scenes.flatMap((entry) => {
      const data =
        entry.id === state.activeSceneId
          ? { session: activeSession, settings: capturePerSceneSettings(state) }
          : entry.data;
      return data ? [{ ...entry, data }] : [];
    }),
    activeSceneId: state.activeSceneId,
  };
}

/**
 * Merges a stored library with the built-ins of the running version: stored entries
 * win (in their order), built-ins the snapshot does not know yet are appended.
 */
export function mergeLibrary<T extends SourcedEntry>(
  builtins: readonly T[],
  stored: readonly T[],
): T[] {
  const storedIds = new Set(stored.map((entry) => entry.id));
  return [...stored, ...builtins.filter((entry) => !storedIds.has(entry.id))];
}

/** Built-ins first (always the current version), then the stored user entries. */
export function withUserEntries<T extends SourcedEntry>(
  builtins: readonly T[],
  storedUser: readonly T[],
): T[] {
  const builtinIds = new Set(builtins.map((entry) => entry.id));
  return [
    ...builtins,
    ...storedUser.filter((entry) => entry.source === 'user' && !builtinIds.has(entry.id)),
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidScene(value: unknown): boolean {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {return false;}
  const { data } = value;
  if (!isRecord(data) || !isRecord(data.settings) || !isRecord(data.session)) {return false;}
  const { session, settings } = data;
  if (!isRecord(settings) || !PER_SCENE_SETTING_KEYS.every((key) => key in settings)) {return false;}
  return (
    Array.isArray(session.entities) &&
    Array.isArray(session.patchNodes) &&
    Array.isArray(session.cameraSlots) &&
    session.cameraSlots.length === 3 &&
    isRecord(session.cameraView) &&
    typeof session.gravityScale === 'number'
  );
}

/** Returns the snapshot when it has the current schema and the expected shape, else null. */
export function parseProjectSnapshot(raw: unknown): ProjectSnapshot | null {
  if (!isRecord(raw) || raw.schemaVersion !== PROJECT_SCHEMA_VERSION) {return null;}
  const { settings, libraries, scenes, activeSceneId } = raw;
  if (!isRecord(settings) || !isRecord(libraries) || !Array.isArray(scenes)) {return null;}

  const libraryKeys: (keyof PersistedLibraries)[] = [
    'images', 'materials', 'colors', 'environments', 'lightingPresets', 'arrangements', 'userBakedAssets',
  ];
  if (!libraryKeys.every((key) => Array.isArray(libraries[key]))) {return null;}
  if (libraries.profiles !== undefined && !Array.isArray(libraries.profiles)) {return null;}
  if (!PERSISTED_SETTING_KEYS.every((key) => key in settings)) {return null;}
  if (scenes.length === 0 || !scenes.every(isValidScene)) {return null;}
  if (!scenes.some((entry) => isRecord(entry) && entry.id === activeSceneId)) {return null;}
  return raw as unknown as ProjectSnapshot;
}
