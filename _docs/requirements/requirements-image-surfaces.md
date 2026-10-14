# Image Surfaces — Matt/Glossy + Emissive pro Fläche

Einheitliche Oberflächen-Settings für **alle Bild-Flächen** (Front, Back, ggf. Seiten später). Bezüge: [`requirements-images.md`](./requirements-images.md), [`requirements-materials.md`](./requirements-materials.md), [`requirements-assets.md`](./requirements-assets.md).

**Status:** Finish + Emissive **implementiert** (2026-10-08). **Passepartout** (Datenmodell, UI, Engine v2 Zwei-Meshes) **implementiert** (2026-10-09). **Alpha / Transparenz** (Viewport, asset-spezifisch) **implementiert** (2026-10-10).

**Code:** `src/scene/image-surface.ts` (`computePassepartoutInnerBounds`), `src/engine/passepartout-meshes.ts` (`createPassepartoutDisplayMeshes`), `createImagePbrMaterial` / `createPassepartoutPbrMaterial` / `createCanLabelMaterial` / `createPenBodyWrapMaterial`, `image-surface-alpha.ts`, `cylindrical-label-uv.ts`, `asset-meshes.ts`, `ImageSurfaceFields`, `setImageSurface`.

---

**Category:** Image Surfaces  
**Title:** Datenmodell — `ImageSurfaceSettings`  
**Description:** Pro Bild-Fläche (`AssetFaceId`) optionale Settings auf der Entity:

```typescript
type ImageSurfaceFinish = 'matt' | 'glossy';

type ImageSurfaceSettings = {
  finish: ImageSurfaceFinish;              // Bild — default 'glossy'
  emissiveEnabled: boolean;                // default false
  emissiveIntensity: number;               // 0–1, default 0
  passepartoutColor: Rgb;
  passepartoutOffsetM: number;             // ≥ 0, default 0
  passepartoutFinish: ImageSurfaceFinish;  // default 'matt'
};
```

Speicherort: `imageSurfaces?: Partial<Record<AssetFaceId, ImageSurfaceSettings>>` auf `AssetEntity`. Getrennt von `AssetFaceContent` — Handheld/Picture haben kein vollständiges `faces`-Objekt; Color-Mode-Faces (Print-Back, Seiten-Tint) bleiben unberührt.

---

**Category:** Image Surfaces  
**Title:** Finish — Matt / Glossy  
**Description:** UI: zwei Optionen (kein volles Material-Dropdown). Engine-Mapping:

| Finish | Preset-ID | UI-Name |
|---|---|---|
| `matt` | `material-paper` | Print Matt |
| `glossy` | `material-glossy-print` | Print Glossy |

Roughness/Metalness kommen vom Preset; Cover-Texture (Bild) bleibt ratio-treu → [`image-aspect-ratio.mdc`](../.cursor/rules/image-aspect-ratio.mdc).

---

**Category:** Image Surfaces  
**Title:** Emissive — aus Bild-Texture  
**Description:** Checkbox **Emissive** + **Intensity** (0–1, `RangeSlider` + Input, 3 Dezimalen). **Kein** Emissive-ColorPicker — Farbe = Bild-Texture (Albedo). Engine: `emissiveNode = colorNode × intensity` wenn Emissive an. Use-Cases: Smartphone/Tablet-Screen (leuchtend), hinterleuchteter Bilderrahmen.

---

**Category:** Image Surfaces  
**Title:** UI — `ImageSurfaceFields`  
**Description:** Wiederverwendbare Komponente (Right Sub, pro Bild-Fläche):

1. Image-Picker (optional, wenn Parent nicht separat)
2. **Finish:** Matt / Glossy (Select oder Segmented)
3. **Emissive** Checkbox
4. **Intensity** Slider — disabled wenn Emissive aus

**Einbindung:**

| assetKind | Flächen |
|---|---|
| `smartphone`, `tablet` | `front` (Sektion Screen / Image) |
| `picture` | `front` (Sektion Screen / Image) |
| `wall`, `wall-door` | `front` (Tapetenmuster — [`requirements-assets-wall.md`](./requirements-assets-wall.md)) |
| `print` | `front` (immer), `back` (nur `mode === 'image'`) |
| `fabric-cloth` | **—** (Ausnahme) |

**`fabric-cloth`:** **kein** `ImageSurfaceFields` (kein Matt/Glossy, kein Emissive hier). **Farbe/Motiv** auf der Bahn **ausschließlich** über **`screenImageId`** (Image-Picker, beidseitig); **Bordüre** separat über `borderColor` — **nicht** über Image Surfaces. **`fabricClothMaterialId`** = volles Materials-Dropdown nur für **Struktur** (Roughness, Sheen, …); Preset-`color` auf der Motivfläche **nicht** anwenden → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md).

