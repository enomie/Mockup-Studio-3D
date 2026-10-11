# Assets — Monitor (Desktop Display mit Stand)

Parametrischer **Monitor-Baustein** — Display (Handheld-Bauweise) + **Standfläche** + **Standfuß**, Neigung und Montagehöhe einstellbar. Bild auf dem Screen aus der **Images-Bibliothek** → [`requirements-images.md`](./requirements-images.md). Katalog, Entity-Modell, image-driven sizing, Panel-Grundlagen → [`requirements-assets.md`](./requirements-assets.md). Display-Stack (Bezel, Glas, Backplate, CSG-Tasten) → [`requirements-assets-devices-handheld.md`](./requirements-assets-devices-handheld.md). Material-Slots → [`requirements-materials.md`](./requirements-materials.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md).

**Abgrenzung:** Dieses Doc beschreibt **nur** `assetKind: monitor`. Smartphone & Tablet → Handheld-Doc. **Kein** separates flaches Monitor-Asset ohne Stand in v1 — dieser Stand-Monitor **ist** der Monitor-Baustein.

**Status:** v1 **teilweise implementiert** — `monitor` im Katalog + Default-Szene; Display-Stack (Handheld-Engine), Stand (`monitor-stand.ts`), Artikulation (`displayTiltDeg`, `displayMountHeightMm`), Panel Geometries + Device-Felder. **Offen:** Stand-mm im Panel; präzise Footprint-Höhe bei Tilt; dedizierte Monitor-CSG-Tests.

**v1-Scope:** Frontale **Kreisbogen-Ecken** (`rounded-rect`) am Display — kein Squircle. Display-Z-Stack wie Handheld (Bezel-Ring, abgerundeter Screen, optional Glas, dual Backplate). **Stand:** Platte + senkrechter Fuß. **Artikulation:** Neigung um lokale X, Montagehöhe Y relativ zum Fuß. Squircle, asymmetrischer Bezel, Power-Button → später.

---

**Category:** Assets — Monitor  
**Title:** Gemeinsames Modell — Display + Stand  
**Description:** `assetKind: monitor` nutzt für den **Display-Teil** dieselbe Engine-Logik wie Handheld — [`handheld-geometry.ts`](../../src/engine/handheld-geometry.ts), [`handheld-frame-csg.ts`](../../src/engine/handheld-frame-csg.ts), [`handheld-layer-stack.ts`](../../src/engine/handheld-layer-stack.ts) — mit **Monitor-Defaults** (Bezel/Tiefe) und **abweichender Seitentasten-Y-Position**. Zusätzlich **Stand-Subassembly** (eigene Module, z. B. `monitor-stand.ts` / `monitor-geometry.ts` — Zielpfad bei Implementierung). **Ein** Baustein — Orientierung (Portrait/Landscape) folgt dem zugewiesenen Bild → [`requirements-assets.md`](./requirements-assets.md). Kein separates Asset pro Orientierung oder Marke.

**Hierarchie (lokal):** Entity-Root (Gizmo Move/Rotate/Scale) → **Standfläche** (Bodenkontakt) → **Standfuß** (auf Platte) → **Pivot** (Fuß-Oberkante + `displayMountHeightMm`) → **Display-Assembly** (`displayTiltDeg` um lokale X) → Handheld-Layer-Meshes.

Szene: **Y up**. Display-Front im **Display-Lokalraum** wie Handheld: **z = 0** (Vorderseite Glas/Bezel). Standfläche-Unterkante = Ground-Kontakt.

---

**Category:** Assets — Monitor  
**Title:** Screen-Bild mit abgerundeten Ecken (Pflicht)  
**Description:** Wie Handheld: zugewiesenes User-Bild auf **abgerundeter Screen-Geometrie** — Eckenradien Bildfläche = Screen-Opening. **Cover** auf passende Geometrie — **kein** UV-Stretch → [`requirements-images.md`](./requirements-images.md), `.cursor/rules/image-aspect-ratio.mdc`. **Passepartout** bei Offset > 0: Zwei-Mesh, `R_inner = max(0, R − offset)` aus `screenCornerRadiusMm` — → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md).

**Verboten für v1:** Rechteckige Screen-Plane + Alpha-Maske allein. Mesh trägt die Rundung.

