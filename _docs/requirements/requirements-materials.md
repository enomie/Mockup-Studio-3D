# Materials — Bibliothek & Presets

Zentrale **Material-Presets** im Projekt — PBR-Parameter, später Texturen. Alles was ein Oberflächen-Look braucht (Rahmen, Print-Seiten, Boden, Glas, …) **referenziert hierher** per `materialId`. UI: **Left Main → Materials** + **Left Sub** (Liste + Editor). Bezüge: [`requirements-images.md`](./requirements-images.md) (analoges Bibliothek-Muster), [`requirements-assets.md`](./requirements-assets.md), [`requirements-ground.md`](./requirements-ground.md), [`requirements-architecture.md`](./requirements-architecture.md).

**Bestand (Inventur):** Farben/PBR aktuell **verteilt** — `FRAME_COLOR` hardcoded in `asset-meshes.ts`, Ground `GroundMaterial`, Print-Faces per `ColorPicker`. **Ziel:** eine Library, keine Duplikate.

**Status:** v1 implementiert (solid-pbr, transmission, Materials Panel, Picture/Print-Slots, Live-Update).

---

**Category:** Materials  
**Title:** Rolle — Single Source of Truth (Oberflächen)  
**Description:** **Materials** ist die **einzige Material-Bibliothek** pro Projekt — analog **Images** für Bilder. Entities, Ground (später), Rahmen und Flächen referenzieren **`materialId`**, nicht lose RGB-Werte in der Entity (Ausnahme: direkter ColorPicker nur als **Editor** beim Anlegen/Bearbeiten eines Presets). Ein Preset = wiederverwendbarer Look (Goldrahmen, Papier, Betonboden). Änderung am Preset → alle Referenzen aktualisieren (live).

---

**Category:** Materials  
**Title:** Panel-Platzierung (UI)  
**Description:** **Left Main** Nav: **Materials** (Lucide `palette`), **nach** Colors. **Left Sub:** scrollbare **Liste** aller Presets + **Footer „Add material"** (+). Klick auf Eintrag = **Selection** + Editor im Sub (Name, Typ, Parameter, Vorschau-Swatch). Kompakte Dichte → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md). **Nicht** jedes Material im Entity-Panel voll editieren — Entity-Panel nur **Dropdown** (Zuweisung), wie Images-Picker.

---

**Category:** Materials  
**Title:** Datenmodell — MaterialPreset  
**Description:**

```ts
type MaterialKind = 'solid-pbr' | 'transmission'; // v2: 'textured'

/** Nur bei transmission — steuert Shader-Modell, nicht Millimeter. */
type GlassVariant = 'pane' | 'solid';

type MaterialPreset = {
  id: string;
  name: string;
  source: 'builtin' | 'user';
  kind: MaterialKind;
  // solid-pbr
  color?: Rgb;
  roughness?: number;   // 0–1, 3 Dezimalen UI
  metalness?: number;   // 0–1
  // transmission (Glas)
  glassVariant?: GlassVariant;  // pane = Scheibe, solid = Block/Volumen (Rahmenbalken)
  ior?: number;
  roughness?: number;
  tint?: Rgb;           // optional leichte Färbung
  // textured (später)
  albedoImageId?: string | null;
};
```

**`id`** stabil (Save/Load). **Built-ins:** `source: 'builtin'`, **nicht löschbar**, duplizierbar als User-Kopie. **User:** `source: 'user'`, editierbar, löschbar (wenn keine Referenz — oder Referenz fällt auf Fallback).

---

**Category:** Materials  
**Title:** Built-in Presets (Werkseitig)  
**Description:** Zehn Built-ins — **nicht löschbar**, IDs stabil. Acht × **`solid-pbr`** (inkl. Glossy Print); zwei × **`transmission`** (Glas-Varianten). Keine Albedo-Textur bis textured-Kind. **Millimeter gehören zur Geometrie** (Asset-Mesh), **nicht** ins Material-Preset.

| ID | Name (UI) | Typ | glassVariant | Charakter | Typische Zuweisung |
|---|---|---|---|---|---|
| `material-paper` | Paper | solid-pbr | — | Matt, warmweiß | Print-Seiten, Rückwand Picture |
| `material-gold` | Gold | solid-pbr | — | Metallisch, glänzend | Picture framed — Rahmen |
| `material-silver` | Silver | solid-pbr | — | Metallisch, kühl | Picture framed — Rahmen |
| `material-fabric` | Fabric | solid-pbr | — | Matt, strukturiert | Print-Seiten, Props |
| `material-silk` | Silk | solid-pbr | — | Weicher Glanz | Print-Seiten, Deko |
| `material-wood` | Wood | solid-pbr | — | Warmes Braun | Rahmen, Props |
| `material-concrete` | Concrete | solid-pbr | — | Grau, sehr rau | Ground, Props |
| `material-glossy-print` | Glossy Print | solid-pbr | — | Glänzendes Druckpapier | Print Front/Back |
| `material-glass-pane` | Glass (pane) | transmission | **pane** | Klare **Scheibe** — dünn, Glazing | Glazing vor dem Bild |
| `material-glass-solid` | Glass (solid) | transmission | **solid** | Klares **Volumen-Glas** — Block, Glasrahmen | Rahmen aus Glas, Glasblöcke |

**Richtwerte PBR (v1, TBD feinjustieren bei Implementierung):**

| Preset | color (RGB ~) | roughness | metalness |
|---|---|---|---|
| Paper | 0.96 / 0.95 / 0.92 | 0.92 | 0.00 |
| Gold | 1.00 / 0.77 / 0.33 | 0.25 | 1.00 |
| Silver | 0.95 / 0.95 / 0.96 | 0.20 | 1.00 |
| Fabric | 0.75 / 0.73 / 0.70 | 0.88 | 0.00 |
| Silk | 0.92 / 0.90 / 0.88 | 0.45 | 0.00 |
| Wood | 0.55 / 0.38 / 0.24 | 0.65 | 0.00 |
| Concrete | 0.62 / 0.60 / 0.58 | 0.95 | 0.00 |
| Glossy Print | 0.95 / 0.93 / 0.91 | 0.15 | 0.00 |

