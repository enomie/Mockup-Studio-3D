import {
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  type Object3D,
  type Scene,
} from 'three/webgpu';
import { vec3Get, vec3Set } from '@/physics/cloth/float-buffer';

export const FABRIC_CLOTH_PIN_MESH_ROLE = 'fabricClothPin';

const PIN_RADIUS_M = 0.009;

export class FabricClothPinSet {
  readonly pinAnchors: Mesh[] = [];

  constructor(
    private readonly scene: Scene,
    readonly entityId: string,
  ) {
    const pinGeo = new SphereGeometry(PIN_RADIUS_M, 16, 16);
    const pinMat = new MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.2,
      metalness: 0.8,
    });

    for (let c = 0; c < 4; c++) {
      const pinMesh = new Mesh(pinGeo, pinMat);
      pinMesh.castShadow = true;
      pinMesh.userData.assetMeshRole = FABRIC_CLOTH_PIN_MESH_ROLE;
      pinMesh.userData.fabricClothEntityId = entityId;
      pinMesh.userData.cornerIndex = c;
      this.scene.add(pinMesh);
      this.pinAnchors.push(pinMesh);
    }
  }

  syncFromWorldCenterline(
    cornerIndexMap: readonly number[],
    pos: Float32Array,
  ): void {
    for (let c = 0; c < 4; c++) {
      const vIdx = cornerIndexMap[c];
      const pin = this.pinAnchors[c];
      const [x, y, z] = vec3Get(pos, vIdx);
      pin.position.set(x, y, z);
    }
  }

  snapPinsToClothCorners(
    cornerIndexMap: readonly number[],
    pos: Float32Array,
    pinnedCornersCount: number,
    fromCorner = 0,
    oldPos?: Float32Array,
  ): void {
    for (let c = fromCorner; c < pinnedCornersCount; c++) {
      const vIdx = cornerIndexMap[c];
      const pin = this.pinAnchors[c];
      const [x, y, z] = vec3Get(pos, vIdx);
      pin.position.set(x, y, z);
      if (oldPos) {
        vec3Set(oldPos, vIdx, x, y, z);
      }
    }
  }

  applyVisibility(pinnedCornersCount: number, visible = true): void {
    for (let c = 0; c < 4; c++) {
      this.pinAnchors[c].visible = visible && c < pinnedCornersCount;
    }
  }

  getPinMesh(index: number): Mesh | undefined {
    return this.pinAnchors[index];
  }

  getPinWorldPositions(): FabricClothPinWorldPosition[] {
    return this.pinAnchors.map((p) => ({
      x: p.position.x,
      y: p.position.y,
      z: p.position.z,
    }));
  }

  dispose(): void {
    for (const pin of this.pinAnchors) {
      this.scene.remove(pin);
    }
    const first = this.pinAnchors[0];
    first.geometry.dispose();
    const mat = first.material;
    if (mat instanceof MeshStandardMaterial) {
      mat.dispose();
    }
    this.pinAnchors.length = 0;
  }
}

export interface FabricClothPinWorldPosition {
  x: number;
  y: number;
  z: number;
}

interface FabricClothPinUserData {
  assetMeshRole?: string;
  cornerIndex?: number;
  fabricClothEntityId?: string;
}

function pinUserData(object: Object3D): FabricClothPinUserData {
  return object.userData as FabricClothPinUserData;
}

export function isFabricClothPinObject(object: Object3D): boolean {
  return pinUserData(object).assetMeshRole === FABRIC_CLOTH_PIN_MESH_ROLE;
}

export function fabricClothPinCornerIndex(object: Object3D): number | null {
  if (!isFabricClothPinObject(object)) {return null;}
  const corner = pinUserData(object).cornerIndex;
  if (typeof corner !== 'number') {return null;}
  return corner;
}

export function fabricClothPinEntityId(object: Object3D): string | null {
  if (!isFabricClothPinObject(object)) {return null;}
  const id = pinUserData(object).fabricClothEntityId;
  if (typeof id !== 'string') {return null;}
  return id;
}
