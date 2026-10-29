import {
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Scene,
  SphereGeometry,
} from 'three';
import { vec3Get, vec3Set } from '../utils/floatBuffer.ts';

const START_ELEVATION_Y = 0.35;

export class PinSystem {
  readonly pinAnchors: Mesh[] = [];
  private readonly scene: Scene;
  private readonly gizmoHelper: Object3D;

  constructor(scene: Scene, gizmoHelper: Object3D) {
    this.scene = scene;
    this.gizmoHelper = gizmoHelper;

    const pinGeo = new SphereGeometry(0.018, 16, 16);
    const pinMat = new MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.2,
      metalness: 0.8,
    });

    for (let c = 0; c < 4; c++) {
      const pinMesh = new Mesh(pinGeo, pinMat);
      pinMesh.castShadow = true;
      pinMesh.userData.cornerIndex = c;
      this.scene.add(pinMesh);
      this.pinAnchors.push(pinMesh);
    }
  }

  syncPositionsFromCloth(
    cornerIndexMap: readonly number[],
    pos: Float32Array,
  ): void {
    for (let c = 0; c < 4; c++) {
      const vIdx = cornerIndexMap[c];
      if (vIdx === undefined) continue;
      const pin = this.pinAnchors[c];
      if (!pin) continue;
      const [x, y, z] = vec3Get(pos, vIdx);
      pin.position.set(x, y, z);
    }
  }

  initialPositions(
    cornerIndexMap: readonly number[],
    pos: Float32Array,
  ): void {
    this.syncPositionsFromCloth(cornerIndexMap, pos);
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
      if (vIdx === undefined) continue;
      const pin = this.pinAnchors[c];
      if (!pin) continue;
      const [x, y, z] = vec3Get(pos, vIdx);
      pin.position.set(x, y, z);
      if (oldPos) {
        vec3Set(oldPos, vIdx, x, y, z);
      }
    }
  }

  restoreActivePinPositions(
    saved: readonly { x: number; y: number; z: number }[],
    activeCount: number,
    cornerIndexMap: readonly number[],
    pos: Float32Array,
    oldPos: Float32Array,
  ): void {
    for (let c = 0; c < activeCount; c++) {
      const p = saved[c];
      const vIdx = cornerIndexMap[c];
      if (p === undefined || vIdx === undefined) continue;
      const pin = this.pinAnchors[c];
      pin?.position.set(p.x, p.y, p.z);
      vec3Set(pos, vIdx, p.x, p.y, p.z);
      vec3Set(oldPos, vIdx, p.x, p.y, p.z);
    }
    for (let c = activeCount; c < 4; c++) {
      const vIdx = cornerIndexMap[c];
      if (vIdx === undefined) continue;
      const pin = this.pinAnchors[c];
      if (!pin) continue;
      const [x, y, z] = vec3Get(pos, vIdx);
      pin.position.set(x, y, z);
    }
  }

  applyPinnedSelection(pinnedCornersCount: number, cornersVisible: boolean): void {
    for (let c = 0; c < 4; c++) {
      const pin = this.pinAnchors[c];
      if (!pin) continue;
      pin.visible = c < pinnedCornersCount && cornersVisible;
    }
  }

  getPinMesh(index: number): Mesh | undefined {
    return this.pinAnchors[index];
  }

  getVisiblePinMeshes(pinnedCornersCount: number): Mesh[] {
    return this.pinAnchors.slice(0, pinnedCornersCount).filter((p) => p.visible);
  }

  getPinPositions(): { x: number; y: number; z: number }[] {
    return this.pinAnchors.map((p) => ({
      x: p.position.x,
      y: p.position.y,
      z: p.position.z,
    }));
  }

  resetPinPositionsOnly(
    cornerIndexMap: readonly number[],
    originalLocal: Float32Array,
    pos: Float32Array,
    oldPos: Float32Array,
  ): void {
    for (let c = 0; c < 4; c++) {
      const vIdx = cornerIndexMap[c];
      if (vIdx === undefined) continue;
      const [origX, , origZ] = vec3Get(originalLocal, vIdx);
      const pin = this.pinAnchors[c];
      pin?.position.set(origX, START_ELEVATION_Y, origZ);
      pin?.rotation.set(0, 0, 0);
      vec3Set(pos, vIdx, origX, START_ELEVATION_Y, origZ);
      vec3Set(oldPos, vIdx, origX, START_ELEVATION_Y, origZ);
    }
  }

  setGizmoHelperVisible(visible: boolean): void {
    this.gizmoHelper.visible = visible;
  }

  dispose(): void {
    for (const pin of this.pinAnchors) {
      this.scene.remove(pin);
      pin.geometry.dispose();
      (pin.material as MeshStandardMaterial).dispose();
    }
  }
}
