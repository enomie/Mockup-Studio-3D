# Plan G: Löcher bei der Object Extrusion

Status: **Entwurf – wartet auf Freigabe.** Stand: `_docs/requirements/requirements-profiles.md` (Abschnitt 4b).

## Ziel
Ein geschlossener Pfad **innerhalb** eines anderen geschlossenen Pfads stanzt ein **Loch** in die
Extrusion, z. B. ein Ring, ein Buchstabe „O“ oder ein Schild mit Bohrung. Das Prinzip ist wie bei
Illustrator (zusammengesetzter Pfad) bzw. Fusion (Innenkontur einer Skizze).

## Ist-Zustand
- `src/engine/extrusion-geometry.ts` baut **jeden Pfad einzeln**. Ein geschlossener Pfad wird zum
  Körper (`ExtrudeGeometry` ohne Löcher), ein offener zur Hülle.
- Ein Pfad im Inneren eines anderen wird heute einfach ein zweiter Körper **im** ersten. Die beiden
  überlappen, man sieht kein Loch.
- `ExtrudeGeometry` von three.js kann Löcher direkt (`Shape.holes`) und richtet die Laufrichtung
  der Löcher selbst aus.

## Regel (automatisch, wie Illustrator „Gerade-Ungerade“)
- Für jeden **geschlossenen** Pfad wird bestimmt, in wie vielen anderen geschlossenen Pfaden er
  **vollständig** liegt (Verschachtelungstiefe):
  - **Tiefe 0** (außen) → **Körper**
  - **Tiefe 1** (in einem Körper) → **Loch** in diesem Körper
  - **Tiefe 2** (in einem Loch) → wieder ein **Körper** („Insel“, z. B. der Punkt im Loch)
  - und so weiter abwechselnd
- **Teilweise überlappende** Pfade sind kein Loch. Sie bleiben eigene Körper wie heute, und im
  Inspector steht ein Hinweis „overlaps – no hole“.
- **Offene Pfade** sind nie Löcher und bleiben Hüllen.
- **Pro Pfad abschaltbar:** In der Pfadliste rechts gibt es den Schalter **„Cut hole“** (Standard
  an). Aus heißt: Dieser Pfad wird immer als eigener Körper gebaut, auch wenn er innen liegt.
  Das ist nötig für Dinge wie einen Knopf, der bewusst **im** Körper sitzt.

## Teile und Materialien
- Ein **Loch-Pfad** ist kein eigenes Teil. Unter Geometries in den Extrusion-Details erscheint er
  nicht. Die **Lochwand** bekommt das Material des Körpers, in dem das Loch sitzt.
- **Inseln** sind wieder eigene Teile mit eigenem Namen und Material.
- Die Pfade bleiben im Profil wie sie sind. Die Regel wirkt nur beim Bauen der Extrusion. Die
  Lathe-Assets (Flasche, Dose, Stift, Rad) sind nicht betroffen.

## 2D-Editor
- **Loch-Pfade** werden **gestrichelt** gezeichnet. Man sieht so schon beim Zeichnen, was ein Loch
  wird.
- **Pfadliste rechts:** In der Zeile steht „Hole in ‹Name›“, und im aktiven Pfad gibt es den
  Schalter **Cut hole** sowie gegebenenfalls den Hinweis „overlaps – no hole“.

## Umsetzung
1. **Reine Funktion** `classifyExtrusionPaths(paths)` in `src/scene/profile-holes.ts`:
   - Die geschlossenen Pfade werden abgetastet (wie beim Bauen).
   - „Liegt vollständig in“ heißt: alle Abtastpunkte innerhalb (Punkt-in-Polygon) und keine
     Kantenüberschneidung.
   - Ergebnis pro Pfad: `solid` / `hole` (mit Eltern-Pfad) / `shell` (offen) / `overlap`.
   - Tests: Ring, Insel im Loch, teilweise Überlappung, offener Pfad, Cut hole aus.
2. **Datenmodell:** `ProfilePath.cutHole?: boolean` (fehlt = an). Wird mit dem Profil
   gespeichert, ältere Profile verhalten sich wie „an“.
3. **Geometrie:** `buildExtrusionMeshes` baut pro Körper ein `Shape` mit seinen direkten Löchern
   (`shape.holes`). Inseln werden eigene Körper.
4. **Extrusion-Details:** Geometries listet nur Körper und Hüllen.
5. **Editor:** Loch-Pfade gestrichelt, Pfadliste mit „Hole in …“, Schalter Cut hole und Hinweis.
6. **Doku:** `requirements-profiles.md` (4b Extrusion, Editor, Datenmodell) nachziehen.

## Nicht in G
- Boolesche Operationen zwischen überlappenden Pfaden (Vereinen, Abziehen, Schnitt)
- Löcher bei den Lathe-Assets (dort entsteht „hohl“ über die Form des Profils)
- Fasen und Abrundung der Kanten (eigener Schritt)

## Fragen an dich
1. Ist die **automatische Regel** (innen = Loch, Insel im Loch = Körper) mit dem Schalter
   **Cut hole** pro Pfad ok? Die Alternative wäre, Löcher immer ausdrücklich zu markieren.
2. Soll die **Lochwand** das Material des umgebenden Körpers haben (so geplant), oder ein eigenes
   wählbares Material?
