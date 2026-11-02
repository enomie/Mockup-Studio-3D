import type { Node } from 'three/webgpu';
import {
  abs,
  float,
  fract,
  fwidth,
  max,
  min,
  mix,
  normalLocal,
  smoothstep,
} from 'three/tsl';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import { GRID_MAJOR_EVERY_MINOR_CELLS } from './grid-paper-unit';
import { triplanarMeterUvPairs } from './procedural-triplanar-meters';
import type { ProceduralMaterialNodes, ProceduralMaterialParams } from './procedural-types';

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

function distanceToLineInCells(coord: Node<'float'>) {
  return min(fract(coord), float(1).sub(fract(coord)));
}

/** Below this many pixels per cell the lines fade to their average coverage (no moiré). */
const AA_FADE_START_CELLS_PER_PIXEL = 0.2;
const AA_FADE_END_CELLS_PER_PIXEL = 0.45;

/**
 * Anti-aliased line mask along one axis. `fwidth` widens the edge by one pixel
 * footprint; when a cell gets close to pixel size the mask fades to the line's
 * average coverage instead of aliasing.
 */
function axisLineMask(coord: Node<'float'>, inner: Node<'float'>, outer: Node<'float'>) {
  const pixel = fwidth(coord);
  const dist = distanceToLineInCells(coord);
  const sharp = float(1).sub(smoothstep(inner, outer.add(pixel), dist));
  const coverage = inner.add(outer);
  const fade = smoothstep(
    float(AA_FADE_START_CELLS_PER_PIXEL),
    float(AA_FADE_END_CELLS_PER_PIXEL),
    pixel,
  );
  return mix(sharp, coverage, fade);
}

function buildGridLineMask(
  sampleUv: ReturnType<typeof buildProceduralSampleUv>,
  tileScale: number,
) {
  const { minorInner, minorOuter, majorInner, majorOuter } = cellUnitLineThresholds(tileScale);

  const minorMask = max(
    axisLineMask(sampleUv.x, minorInner, minorOuter),
    axisLineMask(sampleUv.y, minorInner, minorOuter),
  );

  const majorCoord = sampleUv.div(float(GRID_MAJOR_EVERY_MINOR_CELLS));
  const majorMask = max(
    axisLineMask(majorCoord.x, majorInner, majorOuter),
    axisLineMask(majorCoord.y, majorInner, majorOuter),
  );

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

export function buildGridPaperOpaqueNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  const lineMask = buildGridLineMaskForParams(params);
  const paper = params.uniforms.color;
  const lines = params.uniforms.lineColor;
  const colorNode = mix(paper, lines, lineMask);
  const roughnessNode = params.uniforms.roughness;

  return {
    colorNode,
    roughnessNode,
  };
}

export function buildGridPaperLinesNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  const lineMask = buildGridLineMaskForParams(params);
  const lines = params.uniforms.color;
  const roughnessNode = params.uniforms.roughness;

  return {
    colorNode: lines,
    roughnessNode,
    opacityNode: lineMask,
    transparent: true,
    depthWrite: false,
  };
}
