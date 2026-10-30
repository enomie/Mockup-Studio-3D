# Assets — Handheld Devices (Device Smartphone & Device Tablet)

Parametrische **Device Smartphone** / **Device Tablet** — gleiche Bauweise, unterschiedliche Referenzmaße (`smartphone`, `tablet`). Bild auf dem Screen aus der **Images-Bibliothek** → [`requirements-images.md`](./requirements-images.md). Katalog, Entity-Modell, image-driven sizing, Panel-Grundlagen → [`requirements-assets.md`](./requirements-assets.md). Material-Slots → [`requirements-materials.md`](./requirements-materials.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md).

**Abgrenzung:** Dieses Doc beschreibt **nur** `assetKind: smartphone` und `assetKind: tablet`. **Device Desktop** (`monitor`) → [`requirements-assets-devices-monitor.md`](./requirements-assets-devices-monitor.md). **Picture framed** → [`requirements-assets-picture-framed.md`](./requirements-assets-picture-framed.md). Browser-Frame, Print → [`requirements-assets.md`](./requirements-assets.md).

**Status:** v1 **teilweise implementiert** — `smartphone`, `tablet` im Katalog; parametrischer Z-Stack (Bezel-Ring mit **durchgehendem** Screen-Loch, Multi-Material Glas/Screen, dual Backplate, CSG-Recesses); **Seitentasten** (2× Volume); Panel: Corner radius, Bezel width, Materials, Glazing. **Offen:** Squircle, Notch, asymmetrischer Bezel, Power-Button, Drag Image → Viewport.

**v1-Scope (einfach):** Frontale **Kreisbogen-Ecken** (`rounded-rect`) — kein Squircle. Parametrischer Z-Stack: Rahmen (Bezel-Ring), Screen mit **abgerundeter Bildfläche**, optional Glas, Backplate. Zwei einstellbare mm-Werte: **Screen-Eckenradius** und **Rahmenbreite (Bezel)**. Squircle / Tiefe-Krümmung → später.

---

**Category:** Assets — Handheld  
**Title:** Gemeinsames Modell — Smartphone & Tablet  
**Description:** Beide `assetKind` nutzen **dieselbe** Engine-Logik — [`handheld-geometry.ts`](../../src/engine/handheld-geometry.ts) (Formen, Extrude) + [`handheld-frame-csg.ts`](../../src/engine/handheld-frame-csg.ts) (Löcher im Bezel-Ring). Unterschied nur in Katalog-ID, Default-Referenzmaß und Default-Params. **Ein** Baustein pro Kind — Orientierung (Portrait/Landscape) folgt dem zugewiesenen Bild → [`requirements-assets.md`](./requirements-assets.md) (Image-driven sizing). Kein separates Asset pro Orientierung oder Geräte-Marke.

---

**Category:** Assets — Handheld  
**Title:** Screen-Bild mit abgerundeten Ecken (Pflicht)  
**Description:** Das zugewiesene User-Bild liegt auf einer **abgerundeten Screen-Geometrie** — nicht auf einer rechteckigen Plane mit sichtbaren spitzen Ecken. **Die Eckenradien der Bildfläche = Eckenradien der Screen-Opening** (Innenkontur). Texture-Mapping: **Cover** auf exakt passende Geometrie — **kein** UV-Stretch, kein `object-fit: fill` → [`requirements-images.md`](./requirements-images.md), `.cursor/rules/image-aspect-ratio.mdc`.

**Verboten für v1:** Rechteckige Screen-Plane + Alpha-Maske allein — reicht nicht für Schatten, Kontaktkanten und konsistente Silhouette. Das **Mesh** muss die Rundung tragen; optional zusätzliche Alpha-Kante für Anti-Aliasing.

**Platzhalter** (ohne `screenImageId`): gleiche abgerundete Geometrie, neutrale Farbe.

---

