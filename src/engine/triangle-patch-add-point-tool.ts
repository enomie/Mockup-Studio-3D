import {
  BufferGeometry,
  Line,
  LineBasicNodeMaterial,
  Matrix4,
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
  getPatchMirrorSigns,
  isPatchAssetKind,
  type PatchParams,
} from '@/scene/asset-triangle-patch';
import { evalCubicBezierEdge, evalEdge } from './triangle-patch-geometry';
import { segmentHandleKeys } from '@/scene/triangle-patch-edge-link';
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

/** Screen distance (px) from `pointer` to the edge polyline at parameter `t`. */
function edgeHitDistance(samples: readonly (Vector2 | null)[], t: number, pointer: Vector2): number {
  const last = samples.length - 1;
  const i = Math.min(last - 1, Math.floor(t * last));
  const a = samples[i];
  const b = samples[i + 1];
  if (!a || !b) {return Infinity;}
  const f = t * last - i;
  return _a.copy(a).lerp(b, f).distanceTo(pointer);
}

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
export type PatchEdgeToolPurpose = 'add-point' | 'pick-edge';

/** A picked edge segment (two neighboring boundary points of one patch). */
export interface PatchEdgeSelection {
  entityId: string;
  startPointId: string;
  endPointId: string;
}

export class TrianglePatchAddPointTool {
  private readonly registry: EntityRegistry;
  private entityId: string | null = null;
  private purpose: PatchEdgeToolPurpose = 'add-point';
  private selectedSegment: PatchEdgeSelection | null = null;
  private readonly selectedLine: Line;
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
    this.selectedLine = new Line(
      new BufferGeometry().setFromPoints(Array.from({ length: EDGE_SAMPLES + 1 }, () => new Vector3())),
      new LineBasicNodeMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 1,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.selectedLine.renderOrder = 998;
    this.selectedLine.frustumCulled = false;
    this.selectedLine.visible = false;
    scene.add(this.selectedLine);

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

  getPurpose(): PatchEdgeToolPurpose {
    return this.purpose;
  }

  start(entityId: string, purpose: PatchEdgeToolPurpose = 'add-point'): void {
    const kind = this.registry.getRuntime(entityId)?.entity.assetKind;
    if (!kind || !isPatchAssetKind(kind)) {return;}
    this.entityId = entityId;
    this.purpose = purpose;
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
    const found = this.findHit(pointer, camera);
    const wasVisible = this.preview.visible;
    const params = this.getParams();
    if (!found || !params) {
      this.preview.visible = false;
      return wasVisible;
    }
    const { hit, matrix } = found;
    evalEdge(params, hit.edgeIndex, hit.t, _world).applyMatrix4(matrix);
    this.preview.position.copy(_world);
    this.preview.visible = true;
    return true;
  }

  /**
   * Edge hit under the pointer, or null when the pointer is not near an edge. Edges of mirror
   * copies count too: a mirrored edge reports the same edge index and parameter as the original's.
   */
  hitAt(pointer: ViewportPointer, camera: Camera): PatchEdgeHit | null {
    return this.findHit(pointer, camera)?.hit ?? null;
  }

  /** Closest edge hit over the original and all mirror copies, with the scene matrix of the side that was hit. */
  private findHit(pointer: ViewportPointer, camera: Camera): { hit: PatchEdgeHit; matrix: Matrix4 } | null {
    const params = this.getParams();
    if (!params) {return null;}
    camera.updateMatrixWorld();
    const pointerPx = new Vector2(
      ((pointer.ndc.x + 1) / 2) * pointer.widthPx,
      ((1 - pointer.ndc.y) / 2) * pointer.heightPx,
    );

    let best: { hit: PatchEdgeHit; matrix: Matrix4; dist: number } | null = null;
    for (const matrix of this.getSideMatrices(params)) {
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
      const hit = findClosestEdgeHit(screenEdges, pointerPx, HOVER_RADIUS_PX);
      if (!hit) {continue;}
      const dist = edgeHitDistance(screenEdges[hit.edgeIndex], hit.t, pointerPx);
      if (!best || dist < best.dist) {best = { hit, matrix, dist };}
    }
    return best ? { hit: best.hit, matrix: best.matrix } : null;
  }

  /** Local-to-scene matrices of the original followed by every mirror copy. */
  private getSideMatrices(params: PatchParams): Matrix4[] {
    const base = this.getMatrixWorld();
    return [
      base.clone(),
      ...getPatchMirrorSigns(params.mirror).map((s) => new Matrix4().makeScale(s.x, s.y, s.z).multiply(base)),
    ];
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

  getSelectedSegment(): PatchEdgeSelection | null {
    return this.selectedSegment;
  }

  /** Highlights one segment (independent of the running mode); null hides it. */
  setSelectedSegment(selection: PatchEdgeSelection | null): void {
    this.selectedSegment = selection;
    this.syncSelectedLine();
  }

  /** Re-samples the selected segment highlight; drops the selection when it no longer exists. */
  syncSelectedLine(): void {
    const sel = this.selectedSegment;
    const runtime = sel ? this.registry.getRuntime(sel.entityId) : undefined;
    const params = runtime?.entity.patchParams;
    const keys = params && sel ? segmentHandleKeys(params, sel.startPointId, sel.endPointId) : null;
    const a = params?.points.find((p) => p.id === sel?.startPointId);
    const b = params?.points.find((p) => p.id === sel?.endPointId);
    if (!runtime || !keys || !a || !b) {
      this.selectedSegment = null;
      this.selectedLine.visible = false;
      return;
    }
    runtime.object.updateMatrixWorld(true);
    const ordered = keys.a === 'handleNext' ? [a, b] : [b, a];
    const points = Array.from({ length: EDGE_SAMPLES + 1 }, (_, i) =>
      evalCubicBezierEdge(ordered[0], ordered[1], i / EDGE_SAMPLES).applyMatrix4(runtime.object.matrixWorld),
    );
    this.selectedLine.geometry.setFromPoints(points);
    this.selectedLine.visible = true;
  }

  dispose(): void {
    this.selectedLine.removeFromParent();
    this.selectedLine.geometry.dispose();
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
