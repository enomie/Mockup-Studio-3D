# Assets — Picture framed (Bilderrahmen)

Parametrischer **Bilderrahmen** um eine bildgetriebene Opening — Bild aus der **Images-Bibliothek** → [`requirements-images.md`](./requirements-images.md). Katalog, Entity-Modell, Drop/Add, image-driven sizing, Szene-Panel-Grundlagen → [`requirements-assets.md`](./requirements-assets.md). Material-Slots & Presets → [`requirements-materials.md`](./requirements-materials.md). Bild-Flächen (Matt/Glossy, Emissive) → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md). Uniform Scale → [`requirements-gimbals.md`](./requirements-gimbals.md).

**Abgrenzung:** Dieses Doc beschreibt **nur** `assetKind: picture` (UI: **Picture Frame**, Katalog-Kategorie **print**). Device Smartphone / Device Tablet → [`requirements-assets-devices-handheld.md`](./requirements-assets-devices-handheld.md); Device Desktop → [`requirements-assets-devices-monitor.md`](./requirements-assets-devices-monitor.md); Print → [`requirements-assets.md`](./requirements-assets.md) (Print-Abschnitte).

**Status:** v1 **teilweise implementiert** — Katalog-Eintrag, Default-Portfolio-Szene, extrudierter Rahmen (`frame-geometry.ts`), Z-Stack (Bild, Rückwand, optionales Glas), Perimeter-UVs, Geometries-Panel (Sichtbarkeit + Material pro Teil), `screenImageId` + `imageSurfaces`, Material-Resolver vor Default-Spawn. **Offen:** Drag Image → Viewport, Katalog-Polish, Abgleich Glazing-Default (s. unten).

**v1-Scope:** Rechteckige Opening (kein Corner radius am Rahmen/Bild). Referenzbreite **50 cm**; Platzhalter **50 × 60 cm** Hochformat. Rahmen **ein** extrudierter Ring; optional **Display glass** (2 mm, Transmission). Kein Stretch — Cover auf exakt passender Geometrie → `.cursor/rules/image-aspect-ratio.mdc`.

---

**Category:** Assets — Picture framed  
**Title:** Identität & Katalog  
**Description:** Built-in Baustein, nicht löschbar. **`assetKind`:** `picture`. **Label:** Picture Frame. **Kategorie:** `print` (Lucide `Image`). Stabile ID im Katalog über `kind` — kein separates Asset pro Orientierung; Portrait/Landscape folgt dem zugewiesenen Bild. App-Start: eine Instanz im Portfolio-Layout (`DEFAULT_SCENE_ASSETS`, Position z. B. x ≈ −0,55 m). Mehrfach-Instanzen unbegrenzt — je Instanz eigene `id`, `transform`, `screenImageId`, Material-Slots.

---

**Category:** Assets — Picture framed  
**Title:** Image-driven sizing  
**Description:** Wie [`requirements-assets.md`](./requirements-assets.md): **Nie Bilder verzerren.** Das zugewiesene Bild (`screenImageId` → `ImageAsset.width` / `height`) definiert **Opening-Seitenverhältnis** und Orientierung. **Referenzkante:** Opening-**Breite** **0,500 m** (50 cm). Höhe = Breite / Aspect-Ratio. **Uniform scale:** `sizeScale` (Default `1`, Range `0.05`–`5`) multipliziert alle mm-Maße und die Referenzbreite proportional — Ratio bleibt bildgetrieben. Panel **Dimensions:** nur **Width (m)** und **Height (m)** (gekoppelt; **kein** Size-Feld); Gizmo-Scale unverändert; `setAssetSizeScale` ändert **nicht** `transform.position.y`. Szene-Panel-Reihenfolge → [`improve-04-asset-settings.md`](../improve/improve-04-asset-settings.md).

| Zustand | Aspect-Ratio |
|---|---|
| Mit `screenImageId` | `imageWidth / imageHeight` |
| Ohne Bild (Platzhalter) | **50 / 60** (Hochformat 50 × 60 cm) |

**Außenmaß Rahmen:** Opening + **2 × 18 mm** Balkenbreite pro Achse (`FRAME_THICKNESS`). Texture auf Screen: **Cover** auf Plane mit exakt Opening-Maßen — kein UV-Stretch.

**Abgrenzung Print:** Print hat einstellbaren **Corner radius** und Prisma-Tiefe — Picture framed **ohne** Corner-Radius (bewusst verworfen → Diary 2026-10-08).

---

**Category:** Assets — Picture framed  
**Title:** Z-Aufbau & mm-Maße (v1)  
**Description:** Feste Bauteilmaße bei `sizeScale = 1` (Scene-Einheit = m). **Front = z = 0** (Vorderseite Rahmen). Alle Werte × `sizeScale` bei Rebuild. Opening = `faceWidth` × `faceHeight` (nur Innenloch; Bild und Rückwand **exakt** Opening-Größe — kein XY-Inset).

