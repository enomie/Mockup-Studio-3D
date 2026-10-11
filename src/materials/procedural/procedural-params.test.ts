import { describe, expect, it } from 'vitest';
import { MATERIAL_PAPER_ID } from '@/scene/material-ids';
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
  it('uses planar-meters for paper-grain on any surface role', () => {
    expect(resolveProceduralSamplingSpace('paper-grain', 'frame')).toBe('planar-meters');
    expect(resolveProceduralSamplingSpace('paper-grain', 'default')).toBe('planar-meters');
    expect(resolveProceduralSamplingSpace('paper-grain', 'ground')).toBe('planar-meters');
  });

  it('uses uv on frame perimeter for wood', () => {
    expect(resolveProceduralSamplingSpace('wood-soft', 'frame')).toBe('uv');
  });

  it('uses planar-meters on ground for wood and brushed metal', () => {
    expect(resolveProceduralSamplingSpace('wood-soft', 'ground')).toBe('planar-meters');
    expect(resolveProceduralSamplingSpace('wood-porous', 'ground')).toBe('planar-meters');
    expect(resolveProceduralSamplingSpace('metal-brushed', 'ground')).toBe('planar-meters');
    expect(resolveProceduralSamplingSpace('metal-polished', 'ground')).toBe('planar-meters');
  });

  it('defaults non-frame surfaces to uv', () => {
    expect(resolveProceduralSamplingSpace('wood-soft', 'default')).toBe('uv');
  });
});

describe('proceduralParamsFromPreset — surfaceRole', () => {
  it('sets planar-meters for Wood Soft on ground', () => {
    const preset = presetById('material-wood');
    const params = proceduralParamsFromPreset(preset, undefined, { surfaceRole: 'ground' });
    expect(params.samplingSpace).toBe('planar-meters');
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
});
