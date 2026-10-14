# Lighting Panel

Studio-Beleuchtung für photorealistische Mockups. Bezüge: [`requirements-scene-placement.md`](./requirements-scene-placement.md), [`requirements-gimbals.md`](./requirements-gimbals.md), [`requirements-color-picker.md`](./requirements-color-picker.md), [`requirements-range-slider.md`](./requirements-range-slider.md), [`requirements-app-layout.md`](./requirements-app-layout.md), Szene-Schatten → [`requirements-shadows.md`](./requirements-shadows.md).

**Bestand (Inventur):** `LightingSystem` in `src/engine/lighting/` (`lighting-system.ts`, `studio-pose.ts`, `light-rig.ts`, `light-fixture-disc.ts`, `lighting-merge.ts`). `MockupEngine` delegiert `applyLighting` / `setLighting` / `getLighting`. Store: `lighting: LightingSettings` in `app-store.ts`. UI: `LightingSubPanel.tsx` (Right Sub). Legacy `sunIntensity` entfernt.

**Status:** v1 **implementiert** — Ambient + Key + Fill, Gizmo, Follow scene center, **Fixture-Discs v0** (emissive Kreise Key/Fill). **Offen:** Scene Save, Add Light (v2), RectArea-Upgrade.

**v1-Scope:** Drei feste Rollen — **Ambient**, **Key**, **Fill**. Gizmo, Bezugspunkt-Checkbox. **Lighting-only-Presets:** **Left Light rigs** → [`requirements-lighting-presets.md`](./requirements-lighting-presets.md). **Volle Atmosphäre** (Sky/Ground/Lighting): **Left Environments** → [`requirements-environments.md`](./requirements-environments.md). **Layouts:** **Left Scenes**. Right **Lighting** = Live-Panel, keine Preset-Liste im Sub-Panel. **Kein** „Add Light" / freie Lichtliste (→ v2).

**v2 (später):** Beliebig viele Lichter aller Typen, Add/Remove, generisches Detail-Panel pro Licht — siehe Abschnitt „Später — Multi-Light".

---

## Lichttypen (Engine-Referenz)

| Typ | Rolle | Position | Schatten | v1 (implementiert) |
|---|---|---|---|---|
| **AmbientLight** | Globales Basis-Fill | Nein | Nein | **Ambient** |
| **SpotLight** | Kegel mit Penumbra | Ja (Rig-Helper + Target) | Ja (Key default on) | **Key + Fill** |
| **RectAreaLight** | Softbox / Flächenlicht | Ja | Eingeschränkt | v2 / später — Panel-API bleibt |
| **DirectionalLight** | Parallel (Sonne) | Ja | Ja | v2 / optional |
| **PointLight** | Punktquelle | Ja | Ja | v2 |
| **HemisphereLight** | Sky/Ground-Gradient | Ja | Nein | v2 |

**Entscheidung (v1):** Key und Fill = **SpotLight** (Penumbra `0.9`). Key: `decay=0`. Fill: `decay=1.5` (nur wenn **Cast shadows** off); mit Cast shadows: `decay=0` — sonst unsichtbare Schatten auf Studio-Distanz. Beide: `castShadow` per Checkbox (Default **on**). Rig: Licht auf **Scene-Root** (nicht nested), Helper nur für Pick/Gizmo; Target = Szenenmitte. Nach Pose: `shadow.updateMatrices(light)`. Pro Frame: `LightingSystem.updateFrame()` (nur enabled Rigs). Three.js: **eine Shadow Map pro Licht**, kombiniert im Shader (kein Single-Pass).

---

**Category:** Lighting  
**Title:** Panel-Platzierung (UI)  
**Description:** **Right Main** Nav-Eintrag **Lighting** (`lightbulb`-Icon). **Right Sub** zeigt alle Lighting-Einstellungen (scrollbar, kompakte Dichte laut [`requirements-look-and-feel.md`](./requirements-look-and-feel.md)). Kein Accordion — flache Sektionen mit dünnen Trennlinien `#e8e8e8`, analog Ground Panel. Globale Szene-Nav bleibt erreichbar wenn Asset selektiert (Asset-Panel hat Vorrang — [`requirements-assets.md`](./requirements-assets.md)).

