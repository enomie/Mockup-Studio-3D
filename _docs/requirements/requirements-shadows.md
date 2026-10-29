# Scene Shadows

Schatten in der **3D-Szene** (nicht UI-Chrome). Ziel: **photorealistische, weiche, stabile Schatten** — inkl. **Kontaktschatten im Millimeter-Bereich** (Rahmen → Print, Mattenfalz, Screen-Inset, dünne Kanten auf dem Boden). Mockups leben von glaubwürdigem Licht und Schatten auf der Arbeitsfläche.

Bezüge: [`requirements-lighting.md`](./requirements-lighting.md) (Lichtquellen, Rig), [`requirements-assets.md`](./requirements-assets.md) (Asset-Meshes), [`requirements-ground.md`](./requirements-ground.md) (Boden empfängt), [`requirements-code.md`](./requirements-code.md) (WebGPU/Three), [`requirements-architecture.md`](./requirements-architecture.md) (offene Querschnittsfragen).

**Bestand (Inventur):** `src/render/shadow-setup.ts`, `src/render/scene-shadow-coverage.ts`, Konstanten in `src/constants.ts`, Key+Fill-Spot-Shadow in `src/engine/lighting/light-rig.ts` + `lighting-system.ts` (`updateFrame`, `pushExportShadowQuality` / `popExportShadowQuality`, Solo-Caster-Logik in `applyFill`), Capture in `src/engine/mockup-engine-capture.ts`, Asset-Flags in `src/engine/asset-meshes.ts` (`applyAssetShadowFlags`).

**Status:** v1 **implementiert** — Key+Fill Spot, Cast-Checkbox + **Softness pro Rolle** (`key.shadowSoftness` / `fill.shadowSoftness`), PCF **4096²** Viewport / **8192²** Bild-Export-Capture, Spot-Coverage **adaptiv** (Entity-AABB, Cap **5 m**), Asset `shadowSide = DoubleSide`, Ground nur receive, Glazing nur receive. **Bias:** `SHADOW_DEPTH_BIAS` / `SHADOW_NORMAL_BIAS` = **0** (Boden-Kontakt). **Weinflasche-Glas:** `customDepthMaterial` (`MeshDepthMaterial`, FrontSide) — Shadow-Silhouette aus Geometrie, nicht Transmission-Shader. **Offen:** Shadow-Settings in Scene Save, v2 Multi-Caster-Tuning.

---

**Category:** Shadows  
**Title:** Projektziel — Hochqualitative Schatten (Pflicht)  
**Description:** Mockups brauchen **realistische, weiche, stabile Schatten** — kein „Flat-3D". Schatten sind **Pflicht**, nicht optional. Qualitätsmaßstab: Produktfotografie / Studio-Mockup — Objekte **stehen** auf dem Boden, Rahmen **werfen** sichtbare Schatten auf Prints und Screens, feine Geometrie (mm) bleibt lesbar. **Alles wirft auf alles** (cast + receive), soweit unten keine Ausnahme gilt.

---

**Category:** Shadows  
**Title:** Millimeter-Bereich — Kontaktschatten  
**Description:** Viele Mockup-Details liegen im **mm-Bereich** (Welt-Einheiten ≈ Meter; typische Tiefen: 1–5 mm = `0.001`–`0.005`):

| Detail | Typische Tiefe | Schatten-Anforderung |
|---|---|---|
| Picture: Rahmen auf Print/Screen | 2–8 mm | Harte Konturkante, kein „Schweben" |
| Print: Papierkante auf Unterlage | 1–3 mm | Sichtbarer Kontaktschatten |
| Gerät auf Boden | Kontaktfläche | Weicher Übergang Boden ↔ Produkt |
| Dünne Lippen / Fasen | &lt; 2 mm | Nicht von Bias verschluckt |