**Transmission (optisch — gleiche Basis, unterschiedlicher Shader-Zweig):**

| Preset | ior | roughness | tint |
|---|---|---|---|
| Glass (pane) | 1.52 | 0 | neutral |
| Glass (solid) | 1.50 | 0.04 | neutral |

**Geometrie vs. Material:** Scheibe **2 mm** und Rahmen **12 mm** tief sind **Mesh-Maße** in [`requirements-assets.md`](./requirements-assets.md) — fest im Asset. Das Material sagt nur: *so soll Glas aussehen* (IOR, Roughness, Tint). **`glassVariant: pane`** = dünne Scheibe; **`solid`** = volumetrisches Glas (Rahmenbalken, Blöcke). Engine mappt `solid` + Mesh-Tiefe intern für Transmission — User stellt **keine** Millimeter im Glass-Material ein.

**Hinweis:** Gold/Silber nutzen **Metalness-PBR** + IBL — bei [`requirements-reflections.md`](./requirements-reflections.md) Environment aktiv. Fabric/Silk/Concrete wirken in v1 **approximiert** ohne Textur; v2 textured-Kind mit Repeat/Tile → [`requirements-images.md`](./requirements-images.md).

---

**Category:** Materials  
**Title:** Built-ins — Diskussion & Abgrenzung  
**Description:**

- **Paper** — kein „Bildpapier“-Shader; mattes PBR für Kanten/Seiten/Rückwände. Bild bleibt **Image** (Cover auf Plane), nicht Material-Preset.
- **Gold / Silver** — primär **Rahmen** Picture framed; auch Print-Kanten denkbar. Kein eigener Gold-Shader — Standard `MeshStandardNodeMaterial` + hohe Metalness.
- **Fabric / Silk** — Unterscheidung: Fabric = matter, Silk = glatter (niedrigere Roughness). Anisotropie (echter Seidenglanz) **später**, nicht v1.
- **Wood** — v1 einfarbig; Maserung = textured + `albedoImageId` in v2.
- **Concrete** — für Boden/Props; Ground kann später `groundMaterialId` statt nur Farbe setzen.
- **Glass (pane) vs. Glass (solid)** — zwei Presets, ein optischer Look, zwei Shader-Zweige. **Nicht** ein Preset mit „12 mm / 2 mm“ in der Tabelle. Scheibe → `material-glass-pane` auf Glazing-Mesh; Glasrahmen → `material-glass-solid` auf Rahmen-Balken. User kann eigene Glas-Presets duplizieren (z. B. leicht milchig) — jeweils als pane oder solid anlegen.

---

**Category:** Materials  
**Title:** Add material (+)  
**Description:** User erstellt neues Preset: Typ **solid-pbr** | **transmission**. Editor solid: **Name**, **ColorPicker**, **Roughness** / **Metalness**. Editor transmission: **Variant** (Pane / Solid), **IOR**, **Roughness**, optional **Tint** — **kein** Millimeter-Feld. Jeder Slider: **`RangeSlider` + `SliderValueField`** (`valueInputLabel` + `valueInputDecimals`, `panel-field-*`) — gleiches Muster wie Ground/Lighting → [`requirements-range-slider.md`](./requirements-range-slider.md), [`requirements-look-and-feel.md`](./requirements-look-and-feel.md). **Kein** Slider ohne editierbares Input-Feld. Vorschau im Sub (später). Dropdowns können nach `glassVariant` filtern (Glazing → nur pane, Glasrahmen → nur solid) — Empfehlung UI, nicht hart im Code erzwingen.

---

**Category:** Materials  
**Title:** Zuweisung an Entities — Slots  
**Description:** Entity referenziert Presets über **Slots** (welche Mesh-Gruppe):

| assetKind | Slot | UI (Szene-Panel) | Default (v1) |
|---|---|---|---|
| `picture` | `frame` | Dropdown **Frame material** (Gold, Wood, **Glass solid**, …) | `material-gold` (TBD) |
| `picture` | `backWall` | Dropdown **Back material** | `material-paper` |
| `picture` | `screen` | **`ImageSurfaceFields`** (Finish Matt/Glossy + Emissive) in **Screen / Image** | `finish: glossy` |
| `picture` | `glazing` | Checkbox **Glazing** only — immer `material-glass-pane`, kein Dropdown | off |
| `print` | `front` / `back` (image) | **`ImageSurfaceFields`** (Finish + Emissive) statt Material-Dropdown | `finish: glossy` |
| `print` | `back` (color) | ColorPicker = Tint auf `backMaterialId` | `material-glossy-print` |
| `print` | `sides` | Dropdown **Side material** (alle 4 + top/bottom) + **Tint** pro Seite | `material-paper` |
| `smartphone` / `tablet` | `screen` | **`ImageSurfaceFields`** in **Screen / Image** | `finish: glossy` |

**`frameMaterialId`**, **`glazingMaterialId`**, **`sideMaterialId`**, … auf Entity — nicht die PBR-Werte inline. Wechsel im Dropdown → Engine rebuildet betroffene Meshes mit neuem Material.

**Bild-Flächen (Image Surfaces):** Finish + Emissive pro Face über `imageSurfaces` — **nicht** über `frontMaterialId`/`backMaterialId` im UI. Engine mappt `finish` intern auf `material-paper` / `material-glossy-print`. Vollständig → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md).

**Print — Material + Tint (v1):** Preset liefert PBR-Basis (Albedo, Roughness, Metalness). **Tint** multipliziert die Preset-Farbe pro Face (`faceTints` auf Entity). Seiten: ein `sideMaterialId` (Default Paper) + **ColorPicker als Tint** pro Seite (Left/Right/Top/Bottom). Front/Back **Image-Mode:** `ImageSurfaceFields` (Matt/Glossy + Emissive); Back **Color-Mode:** ColorPicker = Tint auf `backMaterialId`. Image-Faces: Cover-Texture über Finish-Preset-PBR (Roughness/Metalness vom Preset).

