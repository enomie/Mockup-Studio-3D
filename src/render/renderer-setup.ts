import { WebGPURenderer } from 'three/webgpu';
import { VIEWPORT_MAX_PIXEL_RATIO, VIEWPORT_MSAA_SAMPLES } from '@/constants';
import { configureShadowRenderer } from './shadow-setup';

/** Create and initialize the app WebGPU renderer (MSAA + shadow mapping). */
export async function createWebGpuRenderer(container: HTMLElement): Promise<WebGPURenderer> {
  const renderer = new WebGPURenderer({
    antialias: true,
    /** Transparent default framebuffer — required for PNG export alpha via canvas.toBlob. */
    alpha: true,
    samples: VIEWPORT_MSAA_SAMPLES,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, VIEWPORT_MAX_PIXEL_RATIO));
  container.appendChild(renderer.domElement);
  await renderer.init();
  configureShadowRenderer(renderer);
  return renderer;
}
