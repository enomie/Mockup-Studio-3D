import { describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-simd-compat';
import { Mesh, PlaneGeometry } from 'three';
import { FIXED_TIMESTEP } from './constants';
import { ensureRapierInit } from './rapier-init';
import { resolveFabricDrape } from './fabric-cloth-drape';
import { writeFabricClothGridNormalsFromPositions } from './fabric-cloth-grid-normals';
import {
  prepareFabricClothSimSession,
  syncFabricClothMeshFromSoftBody,
} from './fabric-cloth-soft-body';

const SILK_DRAPE = resolveFabricDrape('material-silk');

function maxNormalAngleRad(a: Float32Array, b: Float32Array): number {
  let maxAngle = 0;
  const count = a.length / 3;
  for (let i = 0; i < count; i++) {
    const o = i * 3;
    const dot = a[o] * b[o] + a[o + 1] * b[o + 1] + a[o + 2] * b[o + 2];
    const clamped = Math.min(1, Math.max(-1, dot));
    maxAngle = Math.max(maxAngle, Math.acos(clamped));
  }
  return maxAngle;
}

function clothMeshLikeProduction(width: number, height: number, segmentsW: number, segmentsH: number) {
  const geometry = new PlaneGeometry(width, height, segmentsW, segmentsH);
  const mesh = new Mesh(geometry);
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData.assetMeshRole = 'fabricCloth';
  return mesh;
}

describe('writeFabricClothGridNormalsFromPositions', () => {
  it('matches computeVertexNormals on rest pose (production orientation)', () => {
    const mesh = clothMeshLikeProduction(0.45, 0.3, 12, 8);
    const geometry = mesh.geometry;
    const positions = geometry.getAttribute('position').array as Float32Array;
    const threeNormals = new Float32Array(geometry.getAttribute('normal').count * 3);
    geometry.computeVertexNormals();
    const normalArray = geometry.getAttribute('normal').array;
    threeNormals.set(normalArray);

    const gridNormals = new Float32Array(threeNormals.length);
    const nu = 13;
    const nv = 9;
    writeFabricClothGridNormalsFromPositions(positions, gridNormals, nu, nv);

    expect(maxNormalAngleRad(gridNormals, threeNormals)).toBeLessThan(1e-3);
  });

  it('stays close to computeVertexNormals after mild deformation', async () => {
    await ensureRapierInit();
    const mesh = clothMeshLikeProduction(0.45, 0.3, 6, 4);
    mesh.position.y = 0.5;
    const { session, desc } = prepareFabricClothSimSession(mesh, SILK_DRAPE);
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    world.integrationParameters.dt = FIXED_TIMESTEP;
    const softBody = world.softBodies.createSoftBody(
      world.bodies,
      world.colliders,
      desc,
    );
    for (let i = 0; i < 10; i++) {
      world.step();
    }

    syncFabricClothMeshFromSoftBody(softBody, mesh, session);
    const gridNormals = new Float32Array(
      mesh.geometry.getAttribute('normal').array as Float32Array,
    );

    mesh.geometry.computeVertexNormals();
    const threeNormals = new Float32Array(
      mesh.geometry.getAttribute('normal').array as Float32Array,
    );

    expect(maxNormalAngleRad(gridNormals, threeNormals)).toBeLessThan(0.02);
  });
});