| Teil | Maß / Position (Z, Front = 0) |
|---|---|
| Rahmen (extrudierter Ring) | **Ein** Mesh: 2D-Ring (Außen − Innenloch), Profil **18 mm × 12 mm** (Balkenbreite × Tiefe); Front z = 0; Rückseite z = −0,012 m |
| Bild (Screen-Plane) | Rechteckige **Plane** (0-dick), z = **−0,004 m** (4 mm Falz hinter Rahmenfront) |
| Rückwand (`backWall`) | **3 mm** dick; **hinten bündig** mit Rahmen (Vorderseite Rückwand z = −0,009 m) |
| Hohlraum Bild ↔ Rückwand | **5 mm** (12 − 3 − 4) |
| Display glass (optional) | **2 mm** Extrude; Glas-Rückseite z = **−0,003 m**, Glasfront z = **−0,001 m**; **1 mm** Luftspalt zwischen Glas-Rückseite und Bild |

Geometrie-Rebuild bei: `screenImageId`, `sizeScale`, `geometryVisibility`, Material-IDs (`frameMaterialId`, `backWallMaterialId`, `glazingMaterialId`), `imageSurfaces` (Finish/Emissive/Passepartout).

**Passepartout:** rechteckig nur — **kein** Bild-Eckenradius. Bei `passepartoutOffsetM > 0` zwei koplanare Planes im Opening (Passepartout + Bild); Depth/`renderOrder` → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md) („Depth & Draw Order“).

**Entscheidung (Diary):** Bild-Falz **4 mm** (nicht 5); Glas **1 mm** vor Bild, nicht bündig mit Rahmenfront z = 0.

---

**Category:** Assets — Picture framed  
**Title:** Rahmen-Geometrie — Extrusion & Perimeter-UVs  
**Description:** Rahmen v2: **kein** 4× `BoxGeometry` — **ein** extrudierter 2D-Ring (Außenrechteck minus Opening-Loch), `ExtrudeGeometry`. Gehrung entsteht durch Ring-Form; **kein** L-Rabbet im Extrude-Profil — Bildfalz über Z-Offsets (Screen, Glas).

**Material:** **Ein** Mesh, **ein** `frameMaterialId` — kein H/V-`grainAlongU`-Split, keine zweite Material-Instanz.

**UV:** Custom Perimeter-UVs (`assignExtrudedFrameUvs`):

- `UV.u` = **globale Bogenlänge** entlang der Außen-Mittellinie (CCW), stetig an Ecken — nicht lokal pro Balken
- `UV.v` = quer zur Balkenlänge (Caps) bzw. Tiefe 0…1 (Seitenwände)

**Verworfen:** 4 überlappende Box-Balken; Plane-Faces; `grainAlongU`-Split am Rahmen.

**Engine:** [`src/engine/frame-geometry.ts`](../../src/engine/frame-geometry.ts) — `createExtrudedFrameGeometry`, `assignExtrudedFrameUvs`; aufgerufen aus [`src/engine/asset-meshes.ts`](../../src/engine/asset-meshes.ts) (`addPicture`). Material-Resolve: `surfaceRole: 'frame'`, `grainAlongU: true`.

---

**Category:** Assets — Picture framed  
**Title:** Display glass (Glazing)  
**Description:** Optionale **echte Glasscheibe** vor dem Bild — separates Mesh + **Transmission** (`material-glass-pane`), nicht nur Specular auf der Bild-Plane.

**Geometrie:** `createRectangularGlassSlabGeometry` — **2 mm** Extrude, **Multi-Material:** Caps → Pane-Shader; **Seitenwände** → gleiches Material wie Rahmen (`frameMaterialId`) — analog Handheld-Glas.

**UI:** Geometries-Sektion — Teil **Display glass**: Checkbox (Sichtbarkeit) + Material-Dropdown (`glazingMaterialId`, Default Preset **Glass (pane)**). **Glasrahmen:** User wählt **`material-glass-solid`** als **Frame material** — volumetrischer Glas-Ring; optischer Look aus Preset, nicht aus mm im Material.

**Trennung:** Asset-Geometrie = mm-Stack (2 mm Scheibe, 1 mm Luft, 4 mm Falz, 12 mm Rahmen, 3 mm Rückwand). Material-Presets = IOR, Roughness, Tint (pane vs. solid).

**Schatten:** Glazing **receive**, **kein** cast → [`requirements-shadows.md`](./requirements-shadows.md), `applyAssetShadowFlags`.

**Verworfen v1:** Nur Shader-Glanz auf Bild ohne Geometrie.

**Später:** Frosted glass Rahmen, AR-Preset, Tint; Performance bei vielen transparenten Meshes.

**Ziel-Default:** Display glass **aus** (nicht gerendert) — UX wie früheres `glazingEnabled: false` → [`requirements-materials.md`](./requirements-materials.md). **Abgleich:** `defaultGeometryVisibility('picture')` setzt aktuell `glazing: true` (Test) — mit Ziel-Default harmonisieren (TBD).

---