---

**Category:** Lighting  
**Title:** Farben — kein Reinweiß  
**Description:** Default-Farben für alle Lichter: **schöne Near-Whites**, **nie** `#FFFFFF` / `rgb(1,1,1)`. Photorealistische Mockups wirken mit leicht getöntem Licht natürlicher (Warm/Cool-Abstimmung). UI: `ColorPicker` erlaubt User-Wahl inkl. Reinweiß — **Werkseitige Defaults** (`SCENE_DEFAULTS`) halten sich an Near-White.

| Rolle | Default-Farbe (Hex) | Charakter |
|---|---|---|
| **Ambient** | `#FFF9F5` | Sehr subtiles warmes Basis-Fill |
| **Key** | `#FFF5EB` | Warmes Softbox-Weiß (Hauptlicht) |
| **Fill** | `#F0F4FA` | Leicht kühles Aufhell-Weiß (klassisch Key warm / Fill cool) |

---

**Category:** Lighting  
**Title:** Bezugspunkt — Scene Center vs. World Fixed  
**Description:** Checkbox im Panel-Header oder eigene Zeile **„Follow scene center"** (default **on**).

- **On (Scene center):** Key- und Fill-Rig orientiert sich an der **Szenenmitte** (Bounding-Center des fokalen Assets bzw. Weltursprung wenn kein Asset). Verschiebt der User das Device, **bewegen die Lichter mit** — relative Studio-Geometrie bleibt (Seite, Winkel, Distanz zum Objekt).
- **Off (World fixed):** Lichtpositionen bleiben in **Weltkoordinaten** fix; nur manuelles Gizmo oder Panel ändert sie.

Ambient ist unabhängig vom Bezugspunkt (kein Transform). Store-Feld: `referenceMode: 'scene-center' | 'world-fixed'`.

---

**Category:** Lighting  
**Title:** Ambient  
**Description:** Section **Ambient** — globales Basislicht, nicht platzierbar, kein Gizmo, kein Schatten.

| Control | Typ | Default |
|---|---|---|
| **Color** | `ColorPicker` | `#FFF9F5` |
| **Intensity** | `RangeSlider` + `SliderValueField` | `0.080` (0–1, Step 0.001, 3 Dezimalen) |

Live Viewport-Update: Store → Scene-API → `AmbientLight`.

---

**Category:** Lighting  
**Title:** Key Light (Hauptlicht)  
**Description:** Section **Key Light** — Hauptlicht für Produkt-Highlight und **primären Schatten**.

| Control | Typ | Default |
|---|---|---|
| **Side** | Toggle **Left** / **Right** | **Left** |
| **Cast shadows** | `PanelCheckbox` | **on** |
| **Softness** | `RangeSlider` + `SliderValueField` | `4.0` (0–30, Step 0.5) |
| **Color** | `ColorPicker` | `#FFF5EB` |
| **Intensity** | `RangeSlider` + `SliderValueField` | `1.000` (0–3 oder Engine-Skala, Step 0.001) |

**Schatten:** Checkbox **Cast shadows** + Slider **Softness** im Block-Body. Engine: `castShadow = enabled && castShadow`; `shadowSoftness` → `keyRig.light.shadow.radius`. Disabled wenn Licht aus oder Cast shadows off.

**Studio-Geometrie (Initialposition beim Side-Toggle):**

- Seitlich **vor** dem Objekt: Azimuth **±45°** (Left = negative X-Seite aus Kamera-Front-Sicht, Right = positive X — konkrete Achse in Engine festlegen, konsistent mit Camera-Front).
- Von oben: Elevation **45°** auf Szenenmitte gerichtet.
- Richtung: **SpotLight**-Target = Szenenmitte (Studio-Pose aus `studio-pose.ts`, Basis-Distanz `STUDIO_BASE_DISTANCE = 8`).

