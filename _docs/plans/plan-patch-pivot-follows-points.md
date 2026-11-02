# Plan: Patch-Pivot folgt den Punkten

## Problem
Patch-Punkte werden lokal zum Entity-Pivot (`transform.position` / `rotation`) gespeichert. Verschiebt man Punkte,
bleibt der Pivot – und damit das Haupt-Gizmo (Move/Rotate/Scale) – an der alten Stelle im Raum stehen.

## Idee
Der Pivot wird automatisch nachgeführt, die Geometrie bleibt in der Welt exakt, wo sie ist:

1. Nach jedem abgeschlossenen Punkt-Edit (Gizmo-Drag-Ende, Inspector-Eingabe, Einfügen, Löschen) wird der neue
   Pivot = Mittelpunkt der Bounding-Box aller Patch-Punkte (Anker, ohne Handles) in Weltkoordinaten berechnet.
2. Alle lokalen Daten (Punkte, Handles) werden mit `patchWorldToLocal` auf den neuen Pivot umgerechnet;
   `transform.position` wird gesetzt. Rotation bleibt unverändert → Drehen um das eigene Achsenkreuz bleibt möglich.
3. Shared Nodes liegen bereits in Weltkoordinaten (`nodeSlotWorld`) → keine Änderung nötig (kein `moveNodeWithPatch`).
4. Während eines laufenden Drags wird *nicht* recentert (sonst springt das Gizmo unter der Maus).

Ergebnis: Für den Nutzer ist alles in Raumkoordinaten (Inspector zeigt das schon so), das Haupt-Gizmo sitzt immer in
der Mitte des Patches, Drehen und Skalieren (bestehendes `sizeScale`, gebacken) wirken um diese Mitte.

## Umsetzung
- Neu: `src/scene/triangle-patch-recenter.ts` – reine Funktion `recenterPatch(entity): entity`.
- Aufruf an den Commit-Stellen der Punkt-Edits (Store-Aktionen für Patch-Punkte, Drag-Ende im
  `triangle-patch-gizmo-controller`), als Teil desselben Undo-Schritts.
- Option (falls gewünscht): Schalter „Pivot automatisch zentrieren“ im Patch-Inspector, Default an.

## Offene Frage
- Soll Skalieren um die Patch-Mitte gehen (Standard) – passt das so?

## Tests
- Patch bei (2,0,1), um Y gedreht; Punkt verschieben → nach Recenter sind Weltpositionen aller Punkte unverändert,
  `transform.position` = BBox-Mitte, Rotation unverändert.
- Shared Node bleibt identisch.

## Entscheidung (umgesetzt)
- Immer zentrieren, kein Schalter. Drehen und Skalieren um die Patch-Mitte.
- `src/scene/triangle-patch-recenter.ts`: `recenterPatch` (BBox-Mitte der Anker in lokalen Achsen, gespiegelte Achsen
  bleiben 0, weil die Spiegelebenen durch den Pivot laufen) und `scalePatchPoints`.
- Engine: Zentrieren nach Inspector-/Store-Edits (`setKindParams('patch')`), nach Gizmo-Commits außerhalb eines Drags,
  am Drag-Ende (Gizmo und Längenring).
- `reconcilePatchNodes`: eine Transform-Änderung gilt nur dann als starres Verschieben (Shared Nodes wandern mit),
  wenn sich der lokale Punkt nicht geändert hat. Beim Zentrieren bleiben Shared Nodes damit stehen.
- Skalieren mit dem Gizmo wird bei Patches in die Punkte gebacken (vorher wirkte `sizeScale` bei Patches nicht).
