import {
  Mesh,
  type BufferGeometry,
  type Group,
  type Material,
} from 'three/webgpu';
import { disposeEngineMaterial } from '@/engine/material-resolver';

export function disposeAssetGroup(group: Group): void {
  const meshes: Mesh<BufferGeometry, Material>[] = [];
  group.traverse((child) => {
    if (child instanceof Mesh) {
      meshes.push(child as Mesh<BufferGeometry, Material>);
    }
  });

  // Meshes may share geometry and material (e.g. triangle patch mirror copies).
  const disposedGeometries = new Set<BufferGeometry>();
  const disposedMaterials = new Set<Material>();
  for (const mesh of meshes) {
    if (!disposedGeometries.has(mesh.geometry)) {
      mesh.geometry.dispose();
      disposedGeometries.add(mesh.geometry);
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const rawMaterial of materials) {
      const material = rawMaterial as Material;
      if (!disposedMaterials.has(material)) {
        disposeEngineMaterial(material);
        disposedMaterials.add(material);
      }
    }
    mesh.removeFromParent();
  }
}