**Gizmo (v1):** Key-Rig ID **`light-key`** — sichtbarer Wireframe-Helper + pickbare Sphere im Viewport + **Translate-Gizmo** ([`requirements-gimbals.md`](./requirements-gimbals.md)). **Rotate deaktiviert** in v1 (Spot-Richtung über Target, nicht Helper-Rotation). Gizmo-Offset (`transformOffset`) zusätzlich zur Studio-Pose. Side-Toggle **setzt** `transformOffset` auf Default zurück. Lichter sind **nicht** in `EntityRegistry` (nur Assets), Selection über `SelectionController` + `LightingSystem.getPickables()`. Panel: Key/Fill per Button selektierbar.

---

**Category:** Lighting  
**Title:** Fill Light (Aufhelllicht)  
**Description:** Section **Fill Light** — weiches Gegenlicht, Schatten aufhellen.

| Control | Typ | Default |
|---|---|---|
| **Side** | Read-only Label: *„Opposite of key"* | auto |
| **Cast shadows** | `PanelCheckbox` | **on** |
| **Softness** | `RangeSlider` + `SliderValueField` | `4.0` (0–30, Step 0.5) |
| **Color** | `ColorPicker` | `#F0F4FA` |
| **Intensity ratio** | `RangeSlider` + `SliderValueField` | `0.500` (= 50 % von Key-Intensity) |
| **Distance** | `RangeSlider` + `SliderValueField` | `1.000` (Multiplikator auf Basis-Distanz, Step 0.001) |

**Schatten:** Checkbox **Cast shadows** + Slider **Softness** im Block-Body. Engine: `castShadow = enabled && castShadow`; `shadowSoftness` → `fillRig.light.shadow.radius`. Key + Fill = max. 2 Caster (`LIGHT_POOL_MAX_SHADOW_CASTERS`). Disabled wenn Licht aus oder Cast shadows off.

**Effektive Fill-Intensity:** `key.intensity × fill.intensityRatio` (Ratio live neu berechnen wenn Key-Intensity ändert).

**Cast shadows + Decay:** Fill mit aktivem Cast shadows → `decay = 0` (wie Key). Ohne Cast shadows → `decay = 1.5`. Schattenstärke hängt vom Lichtbeitrag ab; `decay=1.5` auf ~8 m macht Fill-Schatten praktisch unsichtbar — auch wenn Key parallel castet.

**Distance:** Skaliert Abstand der Fill-Quelle zur Szenenmitte (weiter = weicher falloff bei Spot/Point; bei RectArea/Directional: größerer Abstand = sanfterer Lichtkegel auf Objekt). Basis-Distanz aus Studio-Setup (~ gleich Key-Distanz bei `1.0`).

**Studio-Geometrie (Initial):**

- Gegenüberliegende Seite zu Key: Azimuth **∓45°**.
- Elevation **35°** (Mitte aus 30–45°-Bereich).
- Side wechselt automatisch wenn Key Left/Right toggled.

**Gizmo (v1):** Entity `light-fill`, gleiches Placement-System wie Key. Bei **Follow scene center**: Fill bleibt spiegelbildlich zu Key bis User per Gizmo überschreibt.

---

**Category:** Lighting  
**Title:** Schatten  
**Description:** **Key** und **Fill (SpotLight):** `castShadow` per Checkbox (Default **on**); **Softness** pro Rolle (`0`–`30`, Default `4`) → `light.shadow.radius`. Shadow: `configureSpotShadowLight` + `updateSpotShadowCamera` → `shadow.updateMatrices(light)` (4096², PCF, 5 m Coverage). `updateFrame()` jeden Render-Tick. **Ambient:** kein Schatten. Keine globale Shadows-Sektion. Mesh-/Ground-Flags → [`requirements-shadows.md`](./requirements-shadows.md).

