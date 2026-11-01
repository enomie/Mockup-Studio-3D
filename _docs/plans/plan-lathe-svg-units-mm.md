# Plan: Lathe-SVGs — einheitliche Basis (1 Unit = 1 mm, SVG = einzige Größenquelle)

**Status:** Freigegeben 2026-11-01 · A–F umgesetzt (offen: Pen-Fountain-Ring, visueller Check durch User)
**Datum:** 2026-11-01
**Bezug:** ersetzt Teile von [`plan-beverage-can-svg-ring.md`](./plan-beverage-can-svg-ring.md) (Normalisierung / Skalierung); der Ring-Teil dort bleibt gültig und wird auf dieser Basis umgesetzt.

## Entscheidungen (User, 2026-11-01)

1. **1 Unit = 1 mm** für **alle** Lathe-SVGs (Dosen, Flaschen, Pen, Rad).
2. **SVG = einzige Quelle** für Geometrie-Größe (Höhe, Radien). Engine streckt **nicht** mehr auf `heightM` / `diameterM`; Skalierung nur noch über `sizeScale`.
3. **Alle** Lathe-SVGs jetzt umstellen.
4. Beverage Can: Fallback (parametrischer Ring) entfällt; Label endet an **Ring-Unterkante**.

## SVG-Konvention (normativ, später auch für Editor)

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H">
  <path class="path_red"   stroke="#ff0000" fill="none" d="…"/>
  <path class="path_green" stroke="#00ff00" fill="none" d="…"/>
  <path class="path_blue"  stroke="#0000ff" fill="none" d="…"/>
