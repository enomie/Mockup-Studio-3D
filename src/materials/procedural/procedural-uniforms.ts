import { Color } from 'three/webgpu';
import { uniform } from 'three/tsl';
import type { Rgb } from '@/colors/rgb';

/** Default grid line color when a preset has none. */
export const DEFAULT_PROCEDURAL_LINE_COLOR: Rgb = { r: 0.72, g: 0.78, b: 0.88 };

/**
 * Values a procedural shader reads at render time. Updating `.value` changes
 * the look without rebuilding the material or recompiling its shader.
 */
function colorUniform(rgb: Rgb) {
  return uniform(new Color(rgb.r, rgb.g, rgb.b));
}

function floatUniform(value: number) {
  return uniform(value);
}

export interface ProceduralUniforms {
  color: ReturnType<typeof colorUniform>;
  lineColor: ReturnType<typeof colorUniform>;
  roughness: ReturnType<typeof floatUniform>;
  anisotropy: ReturnType<typeof floatUniform>;
}

export interface ProceduralUniformValues {
  color: Rgb;
  lineColor?: Rgb;
  roughness: number;
  anisotropy: number;
}

export function createProceduralUniforms(values: ProceduralUniformValues): ProceduralUniforms {
  const lineColor = values.lineColor ?? DEFAULT_PROCEDURAL_LINE_COLOR;
  return {
    color: colorUniform(values.color),
    lineColor: colorUniform(lineColor),
    roughness: floatUniform(values.roughness),
    anisotropy: floatUniform(values.anisotropy),
  };
}

export function updateProceduralUniforms(
  uniforms: ProceduralUniforms,
  values: ProceduralUniformValues,
): void {
  const lineColor = values.lineColor ?? DEFAULT_PROCEDURAL_LINE_COLOR;
  uniforms.color.value.setRGB(values.color.r, values.color.g, values.color.b);
  uniforms.lineColor.value.setRGB(lineColor.r, lineColor.g, lineColor.b);
  uniforms.roughness.value = values.roughness;
  uniforms.anisotropy.value = values.anisotropy;
}
