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
  it('has three built-ins with unique ids', () => {
    const ids = ARRANGEMENT_PRESETS.map((preset) => preset.id);
    expect(ids).toHaveLength(3);
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
});
