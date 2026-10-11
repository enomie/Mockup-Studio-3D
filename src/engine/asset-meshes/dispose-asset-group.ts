import { Mesh, type Group, type Material } from 'three/webgpu';
import { disposeEngineMaterial } from '@/engine/material-resolver';

export function disposeAssetGroup(group: Group): void {
  const meshes: Mesh[] = [];
  group.traverse((child) => {
    if (child instanceof Mesh) {
      meshes.push(child);
    }
  });

  const disposedMaterials = new Set<Material>();
  for (const mesh of meshes) {
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!disposedMaterials.has(material)) {
        disposeEngineMaterial(material);
        disposedMaterials.add(material);
      }
    }
    mesh.removeFromParent();
  }
}