**Category:** Assets — Handheld  
**Title:** Kontur v1 — Kreisbogen-Ecken (frontal)  
**Description:** Frontale Silhouette = **Rounded Rectangle** mit **vier Kreisbögen** an den Ecken (klassischer `cornerRadius`).

- **Innenkontur (Screen-Opening):** Radius `screenCornerRadiusMm` — sichtbar frontal am Bild.
- **Außenkontur (Geräte-Umriss):** Radius `outerCornerRadiusMm` = `screenCornerRadiusMm` + `bezelWidthMm` — **konzentrische** Kreisbögen, damit Bezel gleichmäßig und Ecken stimmig wirken.
- **Bezel / Rahmenbreite:** `bezelWidthMm` — uniform um die Screen-Opening (v1: alle vier Seiten gleich).
- **Richtwert Defaults:** `screenCornerRadiusMm` ≈ **5–8 %** der kürzeren Screen-Kante (bei 9:16 Portrait die Breite). Zu große Werte (z. B. 18 mm auf ~90 mm Breite) wirken pillenförmig, nicht wie ein Gerät.

**Später (nicht v1):** `squircle` / continuous corner curve für iPhone-Look; asymmetrischer Bezel; gewölbte Tiefe. v1 bewusst **nur** Kreisbögen.

---

**Category:** Assets — Handheld  
**Title:** Image-driven sizing  
**Description:** Wie in [`requirements-assets.md`](./requirements-assets.md): Bild definiert **Screen-Seitenverhältnis** und **Orientierung** des Gesamtobjekts. Referenzkante × `sizeScale`; zweite Screen-Kante aus Bild-Ratio; **Außenmaß** = Screen + `2 × bezelWidthMm` pro Achse. Eckenradien und Bezel skalieren **proportional** mit `sizeScale`. `screenCornerRadiusMm` und `bezelWidthMm` sind **Design-Werte bei scale 1** — bei Rebuild werden sie mit `sizeScale` multipliziert.

| assetKind | Referenzkante | Berechnung |
|---|---|---|
| `smartphone` | Screen-Höhe **160 mm** (0,160 m) | Screen-Breite aus Bild-Ratio; Außenmaß additiv via Bezel |
| `tablet` | Screen-Höhe **250 mm** (0,250 m) | Screen-Breite aus Bild-Ratio; Außenmaß additiv via Bezel |

Orientierung: Hochformat-Bild → Hochformat-Gerät, Querformat → Querformat. **Platzhalter ohne Bild:** **9:16 Hochformat** (Portrait) — nicht 16:9. **Clamp:** `screenCornerRadiusMm` darf nicht so groß werden, dass Bögen sich an den kurzen Screen-Kanten berühren — Engine clamped auf max. `(min(screenW, screenH) / 2) - ε`.

---

**Category:** Assets — Handheld  
**Title:** Z-Aufbau & mm-Maße (v1)  
**Description:** Feste Bauteilmaße bei `sizeScale = 1` (Scene-Einheit = m). Front = **z = 0** (Vorderseite Glas/Bezel). Alle Werte × `sizeScale` bei Rebuild.

| Teil | Kontur | Maß / Position (Z, Front = 0) |
|---|---|---|
| Bezel / Frame ring | Außenkontur − Screen-Opening | **CSG:** Solid-Block → **durchgehendes** Screen-Loch → Recesses → 2× Button-Löcher; Front z = 0, Back z = −bodyDepth — **Loch muss von vorne bis hinten offen sein** (s. Screen-Opening Pflicht) |
| Front glass (optional) | Screen-Opening (**exakt**) | **1 mm** Extrude; **Caps** = `material-glass-pane`, **Seitenwände** = Frame-Material; Front z = **+0,5 mm**; CSG-Recess |
| Screen (Bild) | Screen-Opening (**exakt**) | **0-dick**, `createRoundedScreenGeometry` (abgerundete Plane); Bild-PBR, `FrontSide`; z = `screen.zFront`. Bei Passepartout-Offset > 0: **zwei** Screen-Geometrien (Außen Passepartout, Innen Bild), `R_inner = max(0, R − offset)` — → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md) |
| Base backplate (innen) | Screen-Opening (**exakt**) | **1 mm** dick; **1 mm** vor Outer backplate (am Heck verankert) |
| Outer backplate (außen) | Screen-Opening (**exakt**) | **1 mm** dick; Back z = **−bodyDepth − 0,5 mm**; CSG-Recess im Rahmen |

