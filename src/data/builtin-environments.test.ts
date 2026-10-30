import { describe, expect, it } from 'vitest';
import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import { cloneAtmosphereSnapshot } from '@/scene/environment-preset-types';
import { atmosphereFromSceneDefaults } from './builtin-environments';

describe('reflection source', () => {
  it('defaults to studio reflections', () => {
    expect(SCENE_DEFAULTS.environment.reflectionSource).toBe('studio');
    expect(atmosphereFromSceneDefaults().environment.reflectionSource).toBe('studio');
  });

  it('survives cloning presets', () => {
    const snapshot = atmosphereFromSceneDefaults();
    const sky = cloneAtmosphereSnapshot({
      ...snapshot,
      environment: { ...snapshot.environment, reflectionSource: 'sky' },
    });
    expect(sky.environment.reflectionSource).toBe('sky');
  });
});
