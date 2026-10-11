import { uniform } from 'three/tsl';

/** Runtime-updatable float uniform for TSL node materials. */
export function createFloatUniform(initial: number) {
  return uniform(initial);
}

export function setUniformFloat(uniformNode: { value: number }, value: number): void {
  uniformNode.value = value;
}
