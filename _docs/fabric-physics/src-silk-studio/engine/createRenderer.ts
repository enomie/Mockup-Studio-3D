import {
  ACESFilmicToneMapping,
  PCFShadowMap,
  VSMShadowMap,
  WebGLRenderer,
  type WebGLRendererParameters,
} from 'three';
import type { WebGPURenderer } from 'three/webgpu';

export type RenderBackend = 'webgpu' | 'webgl';

export interface StudioRenderer {
  readonly backend: RenderBackend;
  readonly instance: WebGLRenderer | WebGPURenderer;
  readonly domElement: HTMLCanvasElement;
  setSize(width: number, height: number): void;
  setPixelRatio(ratio: number): void;
  render(scene: import('three').Scene, camera: import('three').Camera): void;
  dispose(): void;
}

/** WebGPU is opt-in (`?webgpu=1`) — default WebGL matches the demo (VSM, PMREM, no ShaderMaterial warnings). */
export function shouldUseWebGpuBackend(): boolean {
  return new URLSearchParams(window.location.search).get('webgpu') === '1';
}

function configureWebGL(renderer: WebGLRenderer): void {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = VSMShadowMap;
}

function configureWebGPU(renderer: WebGPURenderer): void {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  // VSM uses legacy ShaderMaterial passes; PCF is compatible with the WebGPU node pipeline.
  renderer.shadowMap.type = PCFShadowMap;
}

export async function createRenderer(
  container: HTMLElement,
): Promise<StudioRenderer> {
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  const gpu = 'gpu' in navigator ? navigator.gpu : undefined;
  if (shouldUseWebGpuBackend() && gpu) {
    try {
      const { WebGPURenderer: WebGPU } = await import('three/webgpu');
      const webgpu = new WebGPU({ antialias: true });
      await webgpu.init();
      webgpu.setSize(width, height);
      configureWebGPU(webgpu);
      container.appendChild(webgpu.domElement);
      return wrapRenderer('webgpu', webgpu);
    } catch {
      // fall through to WebGL
    }
  }

  const params: WebGLRendererParameters = {
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    logarithmicDepthBuffer: true,
  };
  const webgl = new WebGLRenderer(params);
  webgl.setSize(width, height);
  configureWebGL(webgl);
  container.appendChild(webgl.domElement);
  return wrapRenderer('webgl', webgl);
}

function wrapRenderer(
  backend: RenderBackend,
  renderer: WebGLRenderer | WebGPURenderer,
): StudioRenderer {
  return {
    backend,
    instance: renderer,
    domElement: renderer.domElement,
    setSize(w, h) {
      renderer.setSize(w, h);
    },
    setPixelRatio(ratio) {
      renderer.setPixelRatio(ratio);
    },
    render(scene, camera) {
      renderer.render(scene, camera);
    },
    dispose() {
      void Promise.resolve(renderer.dispose());
    },
  };
}
