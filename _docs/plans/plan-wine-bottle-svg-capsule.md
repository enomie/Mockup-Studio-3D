# Plan: Wine Bottle — Capsule, Disc, Korken als SVG-Pfade · bis zu 10 Slots

**Status:** Freigegeben 2026-11-01 · umgesetzt (offen: visueller Check, Feinschliff der Pfade durch User)
**Datum:** 2026-11-01
**Bezug:** [`plan-lathe-svg-units-mm.md`](./plan-lathe-svg-units-mm.md) (1 Unit = 1 mm, SVG = einzige Größenquelle)

## Entscheidungen (User, 2026-11-01)

1. Flasche aus **4 Pfaden**: Glas (wie heute), **Capsule-Foil**, **Disc** (leicht gewölbt), **Korken**.
2. Foil und Disc je **ein offener Pfad** (wie Dosen-Körper) — **keine** Dicke, **kein** Standoff in der Engine: Größe und Abstände kommen **nur aus dem SVG**.
3. Parameter **Foil height** (`capsuleFoilHeightM`) und **Disc height** (`capsuleDiscHeightM`) entfallen (inkl. UI, Clamp, Skalierung); ebenso Korken-Konstanten (`CORK_RADIUS_M`, `CORK_HEIGHT_M`).
4. Projektweit **bis zu 10 Pfad-Slots** statt 3.
5. **Claude erzeugt die drei Flaschen-SVGs neu** (aus heutiger Geometrie); User verfeinert danach.

## Offener Pfad — Bedeutung je Teil

| Teil | Pfad | Ergebnis nach Lathe |
|---|---|---|
| Glas | wie heute (`path_red`, erstes Subpath, Wandstärke Engine) | unverändert |
| Foil | offene Linie entlang Hals/Mündung, **außerhalb** des Glases gezeichnet (Abstand = gezeichneter Abstand) | einseitige Mantelfläche (wie heute, aber Form/Höhe/Abstand aus SVG) |
| Disc | offene Linie **von der Achse** (x = 0) nach außen, leicht gewölbt | Deckelfläche bis zur Mitte |
| Korken | offene Kontur von Achse → außen → Achse (wie Dosen-Körper) | Vollkörper (unter der Foil, i. d. R. unsichtbar) |

Einseitige Flächen (Foil, Disc) bekommen `side: DoubleSide`, damit sie von innen/unten nicht verschwinden.

## Slots: 10 Farben

Farben überleben jeden Illustrator-Export (als CSS-Klasse oder Stroke), Klassennamen und IDs nicht zuverlässig → **Slot = Stroke-Farbe**.

| Slot | Klasse | Stroke | Flasche | (heute: Pen / Dose / Rad) |
|---|---|---|---|---|
| 0 | `path_red` | `#ff0000` | Glas | Cap / Körper / Reifen |
| 1 | `path_green` | `#00ff00` | Foil | Ring / Top-Ring / Felge außen |
| 2 | `path_blue` | `#0000ff` | Disc | Body / — / Nabe |
| 3 | `path_magenta` | `#ff00ff` | Korken | — |
| 4 | `path_cyan` | `#00ffff` | — | — |
| 5 | `path_yellow` | `#ffff00` | — | — |
| 6 | `path_orange` | `#ff8000` | — | — |
| 7 | `path_purple` | `#8000ff` | — | — |
| 8 | `path_teal` | `#008080` | — | — |
| 9 | `path_brown` | `#804000` | — | — |

- Illustrator-Farbnamen (`red`, `lime`, `blue`, `magenta`/`fuchsia`, `cyan`/`aqua`, `yellow`, `orange`, `purple`, `teal`) werden mit gelesen.
- Hinweis: Illustrator-`orange` = `#ffa500`, `purple` = `#800080` → im Leser als Alias auf Slot 6/7 zulassen.
- Bestehende Assets bleiben unverändert (Slots 0–2).
- `lathe-svg-metrics` / generierte Maße: `slots` von 3 auf 10 Einträge.

## Illustrator-Workflow

Illustrator formatiert beim Speichern um (CSS `cls-*`, `<rect>`, pt …). Danach einfach:

```
npx tsx scripts/normalize-lathe-svgs.ts public/profiles/lathe/<datei>.svg
npx tsx scripts/generate-lathe-profile-metrics.ts
```

→ Datei wieder im Projekt-Format (mm, `<path class="path_*" stroke="#…">`). Achtung: Export in **mm** bzw. Skript-Faktor prüfen (pt → mm = 25,4/72), sonst stimmen Maße nicht.

## Schritte

1. **Slots 0–9** in `lathe-svg-path-slots.ts` (Klassen, Farben, Farbnamen), Metrics/Generator/Normalisierer auf 10 Slots; Tests.
2. **Flaschen-SVGs neu erzeugen** (Skript, einmalig): Glas-Pfad unverändert übernehmen; Foil = Glas-Außenkontur oben, heutige Höhe **28 mm**, um **0,4 mm** nach außen versetzt, über die Mündung bis zur Disc; Disc = Mündungsradius + 0,4 mm, **2 mm** Höhe am Rand, Wölbung **~0,5 mm**; Korken = Zylinder Radius/Höhe wie heute (9 / 9 / 10 mm, 40 mm), Oberkante = Glas-Oberkante. Ergebnis = heutiges Aussehen, nur jetzt im SVG.
3. **Engine** (`wine-bottle-svg-profile.ts`, `wine-bottle-geometry.ts`): Foil, Disc, Korken als Lathe aus Slot 1/2/3 (mm → m, gleicher Fuß wie Glas); `buildOpenMantleGeometry`-Foil, `CylinderGeometry`-Disc/Korken, `capsuleRadialStandoffM` entfernen. Fehlt ein Pfad → Teil wird nicht gebaut.
4. **Parameter entfernen** (`asset-wine-bottle.ts`, `WineBottleFields.tsx`, `asset-sizing.ts`, …): `capsuleFoilHeightM`, `capsuleDiscHeightM`, Korken-Konstanten; alte Szenen: Werte ignorieren.
5. **Höhe**: gemessene Gesamthöhe = Glas + Disc (~292 mm statt 290). Label (vom Fuß gemessen) unverändert.
6. **Tests + Doku**: Teile aus Slots, Foil außerhalb Glas, Disc bis Achse; `requirements-assets-wine-bottle.md`, `requirements-assets-lathe.md` (10 Slots, Workflow). Checks: `npx vitest run`, `npm run lint`, `npm run build`.

## Entscheidungen (Nachtrag)

- Reihenfolge von innen nach außen/oben: **Glas → Foil (liegt auf der Flasche, deckt die Mündung) → Disc ganz oben auf der Foil**.
- Sparkling: vorerst 28 mm wie die anderen; User passt an.

## Umsetzung (Ist)

- Erzeugte Startpfade: Foil 0,4 mm außerhalb des Glases, 28 mm hoch, über die Mündung bis zur Achse (0,4 mm über Glas-Oberkante); Disc-Rand am Foil-Radius, 2 mm hoch, 0,5 mm Wölbung; Korken 40 mm (Radius 9 / 9 / 10 mm), Oberkante = Glas-Oberkante. Gesamthöhe 292,9 mm, Glas 290 mm.
- Normalisierer: Einzeldatei wird so verschoben, dass der oberste Punkt bei y = 0 liegt; `--pt` für Illustrator-pt-Export.