**Kernregel:** `shadow.normalBias` **niedrig** halten — Referenz `SHADOW_NORMAL_BIAS = 0` (Boden-Kontakt); nur bei Acne auf Prints minimal erhöhen. Höhere Werte (z. B. `0.025` = 25 mm) unterdrücken Kontaktschatten auf nah liegenden Flächen. `shadow.bias` = `SHADOW_DEPTH_BIAS` (`0`) — **nicht** negativ setzen (Peter Panning am Boden).

**Akzeptanz (visuell):** Bei Standard-Studio-Pose (Key links, 45°) muss ein gerahmtes Bild einen **erkennbaren Schatten** des Rahmens auf der Print-/Screen-Fläche zeigen; Bodenkontakt des Assets ohne sichtbare Lücke.

---

**Category:** Shadows  
**Title:** Mesh-Schatten — Cast & Receive  
**Description:** Zwei getrennte Three.js-Flags pro Mesh:

| Flag | Bedeutung | Default (Szene) |
|---|---|---|
| `castShadow` | Mesh wirft Schatten auf andere | `true` |
| `receiveShadow` | Mesh empfängt Schatten von Lichtern | `true` |

**Alles empfängt:** Jedes Szenen-Mesh `receiveShadow = true` — Print-Faces, Picture-Screen, Rahmen, Boden, zukünftige Geräte; **nicht** nur Picture-Frames.

**Alles wirft:** Zusätzlich `castShadow = true` — Objekte beschatten einander gegenseitig.

**Ausnahmen:**

| Objekt | cast | receive | Grund |
|---|---|---|---|
| Skybox / Hintergrund | nein | nein | Kein Shadow-Teilnehmer |
| Editor-Helper (Gizmo, Light-Wireframe) | nein | nein | Nicht Teil der Mockup-Szene |
| Glazing (dünnes Glas) | **nein** | **ja** | Dünn → Artefakte; empfängt Schatten von anderen |
| Ground | **nein** | **User-Toggle** (default on) | Große Plane nur empfangen — kein cast (VSM/self-shadow-Banding) |

**Helper (Engine):** `applyReceiveShadowFlags`, `applyFullShadowFlags`, `applyAssetShadowFlags` in `src/render/shadow-setup.ts`. Assets: **`applyAssetShadowFlags(group)` nach jedem Mesh-Rebuild** (`populateAssetGroup`, Geometrie-Wechsel, `sizeScale`, Bild-Swap).

**Dünne Meshes / Unterseiten:** Default Shadow-Pass rendert nur BackFaces (`FrontSide`-Material). Einseitige Planes (Screen, Print) werfen sonst nur aus einer Lichtrichtung Schatten. **Asset-Policy:** `material.shadowSide = DoubleSide` für alle castenden Asset-Meshes (nicht Glazing) — sichtbar bleibt einseitig, Shadow-Pass beidseitig.

---

**Category:** Shadows  
**Title:** Licht-Schatten — Wer wirft?  
**Description:** Nur Lichter mit `castShadow = true` erzeugen **Shadow Maps**. Unabhängig von Mesh-Flags — ohne aktives Shadow-Casting-Light keine dynamischen Schatten.

**v1 (Studio-Rig):**

| Licht | castShadow | Rolle |
|---|---|---|
| **Key** (SpotLight) | Checkbox, Default **on** | Hauptschatten |
| **Fill** (SpotLight) | Checkbox, Default **on** | Zweiter Caster / Aufhell-Schatten |
| **Ambient** | nein | Globales Fill, kein Schatten |

UI: **Cast shadows** Checkbox in Key- und Fill-Block (`LightingSubPanel`). `LightingSettings.key.castShadow` / `fill.castShadow` in Store/Serialisierung. Effektiv nur wenn Licht `enabled` und Checkbox an. v1 Studio: max. **2** Caster (Key + Fill).

**Fill + Cast shadows:** Wenn Fill `castShadow` aktiv hat, Engine setzt `decay = 0` (wie Key) — Schattenstärke skaliert mit Lichtbeitrag; `decay=1.5` auf Studio-Distanz (~8 m) würde Fill-Schatten praktisch unsichtbar machen (auch bei gleichzeitigem Key). Ohne Cast shadows: Fill behält `decay = 1.5`.

