import type {
  Material,
  MeshPhysicalNodeMaterial,
  MeshStandardNodeMaterial,
  Texture,
} from 'three/webgpu';
import {
  createBookImageOnPresetMaterial,
  type MaterialResolver,
} from '@/engine/material-resolver';
import {
  applyBookHingeGrooveToMaterial,
  type BookHingeSide,
} from '@/engine/book-hinge-groove-nodes';
import {
  bookCoverOuterFaceIndex,
  buildBookBoxMaterials,
  type BookCoverPartRole,
} from '@/engine/book-cover-box-faces';
import type { BookParams } from '@/scene/asset-book';
import type { Rgb } from '@/colors/rgb';
import type { MaterialPresetResolver } from '@/scene/material-types';
import { resolveMeshMaterial } from '@/engine/asset-meshes/shared';
import { MATERIAL_PAPER_ID } from '@/scene/material-ids';

export function createBookSolidSideMaterial(
  resolver: MaterialResolver,
  coverMaterialId: string,
  coverTint?: Rgb,
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  return resolveMeshMaterial(
    resolver,
    coverMaterialId || MATERIAL_PAPER_ID,
    { tint: coverTint },
  ) as MeshStandardNodeMaterial;
}

export function createBookCoverOuterImageMaterial(
  resolver: MaterialResolver,
  resolvePreset: MaterialPresetResolver,
  coverMaterialId: string,
  coverTint: Rgb,
  tex: Texture,
  coverWidthM: number,
  coverHeightM: number,
  bookParams: BookParams,
  side: BookHingeSide,
  imageW?: number,
  imageH?: number,
  imageName?: string,
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  const material = createBookImageOnPresetMaterial(
    resolver,
    resolvePreset,
    coverMaterialId,
    coverTint,
    tex,
    coverWidthM,
    coverHeightM,
    imageW,
    imageH,
    imageName,
  );

  applyBookHingeGrooveToMaterial(material, coverWidthM, bookParams, side);
  return material;
}

export function createBookSolidCoverMaterial(
  resolver: MaterialResolver,
  coverMaterialId: string,
  coverWidthM: number,
  bookParams: BookParams,
  side: BookHingeSide,
  coverTint?: Rgb,
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  const material = createBookSolidSideMaterial(
    resolver,
    coverMaterialId,
    coverTint,
  );
  applyBookHingeGrooveToMaterial(material, coverWidthM, bookParams, side);
  return material;
}

export function createBookCoverBoxMaterials(
  resolver: MaterialResolver,
  resolvePreset: MaterialPresetResolver,
  role: Extract<BookCoverPartRole, 'bookFrontCover' | 'bookBackCover'>,
  coverMaterialId: string,
  coverTint: Rgb,
  tex: Texture,
  coverWidthM: number,
  coverHeightM: number,
  bookParams: BookParams,
  side: BookHingeSide,
  imageW?: number,
  imageH?: number,
  imageName?: string,
): Material[] {
  const solid = createBookSolidSideMaterial(resolver, coverMaterialId, coverTint);
  const outer = createBookCoverOuterImageMaterial(
    resolver,
    resolvePreset,
    coverMaterialId,
    coverTint,
    tex,
    coverWidthM,
    coverHeightM,
    bookParams,
    side,
    imageW,
    imageH,
    imageName,
  );
  return buildBookBoxMaterials(
    bookCoverOuterFaceIndex(role),
    outer,
    solid,
  );
}
