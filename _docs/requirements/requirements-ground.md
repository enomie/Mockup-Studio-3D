# Ground — Boden-Einstellungen

Boden / Arbeitsfläche — Material aus der **Materials Library**, Sichtbarkeit, Schatten, Planar Mirror. UI: **Sektion „Ground"** im **Environment Sub-Panel** (Right Main → Environment). Bezüge: [`requirements-environment.md`](./requirements-environment.md), [`requirements-materials.md`](./requirements-materials.md), [`requirements-reflections.md`](./requirements-reflections.md).

**Bestand (Inventur):** `createGroundPlane()` in `src/render/ground-plane.ts`, `GroundMaterial` (`MeshStandardNodeMaterial` + TSL + optional Planar Mirror), fixed Plane, Physics-Ground in Rapier — **erweitern**, nicht neu bauen.

**Status:** Material-Dropdown (Library), Receive shadows, Mirror floor live. Kein eigener Color/Roughness/Metalness/Opacity/Emissive am Boden.

**v1-Scope:** `materialId`, Visible, Receive shadows, Mirror floor + Mirror opacity. **Bild / Textur / Mapping** → später (Abschnitt „Später — Bild & Textur"). IBL → Environment [`requirements-reflections.md`](./requirements-reflections.md).

---

**Category:** Ground  
**Title:** Panel-Platzierung (UI)  
**Description:** **Untersektion „Ground"** im **Environment Sub-Panel** (`EnvironmentSubPanel` / `GroundSettingsSection`). Scrollbarer Inhalt gemeinsam mit Sky, Reflections, Fog. Ground ist **nicht platzierbar** (fixed infinite plane) — [`requirements-scene-placement.md`](./requirements-scene-placement.md). Gebündelte Looks über Left **Environments** → [`requirements-environments.md`](./requirements-environments.md).

---

**Category:** Ground  
**Title:** Sichtbarkeit  
**Description:** **Visible:** **Eye-Icon** am **`scene-entity-block`-Header** (Ground-Block). `mesh.visible = false` im Render; Physics-Collider unverändert. Default: **sichtbar**. Body-Controls disabled wenn Eye aus.

---

**Category:** Ground  
**Title:** Material — Library-Dropdown  
**Description:** **`PanelSelect`** mit allen Materialien aus dem App-Store (Built-ins + User), gleiche Namen wie im Materials-Panel. Setzt `ground.materialId` → Store → Scene-API → `GroundMaterial` via **MaterialResolver** (Nodes vom Preset auf `GroundMaterial`).

**Default:** **Print Matt** (`material-paper` / `MATERIAL_PAPER_ID`).

**Transmission-Presets** (Glass, Frosted, …) sind im Dropdown wählbar; am Boden werden sie **opaque als Solid-PBR** gerendert (kein Transmission / kein Display-Glazing), um Clipping und Schattenglas-Artefakte zu vermeiden.

Boden ist **immer opaque** (`opacity = 1`, `transparent = false`) — kein Ground-Opacity-Slider.

PBR-Feintuning nur über die **Materials Library** (Preset bearbeiten oder anderes Preset wählen).

**Procedural (Wood, Metall, Print Matt):** Mustergröße folgt dem Preset-**`tileScale`** (Wiederholungen pro Meter) — identisch zur Wirkung am Rahmen; technisch **`planar-meters`** auf der Ground-Plane, nicht Mesh-UV. Details → Abschnitt „Procedural tiling" unten; Querschnitt → [`requirements-materials.md`](./requirements-materials.md) (Procedural — tileScale & Sampling).

---

**Category:** Ground  
**Title:** Receive shadows & Cast  
**Description:** **Receive shadows** — Checkbox (default **on**), steuert `mesh.receiveShadow`.

**Cast shadows:** Boden **wirft nicht** (`castShadow = false`) — [`requirements-shadows.md`](./requirements-shadows.md). Asset-Kontaktschatten am Boden: Engine-Bias `SHADOW_DEPTH_BIAS` / `SHADOW_NORMAL_BIAS` = **0** (kein negatives Depth-Bias — Peter Panning).

**Category:** Ground  
**Title:** Export (Contact shadows)  
**Description:** PNG **Contact shadows only** vs. Eye **Visible** — nur [`requirements-export.md`](./requirements-export.md) (Ground-Panel steuert Szene, nicht Export-Matte).

---

**Category:** Ground  
**Title:** Mirror floor (Planar)  
**Description:** Section **Mirror** im Ground-Block: Toggle **Mirror floor**, **Mirror opacity** (`RangeSlider` + Input, 0–1, Step 0.001, 3 Dezimalen). Spec → [`requirements-reflections.md`](./requirements-reflections.md). Mix in `GroundMaterial.setupOutput()`.

---

**Category:** Ground  
**Title:** Engine & Scene-API  
**Description:** `setGround(partial: GroundSettings)` — kein Three in UI.

```ts
type GroundSettings = {
  visible: boolean;
  materialId: string;
  receiveShadow: boolean;
  mirrorEnabled: boolean;
  mirrorOpacity: number; // 0–1
};
```

`EnvironmentSystem` + `GroundMaterial.applyMaterialPreset`. Physics-Collider unverändert.

**Migration:** Alte Saves ohne `materialId` → Fallback **Print Matt**; veraltete Felder (`color`, `roughness`, `metalness`, `opacity`, `emissiveColor`, `emissiveIntensity`) ignorieren.

---

**Category:** Ground  
**Title:** Serialisierung  
**Description:** Alle `GroundSettings`-Felder in **Scene Save** und **Environment-Snapshots** (`materialId` statt inline PBR-Farbe).

---

**Category:** Ground  
**Title:** Panel — Wireframe (Text)  
**Description:**  
```text
┌ Ground ───────────────────────────── [eye] ┐
│ Material          [ Print Matt      ▼]    │
│ Receive shadows              [x]            │
│ ─── Mirror ───                              │
│ Mirror floor                 [ ]            │
│ Mirror opacity                                │
│ [====================●]                   │
│ Opacity                [1.000]              │
└─────────────────────────────────────────────┘
```

---

**Category:** Ground  
**Title:** Später — Bild & Textur (nicht v1)  
**Description:** Use image, Mapping, Repeat, Tint, `groundImageId` — siehe frühere Planung; `GroundSettings` dann erweitern. [`requirements-images.md`](./requirements-images.md).

---

**Category:** Ground  
**Title:** Procedural tiling (Materials Library)  
**Description:** Textured / procedural Presets am Boden nutzen **`planar-meters`**: Shader sampelt in **`positionLocal.xy`** (Meter auf der horizontalen Ground-Plane), **nicht** über Standard-Mesh-UV (0–1 über die gesamte ~5 km `PlaneGeometry` — dort würde Wood/Metall nur als große, unscharfe Bänder erscheinen).

**`tileScale`** im Preset = **Wiederholungen pro Meter** — dieselbe Bedeutung wie am Picture-Frame (Perimeter-`UV.u` in Metern). Wood Soft/Porous, Gold/Aluminum Brushed, Chrome/Gold polished, Print Matt (`paper-grain`) am Boden = gleiche Feinstruktur-Dichte wie an Assets mit passendem `surfaceRole`.

**Engine:** `GroundMaterial.applyMaterialPreset` → `createGroundSurfaceMaterial` → `createMaterialFromPreset(..., { surfaceRole: 'ground' })` → `resolveProceduralSamplingSpace` / `buildProceduralSampleUv` in `src/materials/procedural/`. Rahmen bleibt `surfaceRole: 'frame'` + `uv` (Perimeter-UV).