**Three.js (normal):** Pro Licht mit `castShadow` eine **eigene Shadow Map** (Depth-Pass), im Haupt-Shader pro Licht multipliziert — **kein** gemeinsamer Shadow-Pass für alle Lichter.

**Bild-Export:** [`requirements-export.md`](./requirements-export.md) — gleiche Cast/Receive und Licht-Setup; Capture **8192²** Shadow Maps (ein Frame), danach Restore Viewport **4096²**. Contact-shadows-only nutzt dieselbe lit-Pipeline.

**v2:** Extra-Lights optional `castShadow`; Engine prüft `LightPool.canEnableShadow()` — max. **2** gleichzeitige Shadow-Caster (`LIGHT_POOL_MAX_SHADOW_CASTERS`). Details → Abschnitt „Performance & Limits".

---

**Category:** Shadows  
**Title:** Renderer — WebGPU Shadow Mapping  
**Description:** Shadow Mapping nur über **WebGPURenderer** — kein WebGL-Fallback. Setup in `configureShadowRenderer` (Three.js **r186**):

- `renderer.highPrecision = true` — präzisere Shadow-Matrizen
- `renderer.shadowMap.enabled = true`
- `renderer.shadowMap.type = PCFShadowMap` — r186: Vogel-Disk + IGN (ersetzt PCFSoft)
- **Nicht** `VSMShadowMap` für Studio-Boden — VSM lässt **Receiver casten** → Streifen auf großer Ground-Plane; Ground nur `receiveShadow`

**Nicht:** WebGL-Shadow-Beispiele 1:1 kopieren — WebGPU-Pfad in Three prüfen.

---

**Category:** Shadows  
**Title:** Shadow-Map — Auflösung & Qualität  
**Description:**

| Kontext | Map-Größe | Begründung |
|---|---|---|
| **Viewport / Arbeit** | **4096×4096** | `SHADOW_MAP_SIZE = 4096` — mm-Kontaktschatten, kein Korn |
| **Bild-Export (Capture)** | **8192×8192** | `SHADOW_MAP_SIZE_EXPORT` — ein Frame, weniger Texelgitter in weichen Schatten (Boden + Assets); danach Restore → [`requirements-export.md`](./requirements-export.md) |
| **Minimum** | **2048×2048** | Darunter körnig, unprofessionell — nicht unter 2048 fallen |

**Typische Fehler:** 512/1024 Maps → sichtbare Pixelierung an Schattenkanten. Shadow-Frustum zu groß → effektiv niedrige Auflösung trotz 4096².

**Weichheit:** Spot **Penumbra** Key `0.9` (Studio-Rig) — weicher Lichtkegel. PCF-Filter: `shadowSoftness` **pro Key/Fill** (Default `4`, Slider 0–30 im jeweiligen Licht-Block). Key + Fill können beide Shadow Maps casten (max. 2 Caster).

---

**Category:** Shadows  
**Title:** Shadow Camera — Frustum & Fit  
**Description:** Shadow-Map-Auflösung gilt nur **innerhalb** des Shadow-Frustums. Frustum **eng** auf relevante Szene legen — nicht „ganze Welt".

**Reichweite:** Schatten nur **bis 5 m** um die Szenenmitte nötig — kein 44-m-Frustum. Konstanten: `SHADOW_CAMERA_HALF_EXTENT = 2.5` (Directional Ortho), `SHADOW_COVERAGE_RADIUS = 2.5` (Spot — **max.** 5 m Durchmesser am Target).

