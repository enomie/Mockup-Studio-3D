import {
  Color,
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
import { getProceduralMaterialNodes } from './procedural-registry';
import { proceduralProfileSpec } from '../material-spec';

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
  const spec = proceduralProfileSpec(profile);
  const clearcoat = preset.clearcoat ?? spec.clearcoat?.amount.default ?? 0;
  const usePhysical =
    spec.physical ||
    (preset.metalness ?? 0) >= 0.5 ||
    (preset.anisotropy ?? 0) > 0 ||
    clearcoat > 0;

  const material = usePhysical
    ? new MeshPhysicalNodeMaterial({ metalness: preset.metalness ?? 0 })
    : new MeshStandardNodeMaterial({ metalness: preset.metalness ?? 0 });

  material.colorNode = nodes.colorNode;
  if (nodes.normalNode) {
    material.normalNode = nodes.normalNode;
  }
  material.roughnessNode = nodes.roughnessNode;
  material.metalnessNode = float(preset.metalness ?? 0);

  if (nodes.opacityNode) {
    material.transparent = nodes.transparent ?? true;
    material.opacityNode = nodes.opacityNode;
    if (nodes.depthWrite === false) {
      material.depthWrite = false;
    }
  }

  if (material instanceof MeshPhysicalNodeMaterial) {
    applyPhysicalAnisotropy(material, preset);
    if (nodes.sheen && nodes.sheen.amount > 0) {
      const { color, amount, roughness } = nodes.sheen;
      material.sheen = amount;
      material.sheenColor = new Color(color.r, color.g, color.b);
      material.sheenRoughness = roughness;
    }
    if (clearcoat > 0) {
      material.clearcoat = clearcoat;
      material.clearcoatRoughness =
        preset.clearcoatRoughness ?? spec.clearcoat?.roughness.default ?? 0.12;
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
