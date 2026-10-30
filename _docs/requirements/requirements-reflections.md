# Reflections — IBL & Planar Mirror

Spiegelungen und Umgebungsreflexionen für photorealistische Mockups. Bezüge: [`requirements-environment.md`](./requirements-environment.md) (Sky), [`requirements-ground.md`](./requirements-ground.md) (Roughness/Metalness), [`requirements-lighting.md`](./requirements-lighting.md), [`requirements-code.md`](./requirements-code.md) (WebGPU/TSL).

**Bestand (Inventur):** IBL via `EnvironmentReflectionMap` (`src/render/environment-map.ts`) → `scene.environment`. Quelle `reflectionSource`: **`studio`** (Default; three.js `RoomEnvironment`, einmal per PMREM gebacken) oder **`sky`** (PMREM aus `SkyboxMaterial`, Neuaufbau bei Himmel-Änderung). UI: Environment → Reflections → **Source**. Plan: [`plan-studio-reflections.md`](../planning/plan-studio-reflections.md). Planar Mirror via TSL `reflector()` in `src/render/planar-reflection.ts`, Mix in `GroundMaterial.setupOutput`. Sky = separater unlit Pass (`SkyboxMaterial`).

**Status:** Phase A + B + C implementiert (IBL, Reflection Intensity, Planar Mirror). Phase D (HDRI) offen.

**Phasen:**

| Phase | Feature | Priorität |
|---|---|---|
| **A** | IBL aus Sky (Environment Map) | **v1 Reflections** |
| **B** | Reflection Intensity UI | mit Phase A |
| **C** | Planar Mirror (Szene im Boden) | **v2 Reflections** |
| **D** | HDRI-Environment | später |

---

**Category:** Reflections  
**Title:** Ziel & Abgrenzung  
**Description:** Mockups brauchen **glaubwürdige Reflexionen** auf glänzenden Böden und Materialien — nicht nur Schatten. **Roughness/Metalness** (Ground Panel) steuern *wie* reflektiert wird; dieses Doc definiert *was* reflektiert wird. **Kein SSR** in v1/v2 (Screen Space Reflections — Artefakte, WebGPU-Pfad unsicher). **Kein WebGL-Fallback.**

---

**Category:** Reflections  
**Title:** Phase A — IBL aus Sky (Environment Map)  
**Description:** Der bestehende **Sky-Gradient** (`SkyboxMaterial`: Horizon + Zenith + Fade) wird zur **Environment Map** für die Hauptszene konvertiert und als **`scene.environment`** (WebGPU PMREM) gesetzt. Alle `MeshStandardNodeMaterial`-Meshes (Ground, später Entities) nutzen IBL automatisch: **niedrige Roughness** = schärfere Himmelsreflexion, **hohe Metalness** = stärkere Spiegelung. Sky-Pass bleibt separat (unlit, eigene Scene) — IBL ist eine **abgeleitete** Cubemap, kein Ersatz für den sichtbaren Himmel. **Update-Trigger:** bei Änderung von `skyHorizonColor`, `skyZenithColor`, `skyGradientFade` — PMREM neu generieren (debounced, nicht pro Frame).

---

**Category:** Reflections  
**Title:** Phase A — Engine  
**Description:** Neues Modul `src/render/environment-map.ts` (o. ä.): `SkyEnvironmentMap` oder Funktion `updateSceneEnvironment(renderer, scene, skyState)`. Ablauf: (1) temporäre Scene/Camera mit Sky-Material oder Render-Target vom Gradient, (2) `PMREMGenerator` (WebGPU), (3) `scene.environment` setzen, (4) alte Texture disposen. Integration in `EnvironmentSystem` — bei Sky-Änderung `rebuildEnvironmentMap()`. **Kein Three in UI.** Scene-API: Teil von `applyEnvironment` / `setSky*` — UI merkt PMREM nicht. Fog bleibt auf Main-Scene; Sky-Pass ohne Fog (bestehend).

---