**Picture framed — Kombinationen:**

| Rahmen-Material | Glazing an | Effekt |
|---|---|---|
| Gold / Silver / Wood | aus | Klassischer Rahmen |
| Gold / Wood | an | Rahmen + Glas vor dem Bild |
| **Glass (solid)** | aus | **Glasrahmen** — volumetrische Kanten |
| Glass (solid) | an | Glasrahmen + Scheibe (`glass-pane`) |

Dropdown **Frame material** listet **alle** Presets; UI filtert optional mit Chips (Metal / Wood / Glass) — nicht v1-Pflicht.

---

**Category:** Materials  
**Title:** Store & Scene-API  
**Description:** Store: `materials: MaterialPreset[]`, `selectedMaterialId`. **Scene-API** (kein Three in UI):

- `getMaterials(): readonly MaterialPreset[]`
- `addMaterial(preset): string` / `updateMaterial(id, partial)` / `duplicateMaterial(id)` / `removeMaterial(id)` (nur user)
- `setEntityMaterial(entityId, slot, materialId)` — Engine resolved Preset → Node-Material

Subscribe wie Entities — UI Panels aktualisieren. Built-ins beim App-Start aus `MATERIAL_PRESETS` geladen.

---

**Category:** Materials  
**Title:** Engine — Material-Resolver  
**Description:** **`MaterialResolver`** (analog `ImageResolver`): `materialId` → Engine-internes `MeshStandardNodeMaterial` (oder Physical für transmission). **Cache** pro `materialId`; bei `updateMaterial` Cache invalidieren und betroffene Meshes neu binden. Owner disposen bei Remove. TSL / `MeshStandardNodeMaterial` → [`requirements-code.md`](./requirements-code.md). IBL von `scene.environment` — Gold/Silber/Silk profitieren ohne Extra-Code.

---

**Category:** Materials  
**Title:** Serialisierung  
**Description:** Projekt-Save: **Built-in IDs** referenziert; **User-Presets** voll im JSON. Entity speichert nur `materialId` pro Slot. Load: unbekannte ID → Fallback `material-paper` + Warnung in UI (später).

---

**Category:** Materials  
**Title:** Abgrenzung — Materials vs. Images vs. Colors vs. ColorPicker  
**Description:**

| | **Images** | **Materials** | **Colors** | **ColorPicker** (inline) |
|---|---|---|---|---|
| Inhalt | 2D Bitmap | Oberflächen-Look (PBR) | Name + RGB | Einzelne Farbe (Widget) |
| Referenz | `imageId` | `materialId` | keine Entity-Ref v1 | setzt `Rgb` am Aufrufer |
| Panel | Left Images | Left Materials | Left Colors | Komponente in Editors |

Print-**Front** = **Image** (Cover). Print-**Seite** = **Material** (Paper/Fabric/…). Picture-**Rahmen** = **Material** (Gold/Silver/Wood). **Colors** = benannte Swatches für ColorPicker (Tint, Licht, Himmel) — nicht für Rahmen-Oberfläche. Details → [`requirements-colors.md`](./requirements-colors.md). Kein Bild als Rahmenfarbe.

---

**Category:** Materials  
**Title:** Implementierungs-Reihenfolge  
**Description:**

1. `MaterialPreset` + Built-ins (7× solid-pbr) + Store  
2. Left **Materials** Panel (Liste + Editor)  
3. `MaterialResolver` in Engine  
4. **Picture framed:** `frameMaterialId` Dropdown (ersetzt `FRAME_COLOR`)  
5. **Print:** Seiten-Dropdown (ersetzt einzelne Side-ColorPicker optional — oder Dropdown + Override TBD)  
6. Built-ins **Glass (pane)** + **Glass (solid)** + `MaterialResolver` (transmission-Zweige)  
7. Picture framed: Glasrahmen (`glass-solid`) + optional Glazing (`glass-pane`)  
8. Ground `materialId` (optional, Ground-Farbe bleibt bis dahin)  
9. textured-Kind + Wood/Fabric/Concrete mit Bild; Frosted glass Preset (später)

**Nicht im Code raten** — Diary bei Architektur-Freigabe.

---

**Category:** Materials  
**Title:** Offene Punkte (TBD)  
**Description:** Default Rahmen Picture framed: Gold vs. Wood? Print-Seiten: nur Dropdown oder Dropdown + ColorPicker-Override? Per-Slot vs. ein Material für alle Print-Seiten? Mini-Viewport-Preview im Materials-Panel? Duplicate Built-in → User-Kopie Naming. Performance bei vielen Entities + Material-Updates (debounce).

---

**Category:** Materials  
**Title:** v2 — Textured Materials (Überblick)  
**Description:** **Ziel:** Oberflächen mit **sichtbarer Struktur**, die **über Licht** (Directional, Multi-Light, IBL) erlebbar sind — nicht nur eingefärbte Flächen. Betrifft Built-ins **Paper, Wood, Fabric, Silk, Concrete, Gold, Silver** (+ **Gold brushed**, **Silver brushed**) sowie **Glas** (Surface-Detail). v1 **`solid-pbr`** bleibt nur für **Glossy Print** und einfache User-Farb-Presets. v2 führt **`textured`** als eigenes `MaterialKind` ein. **Maps werden generativ on-the-fly** im Shader (TSL) erzeugt — **keine** Material-Texturen in der Images-Bibliothek, **kein** User-Upload von Normal/Albedo-Maps. Images bleibt für **Fotos** (Print-Front, Ground-Foto, …). Kein separates „Bump Map"-Feld — PBR-Standard: **Normal** (+ optional **Roughness-Variation**) aus Procedural. Abhängigkeit: IBL aktiv → [`requirements-reflections.md`](./requirements-reflections.md). Tile über UV, **kein Stretch** → [`image-aspect-ratio.mdc`](../.cursor/rules/image-aspect-ratio.mdc).

---

**Category:** Materials  
**Title:** v2 — Datenmodell — `textured`  
**Description:** Erweiterung `MaterialKind`:

