import type {
  MeshPhysicalNodeMaterial,
  MeshStandardNodeMaterial,
  Node,
  Texture,
} from 'three/webgpu';
import { max } from 'three/tsl';

const ALPHA_IMAGE_EXT = /\.(png|webp|gif|avif)$/i;

export function imageFormatMayHaveAlpha(fileName: string | undefined): boolean {
  if (!fileName) {return false;}
  return ALPHA_IMAGE_EXT.test(fileName);
}

export function resolveImageFileName(
  tex: Texture | null | undefined,
  imageName?: string,
): string | undefined {
  if (imageName) {return imageName;}
  const fromTexture = (tex?.userData as { imageName?: unknown }).imageName;
  if (typeof fromTexture === 'string' && fromTexture.length > 0) {
    return fromTexture;
  }
  return undefined;
}

export function applyImagePlaneAlpha(
  material: MeshStandardNodeMaterial | MeshPhysicalNodeMaterial,
  opacityNode: NonNullable<MeshStandardNodeMaterial['opacityNode']>,
): void {
  material.transparent = true;
  material.opacityNode = opacityNode;
  material.depthWrite = false;
}

/** Cutout opacity: image alpha, but opaque where `opaqueMask` is 1 (e.g. fabric border strip). */
export function imagePlaneCutoutOpacityWithOpaqueMask(
  imageAlpha: Node<'float'>,
  opaqueMask: Node<'float'>,
): Node<'float'> {
  return max(imageAlpha, opaqueMask);
}

/** Opaque depth + alpha test — for surfaces that must occlude the scene (e.g. fabric cloth). */
export function applyImagePlaneAlphaCutout(
  material: MeshStandardNodeMaterial | MeshPhysicalNodeMaterial,
  opacityNode: NonNullable<MeshStandardNodeMaterial['opacityNode']>,
  alphaTest = 0.5,
): void {
  material.transparent = false;
  material.depthWrite = true;
  material.opacityNode = opacityNode;
  material.alphaTest = alphaTest;
}