**Spot — adaptive Coverage (Viewport + Export):** `updateSpotShadowCamera` nutzt einen **effektiven** Radius `min(SHADOW_COVERAGE_RADIUS, max(SHADOW_COVERAGE_RADIUS_MIN, entity-AABB-Horizontalausdehnung + Padding))` um das Licht-Target (Szenenmitte / Reference Center) — mehr Texel pro Meter auf kompakten Mockups; Minimum **`SHADOW_COVERAGE_RADIUS_MIN`** (Default **1,25 m**), Padding **`SHADOW_COVERAGE_CONTENT_PADDING_M`**. Leere Szene → volles **2,5 m**-Cap. Code: `computeSceneShadowCoverageRadius` in `src/render/scene-shadow-coverage.ts`, Aufruf aus `LightingSystem.updateFrame`.

**Directional (Pool):** Ortho-Frustum ± `2.5 m`, `near = 0.1`, `far ≈ 7 m`. Target auf Szenenmitte.

**Spot (Key + Fill):** `updateSpotShadowCamera` pro Frame für jedes Licht mit `castShadow`: Distanz Licht→Target, **`shadow.focus`** aus `SHADOW_COVERAGE_RADIUS` (nicht `camera.fov` — wird von `updateMatrices` überschrieben), `near = 0.1`, `far = Distanz + 2 m`. Dann `shadow.updateMatrices(light)`.

**Spot-Rig:** Licht als **direktes Kind der Scene** (nicht nested unter Helper) — saubere Shadow-Matrizen. Helper nur für Pick/Gizmo; Position synced.

---

**Category:** Shadows  
**Title:** Bias & Artefakte  
**Description:** Shadow-Acne vs. Peter-Panning — bei mm-Mockups **Priorität: Kontaktschatten sichtbar**.

| Parameter | Referenzwert | Wirkung |
|---|---|---|
| `shadow.bias` | `SHADOW_DEPTH_BIAS` (`0`) | Depth-Offset — negativ → Peter Panning am Boden |
| `shadow.normalBias` | `SHADOW_NORMAL_BIAS` (`0`) | Verschiebung entlang Normalen — **niedrig** für Boden-Kontakt |
| `shadow.focus` (Spot) | dynamisch | `atan(COVERAGE_RADIUS / dist) / light.angle` — **nicht** `camera.fov` setzen |
| `shadow.radius` (PCF) | `key.shadowSoftness` / `fill.shadowSoftness` (Default `4`) | Vogel-Disk-Sample-Radius — Slider pro Licht-Block |

**Tuning-Reihenfolge:** (1) Frustum verkleinern, (2) `normalBias` minimal erhöhen nur bei Acne, (3) `bias` anpassen. **Nicht** `normalBias` auf cm-Skala anheben — tötet Rahmen→Print-Schatten.

**Peter-Panning (Boden):** Sichtbare Lücke Fuß ↔ Schatten — **`shadow.bias` nicht negativ**; `normalBias` nicht unnötig erhöhen. **Shadow-Acne:** Flimmern auf Flächen — minimal `normalBias` oder leicht positiver `bias`, Frustum optimieren.

---

**Category:** Shadows  
**Title:** Update-Pipeline (pro Frame)  
**Description:** Schatten müssen **aktuell** bleiben — statische Maps reichen nicht bei beweglichem Rig / Scene-Center-Follow.

1. `LightingSystem.updateFrame()` — einmal pro Render-Tick aus Render-Loop (nur **enabled** Rigs)
2. Spot-Shadow: `updateSpotShadowCamera` pro aktivem Caster nach Pose
3. Mesh-Flags: nach Asset-Rebuild `applyAssetShadowFlags`
4. Ground: `applyReceiveShadowFlags` bei Erstellung (kein cast); `receiveShadow` aus Ground-Store

**Bei Licht-Pose / Gizmo / Follow-scene-center:** Shadow-Matrizen **sofort** neu berechnen, nicht erst beim nächsten Export.

---

**Category:** Shadows  
**Title:** Mesh-Schatten vs. Licht-Schatten  
**Description:** Zwei Ebenen — nicht verwechseln:

