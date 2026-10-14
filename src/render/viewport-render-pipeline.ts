import { smaa } from 'three/addons/tsl/display/SMAANode.js';
import { texture } from 'three/tsl';
import {
  HalfFloatType,
  RGBAFormat,
  type Camera,
  RenderPipeline,
  RenderTarget,
  type Scene,
  type WebGPURenderer,
} from 'three/webgpu';
import {
  VIEWPORT_MSAA_SAMPLES,
  VIEWPORT_SMAA_ENABLED,
} from '@/constants';

export interface ViewportFrameParams {
  skyScene: Scene;
  mainScene: Scene;
  camera: Camera;
  skyEnabled: boolean;
  /** When sky is skipped: clear color alpha 0 before the main pass (export capture only). */
  transparentBackground?: boolean;
}

/** Renders sky then main into a single MSAA target (sky pixels kept, depth cleared). */
export function compositeSceneToTarget(
  renderer: WebGPURenderer,
  target: RenderTarget,
  params: ViewportFrameParams,
): void {
  const { skyScene, mainScene, camera, skyEnabled, transparentBackground } = params;

  renderer.setRenderTarget(target);

  if (skyEnabled) {
    renderer.autoClear = true;
    renderer.render(skyScene, camera);

    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(mainScene, camera);
    renderer.autoClear = true;
  } else {
    renderer.autoClear = true;
    if (transparentBackground) {
      renderer.setClearColor(0x000000, 0);
    }
    renderer.render(mainScene, camera);
  }

  renderer.setRenderTarget(null);
}

/**
 * Viewport output: scene composite (offscreen MSAA) → SMAA → canvas via RenderPipeline.
 */
export class ViewportRenderPipeline {
  private readonly renderer: WebGPURenderer;
  private readonly compositeTarget: RenderTarget;
  private readonly pipelineSmaa: RenderPipeline;
  private readonly pipelineDirect: RenderPipeline;

  constructor(renderer: WebGPURenderer) {
    this.renderer = renderer;
    this.compositeTarget = new RenderTarget(1, 1, {
      format: RGBAFormat,
      type: HalfFloatType,
      depthBuffer: true,
      samples: VIEWPORT_MSAA_SAMPLES,
    });
    this.compositeTarget.texture.name = 'viewport.composite';

    const sceneColor = texture(this.compositeTarget.texture);
    const outputNode = smaa(sceneColor);
    this.pipelineSmaa = new RenderPipeline(renderer, outputNode);
    this.pipelineDirect = new RenderPipeline(renderer, sceneColor);
  }

  renderFrame(params: ViewportFrameParams): void {
    compositeSceneToTarget(this.renderer, this.compositeTarget, params);

    if (params.transparentBackground) {
      this.renderer.setRenderTarget(null);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.clear();
    }

    const useDirectOutput =
      params.transparentBackground === true || !VIEWPORT_SMAA_ENABLED;
    if (useDirectOutput) {
      this.pipelineDirect.render();
    } else {
      this.pipelineSmaa.render();
    }
  }

  setSize(cssWidth: number, cssHeight: number): void {
    const pixelRatio = this.renderer.getPixelRatio();
    const w = Math.max(1, Math.floor(cssWidth * pixelRatio));
    const h = Math.max(1, Math.floor(cssHeight * pixelRatio));
    this.compositeTarget.setSize(w, h);
  }

  dispose(): void {
    this.pipelineSmaa.dispose();
    this.pipelineDirect.dispose();
    this.compositeTarget.dispose();
  }
}
