import type { BufferAttribute, BufferGeometry } from 'three/webgpu';

/** LatheGeometry: vertex index = phiIndex * profileCount + profileIndex */
type LatheVertexLayout = 'phiMajor' | 'profileMajor';

type LatheSeamContext = {
  radialSegments: number;
  profileCount: number;
  layout: LatheVertexLayout;
};

function latheVertexIndex(
  phiIndex: number,
  profileIndex: number,
  radialSegments: number,
  profileCount: number,
  layout: LatheVertexLayout,
): number {
  const phiCount = radialSegments + 1;
  if (layout === 'phiMajor') {
    return phiIndex * profileCount + profileIndex;
  }
  return profileIndex * phiCount + phiIndex;
}

function seamColumnsCoincide(
  position: BufferAttribute,
  radialSegments: number,
  profileCount: number,
  layout: LatheVertexLayout,
  epsilon = 1e-5,
): boolean {
  for (let j = 0; j < profileCount; j += 1) {
    const i0 = latheVertexIndex(0, j, radialSegments, profileCount, layout);
    const i1 = latheVertexIndex(radialSegments, j, radialSegments, profileCount, layout);
    const dist = Math.hypot(
      position.getX(i0) - position.getX(i1),
      position.getY(i0) - position.getY(i1),
      position.getZ(i0) - position.getZ(i1),
    );
    if (dist > epsilon) {
      return false;
    }
  }
  return true;
}

function detectLatheVertexLayout(
  position: BufferAttribute,
  radialSegments: number,
  profileCount: number,
): LatheVertexLayout | null {
  if (seamColumnsCoincide(position, radialSegments, profileCount, 'phiMajor')) {
    return 'phiMajor';
  }
  if (seamColumnsCoincide(position, radialSegments, profileCount, 'profileMajor')) {
    return 'profileMajor';
  }
  return null;
}

function resolveLatheSeamContext(
  geometry: BufferGeometry,
  radialSegments: number,
  profilePointCount: number,
): LatheSeamContext | null {
  const position = geometry.getAttribute('position') as BufferAttribute | null;
  if (!position || radialSegments < 1) {
    return null;
  }

  const phiCount = radialSegments + 1;
  if (position.count % phiCount !== 0) {
    return null;
  }

  const rowsFromGeometry = position.count / phiCount;
  const profileCount =
    profilePointCount > 0 && profilePointCount === rowsFromGeometry
      ? profilePointCount
      : rowsFromGeometry;
  if (profileCount < 1) {
    return null;
  }

  const layout = detectLatheVertexLayout(position, radialSegments, profileCount);
  if (!layout) {
    return null;
  }

  return { radialSegments, profileCount, layout };
}

/**
 * Remap indices so φ₂π column shares φ₀ vertices (removes T-junction cracks at the seam).
 */
export function weldLathePhiSeamIndices(
  geometry: BufferGeometry,
  radialSegments: number,
  profilePointCount: number,
): void {
  const index = geometry.getIndex();
  const ctx = resolveLatheSeamContext(geometry, radialSegments, profilePointCount);
  if (!index || !ctx) {
    return;
  }

  const { radialSegments: segments, profileCount, layout } = ctx;
  for (let j = 0; j < profileCount; j += 1) {
    const lastCol = latheVertexIndex(segments, j, segments, profileCount, layout);
    const firstCol = latheVertexIndex(0, j, segments, profileCount, layout);
    if (lastCol === firstCol) {
      continue;
    }
    for (let i = 0; i < index.count; i += 1) {
      if (index.getX(i) === lastCol) {
        index.setX(i, firstCol);
      }
    }
  }
  index.needsUpdate = true;
}

function normalize3(x: number, y: number, z: number): [number, number, number] {
  const len = Math.hypot(x, y, z);
  if (len < 1e-20) {
    return [0, 1, 0];
  }
  return [x / len, y / len, z / len];
}

/**
 * Average normals at φ₀ and φ₂π seam columns (duplicate positions).
 */
export function weldLathePhiSeamNormals(
  geometry: BufferGeometry,
  radialSegments: number,
  profilePointCount: number,
): void {
  const normal = geometry.getAttribute('normal') as BufferAttribute | null;
  const ctx = resolveLatheSeamContext(geometry, radialSegments, profilePointCount);
  if (!normal || !ctx) {
    return;
  }
  if (normal.count !== geometry.getAttribute('position')?.count) {
    return;
  }

  const { radialSegments: segments, profileCount, layout } = ctx;
  for (let j = 0; j < profileCount; j += 1) {
    const i0 = latheVertexIndex(0, j, segments, profileCount, layout);
    const i1 = latheVertexIndex(segments, j, segments, profileCount, layout);
    const nx = normal.getX(i0) + normal.getX(i1);
    const ny = normal.getY(i0) + normal.getY(i1);
    const nz = normal.getZ(i0) + normal.getZ(i1);
    const [wx, wy, wz] = normalize3(nx, ny, nz);
    normal.setXYZ(i0, wx, wy, wz);
    normal.setXYZ(i1, wx, wy, wz);
  }
  normal.needsUpdate = true;
}

/** Index weld, then vertex normals (single seam column in the draw). */
export function weldLathePhiSeam(
  geometry: BufferGeometry,
  radialSegments: number,
  profilePointCount: number,
): void {
  weldLathePhiSeamIndices(geometry, radialSegments, profilePointCount);
  geometry.computeVertexNormals();
  weldLathePhiSeamNormals(geometry, radialSegments, profilePointCount);
}
