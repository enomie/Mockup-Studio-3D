import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defaultWineBottleParams,
  resolveWineBottleProfile,
  wineBottleMaxOuterDiameterM,
  wineBottleNominalHeightM,
  wineBottleOverallHeightM,
} from './asset-wine-bottle';
import type { AssetEntity } from './entity-types';
import { BUILTIN_PROFILES, type ProfileEntry } from './profile-library';
import {
  canonicalProfileId,
  findProfile,
  profileVersion,
  setRegisteredUserProfiles,
  subscribeProfiles,
} from './profile-registry';
import { countProfileUsage } from './profile-usage';

function userCopy(sourceId: string, id: string): ProfileEntry {
  const source = BUILTIN_PROFILES.find((entry) => entry.id === sourceId);
  if (!source) {throw new Error(sourceId);}
  return { id, name: `${source.name} copy`, source: 'user', paths: structuredClone(source.paths) };
}

describe('profile registry', () => {
  afterEach(() => { setRegisteredUserProfiles([]); });

  it('maps legacy wine bottle names to built-in ids', () => {
    expect(canonicalProfileId('alsace')).toBe('bottle-alsace');
    expect(findProfile('sparkling')?.id).toBe('bottle-sparkling');
    expect(defaultWineBottleParams('bordeaux').wineBottleBodyProfile).toBe('bottle-bordeaux');
    expect(wineBottleOverallHeightM('bordeaux')).toBe(wineBottleOverallHeightM('bottle-bordeaux'));
  });

  it('reports changed, added and removed user profiles and bumps versions', () => {
    const heard: string[][] = [];
    const stop = subscribeProfiles((ids) => { heard.push([...ids].sort()); });
    const a = userCopy('bottle-bordeaux', 'user-a');
    const b = userCopy('bottle-alsace', 'user-b');
    setRegisteredUserProfiles([a, b]);
    setRegisteredUserProfiles([a, { ...b, name: 'Renamed' }]);
    setRegisteredUserProfiles([a]);
    stop();
    expect(heard).toEqual([['user-a', 'user-b'], ['user-b'], ['user-b']]);
    expect(profileVersion('user-a')).toBeGreaterThan(0);
    expect(profileVersion('user-b')).toBeGreaterThan(profileVersion('user-a'));
  });

  it('sizes a bottle from a user profile like its built-in source', () => {
    setRegisteredUserProfiles([userCopy('bottle-bordeaux', 'user-copy')]);
    expect(resolveWineBottleProfile('user-copy')).toMatchObject({ missing: false });
    expect(wineBottleNominalHeightM('user-copy')).toBeCloseTo(wineBottleNominalHeightM('bottle-bordeaux'), 4);
    expect(wineBottleMaxOuterDiameterM('user-copy')).toBeCloseTo(wineBottleMaxOuterDiameterM('bottle-bordeaux'), 4);
  });

  it('falls back to Bordeaux for missing profiles or profiles without a glass path', () => {
    expect(resolveWineBottleProfile('user-gone')).toMatchObject({ missing: true });
    expect(resolveWineBottleProfile('user-gone').entry.id).toBe('bottle-bordeaux');
    const noGlass = userCopy('bottle-bordeaux', 'user-no-glass');
    noGlass.paths = noGlass.paths.filter((path) => path.slot !== 0);
    setRegisteredUserProfiles([noGlass]);
    expect(resolveWineBottleProfile('user-no-glass').missing).toBe(true);
  });

  it('counts wine bottles that use a profile', () => {
    const bottle = (profile: string) => ({
      assetKind: 'wine-bottle',
      wineBottleParams: { ...defaultWineBottleParams(), wineBottleBodyProfile: profile },
    }) as unknown as AssetEntity;
    const entities = [bottle('bordeaux'), bottle('bottle-bordeaux'), bottle('user-x')];
    expect(countProfileUsage(entities, 'bottle-bordeaux')).toBe(2);
    expect(countProfileUsage(entities, 'user-x')).toBe(1);
  });
});

describe('profile rebuild scheduler', () => {
  afterEach(() => {
    setRegisteredUserProfiles([]);
    vi.useRealTimers();
  });

  it('rebuilds bottles using a changed profile after the changes settle', async () => {
    vi.useFakeTimers();
    const { ProfileRebuildScheduler, PROFILE_REBUILD_SETTLE_MS } = await import(
      '@/engine/profile-rebuild-scheduler'
    );
    const rebuilt: string[] = [];
    const entities = [
      { id: 'e1', assetKind: 'wine-bottle', wineBottleParams: { ...defaultWineBottleParams(), wineBottleBodyProfile: 'user-a' } },
      { id: 'e2', assetKind: 'wine-bottle', wineBottleParams: defaultWineBottleParams() },
    ] as unknown as AssetEntity[];
    const scheduler = new ProfileRebuildScheduler({
      getEntities: () => entities,
      rebuildEntity: (id) => { rebuilt.push(id); return Promise.resolve(); },
    });
    setRegisteredUserProfiles([userCopy('bottle-bordeaux', 'user-a')]);
    expect(rebuilt).toEqual([]);
    vi.advanceTimersByTime(PROFILE_REBUILD_SETTLE_MS + 1);
    expect(rebuilt).toEqual(['e1']);
    scheduler.dispose();
  });
});
