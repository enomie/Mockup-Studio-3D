import { DoubleSide, MeshStandardNodeMaterial } from 'three/webgpu';
import { float, mix, reflectView, sin, step, vec3, vec4 } from 'three/tsl';
import type { Rgb } from '@/colors/rgb';
import type { MaterialPreset } from '@/scene/material-types';

export const DEFAULT_ZEBRA_STRIPE_SCALE = 16;
const ZEBRA_DARK = 0.05;
const ZEBRA_LIGHT = 0.95;
const DEFAULT_WIREFRAME_COLOR: Rgb = { r: 0x38 / 255, g: 0xbd / 255, b: 0xf8 / 255 };

/**
 * Zebra reflection stripes: the view vector is reflected at the surface normal and
 * its vertical component drives black/white bands. Kinks and curvature jumps show
 * up as broken or bent stripes. Unlit — `outputNode` bypasses scene lighting.
 */
export function createZebraMaterial(preset: MaterialPreset): MeshStandardNodeMaterial {
  const material = new MeshStandardNodeMaterial();
  const scale = float(preset.stripeScale ?? DEFAULT_ZEBRA_STRIPE_SCALE);
  const band = step(float(0), sin(reflectView.y.mul(scale)));
  material.outputNode = vec4(vec3(mix(float(ZEBRA_DARK), float(ZEBRA_LIGHT), band)), float(1));
  material.side = DoubleSide;
  return material;
}

/** Unlit triangle-mesh wireframe in a flat color. */
export function createWireframeMaterial(preset: MaterialPreset, tint?: Rgb): MeshStandardNodeMaterial {
  const base = preset.color ?? DEFAULT_WIREFRAME_COLOR;
  const color = tint ? { r: base.r * tint.r, g: base.g * tint.g, b: base.b * tint.b } : base;
  const material = new MeshStandardNodeMaterial({ wireframe: true });
  material.outputNode = vec4(vec3(color.r, color.g, color.b), float(1));
  material.side = DoubleSide;
  return material;
}

export function createAnalysisMaterial(preset: MaterialPreset, tint?: Rgb): MeshStandardNodeMaterial {
  return preset.analysisMode === 'wireframe'
    ? createWireframeMaterial(preset, tint)
    : createZebraMaterial(preset);
}
