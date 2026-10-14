import { describe, expect, it } from 'vitest';
import {
  MATERIAL_GRID_LINES_ID,
  MATERIAL_GRID_PAPER_ID,
  MATERIAL_GLOSSY_PRINT_ID,
  MATERIAL_PAPER_ID,
} from '@/scene/material-ids';
import { DEFAULT_TILE_SCALE_GRID_PAPER } from './procedural-types';
import { MATERIAL_PRESETS } from '@/data/material-presets';
import {
  proceduralParamsFromPreset,
  resolveProceduralSamplingSpace,
} from './procedural-params';

function presetById(id: string) {
  const preset = MATERIAL_PRESETS.find((entry) => entry.id === id);
  if (!preset) {
    throw new Error(`Missing preset: ${id}`);
  }
  return preset;
}

describe('resolveProceduralSamplingSpace', () => {
  it('uses planar-meters for paper-grain on frame', () => {
    expect(resolveProceduralSamplingSpace('paper-grain', 'frame')).toBe('planar-meters');
  });

  it('uses meter-3d for paper-grain on solids and ground', () => {
    expect(resolveProceduralSamplingSpace('paper-grain', 'default')).toBe('meter-3d');
    expect(resolveProceduralSamplingSpace('paper-grain', 'ground')).toBe('meter-3d');
  });

  it('uses triplanar-meters for grid paper on solids, planar on ground', () => {
    expect(resolveProceduralSamplingSpace('grid-paper-opaque', 'default')).toBe('triplanar-meters');
    expect(resolveProceduralSamplingSpace('grid-paper-lines', 'frame')).toBe('triplanar-meters');
    expect(resolveProceduralSamplingSpace('grid-paper-opaque', 'ground')).toBe('planar-meters');
  });

  it('uses uv on frame for wood and metal', () => {
    expect(resolveProceduralSamplingSpace('wood-soft', 'frame')).toBe('uv');
    expect(resolveProceduralSamplingSpace('metal-polished', 'frame')).toBe('uv');
  });

  it('uses triplanar-meters on solids for wood (like grid paper)', () => {
    expect(resolveProceduralSamplingSpace('wood-soft', 'default')).toBe('triplanar-meters');
    expect(resolveProceduralSamplingSpace('wood-porous', 'default')).toBe('triplanar-meters');
  });

  it('uses triplanar-meters on solids and planar on ground for concrete porous', () => {
    expect(resolveProceduralSamplingSpace('concrete-porous', 'default')).toBe('triplanar-meters');
    expect(resolveProceduralSamplingSpace('concrete-porous', 'ground')).toBe('planar-meters');
  });

  it('uses meter-3d on default for fabric, concrete stained, plastics', () => {
    expect(resolveProceduralSamplingSpace('fabric-linen', 'default')).toBe('meter-3d');
    expect(resolveProceduralSamplingSpace('concrete-stained', 'default')).toBe('meter-3d');
    expect(resolveProceduralSamplingSpace('coated-gloss', 'default')).toBe('meter-3d');
    expect(resolveProceduralSamplingSpace('plastic-matte', 'default')).toBe('meter-3d');
  });

  it('uses planar-meters on ground for wood', () => {
    expect(resolveProceduralSamplingSpace('wood-soft', 'ground')).toBe('planar-meters');
  });

  it('uses meter-3d on ground for brushed metal', () => {
    expect(resolveProceduralSamplingSpace('metal-brushed', 'ground')).toBe('meter-3d');
  });
});

describe('proceduralParamsFromPreset — surfaceRole', () => {
  it('sets triplanar-meters for Wood Soft on block mesh', () => {
    const preset = presetById('material-wood');
    const params = proceduralParamsFromPreset(preset, undefined, { surfaceRole: 'default' });
    expect(params.samplingSpace).toBe('triplanar-meters');
  });

  it('sets uv for Wood Soft on frame', () => {
    const preset = presetById('material-wood');
    const params = proceduralParamsFromPreset(preset, undefined, { surfaceRole: 'frame' });
    expect(params.samplingSpace).toBe('uv');
  });

  it('keeps planar-meters for Print Matt on frame', () => {
    const preset = presetById(MATERIAL_PAPER_ID);
    const params = proceduralParamsFromPreset(preset, undefined, { surfaceRole: 'frame' });
    expect(params.samplingSpace).toBe('planar-meters');
  });

  it('defaults grid paper tile scale to lines per meter', () => {
    const opaque = presetById(MATERIAL_GRID_PAPER_ID);
    const params = proceduralParamsFromPreset(opaque);
    expect(params.tileScale).toBe(DEFAULT_TILE_SCALE_GRID_PAPER);
    expect(opaque.gridUnit).toBe('mm');
    expect(params.lineColor).toEqual(opaque.lineColor);
  });

  it('derives tileScale from gridUnit', () => {
    const opaque = presetById(MATERIAL_GRID_PAPER_ID);
    const params = proceduralParamsFromPreset({ ...opaque, gridUnit: 'cm', tileScale: 1000 });
    expect(params.tileScale).toBe(100);
  });

  it('passes line color only when preset defines it', () => {
    const lines = presetById(MATERIAL_GRID_LINES_ID);
    const params = proceduralParamsFromPreset(lines);
    expect(params.lineColor).toBeUndefined();
    expect(params.samplingSpace).toBe('triplanar-meters');
  });

  it('textured glossy print uses coated-gloss profile', () => {
    const preset = presetById(MATERIAL_GLOSSY_PRINT_ID);
    expect(preset.kind).toBe('textured');
    expect(preset.proceduralProfile).toBe('coated-gloss');
    const params = proceduralParamsFromPreset(preset);
    expect(params.samplingSpace).toBe('meter-3d');
  });
});