**Kein** separates Body-Shell-Mesh — nur Bezel-Ring mit Loch. Vorderseite: Glas + Screen in der Öffnung (Glas ragt **0,5 mm in Z** vor den Rahmen). Rückseite: **zwei** Backplates; äußere Platte ragt **0,5 mm in Z** hinter den Rahmen. **Alle Inhalte exakt = Lochgröße** — kein XY-Inset, kein Überstand.

**Body-Tiefe (Gesamtdicke, Front bis Back):**

| assetKind | `bodyDepthMm` (Default) |
|---|---|
| `smartphone` | **8,0 mm** |
| `tablet` | **8,0 mm** |

**Luftspalt zwischen Layer-Flächen:** **0,02 mm** zwischen Glas↔Screen (`HANDHELD_GLASS_SCREEN_Z_GAP_MM` — minimal, polygonOffset); **1 mm** zwischen Base back↔Outer back (`HANDHELD_LAYER_Z_GAP_MM`). **Z-Überstand** Frontglas + äußere Backplate: **0,5 mm** vor/hinter Rahmen (`HANDHELD_LAYER_Z_OVERHANG_MM`) — **nicht** seitlich. Stack-Tiefe **~5,02 mm** mit Glazing, **4 mm** ohne (Screen hat keine Z-Dicke).

Geometrie-Rebuild bei: `screenImageId`, `sizeScale`, `screenCornerRadiusMm`, `bezelWidthMm`, `outerEdgeRadiusMm`, `glazingEnabled`, `imageSurfaces` (inkl. Passepartout), Material-IDs (`frameMaterialId`, `backWallMaterialId`, `backGlassMaterialId`, `sideButtonMaterialId`, `glazingMaterialId`). Seitentasten-Maße sind feste mm-Defaults (kein Panel in v1).

---

**Category:** Assets — Handheld  
**Title:** Default-Params (Built-in)  
**Description:** Werkseitige Defaults pro `assetKind` (User änderbar im Szene-Panel):

| Param | `smartphone` | `tablet` |
|---|---|---|
| `screenCornerRadiusMm` | **6 mm** (0,006 m) | **6 mm** (0,006 m) |
| `bezelWidthMm` | **1 mm** (0,001 m) | **1 mm** (0,001 m) |
| `outerEdgeRadiusMm` | **0,8 mm** (0,0008 m) | **0,8 mm** (0,0008 m) |
| `bodyDepthMm` | **8,0 mm** | **8,0 mm** |
| `glazingEnabled` | **true** | **true** |
| `frameMaterialId` | `material-aluminium-brushed` | gleich |
| `sideButtonMaterialId` | `material-aluminium-brushed` (wie Frame) | gleich |
| `backWallMaterialId` (Base backplate, innen) | `material-chrome` | gleich |
| `backGlassMaterialId` (Outer backplate, außen) | `material-chrome` | gleich |
| `glazingMaterialId` (Front glass) | `material-glass-pane` | gleich |

`outerCornerRadiusMm` wird **nicht** separat gespeichert — Engine: `screenCornerRadiusMm + bezelWidthMm`.

---

**Category:** Assets — Handheld  
**Title:** Entity-Params & Datenmodell  
**Description:** Erweiterung von `AssetEntity` für `smartphone` und `tablet`:

