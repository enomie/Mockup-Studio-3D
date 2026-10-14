import { describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-simd-compat';
import { Mesh, PlaneGeometry } from 'three';
import { FIXED_TIMESTEP } from './constants';
import { ensureRapierInit } from './rapier-init';
import { resolveFabricDrape } from './fabric-cloth-drape';
import {
  fabricClothMeshSyncFlagsForSimulationFrame,
  fabricClothParticleToVertexIndex,
  maxFabricClothRestPoseWorldError,
  prepareFabricClothSimSession,
  restoreFabricClothRestPositions,
  syncFabricClothMeshFromSoftBody,
} from './fabric-cloth-soft-body';

const SILK_DRAPE = resolveFabricDrape('material-silk');

function rotatedClothMesh(width: number, height: number, segmentsW: number, segmentsH: number) {
  const geometry = new PlaneGeometry(width, height, segmentsW, segmentsH);
  const mesh = new Mesh(geometry);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.5;
  mesh.userData.assetMeshRole = 'fabricCloth';
  return mesh;
}

describe('fabricClothSoftBody', () => {
  it('spawn session: Rapier rest pose matches mesh world vertices (no size jump)', async () => {
    await ensureRapierInit();

    const mesh = rotatedClothMesh(0.45, 0.3, 9, 6);
    const { session, desc } = prepareFabricClothSimSession(mesh, SILK_DRAPE);
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const softBody = world.softBodies.createSoftBody(
      world.bodies,
      world.colliders,
      desc,
    );

    expect(maxFabricClothRestPoseWorldError(softBody, mesh, session)).toBeLessThan(1e-4);

    syncFabricClothMeshFromSoftBody(softBody, mesh, session);
    const after = mesh.geometry.attributes.position.array as Float32Array;
    let maxLocalErr = 0;
    for (let i = 0; i < session.restPositions.length; i++) {
      maxLocalErr = Math.max(maxLocalErr, Math.abs(after[i] - session.restPositions[i]));
    }
    expect(maxLocalErr).toBeLessThan(1e-4);
  });

  it('particle ↔ vertex index is consistent on the grid', () => {
    const nu = 11;
    const nv = 8;
    for (let p = 0; p < nu * nv; p++) {
      const v = fabricClothParticleToVertexIndex(p, nu, nv);
      const u = v % nu;
      const vv = Math.floor(v / nu);
      expect(p).toBe(u * nv + vv);
    }
  });

  it('soft body falls under gravity', async () => {
    await ensureRapierInit();
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    world.integrationParameters.dt = FIXED_TIMESTEP;
    const desc = RAPIER.SoftBodyDesc.cloth(
      { x: 0, y: 1, z: 0 },
      { x: 0.1, y: 0, z: 0 },
      { x: 0, y: 0, z: 0.1 },
      6,
      5,
    );
    const softBody = world.softBodies.createSoftBody(
      world.bodies,
      world.colliders,
      desc,
    );
    const y0 = softBody.particlePosition(0).y;
    for (let i = 0; i < 30; i++) {world.step();}
    expect(softBody.particlePosition(0).y).toBeLessThan(y0);
  });

  it('sync flags skip normals when recomputeNormals is false', async () => {
    await ensureRapierInit();
    const mesh = rotatedClothMesh(0.45, 0.3, 4, 4);
    const { session, desc } = prepareFabricClothSimSession(mesh, SILK_DRAPE);
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    world.integrationParameters.dt = FIXED_TIMESTEP;
    const softBody = world.softBodies.createSoftBody(
      world.bodies,
      world.colliders,
      desc,
    );
    for (let i = 0; i < 10; i++) {world.step();}
    syncFabricClothMeshFromSoftBody(softBody, mesh, session);
    const normalsAfterFull = new Float32Array(
      mesh.geometry.getAttribute('normal').array as Float32Array,
    );
    for (let i = 0; i < 5; i++) {world.step();}
    syncFabricClothMeshFromSoftBody(softBody, mesh, session, {
      recomputeNormals: false,
      recomputeBounds: false,
    });
    const normalsAfterSkip = mesh.geometry.getAttribute('normal').array as Float32Array;
    let unchanged = true;
    for (let i = 0; i < normalsAfterFull.length; i++) {
      if (Math.abs(normalsAfterSkip[i] - normalsAfterFull[i]) > 1e-6) {
        unchanged = false;
        break;
      }
    }
    expect(unchanged).toBe(true);
  });

  it('simulation frame stride recomputes normals every tick', () => {
    expect(fabricClothMeshSyncFlagsForSimulationFrame(1).recomputeNormals).toBe(true);
    expect(fabricClothMeshSyncFlagsForSimulationFrame(2).recomputeNormals).toBe(true);
  });

  it('simulation frame stride still throttles bounds every other tick', () => {
    expect(fabricClothMeshSyncFlagsForSimulationFrame(1).recomputeBounds).toBe(false);
    expect(fabricClothMeshSyncFlagsForSimulationFrame(2).recomputeBounds).toBe(true);
  });

  it('reset restores cached rest positions', async () => {
    await ensureRapierInit();
    const mesh = rotatedClothMesh(0.4, 0.28, 6, 4);
    const { session, desc } = prepareFabricClothSimSession(mesh, SILK_DRAPE);
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const softBody = world.softBodies.createSoftBody(
      world.bodies,
      world.colliders,
      desc,
    );
    for (let i = 0; i < 20; i++) {world.step();}
    syncFabricClothMeshFromSoftBody(softBody, mesh, session);
    restoreFabricClothRestPositions(mesh, session.restPositions);
    const pos = mesh.geometry.attributes.position.array as Float32Array;
    let maxErr = 0;
    for (let i = 0; i < session.restPositions.length; i++) {
      maxErr = Math.max(maxErr, Math.abs(pos[i] - session.restPositions[i]));
    }
    expect(maxErr).toBeLessThan(1e-6);
  });
});
