import { describe, expect, it } from 'vitest';
import { Group, Mesh, Vector3 } from 'three/webgpu';
import { MATERIAL_PRESETS } from '@/data/material-presets';
import { populateAssetGroup } from '@/engine/asset-meshes/populate-asset-group';
import { FabricClothPhysicsColliders } from '@/engine/fabric-cloth-physics-colliders';
import type { EntityRegistry } from '@/engine/entity-registry';
import { RigidPrimitivePhysicsColliders } from '@/engine/rigid-primitive-physics-colliders';
import type { MaterialResolver } from '@/engine/material-resolver';
import { defaultBlockParams } from '@/scene/asset-block';
import {
  defaultFabricClothParams,
  FABRIC_CLOTH_REF_WIDTH_M,
} from '@/scene/asset-fabric-cloth';
import { computeFaceSize } from '@/scene/asset-sizing';
import type { AssetEntity } from '@/scene/entity-types';
import { FIXED_TIMESTEP } from './constants';
import { legacyRubberyFabricDrapeParams, resolveFabricDrape } from './fabric-cloth-drape';
import {
  maxFabricClothRestPoseWorldError,
  prepareFabricClothSimSession,
  syncFabricClothMeshFromSoftBody,
} from './fabric-cloth-soft-body';
import { PhysicsWorld } from './physics-world';

const _v = new Vector3();

function presetById(id: string) {
  const preset = MATERIAL_PRESETS.find((entry) => entry.id === id);
  if (!preset) {throw new Error(`Missing preset: ${id}`);}
  return preset;
}

function meshWorldVertexExtents(mesh: Mesh) {
  mesh.updateWorldMatrix(true, true);
  const m = mesh.matrixWorld;
  const pos = mesh.geometry.getAttribute('position');
  const out = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i).applyMatrix4(m);
    out.minX = Math.min(out.minX, _v.x);
    out.maxX = Math.max(out.maxX, _v.x);
    out.minY = Math.min(out.minY, _v.y);
    out.maxY = Math.max(out.maxY, _v.y);
    out.minZ = Math.min(out.minZ, _v.z);
    out.maxZ = Math.max(out.maxZ, _v.z);
  }
  return out;
}

function findClothMesh(root: Group): Mesh {
  let cloth: Mesh | null = null;
  root.traverse((child) => {
    if (cloth) {return;}
    if (child instanceof Mesh && child.userData.assetMeshRole === 'fabricCloth') {
      cloth = child;
    }
  });
  if (!cloth) {throw new Error('cloth mesh missing');}
  return cloth;
}