```ts
// On AssetEntity.params (handheld only) — geometry mm at sizeScale 1
type HandheldDeviceParams = {
  screenCornerRadiusMm: number;
  bezelWidthMm: number;
  outerEdgeRadiusMm: number;      // outer perimeter edge roundness (front/back → side)
  bodyDepthMm?: number;           // optional override; default per assetKind
};

// On AssetEntity.materials (handheld slots)
type HandheldMaterialSlots = {
  frameMaterialId?: string;
  sideButtonMaterialId?: string;
  backWallMaterialId?: string;      // inner base backplate
  backGlassMaterialId?: string;     // outer backplate (any material)
  glazingEnabled?: boolean;
  glazingMaterialId?: string;
};
```

Weiterhin auf Entity-Ebene: `screenImageId`, `imageSurfaces` (Screen: Finish + Emissive → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md)), `sizeScale`, `transform` — wie [`requirements-assets.md`](./requirements-assets.md). **Kein** `scale` in `transform`. Save/Load: `params` + `materials` + `imageSurfaces` serialisieren.

**Scene-API:**

- `setHandheldParams(entityId, partial<HandheldDeviceParams>)` — Mesh-Rebuild
- `setAssetScreenImage(entityId, imageId | null)` — Screen-Bild
- `setImageSurface(entityId, 'front', partial)` — Finish Matt/Glossy, Emissive
- `setEntityMaterial(entityId, slot, materialId)` — Slots: `frameMaterialId`, `sideButtonMaterialId`, `backWallMaterialId`, `backGlassMaterialId`, `glazingMaterialId`, …
- `setGeometryVisible(entityId, part, visible)` — Front-Glas u. a.

---

**Category:** Assets — Handheld  
**Title:** Mesh-Teile & Material-Slots  
**Description:**

| Mesh | `assetMeshRole` | castShadow | receiveShadow | Material-Slot |
|---|---|---|---|---|
| Bezel / frame ring (mit CSG-Löchern) | `frame` | ja | ja | `frameMaterialId` |
| Screen (Bild) | `screen` | ja | ja | `imageSurfaces.front` → Finish-Preset + Bild-PBR; optional Emissive |
| Front glass | `glazing` | **nein** | ja | **Caps:** `glazingMaterialId` (`displayGlass`); **Seiten:** `frameMaterialId` (shared) |
| Outer backplate (außen) | `outerBackPlate` | ja | ja | `backGlassMaterialId` |
| Base backplate (innen) | `backWall` | ja | ja | `backWallMaterialId` |
| Side button (×2) | `sideButton` | ja | ja | `sideButtonMaterialId` |

Nach Rebuild: `applyAssetShadowFlags(group)`; Screen-Cap `FrontSide` + `polygonOffset` → [`requirements-shadows.md`](./requirements-shadows.md).

---

**Category:** Assets — Handheld  
**Title:** Geometrie — Engine (v1)  
**Description:** Drei Engine-Module; Aufruf aus [`asset-meshes.ts`](../../src/engine/asset-meshes.ts) bei `smartphone` / `tablet` Rebuild:

**[`handheld-layer-stack.ts`](../../src/engine/handheld-layer-stack.ts)** — Single Source of Truth für Z-Grenzen aller Layer + `sideButtonCenters`

**[`handheld-geometry.ts`](../../src/engine/handheld-geometry.ts)**

- `createHandheldSolidFrameGeometry` — voller Außen-Block (vor CSG)
- `createScreenOpeningCutterGeometry` — Screen-Öffnung (**durchgehend**, Cutter ragt über Front/Back hinaus — s. Screen-Opening Pflicht)
- `createHandheldFrameRingGeometry` — optionaler Ring-Extrude (Tests/Spike, **nicht** im Frame-Rebuild)
- `createRoundedScreenGeometry` — Screen **0-dick** (abgerundete Plane, `ShapeGeometry`)
- `createRoundedGlassGeometry` — Glas **1 mm** Extrude (gleiche Group-Indizes)
- `createHandheldBackPlateGeometry`, `createSideButtonHoleCutterGeometry`, `createSideButtonGeometry`

