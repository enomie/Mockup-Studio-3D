# Plan: Fabric-Bake wirkt unruhiger als Freeze

## Symptom
Gebackenes Fabric Cloth zeigt mehr Dellen/Beulen (v. a. Perlenkette entlang der Oberkante)
als das eingefrorene Live-Cloth, obwohl das Upsampling glätten sollte.

## Ursache (`src/engine/fabric-cloth-bake.ts`)
1. **Catmull-Rom interpoliert** – die Kurve läuft exakt durch jeden Sim-Vertex. Sim-Rauschen
   (Kollisions-Jitter an der Box-Kante) bleibt vollständig erhalten.
2. Catmull-Rom ist nur **C1**: an jedem Sim-Vertex springt die Krümmung. Positionen sehen
   glatt aus, aber Normalen (= Ableitung) bekommen einen Knick im Sim-Raster-Takt.
3. **Normalen werden auf dem dichten Grid berechnet** (`writeClothGridNormals` auf `dense`).
   Die Central-Difference spannt dort nur 2 dichte Zellen (= 2/3 Sim-Zelle) statt 2 Sim-Zellen
   wie beim Live-Mesh. Der Tiefpass, den das Live-Mesh „gratis“ hat, fällt weg → die Knicke
   aus (2) und das Rauschen aus (1) werden im Highlight (Chrom-Material!) sichtbar.

Kurz: Live = grobe, weich gemittelte Normalen; Bake = feine Normalen eines leicht
welligen Splines → Bake schärft statt zu glätten.

## Fix
1. **Normalen auf dem Sim-Grid berechnen** (identisch zum Live-Mesh) und diese Normalen
   mit demselben Upsampling auf das dichte Grid bringen, danach renormalisieren.
   → Bake-Shading ist mindestens so glatt wie Freeze.
2. **Positionen glätten statt nur interpolieren**: vor dem Catmull-Rom ein leichter
   Laplace/Taubin-Pass (1–2 Iterationen, Randvertices fix), damit Sim-Jitter nicht
   eingefroren wird. Taubin (λ/μ) verhindert Schrumpfen. Gepinnte/Rand-Vertices bleiben exakt.
   (Alternative: kubischer B-Spline statt Catmull-Rom — C2, aber nicht mehr durch die
   Sim-Vertices; ich empfehle Taubin + Catmull-Rom.)

## Tests
- Unit-Test: verrauschtes Grid → Bake-Normalen-Varianz ≤ Live-Normalen-Varianz.
- Unit-Test: Normalen-Upsampling liefert Einheitsvektoren, Randvertices unverändert.
- `npx vitest run`, `npm run lint`, `npm run build`.

## Hinweis
Bereits gespeicherte Bakes enthalten die alten Normalen; sie müssen neu gebacken werden
(keine Migration geplant).