Print: Side-Material + Tint für Color-Seiten unverändert.

---

**Category:** Image Surfaces  
**Title:** Migration  
**Description:** Beim Entity-Load / `addEntity`: wenn `imageSurfaces[faceId]` fehlt und Fläche Bild trägt → aus Legacy-Slots ableiten:

- `frontMaterialId === material-paper` → `finish: 'matt'`
- `frontMaterialId === material-glossy-print` → `finish: 'glossy'`
- Gleiches für `backMaterialId` wenn Back im Image-Mode

`frontMaterialId` / `backMaterialId` bleiben im Schema (Rückwärtskompat); UI setzt sie für Bild-Flächen nicht mehr — nur `imageSurfaces`.

---

**Category:** Image Surfaces  
**Title:** Scene-API  
**Description:** `setImageSurface(entityId, faceId, partial: Partial<ImageSurfaceSettings>)` — patcht Settings, triggert Mesh-Rebuild. Store: `setImageSurface` → Scene-API.

---

**Category:** Image Surfaces  
**Title:** v1 — bewusst nicht  
**Description:** Print-Seiten mit Bild (später); Emissive-Farb-Override; globales Entity-Level-Setting; automatischer Emissive-Default für Handheld.

---

**Category:** Image Surfaces  
**Title:** Passepartout — Scope  
**Description:** **Nur** bildtragende Mockup-Flächen mit fester Opening-Plane (kein Tapeten-Repeat):

| assetKind | Flächen |
|---|---|
| `picture` | `front` |
| `smartphone`, `tablet`, `monitor` | `front` (Screen) |
| `print` | `front`; `back` nur wenn `mode === 'image'` |

**Nicht:** `wall`, `wall-door` — Tapete bleibt ohne Passepartout (`ImageSurfaceFields` dort unverändert).

---

**Category:** Image Surfaces  
**Title:** Passepartout — Verhalten (logisch)  
**Description:** **Äußerer Rand** = Opening bis Rahmen / innere Bezel-Kante (Geometrie des Assets unverändert).

- **Offset** (`passepartoutOffsetM`, UI in **m** wie andere Asset-Längen): gleichmäßiger Inset von allen Seiten. Default **0** → ein Bild-Mesh bis zum Opening-Rand (ratio-treu, kein Stretch).
- **Offset > 0:** sichtbarer **Ring** in `passepartoutColor` + `passepartoutFinish`; **Bild** nur in der inneren Fläche (`Außenmaß − 2×offset`), zentriert, ratio-treu. Opening-Aspect folgt weiter dem Bild.
- **Ohne Bild:** Außen-/Passepartout-Mesh zeigt Hintergrundfarbe + Passepartout-Finish; kein separates Bild-Mesh (oder leerer Innenbereich — Engine-Detail).

Emissive gilt **nur** auf dem **Bild-Mesh**, nicht auf dem Passepartout.

**Kein** zusätzlicher Eckenradius in der UI — abgerundete Innenform nur aus **bestehenden** Geräte-/Print-Parametern (s. Engine-Abschnitte).

---

**Category:** Image Surfaces  
**Title:** Passepartout — Depth & Draw Order (Zwei-Mesh)  
**Description:** Builder: `createPassepartoutDisplayMeshes` (`src/engine/passepartout-meshes.ts`).

- **Koplanar:** Bei **Offset > 0** teilen Passepartout- und Bild-Mesh **`zBase`** — **kein** Welt-Z-Versatz zwischen den beiden Planes. Auf Handheld würde z. B. 0,2 mm nach vorne ins Displayglas rutschen (Spalt Screen↔Glas ~0,02 mm) → Z-Fighting / Bild verschwindet bei Kameradrehung.
- **Passepartout** (wenn innen ein Bild-Mesh existiert): `depthWrite: true`, `polygonOffset` **+2 / +2** (im Depth-Buffer leicht nach hinten), Default-`renderOrder` **2**.
- **Bild:** höherer `renderOrder` **3**, `polygonOffset` **−2 / −2** (Picture, Print, Monitor). **Handheld** (`applyHandheldScreenMaterialFlags`): Bild **+1 / +1** — kompatibel mit bestehendem Glas-`polygonOffset`.
- **Handheld Innen-Rückwand** (`innerBack`): `renderOrder` **0**, `polygonOffset` **−1 / −1** — darf Passepartout bei gleicher Order nicht überdecken (früher Konflikt mit Passepartout `renderOrder` 1).
- **Abgrenzung:** Unabhängig von `WALLPAPER_FRONT_Z_EPSILON_M`, `GLAZING_IMAGE_GAP`, CSG-`CORNER_EPSILON_M` (andere Stacks).

