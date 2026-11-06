# Plan: Mehrfachauswahl von Patch-Punkten

## Ziel
Zwei oder mehr Punkte eines Patches gleichzeitig auswählen und parametrisch verschieben, drehen und skalieren. Das soll genauso funktionieren wie die Gruppentransformation bei mehreren Assets (`SceneGroupPanel`: Pos XYZ = Gruppenmitte, Rot XYZ und Scale % ab Auswahlbeginn).

## Ist-Zustand
- Auswahl ist genau ein Punkt + Ziel: `PatchHandleSelection { entityId, pointId, targetKey }` (`scene/asset-triangle-patch.ts`). Die Engine hält sie im `triangle-patch-gizmo-controller.ts` (`activeTarget`), der Store spiegelt sie als `patchHandleSelection`.
- `TrianglePatchFields.tsx` (Point & Handle Inspector) zeigt immer nur den einen aktiven Punkt mit X/Y/Z, Rot (Handles um Anker) und Länge.
- Assets: Shift-Klick → `toggleEntitySelection`, mehrere IDs in der Registry, `gizmoInteraction` liefert `SelectionGroupState { center, rotation, scale }`, Setter `setSelectionGroupCenter/Rotation/Scale`.

## Umfang
- Mehrfachauswahl gilt **nur für Ankerpunkte (`pos`) innerhalb eines Patches**. Handles werden immer mit ihrem Anker mitbewegt bzw. mitgedreht, so wie es `translatePatchNodeAnchor` schon macht.
- Bei einem einzelnen Punkt bleibt alles wie heute.

## Umsetzung

### 1. Modell (`src/scene/`)
- `PatchHandleSelection` bekommt `extraPointIds: string[]`. Das sind die zusätzlich ausgewählten Punkte; der aktive Punkt bleibt `pointId`.
- Neues Modul `triangle-patch-group-edit.ts` mit reinen Funktionen und Tests:
  - `patchPointsCenter(points, ids)` → Mittelwert der Anker.
  - `translatePatchPoints(points, ids, delta)` → Anker + Handles verschieben.
  - `transformPatchPoints(basePoints, ids, center, rotationEuler, scale)` → um die Gruppenmitte drehen/skalieren, ausgehend vom Stand bei Auswahlbeginn. Handles drehen mit, ihre Länge skaliert mit.
- Punkte, die mit einem anderen Patch geteilt sind (Nodes/Edge-Links), laufen über denselben Commit-Weg wie heute (`setKindParams`), damit Partner nachziehen.

### 2. Engine (`triangle-patch-gizmo-controller.ts`, `mockup-engine.ts`, `scene-api.ts`)
- **Shift-Klick** auf einen Anker im Viewport fügt ihn zur Auswahl hinzu oder nimmt ihn heraus (analog Assets). Ein Klick ohne Shift setzt die Auswahl auf einen Punkt zurück. Shift+**Drag** bleibt wie bisher „Joint brechen“; Shift-Klick ohne Bewegung toggelt nur.
- Ausgewählte Anker werden hervorgehoben (gleiche Highlight-Farbe wie der aktive Anker).
- Bei Mehrfachauswahl sitzt der Translate-Gizmo in der Gruppenmitte; ziehen verschiebt alle Punkte um dasselbe Delta (ein Undo-Schritt).
- SceneApi: `togglePatchPointSelection(entityId, pointId)`, `getPatchPointGroupState()` → `{ center, rotation, scale } | null`, `setPatchPointGroupCenter/Rotation/Scale(...)`. Rotation und Scale beziehen sich auf den Stand bei Auswahlbeginn (gemerkte Basis-Punkte, wie bei Assets).

### 3. UI (`src/ui/`)
- Store spiegelt `patchPointGroup` (nur Daten, keine Logik).
- Inspector-Liste: **Shift-Klick** (oder Cmd/Ctrl-Klick) auf eine Zeile toggelt die Auswahl; ausgewählte Zeilen sind markiert.
- Bei ≥ 2 ausgewählten Punkten zeigt der Inspector statt der Einzel-Details einen Block **„N points selected“** mit:
  - Pos X/Y/Z (Gruppenmitte, Welt-Koordinaten, m)
  - Rot X/Y/Z (°)
  - Scale (%)
  - Button „Clear selection“
  - derselbe Hinweistext-Stil wie im `SceneGroupPanel`.
- Die Feld-Komponenten (`PanelAxisField`) und Format-/Parse-Helfer werden wiederverwendet. Wenn sinnvoll, ziehe ich die Felder aus `SceneGroupPanel` in eine gemeinsame `GroupTransformFields`-Komponente, die beide Panels nutzen.

### 4. Tests & Doku
- Vitest für `triangle-patch-group-edit.ts` (Center, Translate, Rotate, Scale, Handles drehen mit).
- Test für Toggle-Logik der Auswahl.
- Kurz in `_docs/requirements/` (Patch-Requirements) und `diary-code-decisions.md` festhalten; danach diesen Plan löschen.

## Offene Fragen
1. Reicht „nur Anker, nur innerhalb eines Patches“ für den Anfang, oder sollen Punkte über mehrere Patches hinweg wählbar sein?
2. Soll der Gizmo im Viewport bei Mehrfachauswahl auch drehen/skalieren können, oder reicht verschieben (Drehen/Skalieren dann nur über die Felder)?
