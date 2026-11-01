import type { AssetEntity } from '@/scene/entity-types';
import { subscribeProfiles } from '@/scene/profile-registry';
import { entityProfileId } from '@/scene/profile-usage';

/** Quiet time after the last profile change before assets are rebuilt. */
export const PROFILE_REBUILD_SETTLE_MS = 150;

interface ProfileRebuildHost {
  getEntities(): readonly AssetEntity[];
  rebuildEntity(entityId: string): Promise<void>;
}

/**
 * Rebuilds assets whose profile changed. Waits until the pointer is released and the
 * changes settle, so dragging in the profile editor does not rebuild on every move.
 */
export class ProfileRebuildScheduler {
  private readonly pending = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pointerDown = false;
  private readonly unsubscribe: () => void;
  private readonly abort = new AbortController();

  constructor(private readonly host: ProfileRebuildHost) {
    this.unsubscribe = subscribeProfiles((changed) => {
      changed.forEach((id) => this.pending.add(id));
      this.schedule();
    });
    if (typeof window !== 'undefined') {
      const options = { capture: true, signal: this.abort.signal };
      window.addEventListener('pointerdown', () => { this.pointerDown = true; }, options);
      const release = () => {
        this.pointerDown = false;
        this.schedule();
      };
      window.addEventListener('pointerup', release, options);
      window.addEventListener('pointercancel', release, options);
    }
  }

  private schedule(): void {
    if (this.pending.size === 0 || this.pointerDown) {return;}
    if (this.timer !== null) {clearTimeout(this.timer);}
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, PROFILE_REBUILD_SETTLE_MS);
  }

  /** Rebuilds every asset that uses one of the pending profiles. */
  flush(): void {
    if (this.pending.size === 0) {return;}
    const ids = new Set(this.pending);
    this.pending.clear();
    for (const entity of this.host.getEntities()) {
      const profileId = entityProfileId(entity);
      if (profileId !== null && ids.has(profileId)) {
        void this.host.rebuildEntity(entity.id);
      }
    }
  }

  dispose(): void {
    if (this.timer !== null) {clearTimeout(this.timer);}
    this.abort.abort();
    this.unsubscribe();
  }
}
