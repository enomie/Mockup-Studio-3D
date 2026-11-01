# Plan: Patch-Spiegelung an Szene-Achsen statt Asset-Achsen

## Problem
`populate-triangle-patch.ts` hängt die Spiegelkopien als Kinder der Asset-Gruppe an und setzt nur
`copy.scale = (±1, ±1, ±1)`. Dadurch wird an den lokalen Ebenen durch den Asset-Pivot gespiegelt
(Asset-X0), nicht an den Szene-Ebenen (Welt X=0, Y=0, Z=0).

## Lösung
Spiegelmatrix in Weltkoordinaten in den lokalen Raum der Gruppe umrechnen:

    M_copy_local = G⁻¹ · S · G      (G = Weltmatrix der Asset-Gruppe, S = diag(sx, sy, sz, 1))

- Die Kopien bekommen `matrixAutoUpdate = false` und diese Matrix.
- Weil die Matrix von der Asset-Transformation abhängt, muss sie bei jeder Verschiebung, Drehung oder
  Skalierung des Patches neu berechnet werden. Das passiert über `onBeforeRender` der Kopie (billig,
  liest die aktuelle `group.matrixWorld`). Ein Rebuild beim Verschieben ist dann nicht nötig.
- Shadow-Pass und Picking nutzen dieselbe `matrixWorld`, also ist es konsistent.
- Doku und UI-Tooltips: „Mirror across the scene YZ plane (world X = 0)“ usw.;
  Kommentar in `PatchMirror` anpassen.

## Dateien
- `src/engine/asset-meshes/populate-triangle-patch.ts`: Matrix-Logik
- `src/scene/asset-triangle-patch.ts`: Kommentare
- `src/ui/panels/entity-fields/TrianglePatchFields.tsx`: Tooltips
- Test: Hilfsfunktion `computeWorldMirrorLocalMatrix(groupWorld, sign)`, Unit-Test, dass ein
  verschobener Patch auf die gegenüberliegende Seite von Welt X=0 gespiegelt wird

## Offene Frage
Ist die Spiegelung an der globalen Szene-Ebene (Welt-Ursprung) gemeint? Das nimmt der Plan an.