describe('fabricClothDefaultScene integration', () => {
  it(
    'silk cloth on 0.3 m block settles compactly (not slime to floor)',
    async () => {
    const physics = await PhysicsWorld.create();
    physics.createStaticGround('ground', 5);

    const blockEntity: AssetEntity = {
      id: 'block-1',
      type: 'asset',
      name: 'Block',
      assetKind: 'block',
      screenImageId: null,
      sizeScale: 1,
      visible: true,
      physicsBodyMode: 'fixed',
      physicsDensityKgPerM3: 1000,
      blockParams: defaultBlockParams(),
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      },
    };

    const clothSpawnY = 0.5;
    const face = computeFaceSize('fabric-cloth');
    expect(face.width).toBeCloseTo(FABRIC_CLOTH_REF_WIDTH_M);

    const clothEntity: AssetEntity = {
      id: 'cloth-1',
      type: 'asset',
      name: 'Fabric cloth',
      assetKind: 'fabric-cloth',
      screenImageId: null,
      sizeScale: 1,
      visible: true,
      fabricClothParams: defaultFabricClothParams(),
      materials: { fabricClothMaterialId: 'material-silk' },
      transform: {
        position: { x: 0, y: clothSpawnY, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      },
    };

    const blockRoot = new Group();
    blockRoot.position.set(0, 0, 0);
    blockRoot.updateWorldMatrix(true, true);

    const clothRoot = new Group();
    populateAssetGroup(clothRoot, 'fabric-cloth', {
      faceWidth: face.width,
      faceHeight: face.height,
      sizeScale: 1,
      materials: { fabricClothMaterialId: 'material-silk' },
      materialResolver: { resolvePreset: presetById } as unknown as MaterialResolver,
      fabricClothParams: defaultFabricClothParams(),
    });
    clothRoot.position.set(0, clothSpawnY, 0);
    clothRoot.updateWorldMatrix(true, true);

    const registry = {
      getEntities: () => [blockEntity, clothEntity],
      getRuntime: (id: string) => {
        if (id === blockEntity.id) {return { entity: blockEntity, object: blockRoot };}
        if (id === clothEntity.id) {return { entity: clothEntity, object: clothRoot };}
        return undefined;
      },
    } as unknown as EntityRegistry;

    const rigidPhysics = new RigidPrimitivePhysicsColliders(physics, registry);
    rigidPhysics.reconcileEntity(blockEntity.id);

    const fabricPhysics = new FabricClothPhysicsColliders(physics, registry);
    fabricPhysics.spawnOne(clothEntity.id);
    expect(fabricPhysics.hasBinding(clothEntity.id)).toBe(true);

    const clothMesh = findClothMesh(clothRoot);
    const steps = Math.round(4 / FIXED_TIMESTEP);
    for (let i = 0; i < steps; i++) {
      physics.step(FIXED_TIMESTEP);
      fabricPhysics.syncEntityTransformsFromPhysics();
    }

    const extents = meshWorldVertexExtents(clothMesh);
    const spanX = extents.maxX - extents.minX;
    const spanZ = extents.maxZ - extents.minZ;
    expect(spanX).toBeGreaterThan(face.width * 0.85);
    expect(spanX).toBeLessThan(face.width * 1.1);
    expect(spanZ).toBeGreaterThan(face.height * 0.85);
    expect(spanZ).toBeLessThan(face.height * 1.1);

    expect(extents.minY).toBeGreaterThan(0.12);
    expect(extents.maxY - extents.minY).toBeLessThan(0.28);

    const settledPositions = new Float32Array(
      clothMesh.geometry.getAttribute('position').array as Float32Array,
    );
    for (let i = 0; i < 30; i++) {
      physics.step(FIXED_TIMESTEP);
      fabricPhysics.syncEntityTransformsFromPhysics();
    }
    const afterSettle = clothMesh.geometry.getAttribute('position').array as Float32Array;
    let maxVertexDelta = 0;
    for (let i = 0; i < settledPositions.length; i++) {
      maxVertexDelta = Math.max(maxVertexDelta, Math.abs(afterSettle[i] - settledPositions[i]));
    }
    expect(maxVertexDelta).toBeLessThan(0.006);

    const softBody = physics.getSoftBody(`fabric-soft:${clothEntity.id}`);
    expect(softBody).toBeDefined();
    let maxParticleSpeed = 0;
    for (let p = 0; p < softBody!.numParticles(); p++) {
      const vel = softBody!.particleVelocity(p);
      maxParticleSpeed = Math.max(maxParticleSpeed, Math.hypot(vel.x, vel.y, vel.z));
    }
    expect(maxParticleSpeed).toBeLessThan(0.12);

    physics.dispose();
  },
    20_000,
  );

  it(
    'legacy rubbery drape sags lower than silk on the same block setup',
    async () => {
    const physics = await PhysicsWorld.create();
    physics.createStaticGround('ground', 5);

    const blockParams = defaultBlockParams();
    const clothSpawnY = 0.5;
    const face = computeFaceSize('fabric-cloth');

    const buildClothGroup = () => {
      const clothRoot = new Group();
      populateAssetGroup(clothRoot, 'fabric-cloth', {
        faceWidth: face.width,
        faceHeight: face.height,
        sizeScale: 1,
        materials: { fabricClothMaterialId: 'material-silk' },
        materialResolver: { resolvePreset: presetById } as unknown as MaterialResolver,
        fabricClothParams: defaultFabricClothParams(),
      });
      clothRoot.position.set(0, clothSpawnY, 0);
      clothRoot.updateWorldMatrix(true, true);
      return clothRoot;
    };

    const blockRoot = new Group();

    const blockEntity: AssetEntity = {
      id: 'block-1',
      type: 'asset',
      name: 'Block',
      assetKind: 'block',
      screenImageId: null,
      sizeScale: 1,
      visible: true,
      physicsBodyMode: 'fixed',
      physicsDensityKgPerM3: 1000,
      blockParams,
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    };

    const runMinY = (drape: ReturnType<typeof resolveFabricDrape>) => {
      const clothRoot = buildClothGroup();
      const clothMesh = findClothMesh(clothRoot);
      clothMesh.updateWorldMatrix(true, true);
      const { session, desc } = prepareFabricClothSimSession(clothMesh, drape);
      const softBody = physics.createSoftBody('tmp', desc);
      expect(maxFabricClothRestPoseWorldError(softBody, clothMesh, session)).toBeLessThan(1e-3);
      const steps = Math.round(4 / FIXED_TIMESTEP);
      for (let i = 0; i < steps; i++) {
        physics.step(FIXED_TIMESTEP);
        syncFabricClothMeshFromSoftBody(softBody, clothMesh, session);
      }
      const minY = meshWorldVertexExtents(clothMesh).minY;
      physics.removeSoftBody('tmp');
      return minY;
    };

    const registry = {
      getEntities: () => [blockEntity],
      getRuntime: (id: string) =>
        id === blockEntity.id ? { entity: blockEntity, object: blockRoot } : undefined,
    } as unknown as EntityRegistry;
    new RigidPrimitivePhysicsColliders(physics, registry).reconcileEntity(blockEntity.id);

    const silkMinY = runMinY(resolveFabricDrape('material-silk'));
    const legacyMinY = runMinY(legacyRubberyFabricDrapeParams());
    expect(silkMinY).toBeGreaterThan(legacyMinY + 0.05);

    physics.dispose();
  },
    20_000,
  );
});
