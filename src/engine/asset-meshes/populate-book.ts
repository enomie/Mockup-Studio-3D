import { BoxGeometry, Mesh, type Group, type Material, type Texture } from 'three/webgpu';
import {
  createBookCoverBoxMaterials,
  createBookSolidCoverMaterial,
} from '@/engine/book-cover-material';
import { computeBookLayout } from '@/engine/book-layout';
import { createBookSpineMaterial } from '@/engine/book-spine-texture';
import type { BookParams } from '@/scene/asset-book';
import type { AssetKind } from '@/scene/asset-kind';
import { bookCoverTint, bookPagesTint } from '@/scene/book-material-tints';
import type { AssetMaterialSlots } from '@/scene/material-types';
import { MATERIAL_PAPER_ID } from '@/scene/material-ids';
import type { MaterialResolver } from '@/engine/material-resolver';
import { resolveMeshMaterial } from './shared';

export interface BookImageMeta {
  width?: number;
  height?: number;
  name?: string;
}

export interface BookTextures {
  front: Texture | null;
  back: Texture | null;
  spine: Texture | null;
  frontMeta?: BookImageMeta;
  backMeta?: BookImageMeta;
  spineMeta?: BookImageMeta;
}

export function addBook(
  group: Group,
  assetKind: AssetKind,
  coverWidthM: number,
  coverHeightM: number,
  bookParams: BookParams,
  textures: BookTextures,
  resolver: MaterialResolver,
  materials: AssetMaterialSlots = {},
): void {
  const layout = computeBookLayout(coverWidthM, coverHeightM, bookParams, assetKind);
  const pagesMaterialId = materials.bookPagesMaterialId ?? MATERIAL_PAPER_ID;
  const coverMaterialId = materials.bookCoverMaterialId ?? MATERIAL_PAPER_ID;
  const pagesTint = bookPagesTint(materials);
  const coverTint = bookCoverTint(materials);
  const resolvePreset = (id: string) => resolver.resolvePreset(id);

  for (const part of layout.parts) {
    const geometry = new BoxGeometry(part.sizeX, part.sizeY, part.sizeZ);
    let material: Material | Material[];

    switch (part.role) {
      case 'bookPages':
        material = resolveMeshMaterial(resolver, pagesMaterialId, {
          tint: pagesTint,
        });
        break;
      case 'bookSpine':
        material = createBookSpineMaterial(
          resolvePreset,
          resolver,
          coverMaterialId,
          textures.spine,
          part.sizeZ,
          part.sizeY,
          coverTint,
          textures.spineMeta?.width,
          textures.spineMeta?.height,
          textures.spineMeta?.name,
        );
        break;
      case 'bookFrontCover':
        material = textures.front
          ? createBookCoverBoxMaterials(
              resolver,
              resolvePreset,
              'bookFrontCover',
              coverMaterialId,
              coverTint,
              textures.front,
              part.sizeX,
              part.sizeY,
              bookParams,
              'front',
              textures.frontMeta?.width,
              textures.frontMeta?.height,
              textures.frontMeta?.name,
            )
          : createBookSolidCoverMaterial(
              resolver,
              coverMaterialId,
              part.sizeX,
              bookParams,
              'front',
              coverTint,
            );
        break;
      case 'bookBackCover':
        material = textures.back
          ? createBookCoverBoxMaterials(
              resolver,
              resolvePreset,
              'bookBackCover',
              coverMaterialId,
              coverTint,
              textures.back,
              part.sizeX,
              part.sizeY,
              bookParams,
              'back',
              textures.backMeta?.width,
              textures.backMeta?.height,
              textures.backMeta?.name,
            )
          : createBookSolidCoverMaterial(
              resolver,
              coverMaterialId,
              part.sizeX,
              bookParams,
              'back',
              coverTint,
            );
        break;
      default:
        material = resolveMeshMaterial(resolver, coverMaterialId);
    }

    const mesh = new Mesh(geometry, material);
    mesh.position.set(part.centerX, part.centerY, part.centerZ);
    mesh.userData.assetMeshRole = part.role;
    if (part.role === 'bookFrontCover') {
      mesh.userData.isAssetScreen = true;
    }
    group.add(mesh);
  }
}
