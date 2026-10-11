import {
  MeshPhysicalNodeMaterial,
  MeshStandardNodeMaterial,
} from 'three/webgpu';
import { float } from 'three/tsl';
import type { MaterialPreset } from '@/scene/material-types';
import type { Rgb } from '@/colors/rgb';
import {
  proceduralParamsFromPreset,
  type ProceduralResolveOptions,
} from './procedural-params';
import { normalizeProceduralProfile } from './procedural-profile';
import {
  getProceduralMaterialNodes,
  isMetalProceduralProfile,
  isWoodProceduralProfile,
} from './procedural-registry';

const WOOD_CLEARCOAT = 0.08;
const WOOD_CLEARCOAT_ROUGHNESS = 0.35;

export function createTexturedMaterial(
  preset: MaterialPreset,
  tint?: Rgb,
  options: ProceduralResolveOptions = {},
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  if (!preset.proceduralProfile) {
    throw new Error(`Textured material preset missing proceduralProfile: ${preset.id}`);
  }

  const profile = normalizeProceduralProfile(preset.proceduralProfile);
  const params = proceduralParamsFromPreset(preset, tint, options);
  const nodes = getProceduralMaterialNodes(profile, params);
  const usePhysical =
    isMetalProceduralProfile(profile) ||
    isWoodProceduralProfile(profile) ||
    (preset.metalness ?? 0) >= 0.5 ||
    (preset.anisotropy ?? 0) > 0;

  const material = usePhysical
    ? new MeshPhysicalNodeMaterial({ metalness: preset.metalness ?? 0 })
    : new MeshStandardNodeMaterial({ metalness: preset.metalness ?? 0 });

  material.colorNode = nodes.colorNode;
  if (nodes.normalNode) {
    material.normalNode = nodes.normalNode;
  }
  material.roughnessNode = nodes.roughnessNode;
  material.metalnessNode = float(preset.metalness ?? 0);

  if (material instanceof MeshPhysicalNodeMaterial) {
    applyPhysicalAnisotropy(material, preset);
    if (isWoodProceduralProfile(profile)) {
      material.clearcoat = WOOD_CLEARCOAT;
      material.clearcoatRoughness = WOOD_CLEARCOAT_ROUGHNESS;
    }
  }

  return material;
}

function applyPhysicalAnisotropy(
  material: MeshPhysicalNodeMaterial,
  preset: MaterialPreset,
): void {
  const amount = preset.anisotropy ?? 0;
  const userRotationRad = ((preset.anisotropyRotation ?? 0) * Math.PI) / 180;

  material.anisotropy = amount;
  material.anisotropyRotation = userRotationRad;
}
