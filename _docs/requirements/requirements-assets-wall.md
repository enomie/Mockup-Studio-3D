# Assets — Wall & Wall Doorway

Parametrische **Wand-Bausteine** für Raum-/Tapeten-Mockups — Tapetenmotiv aus der **Images-Bibliothek** nur auf der **Vorderseite**. Katalog, Entity-Modell, Placement-Grundlagen → [`requirements-assets.md`](./requirements-assets.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md). Material-Presets → [`requirements-materials.md`](./requirements-materials.md) (**Print Matt** = `material-paper`). Bild-Finish/Emissive → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md). Tapeten-Front: **Repeat in m** (Ausnahme zu Cover-only auf anderen Screens) → `.cursor/rules/image-aspect-ratio.mdc` (Tile/Repeat erlaubt).

**Abgrenzung:** Dieses Doc beschreibt **`assetKind: wall`** (UI: **Wall**) und **`assetKind: wall-door`** (UI: **Wall Doorway**). Picture framed, Print, Devices → eigene Asset-Docs. **Ausbaustufe** Türrahmen (wie Picture framed) nur als Platzhalter — separates Design-Gespräch.

**Status:** v1 **teilweise implementiert** — Katalog (`architecture`), `wall` / `wall-door`, Box-Geometrie + Tür-CSG, Half-Drop-Wallpaper-Shader, Szene-Panel (Maße, Material, Strip), Bottom-Pivot-Spawn. **Offen:** Türrahmen, Drag Image → Viewport, Scene-Presets.

**v1-Scope (Basis):** Rechteckige Wand (Box), drei einstellbare Maße (Breite, Höhe, Dicke), Vorderseite mit **Tapeten-Repeat** (festes Raster in m + **Half-Drop**), Wand ohne Bild = neutrale Vorderseite mit Default-Material. **Wall Doorway:** gleiche Parameter + feste Türöffnung per CSG. **Soll (kein Muss):** beim Platzieren Y so setzen, dass die Wand auf dem Boden steht. **Nicht v1:** Türrahmen, Türblatt, Zarge, Drag Image → Viewport, gerades Raster ohne Versatz.

---

**Category:** Assets — Wall  
**Title:** Identität & Katalog  
**Description:** Zwei Built-in Bausteine, nicht löschbar.

| `assetKind` | UI-Label | Kategorie (Ziel) |
|---|---|---|
| `wall` | Wall | **Architecture** (neue Katalog-Gruppe; Lucide z. B. `brick-wall` / `panel-top`) |
| `wall-door` | Wall Doorway | **Architecture** |

Stabile `kind`-IDs — kein Upload eigener 3D-Wände in v1. Mehrfach-Instanzen unbegrenzt. Default-Szene: **keine** Pflicht-Instanz (optional später in Scene-Presets für Tapeten-Layouts).

---

**Category:** Assets — Wall  
**Title:** Koordinaten & Orientierung (Lokal)  
**Description:** Wand steht **senkrecht**; **Boden** = Welt-`y = 0` (Ground-Ebene). Lokal:

- **Y** = hoch (Höhe der Wand)
- **X** = Breite entlang der Wand (**links** = **−X/2**, **rechts** = **+X/2** bei zentriertem Pivot — siehe Pivot)
- **Z** = Dicke; **Vorderseite (Front)** = **+Z** (Tapeten-/Bildseite, zur Default-Kamera hin)
- **Rückseite** = −Z

Default-`transform.rotation`: Front zeigt zur Szene / Kamera (exakter Default-Winkel bei Implementierung festlegen, konsistent mit Portfolio-Layout). Move/Rotate per Gizmo → [`requirements-scene-placement.md`](./requirements-scene-placement.md).

**Pivot:** **Unterkante** der Wand bei **lokal y = 0** (Mittelpunkt in X/Z auf Wandmitte). Tapeten-Phase ist an **lokale** Front-Ecke **unten links** gebunden — Wand **verschieben/drehen** = Schnittkanten am Muster verschieben; User „stellt Half-Drop richtig“, indem er die Wand im Raum positioniert (kein separates Pattern-Offset-Feld in v1).

