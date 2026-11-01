/** One undoable step: the state before and after, plus a short label for the UI. */
export interface HistoryEntry<T> {
  before: T;
  after: T;
  label: string;
}

const DEFAULT_HISTORY_LIMIT = 100;

/** Linear undo/redo stack of state snapshots. Recording a new step discards the redo side. */
export class HistoryStack<T> {
  private readonly undoEntries: HistoryEntry<T>[] = [];
  private readonly redoEntries: HistoryEntry<T>[] = [];

  constructor(private readonly limit: number = DEFAULT_HISTORY_LIMIT) {}

  record(entry: HistoryEntry<T>): void {
    this.undoEntries.push(entry);
    if (this.undoEntries.length > this.limit) {this.undoEntries.shift();}
    this.redoEntries.length = 0;
  }

  /** Pops the latest step; the caller restores `entry.before`. */
  undo(): HistoryEntry<T> | null {
    const entry = this.undoEntries.pop();
    if (!entry) {return null;}
    this.redoEntries.push(entry);
    return entry;
  }

  /** Re-applies the last undone step; the caller restores `entry.after`. */
  redo(): HistoryEntry<T> | null {
    const entry = this.redoEntries.pop();
    if (!entry) {return null;}
    this.undoEntries.push(entry);
    return entry;
  }

  peekUndo(): HistoryEntry<T> | null {
    return this.undoEntries.at(-1) ?? null;
  }

  peekRedo(): HistoryEntry<T> | null {
    return this.redoEntries.at(-1) ?? null;
  }

  clear(): void {
    this.undoEntries.length = 0;
    this.redoEntries.length = 0;
  }
}