**Platzhalter** (ohne `screenImageId`): gleiche Geometrie, neutrale Farbe; Seitenverhältnis **16:9 Landscape** (Monitor-Default, konsistent mit [`requirements-assets.md`](./requirements-assets.md) Platzhalter-Richtung).

---

**Category:** Assets — Monitor  
**Title:** Kontur v1 — Kreisbogen-Ecken (Display)  
**Description:** Display-Silhouette frontal = **Rounded Rectangle** (vier Kreisbögen).

- **Innenkontur (Screen-Opening):** Radius `screenCornerRadiusMm`.
- **Außenkontur:** `outerCornerRadiusMm` = `screenCornerRadiusMm` + `bezelWidthMm` — konzentrische Kreisbögen.
- **Bezel:** `bezelWidthMm` — uniform (v1: alle vier Seiten gleich).
- **Default `screenCornerRadiusMm`:** **7 mm** — gleiche Größenordnung wie Tablet (Handheld-Logik: ~5–8 % der kürzeren Screen-Kante).

**Später:** Squircle; asymmetrischer Bezel.

---

**Category:** Assets — Monitor  
**Title:** Image-driven sizing  
**Description:** Wie [`requirements-assets.md`](./requirements-assets.md): Bild definiert **Screen-Seitenverhältnis** und **Orientierung**. Referenzkante × `sizeScale`; zweite Screen-Kante aus Bild-Ratio; **Außenmaß** = Screen + `2 × bezelWidthMm` pro Achse. Eckenradien und Bezel skalieren **proportional** mit `sizeScale`. `screenCornerRadiusMm` und `bezelWidthMm` sind **Design-Werte bei scale 1**.

| assetKind | Referenzkante | Berechnung |
|---|---|---|
| `monitor` | Screen-Breite **480 mm** (0,480 m) | Screen-Höhe aus Bild-Ratio; Außenmaß additiv via Bezel |

Orientierung: Hochformat-Bild → Hochformat-Display, Querformat → Querformat. **Platzhalter ohne Bild:** **16:9 Landscape**. **Clamp:** `screenCornerRadiusMm` max. `(min(screenW, screenH) / 2) - ε`.

Stand-Maße (`standBase*`, `standFoot*`) skalieren mit `sizeScale`, sofern nicht als feste Realmaße dokumentiert — v1: **alle** mm-Params × `sizeScale` bei Rebuild (einheitlich mit Display).

---

**Category:** Assets — Monitor  
**Title:** Display Z-Aufbau & mm-Maße (v1)  
**Description:** Display-Bauteile bei `sizeScale = 1` (Scene-Einheit = m). Front = **z = 0**. Werte × `sizeScale` bei Rebuild. Layer-Tabelle und Regeln **identisch** zu Handheld → [`requirements-assets-devices-handheld.md`](./requirements-assets-devices-handheld.md) (Z-Aufbau, durchgehendes Loch, Multi-Material-Glas, Backplates, Konstanten `HANDHELD_*`).

| Teil | Monitor-Default / Abweichung |
|---|---|
| `bodyDepthMm` | **15,0 mm** (Handheld: 8 mm) |
| `bezelWidthMm` | **7,0 mm** (0,007 m; Handheld: 2,5 / 4 mm) |
| Glas, Screen, Backplates, Z-Gaps, Z-Überstand | wie Handheld (1 mm Glas, 0,02 mm Glas↔Screen, …) |

**Kein** separates Body-Shell — nur Bezel-Ring mit Loch. Stack-Tiefe mit Glazing wie Handheld (~5 mm effektiv im Opening-Stack).

Geometrie-Rebuild bei: `screenImageId`, `sizeScale`, Display-`params`, Stand-`params`, Artikulation, Material-IDs, `glazingEnabled`, `geometryVisibility`.

---

**Category:** Assets — Monitor  
**Title:** Stand — Standfläche & Standfuß (mm)  
**Description:** Zwei zusätzliche Meshes unter dem Display (Material Default: Aluminum Brushed).