```ts
type MaterialKind = 'solid-pbr' | 'transmission' | 'textured';

/** Procedural generator profile — resolved at render time via TSL, not stored as bitmap. */
type ProceduralProfileId =
  | 'paper-grain'
  | 'wood-mahogany'
  | 'fabric-linen'
  | 'silk-fine'
  | 'concrete-porous'
  | 'metal-polished'
  | 'metal-brushed'
  | 'glass-surface';

type MaterialPreset = {
  // … bestehende Felder …
  kind: 'textured';
  proceduralProfile: ProceduralProfileId;
  color?: Rgb;              // Tint / Basis-Albedo (multipliziert mit procedural)
  roughness?: number;       // Basis-Roughness; procedural kann lokal modulieren
  metalness?: number;
  normalScale?: number;     // 0–2, Default 1 — Stärke des procedural Normal
  tileScale?: number;       // UV-Repeat / Frequenz, Default materialabhängig
  anisotropy?: number;      // 0–1 — Silk, metal-brushed
  anisotropyRotation?: number; // 0–360°
  seed?: number;            // optional — Variation bei Duplicate (Default aus id hash)
};
```

**`transmission`** optional erweitert (Glas):

```ts
// zusätzlich bei kind === 'transmission'
proceduralSurfaceProfile?: 'glass-surface'; // Default für Glass-Built-ins
surfaceNormalScale?: number;  // Default 0.15 — sehr subtil für klares Glas
```

Built-in Presets: festes `proceduralProfile` (nicht editierbar). User-Presets: **Duplicate** eines Built-ins → gleiches Profile, editierbare Parameter (`color`, `tileScale`, `seed`, …). **Kein** `imageId` für Material-Maps — Abgrenzung Images → [`requirements-images.md`](./requirements-images.md).

---

**Category:** Materials  
**Title:** v2 — Map-Rollen & Lichtverhalten  
**Description:**

| Map | Zweck | Licht-Effekt |
|---|---|---|
| **Albedo** | Farbe, Maserung, Webmuster | Kein eigenes Licht — Basis für diffuse Farbe |
| **Normal** | Mikro-Relief (Fasern, Poren, Kratzer, Maserung) | Spekular und diffuse Reaktion **wechseln mit Blickwinkel** |
| **Roughness** (Map) | Lokale Glanz-Variation | Matt vs. glänzend innerhalb einer Fläche |
| **Anisotropie** | Richtungsabhängiger Glanz | Streifen-Reflexionen (Seide, gebürstetes Metall) — kein Ersatz für Normal |

**Nicht v2:** Height/Displacement (Geometrie), AO-Map (Schatten haben wir per Shadow Mapping), separater Bump-Map-Slot, **Bitmap-Map-Upload** durch User. **v2-Kern:** Procedural Noise / Muster in TSL (`three/tsl`) — pro `ProceduralProfileId` ein Generator-Modul.

---

**Category:** Materials  
**Title:** v2 — Built-in Presets & Procedural Profiles  
**Description:** Betroffene Built-ins wechseln von `solid-pbr` → **`textured`** (IDs stabil). Struktur kommt aus **`proceduralProfile`** — generiert zur Laufzeit, keine Bitmap-Assets. **Zwei neue Built-ins:** `material-gold-brushed`, `material-silver-brushed`. **Nur ein Wood:** `material-wood` = Mahagoni — keine Eiche/Walnuss-Varianten in v2.

| Preset-ID | `proceduralProfile` | Charakter / Skalierung | Anisotropie |
|---|---|---|---|
| `material-paper` | `paper-grain` | **Papiermaserung** — feine Faserstruktur, sehr subtil; Print-Seiten, Rückwände | 0 |
| `material-wood` | `wood-mahogany` | Mahagoni-Maserung — warme Bänder, Poren; `tileScale` ~4–8 auf Rahmen | 0 |
| `material-fabric` | `fabric-linen` | Sichtbares Webmuster (Leinen); Normal moderat | 0 |
| `material-silk` | `silk-fine` | Feineres Muster als Fabric; niedrigere Normal-Stärke | **0.6–0.85** |
| `material-concrete` | `concrete-porous` | Porös, uneben; Ground/Props | 0 |
| `material-gold` | `metal-polished` | Poliert — Mikro-Kratzer; Farbe aus Preset-`color` | 0 |
| `material-gold-brushed` | `metal-brushed` | Gebürstetes Gold — Streifenglanz | **~0.7** |
| `material-silver` | `metal-polished` | Wie Gold, kühlere `color` | 0 |
| `material-silver-brushed` | `metal-brushed` | Gebürstetes Silber | **~0.7** |
| `material-glass-pane` | `glass-surface` | Sehr subtile Welligkeit / Mikro-Kratzer auf Transmission | — |
| `material-glass-solid` | `glass-surface` | Wie pane, etwas stärkere `surfaceNormalScale` erlaubt | — |

**`material-glossy-print`** bleibt **`solid-pbr`** (Glanz über niedrige Roughness, kein Fasermuster). **Entscheidung:** Keine Wood-Varianten — ein Wood reicht (Mahagoni).

---

**Category:** Materials  
**Title:** v2 — Procedural Generator (Engine)  
**Description:** Modul `src/materials/procedural/` (o. ä.): ein Generator pro `ProceduralProfileId`, TSL-Funktionen → Albedo-Variation, Normal, Roughness-Modulation aus UV + `tileScale` + `seed`. **`MaterialResolver`** ruft Generator auf, baut Node-Material — **kein** `TextureLoader` für Preset-Struktur. Cache: ein Engine-Material pro `(materialId, tint-hash)`; bei `updateMaterial` invalidieren. **Kein Three in UI.** Generatoren deterministisch pro `seed` (Duplicate mit neuem Seed = leicht andere Maserung). Repeat/Tile über UV, nicht über Stretch. Keine Bitmap-Dispose-Logik nötig; Node-Graph wird bei Invalidate neu gebaut.

---

