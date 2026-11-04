# Plan: Silk looks like carbon — restore a super-fine silk look

## Problem
Since `f83c6d9` the built-in Fabric Silk uses its own shader `silk-fine.ts`
(before: a placeholder using the brushed-metal builder = fine streaks, anisotropic).
The new shader renders a regular over/under checkerboard (plain weave) at
30 threads x tileScale 20 = 600 threads/m (~1.7 mm), with only 15 % slub noise.
It reads like the carbon twill (`dcb08ff`), not like fine silk.

## Goal
Super-fine, almost smooth fabric: thread structure only visible up close, soft sheen
dominant, small irregularities (slubs, fibre streaks) instead of a regular grid.

## Changes (`src/materials/procedural/silk-fine.ts`, preset, spec)
1. Finer weave: raise `THREADS_PER_TILE` and the default `tileScale` so one thread is
   ~0.3 mm (about 5x finer). Keep the fade-out at pixel size (anti-moire).
2. Break the checkerboard: replace the strict over/under by a soft, low-amplitude
   weave (weave contribution to relief ~ 0.3x), plus per-thread random offset
   and stronger slub noise (15 % -> ~40 %).
3. Add fine long fibre streaks along the warp direction (stretched noise) for roughness
   and relief, similar to the old brushed look, but non-metallic.
4. Color modulation range 0.94..1.04 -> narrower (0.97..1.02); the sheen lobe carries
   the look.
5. Preset `material-silk`: tileScale default adjusted to the new thread density;
   `normalScale` 0.6 -> ~0.4. Update `material-spec.ts` range/default and the colocated
   tests (`material-spec.test.ts`, `material-resolver.test.ts`).

## Verification
Tests, lint, build; visual check in the browser (close-up and distance, no moire).

## Not in scope
No migration (pre-release). Carbon and linen stay unchanged.