| Teil | Maß (bei scale 1) | Position / Hinweis |
|---|---|---|
| **Standfläche** (`standBase`) | Höhe **Y = 7 mm**; Footprint **X × Z** = `standBaseWidthMm` × `standBaseDepthMm` | Draufsicht: **abgerundetes Rechteck**; Eckenradius `standBaseCornerRadiusMm`. **Unterkante** = Entity-Bodenkontakt (auf Ground). |
| **Standfuß** (`standFoot`) | **X = 70 mm**, **Z = 7 mm**, **Y = 300 mm** (Höhe) | **X** mittig; **Z** mit `standFootOffsetZMm` nach hinten (−Z). Display-Pivot **Z = 0** (Bildschirm zentriert), unabhängig vom Fuß-Offset. |

**Default Footprint Standfläche (v1):**

| Param | Default |
|---|---|
| `standBaseWidthMm` | **250 mm** |
| `standBaseDepthMm` | **120 mm** |
| `standBaseCornerRadiusMm` | **8 mm** |
| `standFootWidthMm` | **70 mm** |
| `standFootDepthMm` | **7 mm** |
| `standFootHeightMm` | **300 mm** |
| `standFootOffsetZMm` | **40 mm** (Fuß **4 cm** nach hinten, −Z; Display bleibt Z = 0) |

Footprint mindestens Fußbreite + Rand; Defaults bewusst größer als Fuß (70 mm) für stabile Mockup-Silhouette. Optional später: Footprint proportional zur Display-Außenbreite.

---

**Category:** Assets — Monitor  
**Title:** Artikulation — Neigung & Montagehöhe  
**Description:** Zwei Params auf `AssetEntity.params` (Monitor only) — **nur** Display relativ zum Standfuß; Entity-`transform` am Root für Gesamtplatzierung.

| Param | Bedeutung | v1 UI |
|---|---|---|
| `displayTiltDeg` | Rotation Display um **lokale X** (Neigung vor/zurück). **Pivot:** Anschluss an **Oberkante Standfuß** (Mitte Fuß in X/Z). | Slider oder Number (Grad) |
| `displayMountHeightMm` | Vertikale Position des Display-Pivot **relativ zur Unterkante des Standfußes** (Y entlang Fuß). Default: **70 mm** (0,07 m). | Slider (mm) |

**Clamp (v1):** `displayMountHeightMm` ∈ `[0, standFootHeightMm]` (optional kleiner Überstand über Fußspitze → später). `displayTiltDeg` Richtwert **−15° … +15°** (exakte Range bei Implementierung festlegen).

**Gizmo:** Move/Rotate/Scale am **Root** dreht/verschiebt **gesamten** Monitor inkl. Stand; Artikulations-Params bewegen nur Display-Assembly.

---

**Category:** Assets — Monitor  
**Title:** Default-Params (Built-in)  
**Description:** Werkseitige Defaults (`assetKind: monitor`):

| Param | Default |
|---|---|
| `screenCornerRadiusMm` | **7 mm** |
| `bezelWidthMm` | **7 mm** |
| `outerEdgeRadiusMm` | **1,0 mm** |
| `bodyDepthMm` | **15,0 mm** |
| `glazingEnabled` | **true** |
| `standBaseWidthMm` | **250 mm** |
| `standBaseDepthMm` | **120 mm** |
| `standBaseCornerRadiusMm` | **8 mm** |
| `standFootWidthMm` | **70 mm** |
| `standFootDepthMm` | **7 mm** |
| `standFootHeightMm` | **300 mm** |
| `standFootOffsetZMm` | **40** |
| `displayTiltDeg` | **0** |
| `displayMountHeightMm` | **70** (0,07 m — Pivot entlang Fuß, Default unterhalb Fußspitze) |
| `frameMaterialId` | `material-aluminium-brushed` |
| `sideButtonMaterialId` | `material-aluminium-brushed` |
| `backWallMaterialId` | `material-aluminium-brushed` |
| `backGlassMaterialId` | `material-aluminium-brushed` |
| `standBaseMaterialId` | `material-aluminium-brushed` |
| `standFootMaterialId` | `material-aluminium-brushed` |
| `glazingMaterialId` | `material-glass-pane` |

`outerCornerRadiusMm` = `screenCornerRadiusMm + bezelWidthMm` (Engine, nicht gespeichert).

---

**Category:** Assets — Monitor  
**Title:** Entity-Params & Datenmodell  
**Description:** Erweiterung von `AssetEntity` für `monitor`:

