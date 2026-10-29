# Export

**Normative Quelle** für Bild-Export (Raster aus der Viewport-Kamera). Andere Kategorie-Dateien verweisen hierher — keine parallelen Export-Spezifikationen.

**Querverweise (kein Export-Scope):** Kamera-Navigation & Presets → [`requirements-camera.md`](./requirements-camera.md). Shell-Zonen → [`requirements-app-layout.md`](./requirements-app-layout.md). Viewport-MSAA/SMAA (Live) → [`requirements-antialiasing.md`](./requirements-antialiasing.md). Szene-Schatten (Cast/Receive, Maps) → [`requirements-shadows.md`](./requirements-shadows.md). Ground-Panel (Visible, Material, Receive) → [`requirements-ground.md`](./requirements-ground.md). Bild-Seitenverhältnis → [`requirements-images.md`](./requirements-images.md) / `image-aspect-ratio.mdc`.

**Abgrenzung:** `AppMode: 'export'` in [`requirements-gimbals.md`](./requirements-gimbals.md) = **Viewport-Tool-Modus** (Gizmo/Input) — **nicht** Datei-Export.

---

**Category:** Export  
**Title:** Zweck  
**Description:** User exportiert ein **Rasterbild** der aktuellen Szene aus der **aktiven Kamera** (Orbit-View). Workflow: Szene, Licht, Environment, Kamera einstellen → **Top Main Export** → Download. Kein separates Render-Fenster v1. Projekt → [`requirements-and-project-description.md`](./requirements-and-project-description.md).

---

**Category:** Export  
**Title:** UI — Top Main + Right Panel  
**Description:** **Auslösung:** **Top Main** Icon **Export** (`download`) → `exportViewportImage()` im Store. **Einstellungen:** **Right Main** Nav **Export** (`Download`) → **Right Sub** `ExportSubPanel` (scrollbar, `SubPanel` + Sections). Styling → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md). **Kein** zweiter Export-Button im Panel v1. Right-Nav-Zuordnung → [`requirements-app-layout.md`](./requirements-app-layout.md) (Eintrag **Export** neben Scene/Environment/Camera/Lighting).

---

**Category:** Export  
**Title:** Format-Optionen (Dropdown)  
**Description:** Store `exportImageFormat`: **`png-transparent`** — UI **PNG (transparent)**; **`jpeg`** — **JPG**. **Default:** `png-transparent`. Section **Format**, `PanelSelect`. JPG blendet Section **Ground** aus (nur PNG).

---

**Category:** Export  
**Title:** PNG (transparent) — Himmel & leerer Raum  
**Description:** Leere Pixel und **Sky** → **Alpha 0**. Capture: **kein Sky-Pass** in `compositeSceneToTarget`; `transparentBackground: true`, Clear **Alpha 0**. Boden/Assets/Fog auf Geometrie wie im Viewport (**sofern** Ground-Modus `viewport` — siehe Ground surface). Viewport kann Sky zeigen, PNG nicht (bewusst nicht WYSIWYG für Himmel). Hint im Panel (muted): *Sky and empty areas export transparent…* Aspect Ratio unverändert.

---

**Category:** Export  
**Title:** PNG — Ground surface  
**Description:** Store `exportGroundSurface`: **`viewport`** | **`contact-shadows-only`**. **Default:** `viewport` (= Boden inkl. Material/Mirror wie Viewport, zusammen mit transparentem Himmel). **`contact-shadows-only`:** nur mit `png-transparent`; nur **Capture** — Live-Viewport unändert. Section **Ground**, Checkbox **Contact shadows only**. **Disabled** wenn `ground.visible === false` oder `ground.receiveShadow === false` (Hint im Panel). Bei fehlenden Voraussetzungen: Engine fällt auf **`viewport`** zurück. **Mirror floor** beim Catcher-Capture **aus**.

---