**Placement / Boden:** Beim Add/Drop: `transform.position.y` so, dass die Unterkante auf Ground (+ `ASSET_SPAWN_BASE_Y`) steht. Nach **jedem Rebuild durch Wand-Panel** (Bild/Tapete, `wallParams`, `wallpaperPattern`): Engine setzt **`position.y` erneut auf Boden** — X/Z und Rotation bleiben. User kann die Wand per Gizmo in Y bewegen; der nächste Panel-Edit snappt Y zurück. Scale-Gizmo: **TBD** — `sizeScale` uniform auf `wallParams` **oder** nur Panel-Felder in v1.

---

**Category:** Assets — Wall  
**Title:** Abmessungen (Defaults & Panel)  
**Description:** Maße in **Metern** (UI **4 Dezimalstellen**, 0,1 mm — wie Projekt-Standard). Gespeichert auf der Entity als **`wallParams`** (beide `assetKind` teilen dieselbe Param-Struktur; Türöffnung nur bei `wall-door`).

| Parameter | Default | UI | Hinweis |
|---|---|---|---|
| `widthM` | **4,0** | Breite (m) | Entlang **X** |
| `heightM` | **4,0** | Höhe (m) | Entlang **Y** |
| `thicknessM` | **0,4** | Dicke (m) | Entlang **Z** |

**Kein image-driven sizing** für die Wandgeometrie — Bild/Tapete ändert **nicht** automatisch `widthM`/`heightM`. User stellt Wandmaß unabhängig vom Motiv ein.

**Rebuild** bei jeder Änderung von `wallParams`, `screenImageId`, `wallpaperPattern`, Material-Slots, `imageSurfaces`.

Min/Max (TBD Implementierung): sinnvolle Clamps z. B. Breite/Höhe `0,5`–`20` m, Dicke `0,05`–`2` m.

---

**Category:** Assets — Wall  
**Title:** Geometrie — Wall (ohne Tür)  
**Description:** **Ein** Mesh (oder Gruppe mit klar getrennten Material-Gruppen): **`BoxGeometry`** `widthM × heightM × thicknessM`, Pivot **unten zentriert** (Mittelpunkt in X/Z, **y = 0** an Unterkante). Vorderseite = +Z-Fläche.

**Schatten:** **castShadow** und **receiveShadow** auf dem Wand-Mesh — Pflicht → [`requirements-shadows.md`](./requirements-shadows.md), `applyAssetShadowFlags` nach Rebuild. Keine Ausnahme wie Glazing.

---

**Category:** Assets — Wall  
**Title:** Geometrie — Wall Doorway (CSG)  
**Description:** Ausgangs-Box wie **Wall**, dann **Boolean Subtract** (Ziel: **`three-bvh-csg`**, gleiches Muster wie Handheld/Monitor-Recesses → [`requirements-assets-devices-handheld.md`](./requirements-assets-devices-handheld.md)):

**Türöffnung (v1 fest, nicht im Panel):**

| Maß | Wert |
|---|---|
| Breite | **2,0 m** |
| Höhe | **2,5 m** |
| Position X | **1,0 m** Abstand von der **linken** Wandkante (innerer/linker Rand der Öffnung bei **x = −widthM/2 + 1,0 m**) |
| Position Y | **Boden** — Unterkante Öffnung = Unterkante Wand (**y = 0** lokal) |
| Position Z | Durchgehend durch **volle** `thicknessM` (Öffnung von Front bis Back) |

Öffnung bleibt **rechteckig**; Kanten scharf (kein Radius v1). Bei `widthM` &lt; 3 m oder `heightM` &lt; 2,5 m: Engine **clamp** oder Validierung + UI-Warnung (TBD — Öffnung darf Wand nicht „zerbrechen“).

**Sichtbare Innenkanten** der Öffnung: Material Default **Print Matt** (gleich wie Wandkörper), sofern kein separates Slot v2.

---

**Category:** Assets — Wall  
**Title:** Material — Körper & Default  
**Description:** Default-Oberfläche der Wand (Rückseite, Kanten, Vorderseite **ohne** zugewiesenes Bild): Preset **Print Matt** (`material-paper`).

