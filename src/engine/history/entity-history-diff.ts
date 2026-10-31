import type { AssetEntity } from '@/scene/entity-types';

export interface EntityHistoryDiff {
  label: string;
  /** Entity the step is about; selected again after undo/redo when it still exists. */
  focusEntityId: string | null;
}

/** Describes the change between two entity lists, or null when nothing changed. */
export function describeEntityChange(
  before: readonly AssetEntity[],
  after: readonly AssetEntity[],
): EntityHistoryDiff | null {
  const beforeById = new Map(before.map((entity) => [entity.id, entity]));
  const afterById = new Map(after.map((entity) => [entity.id, entity]));

  const added = after.filter((entity) => !beforeById.has(entity.id));
  const removed = before.filter((entity) => !afterById.has(entity.id));
  const changed = after.filter((entity) => {
    const previous = beforeById.get(entity.id);
    // A new object with identical content (e.g. a field re-committing its value) is no change.
    return previous !== undefined && previous !== entity && JSON.stringify(previous) !== JSON.stringify(entity);
  });

  if (added.length + removed.length + changed.length === 0) {
    const reordered = before.length !== after.length || before.some((entity, i) => after[i].id !== entity.id);
    return reordered ? { label: 'Reorder objects', focusEntityId: null } : null;
  }

  const count = added.length + removed.length + changed.length;
  if (count > 1) {
    return { label: `Edit ${count} objects`, focusEntityId: [...added, ...changed].at(0)?.id ?? null };
  }
  if (added.length === 1) {return { label: `Add ${added[0].name}`, focusEntityId: added[0].id };}
  if (removed.length === 1) {return { label: `Delete ${removed[0].name}`, focusEntityId: removed[0].id };}

  const next = changed[0];
  const previous = beforeById.get(next.id);
  const onlyTransform =
    previous !== undefined &&
    Object.keys({ ...previous, ...next }).every((key) => {
      if (key === 'transform') {return true;}
      return previous[key as keyof AssetEntity] === next[key as keyof AssetEntity];
    });
  return { label: `${onlyTransform ? 'Move' : 'Edit'} ${next.name}`, focusEntityId: next.id };
}