**Category:** Assets — Picture framed  
**Title:** Geometries Panel (Szene)  
**Description:** Right Sub bei selektierter Picture-Entity: Sektion **„Geometries“** — pro Teil **Checkbox** (Sichtbarkeit) + **Material-Dropdown** (alle Presets). Teile: **Frame**, **Display glass**, **Backplate** (`backWall`). **Screen / Image** eigene Sektion mit **`ImageSurfaceFields`** (Image, Finish Matt/Glossy, Emissive) — kein Geometries-Checkbox am Screen.

**Datenmodell:** `AssetEntity.geometryVisibility` — Keys `frame`, `glazing`, `backWall`. Material-Slots: `frameMaterialId`, `glazingMaterialId`, `backWallMaterialId`. API: `SceneApi.setGeometryVisible(entityId, part, visible)` → Entity-Rebuild. Legacy `materials.glazingEnabled` → `geometryVisibility.glazing` migrieren (`migrateGeometryVisibility`).

**Defaults Material (Built-in Spawn):** Rahmen `material-gold`, Rückwand `material-paper`, Screen-Finish über `imageSurfaces` (typ. glossy → `material-glossy-print` intern).

---

**Category:** Assets — Picture framed  
**Title:** Material-Slots & Kombinationen  
**Description:** Slot-Zuordnung und Preset-Kombinationen → [`requirements-materials.md`](./requirements-materials.md) (Tabelle `picture`). Kurz:

| Rahmen-Material | Display glass an | Effekt |
|---|---|---|
| Gold / Wood / Chrome / Brushed | aus | Klassischer Rahmen |
| Gold / Wood / … | an | Rahmen + Scheibe vor Bild |
| **Glass (solid)** | aus | **Glasrahmen** — volumetrische Kanten |
| Glass (solid) | an | Glasrahmen + zusätzliche Pane-Scheibe |

Procedural am Rahmen (Wood, `metal-brushed`, `metal-polished`): Sampling über Perimeter-`uv` — Details → [`requirements-materials.md`](./requirements-materials.md) (Rahmen-UVs & Procedural).

---

**Category:** Assets — Picture framed  
**Title:** Screen-Bild & Platzhalter  
**Description:** **`screenImageId`:** `null` = neutraler Platzhalter auf Opening-Plane (einheitliches Grau), **50:60** Geometrie. Mit Bild: rechteckige Plane, **keine** abgerundeten Screen-Ecken (anders als Handheld). **`imageSurfaces.front`:** Finish + Emissive. Raycast-Pick: `userData.isAssetScreen` / `assetMeshRole: 'screen'`. Drag Image → Viewport: **später** — v1 nur Picker im Panel → [`requirements-assets.md`](./requirements-assets.md).

---

**Category:** Assets — Picture framed  
**Title:** Entity-Felder & Scene-API  
**Description:** `AssetEntity` für `picture`: `assetKind: 'picture'`, `screenImageId`, `sizeScale`, `transform`, `materials` (Slots oben), `geometryVisibility`, `imageSurfaces`. Kein `params` / `printParams` / `depth`. Relevante API-Aufrufe (UI → Scene-API, kein Three in UI):

- `addAsset('picture', …)` / `removeEntity`
- `setAssetImage(entityId, imageId | null)`
- `setAssetSizeScale(entityId, factor)`
- `setEntityMaterial(entityId, slot, materialId)`
- `setGeometryVisible(entityId, part, visible)`

**Engine:** Builtin-Material-Resolver (`resolveBuiltinMaterialPreset`) muss **vor** erstem `addAsset('picture')` aktiv sein; bei UI-Connect `rebuildAllEntities()` — sonst Fallback-Grau trotz korrektem Panel-Label (Diary 2026-10-08).

---

**Category:** Assets — Picture framed  
**Title:** Schatten & Render  
**Description:** Nach jedem Picture-Rebuild: `applyAssetShadowFlags(group)` — alle Meshes **receive**; Frame, Screen, Backplate **cast**; Glazing nur receive. Globale Bias-Referenz `SHADOW_NORMAL_BIAS = 0` / `SHADOW_DEPTH_BIAS = 0` für mm-Kontakt (Rahmen → Bild, Boden) — nur bei Acne minimal erhöhen → [`requirements-shadows.md`](./requirements-shadows.md). Glazing: `renderOrder` erhöht, `polygonOffset` auf Pane-Material wo nötig.

---

**Category:** Assets — Picture framed  
**Title:** UI-Längen & Ecken  
**Description:** Längen-Eingaben projektweit **4 Dezimalstellen** (0,1 mm) → [`requirements-code.md`](./requirements-code.md) / Diary Print+Picture-Kontext. **Kein** Panel-Feld **Corner radius** für Picture framed (nur Print/Handheld).

---

**Category:** Assets — Picture framed  
**Title:** Offene Punkte (TBD)  
**Description:** Glazing-Default (`geometryVisibility.glazing` false vs. aktueller Code/Test). Spawn-Position bei Drop (Cursor-Raycast). Serialisierung Scene-Preset inkl. Picture-Material-Slots. Frosted/AR-Glas. Performance debounce bei schnellem Bild-Wechsel. **Nicht im Code raten** — Requirement ergänzen oder Diary.

---
