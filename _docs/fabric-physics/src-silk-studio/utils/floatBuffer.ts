export function vec3Get(arr: Float32Array, vertexIndex: number): [number, number, number] {
  const base = vertexIndex * 3;
  const x = arr[base];
  const y = arr[base + 1];
  const z = arr[base + 2];
  if (x === undefined || y === undefined || z === undefined) {
    throw new RangeError(`vec3Get out of bounds at vertex ${String(vertexIndex)}`);
  }
  return [x, y, z];
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
  const x = arr[baseIndex];
  const y = arr[baseIndex + 1];
  const z = arr[baseIndex + 2];
  if (x === undefined || y === undefined || z === undefined) {
    throw new RangeError(`vec3GetAt out of bounds at ${String(baseIndex)}`);
  }
  return [x, y, z];
}