**Slot (Ziel):** `bodyMaterialId` oder `wallMaterialId` — **ein** Preset für alle nicht-bildtragenden Flächen und als Basis hinter dem Tapeten-Layer. Dropdown im Szene-Panel (Geometries oder Materials-Sektion — TBD Layout).

Mit **`screenImageId`:** nur **Front** trägt das Tapetenmotiv; Rückseite und Seitenflächen bleiben `wallMaterialId` (Default Print Matt).

---

**Category:** Assets — Wall  
**Title:** Front — Bild nur auf Vorderseite  
**Description:** **`screenImageId`** (wie andere bildtragende Assets) — **nur** die **Front**-Fläche (+Z). Kein Bild auf Rückseite/Seiten in v1.

**UI:** Sektion **Screen / Image** (oder **Wallpaper / Image**) mit Image-Picker + **`ImageSurfaceFields`** (Finish Matt/Glossy, Emissive) → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md). Erweiterung Tabelle:

| assetKind | Flächen |
|---|---|
| `wall`, `wall-door` | `front` |

**Ohne Bild:** Front = einfarbig / Print-Matt-Look (kein Platzhalter-Muster v1 — einheitliches Grau oder Preset-Farbe, konsistent mit anderen Assets).

**Mapping:** Das Motiv wird **nicht** über die ganze Wand gelegt (kein Full-Quad-Cover). → Tapeten-**Repeat** (nächster Block).

---

**Category:** Assets — Wall  
**Title:** Tapetenmuster (Wallpaper pattern) — Pflicht v1  
**Description:** Front-Textur = **gekacheltes Tapetenlayout** in festen **Weltmetern**: ein **Tapetenstück** ist **`stripWidthM` breit × `stripHeightM` hoch** — exakt so wird es **horizontal und vertikal wiederholt** (**Repeat / Tile**). **Kein Cover, kein Contain** auf der Wandfront (bewusste **Ausnahme** zur üblichen Cover-Regel auf Asset-Screens — hier zählt Rollenmaß in Metern, vgl. Ground-**Tile** → [`requirements-ground.md`](./requirements-ground.md), [`requirements-images.md`](./requirements-images.md)).

**Parameter** auf Entity: **`wallpaperPattern`** (wenn `screenImageId` gesetzt):

| Feld | Bedeutung | Default (TBD) |
|---|---|---|
| `stripWidthM` | Breite **eines** Tapetenstücks (Welt-maß) | z. B. **0,53** m |
| `stripHeightM` | Höhe **eines** Tapetenstücks (Welt-maß) | Mit **`screenImageId`:** **`stripWidthM × (imageHeight / imageWidth)`** — **kein Stretch** pro Kachel (vgl. [`image-aspect-ratio`](../../.cursor/rules/image-aspect-ratio.mdc)). Ohne Bild: manuell, Default z. B. **2,0** m |
| `columnOffsetM` | **Y-Versatz** nur für **ungerade** Spalten (Nebeneinander-Versatz / Half-Drop) | **`stripHeightM / 2`**; **0** = gerades Raster |

**Textur pro Stück:** UV **0…1** auf das Rechteck **`stripWidthM × stripHeightM`**; dieselbe Textur **wiederholt** auf der gesamten Front (Clipping an Wandrand). **Nicht** die Wand auf ein Bild skalieren.

**Raster (lokal, unten links):** `vShift = (Spalte ungerade) ? columnOffsetM : 0`; `uTex` / `vTex` per Repeat innerhalb jeder Zelle.

1. Wand-Front = **widthM × heightM**, Raster-Ursprung **unten links** (lokal).
2. Spalte `i` beginnt bei `x = i × stripWidthM`.
3. Am Wandrand: Teilstücke **abschneiden** (kein Skalieren der letzten Bahn).

**Front-Mesh vs. Körper:** Tapeten-Plane **0,5 mm** vor der Box-Front (`z = thickness/2 + ε`) + `polygonOffset` am Tapeten-Material — **kein Z-Fighting**.

**Ausrichtung im Raum:** Muster hängt am **lokalen** Raster; Wand per **Move/Rotate** ausrichten.

**Panel:** **Strip width**, **Strip height** (mit Bild: aus Bild berechnet, read-only), **Column offset** (m) unter Wallpaper/Image; Live-Rebuild.

