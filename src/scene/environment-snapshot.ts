import type { EnvironmentSnapshot } from './environment-preset-types';
import type { SceneApi } from './scene-api';

/** Applies sky, reflections, fog and ground; never touches the lights. */
export function applyEnvironmentSnapshot(
  api: SceneApi,
  snapshot: EnvironmentSnapshot,
): void {
  api.applyEnvironment(snapshot.environment);
  api.applyGround(snapshot.ground);
}
