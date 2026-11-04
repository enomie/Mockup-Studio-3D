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
    const assets = car.content.assets;
    expect(assets).toHaveLength(7);
    expect(assets.every((a) => a.physicsBodyMode === 'fixed')).toBe(true);
    const wheels = assets.filter((a) => a.assetKind === 'wheel-car');
    expect(wheels).toHaveLength(4);
    const front = wheels.filter((w) => w.position.z < 0);
    const rear = wheels.filter((w) => w.position.z > 0);
    expect(front).toHaveLength(2);
    expect(rear).toHaveLength(2);
    expect(rear[0].position.z - front[0].position.z).toBeCloseTo(2.45, 6);
    expect(Math.abs(front[0].position.x - front[1].position.x)).toBeCloseTo(1.589, 6);
    expect(Math.abs(rear[0].position.x - rear[1].position.x)).toBeCloseTo(1.557, 6);
  });

  it('Car: static brushed aluminum chassis block and two axles spanning the track', () => {
    const car = ARRANGEMENT_PRESETS.find((preset) => preset.name === 'Car');
    if (car?.content.kind !== 'spawn') {throw new Error('Car must be a spawn arrangement');}
    const block = car.content.assets.find((a) => a.assetKind === 'block');
    expect(block).toMatchObject({
      position: { x: 0, z: 0 },
      positionY: 0.2613,
      blockParams: { widthM: 0.5, heightM: 0.2, depthM: 2.7, cornerRadiusMm: 5 },
      materialSlot: 'blockMaterialId',
      materialId: 'material-aluminium-brushed',
      physicsDensityKgPerM3: 1000,
    });
    const axles = car.content.assets.filter((a) => a.assetKind === 'cylinder');
    expect(axles.map((a) => a.cylinderParams?.heightM)).toEqual([1.589, 1.557]);
    for (const axle of axles) {
      expect(axle.cylinderParams?.radiusM).toBe(0.03);
      expect(axle.rotationDeg).toEqual({ z: 90 });
      expect(axle.position.x).toBeCloseTo((axle.cylinderParams?.heightM ?? 0) / 2, 6);
      expect(axle.materialId).toBe('material-aluminium-brushed');
    }
  });
});
