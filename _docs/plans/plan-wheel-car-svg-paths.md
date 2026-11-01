# Plan: Wheel Car — alles aus SVG-Pfaden

**Status:** Entwurf — wartet auf Freigabe
**Datum:** 2026-11-01
**Bezug:** [`plan-lathe-svg-units-mm.md`](./plan-lathe-svg-units-mm.md), [`plan-wine-bottle-svg-capsule.md`](./plan-wine-bottle-svg-capsule.md) (10 Farb-Slots)

## Ist-Zustand

| Teil | Quelle heute |
|---|---|
| Reifen | `path_red` (geschlossene Kontur, berührt Achse nicht) |
| Felge außen (Felgenring) | `path_green` (Rechteck) + **extra Stirn-Ringe** (`RingGeometry`) an beiden Enden |
| Nabe | `path_blue` (Rechteck bis zur Achse) + Stirn-Ringe |
| Speichen | **Engine-Code**: 5 Boxen, Breite 18 mm, Tiefe 24 mm (Konstanten) |
| Größe | `outerRadiusM` (Panel „Size“/Width/Height) statt `sizeScale` wie bei allen anderen Lathe-Assets |

**Tote Parameter:** `rimRadiusM`, `rimInsetM`, `hubRadiusM`, `hubDepthM`, `tireCornerRadiusMm` werden geclampt und im Panel angezeigt (Rim inset, Hub radius, Hub depth sind editierbar), **beeinflussen die Geometrie aber nicht** — die kommt schon aus dem SVG. `tireWidthM` wird nur für Physik-Collider/Anzeige genutzt.

## Ziel

SVG = einzige Quelle für Form und Maße, wie bei Dose/Pen/Flasche.

## Vorschlag

1. **Lathe-Teile wie bisher, aber über den gemeinsamen Pfad-Leser** (`lathe-contour.ts`):
   - Reifen, Felgenring = geschlossene Konturen → Ring mit Loch, korrekt orientiert.
   - Nabe = Kontur bis zur Achse → voller Körper.
   - **Stirn-Ringe entfallen** (geschlossene Kontur ist bereits ein geschlossener Körper).
2. **Zusätzliche Lathe-Teile als optionale Slots** (nur gebaut, wenn Pfad vorhanden):
   - `path_magenta` — **Felgenschüssel / Felgenstern-Fläche** (Scheibe zwischen Nabe und Felgenring, z. B. für Felgen ohne Speichen) — optional.
   - `path_cyan` — **Bremsscheibe** — optional.
   - `path_yellow` — **Nabenkappe** (Center cap) — optional.
3. **Speichen** sind keine Drehkörper → nicht per Lathe. Optionen (siehe Fragen):
   - **A (empfohlen):** Speiche als **Querschnitt-Pfad** (`path_orange`) im selben SVG: Form der Speiche in der Seitenansicht (radial × axial); Engine extrudiert ihn tangential mit Breite = … und verteilt `spokeCount` Stück. Breite + Anzahl bleiben Parameter (Breite ggf. aus zweitem Maß im SVG).
   - **B:** Eigenes **Front-SVG** (`front-x-wheel-car.svg`) mit der Speichenform in Frontansicht → Extrusion axial um die gezeichnete Tiefe.
   - **C:** Speichen bleiben im Code (wie heute), Maße aber aus SVG abgeleitet (Felgenring-Innenradius, Nabenradius).
4. **Größe auf `sizeScale` umstellen** (wie alle anderen Lathe-Assets): `outerRadiusM`, `tireWidthM` werden aus SVG gemessen × `sizeScale`. Panel: Size + gekoppelte Width/Height wie Dose/Flasche. Alte Szenen: `outerRadiusM` → `sizeScale = outerRadiusM / gemessener Radius` migrieren.
5. **Tote Parameter entfernen** (`rimRadiusM`, `rimInsetM`, `hubRadiusM`, `hubDepthM`, `tireCornerRadiusMm`) inkl. Panel-Feldern, `rigid-primitive-uniform-scale.ts`; Physik-Collider aus gemessenen Maßen × `sizeScale`.
6. **Tests + Doku**: Teile aus Slots, keine Stirn-Ringe, Migration `outerRadiusM` → `sizeScale`, Collider-Maße; `requirements-assets-wheel-car.md`.

## Offene Fragen

1. Speichen: **A**, **B** oder **C**?
2. Welche Zusatzteile (Felgenschüssel, Bremsscheibe, Nabenkappe) willst du — und soll ich Startpfade dafür erzeugen?
3. Größe auf `sizeScale` umstellen (einheitlich mit den anderen Assets) — ok?
