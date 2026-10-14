import {
  LinearFilter,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
} from 'three/webgpu';
import type { ImageResolver } from '@/scene/entity-types';

/** Screen/print photos — no mipmaps (avoids cover-UV softness), max anisotropy for angled views. */
function configurePhotoTexture(
  texture: Texture,
  maxAnisotropy = 1,
): void {
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = Math.max(1, maxAnisotropy);
  texture.needsUpdate = true;
}

export class ImageTextureLoader {
  private readonly loader = new TextureLoader();
  private readonly cache = new Map<string, Texture>();
  private resolver: ImageResolver | null = null;
  private maxAnisotropy = 1;

  setResolver(resolver: ImageResolver | null): void {
    this.resolver = resolver;
  }

  setMaxAnisotropy(value: number): void {
    this.maxAnisotropy = Math.max(1, value);
  }

  async load(imageId: string): Promise<Texture | null> {
    const cached = this.cache.get(imageId);
    if (cached) {return cached;}

    const meta = this.resolver?.(imageId);
    if (!meta) {return null;}

    const texture = await this.loader.loadAsync(meta.url);
    configurePhotoTexture(texture, this.maxAnisotropy);
    if (meta.name) {
      texture.userData.imageName = meta.name;
    }
    this.cache.set(imageId, texture);
    return texture;
  }

  release(imageId: string): void {
    const texture = this.cache.get(imageId);
    if (!texture) {return;}
    texture.dispose();
    this.cache.delete(imageId);
  }

  dispose(): void {
    for (const texture of this.cache.values()) {
      texture.dispose();
    }
    this.cache.clear();
  }
}
