import { describe, expect, it } from 'vitest';
import { fitView, gridStepMm, toMm, toScreen, zoomAt } from './profile-editor-view';

describe('profile editor view', () => {
  it('fits bounds into the free area and round-trips points', () => {
    const view = fitView({ minX: 0, maxX: 100, minY: 0, maxY: 50 }, 1000, 600, {
      left: 100, right: 100, top: 50, bottom: 50,
    });
    expect(view.scale).toBeCloseTo(8);
    const center = toScreen(view, { x: 50, y: 25 });
    expect(center.x).toBeCloseTo(500);
    expect(center.y).toBeCloseTo(300);
    const back = toMm(view, center);
    expect(back.x).toBeCloseTo(50);
  });

  it('zooms around the cursor', () => {
    const view = { scale: 2, offsetX: 10, offsetY: 20 };
    const anchor = { x: 110, y: 120 };
    const before = toMm(view, anchor);
    const after = toMm(zoomAt(view, anchor, 3), anchor);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('picks a readable grid step', () => {
    expect(gridStepMm(1)).toBe(10);
    expect(gridStepMm(10)).toBe(1);
  });
});

describe('profile units in the UI', () => {
  it('shows profile sizes and grid steps in meters', async () => {
    const { formatGridStepMeters } = await import('./ProfileEditor');
    const { profileSizeLabel, BUILTIN_PROFILES } = await import('@/scene/profile-library');
    expect(formatGridStepMeters(10)).toBe('0.01');
    expect(formatGridStepMeters(0.5)).toBe('0.0005');
    const bordeaux = BUILTIN_PROFILES.find((entry) => entry.id === 'bottle-bordeaux');
    expect(bordeaux && profileSizeLabel(bordeaux)).toMatch(/^0\.\d{4} × 0\.\d{4} m$/);
  });

  it('stores millimetres when a length is typed in meters', async () => {
    const { formatMmAsMeters, parseMmFromMetersInput } = await import('@/units/length');
    expect(formatMmAsMeters(38.2)).toBe('0.0382');
    expect(parseMmFromMetersInput('0.0125')).toBeCloseTo(12.5, 6);
  });
});

describe('join target picking', () => {
  it('takes an overlapping end of another path, not the selected one', async () => {
    const { pickJoinTarget } = await import('./ProfileEditor');
    const a = { id: 'a', name: 'A', slot: 0, closed: false, nodes: [{ x: 0, y: 0, mode: 'corner' as const }, { x: 5, y: 0, mode: 'corner' as const }] };
    const b = { id: 'b', name: 'B', slot: 1, closed: false, nodes: [{ x: 5, y: 0, mode: 'corner' as const }, { x: 9, y: 0, mode: 'corner' as const }] };
    expect(pickJoinTarget([a, b], { x: 5, y: 0 }, { pathId: 'a', index: 1 })).toEqual({ pathId: 'b', index: 0 });
    expect(pickJoinTarget([a, b], { x: 5, y: 0 }, { pathId: 'b', index: 0 })).toEqual({ pathId: 'a', index: 1 });
    expect(pickJoinTarget([a, b], { x: 2, y: 0 }, null)).toBeNull();
  });
});
