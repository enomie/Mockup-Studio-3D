# Environment — Sky, Fog, Ground

Hintergrund und Arbeitsfläche der Szene. UI-Platzierung → [`requirements-app-layout.md`](./requirements-app-layout.md) (scrollbare Side-Panels). Querschnitt → [`requirements-architecture.md`](./requirements-architecture.md).

**Bestand Code (Inventur):** `Skybox` + `setSkyColor`, `Fog` in `mockup-engine.ts`, `createGroundPlane()` — erweitern, nicht parallel neu bauen.

---

**Category:** Environment  
**Title:** Ein Panel — Sky, Reflections, Fog, Ground  
**Description:** **Kein separates Fog- oder Ground-Panel.** UI: **Right Main** Nav **Environment** → **Right Sub** `EnvironmentSubPanel` mit vier **`scene-entity-block`s** (Collapse + Eye): **Sky → Reflections → Fog → Ground**. Camera und Lighting = eigene Nav-Punkte. **Atmosphäre-Vorlagen** (Sky/Ground/Lighting gebündelt): **Left Environments** → [`requirements-environments.md`](./requirements-environments.md). **Vollständige Layouts** inkl. Assets: **Left Scenes** → [`requirements-scenes.md`](./requirements-scenes.md). Keine Preset-Chips im Ground-Body. Siehe [`requirements-app-layout.md`](./requirements-app-layout.md).

---

**Category:** Environment  
**Title:** Sky — Einstellungen  
**Description:** Skybox = vertikaler Farbverlauf (TSL/WebGPU). UI-Felder: **Horizon color**, **Zenith color**, **Horizon fade** — siehe Abschnitt Sky — Gradient. Sky rendert in eigener Pass-Szene. Kein Placement — Sky folgt Kamera. Änderungen → Store → Scene-API.

---

**Category:** Environment  
**Title:** Fog — Einstellungen  
**Description:** Three.js `Fog` (linear) — **eigener `scene-entity-block` „Fog"** im Environment-Sub-Panel. Felder: **Fog Color** (`ColorPicker`), **Near + Far** als **Doppelschieberegler + Textinputs** (`DualRangeSlider` — [`requirements-range-slider.md`](./requirements-range-slider.md)): zwei Handles, darunter **Near/Far in Metern** mit **3 Nachkommastellen**. Default Color **blaugrau** (`#A8C7DB`), Near **25 m**, Far **100 m**. **Enabled** (`fogEnabled`): Eye am Block-Header — aus = `scene.fog = null`. Engine: `setFogEnabled`, `setFogColor`, `setFogDistances` via Scene-API.

---

**Category:** Environment  
**Title:** Environment Sub-Panel — Sektionen  
**Description:** Right Sub bei Nav **Environment**: scrollbarer Inhalt in **vier `scene-entity-block`s** (Collapse + Eye, wie Lighting): (1) **Sky** — Horizon/Zenith/Fade; (2) **Reflections** — Intensity (Eye = `reflectionEnabled`, kein Enable-Checkbox im Body); (3) **Fog** — Fog color + Entfernungen; (4) **Ground** — Boden-Einstellungen (s. unten + [`requirements-ground.md`](./requirements-ground.md)). Komponente: `SceneEntityBlock`. Body-Controls **disabled** wenn Eye aus.

```
┌ Environment ─────────────────────┐
│ ▼ Sky                        👁  │
│   Horizon color  [■] #A8C7DB      │
│   Zenith color   [■] #1F61B8      │
│   Horizon fade   ───●───  35 %    │
├───────────────────────────────────┤
│ ▼ Reflections                👁  │
│   Reflection intensity  ─●─  1.00   │
├───────────────────────────────────┤
│ ▼ Fog                        👁  │
│   Fog color      [■] #A8C7DB      │
│   Near / Far     ──●────●── 25–100│
├───────────────────────────────────┤
│ ▼ Ground                     👁  │
│   Color          [■] #E8E8E8      │
│   ▸ Material …                    │
└───────────────────────────────────┘
```

---

**Category:** Environment  
**Title:** Ground — Einstellungen (Sektion)  
**Description:** **`scene-entity-block` „Ground"** im Environment-Sub-Panel (kein eigener Right-Main-Nav). Boden = große Plane (`GROUND_PLANE_SIZE`), **fixed** — kein Gizmo-Placement (Ausnahme in [`requirements-scene-placement.md`](./requirements-scene-placement.md)). UI: **Visible** (Eye), **Material** (Materials-Library-Dropdown), **Receive shadows**, **Mirror floor** + Opacity. Procedural-Muster am Boden meter-konsistent → [`requirements-ground.md`](./requirements-ground.md) (Procedural tiling).

