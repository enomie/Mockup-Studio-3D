import {
  abs,
  float,
  fract,
  max,
  min,
  mix,
  normalLocal,
  smoothstep,
  vec3,
} from 'three/tsl';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import { GRID_MAJOR_EVERY_MINOR_CELLS } from './grid-paper-unit';
import { triplanarMeterUvPairs } from './procedural-triplanar-meters';
import type { ProceduralMaterialNodes, ProceduralMaterialParams } from './procedural-types';
import type { Rgb } from '@/colors/rgb';

/** Line widths in minor-cell units at mm (`tileScale` 1000); scaled by `tileScale/1000` for constant mm in world. */
const MINOR_LINE_INNER_CELL = 0.018;
const MINOR_LINE_OUTER_CELL = 0.032;
const MAJOR_LINE_INNER_MAJOR_CELL = 0.028;
const MAJOR_LINE_OUTER_MAJOR_CELL = 0.045;
const MM_TILE_SCALE = 1000;

function cellUnitLineThresholds(tileScale: number) {
  const unitScale = float(tileScale / MM_TILE_SCALE);
  return {
    minorInner: float(MINOR_LINE_INNER_CELL).mul(unitScale),
    minorOuter: float(MINOR_LINE_OUTER_CELL).mul(unitScale),
    majorInner: float(MAJOR_LINE_INNER_MAJOR_CELL).mul(unitScale),
    majorOuter: float(MAJOR_LINE_OUTER_MAJOR_CELL).mul(unitScale),
  };
}

 
function distanceToLineInCells(coord: any) {
  return min(fract(coord), float(1).sub(fract(coord)));
}

function buildGridLineMask(
  sampleUv: ReturnType<typeof buildProceduralSampleUv>,
  tileScale: number,
) {
  const { minorInner, minorOuter, majorInner, majorOuter } = cellUnitLineThresholds(tileScale);

  const minorDistX = distanceToLineInCells(sampleUv.x);
  const minorDistY = distanceToLineInCells(sampleUv.y);
  const minorDist = min(minorDistX, minorDistY);
  const minorMask = float(1).sub(smoothstep(minorInner, minorOuter, minorDist));

  const majorDivisor = float(GRID_MAJOR_EVERY_MINOR_CELLS);
  const majorCoord = sampleUv.div(majorDivisor);
  const majorDistX = distanceToLineInCells(majorCoord.x);
  const majorDistY = distanceToLineInCells(majorCoord.y);
  const majorDist = min(majorDistX, majorDistY);
  const majorMask = float(1).sub(smoothstep(majorInner, majorOuter, majorDist));

  return max(minorMask, majorMask);
}

function buildGridLineMaskTriplanar(tileScale: number) {
  const uvs = triplanarMeterUvPairs(tileScale);
  const maskXy = buildGridLineMask(uvs.xy, tileScale);
  const maskXz = buildGridLineMask(uvs.xz, tileScale);
  const maskYz = buildGridLineMask(uvs.yz, tileScale);

  // One projection per face: constant axis in a non-dominant plane makes min(distX,distY)→0 → solid line color.
  const n = abs(normalLocal);
  const useXy = n.z.greaterThanEqual(max(n.x, n.y));
  const useXz = n.y.greaterThanEqual(n.x).and(n.y.greaterThan(n.z));
  return useXy.select(maskXy, useXz.select(maskXz, maskYz));
}

function buildGridLineMaskForParams(params: ProceduralMaterialParams) {
  const tileScale = params.tileScale;
  if (params.samplingSpace === 'triplanar-meters') {
    return buildGridLineMaskTriplanar(tileScale);
  }

  return buildGridLineMask(buildProceduralSampleUv(params), tileScale);
}

function rgbVec3(rgb: Rgb) {
  return vec3(rgb.r, rgb.g, rgb.b);
}

function defaultLineColor(params: ProceduralMaterialParams): Rgb {
  return params.lineColor ?? { r: 0.72, g: 0.78, b: 0.88 };
}

export function buildGridPaperOpaqueNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  const lineMask = buildGridLineMaskForParams(params);
  const paper = rgbVec3(params.color);
  const lines = rgbVec3(defaultLineColor(params));
  const colorNode = mix(paper, lines, lineMask);
  const roughnessNode = float(params.roughness);

  return {
    colorNode,
    roughnessNode,
  };
}

export function buildGridPaperLinesNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  const lineMask = buildGridLineMaskForParams(params);
  const lines = rgbVec3(params.color);
  const roughnessNode = float(params.roughness);

  return {
    colorNode: lines,
    roughnessNode,
    opacityNode: lineMask,
    transparent: true,
    depthWrite: false,
  };
}