**Category:** Materials  
**Title:** v2 — UV / Tile / Aspect Ratio  
**Description:** Texturierte Materialien auf Entity-Meshes (Rahmen, Print-Seiten, Ground): Mapping-Modus **`tile`** (Repeat) als Default. **`tileScale`** im Preset (ein Wert für U+V; später U/V getrennt TBD). **Nie** Bilder/Maps verzerren — [`image-aspect-ratio.mdc`](../.cursor/rules/image-aspect-ratio.mdc). Cover/Contain nur wenn explizit für nicht-quadratische Flächen dokumentiert (z. B. einseitige Print-Plane). Rahmen-UVs: konsistente Welt-Skalierung anstreben (Rahmen 30 cm vs. 3 m → ähnliche Maserungs-Dichte via `tileScale` pro Entity-Slot optional später; v2: Preset-Default reicht).

---

**Category:** Materials  
**Title:** v2 — UI — Materials Editor (textured)  
**Description:** Left Sub, Editor bei `kind === 'textured'`:

- **Basis:** Name, **Profile** (read-only Label, z. B. „Paper grain", „Wood mahogany"), **Color Tint** (ColorPicker)
- **Struktur:** `normalScale` (`RangeSlider` 0–2, Input-Label **Normal**), `tileScale` (`RangeSlider`, Input-Label **Tile**, materialabhängiger Default) — jeweils mit `SliderValueField`
- **Metall:** `metalness`, `roughness` (Basis)
- **Seide / gebürstetes Metall:** Sektion **Anisotropy** — `anisotropy`, `anisotropyRotation` (Grad)
- **Transmission + Surface:** Sektion **Surface** — `surfaceNormalScale` (Glas)
- **Variation (User-Presets):** `seed` — optional „Randomize" Button

**Kein Map-Picker, kein Images-Link** für Material-Struktur. **Duplicate** → User-Kopie mit editierbaren Parametern, gleiches `proceduralProfile`. Listen-Swatch: **procedural Preview** (kleines gerendertes Tile oder Shader-Thumbnail) — nicht nur Farbviereck; Fallback Farbe + Profil-Label.

---

**Category:** Materials  
**Title:** v2 — Engine — MaterialResolver (textured)  
**Description:** Neuer Zweig `createTexturedMaterial(preset, options)`:

- `proceduralProfile` → TSL-Generator (`getProceduralMaterialNodes(profile, params)`)
- `MeshStandardNodeMaterial` oder `MeshPhysicalNodeMaterial` (wenn `metalness` hoch oder Anisotropie)
- Procedural Albedo × Preset-`color` × Entity-`tint` → diffuse Basis
- Procedural Normal → `normalNode`, Skala `normalScale`
- Procedural Roughness-Modulation + Preset-`roughness` als Basis
- Anisotropie → Physical-Material (`anisotropy`, `anisotropyRotation`) — Silk, gold-brushed, silver-brushed
- IBL (`scene.environment`) automatisch — Gold/Silber/Silk/Paper ohne Extra-Code

**Transmission:** `createTransmissionMaterial` + procedural `glass-surface` Normal (Skala `surfaceNormalScale`). `glassVariant` unverändert.

Tint auf Entity-Slots (`faceTints`) multipliziert weiterhin Preset-Farbe — wie v1 solid-pbr.

---

**Category:** Materials  
**Title:** v2 — Serialisierung  
**Description:** Built-in Presets: nur **ID** + User-Overrides (z. B. `tileScale`, `seed`). User-`textured`-Presets: `proceduralProfile` + Parameter (`color`, `roughness`, `normalScale`, `tileScale`, `seed`, …) — **keine** Bild-Refs. Load: unbekanntes `proceduralProfile` → Fallback `paper-grain` + Warnung.

---

**Category:** Materials  
**Title:** v2 — Implementierungs-Reihenfolge  
**Description:**

1. `procedural/` — Referenz-Generator **`wood-mahogany`** (TSL: Albedo-Bänder, Normal, Roughness)
2. `MaterialKind: 'textured'` + `ProceduralProfileId` + Store / Serialisierung
3. `MaterialResolver` — textured-Zweig (procedural Nodes statt Bitmap)
4. Generator **`paper-grain`** + Built-in `material-paper` migrieren
5. Weitere Generatoren: fabric-linen, silk-fine, concrete-porous, metal-polished, metal-brushed
6. Neue Built-ins: `material-gold-brushed`, `material-silver-brushed`
7. Built-ins migrieren: Wood, Fabric, Silk, Concrete, Gold, Silver → `textured`
8. Anisotropie — Silk + gold-brushed + silver-brushed
9. Transmission — procedural `glass-surface` für Glass pane/solid
10. Materials Panel — Editor (ohne Map-Picker) + procedural Swatch-Preview
11. Ground `materialId` mit textured Concrete (optional parallel zu 7)
12. Mini-Viewport-Preview (optional, nach 10)

**Freigabe:** User bestätigt v2-Blöcke. Diary-Eintrag bei Implementierungsstart.

---

**Category:** Materials  
**Title:** v2 — Entscheidungen (bestätigt)  
**Description:**

- **Paper:** `textured` mit `paper-grain` — Papiermaserung Pflicht, nicht vergessen.
- **Gold brushed / Silver brushed:** jeweils **eigenes Built-in** (`material-gold-brushed`, `material-silver-brushed`), Profil `metal-brushed`.
- **Wood:** **nur ein** Preset (`material-wood` = Mahagoni) — keine Varianten in v2.
- **Maps:** **generativ on-the-fly** (TSL) — **nicht** in Images-Bibliothek, kein User-Map-Upload in v2.

---

**Category:** Materials  
**Title:** v2 — Offene Punkte (TBD)  
**Description:** `tileScale` pro Entity-Slot vs. nur Preset? Procedural Preview in Liste: live Shader-Tile vs. statisches Render beim Preset-Wechsel? Performance: Cache-Key pro `(materialId, tint, seed)` — ausreichend? Print Glossy später auch feine Struktur oder bewusst glatt lassen? Optional später: Bitmap-Override als Advanced (bewusst **nicht** v2).

