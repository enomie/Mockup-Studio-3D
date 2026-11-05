# Plan: Hidden assets must not be pickable

## Problem
Hidden assets (`entity.visible === false` -> `object.visible = false`, see `entity-registry.ts`) can still be clicked in the 3D viewport.

## Cause
`SelectionController.pickAt` (`src/engine/selection-controller.ts`) uses `Raycaster.intersectObjects`. Three.js raycasting ignores `Object3D.visible`, so invisible meshes still produce hits. `collectAssetRoots()` also includes hidden entities.

## Fix
- `collectAssetRoots()`: skip entities whose runtime object is not visible (`entity.visible === false`).
- `findEntityId()`: ignore hits whose object (or any ancestor) has `visible === false`. This also covers hidden sub-meshes (e.g. the can ring), and the light pickables.
- Test: colocated `selection-controller.test.ts` case, hidden asset is not returned by `pickAt`.

## Out of scope
Selection via outliner/list stays possible for hidden entities.
