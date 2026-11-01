import type { AssetEntity, AssetKind } from '@/scene/entity-types';
import type { PatchNode } from '@/scene/patch-nodes';
import type { MaterialEntitySlot } from '@/scene/material-types';

type ArrangementSource = 'builtin' | 'user';

/** One asset of a built-in arrangement, spawned with its kind defaults. */
export interface ArrangementSpawn {
  assetKind: AssetKind;
  /** World-space XZ position (Y from spawn rules unless `positionY`). */
  position: { x: number; z: number };
  /** Foot world Y for foot-pivot kinds (`block`, `fabric-cloth`, …). */
  positionY?: number;
  /** Rotation around the world Y axis in degrees. */
  rotationYDeg?: number;
  screenImageId?: string;
  materialSlot?: MaterialEntitySlot;
  materialId?: string;
}

/**
 * Built-ins describe assets as spawn rules; user arrangements store full entity
 * snapshots (ids are replaced with fresh ones on load).
 */
export type ArrangementContent =
  | { kind: 'spawn'; assets: readonly ArrangementSpawn[] }
  | {
      kind: 'entities';
      entities: readonly AssetEntity[];
      /** Shared patch points used by these entities; absent in arrangements saved before they were stored. */
      patchNodes?: readonly PatchNode[];
    };

export interface ArrangementPreset {
  id: string;
  name: string;
  source: ArrangementSource;
  description?: string;
  createdAt?: string;
  content: ArrangementContent;
}

export function arrangementAssetCount(content: ArrangementContent): number {
  return content.kind === 'spawn' ? content.assets.length : content.entities.length;
}

/** Entities are immutable snapshots, so the arrays can be shared; only the shell is copied. */
export function cloneArrangementPreset(preset: ArrangementPreset): ArrangementPreset {
  const content: ArrangementContent =
    preset.content.kind === 'spawn'
      ? { kind: 'spawn', assets: [...preset.content.assets] }
      : {
          kind: 'entities',
          entities: [...preset.content.entities],
          patchNodes: [...(preset.content.patchNodes ?? [])],
        };
  return { ...preset, content };
}
