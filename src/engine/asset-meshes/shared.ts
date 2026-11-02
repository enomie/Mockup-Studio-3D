import type { Material } from 'three/webgpu';
import type { AssetFaceId, AssetFaces } from '@/scene/asset-faces';
import type { Rgb } from '@/colors/rgb';
import {
  TINT_NEUTRAL,
  type AssetMaterialSlots,
  type MaterialEntitySlot,
} from '@/scene/material-types';
import { MATERIAL_PAPER_ID } from '@/scene/material-ids';
import { resolveSlotGloss } from '@/scene/paper-gloss';
import {
  createSolidPbrMaterial,
  type MaterialResolveOptions,
  type MaterialResolver,
} from '@/engine/material-resolver';

/** Front wallpaper plane sits slightly in front of the body box face (avoids z-fighting). */
export const WALLPAPER_FRONT_Z_EPSILON_M = 0.0005;

export const FRAME_THICKNESS = 0.018;
export const FRAME_DEPTH = 0.012;
export const BACK_WALL_THICKNESS = 0.003;
export const GLAZING_THICKNESS = 0.002;
/** Image plane sits this far behind the frame front face (into the rabbet). */
export const IMAGE_RECESS = 0.004;
/** Air gap between glazing back face and image plane. */
export const GLAZING_IMAGE_GAP = 0.001;

const SIDE_FACE_IDS: AssetFaceId[] = ['left', 'right', 'top', 'bottom'];

export function faceMaterialSlot(faceId: AssetFaceId): MaterialEntitySlot {
  if (faceId === 'front') {return 'frontMaterialId';}
  if (faceId === 'back') {return 'backMaterialId';}
  return 'sideMaterialId';
}

export function resolveMaterialId(
  faceId: AssetFaceId,
  materials: AssetMaterialSlots,
): string {
  return materials[faceMaterialSlot(faceId)] ?? MATERIAL_PAPER_ID;
}

export function resolveMeshMaterial(
  resolver: MaterialResolver,
  materialId: string,
  options: MaterialResolveOptions = {},
): Material {
  return (
    resolver.create(materialId, options) ??
    resolver.create(MATERIAL_PAPER_ID, options) ??
    createSolidPbrMaterial({
      id: 'fallback',
      name: 'Fallback',
      source: 'builtin',
      kind: 'solid-pbr',
      color: { r: 0.8, g: 0.8, b: 0.8 },
      roughness: 0.5,
      metalness: 0,
    })
  );
}

/** Mesh material for a slot; passes the slot's finish (gloss) for Paper. */
export function resolveSlotMeshMaterial(
  resolver: MaterialResolver,
  materials: AssetMaterialSlots,
  slot: MaterialEntitySlot,
  fallbackMaterialId: string,
  options: MaterialResolveOptions = {},
): Material {
  return resolveMeshMaterial(resolver, materials[slot] ?? fallbackMaterialId, {
    ...options,
    gloss: resolveSlotGloss(materials, slot),
  });
}

export function resolveFaceTint(
  faceId: AssetFaceId,
  materials: AssetMaterialSlots,
  faces: AssetFaces,
): Rgb {
  if (materials.faceTints?.[faceId]) {
    return materials.faceTints[faceId];
  }

  if (faceId === 'back' && faces.back.mode === 'color') {
    return faces.back.color;
  }

  if (SIDE_FACE_IDS.includes(faceId)) {
    const content = faces[faceId];
    if (content.mode === 'color') {
      return content.color;
    }
  }

  return TINT_NEUTRAL;
}

export function facePlaneSize(
  faceId: AssetFaceId,
  faceWidth: number,
  faceHeight: number,
  depth: number,
): { width: number; height: number } {
  switch (faceId) {
    case 'front':
    case 'back':
      return { width: faceWidth, height: faceHeight };
    case 'left':
    case 'right':
      return { width: depth, height: faceHeight };
    case 'top':
    case 'bottom':
      return { width: faceWidth, height: depth };
  }
}
