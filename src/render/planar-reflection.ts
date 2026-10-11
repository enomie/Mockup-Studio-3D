import { reflector } from 'three/tsl';
import type { Object3D, WebGPURenderer } from 'three/webgpu';
import {
  PLANAR_REFLECTION_GENERATE_MIPMAPS,
  PLANAR_REFLECTION_MAX_SIZE,
  VIEWPORT_MSAA_SAMPLES,
} from '@/constants';

/** Planar mirror pass for the ground plane — TSL `reflector()` (WebGPU). */
export class PlanarReflectionPass {
  readonly node = reflector({
    bounces: false,
    generateMipmaps: PLANAR_REFLECTION_GENERATE_MIPMAPS,
    samples: VIEWPORT_MSAA_SAMPLES,
  });

  get target(): Object3D {
    return this.node.target;
  }

  updateResolution(renderer: WebGPURenderer): void {
    const width = renderer.domElement.width;
    const height = renderer.domElement.height;
    const maxDim = Math.max(width, height, 1);
    this.node.reflector.resolutionScale = Math.min(1, PLANAR_REFLECTION_MAX_SIZE / maxDim);
  }

  dispose(): void {
    this.node.dispose();
  }
}
