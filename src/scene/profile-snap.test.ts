import { describe, expect, it } from 'vitest';
import { snapPoint, type SnapOptions } from './profile-snap';

const base: SnapOptions = { grid: true, points: true, gridStepMm: 10, radiusMm: 2, targets: [] };

describe('profile snapping', () => {
  it('rounds to the visible grid', () => {
    expect(snapPoint({ x: 14, y: 26 }, base)).toMatchObject({ point: { x: 10, y: 30 }, kindX: 'grid', kindY: 'grid' });
  });

  it('prefers points over axes and grid', () => {
    const result = snapPoint({ x: 1, y: 13 }, { ...base, targets: [{ x: 0.5, y: 12 }] });
    expect(result).toMatchObject({ point: { x: 0.5, y: 12 }, kindX: 'point', target: { x: 0.5, y: 12 } });
  });

  it('snaps each direction to an axis on its own', () => {
    expect(snapPoint({ x: 1.5, y: 27 }, base)).toMatchObject({ point: { x: 0, y: 30 }, kindX: 'axis', kindY: 'grid' });
    expect(snapPoint({ x: 1.5, y: 27 }, { ...base, grid: false })).toMatchObject({ point: { x: 0, y: 27 }, kindY: 'none' });
  });

  it('leaves the point free when both switches are off', () => {
    const off = { ...base, grid: false, points: false, targets: [{ x: 14, y: 26 }] };
    expect(snapPoint({ x: 14.2, y: 26.3 }, off)).toMatchObject({ point: { x: 14.2, y: 26.3 }, kindX: 'none', kindY: 'none' });
  });

  it('ignores points and axes when only the grid is on', () => {
    const gridOnly = { ...base, points: false, targets: [{ x: 13, y: 26 }] };
    expect(snapPoint({ x: 1, y: 26.4 }, gridOnly).point).toEqual({ x: 0, y: 30 });
  });
});