---

**Category:** Environment  
**Title:** Engine & Scene-API  
**Description:** Logik in `src/render/` + Engine (`skybox.ts`, `ground-plane.ts`, Fog in Scene). API: `setSkyEnabled`, `setSkyHorizonColor`, `setSkyZenithColor`, `setSkyGradientFade`, `setFogEnabled`, `setFogColor`, `setFogDistances`, `setReflectionEnabled`, `setReflectionIntensity`, `applyGround` / `setGround*` — kein Three in UI. `EnvironmentState`: `skyEnabled`, `fogEnabled`, `reflectionEnabled`.

---

**Category:** Environment  
**Title:** Serialisierung  
**Description:** Sky-, Fog-, Reflection- und Ground-Parameter sind Teil von **Scene Save** / `SceneSnapshot` — nicht nur UI-State. Werte als konkrete Parameter speichern, nicht als Preset-IDs.

---

**Category:** Environment  
**Title:** Ground — Detail-Requirements  
**Description:** **Vollständige** Ground-Spezifikation (Color Picker, Bild von Images, Mapping Stretch/Tile/Cover, Repeat, + New image): [`requirements-ground.md`](./requirements-ground.md). UI-Platzierung: Sektion im Environment-Sub-Panel.

---

**Category:** Environment  
**Title:** Sky — Gradient (2 Farben + Fade)  
**Description:** Skybox = **vertikaler Farbverlauf** (TSL/WebGPU), keine flache Einzelfarbe mehr. Parameter: **`skyEnabled`** (Eye — aus = kein Sky-Pass), **`skyHorizonColor`** (Horizont + Nadir/unter uns), **`skyZenithColor`** (Zenith über uns), **`skyGradientFade`** (0–1). **Fade** = wie weit die Horizontfarbe nach oben reicht, bevor Zenith dominiert: **0** = Horizontfarbe fast bis zum Zenith; **1** = Übergang knapp über dem Horizont, Zenith dominiert schnell. Sky rendert in eigener Pass-Szene (ohne Fog), folgt Kamera. Uniform-Updates live via `createRgbUniform` / `uniform(float)`.

---

**Category:** Environment  
**Title:** Sky — UI (Gradient)  
**Description:** Environment-Sub-Panel, Sektion **Sky**: **Horizon color** + **Zenith color** (`ColorPicker` je), **Gradient fade** (`RangeSlider`, 0–1, Step 0.01). Store → `setSkyHorizonColor`, `setSkyZenithColor`, `setSkyGradientFade` → Scene-API → Engine.

---

**Category:** Environment  
**Title:** Sky — Engine-API (Gradient)  
**Description:** Scene-API: `setSkyHorizonColor(rgb)`, `setSkyZenithColor(rgb)`, `setSkyGradientFade(fade)`; Batch in `applyEnvironment` / `EnvironmentState`. Ersetzt `setSkyColor`. Implementierung: `SkyboxMaterial` (Gradient), `Skybox.setSkyState(...)`, `EnvironmentSystem`.

---

**Category:** Environment  
**Title:** Sky — Defaults (`SCENE_DEFAULTS`)  
**Description:** Single Source: `src/config/scene-defaults.ts`. **Horizon color** `#A8C7DB` (blaugrau, gleich Fog), **Zenith color** `#1F61B8`, **Horizon fade** `0.35` (intern 0–1). Fog: `#A8C7DB`, Near **25 m**, Far **100 m**.

---

**Category:** Environment  
**Title:** Sky — Render-Pipeline (Zwei-Pass)  
**Description:** `renderSceneFrame(..., skyEnabled)`: Bei `skyEnabled=true`: Pass 1 Sky-Scene mit `autoClear=true`; Pass 2 Main-Scene mit **`autoClear=false`**, nur `clearDepth()` — Sky-Pixel bleiben erhalten. Bei `skyEnabled=false`: nur Main-Pass mit `autoClear=true`. `WebGPURenderer({ alpha: false })` — kein transparentes Canvas (sonst CSS-Grau `#f0f0f0` durchscheint). Siehe Diary.

