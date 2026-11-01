import { describe, expect, it } from 'vitest';
import { getAllAssetKindDefinitions } from '@/scene/asset-kind-registry';
import {
  ARRANGEMENT_PRESETS,
  BUILTIN_ARRANGEMENT_CLOTHING_ID,
  BUILTIN_ARRANGEMENT_DEFAULT_ID,
  defaultArrangementSpawns,
  resolveBuiltinArrangementPreset,
} from './builtin-arrangements';

describe('built-in arrangements', () => {
  it('has four built-ins with unique ids', () => {
    const ids = ARRANGEMENT_PRESETS.map((preset) => preset.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ARRANGEMENT_PRESETS.every((preset) => preset.source === 'builtin')).toBe(true);
  });

  it('only uses known asset kinds', () => {
    const knownKinds = getAllAssetKindDefinitions().map((definition) => definition.kind);
    for (const preset of ARRANGEMENT_PRESETS) {
      expect(preset.content.kind).toBe('spawn');
      if (preset.content.kind !== 'spawn') {continue;}
      expect(preset.content.assets.length).toBeGreaterThan(0);
      for (const asset of preset.content.assets) {
        expect(knownKinds).toContain(asset.assetKind);
      }
    }
  });

  it('starts the app with the Clothing arrangement', () => {
    expect(BUILTIN_ARRANGEMENT_DEFAULT_ID).toBe(BUILTIN_ARRANGEMENT_CLOTHING_ID);
    const clothing = resolveBuiltinArrangementPreset(BUILTIN_ARRANGEMENT_CLOTHING_ID);
    expect(clothing?.content).toEqual({ kind: 'spawn', assets: defaultArrangementSpawns() });
  });

  it('Car: four wheels, sports car wheelbase and track, front axle north (−Z)', () => {
    const car = ARRANGEMENT_PRESETS.find((preset) => preset.name === 'Car');
    expect(car?.content.kind).toBe('spawn');
    if (car?.content.kind !== 'spawn') {return;}
    const wheels = car.content.assets;
    expect(wheels).toHaveLength(4);
    expect(wheels.every((w) => w.assetKind === 'wheel-car')).toBe(true);
    const front = wheels.filter((w) => w.position.z < 0);
    const rear = wheels.filter((w) => w.position.z > 0);
    expect(front).toHaveLength(2);
    expect(rear).toHaveLength(2);
    expect(rear[0].position.z - front[0].position.z).toBeCloseTo(2.45, 6);
    expect(Math.abs(front[0].position.x - front[1].position.x)).toBeCloseTo(1.589, 6);
    expect(Math.abs(rear[0].position.x - rear[1].position.x)).toBeCloseTo(1.557, 6);
  });
});
