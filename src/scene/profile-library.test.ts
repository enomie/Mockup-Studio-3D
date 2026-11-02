import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BUILTIN_PROFILES,
  builtinProfileFile,
  getProfile,
  profileMetrics,
  profileSizeLabel,
} from './profile-library';

describe('profile library', () => {
  it('lists all nine built-in profiles with unique ids', () => {
    expect(BUILTIN_PROFILES).toHaveLength(9);
    expect(new Set(BUILTIN_PROFILES.map((entry) => entry.id)).size).toBe(9);
  });

  it.each(BUILTIN_PROFILES)('$id points to a shipped SVG with metrics', (entry) => {
    expect(existsSync(resolve('public/profiles', entry.dir, entry.file))).toBe(true);
    expect(profileMetrics(entry)).toBeDefined();
    expect(profileSizeLabel(entry)).toMatch(/^\d+ × \d+ mm$/);
  });

  it('resolves files and entries by id', () => {
    expect(builtinProfileFile('wheel-car')).toBe('lathe-x-wheel-car.svg');
    expect(getProfile('bottle-bordeaux')?.name).toBe('Bordeaux bottle');
    expect(getProfile('missing')).toBeUndefined();
  });
});
