# Plan: Edit mirrored patches via their copies

## Goal
Mirror copies of a triangle patch (`PatchParams.mirror`) should be editable like the original:
dragging an anchor/handle on a copy edits the same data. Original and copy are interchangeable for the user.

## Current state
- Copies are render-only meshes (`populate-triangle-patch.ts`, role `trianglePatchMirror`) with a world-space mirror matrix `M` (sign vector from `getPatchMirrorSigns`).
- Points/handles exist once, only on the original (`triangle-patch-gizmo-controller.ts`: `createPointHelpers`, `handleMeshes`).

## Approach
Data stays single-source (the original's `PatchParams`). Per mirror copy we add a second set of point helpers placed at `M · p`. Edits are mapped back with `M⁻¹ = M` (pure axis reflection), so every drag runs through the existing original-edit path (undo/redo, handle length, edge links, dirty/invalidate).

### Steps
1. **Helpers per copy**: in the gizmo controller, build one helper set per mirror sign (anchors, tangent handles, cross handles). Helper group is parented/positioned with `M · entity.matrixWorld` (reuse the sync idea of `applyWorldMirror`); handle meshes get `userData.mirrorSign` (undefined for the original).
2. **Picking**: `handleMeshes` includes copy handles; a pick resolves to `(pointId, handleKind, mirrorSign?)`. Selecting a copy point selects the original point id.
3. **Drag mapping**: on drag, convert the new world position to the original's space with `M` first, then call the existing update. Tangent handle direction is mirrored by the same mapping; handle length is unchanged.
4. **Group edit**: multi-select and the group gizmo stay on the original only (decision). Selecting a point on a copy selects the original point; the group pivot is shown at the original.
5. **Add-point tool** (`triangle-patch-add-point-tool.ts`): a hit on a copy surface is mapped back with `M` and inserts the point on the original.
6. **Visuals**: copy helpers use the same colors with reduced opacity; they follow selection state of the original point.
7. **Lifecycle**: rebuild/dispose helpers when `mirror` toggles or the point set changes; no helpers when `mirror` is absent.

## Tests (Vitest, colocated)
- Mirror mapping: dragging a copy handle by world delta d moves the original point by `M·d` (all sign combos, incl. X+Z diagonal).
- Pick on copy resolves to the original point id; tangent handle mirrored correctly, length preserved.
- Helpers appear/disappear when `mirror` toggles; count = 2^(enabled axes) − 1 copies.
- Add-point on a copy inserts at the mirrored-back position.

## Out of scope
- Group gizmo on copies; independent per-copy data; migration of old scenes (not needed, pre-release).

## Docs
Decision (single source of truth, `M⁻¹ = M` back-mapping, group gizmo original-only) goes into `_docs/diaries/diary-code-decisions.md` on implementation; this plan is removed afterwards.
