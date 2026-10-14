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
  visible?: boolean;
  depthTest?: boolean;
  depthWrite?: boolean;
  toneMapped?: boolean;
  side?: number;
};

function isLegacyBasicMaterial(
  material: Material,
): material is LegacyColorMaterial {
  const legacy = material as LegacyColorMaterial;
  return (
    legacy.isMeshBasicMaterial === true || legacy.isLineBasicMaterial === true
  );
}

function toNodeMaterial(material: LegacyColorMaterial): Material {
  const options = {
    color: material.color?.getHex() ?? 0xffffff,
    transparent: material.transparent,
    opacity: material.opacity,
    visible: material.visible,
    depthTest: material.depthTest,
    depthWrite: material.depthWrite,
    toneMapped: material.toneMapped,
    side: material.side,
  };

  // TransformControls "invisible" pick shells — must not paint pixels (WebGPU still raycasts).
  if (
    options.transparent &&
    options.opacity <= 0.15 &&
    !options.depthTest &&
    !options.depthWrite
  ) {
    options.visible = false;
  }

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

type TransformControlsPlaneMesh = Mesh & { isTransformControlsPlane?: boolean };

/** Raycast-only drag plane — must never render (huge geometry, blocks the selection). */
function hideTransformControlsPlane(node: Object3D): void {
  if (!(node instanceof Mesh)) {return;}
  const plane = node as TransformControlsPlaneMesh;
  if (!plane.isTransformControlsPlane && plane.type !== 'TransformControlsPlane') {return;}

  plane.visible = false;
  plane.frustumCulled = false;

  const materials = Array.isArray(plane.material) ? plane.material : [plane.material];
  for (const material of materials) {
    material.visible = false;
  }
}

/** TransformControls ships WebGL materials from `three`; WebGPURenderer needs node materials. */
export function upgradeGizmoMaterialsToWebGPU(root: Object3D): void {
  root.traverse((node) => {
    if (node instanceof Mesh || node instanceof Line || node instanceof LineSegments) {
      node.material = upgradeMaterial(node.material as Material | Material[]);
    }
    hideTransformControlsPlane(node);
  });

  root.renderOrder = 999;
}
