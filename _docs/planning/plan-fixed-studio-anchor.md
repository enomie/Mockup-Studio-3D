# Plan: Lichter & Viewport-Helfer wandern beim Verschieben von Objekten

## Symptom
Verschiebt man ein Objekt mit dem Gizmo, bewegen sich Key-/Fill-Licht, Quadranten-Grid,
World-Origin-Marker und Kompass-Pfeile mit.

## Ursache (verifiziert)
1. `LightingSystem` berechnet einen `referenceCenter` = **Mittelwert aller Entity-Positionen**
   (`computeSceneCenter` in `src/engine/lighting/studio-pose.ts`).
2. Default ist `referenceMode: 'scene-center'` (`src/config/scene-defaults.ts:95`) – die Lichter
   orbiten also um diesen Mittelwert und werden bei **jeder** Entity-Änderung neu positioniert
   (`registry.subscribeEntities` → `updateRigTransforms`, `lighting-system.ts:138`).
   Ein Objekt bewegen ⇒ Mittelwert verschiebt sich ⇒ das ganze Licht-Rig springt mit.
3. `ViewportHelpersSystem.updateFrame` (`viewport-helpers-system.ts:45`) setzt World-Origin,
   Quadranten-Grid und Kompass **jeden Frame** auf `lighting.getReferenceCenter()`.
   Ein „World-Origin“, der sich bewegt, ist per Definition falsch. Zudem koppelt das
   Helfer-System fachfremd an das Lighting.
4. Code-Duplikat: `refreshReferenceCenter()` und `syncReferenceCenterFromEntities()` machen
   dasselbe; ersteres allokiert pro Aufruf eine `Group` nur als Vec3-Träger.

## Fix
1. **Viewport-Helfer sind Welt-fix:** World-Origin, Quadranten-Grid, Kompass stehen immer bei
   (0,0,0). `updateFrame(lighting)` und die Abhängigkeit auf `LightingSystem` entfallen
   (inkl. Aufrufe in `mockup-engine.ts:903` und `:1041`).
2. **Studio-Anker statt Live-Mittelwert:** Lichter orbiten standardmäßig um einen festen
   Anker (Welt-Ursprung). Default `referenceMode` → `'world-fixed'`.
   Der Modus `'scene-center'` bleibt als Opt-in („Follow scene center“), wird aber
   **nicht mehr während des Draggens** neu berechnet, sondern erst bei Drag-Ende
   (`dragging-changed` → false im `GizmoController`) bzw. bei Hinzufügen/Entfernen von Entities.
   So „schwimmt“ das Licht nie mit der Maus.
3. **Refactor `LightingSystem`:**
   - eine einzige `recomputeReferenceCenter(): Vec3`, keine `Group`-Allokation,
     `getBasePose`/`getWorldPose` nehmen `Vec3`.
   - Per-Frame `syncReferenceCenterFromEntities()` aus `updateFrame()` entfernen
     (Center ändert sich nur noch ereignisgesteuert); Shadow-Coverage bleibt per Frame.
4. **Gespeicherte Szenen/Presets:** bestehende Werte von `referenceMode` werden respektiert;
   nur der Default ändert sich. Builtin-Light-Rigs prüfen (`src/data/builtin-light-rigs.ts`).

## Tests
- Unit: Entity verschieben ändert in `world-fixed` keine Licht-Pose.
- Unit: `scene-center` – Pose ändert sich erst nach Drag-Ende.
- Unit: Viewport-Helfer bleiben bei (0,0,0).
- `npx vitest run`, `npm run lint`, `npm run build`.

## Entscheidung (User)
„Follow scene center“ wird komplett entfernt; Lichter orbiten fest um (0,0,0). Umsetzung direkt auf `main`.

## Ursprüngliche offene Frage
Soll „Follow scene center“ als Option überhaupt bleiben, oder ganz entfernt werden
(einfacher, weniger Code)? Empfehlung: **entfernen** – ein Studio-Licht, das um den
Szenen-Mittelwert springt, ist für Mockups kaum sinnvoll; stattdessen später ggf. ein
Button „Lichter auf Auswahl zentrieren“ (einmalig, explizit).
