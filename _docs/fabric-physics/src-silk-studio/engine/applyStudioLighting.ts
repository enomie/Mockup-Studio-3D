import { DirectionalLight } from 'three';
import type { StudioLightingState, Vec3 } from '../config/studioLighting.ts';
import {
  STUDIO_LIGHT_TARGET,
  shadowBlurSamples,
} from '../config/studioLighting.ts';
import type { StudioRenderer } from './createRenderer.ts';
import type { StudioSceneObjects } from '../scene/studioScene.ts';
import { applyEnvironmentToScene } from '../scene/studioEnvironment.ts';

function applyDirectionalAim(light: DirectionalLight, position: Vec3): void {
  light.position.set(position.x, position.y, position.z);
  light.target.position.set(
    STUDIO_LIGHT_TARGET.x,
    STUDIO_LIGHT_TARGET.y,
    STUDIO_LIGHT_TARGET.z,
  );
  light.target.updateMatrixWorld();
}

function applyShadowBlur(light: DirectionalLight, blur: number): void {
  light.shadow.radius = blur;
  light.shadow.blurSamples = shadowBlurSamples(blur);
  light.shadow.needsUpdate = true;
}

export function applyStudioLighting(
  bundle: StudioSceneObjects,
  renderer: StudioRenderer,
  lighting: StudioLightingState,
): void {
  const { ambientLight, mainLight, fillLight, topLight, scene, environmentHandle } =
    bundle;

  ambientLight.color.set(lighting.ambient.color);
  ambientLight.intensity = lighting.ambient.intensity;

  mainLight.color.set(lighting.key.color);
  mainLight.intensity = lighting.key.intensity;
  applyDirectionalAim(mainLight, lighting.key.position);
  applyShadowBlur(mainLight, lighting.key.shadowBlur);

  fillLight.color.set(lighting.fill.color);
  fillLight.intensity = lighting.fill.intensity;
  applyDirectionalAim(fillLight, lighting.fill.position);
  applyShadowBlur(fillLight, lighting.fill.shadowBlur);

  topLight.color.set(lighting.top.color);
  topLight.intensity = lighting.top.intensity;
  applyDirectionalAim(topLight, lighting.top.position);

  applyEnvironmentToScene(scene, renderer, lighting.environment, environmentHandle);
}
