import { describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-simd-compat';
import { Group, Vector3, type Mesh } from 'three/webgpu';
import { buildFabricClothMeshFromOptions } from '@/engine/fabric-cloth-geometry';
import { computeFaceSize } from '@/scene/asset-sizing';
import { FABRIC_CLOTH_REF_WIDTH_M } from '@/scene/asset-fabric-cloth';
import { FIXED_TIMESTEP } from './constants';
import { maxIndexedTriangleEdgeStretchRatio } from './fabric-cloth-connectivity';
import { fabricClothGridSegments } from './fabric-cloth-grid';
import { ensureRapierInit } from './rapier-init';
import { resolveFabricDrape } from './fabric-cloth-drape';
import {
  fabricClothParticleCounts,
  maxFabricClothRestPoseWorldError,
  prepareFabricClothSimSession,
  readFabricClothPlaneSegments,
  syncFabricClothMeshFromSoftBody,
} from './fabric-cloth-soft-body';

const SILK_DRAPE = resolveFabricDrape('material-silk');

const _world = new Vector3();

function buildEngineLikeClothGroup(faceWidth: number, faceHeight: number, groupY: number): Group {
  const group = new Group();
  group.position.y = groupY;
  const mesh = buildFabricClothMeshFromOptions({
    faceWidth,
    faceHeight,
    material: {} as never,
  });
  mesh.userData.assetMeshRole = 'fabricCloth';
  group.add(mesh);
  group.updateWorldMatrix(true, true);
  return group;
}

function clothMeshFromGroup(group: Group) {
  const mesh = group.children.find(
    (c) => c.userData?.assetMeshRole === 'fabricCloth',
  );
  if (!mesh || !('geometry' in mesh)) {
    throw new Error('cloth mesh not found');
  }
  return mesh as Mesh;
}

interface WorldExtents {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

function meshWorldVertexExtents(mesh: Mesh): WorldExtents {
  mesh.updateWorldMatrix(true, true);
  const matrixWorld = mesh.matrixWorld;
  const pos = mesh.geometry.getAttribute('position');
  const out: WorldExtents = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };
  for (let i = 0; i < pos.count; i++) {
    _world.fromBufferAttribute(pos, i).applyMatrix4(matrixWorld);
    out.minX = Math.min(out.minX, _world.x);
    out.maxX = Math.max(out.maxX, _world.x);
    out.minY = Math.min(out.minY, _world.y);
    out.maxY = Math.max(out.maxY, _world.y);
    out.minZ = Math.min(out.minZ, _world.z);
    out.maxZ = Math.max(out.maxZ, _world.z);
  }
  return out;
}

function spacingFromSessionMesh(mesh: Mesh): { du: number; dv: number } {
  const segments = readFabricClothPlaneSegments(mesh);
  const { nv } = fabricClothParticleCounts(segments);
  const positionAttr = mesh.geometry.getAttribute('position');
  mesh.updateWorldMatrix(true, true);
  const m = mesh.matrixWorld;
  const origin = _world.fromBufferAttribute(positionAttr, 0).applyMatrix4(m);
  const alongU = new Vector3()
    .fromBufferAttribute(positionAttr, nv)
    .applyMatrix4(m)
    .sub(origin);
  const alongV = new Vector3()
    .fromBufferAttribute(positionAttr, 1)
    .applyMatrix4(m)
    .sub(origin);
  return { du: alongU.length(), dv: alongV.length() };
}

describe('fabricClothPipelineIntegration', () => {
  it('sizing → group mesh → spawn → immediate sync keeps world footprint and spacing', async () => {
    await ensureRapierInit();

    const face = computeFaceSize('fabric-cloth');
    expect(face.width).toBeCloseTo(FABRIC_CLOTH_REF_WIDTH_M);
    expect(face.height).toBeCloseTo(FABRIC_CLOTH_REF_WIDTH_M);

    const groupY = 0.5;
    const group = buildEngineLikeClothGroup(face.width, face.height, groupY);
    const mesh = clothMeshFromGroup(group);

    const segments = readFabricClothPlaneSegments(mesh);
    const grid = fabricClothGridSegments(face.width, face.height);
    expect(segments.segmentsW).toBe(grid.segmentsW);
    expect(segments.segmentsH).toBe(grid.segmentsH);

    const extentsBefore = meshWorldVertexExtents(mesh);
    const halfW = face.width * 0.5;
    expect(extentsBefore.maxX - extentsBefore.minX).toBeCloseTo(face.width, 3);
    expect(extentsBefore.maxZ - extentsBefore.minZ).toBeCloseTo(face.height, 3);
    expect(extentsBefore.minY).toBeCloseTo(groupY, 3);
    expect(extentsBefore.maxY).toBeCloseTo(groupY, 3);

    const { session, desc } = prepareFabricClothSimSession(mesh, SILK_DRAPE);
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    world.integrationParameters.dt = FIXED_TIMESTEP;
    const softBody = world.softBodies.createSoftBody(world.bodies, world.colliders, desc);
    const { nu, nv } = fabricClothParticleCounts(segments);
    expect(softBody.numParticles()).toBe(nu * nv);
    expect(mesh.geometry.getAttribute('position').count).toBe(nu * nv);

    expect(maxFabricClothRestPoseWorldError(softBody, mesh, session)).toBeLessThan(1e-4);

    syncFabricClothMeshFromSoftBody(softBody, mesh, session);

    const after = mesh.geometry.attributes.position.array as Float32Array;
    let maxLocalErr = 0;
    for (let i = 0; i < session.restPositions.length; i++) {
      maxLocalErr = Math.max(maxLocalErr, Math.abs(after[i] - session.restPositions[i]));
    }
    expect(maxLocalErr).toBeLessThan(1e-4);

    const extentsAfter = meshWorldVertexExtents(mesh);
    expect(extentsAfter.maxX - extentsAfter.minX).toBeCloseTo(face.width, 3);
    expect(extentsAfter.maxZ - extentsAfter.minZ).toBeCloseTo(face.height, 3);
    expect(Math.abs(extentsAfter.minX + halfW)).toBeLessThan(0.02);
    expect(Math.abs(extentsAfter.maxX - halfW)).toBeLessThan(0.02);

    const { du, dv } = spacingFromSessionMesh(mesh);
    expect(du).toBeCloseTo(face.width / segments.segmentsW, 4);
    expect(dv).toBeCloseTo(face.height / segments.segmentsH, 4);

    expect(
      maxIndexedTriangleEdgeStretchRatio(mesh.geometry, session.restPositions),
    ).toBeLessThan(1.001);
  });

  it('one physics step + sync does not blow up footprint (portrait aspect)', async () => {
    await ensureRapierInit();

    const imageW = 800;
    const imageH = 1200;
    const face = computeFaceSize('fabric-cloth', imageW, imageH);
    const group = buildEngineLikeClothGroup(face.width, face.height, 0.5);
    const mesh = clothMeshFromGroup(group);

    const { session, desc } = prepareFabricClothSimSession(mesh, SILK_DRAPE);
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    world.integrationParameters.dt = FIXED_TIMESTEP;
    const softBody = world.softBodies.createSoftBody(world.bodies, world.colliders, desc);
    syncFabricClothMeshFromSoftBody(softBody, mesh, session);

    world.step();
    syncFabricClothMeshFromSoftBody(softBody, mesh, session);

    const extents = meshWorldVertexExtents(mesh);
    const spanX = extents.maxX - extents.minX;
    const spanZ = extents.maxZ - extents.minZ;
    expect(spanX).toBeLessThan(face.width * 1.05);
    expect(spanZ).toBeLessThan(face.height * 1.05);
    expect(spanX).toBeGreaterThan(face.width * 0.9);
    expect(spanZ).toBeGreaterThan(face.height * 0.9);
  });
});
