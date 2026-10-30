import type { AssetKind } from './asset-kind';
import type { Vec3 } from './entity-types';

export interface PatchNodeData {
  id: string;
  name: string;
  pos: Vec3;
  handleNext: Vec3;
  handlePrev: Vec3;
  handleCrossIn: Vec3;
  handleCrossOut: Vec3;
}

export type PatchHandleTarget =
  | 'pos'
  | 'handleNext'
  | 'handlePrev'
  | 'handleCrossIn'
  | 'handleCrossOut';

export interface TrianglePatchParams {
  divisions: number;
  /**
   * The 3 triangle corner vertices (Node A, Node B, Node C).
   */
  nodes: [PatchNodeData, PatchNodeData, PatchNodeData];
}

export function isTrianglePatchAssetKind(kind: AssetKind): kind is 'triangle-patch' {
  return kind === 'triangle-patch';
}

export function clonePatchNode(node: PatchNodeData): PatchNodeData {
  return {
    id: node.id,
    name: node.name,
    pos: { ...node.pos },
    handleNext: { ...node.handleNext },
    handlePrev: { ...node.handlePrev },
    handleCrossIn: { ...node.handleCrossIn },
    handleCrossOut: { ...node.handleCrossOut },
  };
}

export function cloneTrianglePatchParams(params: TrianglePatchParams): TrianglePatchParams {
  return {
    divisions: params.divisions,
    nodes: [
      clonePatchNode(params.nodes[0]),
      clonePatchNode(params.nodes[1]),
      clonePatchNode(params.nodes[2]),
    ],
  };
}

/** Shrinks the authored default handles so a freshly placed patch is only gently curved. */
const DEFAULT_HANDLE_LENGTH_SCALE = 0.5;

const NODE_HANDLE_KEYS = ['handleNext', 'handlePrev', 'handleCrossIn', 'handleCrossOut'] as const;

/** Scales every tangent handle's offset from its anchor by `factor`. */
export function scalePatchNodeHandles(node: PatchNodeData, factor: number): PatchNodeData {
  const next = clonePatchNode(node);
  for (const key of NODE_HANDLE_KEYS) {
    next[key] = {
      x: node.pos.x + (node[key].x - node.pos.x) * factor,
      y: node.pos.y + (node[key].y - node.pos.y) * factor,
      z: node.pos.z + (node[key].z - node.pos.z) * factor,
    };
  }
  return next;
}

/**
 * Default initial geometry for a triangle patch.
 */
export function defaultTrianglePatchParams(): TrianglePatchParams {
  const params = authoredTrianglePatchParams();
  return {
    divisions: params.divisions,
    nodes: [
      scalePatchNodeHandles(params.nodes[0], DEFAULT_HANDLE_LENGTH_SCALE),
      scalePatchNodeHandles(params.nodes[1], DEFAULT_HANDLE_LENGTH_SCALE),
      scalePatchNodeHandles(params.nodes[2], DEFAULT_HANDLE_LENGTH_SCALE),
    ],
  };
}

function authoredTrianglePatchParams(): TrianglePatchParams {
  return {
    divisions: 24,
    nodes: [
      {
        id: 'node-a',
        name: 'Node A (Front)',
        pos: { x: 0.0, y: 0.22, z: 0.5 },
        handleNext: { x: 0.0, y: 0.34, z: 0.05 },
        handlePrev: { x: 0.35, y: 0.3, z: 0.3 },
        handleCrossIn: { x: 0.25, y: 0.4, z: 0.35 },
        handleCrossOut: { x: -0.25, y: 0.04, z: 0.65 },
      },
      {
        id: 'node-b',
        name: 'Node B (Back)',
        pos: { x: 0.0, y: 0.48, z: -0.5 },
        handleNext: { x: 0.32, y: 0.42, z: -0.25 },
        handlePrev: { x: 0.0, y: 0.38, z: -0.05 },
        handleCrossIn: { x: 0.2, y: 0.63, z: -0.38 },
        handleCrossOut: { x: -0.2, y: 0.33, z: -0.62 },
      },
      {
        id: 'node-c',
        name: 'Node C (Side)',
        pos: { x: 0.6, y: 0.28, z: 0.0 },
        handleNext: { x: 0.28, y: 0.24, z: 0.25 },
        handlePrev: { x: 0.25, y: 0.34, z: -0.25 },
        handleCrossIn: { x: 0.35, y: 0.5, z: 0.0 },
        handleCrossOut: { x: 0.85, y: 0.06, z: 0.0 },
      },
    ],
  };
}