| Konzept | Steuerung | Bedeutung |
|---|---|---|
| **Mesh** | `castShadow` / `receiveShadow` | Wer **kann** werfen/empfangen (Geometrie) |
| **Licht** | `light.castShadow` | Wer **tatsächlich** eine Shadow Map rendert |

Ohne Licht mit `castShadow = true` bleiben Mesh-Flags wirkungslos für dynamische Schatten. Mit aktivem Key- und/oder Fill-Spot: alle castenden Meshes erscheinen in der jeweiligen Map; alle empfangenden zeigen das kombinierte Ergebnis.

**Kein separates AO** für diese Kontaktschatten in v1 — Shadow Mapping ist die primäre Lösung ([`requirements-materials.md`](./requirements-materials.md): AO-Map nicht v2).

---

**Category:** Shadows  
**Title:** Performance & Limits  
**Description:**

- **Max. 2 Shadow-Caster** gleichzeitig (`LIGHT_POOL_MAX_SHADOW_CASTERS`) — WebGPU/Fillrate-Budget
- v1: Key + Fill — beide Studio-Slots (max. 2)
- v2: zweiter Caster (z. B. Directional-Sonne) nur wenn `canEnableShadow()` true
- **Light-Pool:** Lichter vorkonfiguriert, kein Runtime-`new Light()` — [`requirements-lighting.md`](./requirements-lighting.md)

Export-Capture: **8192²** — siehe Map-Größe-Tabelle und [`requirements-export.md`](./requirements-export.md) (*Export — Shadow-Map-Auflösung*).

---

**Category:** Shadows  
**Title:** Härte vs. Weichheit — Hebel  
**Description:** Enges Frustum (5 m) hält mm-Kontakte scharf; **Weichheit** über `key.shadowSoftness` / `fill.shadowSoftness` → `shadow.radius` pro Rig (Default `4`). Key + Fill können beide casten (Checkbox pro Rolle). Weichheit **ohne** VSM (VSM → Boden-Streifen, verworfen):

| Hebel | Wirkung | Hart ↔ Weich | UI? |
|---|---|---|---|
| **`shadow.radius`** (PCF Vogel-Disk) | Penumbra / Kantenweichzeichnung | niedrig → hart, höher → weicher | **ja** — Haupt-Slider |
| **Fill ratio + Ambient** | Schatten **aufhellen** (nicht geometrisch weicher) | niedrig ↔ hoch | ja — Fill + Ambient Slider |
| **Spot `penumbra`** | Lichtkegel-Rand (Key `0.9`) | leichter Einfluss auf Schattenkante | optional, Expert |
| **Frustum / Coverage** | Größer = weicher aber unschärfer | Tradeoff vs. mm-Detail | **nein** — adaptiv aus Entity-AABB (`scene-shadow-coverage.ts`) |
| **Map-Size 4096² / Export 8192²** | Schärfe / Korn | Qualität, nicht Weichheit | **nein** — Export-Capture automatisch höher |
| **VSM + blurSamples** | Sehr weiche Penumbra | — | **nein** (Studio-Boden-Risiko) |

**Zielbild:** Kontaktschatten (Rahmen→Print) **scharf** halten; **Boden-Schatten** und äußere Kanten **einstellbar weich** über `shadow.radius`.

---

**Category:** Shadows  
**Title:** UI — Controls in Lighting (kein eigenes Right-Main-Panel)  
**Description:** **Kein** eigener Nav-Eintrag **Shadow** in Right Main. **Cast shadows** + **Softness** pro Key/Fill im jeweiligen Licht-Block ([`requirements-lighting.md`](./requirements-lighting.md)). Keine globale Shadows-Sektion.

**v1.5 (implementiert):**

| Control | Ort | Range | Default | Engine |
|---|---|---|---|---|
| **Cast shadows** | Key / Fill Block | Checkbox | on | `light.castShadow` |
| **Softness** | Key / Fill Block | `0`–`30`, Step `0.5` | `4` | `keyRig` / `fillRig` → `light.shadow.radius` |

