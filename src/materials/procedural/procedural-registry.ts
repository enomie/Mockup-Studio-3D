import type { ProceduralProfileId } from '@/scene/material-types';
import { buildConcretePorousNodes } from './concrete-porous';
import { buildConcreteStainedNodes } from './concrete-stained';
import { buildFabricLinenNodes } from './fabric-linen';
import { buildMetalBrushedNodes } from './metal-brushed';
import { buildMetalPolishedNodes } from './metal-polished';
import { buildGridPaperLinesNodes, buildGridPaperOpaqueNodes } from './grid-paper';
import { buildPaperGrainNodes } from './paper-grain';
import {
  buildCoatedGlossNodes,
  buildPlasticMatteNodes,
  buildPlasticSmoothNodes,
} from './plastic-surface';
import { buildGlassSurfaceNodes } from './glass-surface';
import { normalizeProceduralProfile } from './procedural-profile';
import type { ProceduralMaterialNodes, ProceduralMaterialParams } from './procedural-types';
import { buildWoodPorousNodes } from './wood-porous';
import { buildWoodSoftNodes } from './wood-soft';

const METAL_PROFILES: ReadonlySet<ProceduralProfileId> = new Set([
  'metal-polished',
  'metal-brushed',
]);

const WOOD_PROFILES: ReadonlySet<ProceduralProfileId> = new Set([
  'wood-soft',
  'wood-porous',
]);

export function isMetalProceduralProfile(profile: ProceduralProfileId): boolean {
  return METAL_PROFILES.has(profile);
}

export function isWoodProceduralProfile(profile: ProceduralProfileId): boolean {
  return WOOD_PROFILES.has(profile);
}

export function getProceduralMaterialNodes(
  profile: ProceduralProfileId,
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  const resolved = normalizeProceduralProfile(profile);

  switch (resolved) {
    case 'wood-soft':
      return buildWoodSoftNodes(params);
    case 'wood-porous':
      return buildWoodPorousNodes(params);
    case 'metal-polished':
      return buildMetalPolishedNodes(params);
    case 'metal-brushed':
      return buildMetalBrushedNodes(params);
    case 'paper-grain':
      return buildPaperGrainNodes(params);
    case 'grid-paper-opaque':
      return buildGridPaperOpaqueNodes(params);
    case 'grid-paper-lines':
      return buildGridPaperLinesNodes(params);
    case 'concrete-stained':
      return buildConcreteStainedNodes(params);
    case 'concrete-porous':
      return buildConcretePorousNodes(params);
    case 'fabric-linen':
      return buildFabricLinenNodes(params);
    case 'silk-fine':
      return buildMetalBrushedNodes(params);
    case 'coated-gloss':
      return buildCoatedGlossNodes(params);
    case 'plastic-matte':
      return buildPlasticMatteNodes(params);
    case 'plastic-smooth':
      return buildPlasticSmoothNodes(params);
    case 'glass-surface':
      return buildGlassSurfaceNodes(params);
    default:
      throw new Error(`Procedural profile not implemented: ${profile}`);
  }
}