**[`handheld-frame-csg.ts`](../../src/engine/handheld-frame-csg.ts)** — Dependency: `three-bvh-csg` + `three-mesh-bvh`

- `buildHandheldFrameGeometryCsg(stack)` — Solid → **durchgehendes** Screen-Opening → Outer-Back-Recess → Front-Glas-Recess (wenn Glas in Rahmen ragt) → 2× Button-Löcher
- `subtractVolumes(base, cutters[])` — generische CSG-Subtraktion
- `validateHandheldLayerStack(stack)` — Assertions für exakte Lochgröße, Z-Gaps, Depth-Budget

**Rebuild-Pipeline:** `computeHandheldLayerStack` → `buildHandheldFrameGeometryCsg` → Layer-Meshes aus Stack positionieren.

**Konstanten** ([`asset-handheld.ts`](../../src/scene/asset-handheld.ts)):

| Konstante | Wert | Bedeutung |
|---|---|---|
| `HANDHELD_GLASS_SCREEN_Z_GAP_MM` | **0,02** | Luftspalt Glas-Innenwand ↔ Screen (minimal) |
| `HANDHELD_LAYER_Z_GAP_MM` | **1** | Luftspalt Base back ↔ Outer back |
| `HANDHELD_LAYER_Z_OVERHANG_MM` | **0,5** | Glas vor / äußere Backplate hinter Rahmen (nur Z) |
| `HANDHELD_FRONT_GLASS_THICKNESS_MM` | **1** | Glas-Extrude |
| `HANDHELD_INNER_BACK_PLATE_THICKNESS_MM` | **1** | Base backplate |
| `HANDHELD_OUTER_BACK_PLATE_THICKNESS_MM` | **1** | Äußere Backplate |

**Z-Fighting / Tunnel-Sicht (Pflicht):** Alle Insert-Meshes **exakt = Screen-Opening** (kein XY-Inset); **Multi-Material-Extrude** nur für Glas (s. unten); Screen = Plane; Recesses per CSG; Rahmen `renderOrder` 5, `polygonOffset` −2; Inserts `polygonOffset` +1; Glas-Caps `surfaceRole: displayGlass` mit **`depthWrite: true`**.

**Bekannte Limitation v1:** UVs / brushed Grain am Rahmen nach CSG können von Extrude-Defaults abweichen.

**Verworfen v1:** Screen **1 mm Extrude-Slab** (Multi-Material mit Frame-Seitenwänden); Screen/Glas-Slab mit Transmission/Bild auf **Seitenwänden**; separates `buttonWell`-Mesh; flache Screen-Mulde (nur Teil-Tiefe) im Rahmen; seitlicher XY-Überstand von Glas/Backplate.

---

**Category:** Assets — Handheld  
**Title:** Glazing  
**Description:** **Echtes** Glas-Mesh (`createRoundedGlassGeometry`, **1 mm** Extrude) + Display-Glazing-Material (`material-glass-pane`, `surfaceRole: displayGlass` — Clearcoat/Reflexion, **kein** Transmission-Blur auf dem Screen). Frosted-Presets nutzen Transmission. Glas liegt **vor** dem Screen (**0,02 mm** Z-Gap — praktisch bündig); Front z = **+0,5 mm** (Z-Überstand). Kontur = Screen-Opening (**exakt**). Default **an** (`glazingEnabled: true`). UI: Checkbox. Glazing castet **keinen** Schatten.

**Multi-Material:** `ExtrudeGeometry` Group **0** = Caps (Transmission); Group **1** = Seitenwände (**`frameMaterial`** — shared mit Rahmen-Mesh). Seitenwände bleiben geometrisch; Material opak, damit keine Transmission-Linie im Screen-Tunnel bei Seitenblick.

---

