# Plan: Picture Frame – Holz-Textur auf Außenflächen

## Problem
Bei Holz (`wood-soft`, `wood-porous`) auf dem Rahmen des Picture Frame laufen die Muster-Linien
an den Außen-/Seitenflächen glatt "durch" bzw. sind zu geraden Streifen verzogen.

## Ursache (`src/engine/frame-geometry.ts`)
Holz auf `surfaceRole: 'frame'` nutzt `samplingSpace: 'uv'` → die UVs aus `assignExtrudedFrameUvs`.
Dort gibt es drei Fehler:

1. **Querrichtung (v) ist normiert statt in Metern.**
   `u` (Perimeter) ist in Metern, `v` aber 0..1 über Rahmentiefe (Seitenwände) bzw. Leistenbreite (Caps).
   Bei ~2 cm Tiefe ist das Muster quer ~50× gestaucht → nur feine, gerade, durchlaufende Linien.
2. **Ecken-Zuordnung per Vertex statt per Fläche.** `resolveFrameBarSide` prüft `top/bottom` zuerst,
   d.h. die Eckvertices der rechten/linken Außenwand gehören zu top/bottom.
   Linke Außenwand: u läuft von `2W+H` (oben-links, als „top“ gewertet) bis `0` (unten-links, „bottom“)
   statt `2W+H … 2W+2H` → falsche Länge/Richtung, stark verzerrt. Gleiches bei den Front-/Back-Cap-Dreiecken,
   die über die Ecken triangulieren.
3. Kein Gehrungs-Schnitt (Mitre): die Cap-Dreiecke an den Ecken interpolieren zwischen Vertices
   verschiedener Leisten (u-Sprung), dadurch Schlieren im Eckbereich.

## Lösung
- UVs **pro Dreieck** vergeben (Geometrie ist non-indexed): Leiste über den Flächen-Schwerpunkt bzw.
  die Flächennormale bestimmen (Seitenwände: Normale ±x/±y; Caps: Schwerpunkt + Diagonale/Gehrung `|x|/halfW` vs `|y|/halfH`).
- `v` in **Metern**: Seitenwände `v = -z` (+ Offset je Innen/Außen), Caps `v = Abstand zur Innenkante`.
- Caps an den Ecken: ExtrudeGeometry-Shape so aufbauen, dass die Diagonalen (Gehrung) als Kanten
  existieren — Rahmen aus 4 Trapez-Leisten (je eigene Extrusion, gemerged) statt Shape mit Loch.
  Damit hat jede Leiste saubere, eigene UVs und die Maserung wechselt an der Gehrung die Richtung wie bei echtem Holz.
- `computeFramePerimeterS` bleibt (Tests), wird aber auf per-Leiste-Koordinate umgestellt.

## Tests
- `frame-geometry.test.ts` erweitern: alle Seitenwand-Dreiecke haben u-Spanne = Leistenlänge,
  v-Spanne = Tiefe in Metern; keine Dreiecke mit Vertices aus verschiedenen Leisten.
- `npx vitest run`, `npm run lint`, `npm run build`.

Sichtprüfung danach im Viewport (Wood Soft / Wood Porous, Rahmen frontal + seitlich).
