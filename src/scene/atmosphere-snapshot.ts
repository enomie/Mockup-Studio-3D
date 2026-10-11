import type { AtmosphereSnapshot } from './environment-preset-types';
import type { SceneApi } from './scene-api';

export function applyAtmosphereSnapshot(
  api: SceneApi,
  snapshot: AtmosphereSnapshot,
): void {
  api.applyEnvironment(snapshot.environment);
  api.applyGround(snapshot.ground);
  api.applyLighting(snapshot.lighting);
}
