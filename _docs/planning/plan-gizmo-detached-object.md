# Plan: Warnung „TransformControls: The attached 3D object must be a part of the scene graph.“

## Befund
`TransformControls.updateMatrixWorld()` loggt den Fehler bei jedem Frame, solange das angehängte Objekt `parent === null` hat.
Alle Zuweisungen laufen über `GizmoController.attach()` (`src/engine/gizmo-controller.ts`), aufgerufen aus `GizmoInteractionController.refresh()`.
Mögliche Ziele, die zeitweise aus der Szene entfernt werden:
- Asset-Objekte (`asset-system.ts` `removeAsset` / `dispose`)
- Licht-Helfer (`light-rig.ts`, `lighting-system.ts`)
- Cloth-Pins (`fabric-cloth-pins.ts` `dispose`, z. B. Simulation zurücksetzen)
- Patch-Handles (`triangle-patch-gizmo-controller.ts` `dispose`)

Ohne Reproduktion ist nicht eindeutig, welcher Pfad lokal auslöst; die Pins sind der wahrscheinlichste (Entfernen ohne anschließendes `refresh()`).

## Umsetzung
1. `GizmoController.attach()`: Objekte ohne Eltern werden nicht angehängt (Gizmo wird gelöst).
2. `GizmoController.detachIfOrphaned()`: löst das Gizmo, wenn das angehängte Objekt inzwischen keine Eltern mehr hat. Aufruf zu Beginn jedes Viewport-Frames in `MockupEngine`; bei Lösung folgt `gizmoInteraction.refresh()`, damit das Gizmo auf das aktuelle Ziel springt.
3. Vitest für beide Fälle.
4. `npx vitest run`, `npm run lint`, `npm run build`.
