import { describe, expect, it } from 'vitest';
import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import { cloneEnvironmentSnapshot } from '@/scene/environment-preset-types';
import { MATERIAL_PAPER_ID } from '@/scene/material-ids';
import {
  BUILTIN_ENV_DEFAULT_ID,
  ENVIRONMENT_PRESETS,
  environmentFromSceneDefaults,
} from './builtin-environments';

describe('builtin environments', () => {
  it('default is a neutral studio with studio reflections and no fog', () => {
    const snapshot = environmentFromSceneDefaults();
    expect(snapshot.environment.reflectionSource).toBe('studio');
    expect(snapshot.environment.fogEnabled).toBe(false);
    expect(snapshot.ground.materialId).toBe(MATERIAL_PAPER_ID);
    expect(SCENE_DEFAULTS.environment.reflectionSource).toBe('studio');
    expect(ENVIRONMENT_PRESETS[0].id).toBe(BUILTIN_ENV_DEFAULT_ID);
  });

  it('carries no lighting', () => {
    for (const preset of ENVIRONMENT_PRESETS) {
      expect(Object.keys(preset.snapshot).sort()).toEqual(['environment', 'ground']);
    }
  });

  it('keeps the reflection source when cloning', () => {
    const snapshot = environmentFromSceneDefaults();
    const sky = cloneEnvironmentSnapshot({
      ...snapshot,
      environment: { ...snapshot.environment, reflectionSource: 'sky' },
    });
    expect(sky.environment.reflectionSource).toBe('sky');
  });
});
