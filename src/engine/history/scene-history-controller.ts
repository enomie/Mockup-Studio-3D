import type { AssetEntity } from '@/scene/entity-types';
import { describeEntityChange } from './entity-history-diff';
import { HistoryStack } from './history-stack';

/** Quiet time after the last change before it becomes one undo step (typing, wheel, etc.). */
const SETTLE_MS = 400;

export interface SceneHistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
}

export interface SceneHistoryHost {
  getEntities(): readonly AssetEntity[];
  /** Restores an entity list; resolves when geometry is rebuilt. */
  restoreEntities(entities: readonly AssetEntity[]): Promise<void>;
  /** Selects `entityId` after undo/redo when it exists. */
  focusEntity(entityId: string): void;
  /** True while changes must not become steps (running physics simulation). */
  isRecordingSuspended(): boolean;
  /** Called whenever undo/redo availability may have changed. */
  onStateChanged(): void;
}

/**
 * Non-entity state kept in the history (lighting, environment, libraries). Owned by
 * the UI store; the history only stores and hands back opaque snapshots.
 */
export interface HistorySettingsAdapter {
  capture(): unknown;
  equals(a: unknown, b: unknown): boolean;
  restore(snapshot: unknown): void;
  /** Short label for a change, e.g. "Edit lighting"; null when equal. */
  describe(before: unknown, after: unknown): string | null;
}

interface SceneSnapshot {
  entities: readonly AssetEntity[];
  settings: unknown;
}

interface PendingTimer {
  set(callback: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const defaultTimer: PendingTimer = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => { clearTimeout(handle as ReturnType<typeof setTimeout>); },
};

/**
 * Turns entity changes into undo steps. A pointer gesture (gizmo drag, slider, scrub)
 * becomes one step on release; other changes are grouped until SETTLE_MS of quiet.
 */
export class SceneHistoryController {
  private readonly stack = new HistoryStack<SceneSnapshot>();
  private baseline: SceneSnapshot;
  private settings: HistorySettingsAdapter | null = null;
  private pointerDown = false;
  private restoring = false;
  private suspended = false;
  private timer: unknown = null;
  /** Set by user input; changes without it (async loads, rebuilds) only move the baseline. */
  private userActivity = false;

  constructor(
    private readonly host: SceneHistoryHost,
    private readonly timers: PendingTimer = defaultTimer,
  ) {
    this.baseline = this.capture();
  }

  /** Connects the settings source; resets the baseline so existing state is no step. */
  setSettingsAdapter(adapter: HistorySettingsAdapter | null): void {
    this.settings = adapter;
    this.baseline = this.capture();
  }

  private capture(): SceneSnapshot {
    return { entities: this.host.getEntities(), settings: this.settings?.capture() };
  }

  /** Call on every entity or settings change. */
  onEntitiesChanged(): void {
    if (this.restoring) {return;}
    if (this.host.isRecordingSuspended()) {
      this.suspended = true;
      this.cancelTimer();
      return;
    }
    if (this.suspended) {
      // Simulation ended: its result is the new starting point, not a step.
      this.suspended = false;
      this.baseline = this.capture();
      return;
    }
    this.scheduleFlush();
  }

  /** Call on user input (pointer, key, form input) so following changes count as steps. */
  noteUserActivity(): void {
    this.userActivity = true;
  }

  setPointerDown(down: boolean): void {
    this.pointerDown = down;
    if (down) {this.userActivity = true;}
    if (!down) {this.scheduleFlush();}
  }

  /** Commits pending changes as one step now. */
  flush(): void {
    this.cancelTimer();
    if (this.restoring) {return;}
    const current = this.capture();
    const settingsLabel = this.settings?.describe(this.baseline.settings, current.settings) ?? null;
    const sameSettings = settingsLabel === null;
    if (current.entities === this.baseline.entities && sameSettings) {return;}
    // Keep the old settings object when nothing changed so snapshots stay shareable.
    if (sameSettings) {current.settings = this.baseline.settings;}
    const fromUser = this.userActivity;
    this.userActivity = this.pointerDown;
    if (!fromUser) {
      this.baseline = current;
      return;
    }
    const entityDiff = describeEntityChange(this.baseline.entities, current.entities);
    const label = entityDiff && settingsLabel
      ? `${entityDiff.label}, ${settingsLabel.toLowerCase()}`
      : entityDiff?.label ?? settingsLabel;
    if (label) {
      this.stack.record({ before: this.baseline, after: current, label });
      this.host.onStateChanged();
    }
    this.baseline = current;
  }

  undo(): Promise<void> {
    this.flush();
    const entry = this.stack.undo();
    return entry ? this.restore(entry.before, entry.after) : Promise.resolve();
  }

  redo(): Promise<void> {
    this.flush();
    const entry = this.stack.redo();
    return entry ? this.restore(entry.after, entry.before) : Promise.resolve();
  }

  getState(): SceneHistoryState {
    const undo = this.stack.peekUndo();
    const redo = this.stack.peekRedo();
    return {
      canUndo: undo !== null,
      canRedo: redo !== null,
      undoLabel: undo?.label ?? null,
      redoLabel: redo?.label ?? null,
    };
  }

  private async restore(target: SceneSnapshot, from: SceneSnapshot): Promise<void> {
    this.restoring = true;
    try {
      if (this.settings && !this.settings.equals(target.settings, from.settings)) {
        this.settings.restore(target.settings);
      }
      if (target.entities !== from.entities) {
        await this.host.restoreEntities(target.entities);
      }
    } finally {
      this.restoring = false;
      this.baseline = { entities: this.host.getEntities(), settings: target.settings };
    }
    const focus = describeEntityChange(from.entities, target.entities)?.focusEntityId;
    if (focus && target.entities.some((entity) => entity.id === focus)) {this.host.focusEntity(focus);}
    this.host.onStateChanged();
  }

  private scheduleFlush(): void {
    this.cancelTimer();
    if (this.pointerDown) {return;}
    this.timer = this.timers.set(() => {
      this.timer = null;
      if (!this.pointerDown) {this.flush();}
    }, SETTLE_MS);
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      this.timers.clear(this.timer);
      this.timer = null;
    }
  }
}
