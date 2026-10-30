import {
  BufferGeometry,
  Line,
  LineBasicNodeMaterial,
  Mesh,
  MeshBasicNodeMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  type Camera,
  type Scene,
} from 'three/webgpu';
import {
  getPatchEdgeCount,
  isPatchAssetKind,
  type PatchParams,
} from '@/scene/asset-triangle-patch';
import { evalEdge } from './triangle-patch-geometry';
import type { EntityRegistry } from './entity-registry';

/** Samples per edge for hover hit testing and the edge highlight lines. */
const EDGE_SAMPLES = 64;
/** Highlight lines are pooled for the largest patch (quad). */
const MAX_PATCH_EDGES = 4;
/** How close (screen pixels) the pointer must be to an edge to place a point. */
const HOVER_RADIUS_PX = 14;

export interface PatchEdgeHit {
  edgeIndex: number;
  /** Edge parameter in [0, 1]. */
  t: number;
}

/** Pointer position on the viewport canvas: normalized device coords plus the canvas size in pixels. */
export interface ViewportPointer {
  ndc: Vector2;
  widthPx: number;
  heightPx: number;
}

const _a = new Vector2();
const _b = new Vector2();
const _p = new Vector2();
const _world = new Vector3();

/**
 * Closest edge hit to `pointer` among screen-space edge polylines, or null when every
 * edge is farther than `radiusPx`. `screenEdges[e][i]` is sample i of edge e in pixels.
 */
export function findClosestEdgeHit(
  screenEdges: readonly (readonly (Vector2 | null)[])[],
  pointer: Vector2,
  radiusPx: number,
): PatchEdgeHit | null {
  let best: PatchEdgeHit | null = null;
  let bestDist = radiusPx;
  screenEdges.forEach((samples, edgeIndex) => {
    const last = samples.length - 1;
    for (let i = 0; i < last; i++) {
      const a = samples[i];
      const b = samples[i + 1];
      if (!a || !b) {continue;}
      const ab = _b.copy(b).sub(a);
      const lenSq = ab.lengthSq();
      const along = lenSq > 1e-9 ? Math.min(1, Math.max(0, _p.copy(pointer).sub(a).dot(ab) / lenSq)) : 0;
      const dist = _a.copy(a).addScaledVector(ab, along).distanceTo(pointer);
      if (dist < bestDist) {
        bestDist = dist;
        best = { edgeIndex, t: (i + along) / last };
      }
    }
  });
  return best;
}

/**
 * Viewport mode for placing new points on the edges of one triangle patch: highlights the
 * edges, shows a preview sphere under the pointer and reports the edge hit on click.
 */
export class TrianglePatchAddPointTool {
  private readonly registry: EntityRegistry;
  private entityId: string | null = null;
  private readonly preview: Mesh;
  private readonly edgeLines: Line[] = [];

  constructor(scene: Scene, registry: EntityRegistry) {
    this.registry = registry;

    this.preview = new Mesh(
      new SphereGeometry(0.021, 16, 16),
      new MeshBasicNodeMaterial({
        color: 0xc084fc,
        transparent: true,
        opacity: 0.9,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.preview.renderOrder = 1000;
    this.preview.frustumCulled = false;
    this.preview.visible = false;
    scene.add(this.preview);

    const lineMaterial = new LineBasicNodeMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    for (let e = 0; e < MAX_PATCH_EDGES; e++) {
      const points = Array.from({ length: EDGE_SAMPLES + 1 }, () => new Vector3());
      const line = new Line(new BufferGeometry().setFromPoints(points), lineMaterial);
      line.renderOrder = 997;
      line.frustumCulled = false;
      line.visible = false;
      scene.add(line);
      this.edgeLines.push(line);
    }
  }

  getEntityId(): string | null {
    return this.entityId;
  }

  isActive(): boolean {
    return this.entityId !== null;
  }

  start(entityId: string): void {
    const kind = this.registry.getRuntime(entityId)?.entity.assetKind;
    if (!kind || !isPatchAssetKind(kind)) {return;}
    this.entityId = entityId;
    this.preview.visible = false;
    this.syncEdgeLines();
  }

  stop(): void {
    this.entityId = null;
    this.preview.visible = false;
    for (const line of this.edgeLines) {line.visible = false;}
  }

  /** Updates the preview under the pointer. Returns true when the preview changed. */
  hoverAt(pointer: ViewportPointer, camera: Camera): boolean {
    const hit = this.hitAt(pointer, camera);
    const wasVisible = this.preview.visible;
    const params = this.getParams();
    if (!hit || !params) {
      this.preview.visible = false;
      return wasVisible;
    }
    evalEdge(params, hit.edgeIndex, hit.t, _world).applyMatrix4(this.getMatrixWorld());
    this.preview.position.copy(_world);
    this.preview.visible = true;
    return true;
  }

  /** Edge hit under the pointer, or null when the pointer is not near an edge. */
  hitAt(pointer: ViewportPointer, camera: Camera): PatchEdgeHit | null {
    const params = this.getParams();
    if (!params) {return null;}
    const matrix = this.getMatrixWorld();
    camera.updateMatrixWorld();

    const screenEdges: (Vector2 | null)[][] = [];
    for (let e = 0; e < getPatchEdgeCount(params); e++) {
      const samples: (Vector2 | null)[] = [];
      for (let i = 0; i <= EDGE_SAMPLES; i++) {
        evalEdge(params, e, i / EDGE_SAMPLES, _world).applyMatrix4(matrix).project(camera);
        // Points behind the camera project mirrored; skip them.
        samples.push(
          _world.z > 1
            ? null
            : new Vector2(
              ((_world.x + 1) / 2) * pointer.widthPx,
              ((1 - _world.y) / 2) * pointer.heightPx,
            ),
        );
      }
      screenEdges.push(samples);
    }
    const pointerPx = new Vector2(
      ((pointer.ndc.x + 1) / 2) * pointer.widthPx,
      ((1 - pointer.ndc.y) / 2) * pointer.heightPx,
    );
    return findClosestEdgeHit(screenEdges, pointerPx, HOVER_RADIUS_PX);
  }

  /** Re-samples the highlighted edges, e.g. after the patch changed. */
  syncEdgeLines(): void {
    const params = this.getParams();
    if (!params) {
      for (const line of this.edgeLines) {line.visible = false;}
      return;
    }
    const matrix = this.getMatrixWorld();
    const edgeCount = getPatchEdgeCount(params);
    this.edgeLines.forEach((line, e) => {
      if (e >= edgeCount) {
        line.visible = false;
        return;
      }
      const points = Array.from({ length: EDGE_SAMPLES + 1 }, (_, i) =>
        evalEdge(params, e, i / EDGE_SAMPLES).applyMatrix4(matrix),
      );
      line.geometry.setFromPoints(points);
      line.visible = true;
    });
  }

  dispose(): void {
    this.preview.removeFromParent();
    this.preview.geometry.dispose();
    for (const line of this.edgeLines) {
      line.removeFromParent();
      line.geometry.dispose();
    }
  }

  private getParams(): PatchParams | null {
    if (!this.entityId) {return null;}
    return this.registry.getRuntime(this.entityId)?.entity.patchParams ?? null;
  }

  private getMatrixWorld() {
    const object = this.entityId ? this.registry.getRuntime(this.entityId)?.object : undefined;
    if (!object) {throw new Error('triangle patch add-point tool has no entity object');}
    object.updateMatrixWorld(true);
    return object.matrixWorld;
  }
}