---

**Category:** Image Surfaces  
**Title:** Passepartout — Engine (Offset = 0)  
**Description:** **Ein** Mesh (Screen-/Bild-Plane wie heute): `createImagePbrMaterial` mit Bild-`finish`, Cover-UV, optional Emissive. Kein Passepartout-Mesh.

---

**Category:** Image Surfaces  
**Title:** Passepartout — Engine Picture framed (rechteckig)  
**Description:** **Kein** Corner-Radius am Bild — Picture framed hat und braucht **keinen** Screen-Radius (v1 bleibt rechteckige Opening-Plane).

| Offset | Meshes |
|---|---|
| `0` | Eine `PlaneGeometry` (Opening), nur Bild |
| `> 0` | **Zwei** rechteckige Planes, gleiche Orientierung, gleiches **`zBase`**: (1) **Außen** Opening-Größe — Passepartout-Material; (2) **Innen** `width − 2×offset`, `height − 2×offset`, zentriert — Bild-Material. Tiefe: s. „Depth & Draw Order“. |

Innenform = **Rechteck** (kein `createRoundedScreenGeometry`). Rebuild bei `imageSurfaces`, `screenImageId`, `sizeScale` — → [`requirements-assets-picture-framed.md`](./requirements-assets-picture-framed.md) (Z-Stack Bild-Falz).

---

**Category:** Image Surfaces  
**Title:** Passepartout — Engine Rounded screen (Handheld, Monitor, Print-Bildflächen)  
**Description:** Smartphone, Tablet, Monitor: Screen-Opening ist **abgerundetes Rechteck**. Print: Front/Back **Image**-Faces nutzen dieselbe Logik wenn `printParams.cornerRadiusMm > 0` (Geometrie bereits `createRoundedScreenGeometry`).

| Offset | Meshes |
|---|---|
| `0` | Ein Screen-Mesh wie heute |
| `> 0` | **Zwei** `createRoundedScreenGeometry`: **Außen** `(W, H, R)` — Passepartout; **Innen** `(W − 2×offset, H − 2×offset, R_inner)` — Bild |

**Innenradius (nicht einstellbar):** `R_inner = max(0, R − offset)` mit **R** = bereits vorhandener Radius nach Rebuild (`screenCornerRadius` × `sizeScale` bzw. `printCornerRadiusM`). **Kein** neues Entity-Feld.

Beide Meshes **`zBase`**; Tiefe via `polygonOffset` / `renderOrder` (s. „Depth & Draw Order“). Glas/Bezel-`renderOrder` und Screen-Flags auf Handheld unverändert integriert.

**Verworfen für diese Assets:** rein rechteckige Shader-Maske auf einem Mesh (Bildecken ragen in runde Display-Ecken).

---


**Category:** Image Surfaces  
**Title:** Passepartout — Datenmodell (Erweiterung)  
**Description:** Erweiterung von `ImageSurfaceSettings` (gleicher Speicherort `imageSurfaces`):

```typescript
type ImageSurfaceSettings = {
  finish: ImageSurfaceFinish;              // Bild — Matt / Glossy, default 'glossy'
  emissiveEnabled: boolean;
  emissiveIntensity: number;

  passepartoutColor: Rgb;                  // Hintergrund im Offset-Ring (und Vollfläche ohne Bild)
  passepartoutOffsetM: number;             // ≥ 0, default 0
  passepartoutFinish: ImageSurfaceFinish;  // eigener Matt/Glossy für Passepartout, default 'matt'
};
```

**Defaults `passepartoutColor`** (wenn Feld fehlt), abhängig von `assetKind`:

| assetKind | Default |
|---|---|
| `picture`, `print` | Weiß `{ r: 1, g: 1, b: 1 }` |
| `smartphone`, `tablet`, `monitor` | Schwarz `{ r: 0, g: 0, b: 0 }` |

`resolveImageSurfaceSettings(entity, faceId)` braucht `assetKind` (oder Callback), damit Farb-Defaults korrekt sind — nicht nur `imageSurfaces` + `faceId`.

Engine: Passepartout-Zone und Bild-Zone können **unterschiedliche** PBR-Presets nutzen (`finishToMaterialId` je Zone); gleiche Preset-IDs wie beim Bild-Finish.

---

