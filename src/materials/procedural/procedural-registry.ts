import type { ProceduralProfileId } from '@/scene/material-types';
import { buildMetalBrushedNodes } from './metal-brushed';
import { buildMetalPolishedNodes } from './metal-polished';
import { buildPaperGrainNodes } from './paper-grain';
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
    default:
      throw new Error(`Procedural profile not implemented: ${profile}`);
  }
}
