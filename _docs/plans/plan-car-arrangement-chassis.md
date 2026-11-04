# Plan: Car-Arrangement — Chassis-Block + 2 Achsen

**Status:** Freigegeben 2026-11-04 · umgesetzt
**Datum:** 2026-11-04
**Bezug:** `src/data/builtin-arrangements.ts` (CAR_ASSETS)

## Ziel

Das Built-in-Arrangement **Car** spawnt zusätzlich zu den 4 Rädern:

1. **Chassis-Block** (`block`)
   - Material: Brushed Aluminum (`material-aluminium-brushed`)
   - Physik: Dynamic, Dichte 1000 kg/m³ (→ 270 kg)
   - Maße: W 0.5 m · H 0.2 m · D 2.7 m · Corner radius 0.005 m
   - Position: X 0 · Y 0.2613 m · Z 0 · Rotation 0/0/0°
2. **2 Achsen** (`cylinder`), Brushed Aluminum, Radius 0.03 m
   - Vorderachse bei Z = −1.225, Hinterachse bei Z = +1.225 (Radstand 2.45 m)
   - Achse entlang Welt-X (Rot Z 90°), Höhe = Radmitte (Rad-Außenradius)
   - Länge = Spurweite (vorn 1.589 m, hinten 1.557 m), also Radmitte bis Radmitte

## Umsetzung

1. `ArrangementSpawn` erweitern (`src/scene/arrangement-types.ts`):
   - `rotationDeg?: { x; y; z }` (ersetzt `rotationYDeg`, keine Kompatibilität nötig)
   - `params?: Partial<…>` — kind-spezifische Overrides (Maße, Radius, Corner radius)
   - `physics?: { bodyMode; densityKgM3 }`
2. Spawn-Code (dort, wo Arrangements gespawnt werden) wendet die Overrides auf die Kind-Defaults an.
3. `CAR_ASSETS` um Block + 2 Zylinder ergänzen; Beschreibung anpassen.
4. Tests: `builtin-arrangements.test.ts` — Car hat 7 Assets, Block-Maße/Material/Physik, Achsen-Länge/Position.
5. `npx vitest run`, `npm run lint`, `npm run build`, Commit + Push auf `main`.

## Offene Fragen

1. Achslänge: Spurweite der Räder (vorn 1.589, hinten 1.557). → entschieden
2. Physik: alles Static — Block, Achsen und Räder. → entschieden
