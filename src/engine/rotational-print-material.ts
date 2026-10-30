import {
  MeshPhysicalNodeMaterial,
  type Material,
  type MeshStandardNodeMaterial,
  type Node,
  type Texture,
} from 'three/webgpu';
import {
  float,
  frontFacing,
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
  select,
  texture,
  uniform,
  vec3,
} from 'three/tsl';
import type { MaterialPreset } from '@/scene/material-types';
import type { ImageSurfaceSettings } from '@/scene/image-surface';
import type { RotationalPrintSettings } from '@/scene/rotational-print';
import type { RotationalPrintFit } from './rotational-print-mapping';
import { rotationalPrintNodes, printUvNode } from './rotational-print-nodes';

type FloatNode = Node<'float'>;
type Vec2Node = Node<'vec2'>;
type Vec3Node = Node<'vec3'>;
type Vec4Node = Node<'vec4'>;

/** Lacquer on top of the print at gloss 1 (physical materials only). */
const GLOSSY_CLEARCOAT = 1;
const FALLBACK_MATT_ROUGHNESS = 0.92;
const FALLBACK_GLOSSY_ROUGHNESS = 0.15;
const FALLBACK_LACQUER_ROUGHNESS = 0.1;
const PAPER_BACK_FALLBACK = { r: 0.96, g: 0.95, b: 0.92 };
const UNIFORMS_KEY = 'rotationalPrintUniforms';

type FloatUniform = ReturnType<typeof createFloatUniform>;

function createFloatUniform(value: number) {
  return uniform(value, 'float');
}

interface RotationalPrintUniforms {
  substrate: FloatUniform;
  inkOpacity: FloatUniform;
  gloss: FloatUniform;
}

export interface RotationalPrintInput {
  /** Fresh, unshared body material (never a resolver cache entry: its nodes are replaced). */
  baseMaterial: MeshStandardNodeMaterial | MeshPhysicalNodeMaterial;
  texture: Texture;
  fit: RotationalPrintFit;
  surface: ImageSurfaceSettings;
  /** Print matt / print glossy presets: roughness at gloss 0 / 1, lacquer roughness, paper back color. */
  mattPreset: MaterialPreset | null;
  glossyPreset: MaterialPreset | null;
  /** Initial values; later changes go through `updateRotationalPrintMaterial` (no rebuild). */
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
 *   result = mix(base, mix(paper, direct, substrate), mask), lacquer (gloss) on the print
 *
 * Substrate, ink opacity and gloss are uniforms: sliders update them in place.
 *
 * Wraps the base nodes instead of replacing them, so solid, procedural (brushed metal,
 * grain) and transmission presets keep their look outside the print and under direct print.
 * Render state (transparent, depthWrite, side) is left as the base material set it.
 */
export function createRotationalPrintMaterial(
  input: RotationalPrintInput,
): MeshPhysicalNodeMaterial {
  const material = toPhysicalMaterial(input.baseMaterial);
  const uniforms: RotationalPrintUniforms = {
    substrate: createFloatUniform(clamp01(input.settings.substrate)),
    inkOpacity: createFloatUniform(clamp01(input.settings.inkOpacity)),
    gloss: createFloatUniform(clamp01(input.settings.gloss)),
  };
  material.userData[UNIFORMS_KEY] = uniforms;
  const substrate = uniforms.substrate as unknown as FloatNode;
  const paperWeight = float(1).sub(substrate);
  const gloss = uniforms.gloss as unknown as FloatNode;

  const { sampleUv, inBandMask } = rotationalPrintNodes(
    input.fit,
    input.bandUv ?? printUvNode(),
  );
  const ink = texture(input.texture, sampleUv) as unknown as Vec4Node;
  const mask = inBandMask
    .mul(ink.a)
    .mul(uniforms.inkOpacity as unknown as FloatNode) as FloatNode;

  const baseColor = (material.colorNode ?? materialColor) as Vec3Node;
  const baseRoughness = (material.roughnessNode ?? materialRoughness) as FloatNode;
  const baseMetalness = (material.metalnessNode ?? materialMetalness) as FloatNode;
  const baseClearcoat = (material.clearcoatNode ?? materialClearcoat) as FloatNode;
  const baseClearcoatRoughness = (material.clearcoatRoughnessNode ??
    materialClearcoatRoughness) as FloatNode;

  const inkRgb = ink.rgb as Vec3Node;
  // Back faces (seen through glass) show the blank paper back; direct ink stays visible.
  const paperBack = input.mattPreset?.color ?? PAPER_BACK_FALLBACK;
  const paperColor = select(
    frontFacing,
    inkRgb,
    vec3(paperBack.r, paperBack.g, paperBack.b),
  ) as Vec3Node;
  const printColor = mix(paperColor, baseColor.mul(inkRgb), substrate);
  material.colorNode = mix(baseColor, printColor, mask);

  const paperRoughness = mix(
    float(input.mattPreset?.roughness ?? FALLBACK_MATT_ROUGHNESS),
    float(input.glossyPreset?.roughness ?? FALLBACK_GLOSSY_ROUGHNESS),
    gloss,
  );
  const printRoughness = mix(paperRoughness, baseRoughness, substrate);
  material.roughnessNode = mix(baseRoughness, printRoughness, mask);
  material.metalnessNode = mix(baseMetalness, baseMetalness.mul(substrate), mask);

  // Paper hides the body relief (brushing, grain, glass ripple); direct print keeps it.
  if (material.normalNode) {
    const relief = float(1).sub(mask.mul(paperWeight));
    material.normalNode = normalize(mix(normalView, material.normalNode as Vec3Node, relief));
  }

  // Gloss = lacquer over the printed area; elsewhere the base clearcoat stays.
  const lacquer = gloss.mul(GLOSSY_CLEARCOAT);
  const lacquerRoughness = float(
    input.glossyPreset?.clearcoatRoughness ?? FALLBACK_LACQUER_ROUGHNESS,
  );
  material.clearcoatNode = mix(baseClearcoat, lacquer.max(baseClearcoat), mask);
  material.clearcoatRoughnessNode = mix(
    baseClearcoatRoughness,
    mix(baseClearcoatRoughness, lacquerRoughness, gloss),
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

/** Push new slider values into a print material. Returns false if it is not one. */
export function updateRotationalPrintMaterial(
  material: Material,
  settings: RotationalPrintSettings,
): boolean {
  const uniforms = material.userData[UNIFORMS_KEY] as RotationalPrintUniforms | undefined;
  if (!uniforms) {return false;}
  uniforms.substrate.value = clamp01(settings.substrate);
  uniforms.inkOpacity.value = clamp01(settings.inkOpacity);
  uniforms.gloss.value = clamp01(settings.gloss);
  return true;
}
