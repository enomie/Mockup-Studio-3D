import type { Object3D } from 'three/webgpu';
import type { PhysicsBody } from '@/physics/physics-body';
import type { PhysicsTransform } from '@/physics/types';
import type { EntityRegistry } from './entity-registry';

export interface PhysicsBinding {
  body: PhysicsBody;
  object: Object3D;
}

export function poseFromObject3D(object: Object3D): PhysicsTransform {
  const { x, y, z } = object.position;
  const q = object.quaternion;
  return {
    position: { x, y, z },
    rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
  };
}

function syncPhysicsTransform(object: Object3D, transform: PhysicsTransform): void {
  object.position.set(transform.position.x, transform.position.y, transform.position.z);
  object.quaternion.set(
    transform.rotation.x,
    transform.rotation.y,
    transform.rotation.z,
    transform.rotation.w,
  );
}

export function syncPhysicsBinding(binding: PhysicsBinding): void {
  syncPhysicsTransform(binding.object, binding.body.getTransform());
}

export function syncPhysicsBindings(bindings: readonly PhysicsBinding[]): void {
  for (const binding of bindings) {
    syncPhysicsBinding(binding);
  }
}

export function setPhysicsBindingsSleeping(
  bindings: Iterable<PhysicsBinding>,
  sleeping: boolean,
): void {
  for (const binding of bindings) {
    if (sleeping) {
      binding.body.sleep();
    } else {
      binding.body.wakeUp();
    }
  }
}

export function syncPhysicsBindingsToRegistry(
  bindings: Map<string, PhysicsBinding>,
  registry: EntityRegistry,
): void {
  for (const [entityId, binding] of bindings) {
    syncPhysicsBinding(binding);
    registry.updateTransform(entityId, {
      position: {
        x: binding.object.position.x,
        y: binding.object.position.y,
        z: binding.object.position.z,
      },
      rotation: {
        x: binding.object.rotation.x,
        y: binding.object.rotation.y,
        z: binding.object.rotation.z,
      },
    });
  }
}