---

**Category:** Environment  
**Title:** Sky — Material & Uniforms  
**Description:** `SkyboxMaterial`: `MeshBasicNodeMaterial`, `lights=false`, `fog=false`, `BackSide`, `depthWrite=false`. Gradient: `mix(uHorizon, uZenith, smoothstep(horizonEnd, 1, y))` mit `y = max(normalize(positionLocal).y, 0)`. **Horizon fade** live via `createFloatUniform` + Arithmetik `horizonEnd = 0.9 - fade * 0.85` — **nicht** `mix(float, float, uniform)` (wird beim Compile eingefroren). Farben via `createRgbUniform` (`Vector3`).

---

**Category:** Environment  
**Title:** Sky — UI (Horizon fade, aktualisiert)  
**Description:** Sektion **Sky**: **Horizon color**, **Zenith color** (`ColorPicker`), **Horizon fade** (`RangeSlider`). Slider-Label **Horizon fade**; Wertzeile: Label **Fade** + Input in **Prozent** (0–100, Anzeige `35` + `%`) — intern `skyGradientFade` 0–1. Layout: gemeinsame Property-Zeilen → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md) (`panel-field-*`). Store → `setSkyGradientFade` → Scene-API.

---

**Category:** Environment  
**Title:** Reflections — Sky als IBL-Quelle  
**Description:** Der Sky-Gradient speist **IBL** (`scene.environment` via PMREM) für PBR-Reflexionen auf Ground und späteren Meshes. UI: **Reflection intensity** im Environment-Panel — vollständig [`requirements-reflections.md`](./requirements-reflections.md). Sky-Pass (sichtbarer Himmel) bleibt unverändert; PMREM wird bei Sky-Änderung neu gebaut.

---

**Category:** Environment  
**Title:** Viewport helpers — Abgrenzung  
**Description:** **Viewport helpers** = optionale **Referenz-Overlays** in der Main Scene (Maßstab, Orientierung, leichte Placement-Chrome) — **kein** Mockup-Produkt, **kein** Licht-Setup. **Nicht** Viewport helpers: **Light fixtures** (emissive Softbox-Discs) → [`requirements-lighting.md`](./requirements-lighting.md) (Szene-Inhalt / Studio-Look). **Nicht** Viewport helpers: **Transform-Gizmo**, **Selection-Outline**, **Physics rigid-test**-Mesh — reines **Editor-Chrome** (Export immer aus, unabhängig von dieser Sektion). Pick-Sphere am Licht-Rig bleibt unsichtbar (Authoring).

---

**Category:** Environment  
**Title:** Viewport helpers — Panel-Platzierung (UI)  
**Description:** **Right Main → Environment → Right Sub** (`EnvironmentSubPanel`): **fünfte Sektion** **unter** dem `scene-entity-block` **Ground** (nach Sky, Reflections, Fog, Ground). **Kein** Eye/Collapse-Header wie bei Sky/Ground — flache **`SubPanelSection`** mit Titel **Viewport helpers** und **`PanelCheckbox`**-Zeilen (Labels + Checkboxen, optional muted Hint). Styling → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md). **Light fixtures** und Fixture-Sichtbarkeit **nicht** in dieser Sektion.

---

**Category:** Environment  
**Title:** Viewport helpers — Floor grid (v1)  
**Description:** Klassisches **Editor-Boden-Grid** auf der Welt-Ebene **y = 0** (Minor/Major-Linien, meter-konsistent zur Szene). **Unabhängig** vom Ground-**Material** (Grid-Paper am Boden ≠ dieses Overlay). v1: Toggle **Floor grid** (an/aus) only — keine UI für Farbe, Einheit oder Extent (Defaults in Engine/`constants`). Grid rendert in der **Main Scene** (nicht Sky-Pass). **Sichtbarkeit vs. Ground Eye:** Grid kann sichtbar sein, wenn Ground **Visible** aus ist (Default **ja** — Orientierung bleibt); Verhalten bei Implementierung testen und ggf. Hint im Panel.

---

**Category:** Environment  
**Title:** Viewport helpers — World origin (v1)  
**Description:** **World origin** = RGB-Achsen am Weltursprung `(0, 0, 0)` (X/Y/Z, feste Länge in Metern, v1 Konstante). Toggle **World origin**. Kein Placement — fix am Ursprung.

---

