import { describe, expect, it } from 'vitest';
import type { AssetKind } from '@/scene/asset-kind';
import { ASSET_CATALOG } from './asset-catalog';

/** Built-in catalog kinds only — `fabric-cloth-baked` is user-library placement, not in ASSET_CATALOG. */
const BUILTIN_CATALOG_KINDS: Record<Exclude<AssetKind, 'fabric-cloth-baked'>, true> = {
  print: true,
  picture: true,
  smartphone: true,
  tablet: true,
  monitor: true,
  wall: true,
  'wall-door': true,
  block: true,
  cylinder: true,
  sphere: true,
  'wheel-car': true,
  'beverage-can': true,
  'tin-can': true,
  'wine-bottle': true,
  pen: true,
  'fabric-cloth': true,
  'book-softcover': true,
  'book-hardcover': true,
  'triangle-patch': true,
};

describe('asset catalog', () => {
  it('covers every AssetKind exactly once', () => {
    const catalogKinds = ASSET_CATALOG.map((entry) => entry.kind);
    const expectedKinds = Object.keys(BUILTIN_CATALOG_KINDS) as AssetKind[];

    expect(catalogKinds.length).toBe(expectedKinds.length);
    for (const kind of expectedKinds) {
      expect(catalogKinds).toContain(kind);
    }
  });
});
