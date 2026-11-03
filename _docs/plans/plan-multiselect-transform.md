# Plan: Multiselect + Multi-Move/Rotate/Scale (3D- und 2D-Editor)

Status: Entwurf – wartet auf Freigabe.

## Ziel
In beiden Editoren mehrere Elemente per **Shift + Klick** sammeln und gemeinsam
verschieben, drehen und skalieren.

- **3D-Viewport:** mehrere Assets (Entities) auswählen, ein gemeinsamer Gizmo.
- **2D-Editor (Profil-Editor):** mehrere Knoten (auch pfadübergreifend) auswählen,
  gemeinsam verschieben/drehen/skalieren.

## Bedienung (beide Editoren gleich)
| Aktion | Wirkung |
|---|---|
| Klick | Einzelauswahl (ersetzt Auswahl) |
| Shift + Klick | Element zur Auswahl hinzufügen / wieder entfernen (Toggle) |
| Klick ins Leere | Auswahl leeren |
| Esc | Auswahl leeren |
| Strg/Cmd + A | alles auswählen (optional, 2D sicher; 3D nur Assets) |

Die **zuletzt** geklickte Auswahl ist das „aktive" Element (Inspector zeigt es).
Szenen-Liste (SceneSubPanel) unterstützt ebenfalls Shift-Klick.

**Konflikt 2D:** Shift-Klick auf Knoten ist heute schon belegt (Join mit J,
`ProfileEditor.tsx:440`). Vorschlag: Join funktioniert künftig einfach über die
Mehrfachauswahl (genau 2 Endpunkte gewählt + J) – damit ist Shift-Klick einheitlich.

## 3D – Umsetzung
1. **Datenmodell:** `EntityRegistry` bekommt `selectedEntityIds: string[]` statt
   einer Einzel-ID (`getSelectedEntityIds()`, `setSelection(ids)`, `toggle(id)`);
   `getSelectedEntityId()` liefert das aktive (letzte) Element. Keine Migration nötig.
2. **Picking:** `viewport-input-controller.ts` reicht `shiftKey` an den
   `SelectionController` weiter → `toggleEntity` vs. `selectEntity`.
3. **Gizmo:** Bei >1 Auswahl hängt der `GizmoController` an ein unsichtbares
   **Pivot-Objekt** im Mittelpunkt der Bounding-Box-Mitte aller Auswahl.
   Beim Drag-Start werden die Welt-Matrizen aller Objekte relativ zum Pivot
   gemerkt; bei jeder Änderung wird `pivotDelta * startMatrix` auf jedes Objekt
   angewendet und in die Entity-Transforms zurückgeschrieben (eine Undo-Einheit).
   - Move: alle verschieben.
   - Rotate: um den gemeinsamen Mittelpunkt (Positionen orbitieren mit).
   - Scale: um den Mittelpunkt (Abstände + Objektgrößen). Assets mit
     Uniform-Scale-Zwang (`rigid-primitive-uniform-scale`) bleiben uniform.
4. **Highlight:** `selection-highlight.ts` markiert alle ausgewählten Objekte.
5. **Lichter / Patch-Handles:** bleiben vorerst Einzelauswahl (Shift wird dort
   ignoriert) – reduziert Risiko.
6. **Inspector:** Bei Mehrfachauswahl zeigt `SceneDetailPanel` „N Objekte
   ausgewählt" + gemeinsame Aktionen (Löschen, Sichtbarkeit); Detailfelder nur
   für Einzelauswahl.
7. **Physik:** Während Mehrfach-Drag wie heute bei Einzel-Drag behandeln.

## 2D – Umsetzung (Profil-Editor)
1. **Selection-Modell:** `{ pathId, index }` → `nodes: { pathId, index }[]` +
   aktiver Knoten. Inspector-Felder zeigen den aktiven Knoten.
2. **Shift-Klick** auf Knoten toggelt; Shift-Klick auf Pfad wählt alle Knoten des
   Pfads dazu.
3. **Move:** Drag eines ausgewählten Knotens verschiebt alle ausgewählten Knoten
   (inkl. ihrer Bezier-Handles) um dasselbe Delta; Snap/Grid gilt für den
   gezogenen Knoten, das Delta wird übernommen. Pfeiltasten-Nudge für alle.
4. **Rotate/Scale:** Bei ≥2 ausgewählten Knoten erscheint eine Bounding-Box
   mit Eck-Griffen (Scale, Shift = proportional) und einem Rotationsgriff
   oberhalb; Pivot = Box-Mitte. Handles werden mittransformiert.
5. **Delete** löscht alle ausgewählten Knoten.
6. Bestehende Shortcuts (`profile-editor-shortcuts.ts`) entsprechend anpassen.

## Reihenfolge
1. 2D-Multiselect + Multi-Move (kleinster Schritt, gut testbar)
2. 2D Rotate/Scale-Box
3. 3D-Multiselect + Highlight + Szenenliste
4. 3D Multi-Gizmo (Move/Rotate/Scale über Pivot)

Jeder Schritt mit Vitest-Tests (reine Transform-Mathe in eigenem Modul,
z. B. `src/engine/multi-transform.ts`, `src/ui/profile-editor/node-group-transform.ts`),
danach lint + build, Commit + Push auf `main`.

## Offene Fragen
- Join (J) künftig über Mehrfachauswahl statt Shift-Klick – ok?
- Box-/Lasso-Auswahl (Rahmen aufziehen) gleich mit dazu oder später?
- Rotation im 3D um gemeinsamen Mittelpunkt (Standard) – oder je Objekt um eigenes Zentrum als Option?