**Category:** Reflections  
**Title:** Phase B — Reflection Intensity (UI)  
**Description:** Environment-Sub-Panel, Sektion **Reflections** (unter Sky oder eigene Mini-Section): **Reflection intensity** — `RangeSlider` + Input, Range **0–2**, Step **0.001**, **3 Dezimalen** — mappt auf `scene.environmentIntensity` (Three.js). Default **0.850**. **Enabled** Toggle (optional v1): Intensity 0 = IBL aus, Material nur direktes Licht. Store → `setReflectionIntensity(value)` → Scene-API. Label Track: **Reflection intensity**; Input-Label: **Intensity**.

---

**Category:** Reflections  
**Title:** Phase B — Scene-API & State  
**Description:** Erweiterung `EnvironmentState` / eigenes `ReflectionSettings`:

```ts
type ReflectionSettings = {
  enabled: boolean;       // IBL an/aus — default true
  intensity: number;      // scene.environmentIntensity — default 0.85
};
```

Methoden: `setReflectionIntensity`, `setReflectionEnabled`, Batch in `applyEnvironment`. Serialisierung in Scene Save mit Environment-Block.

---

**Category:** Reflections  
**Title:** Zusammenspiel Ground PBR ↔ IBL  
**Description:** Ground Panel **Roughness / Metalness** bleiben die primären Material-Regler — keine Duplikate. **Matt** (Roughness ~0.9): IBL kaum sichtbar. **Glossy** (Roughness ~0.05–0.2): Himmel/Farben deutlich im Boden. **Metalness** verstärkt reflektierenden Charakter. Presets (White Studio, Dark Stage, …) können Roughness so setzen, dass IBL-Effekt sofort sichtbar ist. **Emissive** unabhängig von Reflexionen.

---

**Category:** Reflections  
**Title:** Phase C — Planar Mirror (Spiegelboden)  
**Description:** **Optional** pro Szene/Ground: Objekte und Flyer **scharf** im Boden gespiegelt — klassischer Produktfoto-Look. Technik: **Planar Reflection** — zweiter Render-Pass mit an der Ground-Plane (`y = 0`) gespiegelter Kamera; Ergebnis als **Textur** auf Ground (oder Blend mit PBR). Unabhängig von IBL — beide können kombiniert werden (IBL = weiche Umgebung, Planar = scharfe Objektspiegelung). **Nur Main-Scene** — Sky nicht im Spiegelpass (oder bewusst ausblenden). Clipping: nur Geometrie oberhalb der Plane.

---

**Category:** Reflections  
**Title:** Phase C — Ground UI  
**Description:** Ground-Sub-Panel, Section **Reflections** (unter Material): Toggle **Mirror floor** (on/off). Wenn an: **Mirror opacity** — `RangeSlider` + Input, **0–1**, Step **0.001**, **3 Dezimalen** — mischt Planar-Reflection in Boden-Material (Default **1.000** bei Mirror an). **Roughness** dimmt weiterhin Schärfe der kombinierten Reflexion (sehr rau = Mirror kaum sichtbar). Kein separater „Glossy"-Button — Roughness + Mirror Toggle reichen.

---

**Category:** Reflections  
**Title:** Phase C — Engine & Scene-API  
**Description:** `src/render/planar-reflection.ts` — gekapselt: `PlanarReflectionPass` mit `render(renderer, scene, camera, groundPlane)`, `getTexture()`, `dispose()`. `GroundSettings` erweitern:

```ts
mirrorEnabled: boolean;   // default false
mirrorOpacity: number;    // 0–1, default 1
```

`setGround({ mirrorEnabled, mirrorOpacity })` — Store → Scene-API. Render-Pipeline: nach Main-Scene oder als Ground-Material-Input (TSL `texture()` × `mirrorOpacity`). Performance: ein Extra-Pass nur wenn `mirrorEnabled === true`.

---

**Category:** Reflections  
**Title:** Phase D — HDRI (später, nicht v1/v2)  
**Description:** Statt Gradient-Sky als IBL-Quelle: **HDRI-Asset** (equirectangular) — Studio, Softbox, Outdoor. UI: Environment → **Environment source**: Sky Gradient | HDRI | Custom Upload. HDRI ersetzt PMREM aus Sky für `scene.environment`; sichtbarer Sky kann Gradient bleiben oder HDRI-Background. Built-in HDRIs (App-Presets). Nicht in Phase A/C implementieren — nur Architektur offen halten (`EnvironmentSource` enum).