---

**Category:** Materials  
**Title:** Built-in-Namen & Listen-Reihenfolge (Print-Gruppe)  
**Description:** UI-Namen (IDs stabil): **`material-paper`** → **Print Matt**; **`material-glossy-print`** → **Print Glossy**. Beide bilden die **Print-Gruppe** — in der Materials-Liste **zuerst** (Matt, dann Glossy), danach Rahmen/Flächen (Gold, Silver, Wood, …), Glas zuletzt. Print Matt = matte Druck-/Kantenoberfläche (Seiten, Rückwände); Print Glossy = glänzende Druckfläche (Front/Back). Kein separates „Paper"-Preset mehr in der UI.

---

**Category:** Materials  
**Title:** Bild-Flächen — Finish & Emissive (implementiert)  
**Description:** Alle Asset-Bildflächen (Picture, Handheld, Print Front/Back-Image) nutzen **`imageSurfaces[faceId]`** — UI-Komponente **`ImageSurfaceFields`**: Finish (Matt/Glossy), Emissive (Checkbox + Intensity). Engine: `finishToMaterialId()` → `material-paper` / `material-glossy-print`; Emissive = `colorNode × intensity` (kein ColorPicker). Legacy `frontMaterialId`/`backMaterialId` → Migration beim `addEntity`. `PRINT_SURFACE_MATERIAL_IDS` nur Engine-intern. → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md).

---

**Category:** Materials  
**Title:** Metall-Built-ins — Chrome, poliert, gebürstet  
**Description:** **`material-silver`** entfernt → **`material-chrome`** (Load-Migration). Polierte Metalle: **Gold**, **Chrome** — `textured` + `metal-polished`, Roughness **0.05–0.10**, metalness **1.0**, subtile Mikro-Normal (TSL). Gebürstet: **Gold Brushed** (`material-gold-brushed`), **Aluminum Brushed** (`material-aluminium-brushed`, UI US) — `metal-brushed` + Anisotropie **~0.35** (Rotation aus Tangent-U am Rahmen). Listen-Reihenfolge nach Print-Gruppe: Gold, Chrome, Gold Brushed, Aluminum Brushed, dann Wood, Fabric, … IBL Pflicht für photorealistischen Glanz.

---

**Category:** Materials  
**Title:** Stand Implementierung 2026-10-08 — Built-ins (aktuell)  
**Description:** Ergänzt/ersetzt veraltete v1-Tabellen oben und teilweise v2-Planungsstände. Built-ins in **Listen-Reihenfolge** (`src/data/material-presets.ts`):

| ID | UI-Name | kind | proceduralProfile | Anisotropie |
|---|---|---|---|---|
| `material-paper` | Print Matt | textured | `paper-grain` | — |
| `material-glossy-print` | Print Glossy | solid-pbr | — | — |
| `material-gold` | Gold | textured | `metal-polished` | — |
| `material-chrome` | Chrome | textured | `metal-polished` | — |
| `material-gold-brushed` | Gold Brushed | textured | `metal-brushed` | ~0.35 |
| `material-aluminium-brushed` | Aluminum Brushed | textured | `metal-brushed` | ~0.35 |
| `material-fabric` | Fabric | solid-pbr | — | — |
| `material-silk` | Silk | solid-pbr | — | — |
| `material-wood` | Wood | textured | `wood-mahogany` | — |
| `material-concrete` | Concrete | solid-pbr | — | — |
| `material-glass-pane` | Glass (pane) | transmission | — | — |
| `material-glass-solid` | Glass (solid) | transmission | — | — |

**Migration:** `material-silver` → `material-chrome` beim Load (`migrateMaterialId`). **`material-silver-brushed`** war nur Planung — implementiert ist **`material-aluminium-brushed`**.

**Noch solid-pbr (v2 offen):** Print Glossy, Fabric, Silk, Concrete. **Print Matt:** `textured` + `paper-grain` (mm-Sampling via `positionLocal`, `tileScale` = repeats/m). **Ground:** alle procedural Built-ins mit meter-konsistentem `tileScale` → [`requirements-ground.md`](./requirements-ground.md).

---

**Category:** Materials  
**Title:** Picture framed — Rahmen-UVs & Procedural (Implementierung)  
**Description:** Rahmen nutzt **ein** extrudiertes Mesh mit **Perimeter-UVs** — [`requirements-assets-picture-framed.md`](./requirements-assets-picture-framed.md) (Extrudierter Rahmen). Procedural-Materialien am Rahmen:

- **Wood** (`wood-mahogany`): Grain entlang `UV.u` (Balkenmitte um Opening).
- **Gold / Chrome** (`metal-polished`): Mikro-Normal + IBL-Glanz; kein fester `anisotropyRotation`.
- **Gold Brushed / Aluminum Brushed** (`metal-brushed`): `anisotropyNode` entlang Tangent-U (= Grain-Richtung); **kein** H/V-`grainAlongU`-Split, **keine** zweite Material-Instanz pro Rahmen.

`tileScale` / `seed` aus Preset steuern Feinstruktur-Dichte. Alle vier Rahmenseiten: gleiche Bürstungsrichtung relativ zur Kante (rechtwinklig zur sichtbaren Kantenlänge).

---

**Category:** Materials  
**Title:** Wood — Soft + Porous (Built-ins)  
**Description:** Zwei Wood-Presets für Rahmen/Props. **Ersetzt** frühere Entscheidung „nur ein Wood (Mahagoni)".

| ID | UI-Name | `proceduralProfile` | Charakter |
|---|---|---|---|
| `material-wood` | Wood Soft | `wood-soft` | Weichholz/Fichte — Jahresringe + feine Poren; helles Gelbbraun; `roughness` ~0.42; helle Bänder **erhaben** + glänzender |
| `material-wood-porous` | Wood Porous | `wood-porous` | Gestretchte dunkle Poren (~0,6–1 mm, ~8–12 mm Abstand); `roughness` ~0.48; dunkle Spots **vertieft** + matter |