**Category:** Export  
**Title:** Contact shadows only — Semantik & Engine  
**Description:** Use Case: PNG über **eigenen HTML/CSS-Hintergrund** — Produkt + **Kontaktschatten** auf der Bodenebene, **ohne** sichtbare Bodenfläche (kein Material/Textur/Spiegel). **Nicht** Ground **Eye** aus (`visible = false` → kein `receiveShadow`, keine Kontaktschatten). Ground-Mesh bleibt **visible** + **receiveShadow**. **Ein** Render-Pass, gleiche `ViewportRenderPipeline` wie Live-View. Ground bleibt **`GroundMaterial`** — **kein** `ShadowMaterial`, **kein** zweiter Shadow-Pass, **kein** Dual-Capture Schatten an/aus. Capture: `GroundMaterial.setExportShadowCatcherActive(true)` (`EnvironmentSystem.pushGroundExportCaptureMode`); `transparent`, `depthWrite: false`; `setupOutput` leitet aus **demselben** lit-Output ab: `light = clamp(shaded / albedo, 0, 1)`, `alpha = 1 − min(light.rgb)`, RGB **0** — Multi-Light-Schatten (Key/Fill) wie auf dem Boden im Viewport. Hint: *Ground surface hidden in export; contact shadows kept. Mirror is off for this capture.*

---

**Category:** Export  
**Title:** Physics rigid-test mesh — Ausschluss  
**Description:** Der **Panel-Falltest**-Würfel (`physics-rigid-test`, siehe [`requirements-physics-test.md`](./requirements-physics-test.md)) erscheint **nicht** in PNG/JPG-Export — nur während `captureViewportImage` per `pushExportHidePhysicsTest` ausgeblendet; **Live-Viewport** bleibt unverändert. Gilt für alle Export-Formate.

---

**Category:** Export  
**Title:** JPG — Semantik  
**Description:** **WYSIWYG** inkl. Sky und opaken Hintergrund. `image/jpeg`, Qualität **`EXPORT_JPEG_QUALITY`** (0,92) in `src/constants.ts`. Kein Alpha. `groundSurface` immer **`viewport`**. Dateiname → Block **Dateinamen**.

---

**Category:** Export  
**Title:** Kamera & Framing  
**Description:** Export = **aktuelle Kamera-View** (Orbit, FOV/Ortho-Zoom, Target). Nach Preset-Load gilt gespeichertes **Framing** — keine separate Export-Kamera v1. Details Navigation/Presets → [`requirements-camera.md`](./requirements-camera.md).

---

**Category:** Export  
**Title:** Pipeline — eine Kette, Capture-Parameter  
**Description:** Scene-API `captureViewportImage({ format, jpegQuality?, groundSurface? })`; Engine `MockupEngine.captureViewportImage`. **Kein** separater Export-Renderer. Module: `src/render/viewport-render-pipeline.ts`, `src/render/renderer-setup.ts`, `src/engine/mockup-engine.ts`, `src/materials/groundMaterial.ts`. **MSAA:** wie Viewport (`VIEWPORT_MSAA_SAMPLES`) auf Composite-RT. **PNG transparent:** Composite-RT **`RGBAFormat`**; WebGPU-Renderer **`alpha: true`** (Framebuffer für `canvas.toBlob`); für diesen Frame **SMAA aus** (`pipelineDirect`), Canvas vor Output mit Alpha-0 clearen — Live-Loop behält SMAA → [`requirements-antialiasing.md`](./requirements-antialiasing.md). **Schatten:** gleiche Cast/Receive-Flags und Licht-Setup wie Viewport; **Capture** erhöht temporär die Shadow-Map-Auflösung auf **`SHADOW_MAP_SIZE_EXPORT`** (8192²) für Key/Fill-Caster, danach Restore auf Viewport-**4096²** → [`requirements-shadows.md`](./requirements-shadows.md) (Abschnitt *Export — Shadow-Map-Auflösung*). **Light fixtures:** Key/Fill-Discs sind **kein separater Layer** — bei `groundSurface: viewport` wie im Live-Viewport (sichtbar wenn im Frame); v0 **kein** Fixture-Stripping → [`requirements-lighting.md`](./requirements-lighting.md) (Light fixtures v0 — Sichtbarkeit & Reflexionen).

