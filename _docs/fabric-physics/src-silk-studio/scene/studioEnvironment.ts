import {
  CanvasTexture,
  Color,
  EquirectangularReflectionMapping,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Texture,
  WebGLRenderer,
} from 'three';
import type { EnvironmentLighting } from '../config/studioLighting.ts';
import { environmentGradientKey } from '../config/studioLighting.ts';
import type { StudioRenderer } from '../engine/createRenderer.ts';

export interface EnvironmentHandle {
  gradientKey: string;
  sourceTexture: Texture | null;
  envMapTexture: Texture | null;
}

export function createEmptyEnvironmentHandle(): EnvironmentHandle {
  return { gradientKey: '', sourceTexture: null, envMapTexture: null };
}

export function disposeEnvironmentHandle(handle: EnvironmentHandle): void {
  handle.sourceTexture?.dispose();
  if (handle.envMapTexture && handle.envMapTexture !== handle.sourceTexture) {
    handle.envMapTexture.dispose();
  }
  handle.sourceTexture = null;
  handle.envMapTexture = null;
  handle.gradientKey = '';
}

export function createStudioEnvTexture(gradientTop: string, gradientBottom: string): CanvasTexture {
  const envCanvas = document.createElement('canvas');
  envCanvas.width = 512;
  envCanvas.height = 256;
  const ctx = envCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create studio environment canvas');
  }

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, gradientTop);
  grad.addColorStop(0.3, '#f1f5f9');
  grad.addColorStop(0.7, '#e2e8f0');
  grad.addColorStop(1, gradientBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(140, 90, 70, 45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(370, 110, 50, 35, 0, 0, Math.PI * 2);
  ctx.fill();

  const envTex = new CanvasTexture(envCanvas);
  envTex.mapping = EquirectangularReflectionMapping;
  envTex.colorSpace = SRGBColorSpace;
  return envTex;
}

export function applyEnvironmentToScene(
  scene: Scene,
  renderer: StudioRenderer,
  env: EnvironmentLighting,
  handle: EnvironmentHandle,
): void {
  scene.background = new Color(env.backgroundColor);
  scene.backgroundIntensity = env.backgroundIntensity;
  scene.environmentIntensity = env.environmentIntensity;
  scene.environmentRotation.y = (env.rotationYDeg * Math.PI) / 180;

  const key = environmentGradientKey(env);
  if (key === handle.gradientKey && handle.envMapTexture) {
    scene.environment = handle.envMapTexture;
    return;
  }

  disposeEnvironmentHandle(handle);

  const source = createStudioEnvTexture(env.gradientTop, env.gradientBottom);
  handle.sourceTexture = source;
  handle.gradientKey = key;

  if (renderer.backend === 'webgl') {
    const pmremGenerator = new PMREMGenerator(renderer.instance as WebGLRenderer);
    pmremGenerator.compileEquirectangularShader();
    const envMapTarget = pmremGenerator.fromEquirectangular(source);
    handle.envMapTexture = envMapTarget.texture;
    pmremGenerator.dispose();
    source.dispose();
    handle.sourceTexture = null;
    scene.environment = handle.envMapTexture;
    return;
  }

  handle.envMapTexture = source;
  scene.environment = source;
}