```ts
// On AssetEntity.params (monitor) — geometry mm at sizeScale 1 unless noted
type MonitorDeviceParams = {
  // Display (Handheld-compatible)
  screenCornerRadiusMm: number;
  bezelWidthMm: number;
  outerEdgeRadiusMm: number;
  bodyDepthMm?: number;
  // Stand
  standBaseWidthMm: number;
  standBaseDepthMm: number;
  standBaseCornerRadiusMm: number;
  standFootWidthMm: number;
  standFootDepthMm: number;
  standFootHeightMm: number;
  standFootOffsetZMm: number;
  // Articulation
  displayTiltDeg: number;
  displayMountHeightMm: number;
};

type MonitorMaterialSlots = {
  frameMaterialId?: string;
  sideButtonMaterialId?: string;
  backWallMaterialId?: string;
  backGlassMaterialId?: string;
  standBaseMaterialId?: string;
  standFootMaterialId?: string;
  glazingEnabled?: boolean;
  glazingMaterialId?: string;
};
```

Weiterhin: `screenImageId`, `imageSurfaces`, `sizeScale`, `transform`, `geometryVisibility` — wie Assets/Handheld.

**Scene-API (Ziel):**

- `setMonitorParams(entityId, partial<MonitorDeviceParams>)` — Rebuild Display + Stand + Pivot
- Handheld-äquivalente APIs für Screen, ImageSurface, Materials, Geometry visibility — erweitert um `standBaseMaterialId`, `standFootMaterialId`, Sichtbarkeit `standBase` / `standFoot`

---

**Category:** Assets — Monitor  
**Title:** Mesh-Teile & Material-Slots  
**Description:**

| Mesh | `assetMeshRole` | castShadow | receiveShadow | Material-Slot |
|---|---|---|---|---|
| Bezel / frame ring | `frame` | ja | ja | `frameMaterialId` |
| Screen (Bild) | `screen` | ja | ja | `imageSurfaces.front` |
| Front glass | `glazing` | nein | ja | Caps: `glazingMaterialId`; Seiten: `frameMaterialId` |
| Outer backplate | `outerBackPlate` | ja | ja | `backGlassMaterialId` |
| Base backplate | `backWall` | ja | ja | `backWallMaterialId` |
| Side button (×2) | `sideButton` | ja | ja | `sideButtonMaterialId` |
| Standfläche | `standBase` | ja | ja | `standBaseMaterialId` |
| Standfuß | `standFoot` | ja | ja | `standFootMaterialId` |

Nach Rebuild: `applyAssetShadowFlags(group)` → [`requirements-shadows.md`](./requirements-shadows.md).

---

**Category:** Assets — Monitor  
**Title:** Geometrie — Engine (Ziel v1)  
**Description:** **Display:** Rebuild-Pipeline wie Handheld (`computeHandheldLayerStack` / Monitor-Variante mit angepassten Defaults und `sideButtonCentersY`). **Stand:** parametrische Boxen/Extrudes für Platte (abgerundetes Rechteck) und Fuß; Parenting unter Pivot-Group.

**Monitor-spezifisch:**

- Seitentasten-Stack-Mitte **Y** = **`-outerHeight / 4`** (Mitte **unterer** Hälfte); Handheld: `+outerHeight / 4`.
- CSG / Screen-Opening / Multi-Material-Glas: **Pflichtregeln** aus Handheld-Doc (Tests analog `handheld-frame-csg.test.ts` für Monitor-Frame).

**Konstanten:** Seitentasten mm wie Handheld (`SIDE_BUTTON_LENGTH_MM`, `SIDE_BUTTON_THICKNESS_MM`, …) — shared Konstanten-Datei empfohlen (`asset-handheld.ts` oder `device-side-buttons.ts`).

---

**Category:** Assets — Monitor  
**Title:** Glazing  
**Description:** Identisch Handheld → [`requirements-assets-devices-handheld.md`](./requirements-assets-devices-handheld.md) (Glazing-Block). Default **an**. Glazing castet keinen Schatten.

---

