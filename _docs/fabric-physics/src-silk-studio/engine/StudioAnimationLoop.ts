/** Drives requestAnimationFrame only while the callback requests another frame. */
export class StudioAnimationLoop {
  private rafId: number | null = null;
  private disposed = false;
  private readonly onFrame: () => boolean;

  constructor(onFrame: () => boolean) {
    this.onFrame = onFrame;
  }

  /** Schedule frames if idle; safe to call repeatedly while already running. */
  wake(): void {
    if (this.disposed || this.rafId !== null) {
      return;
    }
    this.schedule();
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
  }

  private schedule(): void {
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (this.disposed) {
        return;
      }
      const continueLoop = this.onFrame();
      if (continueLoop) {
        this.schedule();
      }
    });
  }
}
