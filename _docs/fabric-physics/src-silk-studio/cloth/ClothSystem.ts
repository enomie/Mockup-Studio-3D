import {
  BufferAttribute,
  BufferGeometry,
  Box3,
  Color,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  Scene,
  Vector2,
  Vector3,
  type Texture,
} from 'three';
import type { ClothConfig } from '../config/clothConfig.ts';
import type { FabricPhysics } from '../config/fabricPresets.ts';
import type { SilkOptics } from '../config/silkOptics.ts';
import type { SceneColliderSnapshot } from '../physics/sceneColliders.ts';
import { stepClothPhysics, type ClothPhysicsBackend } from '../physics/clothPhysicsBackend.ts';
import { SHELL_HALF_THICKNESS } from '../physics/verlet.ts';
import type { DistanceConstraint, VerletParams, VerletState } from '../physics/types.ts';
import { vec3Get, vec3Set } from '../utils/floatBuffer.ts';
import type { FabricCanvasTexture } from '../textures/canvasTexture.ts';
import { updateClothShellVertices } from './shellVertices.ts';

const START_ELEVATION_Y = 0.35;
const REST_SPEED_THRESHOLD_SQ = 1e-10;
const REST_FRAMES_REQUIRED = 3;

/** Print side is +Y (top shell). UVs match canvas/file LTR when viewed from above (see CanvasTexture.flipY). */
function clothShellUv(face: 'top' | 'bottom', u: number, v: number): [number, number] {
  if (face === 'top') {
    return [u, v];
  }
  return [1 - u, 1 - v];
}

export class ClothSystem {
  mesh: Mesh | null = null;
  geometry: BufferGeometry | null = null;
  material: MeshPhysicalMaterial | null = null;

  numVertices = 0;
  pos = new Float32Array(0);
  oldPos = new Float32Array(0);
  xPrev = new Float32Array(0);
  originalLocal = new Float32Array(0);
  pinnedFlags = new Uint8Array(0);
  constraints: DistanceConstraint[] = [];
  cornerIndexMap: number[] = [0, 0, 0, 0];
  private segX = 38;
  private segY = 38;
  private consecutiveRestFrames = 0;

  private readonly scene: Scene;
  private readonly fabricTexture: FabricCanvasTexture;
  private readonly weaveNormal: Texture;

  constructor(scene: Scene, fabricTexture: FabricCanvasTexture, weaveNormal: Texture) {
    this.scene = scene;
    this.fabricTexture = fabricTexture;
    this.weaveNormal = weaveNormal;
  }