**UI:** **Cast shadows** + **Softness** pro Key/Fill im jeweiligen Licht-Block. Kein eigener Right-Main-Nav „Shadow". Fill-Ratio und Ambient-Intensity steuern wahrgenommene Schattenhärte manuell.

---

**Category:** Lighting  
**Title:** Engine & Scene-API  
**Description:** Licht-Logik in `src/engine/lighting/` — **nicht** in React. Stabile Rig-IDs: `light-key`, `light-fill` (Viewport-Pick + Gizmo); Ambient ohne ID/Transform. UI kennt nur Scene-API — kein Three in UI.

```ts
type LightingReferenceMode = 'scene-center' | 'world-fixed';

type StudioLightSide = 'left' | 'right';

type AmbientLightSettings = {
  color: Rgb;
  intensity: number; // 0–1
};

type KeyLightSettings = {
  side: StudioLightSide;
  color: Rgb;
  intensity: number;
  castShadow: boolean;
  shadowSoftness: number; // 0–30 → light.shadow.radius
  /** Gizmo offset from computed studio pose (position + rotation). */
  transformOffset: Transform;
};

type FillLightSettings = {
  color: Rgb;
  intensityRatio: number; // 0–1, effective = key.intensity * ratio
  distance: number;       // multiplier on base studio distance
  castShadow: boolean;
  shadowSoftness: number; // 0–30 → light.shadow.radius
  transformOffset: Transform;
};

type LightingSettings = {
  referenceMode: LightingReferenceMode;
  ambient: AmbientLightSettings;
  key: KeyLightSettings;
  fill: FillLightSettings;
};
```

API: `applyLighting(state)`, `setLighting(partial: DeepPartial<LightingSettings>)`, `getLighting()`. Store: `patchLighting` + benannte Setter (`setKeySide`, `setAmbientColor`, …). Defaults: `SCENE_DEFAULTS.lighting` in `src/config/scene-defaults.ts`. Merge-Hilfe: `src/engine/lighting/lighting-merge.ts`. Scene-Center: `registry.subscribeEntities()` → Rig neu wenn `referenceMode === 'scene-center'`. Wechsel zu **world-fixed** friert Weltpose ein (`captureWorldFixedPoses`).

---

**Category:** Lighting  
**Title:** Serialisierung  
**Description:** Gesamtes `LightingSettings` in **Scene Save** — inkl. `transformOffset` für Key/Fill, `referenceMode`, alle Farben/Intensitäten. Stabile IDs `light-key`, `light-fill`.

---

**Category:** Lighting  
**Title:** Panel-Layout — Übersicht  
**Description:** Right Sub **Lighting**, von oben nach unten (scrollbar). Kompakte Property-Zeilen + Section-Labels (11px uppercase oder semibold). Trennlinien zwischen Blöcken.

---

**Category:** Lighting  
**Title:** Panel — Header & Bezugspunkt  
**Description:** Sub-Panel-Header **Lighting**. Darunter Zeile: **Follow scene center** — Checkbox (default on), **außerhalb** der Licht-Blöcke.

---

**Category:** Lighting  
**Title:** Studio-Licht-Blöcke — Header wie Scene-Items  
**Description:** **Ambient Light**, **Key Light** und **Fill Light** jeweils als **`scene-entity-block`** (gleiche Header-Zeile wie Scene-Panel): **Collapse** (Chevron) + **Titel** + **Eye** (Enabled). **Kein Trash** in v1 — Remove erst ab Multi-Light v2. Eye togglet `enabled: boolean` (default `true`), nicht Intensity. Disabled: Licht aus (`visible = false`), Key ohne Shadow Map; Helper/Gizmo/Pick nur wenn `enabled`. Key/Fill: Titel-Klick = Select/Deselect (`light-key` / `light-fill`). Ambient: kein Gizmo, Titel nicht selektierbar.

