import { describe, expect, it } from 'vitest';
import type { AssetEntity } from '@/scene/entity-types';
import { HistoryStack } from './history-stack';
import { SceneHistoryController, type SceneHistoryHost } from './scene-history-controller';

function entity(id: string, x = 0, name = id): AssetEntity {
  return {
    id,
    type: 'asset',
    name,
    assetKind: 'block',
    screenImageId: null,
    sizeScale: 1,
    visible: true,
    transform: { position: { x, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
  };
}

function setup(initial: readonly AssetEntity[]) {
  let entities = initial;
  let suspended = false;
  const focused: string[] = [];
  const pending: (() => void)[] = [];
  const host: SceneHistoryHost = {
    getEntities: () => entities,
    restoreEntities: (next) => { entities = next; return Promise.resolve(); },
    focusEntity: (id) => { focused.push(id); },
    isRecordingSuspended: () => suspended,
    onStateChanged: () => {},
  };
  const history = new SceneHistoryController(host, {
    set: (cb) => { pending.push(cb); return pending.length; },
    clear: () => { pending.length = 0; },
  });
  return {
    history,
    focused,
    get entities() { return entities; },
    change(next: readonly AssetEntity[]) { history.noteUserActivity(); entities = next; history.onEntitiesChanged(); },
    silentChange(next: readonly AssetEntity[]) { entities = next; history.onEntitiesChanged(); },
    settle() { const run = [...pending]; pending.length = 0; run.forEach((cb) => { cb(); }); },
    suspend(value: boolean) { suspended = value; },
  };
}

describe('HistoryStack', () => {
  it('drops the redo side on record and respects the limit', () => {
    const stack = new HistoryStack<number>(2);
    stack.record({ before: 0, after: 1, label: 'a' });
    stack.record({ before: 1, after: 2, label: 'b' });
    stack.record({ before: 2, after: 3, label: 'c' });
    expect(stack.undo()?.label).toBe('c');
    expect(stack.undo()?.label).toBe('b');
    expect(stack.undo()).toBeNull();
    expect(stack.redo()?.label).toBe('b');
    stack.record({ before: 2, after: 9, label: 'd' });
    expect(stack.peekRedo()).toBeNull();
  });
});

describe('SceneHistoryController', () => {
  it('records a settled change and undoes/redoes it', async () => {
    const a = entity('a');
    const s = setup([a]);
    const moved = { ...a, transform: { ...a.transform, position: { x: 5, y: 0, z: 0 } } };
    s.change([moved]);
    s.settle();
    expect(s.history.getState()).toMatchObject({ canUndo: true, undoLabel: 'Move a' });

    await s.history.undo();
    expect(s.entities[0]).toBe(a);
    expect(s.history.getState()).toMatchObject({ canUndo: false, canRedo: true });
    await s.history.redo();
    expect(s.entities[0]).toBe(moved);
    expect(s.focused).toEqual(['a', 'a']);
  });

  it('turns all changes during a pointer gesture into one step', async () => {
    const a = entity('a');
    const s = setup([a]);
    s.history.setPointerDown(true);
    for (let x = 1; x <= 20; x++) {s.change([entity('a', x)]);}
    s.settle();
    expect(s.history.getState().canUndo).toBe(false);
    s.history.setPointerDown(false);
    s.settle();
    await s.history.undo();
    expect(s.entities[0]).toBe(a);
    expect(s.history.getState().canUndo).toBe(false);
  });

  it('undo commits pending changes first', async () => {
    const a = entity('a');
    const s = setup([a]);
    s.change([a, entity('b')]);
    await s.history.undo();
    expect(s.entities).toEqual([a]);
    expect(s.history.getState().redoLabel).toBe('Add b');
  });

  it('ignores changes while suspended and starts fresh afterwards', async () => {
    const a = entity('a');
    const s = setup([a]);
    s.suspend(true);
    s.change([entity('a', 3)]);
    s.suspend(false);
    s.change([entity('a', 4)]);
    s.settle();
    expect(s.history.getState().canUndo).toBe(false);
    s.change([entity('a', 9)]);
    s.settle();
    await s.history.undo();
    expect(s.entities[0].transform.position.x).toBe(4);
  });

  it('does not record changes without user input', () => {
    const s = setup([entity('a')]);
    s.silentChange([entity('a', 2)]);
    s.settle();
    expect(s.history.getState().canUndo).toBe(false);
  });

  it('labels deletions and restores the deleted object', async () => {
    const a = entity('a');
    const b = entity('b', 0, 'Block 2');
    const s = setup([a, b]);
    s.change([a]);
    s.settle();
    expect(s.history.getState().undoLabel).toBe('Delete Block 2');
    await s.history.undo();
    expect(s.entities).toEqual([a, b]);
    expect(s.focused).toEqual(['b']);
  });

  it('records and restores settings alongside entities', async () => {
    const s = setup([entity('a')]);
    let settings = { fog: 1 };
    const restored: unknown[] = [];
    s.history.setSettingsAdapter({
      capture: () => settings,
      equals: (x, y) => JSON.stringify(x) === JSON.stringify(y),
      describe: (x, y) => (JSON.stringify(x) === JSON.stringify(y) ? null : 'Edit environment'),
      restore: (snap) => { restored.push(snap); settings = snap as { fog: number }; },
    });
    s.history.noteUserActivity();
    settings = { fog: 2 };
    s.history.onEntitiesChanged();
    s.settle();
    expect(s.history.getState().undoLabel).toBe('Edit environment');
    await s.history.undo();
    expect(settings).toEqual({ fog: 1 });
    await s.history.redo();
    expect(settings).toEqual({ fog: 2 });
    expect(restored).toHaveLength(2);
  });

  it('ignores re-committed identical values', () => {
    const s = setup([entity('a', 1)]);
    s.change([entity('a', 1)]);
    s.settle();
    expect(s.history.getState().canUndo).toBe(false);
  });
});