**Category:** Environment  
**Title:** Viewport helpers — Light handles (v1)  
**Description:** **Light handles** = sichtbares **Wireframe** am Key/Fill-Rig (`light-rig.ts` / `SelectionHighlight`) — Placement-Hilfe, **nicht** die emissive Fixture-Disc. Toggle **Light handles** (global für Studio Key + Fill). **Entkoppelt** von Key/Fill **Enabled** (Licht aus, Handles optional an = späteres Ziel; v1 mindestens eigener State, nicht nur `enabled`). Fixture-Discs bleiben unter Lighting → [`requirements-lighting.md`](./requirements-lighting.md).

---

**Category:** Environment  
**Title:** Viewport helpers — Export  
**Description:** Wenn ein Viewport-Helper-Toggle **an** ist, erscheint das Overlay im **Viewport und im Bild-Export** (PNG/JPG) — **WYSIWYG**, gleiche Render-Pipeline wie Live (`requirements-export.md`). Wenn **aus**, nicht im Export. **Ausnahme (immer export-aus):** Gizmo, Selection-Outline, Physics-Test-Würfel, unsichtbare Pick-Meshes — unabhängig von Viewport helpers.

---

**Category:** Environment  
**Title:** Viewport helpers — State & Serialisierung  
**Description:** Flags z. B. `viewportHelpers.floorGrid`, `viewportHelpers.worldOrigin`, `viewportHelpers.lightHandles`, `viewportHelpers.compassArrows` — Teil von **Scene Save** / `EnvironmentState` (oder eigenes Slice, in Snapshot serialisiert) — nicht nur Session-UI. **Left Environments**-Presets: Viewport helpers **nicht** mit anwenden (nur Sky/Ground/Lighting-Atmosphäre) — analog Fog/Reflection nicht in jedem Preset. Defaults: alle **aus** (clean Mockup-Start), außer Produkt entscheidet anders in `SCENE_DEFAULTS`.

---

**Category:** Environment  
**Title:** Viewport helpers — Rendering (see-through)  
**Description:** **Alle** Viewport helpers (Grid, Origin, Light handles, Forward arrow, spätere Overlays) nutzen ein **gemeinsames X-Ray-Styling**: leicht **durch andere Geometrie sichtbar** („ein bisschen hindurchsehen“), ohne das Mockup voll zu übermalen. **Normativ v1:** Materialien **`transparent: true`**, **`depthWrite: false`**, **`depthTest: false`** (Helper zeichnen über der Szene, bleiben bei Assets/Boden lesbar); **`toneMapped: false`** wo sinnvoll (konstante Lesbarkeit). **Opacity** fest in `constants` (z. B. **0.35–0.5** Linien/Flächen — ein Wert für alle Helpers, Feintuning später optional). **`renderOrder`** über Produkt-Meshes (z. B. ≥ `VIEWPORT_HELPER_RENDER_ORDER`). **Kein** Cast/Receive Shadow. **Gizmo** und **Selection-Outline** folgen **nicht** diesem Profil (Editor-Chrome, eigenes Verhalten). Implementierung: zentral z. B. `viewport-helpers-layer.ts` / shared Node- oder Line-Material — kein Copy-Paste pro Helper.

---

**Category:** Environment  
**Title:** Viewport helpers — Forward arrow (toward lights)  
**Description:** **Forward arrow** = dekorativer **Richtungspfeil auf der Bodenebene** (**y = 0**), der **„vorne“** markiert — **vorne = Lichtseite** (Studio-Key/Fill-Bank), nicht Kamera-Forward. UI: Checkbox **Forward arrow** in Sektion **Viewport helpers**. **Anker:** gleicher horizontale Bezugspunkt wie Studio-Licht (`computeSceneCenter` / Focal-Asset bzw. Weltursprung wenn leer) — bei **Follow scene center** mit dem Objekt mitwandern; bei **World fixed** am Weltursprung (0,0,0) oder festem Stage-Pivot — **gleiche Regel wie `LightingSystem`** für Center, dokumentiert in [`requirements-lighting.md`](./requirements-lighting.md) (Querverweis). **Richtung (XZ, normiert):** von Anker **horizontal** zum **Key**-Rig (`rig.helper.position`, Y auf 0 projiziert). Key **disabled:** Fallback **Fill**-Rig; beide off: Pfeil **aus** oder letzte Richtung **frozen** (Implementierung: prefer **aus** wenn keine enabled Studio-Spot). **Key side** Left/Right dreht den Pfeil mit (Azimuth ±45°). **Geometrie v1:** klarer Pfeil (Schaft + Spitze), **leicht über dem Boden** (z. B. 1–2 mm Y-Offset gegen Z-Fighting), Länge in Metern Konstante (z. B. 0,8–1,2 m), **schöne** klare Silhouette (kein roher Debug-Cone). Farbe v1: neutrales Hellgrau oder dezentes Akzent (Konstante), **see-through** → Abschnitt *Rendering (see-through)*. **Export:** WYSIWYG wenn Checkbox an.