Beide: `textured`, `MeshPhysicalNodeMaterial`, **Clearcoat** ~0.08 (Lack-Glanz). **Sampling:** Rahmen → `uv` (Perimeter-UV in m); **Ground** → `planar-meters` (gleiches `tileScale` = repeats/m) → [`requirements-ground.md`](./requirements-ground.md). Migration: `wood-mahogany` → `wood-soft`.

**Zuweisung Wine bottle (Ziel):** Korken Default **`material-wood-porous`** (`corkMaterialId`). **Kapsel-Folie** + **Kapsel-Scheibe:** Default **`material-gold-brushed`** (`capsuleFoilMaterialId`, `capsuleDiscMaterialId`) — User kann im Geometries-Dropdown tauschen → [`requirements-assets-wine-bottle.md`](./requirements-assets-wine-bottle.md).

---

**Category:** Materials  
**Title:** Transmission (Glas) vs. Schatten  
**Description:** **`transmission`**-Presets (`material-glass-pane`, `material-glass-solid`) sind **visuell** lichtdurchlässig — physikalisch korrekt für Glas. **Schatten-Verhalten** (Engine, nicht Material-Preset):

| Rolle | Material | castShadow | receiveShadow | Default |
|---|---|---|---|---|
| Rahmen, Print, Back-Wall | `solid-pbr` / `textured` | ja | ja | immer |
| Glazing (Picture) | `transmission` (pane) | **nein** | ja | **off** (`glazingEnabled`) |

Opake Materialien **blockieren** Licht im Sinne von Shadow Mapping. Glazing blockiert **nicht** in der Shadow Map (dünne Scheibe → Artefakte); bei aktivem Glazing scheint Licht **sichtbar** durch, ohne dass Glas einen harten Schatten wirft. **Kein** `transmission` auf Print/Rahmen — nur explizites Glazing-Mesh. Vollständig → [`requirements-shadows.md`](./requirements-shadows.md).

---

**Category:** Materials  
**Title:** Plastic Built-ins — Matte & Smooth  
**Description:** Zwei neue Built-in-Presets für **Kunststoff** (Spritzguss, Gehäuse, matte/schwarze Props). Beide **`solid-pbr`**, **nicht löschbar**, IDs stabil. **Gemeinsame Default-Farbe:** dunkelgrau, fast schwarz — `color` **{ r: 0.13, g: 0.13, b: 0.14 }** (neutral-kühl; per ColorPicker editierbar). **Unterschied nur Roughness + Clearcoat** — analog Print Matt / Print Glossy als Paar.

| ID | UI-Name | kind | roughness | metalness | clearcoat | clearcoatRoughness | Charakter |
|---|---|---|---|---|---|---|---|
| `material-plastic-matte` | Plastic Matte | solid-pbr | **0.72** | 0 | — | — | Matter ABS/Spritzguss — diffus, kein Spiegelglanz |
| `material-plastic-smooth` | Plastic Smooth | solid-pbr | **0.18** | 0 | **0.35** | **0.12** | Glatter/lackierter Kunststoff — spiegelnder Glanz über Clearcoat |

**Listen-Reihenfolge:** neue **Plastic-Gruppe** direkt **nach** Metall (Gold … Aluminum Brushed), **vor** Fabric — also: … Aluminum Brushed → **Plastic Matte**, **Plastic Smooth** → Fabric, Silk, …

**Typische Zuweisung:** Handheld-Bezel (`frameMaterialId`), Seitentasten (`sideButtonMaterialId`), schwarze Rahmen/Props, Gerätegehäuse. **Nicht** in Print-Surface-Dropdown (bleibt nur Print Matt / Print Glossy).

**Handheld-Defaults:** **unverändert** — Frame + Side button bleiben `material-aluminium-brushed`; Plastic nur manuell wählbar.

**Abgrenzung:** Kein Metall (`metalness` immer 0). Kein `textured` / kein Procedural-Profil in v1 — reines PBR reicht für Mockups. Später optional `plastic-die` Profil (TBD).

---

**Category:** Materials  
**Title:** Datenmodell — Clearcoat (solid-pbr)  
**Description:** Optional auf `MaterialPreset` (nur relevant wenn gesetzt):

```ts
type MaterialPreset = {
  // … bestehende Felder …
  clearcoat?: number;           // 0–1
  clearcoatRoughness?: number;  // 0–1
};
```

**Engine:** `createSolidPbrMaterial` — wenn `clearcoat > 0` → **`MeshPhysicalNodeMaterial`** statt `MeshStandardNodeMaterial`; `clearcoat` / `clearcoatRoughness` aus Preset setzen. Sonst unverändert Standard. Gleiches Muster wie Wood (`createTexturedMaterial` setzt Clearcoat hardcoded) — hier **Preset-getrieben**, damit User-Duplikate Clearcoat editieren können (später im Editor). Built-in **Plastic Smooth** ist Referenz-Preset.

---

**Category:** Materials  
**Title:** Implementierung — Plastic Built-ins  
**Description:**

1. `material-ids.ts` — `MATERIAL_PLASTIC_MATTE_ID`, `MATERIAL_PLASTIC_SMOOTH_ID`
2. `material-presets.ts` — zwei Built-ins in Listen-Reihenfolge (nach Aluminum Brushed)
3. `material-types.ts` — `clearcoat?`, `clearcoatRoughness?` auf `MaterialPreset`
4. `material-resolver.ts` — `createSolidPbrMaterial`: Physical-Zweig bei `clearcoat > 0`
5. Materials Panel — keine Slot-Filter; Presets erscheinen automatisch in allen Material-Dropdowns
6. **Keine** Änderung an `defaultHandheldMaterials()` oder anderen Entity-Defaults

**Freigabe:** User bestätigt Docs → Implementierung. Diary-Eintrag bei Code-Start.

---

