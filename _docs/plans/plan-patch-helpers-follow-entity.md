# Plan: Patch-Helfer folgen dem Patch / verschwinden beim Löschen

## Problem
Wenn ein Patch verschoben, gedreht oder skaliert wird, bleiben die Helfer (Anker, Tangenten-Hebel, Linien, Längen-Ring) an der alten Stelle im Raum stehen.
Wird der Patch gelöscht, bleiben sie ebenfalls sichtbar.

## Ursache (`src/engine/triangle-patch-gizmo-controller.ts`)
- Die Helfer liegen in einer eigenen `helperGroup` direkt in der Szene, mit **Welt-Koordinaten**.
  Diese werden nur in `syncHelpersFromEntity()` berechnet.
- `syncHelpersFromEntity()` wird nur bei Änderungen an den Patch-Parametern und bei der Auswahl aufgerufen,
  **nicht** bei Transform-Änderungen der Entity (Gizmo-Drag in `gizmo-interaction-controller.ts#onTransform`,
  Skalierung beim Drag-Ende, `MockupEngine.setEntityTransform` aus dem Panel, Physik, Undo).
- `MockupEngine.removeEntity()` informiert den `patchGizmo` nicht. `activeEntityId` zeigt danach weiter auf die
  gelöschte Entity, und `helperGroup.visible` bleibt `true`.

## Lösung
1. **Löschen:** In `MockupEngine.removeEntity()` vor `assets.removeAsset` prüfen, ob die Entity im
   `patchGizmo` aktiv ist; falls ja `patchGizmo.setActiveEntity(null)` aufrufen. Zusätzlich die Helfer-Meshes
   aufräumen (neue Methode `clearHelpers()`, die alle `pointHelpers` freigibt), damit beim nächsten Patch
   keine veralteten Punkt-IDs mehr übrig sind.
2. **Verschieben/Drehen/Skalieren:** Statt jede Transform-Stelle einzeln zu verdrahten, die Helfer an der
   Quelle synchronisieren: `syncHelpersFromEntity()` aufrufen
   - in `onTransform` nach `registry.syncTransformFromObject(...)` (Live-Drag),
   - nach dem Skalierungs-Commit in `onDraggingChanged`,
   - in `MockupEngine.setEntityTransform`.
   Als Absicherung für Physik/Undo: im Render-/Frame-Update `syncHelpersFromEntity()` aufrufen, solange die
   `helperGroup` sichtbar ist (billig: wenige Punkte). Falls das zu breit wirkt, nur die drei Stellen oben.
3. **Test:** in `triangle-patch-gizmo-controller.test.ts` – Entity-Transform ändern → Helfer-Position folgt;
   `setActiveEntity(null)`/`clearHelpers()` → Gruppe unsichtbar, keine Pickables.

## Prüfung
`npx vitest run`, `npm run lint`, `npm run build`; danach Commit direkt auf `main`.
