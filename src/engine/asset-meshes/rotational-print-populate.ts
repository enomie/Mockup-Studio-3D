import type { Material } from 'three/webgpu';
import { finishToMaterialId, resolveImageSurfaceSettings } from '@/scene/image-surface';
import {
  resolveRotationalPrintSettings,
  type RotationalPrintAssetKind,
} from '@/scene/rotational-print';
import type { MaterialResolveOptions } from '@/engine/material-resolver';
import {
  rotationalPrintFit,
  type RotationalPrintLayout,
} from '@/engine/rotational-print-mapping';
import { createRotationalPrintMaterial } from '@/engine/rotational-print-material';
import type { AssetBuildContext } from './asset-build-context';
import { resolveMeshMaterial } from './shared';

export interface RotationalPrintBodyInput {
  assetKind: RotationalPrintAssetKind;
  bodyMaterialId: string;
  bodyOptions?: MaterialResolveOptions;
  layout: RotationalPrintLayout;
  /** Unrolled band size (meters): circumference or arc × axis length. */
  planeW: number;
  planeH: number;
  /** False when the `label` geometry part is hidden: body renders without print. */
  printVisible?: boolean;
}

/**
 * Body material for a rotational asset: the plain preset, or the preset with the
 * image printed into it (geometry must carry `printUv`).
 */
export function resolveRotationalPrintBodyMaterial(
  context: AssetBuildContext,
  input: RotationalPrintBodyInput,
): Material | null {
  const resolver = context.materialResolver;
  if (!resolver) {return null;}

  const options = input.bodyOptions ?? {};
  const tex = context.imageTexture;
  if (!tex || input.printVisible === false) {
    return resolveMeshMaterial(resolver, input.bodyMaterialId, options);
  }

  const baseMaterial = resolver.createUncached(input.bodyMaterialId, options);
  if (!baseMaterial) {
    return resolveMeshMaterial(resolver, input.bodyMaterialId, options);
  }

  const surface = resolveImageSurfaceSettings(context.imageSurfaces, 'label', {
    assetKind: input.assetKind,
  });
  return createRotationalPrintMaterial({
    baseMaterial,
    texture: tex,
    fit: rotationalPrintFit(
      input.layout,
      input.planeW,
      input.planeH,
      context.imageWidth,
      context.imageHeight,
    ),
    surface,
    finishPreset: resolver.resolvePreset(finishToMaterialId(surface.finish)),
    settings: resolveRotationalPrintSettings(surface, input.assetKind),
  });
}
