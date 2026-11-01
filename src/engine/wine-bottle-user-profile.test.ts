import { MeshBasicMaterial } from 'three/webgpu';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultWineBottleParams } from '@/scene/asset-wine-bottle';
import { BUILTIN_PROFILES, type ProfileEntry } from '@/scene/profile-library';
import { setRegisteredUserProfiles } from '@/scene/profile-registry';
import { buildWineBottleMeshes } from './wine-bottle-geometry';

const stub = new MeshBasicMaterial();

function userCopy(sourceId: string, id: string): ProfileEntry {
  const source = BUILTIN_PROFILES.find((entry) => entry.id === sourceId);
  if (!source) {throw new Error(sourceId);}
  return { id, name: 'Copy', source: 'user', paths: structuredClone(source.paths) };
}

async function build(profileId: string) {
  return buildWineBottleMeshes({
    params: { ...defaultWineBottleParams(), wineBottleBodyProfile: profileId },
    sizeScale: 1,
    glassMaterial: stub,
    corkMaterial: stub,
    foilMaterial: stub,
    discMaterial: stub,
  });
}

describe('wine bottle with user profiles', () => {
  afterEach(() => { setRegisteredUserProfiles([]); });

  it('builds glass and capsule parts from an edited copy of Bordeaux', async () => {
    setRegisteredUserProfiles([userCopy('bottle-bordeaux', 'user-bottle')]);
    const result = await build('user-bottle');
    result.bodyMesh.geometry.computeBoundingBox();
    const box = result.bodyMesh.geometry.boundingBox;
    expect((box?.max.y ?? 0) - (box?.min.y ?? 0)).toBeCloseTo(0.29, 2);
    expect(result.corkMesh).not.toBeNull();
    expect(result.foilMesh).not.toBeNull();
  });

  it('builds something (weird is fine) from a can profile without capsule parts', async () => {
    setRegisteredUserProfiles([userCopy('can-330-classic', 'user-can')]);
    const result = await build('user-can');
    expect(result.bodyMesh.geometry.getAttribute('position').count).toBeGreaterThan(0);
    expect(result.discMesh).toBeNull();
    expect(result.corkMesh).toBeNull();
  });
});