**Category:** Assets — Monitor  
**Title:** Seitentasten v1 — Volume (rechts, untere Hälfte)  
**Description:** Portrait, Vorderseite zum User: **rechte Seite** (+X), **unterer Bereich**, **zentriert in Gerätetiefe** (Z = −bodyDepth/2) — **2×** gestapelte Tasten. **Gleiche** Loch-/Button-mm wie Handheld.

| Konstante | Monitor-Abweichung |
|---|---|
| Stack-Mitte (Y) | **`-outerHeight / 4`** (Mitte untere Hälfte) |
| Alle anderen `SIDE_BUTTON_*` | unverändert × `sizeScale` |

Loch/CSG/Button-Geometrie: siehe Handheld-Doc. Kein Power-Button v1.

---

**Category:** Assets — Monitor  
**Title:** Screen-Opening & Multi-Material-Extrude  
**Description:** **Pflicht** — vollständige Regeln und Tests wie Handheld (durchgehendes Loch, Cutter-Padding, keine Transmission-Linien im Tunnel). → [`requirements-assets-devices-handheld.md`](./requirements-assets-devices-handheld.md) (Screen-Opening, Multi-Material-Extrude).

---

**Category:** Assets — Monitor  
**Title:** Außenkanten-Rundung (Display)  
**Description:** Wie Handheld: `outerEdgeRadiusMm` am Bezel-Ring-Extrude; Clamp `min(outerEdgeRadiusMm, bodyDepthMm / 2, 3)`; Default **1 mm**. Standfläche: eigener `standBaseCornerRadiusMm` (Draufsicht), unabhängig vom Display-`outerEdgeRadiusMm`.

---

**Category:** Assets — Monitor  
**Title:** Szene-Panel (UI)  
**Description:** Right Sub, Entity-Block für `monitor`:

1. **Screen / Image** — `ImageSurfaceFields`
2. **Corner radius (mm)** — `screenCornerRadiusMm`
3. **Bezel width (mm)** — `bezelWidthMm`
4. **Glazing** — Checkbox
5. **Display tilt (deg)** — `displayTiltDeg`
6. **Display mount height (mm)** — `displayMountHeightMm`
7. **Materials** — Frame, Backplates, Side button, Stand base, Stand foot (Dropdowns)
8. **Transform** + **Size** — wie andere Assets

Stand-Footprint-/Fuß-mm v1: Defaults im Code; UI-Felder optional später (oder Advanced-Section).

---

**Category:** Assets — Monitor  
**Title:** Katalog (Built-in)  
**Description:** Ein Eintrag in Left Sub → Assets:

| ID | `assetKind` | Anzeigename |
|---|---|---|
| `asset-monitor` | `monitor` | Monitor |

Icon/Thumbnail: Vorschau mit Default-Params. Mehrfach-Instanzen unbegrenzt → [`requirements-assets.md`](./requirements-assets.md).

---

**Category:** Assets — Monitor  
**Title:** Geometries Panel  
**Description:** Right Sub: Sektion **„Geometries“**. Pro Teil: Checkbox + Material-Dropdown. Teile: **Frame**, **Display glass**, **Base backplate**, **Outer backplate**, **Side button**, **Stand base**, **Stand foot**. **Screen / Image** eigene Sektion mit `ImageSurfaceFields`.

**`geometryVisibility`:** `frame`, `glazing`, `backWall`, `outerBackPlate`, `sideButton`, `standBase`, `standFoot`. Default: alle sichtbar. Display glass aus → Z-Stack wie Handheld (Screen an Frame-Front).

---

**Category:** Assets — Monitor  
**Title:** Später (nicht v1)  
**Description:** Flacher Monitor ohne Stand; Browser-Frame; Squircle; Notch; Power-Button; Standfootprint proportional zum Display; Panel-Felder für alle Stand-mm; Drag Image → Screen; Edge roundness auf Glas/Backplate; gemeinsame Handheld/Monitor-CSG-Tests in CI.

---

**Category:** Assets — Monitor  
**Title:** Offene Punkte (TBD)  
**Description:** Exakter Clamp `displayTiltDeg`; ob `displayMountHeightMm` Überstand über Fußspitze erlaubt; Standfläche X/Z-Ausrichtung relativ zum Display (Fuß immer zentriert vs. unter Display-Mitte); CSG-Performance bei Slider-Drag. **Nicht im Code raten** — Diary oder Requirement-Update.
