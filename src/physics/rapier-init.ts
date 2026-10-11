import RAPIER from '@dimforge/rapier3d-simd-compat';

let initPromise: Promise<void> | null = null;

/** Ensures `RAPIER.init()` runs exactly once before the first world is created. */
export function ensureRapierInit(): Promise<void> {
  if (!initPromise) {
    initPromise = RAPIER.init();
  }
  return initPromise;
}