</svg>
```

- `viewBox` in mm, **ohne** `width`/`height` (keine px/pt/mm-Angaben), keine `transform`-Gruppen.
- Nur `<path>` (kein `<rect>`, `<line>` etc. für Slots), kein `<style>`/CSS — Farbe + Klasse direkt am Pfad.
- Achse: y-Lathe → x = 0 ist Drehachse, y nach unten (Illustrator), Fuß = größtes y. Rad (x-Lathe) behält seine dokumentierte Achse (y = 330,5).
- Offene Kontur = läuft bis zur Achse (Scheibe/Körper); geschlossene Kontur (berührt Achse nicht) = Ring mit Loch.
- Hilfslinien erlaubt, wenn sie keine Slot-Klasse/-Farbe tragen (z. B. `class="guide"`).

**Engine bleibt tolerant** für Illustrator-Exporte: CSS-Klassen, Farbnamen (`red`/`lime`/`blue`), Kurz-Hex, `<rect>` werden weiterhin gelesen. Die mitgelieferten Dateien folgen aber der strengen Konvention.

## Schritte

### A. Normalisierungs-Skript (`scripts/normalize-lathe-svgs.ts`)
- Liest SVG, erkennt Slots (gleiche Logik wie Engine), wandelt `<rect>` → `<path>`, skaliert Koordinaten (Faktor pro Datei) auf mm, schreibt Konvention oben.
- **Kurven bleiben erhalten** (Pfaddaten affin transformieren, nicht zu Polylinien tessellieren), damit Dateien editierbar bleiben.
- Ersetzt das alte Einmal-Skript `scripts/bake-pen-lathe-svgs.ts`.

### B. Dateien umrechnen (Faktor → Ziel)
| Datei | heute | Ziel (mm) |
|---|---|---|
| `lathe-y-can-330ml-classic.svg` | ~2,8 Units/mm, CSS, `<rect>` | Höhe 115,2 (inkl. Ring), Radius 33 |
| `lathe-y-can-330ml-sleek.svg` | dito | Höhe 146,05, Radius 28,7 |
| `lathe-y-bottle-*-open.svg` (3×) | ~823 Units für 290 mm | Höhe 290; Radius aus `BELLY_OUTER_DIAMETER_M` prüfen |
| `lathe-y-pen-marker.svg` | pt (28,35 × 566,93), CSS, `<rect>` | 10 × 200 (Faktor 25,4/72) |
| `lathe-y-pen-fountain.svg` | mm, `width/height` mit mm | nur Format (Ring neu zeichnet User) |
| `lathe-x-wheel-car.svg` | mm, CSS | nur Format |

Offen: Dosen/Flaschen sind heute in X und Y **leicht unterschiedlich** skaliert (z. B. Dose classic X ≈ 0,352, Y ≈ 0,359 mm/Unit). Vorschlag: **getrennte Faktoren X/Y** einmalig ins SVG backen, sodass das Ergebnis exakt den heutigen Nennmaßen entspricht → visuell keine Änderung.

### C. Engine: SVG-Maße direkt (mm → m)
- Gemeinsamer Helper `lathe-svg-mm.ts`: Punkte × `MM_TO_M`, Y spiegeln (Fuß bei y = 0), Bounds über **alle** Slots (Ring kann über Körper hinausragen).
- `beverage-can-svg-profile.ts`, `wine-bottle-svg-profile.ts`, `pen-svg-profile.ts`, `wheel-car-svg-profile.ts`: Strecken auf `heightM`/`diameterM` entfernen → Helper.
- Geschlossene Konturen schließen + Wicklung normieren (Schritt 0 im Ring-Plan).

### D. Parameter: abgeleitet statt gesetzt
- `heightM`, `diameterM` (Dose), `heightM` (Flasche), `outerRadiusM`/`tireWidthM` (Rad): werden aus dem SVG **gemessen** (nach Laden, gecacht pro Profil). Nicht mehr in gespeicherte Szenen schreiben bzw. beim Laden ignorieren.
- Sync-Verbraucher (Cover-Plane, `asset-sizing.ts`, Label-Band, Footprint) brauchen die Maße synchron → **umgesetzt als generierte Datei** statt Vorladen: `scripts/generate-lathe-profile-metrics.ts` misst alle SVGs → `src/data/lathe-profile-metrics.generated.ts` (in `predev`/`prebuild`, Test prüft Synchronität). Gleiches Muster wie `builtin-images.generated.ts`; kein Async beim App-Start.
- Nennmaß-Tabellen (`BEVERAGE_CAN_BODY_NOMINAL_MM`, `BELLY_OUTER_DIAMETER_M`, `WHEEL_CAR_SVG_*_MM`, `PEN_PROFILE_VIEWBOX_*`) entfallen bzw. werden durch Messung ersetzt; Test sichert, dass gemessene Werte den bisherigen Nennmaßen entsprechen (±0,1 mm).
- Rad: Parameter wie `rimRadiusM`, `hubRadiusM` prüfen — sind sie Geometrie aus SVG oder Engine-only (Speichen)? Nur SVG-gedeckte ableiten.

### E. Beverage-Can-Ring (aus Ring-Plan)
- Ring = `path_green`, gleiche mm-Transformation wie Körper; `topRing*`-Parameter + Fallback entfernen.
- Label-Band: oben = **Ring-Unterkante** (gemessen).

### F. Tests + Doku
- Tests je Asset: gemessene Maße = Nennmaß; geschlossener Ring → Torus mit Loch; Illustrator-Export (CSS, Farbnamen, `<rect>`, pt) wird gelesen.
- Doku: `requirements-assets-lathe.md` (Konvention normativ), Can/Bottle/Pen/Wheel-Requirements anpassen.
- Checks: `npx vitest run`, `npm run lint`, `npm run build`, visuell alle Assets im Viewport.

## Umsetzung (Ist)

- Commit 1: A + B (Skript, Dateien, Slot-Leser für Illustrator-Exporte).
- Commit 2: C + D + E + F zusammen (Ring braucht die mm-Transformation; Trennen hätte Zwischenstände mit kaputtem Ring erzeugt).
- Label-Band: Aspect des Dosen-Bildes ändert sich leicht (Band jetzt bis Ring-Unterkante statt fix −2,5 mm).
- Flaschen-Bauchdurchmesser jetzt gemessen (z. B. Bordeaux 76,3 statt 76,0 mm).

## Reihenfolge / Commits
1. A + B (nur Dateien + Skript; Engine noch alt → Test: Normalisierung ergibt identische Geometrie).
2. C + D (Engine liest mm direkt).
3. E (Can-Ring).
4. Pen-Ring (sobald User Fountain-Ring neu gezeichnet hat) + F.

## Risiken
- Gespeicherte Szenen mit geänderter `heightM` (falls je möglich gewesen) → würden auf SVG-Maß zurückfallen. Prüfen, ob UI das je erlaubt hat (aktuell: nur `sizeScale`).
- Rad hat viele abgeleitete Parameter → ggf. eigener Folge-Plan, falls D dort zu groß wird.
