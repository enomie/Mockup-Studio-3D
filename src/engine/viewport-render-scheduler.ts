import type { WebGPURenderer } from 'three/webgpu';

export type ViewportFrameCallback = (time: number) => void;

/**
 * Starts WebGPU's animation loop only when a frame is needed or interaction is continuous.
 */
export class ViewportRenderScheduler {
  private readonly renderer: WebGPURenderer;
  private readonly onFrame: ViewportFrameCallback;
  private pendingRender = true;
  private continuousRendering = false;
  private loopRunning = false;
  private disposed = false;

  private readonly onVisibilityChange = (): void => {
    if (this.disposed) return;
    if (document.hidden) {
      this.stopLoop();
      return;
    }
    this.requestRender();
  };

  constructor(renderer: WebGPURenderer, onFrame: ViewportFrameCallback) {
    this.renderer = renderer;
    this.onFrame = onFrame;
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.requestRender();
  }

  requestRender(): void {
    if (this.disposed || document.hidden) return;
    this.pendingRender = true;
    this.ensureLoop();
  }

  setContinuousRendering(enabled: boolean): void {
    if (this.disposed) return;
    this.continuousRendering = enabled;
    if (enabled) {
      this.ensureLoop();
      return;
    }
    this.evaluateStopLoop();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.stopLoop();
  }

  private ensureLoop(): void {
    if (this.disposed || document.hidden) return;
    if (this.loopRunning) return;
    this.loopRunning = true;
    this.renderer.setAnimationLoop((time) => this.tick(time));
  }

  private tick(time: number): void {
    if (this.disposed) return;

    if (!this.pendingRender && !this.continuousRendering) {
      this.stopLoop();
      return;
    }

    const renderThisFrame = this.pendingRender || this.continuousRendering;
    this.pendingRender = false;

    if (renderThisFrame) {
      this.onFrame(time);
    }

    if (!this.pendingRender && !this.continuousRendering) {
      this.stopLoop();
    }
  }

  private evaluateStopLoop(): void {
    if (!this.pendingRender && !this.continuousRendering) {
      this.stopLoop();
    }
  }

  private stopLoop(): void {
    if (!this.loopRunning) return;
    this.loopRunning = false;
    this.renderer.setAnimationLoop(null);
  }
}