Store: `key.shadowSoftness` / `fill.shadowSoftness` → Scene-API → `applyKey()` / `applyFill()`. Disabled wenn Licht aus oder Cast shadows off. **Kein** Bias/Map-Size im UI (Expert-only, Engine-Tuning).

**Bereits ohne Extra-UI:** Fill-Ratio und Ambient-Intensity ändern **wahrgenommene** Schattenhärte, nicht PCF-Radius. Ground **Receive shadows** bleibt in der **Ground**-Sektion des Environment-Panels.

**Eigenes Shadow-Panel (Right Main)** nur wenn v3+ **viele** globale Parameter (Map-Size Export, Bias, Coverage) — sonst Panel-Overload. Cast shadows + Softness pro Licht im Key-/Fill-Block reichen für v1.

---

**Category:** Shadows  
**Title:** Implementierung — Dateien & Konstanten  
**Description:**

| Bereich | Pfad / Symbol |
|---|---|
| Setup & Flags | `src/render/shadow-setup.ts` |
| Konstanten | `src/constants.ts` — `SHADOW_MAP_SIZE`, `SHADOW_MAP_SIZE_EXPORT`, `SHADOW_COVERAGE_RADIUS`, `SHADOW_COVERAGE_RADIUS_MIN`, `SHADOW_COVERAGE_CONTENT_PADDING_M`, `SHADOW_SOFTNESS_*`, `SHADOW_DEPTH_BIAS`, `SHADOW_NORMAL_BIAS`, `LIGHT_POOL_MAX_SHADOW_CASTERS` |
| Adaptive Coverage | `src/render/scene-shadow-coverage.ts` — `computeSceneShadowCoverageRadius` |
| Spot Config (Key + Fill) | `configureSpotShadowLight`, `updateSpotShadowCamera` (optional `coverageRadius`) |
| Export Map-Size | `LightingSystem.pushExportShadowQuality` / `popExportShadowQuality`; `mockup-engine-capture.ts` |
| Directional (Pool) | `configureDirectionalShadowLight` |
| Renderer Init | `configureShadowRenderer` in `mockup-engine.ts` |
| Per-Frame | `LightingSystem.updateFrame()` |
| Per-Rig Softness | `applyKey()` / `applyFill()` → `light.shadow.radius` |
| Store | `setKeyShadowSoftness`, `setFillShadowSoftness` in `app-store.ts` |
| Assets | `applyAssetShadowFlags` in `asset-meshes.ts` |
| Wine bottle glass shadow depth | `src/engine/wine-bottle-glass.ts` — `customDepthMaterial` (**FrontSide**) |
| Ground | `applyReceiveShadowFlags` in `ground-plane.ts` |

---

**Category:** Shadows  
**Title:** Typische Fehler vermeiden  
**Description:**

- `castShadow` / `receiveShadow` vergessen → Objekte schweben optisch
- Shadow-Map 512/1024 → körnige Mockups
- Shadow-Frustum zu groß → unscharfe, low-res Schatten trotz 4096²
- `camera.fov` für Spot-Shadow setzen → wird von `updateMatrices` überschrieben; **`shadow.focus`** nutzen
- `VSMShadowMap` + große Ground-Plane → diagonale Streifen (Receiver casten mit)
- `normalBias` zu hoch (cm) → **keine** mm-Kontaktschatten auf Prints/Screens
- `shadow.bias` negativ → **Peter Panning** am Boden (Lücke unter Produktfüßen)
- Transmission-Glas ohne Depth-Pass → falsche / schwebende Schatten-Silhouette (Wine bottle: `customDepthMaterial`)
- Nur AmbientLight → flache Szene ohne Tiefe
- Licht nested unter Helper → fehlende/falsche Schatten (Rig auf Scene-Root)
- `updateSpotShadowCamera` vergessen → veraltete / fehlende Spot-Shadows
- Einseitige Plane ohne `shadowSide` → Schatten nur aus einer Lichtrichtung
- Cast-Shadow-UI pro Mesh → falsches Mental Model; Mesh-Flags sind Engine-Policy
- WebGL-Shadow-Snippets 1:1 → WebGPU-Pfad prüfen (r186: `PCFSoftShadowMap` entfernt)