---

**Category:** Reflections  
**Title:** Fog & Reflexionen  
**Description:** **Fog** (`scene.fog`) betrifft Main-Scene-Objekte — IBL-Reflexionen zeigen den **unvernebelten** Himmel (physikalisch üblich für Environment). Planar Mirror: gespiegelte Objekte **mit Fog** rendern (konsistent mit Original). Bei Export gleiches Verhalten. Kein „Fog auf Environment Map" in v1.

---

**Category:** Reflections  
**Title:** Performance & Qualität  
**Description:** PMREM-Größe: Start **256** oder **512** — bei Sky-Edit neu bauen, nicht pro Frame. Planar Mirror: RT-Edge max **`PLANAR_REFLECTION_MAX_SIZE` (1024)**, `resolutionScale` vom Viewport; **Mipmaps** auf der Mirror-RT (`PLANAR_REFLECTION_GENERATE_MIPMAPS`, Default an) — weniger Aliasing bei flachen Blickwinkeln, kleiner GPU-Overhead pro Mirror-Frame. Pass nur aktiv wenn **Mirror floor** an. Debounce Sky → PMREM **~100 ms** nach letztem ColorPicker-/Slider-Event. Dispose alter Texturen bei Rebuild. Mobile: gleiche Pipeline, ggf. niedrigere PMREM-Auflösung (später Quality-Tier).

---

**Category:** Reflections  
**Title:** Serialisierung  
**Description:** `reflection.enabled`, `reflection.intensity` im Environment-Block; `ground.mirrorEnabled`, `ground.mirrorOpacity` im Ground-Block (Scene Save). Keine PMREM-/Mirror-Texturen persistieren — Runtime-Rebuild beim Laden.

---

**Category:** Reflections  
**Title:** Panel — Wireframe (geplant)  
**Description:**  
```text
Environment Sub-Panel — Section Reflections:
│ Reflection intensity              │
│ [========●=============]          │
│ Intensity              [1.000]    │
│ [x] Enable reflections            │

Ground Sub-Panel — Section Reflections (Phase C):
│ Mirror floor                 [ ] │
│ Mirror opacity                    │
│ [====================●]         │
│ Opacity                [1.000]    │
```

---

**Category:** Reflections  
**Title:** Implementierungsreihenfolge  
**Description:**  
1. **Phase A** — PMREM aus Sky, `scene.environment`, Ground Roughness testen (glossy Preset).  
2. **Phase B** — Intensity Slider im Environment-Panel.  
3. **Phase C** — Planar Mirror Pass + Ground Toggle.  
4. **Phase D** — Requirements ergänzen wenn HDRI ansteht.

Kein Feature-Code vor User-Freigabe nach diesem Doc.

---

**Category:** Reflections  
**Title:** Light fixtures ↔ Reflections (v0)  
**Description:** Key/Fill-**Fixture-Discs** (emissive Kreise) → [`requirements-lighting.md`](./requirements-lighting.md) (Light fixtures v0). **Planar Mirror (Phase C):** Pass rendert die **Main Scene** — Discs erscheinen im Boden als **runde helle Reflexe**, sofern Mirror an und Sichtbarkeit/Stärke aus `mirrorOpacity`, Ground-Material-Roughness und Disc-Emissive passen. **IBL (Phase A/B):** `SkyEnvironmentMap` baut `scene.environment` **nur aus dem Sky-Gradienten** — Discs fließen **nicht** in PMREM ein; Specular/Reflection auf **Assets** zeigt v0 dort **Himmel**, keine Softbox-Formen (Studio-IBL oder HDRI = später). **Kombination:** IBL + Planar Mirror + Discs können gleichzeitig aktiv sein — unterschiedliche Quellen (Sky vs. gespiegelte Szene vs. sichtbare Fixture-Geometrie).

---
