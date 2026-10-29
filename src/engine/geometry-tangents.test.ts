import { BoxGeometry } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { ensureGeometryTangents } from './geometry-tangents';

describe('ensureGeometryTangents', () => {
  it('adds tangent attribute when UVs are present', () => {
    const geometry = new BoxGeometry(1, 1, 1);
    expect(geometry.hasAttribute('tangent')).toBe(false);
    ensureGeometryTangents(geometry);
    expect(geometry.hasAttribute('tangent')).toBe(true);
  });

  it('can be called twice without error', () => {
    const geometry = new BoxGeometry(1, 1, 1);
    ensureGeometryTangents(geometry);
    ensureGeometryTangents(geometry);
    expect(geometry.hasAttribute('tangent')).toBe(true);
  });
});
