import type {
  MeshPhysicalNodeMaterial,
  MeshStandardNodeMaterial,
  Texture,
} from 'three/webgpu';

const ALPHA_IMAGE_EXT = /\.(png|webp|gif|avif)$/i;

export function imageFormatMayHaveAlpha(fileName: string | undefined): boolean {
  if (!fileName) return false;
  return ALPHA_IMAGE_EXT.test(fileName);
}

export function resolveImageFileName(
  tex: Texture | null | undefined,
  imageName?: string,
): string | undefined {
  if (imageName) return imageName;
  const fromTexture = tex?.userData?.imageName;
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
