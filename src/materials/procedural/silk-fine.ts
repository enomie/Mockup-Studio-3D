import { buildMetalBrushedNodes } from './metal-brushed';
import type { ProceduralMaterialNodes, ProceduralMaterialParams } from './procedural-types';

/** Legacy profile id — same nodes as `metal-brushed`. */
export function buildSilkFineNodes(params: ProceduralMaterialParams): ProceduralMaterialNodes {
  return buildMetalBrushedNodes(params);
}
