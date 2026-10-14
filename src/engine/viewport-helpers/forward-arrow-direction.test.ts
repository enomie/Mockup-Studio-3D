import { describe, expect, it } from 'vitest';
import { horizontalDirectionFromTo } from './forward-arrow-direction';

describe('horizontalDirectionFromTo', () => {
  it('normalizes XZ toward target', () => {
    const result = horizontalDirectionFromTo(
      { x: 0, y: 0, z: 0 },
      { x: 3, y: 9, z: 4 },
    );
    expect(result).toEqual({ ok: true, x: 0.6, z: 0.8 });
  });

  it('returns false when anchor and target coincide on XZ', () => {
    const result = horizontalDirectionFromTo(
      { x: 1, y: 0, z: 2 },
      { x: 1, y: 5, z: 2 },
    );
    expect(result).toEqual({ ok: false });
  });
});
