import {
  Mesh,
  MeshStandardMaterial,
  Matrix4,
  Scene,
  SphereGeometry,
  type Object3D,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  clampCubeCornerRadius,
  type ScenePropsState,
} from '../config/scenePropsConfig.ts';
import type { StudioLayersState } from '../config/studioLayers.ts';
import type { SceneColliderSnapshot, SceneCollider } from '../physics/sceneColliders.ts';

const PROP_CUBE = 'cube';
const PROP_SPHERE = 'sphere';

interface PropMeshUserData {
  propKind?: string;
}

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export class ScenePropsSystem {
  readonly cubeMesh: Mesh;
  readonly sphereMesh: Mesh;

  private readonly scene: Scene;
  private cubeGeo: RoundedBoxGeometry | null = null;
  private sphereGeo: SphereGeometry | null = null;
  private lastCubeSize = 0.3;
  private lastCubeCornerRadius = 0.03;
  private lastSphereRadius = 0.15;

  private readonly matrixWorldElements = new Float32Array(16);
  private readonly matrixWorldInverseElements = new Float32Array(16);
  private readonly inverseMatrix = new Matrix4();

  constructor(scene: Scene) {
    this.scene = scene;

    const mat = new MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.05,
    });

    this.cubeMesh = new Mesh(new SphereGeometry(0.01, 4, 4), mat);
    (this.cubeMesh.userData as PropMeshUserData).propKind = PROP_CUBE;
    this.cubeMesh.castShadow = true;
    this.cubeMesh.receiveShadow = true;
    this.scene.add(this.cubeMesh);

    this.sphereMesh = new Mesh(new SphereGeometry(0.01, 16, 16), mat.clone());
    (this.sphereMesh.userData as PropMeshUserData).propKind = PROP_SPHERE;
    this.sphereMesh.castShadow = true;
    this.sphereMesh.receiveShadow = true;
    this.scene.add(this.sphereMesh);

    this.rebuildCubeGeometry(0.3, 0.03);
    this.rebuildSphereGeometry(0.15);
  }

  applyFromState(state: ScenePropsState, layers: StudioLayersState): void {
    const { cube, sphere } = state;

    if (this.cubeGeo === null || this.needsCubeRebuild(cube.size, cube.cornerRadius)) {
      this.rebuildCubeGeometry(cube.size, cube.cornerRadius);
    }

    if (this.sphereGeo === null || Math.abs(this.lastSphereRadius - sphere.radius) > 1e-6) {
      this.rebuildSphereGeometry(sphere.radius);
    }

    this.applyTransform(this.cubeMesh, cube.position, cube.rotationEulerDeg);
    this.applyTransform(this.sphereMesh, sphere.position, sphere.rotationEulerDeg);

    this.cubeMesh.visible = layers.visibility.cube;
    this.sphereMesh.visible = layers.visibility.sphere;
  }

  private needsCubeRebuild(size: number, cornerRadius: number): boolean {
    if (!this.cubeGeo) return true;
    const r = clampCubeCornerRadius(size, cornerRadius);
    return (
      Math.abs(this.lastCubeSize - size) > 1e-6 ||
      Math.abs(this.lastCubeCornerRadius - r) > 1e-6
    );
  }

  private rebuildCubeGeometry(size: number, cornerRadius: number): void {
    const r = clampCubeCornerRadius(size, cornerRadius);
    this.lastCubeSize = size;
    this.lastCubeCornerRadius = r;
    this.cubeGeo?.dispose();
    this.cubeGeo = new RoundedBoxGeometry(size, size, size, 4, r);
    this.cubeMesh.geometry = this.cubeGeo;
  }

  private rebuildSphereGeometry(radius: number): void {
    this.lastSphereRadius = radius;
    this.sphereGeo?.dispose();
    this.sphereGeo = new SphereGeometry(radius, 32, 24);
    this.sphereMesh.geometry = this.sphereGeo;
  }

  private applyTransform(
    mesh: Mesh,
    position: { x: number; y: number; z: number },
    rotationEulerDeg: { x: number; y: number; z: number },
  ): void {
    mesh.position.set(position.x, position.y, position.z);
    mesh.rotation.set(
      rotationEulerDeg.x * DEG2RAD,
      rotationEulerDeg.y * DEG2RAD,
      rotationEulerDeg.z * DEG2RAD,
      'XYZ',
    );
    mesh.updateMatrixWorld(true);
  }

  readTransformFromMesh(
    kind: 'cube' | 'sphere',
  ): {
    position: { x: number; y: number; z: number };
    rotationEulerDeg: { x: number; y: number; z: number };
  } {
    const mesh = kind === 'cube' ? this.cubeMesh : this.sphereMesh;
    return {
      position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
      rotationEulerDeg: {
        x: mesh.rotation.x * RAD2DEG,
        y: mesh.rotation.y * RAD2DEG,
        z: mesh.rotation.z * RAD2DEG,
      },
    };
  }

  buildColliderSnapshot(state: ScenePropsState, layers: StudioLayersState): SceneColliderSnapshot {
    const colliders: SceneCollider[] = [];

    if (layers.visibility.cube) {
      this.cubeMesh.updateMatrixWorld(true);
      this.cubeMesh.matrixWorld.toArray(this.matrixWorldElements);
      this.inverseMatrix.copy(this.cubeMesh.matrixWorld).invert();
      this.inverseMatrix.toArray(this.matrixWorldInverseElements);
      const half = state.cube.size / 2;
      colliders.push({
        kind: 'roundedBox',
        halfExtents: half,
        cornerRadius: clampCubeCornerRadius(state.cube.size, state.cube.cornerRadius),
        matrixWorld: this.matrixWorldElements,
        matrixWorldInverse: this.matrixWorldInverseElements,
      });
    }

    if (layers.visibility.sphere) {
      this.sphereMesh.updateMatrixWorld(true);
      colliders.push({
        kind: 'sphere',
        radius: state.sphere.radius,
        centerX: this.sphereMesh.position.x,
        centerY: this.sphereMesh.position.y,
        centerZ: this.sphereMesh.position.z,
      });
    }

    return { colliders };
  }

  getPickableMeshes(layers: StudioLayersState): Object3D[] {
    const meshes: Object3D[] = [];
    if (layers.visibility.cube) meshes.push(this.cubeMesh);
    if (layers.visibility.sphere) meshes.push(this.sphereMesh);
    return meshes;
  }

  getAttachedPropKind(object: Object3D | undefined): 'cube' | 'sphere' | null {
    if (object === undefined) return null;
    const kind = (object.userData as PropMeshUserData).propKind;
    if (kind === PROP_CUBE) return 'cube';
    if (kind === PROP_SPHERE) return 'sphere';
    return null;
  }

  dispose(): void {
    this.scene.remove(this.cubeMesh);
    this.scene.remove(this.sphereMesh);
    this.cubeGeo?.dispose();
    this.sphereGeo?.dispose();
    (this.cubeMesh.material as MeshStandardMaterial).dispose();
    (this.sphereMesh.material as MeshStandardMaterial).dispose();
  }
}
