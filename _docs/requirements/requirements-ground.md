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

**Procedural:** Preset-**`tileScale`** (Wiederholungen/m). Sampling profilabhängig (`planar-meters` vs. `meter-3d`) → Abschnitt *Procedural tiling* und [`requirements-materials.md`](./requirements-materials.md) (*Procedural — Sampling (normativ)*).

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
**Description:** Ground setzt **`surfaceRole: 'ground'`** beim Material-Resolve. **Nicht** die Standard-Mesh-UV der ~5 km `PlaneGeometry` (0–1 über die ganze Fläche → unscharfe Bänder). Stattdessen profilabhängiger Sampling-Raum — **normative Tabelle** → [`requirements-materials.md`](./requirements-materials.md) (*Procedural — Sampling (normativ)*).

**Ground-Kurzregel:**

| Preset-Typ | `samplingSpace` am Boden |
|---|---|
| Grid Paper / Grid Lines | `planar-meters` (`positionLocal.xy` × `tileScale`) |
| Wood Soft / Wood Porous | `planar-meters` |
| Print Matt (`paper-grain`), Fabric, Silk, Concrete, Metals, Plastics, Print Glossy | `meter-3d` |

**`tileScale`** = Wiederholungen pro Meter — gleiche Zahl wie am Rahmen/Asset → ähnliche sichtbare Strukturgröße.

**Engine:** `GroundMaterial.applyMaterialPreset` → `createGroundSurfaceMaterial` → `createMaterialFromPreset(..., { surfaceRole: 'ground' })` → `resolveProfileSamplingSpace` in `src/materials/procedural/`.
