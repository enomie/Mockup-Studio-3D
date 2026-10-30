import { BoxGeometry, ExtrudeGeometry, Shape } from 'three/webgpu';
import { describe, expect, it, vi } from 'vitest';
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

  it('adds tangents to non-indexed geometry without warnings', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const shape = new Shape();
    shape.moveTo(0, 0);
    shape.lineTo(1, 0);
    shape.lineTo(1, 1);
    shape.lineTo(0, 1);
    const extruded = new ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
    const nonIndexedBox = new BoxGeometry(1, 1, 1).toNonIndexed();
    expect(extruded.index).toBeNull();
    ensureGeometryTangents(extruded);
    ensureGeometryTangents(nonIndexedBox);
    expect(extruded.hasAttribute('tangent')).toBe(true);
    expect(nonIndexedBox.hasAttribute('tangent')).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('skips geometry without uv silently', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const geometry = new BoxGeometry(1, 1, 1);
    geometry.deleteAttribute('uv');
    ensureGeometryTangents(geometry);
    expect(geometry.hasAttribute('tangent')).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
