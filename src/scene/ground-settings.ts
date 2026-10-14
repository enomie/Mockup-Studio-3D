import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import { MATERIAL_PAPER_ID, migrateMaterialId } from './material-ids';
import type { GroundSettings } from './scene-api';

/** Legacy scene / environment payloads before ground.materialId. */
export interface LegacyGroundPayload {
  visible?: boolean;
  materialId?: string;
  receiveShadow?: boolean;
  mirrorEnabled?: boolean;
  mirrorOpacity?: number;
  color?: { r: number; g: number; b: number };
  roughness?: number;
  metalness?: number;
  opacity?: number;
  emissiveColor?: { r: number; g: number; b: number };
  emissiveIntensity?: number;
}

export function normalizeGroundSettings(
  input: LegacyGroundPayload | GroundSettings | null | undefined,
): GroundSettings {
  const defaults = SCENE_DEFAULTS.ground;
  const rawId =
    typeof input?.materialId === 'string' && input.materialId.length > 0
      ? input.materialId
      : MATERIAL_PAPER_ID;

  return {
    visible: input?.visible ?? defaults.visible,
    materialId: migrateMaterialId(rawId),
    receiveShadow: input?.receiveShadow ?? defaults.receiveShadow,
    mirrorEnabled: input?.mirrorEnabled ?? defaults.mirrorEnabled,
    mirrorOpacity: input?.mirrorOpacity ?? defaults.mirrorOpacity,
  };
}
