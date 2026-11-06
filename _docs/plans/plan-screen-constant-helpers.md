# Plan: Patch helpers keep a constant on-screen size

## Problem
Zooming in makes the patch points/handles grow, covering the surface being inspected.

## Findings (read-only investigation)
- The transform gizmo (`GizmoController` → three's `TransformControls`) already scales to a constant screen size (`factor * size / 4`, perspective and orthographic). Nothing to do there.
- The culprits are helper meshes with a fixed **world** size:
  - `triangle-patch-gizmo-controller.ts`: anchors (r 0.025 m), edge anchors (0.021), handle octahedra (0.018), joint ring (0.038), length ring (0.024).
  - `triangle-patch-add-point-tool.ts`: preview sphere (0.021).
  - `fabric-cloth-pins.ts`: pin spheres (`PIN_RADIUS_M`).
  - Light pick spheres (`lighting/light-rig.ts`) to be checked whether they are visible; if only for picking, they stay.

## Approach
Same rule as `TransformControls`: scale every helper by its distance to the camera, so it covers the same pixels at any zoom.
1. New util `src/engine/screen-constant-scale.ts`:
   `screenConstantScale(camera, worldPosition, referenceScale)` → perspective: `distance * tan(fov/2) / zoom`, orthographic: `(top - bottom) / zoom`, normalized so the helper keeps **today's size at a reference view** (a default orbit distance), i.e. nothing looks different at the default zoom, only the zoom-dependence disappears.
2. `TrianglePatchGizmoController`: gets a camera provider (set from `mockup-engine.ts`); in `syncHelpersFromEntity` / `updateFrame` set `mesh.scale` for anchors, handles, joint ring and length ring from their own world position (each point individually, so near and far points look equal). Lines stay as they are (already pixel-thin). Mirror copy helpers use the same rule.
3. Picking is automatic: raycast uses the scaled `matrixWorld`, so the clickable area stays constant too. Because zooming alone changes the scale, the camera-change must trigger a viewport invalidation (a helper update on camera change, as the per-frame `updateFrame` already runs).
4. Add-point preview sphere and cloth pins: same util.
5. No world-size change of the data; only `mesh.scale` of overlay helpers. No migration (pre-release).

## Tests (Vitest, colocated)
- `screen-constant-scale.test.ts`: perspective — doubling the distance doubles the scale; orthographic — halving `zoom` doubles the scale; reference view returns 1.
- Gizmo controller: anchor scale at distance 2 m is half of that at 4 m (apparent size equal); mirror helpers follow the same rule.

## Open question
Reference distance for "today's size": I would take the default camera distance of a new scene (value to be read from `camera-controller.ts`) unless you want the points smaller/larger — then a single constant `PATCH_HELPER_SCREEN_SCALE` adjusts all at once.

## Docs
Decision goes into `_docs/diaries/diary-code-decisions.md` on implementation; this plan is then removed.