---

**Category:** Export  
**Title:** State, Store & Scene Save  
**Description:** UI-Store (`app-store.ts`): `exportImageFormat`, `exportGroundSurface`, `exportHideLightFixtures`; Setter `setExportImageFormat`, `setExportGroundSurface`, `setExportHideLightFixtures`; Download `exportViewportImage()`. Typen `src/scene/export-image.ts` (`ExportImageFormat`, `ExportGroundSurface`, `CaptureViewportImageOptions`). Download-Dateiname über `viewportExportDownloadFilename` (siehe **Dateinamen**). **Scene Save:** Serialisierung Export-Felder **TBD** (session-only bis Save).

---

**Category:** Export  
**Title:** Dateinamen (v1)  
**Description:** Top-Bar-Download: **`mockup-YYYYMMDDHHmmss.png`** (PNG transparent) bzw. **`mockup-YYYYMMDDHHmmss.jpg`** (JPEG) — lokale Wandzeit, Sekunden inklusive. Hilfsfunktionen `formatExportDateTimeSuffix`, `viewportExportDownloadFilename` in `src/scene/export-image.ts`; `exportViewportImage()` im Store.

---

**Category:** Export  
**Title:** Light fixtures — Hide in export  
**Description:** Export Sub-Panel, Section **Lighting**: Checkbox **Hide light fixtures** (`PanelCheckbox`). Store `exportHideLightFixtures: boolean`, Setter `setExportHideLightFixtures`, Default **`false`** (WYSIWYG — Discs und Wireframe wie Viewport). Gilt für **PNG und JPG**. Nur **Capture** — Live-Viewport unverändert (`LightingSystem.pushExportHideFixtures` / `popExportHideFixtures` in `captureViewportImage`). Wenn **an:** emissive **Fixture-Discs** und **Wireframe-Chrome** am Key/Fill-Rig `visible = false`; **SpotLight**, Schatten und übrige Szene unverändert. **Planar Mirror:** Reflector-Pass nutzt dieselbe Scene — Discs/Wireframe erscheinen im Export-Boden-Spiegel nicht, wenn ausgeblendet. `CaptureViewportImageOptions.hideLightFixtures`. Serialisierung **TBD** (session-only wie andere Export-Felder). → [`requirements-lighting.md`](./requirements-lighting.md) (Light fixtures v0).

---

**Category:** Export  
**Title:** Export — Shadow-Map-Auflösung (Capture)  
**Description:** Beim Bild-Export (`captureViewportImage` / `exportViewportImage`) **ein Frame** mit höherer Shadow-Map-Auflösung: **`SHADOW_MAP_SIZE_EXPORT`** = **8192²** auf allen **aktiven** Key-/Fill-Spot-Shadows (`castShadow` + Licht enabled). Live-Viewport bleibt **`SHADOW_MAP_SIZE`** = **4096²**. Implementierung: `LightingSystem.pushExportShadowQuality()` / `popExportShadowQuality()` im Capture-`try/finally` ([`mockup-engine-capture.ts`](../../src/engine/mockup-engine-capture.ts)); nach Resize `updateSpotShadowCamera` für Caster. **Kein** UI-Schalter v1; keine Scene-Save-Felder.

---

**Category:** Export  
**Title:** Nicht v1  
**Description:** Höhere **Canvas**-Export-Auflösung (temporäres Pipeline-Resize, unabhängig von Shadow Maps). Batch-Export. Export nur aus Kamera-Preset ohne Live-View. JPEG-Hintergrundfarbe. Separater Export-Button im Panel. Scene-Save für Export-Einstellungen. Optionale CPU-Matte-Pfade (`src/render/export-shadow-matte.ts`) — **nicht** Produktpfad; Produkt = GroundMaterial-Catcher oben.