  rebuild(
    clothConfig: ClothConfig,
    silkOptics: SilkOptics,
    _pinnedCornersCount: number,
    applyPins: () => void,
  ): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.geometry?.dispose();
      this.material?.dispose();
    }

    const width = clothConfig.width;
    const height = clothConfig.height;
    const segX = clothConfig.subdivX;
    const segY = clothConfig.subdivY;
    this.segX = segX;
    this.segY = segY;

    this.material = new MeshPhysicalMaterial({
      color: 0xffffff,
      map: this.fabricTexture.texture,
      roughness: 0.3,
      metalness: 0.0,
      sheen: silkOptics.sheen,
      sheenRoughness: silkOptics.sheenRoughness,
      sheenColor: new Color(silkOptics.sheenColor),
      anisotropy: silkOptics.anisotropy,
      anisotropyRotation: silkOptics.anisotropyRotation,
      iridescence: silkOptics.iridescence,
      iridescenceIOR: silkOptics.iridescenceIOR,
      iridescenceThicknessRange: [100, 350],
      normalMap: this.weaveNormal,
      normalScale: new Vector2(silkOptics.weaveDepth, silkOptics.weaveDepth),
      clearcoat: 0.0,
      clearcoatRoughness: 0.1,
      specularIntensity: 0.6,
      envMapIntensity: 0.45,
      depthWrite: true,
      depthTest: true,
    });

    const nx = segX + 1;
    const ny = segY + 1;
    const planeVerts = nx * ny;
    const totalVerts = planeVerts * 2;

    this.geometry = new BufferGeometry();

    const posArray = new Float32Array(totalVerts * 3);
    const normalArray = new Float32Array(totalVerts * 3);
    const uvsArray = new Float32Array(totalVerts * 2);
    const indices: number[] = [];

    const halfThick = SHELL_HALF_THICKNESS;

    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const idx = y * nx + x;
        const u = x / segX;
        const v = y / segY;
        const px = (u - 0.5) * width;
        const pz = (v - 0.5) * height;

        posArray[idx * 3] = px;
        posArray[idx * 3 + 1] = START_ELEVATION_Y + halfThick;
        posArray[idx * 3 + 2] = pz;

        normalArray[idx * 3] = 0;
        normalArray[idx * 3 + 1] = 1;
        normalArray[idx * 3 + 2] = 0;

        const [su, sv] = clothShellUv('top', u, v);
        uvsArray[idx * 2] = su;
        uvsArray[idx * 2 + 1] = sv;
      }
    }

    for (let y = 0; y < segY; y++) {
      for (let x = 0; x < segX; x++) {
        const a = y * nx + x;
        const b = y * nx + (x + 1);
        const c = (y + 1) * nx + x;
        const d = (y + 1) * nx + (x + 1);
        indices.push(a, d, b);
        indices.push(a, c, d);
      }
    }

    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const srcIdx = y * nx + x;
        const idx = planeVerts + srcIdx;
        const u = x / segX;
        const v = y / segY;
        const px = (u - 0.5) * width;
        const pz = (v - 0.5) * height;

        posArray[idx * 3] = px;
        posArray[idx * 3 + 1] = START_ELEVATION_Y - halfThick;
        posArray[idx * 3 + 2] = pz;

        normalArray[idx * 3] = 0;
        normalArray[idx * 3 + 1] = -1;
        normalArray[idx * 3 + 2] = 0;

        const [su, sv] = clothShellUv('bottom', u, v);
        uvsArray[idx * 2] = su;
        uvsArray[idx * 2 + 1] = sv;
      }
    }

    for (let y = 0; y < segY; y++) {
      for (let x = 0; x < segX; x++) {
        const a = planeVerts + (y * nx + x);
        const b = planeVerts + (y * nx + (x + 1));
        const c = planeVerts + ((y + 1) * nx + x);
        const d = planeVerts + ((y + 1) * nx + (x + 1));
        indices.push(a, b, d);
        indices.push(a, d, c);
      }
    }

    this.geometry.setAttribute('position', new BufferAttribute(posArray, 3));
    this.geometry.setAttribute('normal', new BufferAttribute(normalArray, 3));
    this.geometry.setAttribute('uv', new BufferAttribute(uvsArray, 2));
    this.geometry.setIndex(indices);
    this.geometry.computeTangents();
    this.geometry.computeBoundingSphere();
    this.geometry.computeBoundingBox();

    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    this.numVertices = planeVerts;
    this.pos = new Float32Array(this.numVertices * 3);
    this.oldPos = new Float32Array(this.numVertices * 3);
    this.xPrev = new Float32Array(this.numVertices * 3);
    this.originalLocal = new Float32Array(this.numVertices * 3);
    this.pinnedFlags = new Uint8Array(this.numVertices);

    for (let i = 0; i < this.numVertices; i++) {
      const u = (i % nx) / segX;
      const v = Math.floor(i / nx) / segY;
      const x = (u - 0.5) * width;
      const y = START_ELEVATION_Y;
      const z = (v - 0.5) * height;

      this.pos[i * 3] = x;
      this.pos[i * 3 + 1] = y;
      this.pos[i * 3 + 2] = z;

      this.oldPos[i * 3] = x;
      this.oldPos[i * 3 + 1] = y;
      this.oldPos[i * 3 + 2] = z;

      this.originalLocal[i * 3] = x;
      this.originalLocal[i * 3 + 1] = 0;
      this.originalLocal[i * 3 + 2] = z;
    }

    this.cornerIndexMap = [0, segX, (ny - 1) * nx, (ny - 1) * nx + segX];

    this.constraints = [];
    const addConstraint = (
      i1: number,
      i2: number,
      type: DistanceConstraint['type'] = 'structural',
    ): void => {
      const [x1, y1, z1] = vec3Get(this.pos, i1);
      const [x2, y2, z2] = vec3Get(this.pos, i2);
      const dx = x1 - x2;
      const dy = y1 - y2;
      const dz = z1 - z2;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      this.constraints.push({ i1, i2, restDist: dist, type });
    };

    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const idx = y * nx + x;
        if (x < segX) addConstraint(idx, idx + 1, 'structural');
        if (y < segY) addConstraint(idx, idx + nx, 'structural');
        if (x < segX && y < segY) {
          addConstraint(idx, idx + nx + 1, 'shear');
          addConstraint(idx + 1, idx + nx, 'shear');
        }
        if (x < segX - 1) addConstraint(idx, idx + 2, 'bending');
        if (y < segY - 1) addConstraint(idx, idx + nx * 2, 'bending');
        if (x < segX - 2) addConstraint(idx, idx + 3, 'bending');
        if (y < segY - 2) addConstraint(idx, idx + nx * 3, 'bending');
      }
    }

    applyPins();
    this.fabricTexture.redraw(clothConfig);
    this.wakeSimulation();
  }

  wakeSimulation(): void {
    this.consecutiveRestFrames = 0;
  }

  isSimulationAtRest(): boolean {
    return this.consecutiveRestFrames >= REST_FRAMES_REQUIRED;
  }

  private measureMaxSpeedSquared(): number {
    let maxSq = 0;
    for (let i = 0; i < this.numVertices; i++) {
      const [px, py, pz] = vec3Get(this.pos, i);
      const [ox, oy, oz] = vec3Get(this.oldPos, i);
      const dx = px - ox;
      const dy = py - oy;
      const dz = pz - oz;
      const sq = dx * dx + dy * dy + dz * dz;
      if (sq > maxSq) {
        maxSq = sq;
      }
    }
    return maxSq;
  }

  applyPinnedSelection(pinnedCornersCount: number): void {
    for (let i = 0; i < this.numVertices; i++) {
      this.pinnedFlags[i] = 0;
    }
    for (let c = 0; c < 4; c++) {
      if (c < pinnedCornersCount) {
        const vIdx = this.cornerIndexMap[c];
        if (vIdx !== undefined) {
          this.pinnedFlags[vIdx] = 1;
        }
      }
    }
  }

  resetSimulationPreservePins(
    pinnedCornersCount: number,
    pinPositions: readonly { x: number; y: number; z: number }[],
  ): void {
    if (!this.geometry || this.numVertices === 0) return;

    const nx = this.segX + 1;
    const ny = this.segY + 1;
    const baseElev = START_ELEVATION_Y;

    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const idx = y * nx + x;

        let isPinnedCorner = false;
        let pinnedIdx = -1;
        for (let c = 0; c < pinnedCornersCount; c++) {
          if (this.cornerIndexMap[c] === idx) {
            isPinnedCorner = true;
            pinnedIdx = c;
            break;
          }
        }

        if (isPinnedCorner && pinnedIdx >= 0) {
          const p = pinPositions[pinnedIdx];
          if (!p) continue;
          vec3Set(this.pos, idx, p.x, p.y, p.z);
          vec3Set(this.oldPos, idx, p.x, p.y, p.z);
        } else {
          const [origX, , origZ] = vec3Get(this.originalLocal, idx);
          vec3Set(this.pos, idx, origX, baseElev, origZ);
          vec3Set(this.oldPos, idx, origX, baseElev, origZ);
        }
      }
    }

    this.flushGeometryFromSimulation();
  }

  flushGeometryFromSimulation(): void {
    if (!this.geometry) return;
    updateClothShellVertices(
      this.geometry,
      this.pos,
      this.segX,
      this.segY,
      SHELL_HALF_THICKNESS,
      { computeTangents: true, computeBounds: false },
    );
  }

  simulate(
    fabricPhysics: FabricPhysics,
    sceneColliders: SceneColliderSnapshot,
    pinnedCornersCount: number,
    pinPositions: readonly { x: number; y: number; z: number }[],
    physicsBackend: ClothPhysicsBackend = 'cpu',
  ): boolean {
    if (!this.geometry) return false;

    const state: VerletState = {
      numVertices: this.numVertices,
      pos: this.pos,
      oldPos: this.oldPos,
      xPrev: this.xPrev,
      pinnedFlags: this.pinnedFlags,
      constraints: this.constraints,
    };

    const params: VerletParams = {
      gravityMagnitude: fabricPhysics.gravityMagnitude,
      damping: fabricPhysics.damping,
      bendingStiffness: fabricPhysics.bendingStiffness,
      friction: fabricPhysics.friction,
      solverIterations: fabricPhysics.solverIterations,
      sceneColliders,
      pinnedCornersCount,
      cornerIndexMap: this.cornerIndexMap,
      pinPositions,
    };

    stepClothPhysics(physicsBackend, state, params);
    updateClothShellVertices(
      this.geometry,
      this.pos,
      this.segX,
      this.segY,
      SHELL_HALF_THICKNESS,
      { computeTangents: true, computeBounds: false },
    );

    const maxSpeedSq = this.measureMaxSpeedSquared();
    if (maxSpeedSq < REST_SPEED_THRESHOLD_SQ) {
      this.consecutiveRestFrames += 1;
    } else {
      this.consecutiveRestFrames = 0;
    }
    return maxSpeedSq >= REST_SPEED_THRESHOLD_SQ;
  }

  applySilkOptics(optics: SilkOptics): void {
    if (!this.material) return;
    this.material.anisotropy = optics.anisotropy;
    this.material.anisotropyRotation = optics.anisotropyRotation;
    this.material.sheen = optics.sheen;
    this.material.iridescence = optics.iridescence;
    this.material.normalScale.set(optics.weaveDepth, optics.weaveDepth);
    this.material.needsUpdate = true;
  }

  refreshMaterialMap(texture: Texture): void {
    if (!this.material) return;
    this.material.map = texture;
    this.material.needsUpdate = true;
  }

  getSimulationCenter(out = new Vector3()): Vector3 {
    if (this.numVertices === 0) {
      out.set(0, 0.25, 0);
      return out;
    }
    const box = new Box3();
    const scratch = new Vector3();
    for (let i = 0; i < this.numVertices; i++) {
      const [x, y, z] = vec3Get(this.pos, i);
      scratch.set(x, y, z);
      box.expandByPoint(scratch);
    }
    return box.getCenter(out);
  }

  setCornerWorldPosition(cornerIndex: number, x: number, y: number, z: number): void {
    const vIdx = this.cornerIndexMap[cornerIndex];
    if (vIdx === undefined) return;
    vec3Set(this.pos, vIdx, x, y, z);
    vec3Set(this.oldPos, vIdx, x, y, z);
    this.flushGeometryFromSimulation();
  }

  applyWorldMatrixDelta(delta: Matrix4, scratch = new Vector3()): void {
    for (let i = 0; i < this.numVertices; i++) {
      const [x, y, z] = vec3Get(this.pos, i);
      scratch.set(x, y, z).applyMatrix4(delta);
      vec3Set(this.pos, i, scratch.x, scratch.y, scratch.z);

      const [ox, oy, oz] = vec3Get(this.oldPos, i);
      scratch.set(ox, oy, oz).applyMatrix4(delta);
      vec3Set(this.oldPos, i, scratch.x, scratch.y, scratch.z);

      const [lx, ly, lz] = vec3Get(this.originalLocal, i);
      scratch.set(lx, ly, lz).applyMatrix4(delta);
      vec3Set(this.originalLocal, i, scratch.x, scratch.y, scratch.z);
    }
    this.flushGeometryFromSimulation();
  }

  applyPresetMaterial(
    roughness: number,
    sheen: number,
    sheenColor: number,
    anisotropy?: number,
    iridescence?: number,
  ): void {
    if (!this.material) return;
    this.material.roughness = roughness;
    this.material.sheen = sheen;
    this.material.sheenColor = new Color(sheenColor);
    if (anisotropy !== undefined) {
      this.material.anisotropy = anisotropy;
    }
    if (iridescence !== undefined) {
      this.material.iridescence = iridescence;
    }
    this.material.needsUpdate = true;
  }

  dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
    }
    this.geometry?.dispose();
    this.material?.dispose();
  }
}