**Category:** Assets — Handheld  
**Title:** Szene-Panel (UI)  
**Description:** Right Sub, Entity-Block für `smartphone` / `tablet`:

1. **Screen / Image** — `ImageSurfaceFields` (Image, Finish Matt/Glossy, Emissive); leer = Platzhalter auf abgerundeter Fläche
2. **Geometries** — Sichtbarkeit + Material-Slots (Frame, Glazing, Backplates, Side buttons); Glazing-Checkbox in Geometries
3. **Dimensions** — **Width (m)** und **Height (m)** (Screen-Öffnung, bildgetrieben, gekoppelt; kein Size-Feld); **Corner radius**, **Bezel width**, **Edge roundness** (`screenCornerRadiusMm`, `bezelWidthMm`, `outerEdgeRadiusMm`)
4. **Position** — Pos / Rot (kein Transform-Block)



`bodyDepthMm` v1: nur Default pro Kind, kein UI-Feld (später optional).

---

**Category:** Assets — Handheld  
**Title:** Katalog (Built-in)  
**Description:** Zwei Einträge in Left Sub → Assets:

| ID | `assetKind` | Anzeigename |
|---|---|---|
| `asset-smartphone` | `smartphone` | Device Smartphone |
| `asset-tablet` | `tablet` | Device Tablet |

Icon/Thumbnail: gerenderte Vorschau mit Default-Params. Mehrfach-Instanzen unbegrenzt → [`requirements-assets.md`](./requirements-assets.md).

---

**Category:** Assets — Handheld  
**Title:** Seitentasten v1 — Volume (rechts oben)  
**Description:** Portrait, Vorderseite zum User: **rechte Seite** (+X), **oberer Bereich**, **zentriert in Gerätetiefe** (Z = −bodyDepth/2) — **2×** gestapelte längliche Tasten (Volume Up / Down). Konstanten in [`asset-handheld.ts`](../../src/scene/asset-handheld.ts).

**Loch (CSG):**

- Vertikale Pille (lange Achse Y, kurze Achse Z) wird aus dem Bezel-Ring **subtrahiert**
- Cutter an `x = +outerWidth/2`, Öffnung nach außen, Tiefe in −X
- Kein separates Well-Mesh

**Button:**

- Kleinere Pille mit Spalt `sideButtonGapMm` ringsum
- **2 mm proud** über Außenwand (+X): Außenfläche bei `x = +outerWidth/2 + proud`
- **2 mm** in die Öffnung (`sideButtonInsetMm`); Button-Tiefe in X = inset + proud = **4 mm**
- Material: `sideButtonMaterialId` — Default = Frame; alle Materialien im Panel wählbar

| Konstante (mm, scale 1) | Default | Code |
|---|---|---|
| Loch-Länge (Y) | 14 | `SIDE_BUTTON_LENGTH_MM` |
| Loch-Breite (Z) | 1,2 | `SIDE_BUTTON_THICKNESS_MM` |
| Cutter-Tiefe | `sideWallThicknessX + 2` | `stack.sideWallThicknessX + SIDE_BUTTON_HOLE_EXTRA_MM` |
| Spalt Loch↔Button | 0,15 | `SIDE_BUTTON_GAP_MM` |
| Proud | 2 | `SIDE_BUTTON_PROUD_MM` |
| Inset in Loch | 2 | `SIDE_BUTTON_INSET_MM` |
| Kantenabstand (Tasten) | 2,5 | `SIDE_BUTTON_SPACING_MM` |
| Stack-Mitte (Y) | `outerHeight / 4` | Zentrum der oberen Gerätehälfte (origin-centered) |

Smartphone & Tablet — gleiche mm-Werte × `sizeScale`. Kein Power-Button, keine Positions-/Längen-UI in v1.

---