**Category:** Materials  
**Title:** Glass — Clear vs. Frosted (Built-ins)  
**Description:** Fünf **`transmission`**-Built-ins — drei **klar** (pane, solid, wine bottle), zwei **milchig/satiniert**. **Roughness** ist der primäre Unterscheidungs-Parameter; kein separater Shader. **Thickness** kommt aus **Geometrie** (`meshDepthM` beim Resolve), Fallback **2 mm** — gilt für **pane** und **solid** gleichermaßen (Handheld 0,4 mm / 1 mm, Picture Glazing 2 mm, Glasrahmen 12 mm, Weinflasche **2,5 mm** Wand).

| ID | UI-Name | glassVariant | Charakter | ior | roughness | tint |
|---|---|---|---|---|---|---|
| `material-glass-pane` | Glass (pane) | pane | **Kristallklar** — Glazing, dünne Scheibe | 1.52 | **0** | neutral |
| `material-glass-solid` | Glass (solid) | solid | **Kristallklar** — Volumen, Glasrahmen | 1.52 | **0.005** | neutral |
| `material-glass-wine-bottle` | Glass (wine bottle) | solid | **Flaschengrün** — Volumen (Weinflasche) | 1.52 | **0.05** | **`#176132`** |
| `material-glass-frosted-pane` | Glass Frosted (pane) | pane | **Milchglas / satiniert** — Scheibe | 1.52 | **0.35** | neutral |
| `material-glass-frosted-solid` | Glass Frosted (solid) | solid | **Milchglas** — Volumen | 1.52 | **0.40** | neutral |

**Engine — zwei Render-Zweige:**

1. **Display Glazing** (`surfaceRole: displayGlass` auf Glazing-Caps — Picture + Handheld, nur **`glassVariant: pane`**):  
   - **Clear** (roughness &lt; 0.1): **`createDisplayGlazingMaterial`** — **kein** `transmission`; Clearcoat + leichte Opacity für Reflexion; Bild dahinter bleibt **scharf** (kein Viewport-Mip-Blur). **`solid`** (inkl. wine bottle) bleibt **`createTransmissionMaterial`**, auch bei `displayGlass`.
   - **Frosted** (roughness ≥ 0.1): **`createTransmissionMaterial`** mit echter `meshDepthM`-Thickness — Milchigkeit über Transmission + hohe Roughness.

2. **Volumen-Glas** (Glasrahmen, Blöcke, `glass-solid` ohne `displayGlass`): **`createTransmissionMaterial`** — bei Clear: `specularIntensity: 1`, `side: DoubleSide`, `attenuationColor` weiß, `attenuationDistance: Infinity`.

**Display-Glazing-Mesh:** Nur auf **Extrude-Caps** (Group 0); **`depthWrite: true`**; Seitenwände (Group 1) = **`frameMaterial`**. → [`requirements-assets-devices-handheld.md`](./requirements-assets-devices-handheld.md) (Multi-Material-Extrude).

**Abgrenzung:** Clear ≠ Frosted — bewusst getrennte Presets, nicht User-Duplicate-Pflicht. Entity-Defaults unverändert (`material-glass-pane` = klar). Frosted manuell oder per Dropdown (`filterKind: transmission`). v2 **`glass-surface`** Procedural (Mikro-Kratzer) bleibt separater Schritt — nicht Ersatz für Frosted.

**Listen-Reihenfolge:** … Glass (pane), Glass (solid), Glass (wine bottle), Glass Frosted (pane), Glass Frosted (solid).

**Glass (wine bottle):** Built-in **`material-glass-wine-bottle`** — **implementiert** in [`material-presets.ts`](../../src/data/material-presets.ts). Resolve: **`meshDepthM = wallThicknessM × WINE_BOTTLE_GLASS_TRANSMISSION_MESH_DEPTH_FACTOR`** (0,4 × Default 2,5 mm). Details → [`requirements-assets-wine-bottle.md`](./requirements-assets-wine-bottle.md).

---

**Category:** Materials  
**Title:** Procedural — tileScale & Sampling-Räume (Implementierung)  
**Description:** Procedural **`textured`**-Presets teilen **`tileScale`** = **Wiederholungen pro Meter** auf **meter-gemappten** Koordinaten — nicht „UV 0–1 über beliebige Mesh-Größe“. Zentrale Logik: `resolveProceduralSamplingSpace` + `buildProceduralSampleUv` in `src/materials/procedural/`.

| `surfaceRole` (Resolve) | `samplingSpace` | Koordinaten | Typische Meshes |
|---|---|---|---|
| `frame` | `uv` (+ `grainAlongU`) | Perimeter-`UV.u` in m, `UV.v` quer | Picture-Frame, Device-Frame |
| `ground` | `planar-meters` | `positionLocal.xy` in m | Ground-Plane (`ground-plane.ts`) |
| `default` | `uv` | Mesh-UV | Sonstige (später ggf. erweitern) |

**Profil-Ausnahme:** `paper-grain` → immer **`planar-meters`** (Print-Seiten, Ground, auch am Rahmen irrelevant).

**MaterialResolver:** `createMaterialFromPreset` mappt `surfaceRole: 'ground'` in den textured-Zweig; `createGroundSurfaceMaterial` setzt `ground` automatisch. Wood/Metall am Boden: gleiche Preset-`tileScale`-Zahl wie am Rahmen → gleiche sichtbare Maserungs-/Bürstungsgröße.

**Nicht-Ziel (v1):** Triplanar / World-Space-Grain auf beliebigen Box-Faces (`default`) — Diary verworfen; Ground + Frame sind die referenzierten meter-korrekten Flächen.

---

**Category:** Materials  
**Title:** Image surface — Preset-Farbe als Face-Kopie (Welle 3a, 2026-10-10)  
**Description:** **`imageSurfaces[faceId].imageMaterialId`** + **`imageAlbedoColor`**: bei Material-Dropdown-Wechsel wird **`preset.color`** (Bibliotheks-Default) auf den Face kopiert; Render nutzt die **kopierten** RGB-Werte × Bild-Textur — **nicht** live die Preset-Farbe in der Materials-Bibliothek. Vorbereitung für globales Entity-`albedoColor`-Modell (Übergangsdoc §2). **Transmission**-Presets sind auf Bildflächen **nicht** im Dropdown.

---
