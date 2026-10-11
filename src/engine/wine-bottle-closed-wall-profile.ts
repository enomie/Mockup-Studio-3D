import { Vector2 } from 'three/webgpu';
import { prepareWineBottleGlassLatheProfile } from './wine-bottle-glass';
import {
  sampleWineBottleRadiusAtY,
  sampleWineBottleWallRadiiAtY,
  wineBottleLatheProfileBounds,
} from './wine-bottle-svg-profile';

const DEDUP_EPS_M = 1e-6;
const AXIS_EPS_M = 1e-4;

function pushDeduped(profile: Vector2[], point: Vector2): void {
  if (profile.length === 0 || profile[profile.length - 1].distanceTo(point) > DEDUP_EPS_M) {
    profile.push(point);
  }
}

function hasStirnRadii(profile: Vector2[]): boolean {
  const bounds = wineBottleLatheProfileBounds(profile);
  return (
    sampleWineBottleWallRadiiAtY(profile, bounds.minY) !== null &&
    sampleWineBottleWallRadiiAtY(profile, bounds.maxY) !== null
  );
}

/**
 * Build a closed glass-wall ring from an outer-only wall polyline by offsetting inward
 * and inserting horizontal lip/foot edges for stirn sampling.
 */
export function closeOuterWallProfileToLatheRing(
  openWall: Vector2[],
  wallThicknessM: number,
): Vector2[] {
  const outer = prepareWineBottleGlassLatheProfile(openWall);
  if (outer.length < 2 || wallThicknessM <= 0) {
    return outer;
  }

  if (hasStirnRadii(outer)) {
    return outer;
  }

  const bounds = wineBottleLatheProfileBounds(outer);
  const yFoot = bounds.minY;
  const yLip = bounds.maxY;

  const rOuterLip = sampleWineBottleRadiusAtY(outer, yLip);
  const rOuterFoot = sampleWineBottleRadiusAtY(outer, yFoot);
  const rInnerLip = Math.max(AXIS_EPS_M, rOuterLip - wallThicknessM);
  const rInnerFoot = Math.max(AXIS_EPS_M, rOuterFoot - wallThicknessM);

  const innerReturn = [...outer]
    .reverse()
    .map((p) => new Vector2(Math.max(AXIS_EPS_M, p.x - wallThicknessM), p.y));

  const ring: Vector2[] = [];
  pushDeduped(ring, new Vector2(rInnerFoot, yFoot));
  pushDeduped(ring, new Vector2(rOuterFoot, yFoot));

  for (const p of outer) {
    if (Math.abs(p.y - yFoot) <= DEDUP_EPS_M) {
      continue;
    }
    pushDeduped(ring, p);
  }

  pushDeduped(ring, new Vector2(rOuterLip, yLip));
  pushDeduped(ring, new Vector2(rInnerLip, yLip));

  for (const p of innerReturn) {
    if (Math.abs(p.y - yLip) <= DEDUP_EPS_M || Math.abs(p.y - yFoot) <= DEDUP_EPS_M) {
      continue;
    }
    pushDeduped(ring, p);
  }

  pushDeduped(ring, new Vector2(rInnerFoot, yFoot));

  return prepareWineBottleGlassLatheProfile(ring);
}