**Category:** Assets — Handheld  
**Title:** Screen-Opening — Durchgehendes Loch (Pflicht)  
**Description:** Das **Screen-Opening im Bezel-Ring muss von der Vorderseite bis zur Rückseite vollständig durchgehen** — ein echter **Durchbruch** durch die gesamte `bodyDepth`, **kein** blindes Loch, **keine** flache Mulde, **kein** geschlossener Boden in der Öffnung.

**Sichtbar / akzeptiert:**

- Durch die Mitte der Öffnung (XY innerhalb `screenWidth` × `screenHeight`) ist man **von vorne durch bis hinten** hindurchsichtbar — nur Bezel-Ring umschließt die Öffnung.
- Innenwände des Bezel-Rings an der Opening-Kante sind erlaubt (Ring-Geometrie); **kein** Frame-Material in der Öffnungs-Säule (Mittelpunkt-Column) über die volle Z-Tiefe.

**Engine (`createScreenOpeningCutterGeometry`):**

- Cutter = abgerundetes Rechteck, Kontur = **Screen-Opening** (`screenWidth`, `screenHeight`, `innerRadius`).
- Cutter nutzt **große** `curveSegments` (6) — nur Boolean, nicht sichtbar; beschleunigt CSG.
- Cutter muss **über** Frame-Front (z = 0) **und** Frame-Back (z = −bodyDepth) hinausragen (`CORNER_EPSILON_M` Padding).
- CSG-Reihenfolge in `buildHandheldFrameGeometryCsg`: Solid → **Screen-Opening** (zuerst) → Recesses → Button-Löcher.

**Tests (Pflicht, nicht optional):**

- `handheld-frame-csg.test.ts`: **keine Vertices** in der Mittel-Säule (|x|, |y| < Schwellwert) über **alle** z von `frameBackZ` bis `frameFrontZ`.
- Cutter-Bounding-Box: `max.z > frameFrontZ` und `min.z < frameBackZ`.

**Verboten:** Öffnung nur teilweise subtrahieren; Cutter exakt bündig mit Frame-Front/-Back ohne Padding; „Loch“ nur als separate Well-Mesh-Illusion ohne CSG-Durchbruch.

---

**Category:** Assets — Handheld  
**Title:** Multi-Material-Extrude — Glas (Tunnel-Sicht)  
**Description:** Bei **seitlichem Blick** in den durchgehenden Screen-Tunnel dürfen **keine** hellen Transmission-Linien durch den Bezel-Ring blitzen.

**Pflicht-Lösung (v1):**

| Teil | Geometrie | Group 0 (Caps) | Group 1 (Seitenwände) |
|---|---|---|---|
| Front glass | `createRoundedGlassGeometry`, 1 mm | `glazingMaterialId` (`displayGlass`) | `frameMaterialId` (Mesh-Instanz shared) |
| Screen (Bild) | `createRoundedScreenGeometry`, 0-dick | `imageSurfaces.front` → Finish-Preset + Bild-PBR, `FrontSide` | — (kein Extrude) |

- `HANDHELD_EXTRUDE_CAP_GROUP` = **0**, `HANDHELD_EXTRUDE_SIDE_GROUP` = **1** (Three.js `ExtrudeGeometry`-Default, nur Glas)
- Base backplate / äußere Backplate: volles Extrude mit **einem** Material
- Screen-Opening bleibt **volle Tiefe** — Tunnel ist erlaubt

**Verboten:** Glas-Slab mit Transmission auf Seitenwänden; seitlicher XY-Überstand zur „Abdeckung“ des Tunnels.

**Verworfen:** Screen als 1-mm-Extrude-Slab mit Multi-Material (User: Bild = Plane).

---

**Category:** Assets — Handheld  
**Title:** Außenkanten-Rundung (Edge roundness)  
**Description:** Abrundung der **äußeren** Gerätekanten — Übergang Frontfläche → Seitenwand und Back → Seitenwand am **Außenkontur**-Extrude (Bezel-Ring-Solid vor CSG). **Nicht** betroffen: Innenkante Screen-Opening, Glas-/Screen-/Backplate-Layer, Seitentasten — dort bleiben scharfe Kanten bzw. bestehende Geometrie.