---

**Category:** Lighting  
**Title:** Panel — Ambient Light (Block)  
**Description:** Block **Ambient Light** — Header + Body (einklappbar):

- **Color** — `ColorPicker`, Label **Color**
- **Intensity** — `RangeSlider` + `SliderValueField` (0–1, Step 0.001, 3 Dezimalen)

---

**Category:** Lighting  
**Title:** Panel — Key Light (Block)  
**Description:** Block **Key Light** — Header (Collapse, Eye, Titel = Select) + Body:

- **Side** — Segmented control **Left** | **Right**
- **Cast shadows** — `PanelCheckbox` (default on)
- **Softness** — `RangeSlider` + `SliderValueField` (0–30, Step 0.5, Default `4`); disabled wenn Licht aus oder Cast shadows off
- **Color** — `ColorPicker`
- **Intensity** — `RangeSlider` + `SliderValueField`

---

**Category:** Lighting  
**Title:** Panel — Fill Light (Block)  
**Description:** Block **Fill Light** — Header (Collapse, Eye, Titel = Select) + Body:

- **Side** — read-only Text *„Opposite of key"*
- **Cast shadows** — `PanelCheckbox` (default on)
- **Softness** — `RangeSlider` + `SliderValueField` (0–30, Step 0.5, Default `4`); disabled wenn Licht aus oder Cast shadows off
- **Color** — `ColorPicker`
- **Intensity ratio** — `RangeSlider` + `SliderValueField` (0–1, Step 0.001), Label **Ratio to key**
- **Distance** — `RangeSlider` + `SliderValueField` (z. B. 0.5–3.0, Step 0.001), Label **Distance**

---

