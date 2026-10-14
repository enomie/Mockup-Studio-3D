import { describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-simd-compat';
import { Mesh, PlaneGeometry } from 'three';
import { FIXED_TIMESTEP } from './constants';
import {
  fabricClothGridNeighborDelta,
  isRapierClothRenderGridEdge,
  isRapierClothSimEdge,
  iterRapierSoftBodyEdges,
  maxIndexedTriangleEdgeStretchRatio,
  maxParticleToVertexWorldError,
  maxRapierEdgeStretchRatio,
} from './fabric-cloth-connectivity';
import { ensureRapierInit } from './rapier-init';
import { resolveFabricDrape } from './fabric-cloth-drape';
import {
  fabricClothParticleCounts,
  fabricClothVertexToParticleIndex,
  prepareFabricClothSimSession,
  syncFabricClothMeshFromSoftBody,
} from './fabric-cloth-soft-body';

const SILK_DRAPE = resolveFabricDrape('material-silk');

const MAX_RAPIER_EDGE_STRETCH_AFTER_DROP = 1.08;
const MAX_RENDER_EDGE_STRETCH_AFTER_DROP = 1.15;

function rotatedClothMesh(width: number, height: number, segmentsW: number, segmentsH: number) {
  const geometry = new PlaneGeometry(width, height, segmentsW, segmentsH);
  const mesh = new Mesh(geometry);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.5;
  mesh.userData.assetMeshRole = 'fabricCloth';
  return mesh;
}

function simulateDrop(mesh: Mesh, steps: number) {
  const { session, desc } = prepareFabricClothSimSession(mesh, SILK_DRAPE);
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.integrationParameters.dt = FIXED_TIMESTEP;
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(2, 0.05, 2).setTranslation(0, -0.05, 0),
  );
  const softBody = world.softBodies.createSoftBody(
    world.bodies,
    world.colliders,
    desc,
  );
  for (let i = 0; i < steps; i++) {world.step();}
  return { softBody, session };
}

describe('fabricClothConnectivity', () => {
  it('Rapier sim edges lie on the particle grid', async () => {
    await ensureRapierInit();
    const segmentsW = 6;
    const segmentsH = 4;
    const { nu, nv } = fabricClothParticleCounts({ segmentsW, segmentsH });
    const mesh = rotatedClothMesh(0.4, 0.28, segmentsW, segmentsH);
    const { softBody } = simulateDrop(mesh, 0);
    for (const edge of iterRapierSoftBodyEdges(softBody)) {
      expect(isRapierClothSimEdge(edge.particleA, edge.particleB, nu, nv)).toBe(true);
      expect(
        fabricClothGridNeighborDelta(edge.particleA, edge.particleB, nu, nv),
      ).not.toBeNull();
    }
  });

  it('render triangle edges match structural grid edges', async () => {
    await ensureRapierInit();
    const segmentsW = 6;
    const segmentsH = 4;
    const { nu, nv } = fabricClothParticleCounts({ segmentsW, segmentsH });
    const mesh = rotatedClothMesh(0.4, 0.28, segmentsW, segmentsH);
    const index = mesh.geometry.index!.array;

    for (let t = 0; t < index.length; t += 3) {
      for (const [ea, eb] of [[0, 1], [1, 2], [2, 0]] as const) {
        const vi = index[t + ea];
        const vj = index[t + eb];
        const pi = fabricClothVertexToParticleIndex(vi, nu, nv);
        const pj = fabricClothVertexToParticleIndex(vj, nu, nv);
        expect(isRapierClothRenderGridEdge(pi, pj, nu, nv)).toBe(true);
      }
    }
  });

  it('no excess stretch after drop (sim + render)', async () => {
    await ensureRapierInit();
    const mesh = rotatedClothMesh(0.45, 0.3, 12, 8);
    const { softBody, session } = simulateDrop(mesh, 180);
    expect(maxRapierEdgeStretchRatio(softBody)).toBeLessThan(MAX_RAPIER_EDGE_STRETCH_AFTER_DROP);

    syncFabricClothMeshFromSoftBody(softBody, mesh, session);
    expect(maxParticleToVertexWorldError(softBody, mesh, session.particleToVertex)).toBeLessThan(
      1e-3,
    );
    expect(
      maxIndexedTriangleEdgeStretchRatio(mesh.geometry, session.restPositions),
    ).toBeLessThan(MAX_RENDER_EDGE_STRETCH_AFTER_DROP);
  });
});