---

**Category:** Export — Physics / Fabric cloth  
**Title:** Deformiertes Tuch — WYSIWYG  
**Description:** **World-Freeze** = Pause — hält letzten Mesh-Zustand in der Szene. **Bake** = User-Asset in der Assets-Bibliothek (steif, ggf. geglättetes Mesh) — **nicht** Export-Schritt → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md), [`requirements-physics.md`](./requirements-physics.md).

| Thema | Regel |
|---|---|
| **Deformiertes Tuch** | **WYSIWYG:** `captureViewportImage` rendert das **aktuelle** Stoff-`BufferGeometry` — **kein** separater Cloth-Export-Pfad |
| **Ruhe (idle)** | Mesh flach wie vor Physics Start |
| **`paused` (Freeze)** | Export zeigt **eingefrorene** Falten — gleiches (grobes) Mesh wie zuletzt in `simulating` |
| **User-Asset (gebaked)** | Export wie jede andere Entity — statisches deformiertes Mesh |
| **Kein Export-Bake** | Glättung beim **Bake in Assets**, nicht beim PNG/JPG-Klick; **kein** `SharedArrayBuffer` |
| Export startet **keine** Simulation | unverändert |
| **Scene Save** | Deformierte Vertices **nicht** serialisieren v1 — nach Load: Ruhe-Quad; User startet Physik neu |

Optional später (nicht v1): statisches Bake-Mesh für Performance oder Scene-Save — → [`requirements-architecture.md`](./requirements-architecture.md).

---

**Category:** Export  
**Title:** Viewport helpers — WYSIWYG  
**Description:** Overlays aus Environment **Viewport helpers** (Floor grid, World origin, Forward arrow, Light handles) — wenn im Viewport **sichtbar**, erscheinen sie im Export **ohne** separaten Capture-Strip (gleiche Main-Scene-Pipeline), inkl. **see-through**-Darstellung wie Live. Details → [`requirements-environment.md`](./requirements-environment.md) (Viewport helpers — Export). **Nicht** betroffen: Transform-Gizmo, Selection-Outline, Physics-Test-Würfel (immer export-aus).

---

**Category:** Export  
**Title:** Light fixtures — Zielbild (Lighting-State)  
**Description:** **Primär:** Sichtbarkeit der **Fixture-Discs** = **`LightingSettings`** (Show fixtures) → Export **WYSIWYG** — kein separates Ausblenden beim Capture, sobald UI migriert ist → [`requirements-lighting.md`](./requirements-lighting.md) (Light fixtures — Sichtbarkeit UI). **Wireframe Light handles** nicht über Fixture-Export-Logik; siehe Viewport helpers. **Übergang (Ist-Code):** Block *Light fixtures — Hide in export* oben — `exportHideLightFixtures` blendet heute Disc **und** Wireframe nur beim Capture aus; **Ziel:** Checkbox entfernen oder auf **optionalen Export-Override** reduzieren („Hide fixtures in export“ nur wenn Viewport sie zeigt, File aber ohne Discs) — **nicht** Ersatz für Lighting **Show fixtures**.

---

**Category:** Export  
**Title:** Light fixtures — Hide in export (entfernt)  
**Description:** **Nicht mehr implementiert** (v1 Viewport helpers + Lighting Fixtures). Export-Sub-Panel **Lighting** / `exportHideLightFixtures` / `CaptureViewportImageOptions.hideLightFixtures` entfernt. Fixtures und Viewport helpers exportieren **WYSIWYG** → Abschnitte *Viewport helpers — WYSIWYG* und [`requirements-lighting.md`](./requirements-lighting.md) (*Fixtures — Panel section*).

---