**Category:** Lighting  
**Title:** Panel — Wireframe (Text)  
**Description:**  
```text
┌ Lighting ────────────────────────────────────┐
│ Follow scene center                    [x]   │
│ ┌ Ambient Light ─────────────── [v] [eye] ┐ │
│ │ Color        [■ swatch]  #FFF9F5         │ │
│ Intensity                                    │
│ [●===================]                       │
│ │ Intensity            [0.080]             │ │
│ └──────────────────────────────────────────┘ │
│ ┌ Key Light ─────────────────── [v] [eye] ┐ │
│ │ Side         ( Left ) ( Right )          │ │
│ Cast shadows                           [x]   │
│ Softness               [4.0]                 │
│ Color          [■ swatch]  #FFF5EB           │
│ Intensity                                    │
│ [====================●]                      │
│ │ Intensity            [1.000]             │ │
│ └──────────────────────────────────────────┘ │
│ ┌ Fill Light ────────────────── [v] [eye] ┐ │
│ │ Side         Opposite of key             │ │
│ Cast shadows                           [x]   │
│ Softness               [4.0]                 │
│ Color          [■ swatch]  #F0F4FA           │
│ Ratio to key                                 │
│ [==========●=========]                       │
│ Ratio                  [0.500]               │
│ Distance                                     │
│ [========●===========]                       │
│ │ Distance             [1.000]             │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

---

**Category:** Lighting  
**Title:** Implementierung — Dateien (v1)  
**Description:**  

| Bereich | Pfad |
|---|---|
| Engine | `src/engine/lighting/lighting-system.ts`, `light-pool.ts`, `light-rig.ts`, `studio-pose.ts`, `lighting-merge.ts`, `light-ids.ts` |
| Shadows | `src/render/shadow-setup.ts` (`configureSpotShadowLight`, `updateSpotShadowCamera`) |
| Scene API | `src/scene/scene-api.ts` (`LightingSettings`, `DeepPartial`) |
| Store | `src/ui/store/app-store.ts` (`setKeyCastShadow`, `setFillCastShadow`, `setKeyShadowSoftness`, `setFillShadowSoftness`) |
| UI | `src/ui/panels/LightingSubPanel.tsx`, `SceneEntityBlock.tsx`, `src/ui/shell/RightSubPanel.tsx` |

**Nächste Schritte (nach v1):** Scene Save; v2 Multi-Light; optional RectArea für weicheres Fill wenn WebGPU-Schatten geklärt.

---

## Später — Multi-Light (v2)

**Category:** Lighting  
**Title:** Multi-Light — unbegrenzt hinzufügen/entfernen (v2)  
**Description:** Zusätzlich zum Studio-Rig: User kann **beliebig viele** weitere Lichter aller Typen hinzufügen und entfernen. UI: **Add Light** (Typ wählen), **Remove Light**, Liste aller Lichter (Name, Typ, an/aus). Jedes Licht eigene ID, editierbar im generischen Detail-Panel. Studio-Rig (Ambient/Key/Fill) bleibt als feste Sektionen oben; Extra-Lights darunter in Liste + Detail.

---

**Category:** Lighting  
**Title:** Generisches Light-Detail-Panel (v2)  
**Description:** Einstellungen pro **zusätzlich** selektiertem Licht. Felder je nach Typ: **Name**, **Enabled**, **Color**, **Intensity**; Point/Spot: **Distance**, **Decay**; Spot: **Angle**, **Penumbra**; RectArea: **Width**, **Height**; Directional/Spot: **Cast Shadow**; Hemisphere: **Sky Color**, **Ground Color**. Änderungen → Store → Scene-API → Engine sofort sichtbar.

---

**Category:** Lighting  
**Title:** Lichter im Raum platzieren (v2 + Studio)  
**Description:** Jedes Licht mit Position (außer Ambient) = **Scene Entity** ([`requirements-scene-placement.md`](./requirements-scene-placement.md)): Verschieben, Drehen, Target für Directional/Spot. Viewport-Helper bei Selektion. v1: nur Key + Fill; v2: alle Extra-Lights gleiches System.

---

**Category:** Lighting  
**Title:** Engine-Architektur (Gesamt)  
**Description:** Licht-Logik in `src/engine/lighting/`. Datenmodell: `LightEntity { id, type, transform, params, castShadow }`. Factory pro Typ. Sync Three-Light ↔ Entity. v1: drei feste Rollen + `LightingSystem` + **`LightPool`** (Slots vorkonfiguriert); v2: `addLight`, `removeLight`, `updateLight`, `listLights` für Extra-Lights. UI kennt nur Scene-API.

---

**Category:** Lighting  
**Title:** Light-Pool (Engine)  
**Description:** Alle Three.js-Lichter werden **einmal beim Start** allokiert — kein `new Light()` zur Laufzeit, kein `dispose()` bis Engine-Shutdown. Konstanten in `src/constants.ts`.

| Pool-Typ | Slots | Reservierung |
|---|---|---|
| **SpotLight** | 10 | Slot 0 = Key (`light-key`), Slot 1 = Fill (`light-fill`), Slots 2–9 = Extra (v2) |
| **DirectionalLight** | 10 | frei (v2) |
| **PointLight** | 10 | frei (v2) |

**Shadow-Limit:** max. **2** gleichzeitig `castShadow = true` über alle aktiven Pool-Slots (`LIGHT_POOL_MAX_SHADOW_CASTERS`). v1: Studio Key + Fill nutzen beide Slots. v2: Engine prüft `LightPool.canEnableShadow()` bevor ein Extra-Light Schatten bekommt.

**Slot-Lifecycle:** `allocateSpot` / `allocateDirectional` / `allocatePoint` nimmt freien Slot; `release*` setzt Intensity 0, `visible = false`, `castShadow = false`. Studio-Slots 0+1 sind **nicht releasebar**.

**API:** `LightPool` in `src/engine/lighting/light-pool.ts`; `LightingSystem.getLightPool()` für v2 Extra-Lights.

**Pool voll:** UI zeigt „Max lights reached" (v2) — kein stiller Fehler.

**Mesh-Schatten vs Licht-Schatten:** Meshes casten/empfangen per Engine-Policy (`applyAssetShadowFlags`, Ground nur receive). Licht-Schatten = separates Konzept — Key und Fill können Shadow Maps casten (Checkbox pro Rolle, max. 2). Details → [`requirements-shadows.md`](./requirements-shadows.md).

---

**Category:** Lighting  
**Title:** Light fixtures v0 (prototype)  
**Description:** Key und Fill haben je eine **runde emissive Disc** (`CircleGeometry`) am Rig-`helper`, ausgerichtet auf das Scene-Center (wie Spot-Target). **Implementierung:** `src/engine/lighting/light-fixture-disc.ts`, Anbindung in `light-rig.ts` / `lighting-system.ts`. **v0:** feste Radii und Material in `src/constants.ts` (`LIGHT_FIXTURE_DISC_KEY_RADIUS`, `LIGHT_FIXTURE_DISC_FILL_RADIUS`, `LIGHT_FIXTURE_DISC_EMISSIVE_INTENSITY`, `LIGHT_FIXTURE_DISC_ROUGHNESS`); Emissive-Farbe = Key/Fill-Farbe aus `LightingSettings` — **kein** UI, **keine** Serialisierung. **Spots** bleiben für Schatten und direkte Beleuchtung am Asset. **Später:** Fixture-Typ (none / disc / rect), Radius, Spot-Specular vs Fixture entkoppeln. **Hide fixtures in export** → [`requirements-export.md`](./requirements-export.md) (Export-Checkbox).

---

**Category:** Lighting  
**Title:** Light fixtures v0 — Sichtbarkeit & Reflexionen  
**Description:** **Main View:** Discs rendern als normale Main-Scene-Meshes (wenn Key/Fill `enabled`). **Planar Mirror:** Discs sind Teil der Main Scene → im TSL-`reflector()`-Pass mitspiegelbar, wenn **Mirror floor** an und die Disc im Frustum der gespiegelten Kamera liegt (Mix über Ground: `mirrorOpacity`, Material-Roughness, Disc-Emissive). Details → [`requirements-reflections.md`](./requirements-reflections.md) (Abschnitt Light fixtures). **IBL (`scene.environment`):** Discs **nicht** in der Environment Map — PMREM bleibt **Sky-only**; glänzende Assets reflektieren darüber **keine** Softbox-Kreise (bewusst bis Studio-IBL / HDRI). **Specular am Asset:** Highlights kommen v0 vom **SpotLight** (punktartig); Discs **beleuchten andere Meshes nicht** als Flächenlicht. Weiche Flächen-Speculars → **RectArea** / Lighting v2. **Export:** Default (**Hide light fixtures** aus) = WYSIWYG — Discs und Wireframe im Bild, wenn sichtbar. Checkbox **an** → nur im Capture Discs + Wireframe aus; Spots/Schatten bleiben → [`requirements-export.md`](./requirements-export.md). **Editor-Chrome:** Pick-Sphere bleibt unsichtbar; Wireframe = Placement-Hilfe, wird mit **Hide light fixtures** im Export ausgeblendet.

---

**Category:** Lighting  
**Title:** Light fixtures — keine Viewport helpers  
**Description:** Emissive **Fixture-Discs** sind **Teil des Licht-Setups** (sichtbare Softbox, Spiegel am Boden, bewusst im Mockup-Frame) — **nicht** die Sektion **Viewport helpers** im Environment-Panel → [`requirements-environment.md`](./requirements-environment.md) (Viewport helpers — Abgrenzung). **Wireframe-Handles** am Rig = Viewport helpers (**Light handles**), nicht Fixtures.

---

**Category:** Lighting  
**Title:** Light fixtures — Sichtbarkeit (UI, Ziel)  
**Description:** **Right Main → Lighting → Right Sub** (`LightingSubPanel`): Sichtbarkeit der Discs über **Lighting-State**, nicht über Environment. v1 UI (nach Implementierung): mindestens eine **`PanelCheckbox` Show fixtures** (global Key + Fill) oder pro Rolle im Key-/Fill-`scene-entity-block` — **Show fixture** neben **Enabled** / Schatten-Checkboxen. `visible` der Disc **entkoppelt** von Spot-`enabled` (Licht wirkt, Disc unsichtbar = gültiger Use Case). **Serialisierung:** Teil von `LightingSettings` / Scene Save. **Export:** **WYSIWYG** — Fixture im Bild genau dann, wenn Show fixtures an (und Rolle enabled, falls Produktregel „nur wenn Licht an“ — Prefer: Show fixtures unabhängig). Migration vom Export-Only-Flag → nächster Block in [`requirements-export.md`](./requirements-export.md).

---

**Category:** Lighting  
**Title:** Light handles — Wireframe (Querverweis)  
**Description:** Sichtbares **Wireframe** am Key/Fill-Rig = **Light handles** unter Environment **Viewport helpers** (Toggle global), nicht Fixture-Sichtbarkeit. Selection verstärkt Wireframe (bestehend `SelectionHighlight`) — unverändert. Export: Light handles folgen Viewport-helpers-Regel (an = mitexportieren); **nicht** über **Hide light fixtures** steuern (Ziel: Export-Checkbox blendet nur noch Fixtures aus, nicht Wireframe — siehe Export-Zielbild).

---

**Category:** Lighting  
**Title:** Spot beams — SpotLightHelper (Querverweis)  
**Description:** Environment-Toggle **Spot beams** (`viewportHelpers.lightHandles`) steuert **`SpotLightHelper`** pro Key/Fill — Kegel zur `SpotLight` + Target, nicht die Fixture-Disc. Details → [`requirements-environment.md`](./requirements-environment.md) (*Viewport helpers — Spot beams*).

---

**Category:** Lighting  
**Title:** Forward arrow — Bezug zu Key/Fill (Querverweis)  
**Description:** Environment-Helper **Forward arrow** zeigt horizontal **zum Key** (Fallback Fill) — Richtung kommt aus **denselben Rig-Positionen** wie Studio-Pose (`studio-pose.ts`, `LightingSystem.updateFrame`), nicht aus Kamera- oder Asset-Forward. Key **Side** Left/Right ist die Drehung des Pfeils. Kein eigenes Lighting-UI; nur Abhängigkeit: Pfeil aktualisiert wenn Rigs repositioniert werden (Scene center, Gizmo, Side-Toggle).

---

**Category:** Lighting  
**Title:** Forward arrow — +Z (aktualisiert)  
**Description:** **Forward arrow** folgt **nicht** mehr Key/Fill — feste **Welt +Z** (wie blaue World-origin-Achse). Nur **Anker** = `getReferenceCenter()` (Scene center mitwandern). Siehe [`requirements-environment.md`](./requirements-environment.md) (*Forward arrow (+Z)*).

---

**Category:** Lighting  
**Title:** Fixtures — Panel section (implementiert)  
**Description:** **Right Sub → Lighting:** `SubPanelSection` **Fixtures** (unter **Follow scene center**, vor Ambient/Key). **`PanelCheckbox` Show fixtures** → `LightingSettings.showFixtures` (Default **true**). Disc-Sichtbarkeit: `key.enabled && showFixtures` / `fill.enabled && showFixtures` — Spot/Schatten unabhängig. **`PanelCheckbox` Reflect in mirror floor** → `fixturesReflectInMirror` (Default **true**); **disabled** wenn `ground.mirrorEnabled === false`, Hint *Turn on mirror floor in Environment → Ground.* State bleibt gespeichert. Engine: Discs auf `FIXTURE_DISC_LAYER`; `PlanarReflectionPass.setFixturesVisibleInReflection` steuert Reflector-Kamera-Layer. Export **WYSIWYG** — kein Export-Panel-Hide mehr.
