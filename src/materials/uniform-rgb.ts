import { Vector3 } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { rgbToColor, type Rgb } from '@/colors/rgb';

/** Runtime-updatable vec3 uniform — pass a Vector3, not a TSL vec3 node. */
export function createRgbUniform(initial: Rgb) {
  const c = rgbToColor(initial);
  return uniform(new Vector3(c.r, c.g, c.b));
}

export function setUniformRgb(uniformNode: { value: Vector3 }, rgb: Rgb): void {
  const c = rgbToColor(rgb);
  uniformNode.value.set(c.r, c.g, c.b);
}
