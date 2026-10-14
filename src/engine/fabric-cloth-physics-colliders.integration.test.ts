import { describe, expect, it } from 'vitest';
import { MATERIAL_PRESETS } from '@/data/material-presets';
import { defaultFabricClothParams } from '@/scene/asset-fabric-cloth';
import { computeFaceSize } from '@/scene/asset-sizing';
import type { AssetEntity } from '@/scene/entity-types';
import type { MaterialResolver } from '@/engine/material-resolver';
import { populateAssetGroup } from './asset-meshes/populate-asset-group';
import { FabricClothPhysicsColliders } from './fabric-cloth-physics-colliders';
import { PhysicsWorld } from '@/physics/physics-world';
import type { EntityRegistry } from './entity-registry';
import {
  fabricClothParticleCounts,
  readFabricClothPlaneSegments,
} from '@/physics/fabric-cloth-soft-body';
import { Group, Mesh, Vector3 } from 'three/webgpu';

function presetById(id: string) {
  const preset = MATERIAL_PRESETS.find((entry) => entry.id === id);
  if (!preset) {throw new Error(`Missing preset: ${id}`);}
  return preset;
}

const _v = new Vector3();

function meshWorldSpanXZ(mesh: Mesh): { spanX: number; spanZ: number } {
  mesh.updateWorldMatrix(true, true);
  const m = mesh.matrixWorld;
  const pos = mesh.geometry.getAttribute('position');
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i).applyMatrix4(m);
    minX = Math.min(minX, _v.x);
    maxX = Math.max(maxX, _v.x);
    minZ = Math.min(minZ, _v.z);
    maxZ = Math.max(maxZ, _v.z);
  }
  return { spanX: maxX - minX, spanZ: maxZ - minZ };
}

describe('FabricClothPhysicsColliders integration', () => {
  it('spawnOne on populateAssetGroup cloth matches face size after immediate sync', async () => {
    const physics = await PhysicsWorld.create();
    physics.createStaticGround('ground', 5);
    const face = computeFaceSize('fabric-cloth');
    const spawnY = 0.5;

    const entity: AssetEntity = {
      id: 'cloth-1',
      type: 'asset',
      name: 'Fabric cloth 1',
      assetKind: 'fabric-cloth',
      screenImageId: null,
      sizeScale: 1,
      visible: true,
      fabricClothParams: defaultFabricClothParams(),
      transform: {
        position: { x: 0, y: spawnY, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      },
    };

    const root = new Group();
    populateAssetGroup(root, 'fabric-cloth', {
      faceWidth: face.width,
      faceHeight: face.height,
      sizeScale: 1,
      materials: { fabricClothMaterialId: 'material-silk' },
      materialResolver: { resolvePreset: presetById } as unknown as MaterialResolver,
      fabricClothParams: defaultFabricClothParams(),
    });
    root.position.set(0, spawnY, 0);
    root.updateWorldMatrix(true, true);

    const registry = {
      getEntities: () => [entity],
      getRuntime: (id: string) =>
        id === entity.id ? { entity, object: root } : undefined,
    } as unknown as EntityRegistry;

    const colliders = new FabricClothPhysicsColliders(physics, registry);
    colliders.spawnOne(entity.id);

    expect(colliders.hasBinding(entity.id)).toBe(true);

    let clothMesh: Mesh | null = null;
    root.traverse((child) => {
      if (child instanceof Mesh && child.userData.assetMeshRole === 'fabricCloth') {
        clothMesh = child;
      }
    });
    expect(clothMesh).not.toBeNull();

    const segments = readFabricClothPlaneSegments(clothMesh!);
    const { nu, nv } = fabricClothParticleCounts(segments);
    const softBody = physics.getSoftBody(`fabric-soft:${entity.id}`);
    expect(softBody).toBeDefined();
    expect(softBody!.numParticles()).toBe(nu * nv);

    const binding = colliders.hasBinding(entity.id);
    expect(binding).toBe(true);

    const { spanX, spanZ } = meshWorldSpanXZ(clothMesh!);
    expect(spanX).toBeCloseTo(face.width, 2);
    expect(spanZ).toBeCloseTo(face.height, 2);

    for (let step = 0; step < 120; step++) {
      physics.step(1 / 60);
      colliders.syncEntityTransformsFromPhysics();
    }
    const after = meshWorldSpanXZ(clothMesh!);
    expect(after.spanX).toBeLessThan(face.width * 1.1);
    expect(after.spanZ).toBeLessThan(face.height * 1.1);

    physics.dispose();
  });
});
