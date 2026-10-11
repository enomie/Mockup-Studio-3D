# Antialiasing (Viewport)

Raster-**Export** (SMAA-Ausnahme PNG transparent, Alpha, Pipeline): ausschließlich [`requirements-export.md`](./requirements-export.md).

---

**Category:** Rendering  
**Title:** Viewport anti-aliasing stack  
**Description:** Viewport nutzt **eine** Kette in der Engine — kein AA in Material-`setupOutput`, keine zweite WebGL-Pipeline. Export teilt MSAA-Composite; Export-Details → [`requirements-export.md`](./requirements-export.md).

**MSAA:** `WebGPURenderer` mit `antialias: true` und `samples` = `VIEWPORT_MSAA_SAMPLES` (Default 4). Compositor-`RenderTarget` (Sky + Main) und Planar-Mirror-`reflector()` nutzen dieselbe Sample-Anzahl.

**SMAA:** Three `RenderPipeline` + TSL `smaa()` aus `three/addons/tsl/display/SMAANode.js` — **nach** Scene-Composite, **vor** Output Color Transform (Tone Mapping / sRGB). Schalter `VIEWPORT_SMAA_ENABLED` (Code-Konstante, kein UI v1).

**Sky + Main:** Ein gemeinsames Offscreen-Target — Sky-Pass, dann `clearDepth()`, dann Main-Pass (wie bisher). Kein doppeltes `pass()` mit getrennten Targets.

**Pixel ratio:** `Math.min(devicePixelRatio, VIEWPORT_MAX_PIXEL_RATIO)` — zentral in Renderer-Setup.

**Plattform:** Nur WebGPU — kein WebGL-Fallback.

---

**Category:** Code  
**Title:** Module ownership  
**Description:** `src/render/renderer-setup.ts` — Renderer-Erzeugung + Shadow-Setup. `src/render/viewport-render-pipeline.ts` — Compositor, SMAA, `renderFrame`. `src/engine/mockup-engine.ts` ruft nur diese API; kein direktes `renderer.render` für die Hauptszene.
