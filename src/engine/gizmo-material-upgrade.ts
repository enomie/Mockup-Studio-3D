import {
  Line,
  LineBasicNodeMaterial,
  LineSegments,
  Mesh,
  MeshBasicNodeMaterial,
  type Material,
  type Object3D,
} from 'three/webgpu';

type LegacyColorMaterial = Material & {
  isMeshBasicMaterial?: boolean;
  isLineBasicMaterial?: boolean;
  color?: { getHex: () => number };
  transparent?: boolean;
  opacity?: number;
  depthTest?: boolean;
  depthWrite?: boolean;
  toneMapped?: boolean;
  side?: number;
};

function isLegacyBasicMaterial(
  material: Material,
): material is LegacyColorMaterial {
  const legacy = material as LegacyColorMaterial;
  return Boolean(legacy.isMeshBasicMaterial || legacy.isLineBasicMaterial);
}

function toNodeMaterial(material: LegacyColorMaterial): Material {
  const options = {
    color: material.color?.getHex() ?? 0xffffff,
    transparent: material.transparent ?? false,
    opacity: material.opacity ?? 1,
    depthTest: material.depthTest ?? true,
    depthWrite: material.depthWrite ?? true,
    toneMapped: material.toneMapped ?? false,
    side: material.side,
  };

  if (material.isLineBasicMaterial) {
    return new LineBasicNodeMaterial(options);
  }

  return new MeshBasicNodeMaterial(options);
}

function upgradeMaterial(material: Material | Material[]): Material | Material[] {
  if (Array.isArray(material)) {
    return material.map((entry) =>
      isLegacyBasicMaterial(entry) ? toNodeMaterial(entry) : entry,
    );
  }

  return isLegacyBasicMaterial(material) ? toNodeMaterial(material) : material;
}

/** TransformControls ships WebGL materials from `three`; WebGPURenderer needs node materials. */
export function upgradeGizmoMaterialsToWebGPU(root: Object3D): void {
  root.traverse((node) => {
    if (node instanceof Mesh || node instanceof Line || node instanceof LineSegments) {
      node.material = upgradeMaterial(node.material as Material | Material[]);
    }
  });

  root.renderOrder = 999;
}
