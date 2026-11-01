import type {
  Material,
  MeshPhysicalNodeMaterial,
  MeshStandardNodeMaterial,
  Texture,
} from 'three/webgpu';
import { float, texture, uv, vec2 } from 'three/tsl';
import type { Rgb } from '@/colors/rgb';
import {
  createBookImageOnPresetMaterial,
  createBookImageOnPresetMaterialFromNodes,
  type MaterialResolver,
} from '@/engine/material-resolver';
import {
  imageFormatMayHaveAlpha,
  resolveImageFileName,
} from '@/engine/image-surface-alpha';
import {
  bookCoverOuterFaceIndex,
  buildBookBoxMaterials,
} from '@/engine/book-cover-box-faces';
import { createBookSolidSideMaterial } from '@/engine/book-cover-material';
import type { MaterialPresetResolver } from '@/scene/material-types';
import { resolveMeshMaterial } from '@/engine/asset-meshes/shared';
import { MATERIAL_PAPER_ID } from '@/scene/material-ids';

export interface SpineContainTopUv {
  repeatU: number;
  repeatV: number;
  offsetU: number;
  offsetV: number;
}

/** Contain mapping on spine plane (U = thickness, V = height); image anchored to top (V=1). */
export function computeSpineContainTopUv(
  planeW: number,
  planeH: number,
  imageW: number,
  imageH: number,
): SpineContainTopUv {
  if (planeW <= 0 || planeH <= 0 || imageW <= 0 || imageH <= 0) {
    return { repeatU: 1, repeatV: 1, offsetU: 0, offsetV: 0 };
  }

  const planeAspect = planeW / planeH;
  const imageAspect = imageW / imageH;

  if (imageAspect > planeAspect) {
    const repeatU = 1;
    const repeatV = planeW / imageAspect / planeH;
    return { repeatU, repeatV, offsetU: 0, offsetV: 1 - repeatV };
  }

  const repeatV = 1;
  const repeatU = (planeH * imageAspect) / planeW;
  return { repeatU, repeatV, offsetU: (1 - repeatU) * 0.5, offsetV: 0 };
}

function spineUvNode(params: SpineContainTopUv) {
  return vec2(
    uv().x.mul(float(params.repeatU)).add(float(params.offsetU)),
    uv().y.mul(float(params.repeatV)).add(float(params.offsetV)),
  );
}

function createBookSpineOuterImageMaterial(
  resolver: MaterialResolver,
  resolvePreset: MaterialPresetResolver,
  materialId: string,
  coverTint: Rgb,
  tex: Texture,
  planeW: number,
  planeH: number,
  imageW?: number,
  imageH?: number,
  imageName?: string,
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  const useAlphaChannel = imageFormatMayHaveAlpha(
    resolveImageFileName(tex, imageName),
  );

  if (
    imageW !== undefined &&
    imageH !== undefined &&
    imageW > 0 &&
    imageH > 0
  ) {
    const uvParams = computeSpineContainTopUv(planeW, planeH, imageW, imageH);
    const sample = texture(tex, spineUvNode(uvParams));
    return createBookImageOnPresetMaterialFromNodes(
      resolver,
      resolvePreset,
      materialId,
      coverTint,
      { sample, useAlphaChannel },
    );
  }

  return createBookImageOnPresetMaterial(
    resolver,
    resolvePreset,
    materialId,
    coverTint,
    tex,
    planeW,
    planeH,
    imageW,
    imageH,
    imageName,
  );
}

function createBookSpineBoxMaterials(
  resolvePreset: MaterialPresetResolver,
  resolver: MaterialResolver,
  materialId: string,
  tex: Texture,
  planeW: number,
  planeH: number,
  coverTint: Rgb,
  imageW?: number,
  imageH?: number,
  imageName?: string,
): Material[] {
  const solid = createBookSolidSideMaterial(resolver, materialId, coverTint);
  const outer = createBookSpineOuterImageMaterial(
    resolver,
    resolvePreset,
    materialId,
    coverTint,
    tex,
    planeW,
    planeH,
    imageW,
    imageH,
    imageName,
  );
  return buildBookBoxMaterials(bookCoverOuterFaceIndex('bookSpine'), outer, solid);
}

export function createBookSpineMaterial(
  resolvePreset: MaterialPresetResolver,
  resolver: MaterialResolver,
  materialId: string,
  tex: Texture | null,
  planeW: number,
  planeH: number,
  coverTint: Rgb,
  imageW?: number,
  imageH?: number,
  imageName?: string,
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial | Material[] {
  if (!tex) {
    return resolveMeshMaterial(resolver, materialId || MATERIAL_PAPER_ID, {
      tint: coverTint,
    }) as MeshStandardNodeMaterial;
  }

  return createBookSpineBoxMaterials(
    resolvePreset,
    resolver,
    materialId,
    tex,
    planeW,
    planeH,
    coverTint,
    imageW,
    imageH,
    imageName,
  );
}
