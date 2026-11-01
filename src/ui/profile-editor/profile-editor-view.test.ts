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