**Category:** Image Surfaces  
**Title:** Passepartout — Finish (Matt / Glossy)  
**Description:** **`passepartoutFinish`** ist **unabhängig** von **`finish`** (Bild). Gleiche Semantik und Engine-Mapping wie Abschnitt „Finish — Matt / Glossy“ (`material-paper` / `material-glossy-print`).

Beispiel: mattes weißes Passepartout, glänzendes Foto — oder umgekehrt.

---

**Category:** Image Surfaces  
**Title:** Passepartout — UI (`ImageSurfaceFields`)  
**Description:** In **Screen / Image** (bzw. Print Front/Back Image), **nur** wo Passepartout-Scope gilt. Reihenfolge:

1. Image-Picker (wie heute)
2. **Finish** — Matt / Glossy (**Bild**)
3. Emissive + Intensity (wie heute)
4. Untergruppe **Passepartout** (Label oder Sub-Section):
   - **Color** — `ColorPicker` (shared → [`requirements-color-picker.md`](./requirements-color-picker.md))
   - **Offset** — Längenfeld **m** (`PanelAxisField`, `LENGTH_DECIMALS` wie Depth/Width)
   - **Finish** — **gleiches Control wie (2):** `PanelSelect` mit Optionen **Matt** / **Glossy** (kein Material-Dropdown, kein anderes UI-Pattern)

Wall: keine Passepartout-Felder.

---

**Category:** Image Surfaces  
**Title:** Passepartout — Migration & Serialisierung  
**Description:** Fehlende Felder beim Load / `resolveImageSurfaceSettings`: `passepartoutOffsetM = 0`, `passepartoutFinish = 'matt'`, `passepartoutColor` aus assetKind-Default. Bestehende Szenen ohne Passepartout-Felder verhalten sich wie Offset 0 (bis Engine-Umstellung: Platzhalter ohne Bild unverändert).

Scene Save / Entity-JSON: neue Felder optional in `imageSurfaces[faceId]`.

---

**Category:** Image Surfaces  
**Title:** Emissive — Intensity only (2026-10-10)  
**Description:** **`emissiveEnabled` entfällt** im gespeicherten Schema und in der UI. Steuerung nur noch **`emissiveIntensity`** (0–1, Default 0): `RangeSlider` mit Input (3 Dezimalen), Zeilen-Label **Emissive** (wie Lighting-Pattern). **Kein** Emissive-ColorPicker — Farbe = Bild-Texture (Albedo). Engine: `emissiveNode = colorNode × intensity` wenn **`emissiveIntensity > 0`**.

**Legacy-Load:** Gespeicherte `imageSurfaces[faceId]` mit `emissiveEnabled: false` → effektive Intensity **0** (auch wenn altes `emissiveIntensity` > 0). Fehlt `emissiveEnabled`, gilt nur `emissiveIntensity`. Beim nächsten `setImageSurface` wird der Face-Eintrag ohne Legacy-Key persistiert.

**UI (`ImageSurfaceFields`):** Finish → **Emissive** (Slider) → optional Passepartout — keine Emissive-Checkbox mehr.

---

**Category:** Image Surfaces  
**Title:** Alpha / Transparenz — Finish auf bedruckten Pixeln  
**Description:** Vollständige Bild-Regeln → [`requirements-images.md`](./requirements-images.md) (Alpha / Transparenz Viewport). Kurz: **Matt/Glossy** (`finish`) gilt für die **sichtbaren** Texel; transparente Pixel liefern **keine** deckende Print-Schicht.

| `assetKind` / Fläche | Alpha-Verhalten |
|---|---|
| `picture`, `smartphone`, `tablet`, `monitor`, `print` (image faces), `wall` | Alpha-Blend; Unterlage = Passepartout oder Geometrie dahinter |
| `wine-bottle` — `imageSurfaces.label` | Alpha-Blend; Unterlage = **Glas** (Transmission-Körper) |
| `beverage-can`, `tin-can` — Label | Opaque Label-Material; Alpha → **Metall-Underlay** (nicht Glas/Weiß) |

**Kein** globales „Alpha aus“ pro Finish — Alpha kommt immer aus der Textur (bzw. Heuristik bei alpha-fähigen Dateiendungen).

---

**Category:** Image Surfaces  
**Title:** Fabric cloth — Ausnahme (kein Finish, Farbe aus Image)  
**Description:** `fabric-cloth` nutzt **dieses** Panel-Modell **nicht**. Sichtbare **Farben auf der Stoffbahn** kommen **nur** aus der Images-Bibliothek (`screenImageId`); optionale **Bordüre** = `borderColor` am Asset. Material-Presets liefern **keine** Ersatz-Stofffarbe (auch nicht „Silk“). Vollständig → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md).

---
