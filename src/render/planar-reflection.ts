import { reflector } from 'three/tsl';
import type { Camera, Object3D, WebGPURenderer } from 'three/webgpu';
import {
  FIXTURE_DISC_LAYER,
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

  /** Fixture discs live on FIXTURE_DISC_LAYER — toggle for planar mirror reflector camera. */
  setFixturesVisibleInReflection(visible: boolean): void {
    const camera = this.getReflectorCamera();
    if (!camera) {return;}
    if (visible) {
      camera.layers.enable(FIXTURE_DISC_LAYER);
    } else {
      camera.layers.disable(FIXTURE_DISC_LAYER);
    }
  }

  private getReflectorCamera(): Camera | null {
    const reflectorObj = this.node.reflector as { virtualCamera?: Camera };
    return reflectorObj.virtualCamera ?? null;
  }

  dispose(): void {
    this.node.dispose();
  }
}
