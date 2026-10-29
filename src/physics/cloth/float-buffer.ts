export function vec3Get(arr: Float32Array, vertexIndex: number): [number, number, number] {
  const base = vertexIndex * 3;
  return [arr[base], arr[base + 1], arr[base + 2]];
}

export function vec3Set(
  arr: Float32Array,
  vertexIndex: number,
  x: number,
  y: number,
  z: number,
): void {
  const base = vertexIndex * 3;
  arr[base] = x;
  arr[base + 1] = y;
  arr[base + 2] = z;
}

export function vec3GetAt(arr: Float32Array, baseIndex: number): [number, number, number] {
  return [arr[baseIndex], arr[baseIndex + 1], arr[baseIndex + 2]];
}
