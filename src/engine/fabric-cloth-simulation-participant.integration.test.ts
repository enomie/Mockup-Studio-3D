import { Object3D, Scene } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { defaultBlockParams } from '@/scene/asset-block';
import {
  cloneFabricClothParams,
  defaultFabricClothParams,
} from '@/scene/asset-fabric-cloth';
import type { AssetEntity } from '@/scene/entity-types';
import type { EntityRegistry } from './entity-registry';
import { FabricClothSimulationParticipant } from './fabric-cloth-simulation-participant';
import {
  buildFabricClothMeshFromOptions,
  readFabricClothPlaneSegments,
} from './fabric-cloth-geometry';

function makeBlockEntity(): AssetEntity {
  return {
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
}

function makeClothEntity(): AssetEntity {
  return {
    id: 'cloth-1',
    type: 'asset',
    name: 'Cloth',
    assetKind: 'fabric-cloth',
    screenImageId: null,
    sizeScale: 1,
    visible: true,
    physicsBodyMode: 'dynamic',
    physicsDensityKgPerM3: 1000,
    fabricClothParams: defaultFabricClothParams(),
    transform: {
      position: { x: 0, y: 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
  };
}

describe('FabricClothSimulationParticipant integration', () => {
  it('spawns Verlet session and steps without Rapier SoftBody', () => {
    const block = makeBlockEntity();
    const cloth = makeClothEntity();

    const blockRoot = new Object3D();
    blockRoot.position.set(0, 0, 0);

    const clothRoot = new Object3D();
    clothRoot.position.set(0, 0.5, 0);
    const clothMesh = buildFabricClothMeshFromOptions({
      faceWidth: 0.45,
      faceHeight: 0.45,
      material: {} as never,
      segments: { segmentsW: 8, segmentsH: 8 },
    });
    clothRoot.add(clothMesh);

    const registry = {
      getEntities: () => [block, cloth],
      getRuntime: (id: string) => {
        if (id === block.id) {
          return { entity: block, object: blockRoot };
        }
        if (id === cloth.id) {
          return { entity: cloth, object: clothRoot };
        }
        return undefined;
      },
    } as unknown as EntityRegistry;

    const scene = new Scene();
    const participant = new FabricClothSimulationParticipant(registry, scene);
    participant.spawnSessionDynamics();
    expect(participant.hasBinding(cloth.id)).toBe(true);

    const segments = readFabricClothPlaneSegments(clothMesh);
    expect(segments.segmentsW).toBe(8);

    const posAttr = clothMesh.geometry.getAttribute('position');
    const restSnapshot = new Float32Array(posAttr.array as Float32Array);

    for (let frame = 0; frame < 120; frame++) {
      participant.syncEntityTransformsFromPhysics();
    }

    const pos = posAttr.array as Float32Array;
    let displacement = 0;
    for (let i = 0; i < pos.length; i++) {
      displacement += Math.abs(pos[i] - restSnapshot[i]);
    }
    expect(displacement).toBeGreaterThan(0.05);

    participant.clearSessionDynamics();
    expect(participant.hasBinding(cloth.id)).toBe(false);
  });

  it('keeps a pinned corner fixed during simulation', () => {
    const block = makeBlockEntity();
    const clothParams = cloneFabricClothParams(defaultFabricClothParams());
    clothParams.sim.pinnedCornersCount = 1;
    const cloth = makeClothEntity();
    cloth.fabricClothParams = clothParams;

    const blockRoot = new Object3D();
    const clothRoot = new Object3D();
    clothRoot.position.set(0, 0.5, 0);
    const clothMesh = buildFabricClothMeshFromOptions({
      faceWidth: 0.45,
      faceHeight: 0.45,
      material: {} as never,
      segments: { segmentsW: 6, segmentsH: 6 },
    });
    clothRoot.add(clothMesh);

    const registry = {
      getEntities: () => [block, cloth],
      getRuntime: (id: string) => {
        if (id === block.id) {return { entity: block, object: blockRoot };}
        if (id === cloth.id) {return { entity: cloth, object: clothRoot };}
        return undefined;
      },
      setFabricClothParams: () => {},
    } as unknown as EntityRegistry;

    const scene = new Scene();
    const participant = new FabricClothSimulationParticipant(registry, scene);
    participant.spawnSessionDynamics();

    const pin0 = participant.getPinMesh(cloth.id, 0);
    expect(pin0).toBeDefined();
    const startY = pin0?.position.y ?? 0;

    for (let frame = 0; frame < 80; frame++) {
      participant.syncEntityTransformsFromPhysics();
    }

    expect(pin0?.position.y).toBeCloseTo(startY, 2);

    participant.clearSessionDynamics();
  });
});
