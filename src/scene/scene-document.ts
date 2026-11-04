import type { SceneSessionState } from '@/scene/scene-api';

/** Everything one scene owns: its objects and camera plus its look settings (light, sky, ground, …). */
export interface SceneData<TSettings> {
  session: SceneSessionState;
  settings: TSettings;
}

/**
 * One scene of the project. The active scene is edited live in the engine, so its `data`
 * is null until it is captured (on switching and on saving).
 */
export interface SceneEntry<TSettings> {
  id: string;
  name: string;
  createdAt: string;
  data: SceneData<TSettings> | null;
}

/** First free "Scene 2", "Scene 3", … for a name that is already taken. */
export function uniqueSceneName(
  base: string,
  scenes: readonly Pick<SceneEntry<unknown>, 'name'>[],
): string {
  const names = new Set(scenes.map((scene) => scene.name));
  if (!names.has(base)) {return base;}
  let index = 2;
  while (names.has(`${base} ${index}`)) {
    index += 1;
  }
  return `${base} ${index}`;
}

/** Scene list without `id`, plus the scene to open when the removed one was active (null: keep). */
export function removeSceneEntry<T extends Pick<SceneEntry<unknown>, 'id'>>(
  scenes: readonly T[],
  activeSceneId: string,
  removeId: string,
): { scenes: T[]; nextActiveId: string | null } | null {
  const index = scenes.findIndex((scene) => scene.id === removeId);
  if (index < 0 || scenes.length <= 1) {return null;}
  const remaining = scenes.filter((scene) => scene.id !== removeId);
  if (removeId !== activeSceneId) {return { scenes: remaining, nextActiveId: null };}
  const neighbour = remaining[Math.min(index, remaining.length - 1)];
  return { scenes: remaining, nextActiveId: neighbour.id };
}
