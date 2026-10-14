import type { AssetGeometryPart, AssetGeometryVisibility } from './geometry-visibility';
import type { MaterialEntitySlot } from './material-types';

export type GeometryPartUiMode = 'visibility-and-material' | 'visibility-only';

export interface AssetGeometryPartDescriptor {
  part: AssetGeometryPart;
  label: string;
  ui: GeometryPartUiMode;
  materialSlot?: MaterialEntitySlot;
  defaultVisible?: boolean;
}

export function geometryVisibilityFromPartDescriptors(
  parts: readonly AssetGeometryPartDescriptor[],
): AssetGeometryVisibility {
  const visibility: AssetGeometryVisibility = {};
  for (const descriptor of parts) {
    visibility[descriptor.part] = descriptor.defaultVisible ?? true;
  }
  return visibility;
}

export function geometryPartMaterialSlot(
  descriptor: AssetGeometryPartDescriptor,
): MaterialEntitySlot {
  if (descriptor.ui !== 'visibility-and-material' || !descriptor.materialSlot) {
    throw new Error(
      `Geometry part "${descriptor.part}" has no material slot (ui=${descriptor.ui}).`,
    );
  }
  return descriptor.materialSlot;
}
