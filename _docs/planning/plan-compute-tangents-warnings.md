# Plan: `computeTangents() failed` Konsolenwarnungen beheben

## Befund

`BufferGeometry.computeTangents()` (three.js) braucht **Index + position + normal + uv**.
Fehlt eines davon, loggt es `THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)` und bricht ab.

Unser Wrapper `src/engine/geometry-tangents.ts` (`ensureGeometryTangents`) prüft nur:
- UV vorhanden – aber akzeptiert auch `uv1`, three prüft nur `uv`.
- Normale (berechnet sie ggf. nach).
- **Den Index prüft er nicht.**

Nicht-indizierte Geometrien, die trotzdem durch `ensureGeometryTangents` laufen:

| Quelle | Datei | Grund |
|---|---|---|
| `ExtrudeGeometry` Monitorfuß | `src/engine/monitor-stand.ts:28` | Extrude ist immer nicht-indiziert |
| `ExtrudeGeometry` Bilderrahmen | `src/engine/frame-geometry.ts:185` | dito |
| `ExtrudeGeometry` Glasplatte | `src/engine/frame-geometry.ts:211` | dito |
| `ExtrudeGeometry` Handheld (2×) | `src/engine/handheld-geometry.ts:196, 331` | dito |
| CSG-Ergebnis Handheld-Rahmen | `src/engine/handheld-frame-csg.ts:83` | three-bvh-csg liefert nicht-indiziert |
| CSG-Ergebnis Wand mit Tür | `src/engine/wall-geometry.ts:65` | dito |

Die vier Meldungen kommen also je nach geladener Szene aus einer Teilmenge davon (z. B. Rahmen + Glas + Handheld). Folge: diese Meshes haben **keine Tangenten** → bei anisotropen Materialien (gebürstetes Metall) fällt TSL auf derivative-basierte TBN zurück (Facettierung im Specular). Funktional sonst harmlos.

### Nebenfund (gleiche Stellen)
`toCreasedNormals()` gibt eine **neue** Geometrie zurück und verändert die übergebene nicht. In `frame-geometry.ts:184/210`, `handheld-geometry.ts:195/330` und `csg-subtract.ts:40` wird der Rückgabewert verworfen → Aufrufe sind wirkungslos (nur Rechenzeit). Die Normalen stammen weiterhin von Extrude/CSG.

## Vorschlag

1. **`ensureGeometryTangents` robust machen**
   - Fehlt der Index: Geometrie in-place mit trivialem Index versehen (`setIndex([0..n-1])`). Das ändert keine Vertices/Normalen/UVs (keine Verschmelzung → harte Kanten bleiben erhalten), erfüllt aber die Voraussetzung von `computeTangents()`.
     - Alternative `mergeVertices()` verworfen: gibt neue Geometrie zurück (Aufrufer müssten umgebaut werden) und Tangenten wären pro Dreieck ohnehin gleich, da keine Vertices geteilt werden — Ergebnis entspricht dann flachen Tangenten, was bei harten Kanten korrekt ist.
   - UV-Check auf `uv` beschränken (oder `uv1` nicht mehr als ausreichend werten).
   - Optional: Guard nur in DEV-Builds per `console.warn` mit Kontext, falls dennoch etwas fehlt.
2. **`toCreasedNormals`-Aufrufe korrigieren** (separat entscheidbar):
   - Variante A: Rückgabewert übernehmen (`geometry = toCreasedNormals(...)`, alte disposen). Achtung: optisches Verhalten ändert sich (bisher nie aktiv gewesen) → visuell prüfen.
   - Variante B: Aufrufe entfernen, da Extrude/CSG-Normalen bisher akzeptabel aussahen.
   - Empfehlung: **B** zunächst, A nur wenn Schattierungsprobleme sichtbar sind.
3. **Tests** (`vitest`):
   - `ensureGeometryTangents` mit `ExtrudeGeometry` und `toNonIndexed()`-Box → `tangent`-Attribut vorhanden, keine Konsolenwarnung (`vi.spyOn(console, 'error'/'warn')`).
   - Geometrie ohne `uv` → bleibt ohne Tangenten, keine Warnung.
4. Verifikation: `npx vitest run`, `npm run lint`, `npm run build`; im Browser Konsole beim Laden der betroffenen Assets (Rahmen, Handheld, Monitor, Wand mit Tür) prüfen.

## Offene Frage an dich
- Punkt 2: Variante A oder B (oder vorerst gar nicht anfassen)?
