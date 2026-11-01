import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { measureLatheSvgMm } from '@/engine/lathe-svg-metrics';
import { BUILTIN_PROFILE_PATHS } from '@/data/builtin-profiles.generated';
import { importProfilePathsFromSvg } from '@/engine/profile-svg-import';
import { builtinPathName } from './builtin-profile-path-names';
import { BUILTIN_PROFILES } from './profile-library';
import {
  profilePathToSvgData,
  profileToSvg,
  roundProfilePaths,
  type ProfilePath,
} from './profile-model';

const TOLERANCE_MM = 0.05;

describe('profile model', () => {
  it.each(BUILTIN_PROFILES)('$id round-trips to an SVG with the same metrics', (entry) => {
    const original = measureLatheSvgMm(
      readFileSync(resolve('public/profiles/lathe', entry.file), 'utf8'),
    );
    const roundTrip = measureLatheSvgMm(profileToSvg(entry));
    for (const key of ['minX', 'maxX', 'minY', 'maxY'] as const) {
      expect(Math.abs(roundTrip.bounds[key] - original.bounds[key])).toBeLessThan(TOLERANCE_MM);
    }
    original.slots.forEach((slot, index) => {
      const other = roundTrip.slots[index];
      if (slot === null) {
        expect(other).toBeNull();
        return;
      }
      expect(other).not.toBeNull();
      for (const key of ['minX', 'maxX', 'minY', 'maxY'] as const) {
        expect(Math.abs((other?.[key] ?? NaN) - slot[key])).toBeLessThan(TOLERANCE_MM);
      }
    });
  });

  it('names the built-in paths', () => {
    const names = (id: string) =>
      BUILTIN_PROFILES.find((entry) => entry.id === id)?.paths.map((path) => path.name);
    expect(names('bottle-bordeaux')).toEqual(['Glass', 'Capsule foil', 'Capsule disc', 'Cork']);
    expect(names('can-330-classic')).toEqual(['Body', 'Top ring']);
    expect(names('pen-marker')).toEqual(['Cap', 'Ring', 'Body']);
    expect(names('wheel-car')).toEqual(['Tire', 'Rim outer', 'Rim inner', 'Spoke']);
  });

  it.each(BUILTIN_PROFILES)('$id generated paths are in sync (run scripts/generate-builtin-profiles.ts)', (entry) => {
    const svg = readFileSync(resolve('public/profiles/lathe', entry.file), 'utf8');
    const imported = importProfilePathsFromSvg(svg, (slot) => builtinPathName(entry.usedBy, slot));
    expect(BUILTIN_PROFILE_PATHS[entry.id]).toEqual(roundProfilePaths(imported));
  });

  it('writes lines and curves', () => {
    const path: ProfilePath = {
      id: 'p',
      name: 'Test',
      slot: 0,
      closed: true,
      nodes: [
        { x: 0, y: 0, mode: 'corner' },
        { x: 10, y: 0, mode: 'corner', handleOut: { x: 0, y: 5 } },
        { x: 10, y: 10, mode: 'corner', handleIn: { x: 0, y: -5 } },
      ],
    };
    expect(profilePathToSvgData(path)).toBe('M0,0L10,0C10,5 10,5 10,10Z');
  });
});
