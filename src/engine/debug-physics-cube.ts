import {
  BoxGeometry,
  Color,
  Mesh,
  MeshStandardNodeMaterial,
  type Scene,
} from 'three/webgpu';
import {
  CUBE_DROP_HEIGHT,
  CUBE_SIZE,
} from '@/constants';
import type { PhysicsWorld } from '@/physics/physics-world';
import { applyFullShadowFlags } from '@/render/shadow-setup';
import { syncPhysicsBinding, type PhysicsBinding } from './physics-sync';

const DEBUG_PHYSICS_CUBE_ID = 'debug-cube';

const CUBE_HALF = CUBE_SIZE / 2;

export function setupDebugPhysicsCube(
  physics: PhysicsWorld,
  scene: Scene,
): PhysicsBinding {
  const spawnCenterY = CUBE_DROP_HEIGHT + CUBE_HALF;
  const body = physics.createDynamicBox(
    DEBUG_PHYSICS_CUBE_ID,
    { x: CUBE_HALF, y: CUBE_HALF, z: CUBE_HALF },
    spawnCenterY,
  );

  const mesh = new Mesh(
    new BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE),
    new MeshStandardNodeMaterial({
      color: new Color(0.85, 0.35, 0.28),
      roughness: 0.45,
    }),
  );
  applyFullShadowFlags(mesh);

  const binding: PhysicsBinding = { body, object: mesh };
  syncPhysicsBinding(binding);
  scene.add(mesh);

  return binding;
}

export function disposeDebugPhysicsCubeMesh(binding: PhysicsBinding): void {
  const mesh = binding.object as Mesh;
  mesh.geometry.dispose();
  (mesh.material as MeshStandardNodeMaterial).dispose();
}
