import { ViewportRenderScheduler, type ViewportFrameCallback } from './viewport-render-scheduler';
import type { WebGPURenderer } from 'three/webgpu';

/** Single entry point for viewport redraw requests (render-on-demand). */
export class ViewportInvalidation {
  private readonly scheduler: ViewportRenderScheduler;

  constructor(renderer: WebGPURenderer, onFrame: ViewportFrameCallback) {
    this.scheduler = new ViewportRenderScheduler(renderer, onFrame);
  }

  invalidate(): void {
    this.scheduler.requestRender();
  }

  setContinuous(active: boolean): void {
    this.scheduler.setContinuousRendering(active);
  }

  invalidateAfter(task: Promise<void>): void {
    void task.finally(() => {
      this.invalidate();
    });
  }

  dispose(): void {
    this.scheduler.dispose();
  }
}
