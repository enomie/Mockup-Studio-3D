import { MeshPhysicalNodeMaterial, type MeshStandardNodeMaterial, type Node, type Texture } from 'three/webgpu';
import {
  float,
  materialClearcoat,
  materialClearcoatRoughness,
  materialColor,
  materialMetalness,
  materialOpacity,
  materialRoughness,
  materialTransmission,
  mix,
  normalView,
  normalize,
  texture,
} from 'three/tsl';
import type { MaterialPreset } from '@/scene/material-types';
import type { ImageSurfaceSettings } from '@/scene/image-surface';
import type { RotationalPrintFit } from './rotational-print-mapping';
import { rotationalPrintNodes, printUvNode } from './rotational-print-nodes';

type FloatNode = Node<'float'>;
type Vec2Node = Node<'vec2'>;
type Vec3Node = Node<'vec3'>;
type Vec4Node = Node<'vec4'>;

/** Lacquer on top of the print for the glossy finish (physical materials only). */
const GLOSSY_CLEARCOAT = 1;
const FALLBACK_FINISH_ROUGHNESS = 0.35;

export interface RotationalPrintSettings {
  /** 0 = opaque paper label, 1 = direct print (multiply on the body material). */
  substrate: number;
  /** Scales the PNG alpha (0 = no ink). */
  inkOpacity: number;
}

export interface RotationalPrintInput {
  /** Fresh, unshared body material (never a resolver cache entry: its nodes are replaced). */
  baseMaterial: MeshStandardNodeMaterial | MeshPhysicalNodeMaterial;
  texture: Texture;
  fit: RotationalPrintFit;
  surface: ImageSurfaceSettings;
  /** Preset behind `surface.finish` (paper or glossy print); supplies roughness and lacquer. */
  finishPreset: MaterialPreset | null;
  settings: RotationalPrintSettings;
  /** Defaults to the `printUv` attribute. */
  bandUv?: Vec2Node;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Standard materials have no clearcoat or transmission slots; rebuild as physical. */
function toPhysicalMaterial(
  material: MeshStandardNodeMaterial | MeshPhysicalNodeMaterial,
): MeshPhysicalNodeMaterial {
  if (material instanceof MeshPhysicalNodeMaterial) {
    return material;
  }
  const physical = new MeshPhysicalNodeMaterial({
    color: material.color,
    roughness: material.roughness,
    metalness: material.metalness,
    opacity: material.opacity,
    transparent: material.transparent,
    depthWrite: material.depthWrite,
    side: material.side,
  });
  physical.colorNode = material.colorNode;
  physical.roughnessNode = material.roughnessNode;
  physical.metalnessNode = material.metalnessNode;
  physical.normalNode = material.normalNode;
  physical.opacityNode = material.opacityNode;
  physical.emissiveNode = material.emissiveNode;
  physical.name = material.name;
  material.dispose();
  return physical;
}

/**
 * Print an image into the body material of a rotational asset. Per pixel:
 *
 *   mask   = inBand × pngAlpha × inkOpacity
 *   paper  = { png.rgb, metalness 0, finish roughness, no transmission, flat normal }
 *   direct = { base.color × png.rgb, base metalness/roughness/normal/transmission }
 *   result = mix(base, mix(paper, direct, substrate), mask), finish lacquer on the print
 *
 * Wraps the base nodes instead of replacing them, so solid, procedural (brushed metal,
 * grain) and transmission presets keep their look outside the print and under direct print.
 * Render state (transparent, depthWrite, side) is left as the base material set it.
 */
export function createRotationalPrintMaterial(
  input: RotationalPrintInput,
): MeshPhysicalNodeMaterial {
  const material = toPhysicalMaterial(input.baseMaterial);
  const substrate = float(clamp01(input.settings.substrate));
  const paperWeight = float(1 - clamp01(input.settings.substrate));

  const { sampleUv, inBandMask } = rotationalPrintNodes(
    input.fit,
    input.bandUv ?? printUvNode(),
  );
  const ink = texture(input.texture, sampleUv) as unknown as Vec4Node;
  const mask = inBandMask
    .mul(ink.a)
    .mul(float(clamp01(input.settings.inkOpacity))) as FloatNode;

  const baseColor = (material.colorNode ?? materialColor) as Vec3Node;
  const baseRoughness = (material.roughnessNode ?? materialRoughness) as FloatNode;
  const baseMetalness = (material.metalnessNode ?? materialMetalness) as FloatNode;
  const baseClearcoat = (material.clearcoatNode ?? materialClearcoat) as FloatNode;
  const baseClearcoatRoughness = (material.clearcoatRoughnessNode ??
    materialClearcoatRoughness) as FloatNode;

  const inkRgb = ink.rgb as Vec3Node;
  const printColor = mix(inkRgb, baseColor.mul(inkRgb), substrate);
  material.colorNode = mix(baseColor, printColor, mask);

  const finishRoughness = float(input.finishPreset?.roughness ?? FALLBACK_FINISH_ROUGHNESS);
  const printRoughness = mix(finishRoughness, baseRoughness, substrate);
  material.roughnessNode = mix(baseRoughness, printRoughness, mask);
  material.metalnessNode = mix(baseMetalness, baseMetalness.mul(substrate), mask);

  // Paper hides the body relief (brushing, grain, glass ripple); direct print keeps it.
  if (material.normalNode) {
    const relief = float(1).sub(mask.mul(paperWeight));
    material.normalNode = normalize(mix(normalView, material.normalNode as Vec3Node, relief));
  }

  // Finish = lacquer over the printed area; elsewhere the base clearcoat stays.
  const isGlossy = input.surface.finish === 'glossy';
  const lacquer = float(isGlossy ? GLOSSY_CLEARCOAT : 0);
  const lacquerRoughness = float(input.finishPreset?.clearcoatRoughness ?? 0.1);
  material.clearcoatNode = mix(baseClearcoat, lacquer.max(baseClearcoat), mask);
  material.clearcoatRoughnessNode = mix(
    baseClearcoatRoughness,
    isGlossy ? lacquerRoughness : baseClearcoatRoughness,
    mask,
  );

  // Glass: paper blocks transmission and is opaque; direct print tints the glass.
  if (material.transmission > 0 || material.transmissionNode) {
    const baseTransmission = (material.transmissionNode ?? materialTransmission) as FloatNode;
    material.transmissionNode = mix(baseTransmission, baseTransmission.mul(substrate), mask);
  }
  if (material.transparent) {
    const baseOpacity = (material.opacityNode ?? materialOpacity) as FloatNode;
    material.opacityNode = mix(baseOpacity, mix(float(1), baseOpacity, substrate), mask);
  }

  if (input.surface.emissiveEnabled) {
    material.emissiveNode = printColor
      .mul(mask)
      .mul(float(input.surface.emissiveIntensity));
  }

  return material;
}
