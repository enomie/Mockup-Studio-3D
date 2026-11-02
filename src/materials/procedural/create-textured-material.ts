import {
  MeshPhysicalNodeMaterial,
  MeshStandardNodeMaterial,
} from 'three/webgpu';
import { TINT_NEUTRAL, type MaterialPreset } from '@/scene/material-types';
import { multiplyRgb, type Rgb } from '@/colors/rgb';
import { tagPresetMaterial } from '../live-material';
import { updateProceduralUniforms } from './procedural-uniforms';
import {
  proceduralParamsFromPreset,
  proceduralUniformValuesFromPreset,
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
  if (nodes.anisotropyNode && material instanceof MeshPhysicalNodeMaterial) {
    material.anisotropyNode = nodes.anisotropyNode;
  }

  if (nodes.opacityNode) {
    material.transparent = nodes.transparent ?? true;
    material.opacityNode = nodes.opacityNode;
    if (nodes.depthWrite === false) {
      material.depthWrite = false;
    }
  }

  const applyValues = (next: MaterialPreset): void => {
    updateProceduralUniforms(params.uniforms, proceduralUniformValuesFromPreset(next, tint));
    applyTexturedMaterialValues(material, next, tint);
  };
  applyValues(preset);
  tagPresetMaterial(material, preset.id, applyValues);

  return material;
}

/** Material-level values (no shader change); also used for live updates. */
function applyTexturedMaterialValues(
  material: MeshStandardNodeMaterial | MeshPhysicalNodeMaterial,
  preset: MaterialPreset,
  tint: Rgb | undefined,
): void {
  material.metalness = preset.metalness ?? 0;
  if (!(material instanceof MeshPhysicalNodeMaterial) || !preset.proceduralProfile) {return;}

  const spec = proceduralProfileSpec(normalizeProceduralProfile(preset.proceduralProfile));
  applyPhysicalAnisotropy(material, preset);

  const clearcoat = preset.clearcoat ?? spec.clearcoat?.amount.default ?? 0;
  material.clearcoat = clearcoat;
  material.clearcoatRoughness =
    preset.clearcoatRoughness ?? spec.clearcoat?.roughness.default ?? 0.12;

  const sheen = preset.sheen ?? spec.sheen?.amount.default ?? 0;
  material.sheen = sheen;
  material.sheenRoughness = preset.sheenRoughness ?? spec.sheen?.roughness.default ?? 0.5;
  const sheenColor = multiplyRgb(preset.color ?? { r: 0.8, g: 0.8, b: 0.8 }, tint ?? TINT_NEUTRAL);
  material.sheenColor.setRGB(sheenColor.r, sheenColor.g, sheenColor.b);
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
