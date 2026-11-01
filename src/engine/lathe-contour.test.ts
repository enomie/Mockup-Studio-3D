import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Vector2 } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { LATHE_PROFILE_METRICS_MM } from '@/data/lathe-profile-metrics.generated';
import {
  closeAndOrientLatheContour,
  isClosedLatheContour,
  latheSvgMmToMeters,
  prepareLatheProfile,
} from './lathe-contour';
import { measureLatheSvgMm } from './lathe-svg-metrics';

const LATHE_DIR = join(process.cwd(), 'public', 'profiles', 'lathe');

function signedArea(points: Vector2[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

describe('lathe-contour', () => {
  const square = (cw: boolean) => {
    const pts = [new Vector2(1, 0), new Vector2(2, 0), new Vector2(2, 1), new Vector2(1, 1)];
    return cw ? pts.reverse() : pts;
  };

  it('treats contours off the axis as closed rings', () => {
    expect(isClosedLatheContour(square(false))).toBe(true);
    expect(isClosedLatheContour([new Vector2(0, 0), new Vector2(1, 0), new Vector2(1, 1)])).toBe(
      false,
    );
  });

  it('closes the loop and winds counter-clockwise regardless of drawing direction', () => {
    for (const cw of [false, true]) {
      const out = closeAndOrientLatheContour(square(cw));
      expect(out[0].equals(out[out.length - 1])).toBe(true);
      expect(signedArea(out)).toBeGreaterThan(0);
    }
  });

  it('leaves open profiles bottom-to-top', () => {
    const open = [
      new Vector2(0, 3),
      new Vector2(1, 3),
      new Vector2(1, 2),
      new Vector2(1, 1),
      new Vector2(1, 0),
      new Vector2(0, 0),
    ];
    const out = prepareLatheProfile(open);
    expect(out[0].y).toBe(0);
  });

  it('maps SVG mm (y down) to meters (y up) without stretching', () => {
    const [p] = latheSvgMmToMeters([{ x: 10, y: 40 }], 100);
    expect(p.x).toBeCloseTo(0.01, 9);
    expect(p.y).toBeCloseTo(0.06, 9);
  });
});

describe('lathe-profile-metrics.generated', () => {
  it('is in sync with public/profiles/lathe (run scripts/generate-lathe-profile-metrics.ts)', () => {
    const files = readdirSync(LATHE_DIR).filter((f) => f.endsWith('.svg')).sort();
    expect(Object.keys(LATHE_PROFILE_METRICS_MM).sort()).toEqual(files);
    for (const file of files) {
      const measured = measureLatheSvgMm(readFileSync(join(LATHE_DIR, file), 'utf8'));
      expect(LATHE_PROFILE_METRICS_MM[file], file).toEqual(measured);
    }
  });
});
