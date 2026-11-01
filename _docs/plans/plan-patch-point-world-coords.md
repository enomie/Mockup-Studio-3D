# Plan: Patch-Punkte im Inspector in Szene-Koordinaten

## Problem
Die X/Y/Z-Felder der Patch-Punkte (`TrianglePatchFields.tsx`) zeigen und schreiben `point.pos` und die Handles
direkt, also lokal zum Asset-Pivot. Bei einem verschobenen oder gedrehten Patch liegt „X = 0“ dann nicht auf der
Szene-Achse. Nur die Shared-Node-Extras werden schon umgerechnet (`nodeSlotLocal`), aber auch nur nach lokal.

## Lösung (nur Anzeige/Eingabe, Datenmodell bleibt lokal)
- `toWorldPoint` / `toLocalPoint` aus `src/scene/patch-nodes.ts` exportieren (oder als kleine Helfer
  `patchLocalToWorld` / `patchWorldToLocal`).
- Inspector: angezeigter Wert = `toWorldPoint(activeVec, entity.transform)`.
- Eingabe einer Achse: Weltvektor mit der geänderten Achse bilden, mit `toLocalPoint` zurückrechnen, dann die
  bestehende Logik (`translatePatchNodeAnchor`, Handle-Kopie, `writeExtra`) mit dem lokalen Vektor aufrufen.
  Bei gedrehtem Patch ändern sich dadurch lokal mehrere Achsen, in der Welt aber nur die eingegebene.
- Handle-„Length“ ebenfalls in Weltmaß (wichtig bei nicht-uniformer Skalierung).
- Kopieren/Einfügen von Punkten bleibt lokal (wird relativ zum Patch eingefügt).
- Viewport-Gizmo der Punkte nicht betroffen (arbeitet schon in der Welt).

## Tests
Unit-Test für die Umrechnung: Patch bei (2, 0, 1), um Y gedreht; Punkt auf Welt-X = 0 setzen ergibt Weltposition
mit x = 0 und unveränderten y/z.
