import type { AssetEntity } from '@/scene/entity-types';
import type { PatchPoint } from '@/scene/asset-triangle-patch';
import { reconcilePatchNodes, type PatchNode } from '@/scene/patch-nodes';

export interface PatchNodeSyncHost {
  getEntities(): readonly AssetEntity[];
  getPatchNodes(): readonly PatchNode[];
  setPatchNodes(nodes: readonly PatchNode[]): void;
  /** True while undo/redo restores a stored (already consistent) state. */
  isRestoring(): boolean;
  writePatchPoints(entityId: string, points: PatchPoint[]): void;
}

/**
 * Keeps shared nodes and the patches using them in line: after entity changes (once per
 * batch, in a microtask) edits flow into the node and from there into every user.
 */
export class PatchNodeSync {
  private previous = new Map<string, AssetEntity>();
  private scheduled = false;

  constructor(private readonly host: PatchNodeSyncHost) {
    this.remember();
  }

  onEntitiesChanged(): void {
    if (this.host.isRestoring()) {
      this.remember();
      return;
    }
    if (this.scheduled || this.host.getPatchNodes().length === 0) {
      if (!this.scheduled) {this.remember();}
      return;
    }
    this.scheduled = true;
    queueMicrotask(() => { this.run(); });
  }

  private run(): void {
    this.scheduled = false;
    if (this.host.isRestoring()) {
      this.remember();
      return;
    }
    const result = reconcilePatchNodes(this.previous, this.host.getEntities(), this.host.getPatchNodes());
    this.remember();
    if (result.nodes) {this.host.setPatchNodes(result.nodes);}
    for (const [entityId, points] of result.points) {this.host.writePatchPoints(entityId, points);}
    this.remember();
  }

  private remember(): void {
    this.previous = new Map(this.host.getEntities().map((entity) => [entity.id, entity]));
  }
}
