import type RAPIER from '@dimforge/rapier3d-simd-compat';
import { Vector3, type BufferGeometry, type Mesh } from 'three/webgpu';

export interface RapierSoftBodyEdge {
  particleA: number;
  particleB: number;
  restLength: number;
}

/** Rapier stores all edge endpoint pairs in one flat buffer. */
export function iterRapierSoftBodyEdges(softBody: RAPIER.SoftBody): RapierSoftBodyEdge[] {
  const pairs = softBody.edges();
  const count = softBody.numEdges();
  const edges: RapierSoftBodyEdge[] = [];
  for (let edgeIndex = 0; edgeIndex < count; edgeIndex++) {
    edges.push({
      particleA: pairs[edgeIndex * 2],
      particleB: pairs[edgeIndex * 2 + 1],
      restLength: softBody.edgeRestLength(edgeIndex),
    });
  }
  return edges;
}

export function fabricClothGridNeighborDelta(
  particleA: number,
  particleB: number,
  nu: number,
  nv: number,
): { du: number; dv: number } | null {
  const uA = Math.floor(particleA / nv);
  const vA = particleA % nv;
  const uB = Math.floor(particleB / nv);
  const vB = particleB % nv;
  if (uA < 0 || uB < 0 || uA >= nu || uB >= nu || vA < 0 || vB < 0 || vA >= nv || vB >= nv) {
    return null;
  }
  const du = uB - uA;
  const dv = vB - vA;
  if (du === 0 && dv === 0) {
    return null;
  }
  return { du, dv };
}

/** Rapier cloth sim edge (structural, shear, or bend — up to 2 quads apart on the grid). */
export function isRapierClothSimEdge(
  particleA: number,
  particleB: number,
  nu: number,
  nv: number,
): boolean {
  const delta = fabricClothGridNeighborDelta(particleA, particleB, nu, nv);
  if (!delta) {return false;}
  const adu = Math.abs(delta.du);
  const adv = Math.abs(delta.dv);
  if (adu === 0 && adv === 0) {return false;}
  return adu <= 2 && adv <= 2;
}

/** Render / structural edge: axis or single-quad diagonal (matches PlaneGeometry index edges). */
export function isRapierClothRenderGridEdge(
  particleA: number,
  particleB: number,
  nu: number,
  nv: number,
): boolean {
  const delta = fabricClothGridNeighborDelta(particleA, particleB, nu, nv);
  if (!delta) {return false;}
  const { du, dv } = delta;
  const adu = Math.abs(du);
  const adv = Math.abs(dv);
  return adu + adv === 1 || (adu === 1 && adv === 1);
}

export function maxRapierEdgeStretchRatio(softBody: RAPIER.SoftBody): number {
  let maxRatio = 1;
  for (const edge of iterRapierSoftBodyEdges(softBody)) {
    const pa = softBody.particlePosition(edge.particleA);
    const pb = softBody.particlePosition(edge.particleB);
    const dist = Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z);
    if (edge.restLength > 1e-9) {
      maxRatio = Math.max(maxRatio, dist / edge.restLength);
    }
  }
  return maxRatio;
}

const _a = new Vector3();

export function maxIndexedTriangleEdgeStretchRatio(
  geometry: BufferGeometry,
  restPositions: Float32Array,
): number {
  const index = geometry.index;
  const positions = geometry.getAttribute('position').array as Float32Array;
  if (!index) {return 1;}

  const dist = (i: number, j: number, buf: Float32Array): number => {
    const ia = i * 3;
    const ib = j * 3;
    return Math.hypot(buf[ia] - buf[ib], buf[ia + 1] - buf[ib + 1], buf[ia + 2] - buf[ib + 2]);
  };

  let maxRatio = 1;
  const indices = index.array;
  for (let t = 0; t < indices.length; t += 3) {
    for (const [ea, eb] of [[0, 1], [1, 2], [2, 0]] as const) {
      const i = indices[t + ea];
      const j = indices[t + eb];
      const rest = dist(i, j, restPositions);
      if (rest < 1e-9) {continue;}
      maxRatio = Math.max(maxRatio, dist(i, j, positions) / rest);
    }
  }
  return maxRatio;
}

/** After sync: rendered vertex world positions should match Rapier particles. */
export function maxParticleToVertexWorldError(
  softBody: RAPIER.SoftBody,
  mesh: Mesh,
  particleToVertex: Uint32Array,
): number {
  mesh.updateWorldMatrix(true, true);
  const matrixWorld = mesh.matrixWorld;
  const positions = mesh.geometry.getAttribute('position').array as Float32Array;
  let maxErr = 0;
  const count = softBody.numParticles();
  for (let particleIndex = 0; particleIndex < count; particleIndex++) {
    const vertexIndex = particleToVertex[particleIndex];
    const o = vertexIndex * 3;
    _a.set(positions[o], positions[o + 1], positions[o + 2]).applyMatrix4(matrixWorld);
    const p = softBody.particlePosition(particleIndex);
    maxErr = Math.max(maxErr, Math.hypot(_a.x - p.x, _a.y - p.y, _a.z - p.z));
  }
  return maxErr;
}
