import type { Rgb } from '@/colors/rgb';
import {
  FABRIC_CLOTH_BORDER_ROUGHNESS,
  FABRIC_CLOTH_REST_PLANE_XY_ATTR,
} from '@/scene/asset-fabric-cloth';
import type {
  MeshPhysicalNodeMaterial,
  MeshStandardNodeMaterial,
  Node,
} from 'three/webgpu';
import { imagePlaneCutoutOpacityWithOpaqueMask } from '@/engine/image-surface-alpha';
import { abs, attribute, float, min, step, vec3 } from 'three/tsl';

type ShaderColorNode = NonNullable<MeshStandardNodeMaterial['colorNode']>;

/** CPU helper — same rule as TSL border mask (rest-plane meters). */
export function fabricClothBorderMaskFromRestPlane(
  restX: number,
  restY: number,
  planeW: number,
  planeH: number,
  borderWidthM: number,
): number {
  const halfW = planeW * 0.5;
  const halfH = planeH * 0.5;
  const distEdge = Math.min(halfW - Math.abs(restX), halfH - Math.abs(restY));
  return distEdge < borderWidthM ? 1 : 0;
}

/** Hard inset border mask: 1 on border strip, 0 on interior (meters from plane edge). */
export function fabricClothInsetBorderMaskNode(
  planeW: number,
  planeH: number,
  borderWidthM: number,
): Node<'float'> {
  const halfW = float(planeW * 0.5);
  const halfD = float(planeH * 0.5);
  const restPlane = attribute(FABRIC_CLOTH_REST_PLANE_XY_ATTR, 'vec2');
  const distEdge = min(halfW.sub(abs(restPlane.x)), halfD.sub(abs(restPlane.y)));
  const isInterior = step(float(borderWidthM), distEdge);
  return float(1).sub(isInterior);
}

function borderColorNode(borderRgb: Rgb): ShaderColorNode {
  return vec3(float(borderRgb.r), float(borderRgb.g), float(borderRgb.b));
}

export function applyFabricClothInsetBorderToMaterial(
  material: MeshStandardNodeMaterial | MeshPhysicalNodeMaterial,
  planeW: number,
  planeH: number,
  borderWidthM: number,
  borderRgb: Rgb,
): void {
  const imageColor = material.colorNode;
  if (!imageColor) {return;}

  const mask = fabricClothInsetBorderMaskNode(planeW, planeH, borderWidthM);
  const interior = float(1).sub(mask);
  const borderColor = borderColorNode(borderRgb);
  const motifColor = imageColor;
  material.colorNode = motifColor.mul(interior).add(borderColor.mul(mask));

  const interiorRough = (material.roughnessNode ?? float(0.5)) as unknown as ReturnType<
    typeof float
  >;
  const borderRough = float(FABRIC_CLOTH_BORDER_ROUGHNESS);
  material.roughnessNode = interiorRough
    .mul(interior)
    .add(borderRough.mul(mask));

  const imageOpacity = material.opacityNode;
  if (imageOpacity) {
    material.opacityNode = imagePlaneCutoutOpacityWithOpaqueMask(
      imageOpacity as Node<'float'>,
      mask,
    );
  }

  const emissive = material.emissiveNode;
  if (emissive && imageOpacity) {
    const cutoutOpacity = material.opacityNode as Node<'float'>;
    const emissiveVec = emissive as Node<'vec3'>;
    material.emissiveNode = emissiveVec.mul(cutoutOpacity);
  }
}
