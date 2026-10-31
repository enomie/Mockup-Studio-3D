import { Group, Scene } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import { EntityRegistry } from '@/engine/entity-registry';
import { cloneLightingSettings } from '@/scene/lighting-preset-types';
import { defaultTransform } from '@/scene/entity-types';
import { LIGHT_FILL_ID, LIGHT_KEY_ID } from '@/scene/light-ids';
import { LightingSystem } from './lighting-system';

describe('LightingSystem studio anchor', () => {
  it('keeps light positions fixed when scene entities move', () => {
    const registry = new EntityRegistry();
    registry.addEntity('block-1', 'block', new Group(), defaultTransform());
    const lighting = new LightingSystem(
      new Scene(),
      registry,
      cloneLightingSettings(SCENE_DEFAULTS.lighting),
    );
    const keyBefore = lighting.getRigWorldPosition(LIGHT_KEY_ID);
    const fillBefore = lighting.getRigWorldPosition(LIGHT_FILL_ID);

    registry.updateTransform('block-1', { position: { x: 3, y: 0, z: -2 } });
    lighting.updateFrame();

    expect(lighting.getRigWorldPosition(LIGHT_KEY_ID)).toEqual(keyBefore);
    expect(lighting.getRigWorldPosition(LIGHT_FILL_ID)).toEqual(fillBefore);
  });
});
