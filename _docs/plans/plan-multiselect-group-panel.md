# Plan: Gruppen-Parameter im Detail-Panel bei Mehrfachauswahl (3D)

Status: Entwurf – wartet auf Freigabe.

## Ziel
Sind ≥ 2 Assets ausgewählt, zeigt das Detail-Panel (wo sonst die Asset-Parameter stehen)
statt der Felder des aktiven Assets die **Parameter der Gruppe**: Position, Rotation,
Skalierung. Die Szenen-Liste daneben zeigt weiterhin, was markiert ist.

## Panel-Inhalt
Titel: **„N objects selected"**

**Position (m)** – Mitte der Gruppe (dieselbe Mitte, an der der Gizmo sitzt:
Bounding-Box-Mitte aller ausgewählten Assets).
- Pos X / Y / Z editierbar; neuer Wert verschiebt **alle** um die Differenz.
- Aktualisiert sich live beim Ziehen mit dem Gizmo.

**Rotation (°)** und **Scale (%)** – eine Gruppe hat keine gespeicherte eigene Rotation
oder Größe. Vorschlag: **relative Werte seit dem Bilden der Auswahl**.
- Beim Auswählen stehen Rot X/Y/Z auf 0° und Scale auf 100 %.
- Eingabe z. B. Rot Y = 90 → Gruppe dreht sich um 90° um ihre Mitte (wie Gizmo-Rotate).
  Später 45 eingeben → dreht zurück auf 45° (Differenz wird angewendet).
- Gizmo-Drehen/-Skalieren zählt mit, Felder bleiben also stimmig.
- Wechselt die Auswahl, starten die Werte wieder bei 0° / 100 %.
- Scale ist einheitlich (wie beim Gizmo); Wände werden nur verschoben, nicht skaliert.

**Aktionen** (klein, unten): Alle ausblenden/einblenden, Alle löschen.

Jede Feldänderung = ein Undo-Schritt („Transform N objects").

## Umsetzung
1. **Engine (`MockupEngine` / `SceneApi`)**
   - `getSelectionGroupState(): { center, rotationDeg, scale } | null`
   - `setSelectionGroupCenter(center)` – verschiebt alle um Delta.
   - `setSelectionGroupRotation(deg)` / `setSelectionGroupScale(factor)` – wendet
     Differenz zum bisherigen Gruppenwert um die Mitte an.
   - Die Mathe kommt aus `engine/multi-transform.ts` (bereits vorhanden, getestet);
     die Gizmo-Gruppenlogik und die Felder nutzen dieselben Funktionen.
   - Gruppen-Rotation/-Scale werden im `GizmoInteractionController` gehalten und bei
     Auswahlwechsel zurückgesetzt; Gizmo-Drags addieren dazu.
2. **Store**: `selectionGroup` im App-State, synchronisiert wie `selectedEntityIds`.
3. **UI**: neue `SceneGroupPanel.tsx`; `SceneDetailPanel` zeigt sie bei ≥ 2 Auswahl,
   sonst wie bisher die Einzel-Parameter. Bestehende `PanelAxisField`-Felder und
   Grad-/Meter-Formatierung wiederverwenden.
4. Nebenbei behoben: Gizmo-Mitte folgt, wenn Werte über das Panel geändert werden.
5. Tests (Engine-Mathe, Panel-Render), Lint, Build → Commit + Push auf `main`.

## Offene Fragen
1. Rotation/Scale als **relative Werte seit Auswahl** (Vorschlag) – ok?
2. Aktionen „Alle ausblenden / löschen" mit rein?
3. Das Gleiche auch für den **2D-Editor** (Gruppen-Mitte X/Y, Breite/Höhe,
   Rotation im Inspector bei mehreren Punkten)? Oder erst nur 3D?
