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