---

## Offen / Später

**Category:** Shadows  
**Title:** Scene Save — globale Shadow-Settings  
**Description:** Noch zu klären ([`requirements-architecture.md`](./requirements-architecture.md)): weitere Shadow-Settings (Bias, Map-Size) **global** vs. **pro Light** in Serialisierung. v1: feste Engine-Konstanten; `castShadow` + `shadowSoftness` pro Key/Fill in Store + UI.

---

**Category:** Shadows  
**Title:** Glazing & Transmission — kein Shadow-Cast  
**Description:** **Glazing** (`glazingEnabled`, default **off**): dünne `transmission`-Plane vor dem Bild — **visuell** lichtdurchlässig (Glas), **wirft keinen Schatten** (`castShadow = false`, `assetMeshRole = 'glazing'`). Empfängt Schatten von Rahmen/Key. **Kein** „Hindurchleuchten" durch opake Teile: Rahmen, Print, Back-Wall = `solid-pbr`, voll opak, casten + empfangen. Wenn Glazing aktiv: Licht geht **sichtbar** durch Glas; Shadow Map ignoriert Glas (kein Blocker) — bewusst, um Artefakte auf 2 mm Scheibe zu vermeiden. Details Material → [`requirements-materials.md`](./requirements-materials.md).

**Abgrenzung — Wine bottle Glas:** Volumen-**Lathe**-Glas (`wine-bottle`, `material-glass-wine-bottle`) ist **nicht** Display-Glazing — **`castShadow = true`**, **`receiveShadow = true`**. Beauty-Pass: `MeshPhysicalNodeMaterial` mit Transmission (`meshDepthM` = Wandstärke). **Shadow-Pass:** am Glas-Body-Mesh **`customDepthMaterial`** = `MeshDepthMaterial` mit **`FrontSide`** — Silhouette = Außenkontur am Boden (`y = 0`), unabhängig vom Transmission-Shader. `applyAssetShadowFlags` setzt weiterhin `shadowSide = DoubleSide` auf Cast-Materialien (Print/Frame); am Flaschen-Glas zählt der Depth-Pass. Stärker absorbierend / matteres Glas → **dunklerer** empfangener Schatten (Material, kein Extra-UI). → [`requirements-assets-wine-bottle.md`](./requirements-assets-wine-bottle.md).

---

**Category:** Shadows  
**Title:** v2 — Multi-Caster & RectArea  
**Description:** Zweiter Shadow-Caster (z. B. schwaches Directional) für Außen-Szenen. **RectAreaLight**-Schatten in WebGPU eingeschränkt — weiches Fill ggf. ohne Shadow Map ([`requirements-lighting.md`](./requirements-lighting.md)). Engine: `LightPool.canEnableShadow()` vor Aktivierung.

---

**Category:** Shadows  
**Title:** v2/v3 — Shadow-Qualitäts-Panel (optional)  
**Description:** Optional UI: Map-Size (Preview/Export), Bias-Advanced (Expert), Contact-Shadow-Stärke. Default bleibt „Studio-Qualität ohne Einstellungen". Erst wenn User-Feedback oder Scene-Save es verlangt.

---

**Category:** Shadows  
**Title:** Cascaded / adaptive Shadows (Research)  
**Description:** Für sehr große Szenen oder stark variierende Objektgrößen: CSMS oder tight fitting pro Frame. Mockup-Studio-Szenen sind **kompakt** (Einzelprodukt, Studio-Boden) — v1/v2: **ein** enges Frustum reicht. Reevaluieren bei Outdoor-/Architektur-Mockups.
