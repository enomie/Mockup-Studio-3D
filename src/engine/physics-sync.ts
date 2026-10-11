import type { Object3D } from 'three/webgpu';
import type { PhysicsBody } from '@/physics/physics-body';
import type { PhysicsTransform } from '@/physics/types';

export type PhysicsBinding = {
  body: PhysicsBody;
  object: Object3D;
};

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