- **Param:** `outerEdgeRadiusMm` auf `HandheldDeviceParams`
- **Panel:** „Edge roundness (mm)“ — Wertebereich **0–3 mm** (Anzeige wie andere mm-Felder in Metern)
- **Engine-Clamp:** `effective = min(outerEdgeRadiusMm, bodyDepthMm / 2, 3)` — physikalisch nicht mehr als halbe Körperdicke
- **Default:** **1,0 mm** (Smartphone & Tablet) — sichtbare Abrundung ohne Pillen-Look
- **Geometrie:** `ExtrudeGeometry` mit `bevelEnabled` nur auf `createHandheldSolidFrameGeometry`; CSG-Cutter (Screen-Loch, Recesses, Buttons) **ohne** Bevel — Innenkante des Rahmens bleibt scharf
- **Z-Stack:** Front bleibt **z = 0** nach Bevel (Bounding-Box-Align); Gesamt-`bodyDepth` unverändert

**Verworfen:** 0–`bezelWidthMm` als Max (Bezel = Rahmenbreite, nicht Körperdicke); Bevel auf allen Extrudes (würde Screen-Tunnel-Kanten mitrunden).

---

**Category:** Assets — Handheld  
**Title:** Später (nicht v1)  
**Description:** Squircle / continuous corners (iPhone-Look); asymmetrischer Bezel; Notch / Dynamic Island; Kamera-Bump; **Power-Button**; Seitentasten-Position/Länge im Panel; Landscape-Button-Rotation; gewölbte Rückseite; Rahmen-UVs nach CSG re-assignen; `devicePreset`-Dropdown; Drag Image → Screen im Viewport; Edge roundness auf äußerer Backplate / Frontglas.

---

**Category:** Assets — Handheld  
**Title:** Offene Punkte (TBD)  
**Description:** Minimaler `screenCornerRadiusMm` (z. B. 0 = rechteckig erlaubt oder min 1 mm); CSG-Rebuild-Performance bei Slider-Drag (debounce); brushed Grain am Rahmen nach CSG. **Nicht im Code raten** — Diary oder Requirement-Update.

---

**Category:** Assets — Handheld  
**Title:** Geometries Panel  
**Description:** Right Sub: Sektion **„Geometries“** (ersetzt flache Materials-Liste). Pro Teil: **Checkbox** (Sichtbarkeit) + **Material-Dropdown** (alle Presets). Teile: **Frame**, **Display glass**, **Base backplate**, **Outer backplate**, **Side button**. **Screen / Image** bleibt eigene Sektion mit **`ImageSurfaceFields`** (Image, Finish, Emissive).

**Datenmodell:** `AssetEntity.geometryVisibility` (`frame`, `glazing`, `backWall`, `outerBackPlate`, `sideButton`); Material-Slots unverändert. API: `setGeometryVisible` → Rebuild. Default: alle sichtbar.

**Engine:** Unsichtbare Teile = kein Mesh. **Display glass** aus: Screen springt an Frame-Front (`screenZFront = 0`), Stack **5 mm** statt 7 mm. Andere Teile: nur Mesh-Skip, Z-Stack unverändert.

---

**Category:** Assets — Handheld  
**Title:** Mesh-Tessellation (Engine, kein UI)  
**Description:** Feste Werte in [`handheld-geometry.ts`](../../src/engine/handheld-geometry.ts) — **kein** Panel. Sichtbarer Rahmen/Screen: **12** corner segments, **3** bevel steps (Edge roundness). CSG-Cutter: **6** corner segments (Performance). Ring-Extrude (`createHandheldFrameRingGeometry`) **nicht** im Rebuild — zu schwer für `three-bvh-csg` ohne sichtbaren Gewinn (Diary 2026-10-10).
