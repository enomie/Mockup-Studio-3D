# Plan: Punkt auf verbundener Kante einfügen ändert die Form nicht

## Problem

Ein neuer Punkt auf einer verbundenen Kante erzeugt Wölbungen, obwohl noch nichts
bearbeitet wurde. Nach dem Einfügen besteht die gemeinsame Kante aus 2 verbundenen
Segmenten (2 Links), der neue Punkt ist ein geteilter Punkt beider Patches.

Messung (Testszene, Patchgröße ~0,6): maximale Abweichung der Fläche 0,014.

Ursachen:
1. Der gelbe Quer-Handle hat am Kantenpunkt eine Doppelrolle: Er formt die klassische
   Wölbung (`evalCross`, lineare Interpolation) **und** gibt der Nahtkorrektur
   (`patch-edge-correction`) die Zielrichtung vor. Vor dem Einfügen interpolierte die
   Korrektur die Richtung zwischen den Segmentenden (an Ecken: rosa Handles). Danach nimmt
   sie den gemischten gelben Handle des neuen Punkts → andere Richtung → Wölbung.
2. `createInnerNode` legte die gelben Handles beider Patches auf ihren Mittelwert,
   gegenüber → ändert die klassische Wölbung beider Patches.

Den gelben Handle passend zu drehen reicht nicht (gemessen: 0,0046 Rest), weil das wieder
die klassische Wölbung ändert.

## Lösung

- `PatchPoint.seamFollowsEnds`: beim Einfügen auf einer verbundenen Kante merkt sich der
  neue Punkt (in allen Patches) seinen Quer-Handle-Offset.
- Solange der Quer-Handle unverändert ist (`isSeamFollowingEnds`), behandelt die
  Nahtkorrektur den Punkt nicht als Segmentgrenze: die Richtung läuft wie vorher von den
  umliegenden Knoten durch. Klassische Fläche bleibt ohnehin exakt (de Casteljau +
  lineare Interpolation).
- Der neue geteilte Punkt übernimmt die Quer-Handles 1:1 (`createInnerNode(..., keepCross)`),
  kein Mitteln.
- Sobald der Quer-Handle bearbeitet wird (auch über den gekoppelten Partner), steuert der
  Punkt die Naht selbst – erst dann ändert sich die Form.

## Test

`src/engine/patch-insert-keeps-shape.test.ts`: Fläche beider Patches vorher/nachher gleich
(< 1e-9), nach Drehen des Quer-Handles übernimmt der Punkt.