---

**Category:** Assets — Wall  
**Title:** Entity-Felder & Scene-API (Ziel)  
**Description:**

```typescript
type WallParams = {
  widthM: number;
  heightM: number;
  thicknessM: number;
};

type WallpaperPattern = {
  stripWidthM: number;
  stripHeightM: number;
  columnOffsetM: number;
};

// AssetEntity (Auszug)
{
  assetKind: 'wall' | 'wall-door';
  screenImageId?: string | null;
  wallParams: WallParams;
  wallpaperPattern?: WallpaperPattern;
  materials?: { wallMaterialId?: string; /* … */ };
  imageSurfaces?: Partial<Record<'front', ImageSurfaceSettings>>;
  transform: EntityTransform;
  // sizeScale: TBD — optional uniform auf wallParams
}
```

**API (Entwurf):**

- `addAsset('wall' | 'wall-door', spawn?)`
- `setWallParams(entityId, partial WallParams)`
- `setWallpaperPattern(entityId, partial WallpaperPattern)`
- `setAssetImage(entityId, imageId | null)` — Front
- `setEntityMaterial(entityId, slot, materialId)`
- `setImageSurface(entityId, 'front', partial)`

---

**Category:** Assets — Wall  
**Title:** Szene-Panel (Ziel)  
**Description:** Bei selektierter Wall-Entity, Right Sub:

1. **Material** — Wall body (`wallMaterialId`, Default Print Matt)
2. **Wallpaper / Image** — Image, **Strip width**, **Strip height** (Half-Drop automatisch), `ImageSurfaceFields`
3. **Dimensions** — Width, Height, Thickness (m)
4. **Position** — Pos / Rot (Gizmo + Felder; kein Transform-Block)

Gilt für `wall` und `wall-door`.

`wall-door`: keine extra Türmaß-Felder in v1 (Öffnung fest). Hinweis-Label „Door opening 2 × 2,5 m, 1 m from left“ (read-only).

---

**Category:** Assets — Wall  
**Title:** Ausbaustufe — Türrahmen (nicht v1)  
**Description:** **Wall Doorway** soll später einen **parametrischen Türrahmen** um die Öffnung erhalten — ähnlich **Picture framed** (extrudierter Rahmen, Material-Slots, ggf. Zarge/Türblatt). **Vor Implementierung:** eigenes Requirement-Update oder Unterkapitel nach User-Workshop (Profilmaße, Falz, Glas, innen/außen, Schweller). v1 = nur CSG-Loch.

---

**Category:** Assets — Wall  
**Title:** Schatten, Boden, Lichter  
**Description:** Wand **wirft** Schatten auf Ground und andere Assets und **empfängt** Schatten (z. B. Rahmen, Stühle später). Türöffnung: Licht/Schatten durch Loch — kein „Phantom-Boden“ in der Öffnung v1. Ground weiterhin receive-only global → [`requirements-shadows.md`](./requirements-shadows.md).

---

**Category:** Assets — Wall  
**Title:** Serialisierung & Szenen  
**Description:** `wallParams`, `wallpaperPattern`, `screenImageId`, `imageSurfaces`, `wallMaterialId` Teil von **Scene Save** / Entity-JSON → [`requirements-architecture.md`](./requirements-architecture.md). Scene-Presets mit Tapeten-Layouts optional später → [`requirements-scenes.md`](./requirements-scenes.md).

---

**Category:** Assets — Wall  
**Title:** Offene Punkte (TBD)  
**Description:** Katalog-Kategorie `architecture` vs. `objects`. Default-`stripWidthM`/`stripHeightM` beim ersten Bildzuweisung (optional aus Bild-Meta vorschlagen — kein Auto-Resize der Wand). `sizeScale` vs. nur `wallParams`. Verhalten wenn Türöffnung &gt; Wandmaß. Drag Image → Front. Gerades Raster ohne Half-Drop (optional später). Ortho-Kamera für Tapeten-Layouts → [`requirements-camera.md`](./requirements-camera.md). Performance: ein Mesh + Shader vs. instanced Stücke. **Nicht im Code raten** — Diary bei Architektur-Freigabe.

---
