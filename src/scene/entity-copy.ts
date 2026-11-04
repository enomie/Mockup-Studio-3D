import type { AssetEntity, Vec3 } from './entity-types';

/** Next free copy name: "Box" → "Box 2", "Box 2" → "Box 3" (skips names already in use). */
export function nextCopyName(name: string, existingNames: Iterable<string>): string {
  const base = name.replace(/\s+\d+$/, '').trim() || name;
  const used = new Set(existingNames);
  let highest = 1;
  const pattern = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s+(\\d+))?$`);
  for (const existing of used) {
    const match = pattern.exec(existing);
    if (match) {highest = Math.max(highest, match[1] ? Number(match[1]) : 1);}
  }
  let next = highest + 1;
  while (used.has(`${base} ${next}`)) {next += 1;}
  return `${base} ${next}`;
}

/**
 * Deep copies of `entities` with fresh ids and copy names, shifted by `offset`.
 * Patch points drop their shared node links (copies are standalone); edge links stay
 * only between patches copied together and point to the partner's copy.
 */
export function copyEntities(
  entities: readonly AssetEntity[],
  existingNames: Iterable<string>,
  offset: Vec3 = { x: 0, y: 0, z: 0 },
  createId: () => string = () => crypto.randomUUID(),
): AssetEntity[] {
  const idMap = new Map(entities.map((entity) => [entity.id, createId()]));
  const names = [...existingNames];
  return entities.map((source) => {
    const entity = structuredClone(source);
    entity.id = idMap.get(source.id) ?? createId();
    entity.name = nextCopyName(source.name, names);
    names.push(entity.name);
    const { position } = entity.transform;
    entity.transform.position = { x: position.x + offset.x, y: position.y + offset.y, z: position.z + offset.z };
    if (entity.patchParams) {
      for (const point of entity.patchParams.points) {delete point.nodeId;}
      const links = (entity.patchParams.edgeLinks ?? [])
        .filter((link) => idMap.has(link.partnerEntityId))
        .map((link) => ({ ...link, partnerEntityId: idMap.get(link.partnerEntityId) ?? link.partnerEntityId }));
      if (links.length > 0) {entity.patchParams.edgeLinks = links;} else {delete entity.patchParams.edgeLinks;}
    }
    return entity;
  });
}
