import type { AssetEntity } from '@/scene/entity-types';
import type { PatchPoint } from '@/scene/asset-triangle-patch';
import { propagateEdgeLinks } from '@/scene/triangle-patch-edge-link';

export interface PatchEdgeLinkSyncHost {
  getEntities(): readonly AssetEntity[];
  /** True while undo/redo restores a stored (already consistent) state. */
  isRestoring(): boolean;
  writePatchPoints(entityId: string, points: PatchPoint[]): void;
}

/**
 * Keeps linked patch edges together: after any change, patches that changed are the
 * source and their link partners are pulled along (in a microtask, once per batch).
 */
export class PatchEdgeLinkSync {
  private lastSeen = new Map<string, AssetEntity>();
  private pendingSources = new Set<string>();
  private scheduled = false;

  constructor(private readonly host: PatchEdgeLinkSyncHost) {
    this.remember();
  }

  onEntitiesChanged(): void {
    const entities = this.host.getEntities();
    if (!this.host.isRestoring()) {
      for (const entity of entities) {
        if (!entity.patchParams?.edgeLinks?.length) {continue;}
        if (this.lastSeen.get(entity.id) !== entity) {this.pendingSources.add(entity.id);}
      }
    }
    this.remember();
    if (this.pendingSources.size > 0 && !this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => { this.run(); });
    }
  }

  /** Pulls the partners of `sourceIds` along right now (the given patches win). */
  runFrom(sourceIds: readonly string[]): void {
    const byId = new Map(this.host.getEntities().map((entity) => [entity.id, entity]));
    const updates = propagateEdgeLinks(sourceIds, (id) => byId.get(id));
    for (const [entityId, points] of updates) {this.host.writePatchPoints(entityId, points);}
  }

  private run(): void {
    this.scheduled = false;
    const sources = [...this.pendingSources];
    this.pendingSources.clear();
    if (this.host.isRestoring()) {return;}
    const byId = new Map(this.host.getEntities().map((entity) => [entity.id, entity]));
    const updates = propagateEdgeLinks(sources, (id) => byId.get(id));
    for (const [entityId, points] of updates) {this.host.writePatchPoints(entityId, points);}
  }

  private remember(): void {
    this.lastSeen = new Map(this.host.getEntities().map((entity) => [entity.id, entity]));
  }
}