---

**Category:** Environment  
**Title:** Viewport helpers — Forward arrow (UI)  
**Description:** Checkbox-Label **Forward arrow**; optional muted Hint eine Zeile: *Points toward the key light on the ground plane.* Kein Slider v1. Reihenfolge in der Sektion (Vorschlag): Floor grid → World origin → Forward arrow → Light handles.

---

**Category:** Environment  
**Title:** Viewport helpers — Forward arrow (+Z, implementiert)  
**Description:** **Forward arrow** zeigt fest in **Welt +Z** (gleiche Richtung wie die **blaue** Achse bei **World origin**) — **nicht** zum Key-/Fill-Rig. Anker = Scene center wie World-origin-Hilfe (`lighting.getReferenceCenter()`). Geometrie entlang lokaler +Z; `rotation.y = 0`. **Silhouette:** gefüllter **Block-Pfeil** (rechteckiger Schaft + dreieckige Spitze, Draufsicht), Farbe **+Z-Blau** wie Origin-Achse, X-Ray wie andere Viewport helpers. UI-Hint im Environment-Panel entsprechend.

---

**Category:** Environment  
**Title:** Viewport helpers — Spot beams (implementiert)  
**Description:** UI-Label **Spot beams**; Store-Flag bleibt `viewportHelpers.lightHandles`. Zeigt für Key/Fill je einen Three.js **`SpotLightHelper`** (`rig.light` + Target) — **Richtung und harter Kegel** (`light.angle`), **keine** Penumbra-Linien, **kein** Ikosaeder-Wireframe mehr. Feste **Anzeigelänge 8 m** (`VIEWPORT_SPOT_BEAM_DISPLAY_DISTANCE_M`) nach `SpotLightHelper.update()`. WebGPU: `LineBasicNodeMaterial` via `upgradeGizmoMaterialsToWebGPU`, X-Ray wie andere Viewport helpers. Sichtbar wenn Toggle an **und** Rolle enabled. Selection erhöht Kegel-Opacity. Export WYSIWYG. Implementierung: [`light-rig.ts`](../../src/engine/lighting/light-rig.ts), [`spot-beam-display.ts`](../../src/engine/lighting/spot-beam-display.ts), [`lighting-system.ts`](../../src/engine/lighting/lighting-system.ts).

---

**Category:** Environment  
**Title:** Viewport helpers — Panel (scene-entity-block)  
**Description:** **Right Sub → Environment:** Sektion **Viewport helpers** als **fünfter** Eintrag im `panel-stack` — gleiche **`scene-entity-block`**-Shell wie Sky / Reflections / Fog / Ground (Chevron auf/zu, Eye im Header). **Keine** flache `SubPanelSection` mehr für diese Sektion. Inhalt: vier **`PanelCheckbox`**-Zeilen (Floor grid, World origin, Forward arrow, Spot beams) plus bestehende Hints. **Master-Auge:** Icon **offen**, sobald **mindestens ein** Helper-Toggle an ist; Klick → **alle vier** aus. Wenn **alle** aus: Auge **zu**; Klick → **alle vier** an. Einzel-Checkboxen unverändert (Teilauswahl möglich). Store: `toggleViewportHelpersAll` / `setViewportHelpersAllEnabled`; kein zusätzliches Serialisierungsfeld.

---

**Category:** Environment  
**Title:** Viewport helpers — keine Panel-Hints (UI)  
**Description:** Sektion **Viewport helpers** zeigt nur **Checkbox-Labels** — **keine** `panel-hint`-Zeilen unter Forward arrow / Spot beams. Erklärtexte (z. B. +Z vs. blaue Origin-Achse, Spot-Kegel 8 m) → [`requirements-tips-and-tricks.md`](./requirements-tips-and-tricks.md).

---
