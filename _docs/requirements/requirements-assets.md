# Assets — Bausteine-Bibliothek & Placement

Fertige **3D-Bausteine** zum Reindroppen in die Arbeitsfläche — Geräte, Print, Props. Jedes Asset wird eine **Scene Entity** (platzierbar, selektierbar, Gizmo). Bilder auf Screens/Flächen kommen aus der **Images-Bibliothek** — [`requirements-images.md`](./requirements-images.md). UI: **Left Main → Assets** + **Left Sub** (Katalog). Bezüge: [`requirements-scene-placement.md`](./requirements-scene-placement.md), [`requirements-gimbals.md`](./requirements-gimbals.md), [`requirements-app-layout.md`](./requirements-app-layout.md), [`requirements-architecture.md`](./requirements-architecture.md).

**Abgrenzung:** **Assets** = *was* in der Szene steht (Box, Buch, Flyer, Smartphone, Monitor, Bilderrahmen, …). **Images** = *welches 2D-Bild* auf Screen, Flyer, Rahmen, Ground, … referenziert wird (`imageId`). Kein versteckter Upload in Assets.

**Status:** v1 **Kern implementiert** — alle Built-in-Bausteine im Katalog platzierbar; EntityRegistry, Gizmo, Materials, **Szene-Panel Footer Runde 1** (Dimensions + Position, kein Transform-Block) → [`improve-04-asset-settings.md`](../improve/improve-04-asset-settings.md). Packaging/Lathe: **`beverage-can`**, **`tin-can`**, **`wine-bottle`** (UI **Bottle Wine**), **`pen`** → jeweilige Asset-Docs. **Offen (kein Panel-Thema):** Drag Image → Viewport, Scene Save, Katalog-Polish.

**v1-Scope:** Katalog (Built-in), Drop/Add in Szene, Selection (Outline), Transform (Move/Rotate/**uniform Scale** — Gizmo + Panel), Screen-Bild per Picker, **image-driven sizing** + **`sizeScale`** (kein Stretch). App-Start: **Picture Frame**, **Print (A5)**, **Device Smartphone**, **Device Tablet**, **Device Desktop** als Default-Szene (Portfolio-Layout). **Gebaktes Fabric cloth** als **User-Asset** in derselben Assets-Liste (nach Freeze + Bake, steif) → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md). **Später:** Drag Image → Screen im Viewport, weitere User-Asset-Typen, Kategorien-Filter, Layers-Panel, erweiterte Params (Bezel, Material).

---

**Category:** Assets  
**Title:** Szenario 1 — Agentur-Portfolio (Referenz)  
**Description:** Werbeagentur braucht **Web**, **Tablet** und **Mobile** in einer Szene für Portfolio-Präsentationen. Workflow: (1) Bausteine aus Assets links wählen/droppen, (2) mit Gizmo anordnen, (3) pro Gerät Screenshot aus Images zuweisen, (4) Licht/Boden/Kamera einstellen, (5) Export. **Mehrere gleiche Bausteine** erlaubt (z. B. 3× Smartphone mit unterschiedlichen Screens). Kein separates Asset pro Orientierung — **ein** Smartphone-Baustein, Orientierung folgt dem Bild.

---

**Category:** Assets  
**Title:** Panel-Platzierung (UI)  
**Description:** **Left Main** Nav-Eintrag **Assets** (Lucide z. B. `package`, `boxes`, `layout-grid`). **Left Sub:** scrollbarer **Katalog** — Kacheln/Liste der Built-in-Bausteine, kompakte Dichte → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md). **Images** bleibt **eigener** Nav-Eintrag (nicht ersetzen). **Layers** (Szene-Objektliste) später separater Left-Main-Eintrag. Filter/Chips in Sub (Kategorie) optional v1, Pflicht wenn Katalog > ~12 Einträge.

---

**Category:** Assets  
**Title:** Katalog — Start-Bausteine (Built-in)  
**Description:** Werkseitige Bausteine, nicht löschbar. Start-Liste (erweiterbar):

| Kategorie | Bausteine (v1-Ziel) |
|---|---|
| **Devices** | Device Smartphone, Device Tablet → [`requirements-assets-devices-handheld.md`](./requirements-assets-devices-handheld.md); Device Desktop (`monitor`) → [`requirements-assets-devices-monitor.md`](./requirements-assets-devices-monitor.md); Browser-Frame (später) |
| **Print** | Print (Flyer, Verpackung, …); **Picture Frame** → [`requirements-assets-picture-framed.md`](./requirements-assets-picture-framed.md); **Book Softcover** / **Book Hardcover** → [`requirements-assets-book.md`](./requirements-assets-book.md) |
| **Objects** | **Object Block** → [`requirements-assets-block.md`](./requirements-assets-block.md); **Object Cylinder** → [`requirements-assets-cylinder.md`](./requirements-assets-cylinder.md); **Object Sphere** → [`requirements-assets-sphere.md`](./requirements-assets-sphere.md); **Fabric cloth** → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md); **Can Beverage** → [`requirements-assets-beverage-can.md`](./requirements-assets-beverage-can.md); **Can Tin** → [`requirements-assets-tin-can.md`](./requirements-assets-tin-can.md); **Bottle Wine** (`wine-bottle`) → [`requirements-assets-wine-bottle.md`](./requirements-assets-wine-bottle.md); **Pen** → [`requirements-assets-pen.md`](./requirements-assets-pen.md); **Wheel Car** → [`requirements-assets-wheel-car.md`](./requirements-assets-wheel-car.md) |
| **Architecture** | Wall, Wall Doorway → [`requirements-assets-wall.md`](./requirements-assets-wall.md) |

Später: Poster, Visitenkarte, Tapeten-Rolle, Stilleben-Props, … IDs stabil (`asset-smartphone`, `asset-flyer`, …). Pro Baustein: **Icon/Thumbnail**, **Anzeigename**, **`assetKind`**. Kein Upload eigener 3D-Modelle in v1.

---

**Category:** Assets  
**Title:** Drop & Add — Szene platzieren  
**Description:** User zieht Baustein aus Sub Left in den **Viewport** (oder Klick = Add an Default-Position auf Boden). Engine erzeugt neue **Scene Entity** (`type: 'asset'`), registriert in Entity-Liste. Default: leicht über Boden / auf Boden, vor Kamera — exakte Spawn-Regel TBD (Cursor-Raycast auf Ground oder Szene-Mitte). **Ausnahme `fabric-cloth`:** neu platziert **waagrecht** auf dem Boden (Flatlay), nicht senkrecht — Details → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md). **Jeder Drop = neue Instanz** — Duplikate desselben `assetKind` unbegrenzt. Scene-API: `addAsset(assetKind, options?)` → `entityId`; UI ruft nach Drop/Klick.

---

**Category:** Assets  
**Title:** Default ohne Bild — Platzhalter-Screen  
**Description:** Neu platziertes bildtragendes Asset zeigt **neutralen Platzhalter** auf der Screen-/Druckfläche (einheitliche Graufarbe, kein User-Bild). **Platzhalter-Seitenverhältnis** bis Bild zugewiesen: **16:9** (Landscape-Default) — TBD bei Implementierung, ein Wert projektweit; **`fabric-cloth`:** **Quadrat 45 × 45 cm** (0,45 × 0,45 m) → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md); **`beverage-can`:** Platzhalter = Label-Unfold des Profils (s. Beverage-can-Doc); **`tin-can`:** Platzhalter = Label-Unfold aus **Radius + Höhe** (s. Tin-can-Doc); **`pen`:** Platzhalter = Body-Wrap-Unfold des Profils → [`requirements-assets-pen.md`](./requirements-assets-pen.md). Sobald `screenImageId` gesetzt: Geometrie folgt Bild (s. Image-driven sizing) — **ausser** `beverage-can`, **`tin-can`** und **`pen`** (nur Textur). Kein Stretch auch auf Platzhalter-Fläche.

---

**Category:** Assets  
**Title:** Image-driven sizing — Bild bestimmt Format (Pflicht)  
**Description:** **Nie Bilder verzerren** — Regel projektweit (`.cursor/rules/image-aspect-ratio.mdc`, [`requirements-images.md`](./requirements-images.md)). Für **die meisten** bildtragenden Assets: **das zugewiesene Bild definiert Seitenverhältnis und Orientierung** der bildtragenden Fläche; das **Gesamtobjekt** passt sich an (Hochformat-Bild → Hochformat-Objekt, Querformat → Querformat, Square → quadratisch). Umsetzung: Engine liest `ImageAsset.width` / `height` → berechnet Screen-/Flächen-Maße → parametrischer Mesh-Rebuild. Texture-Mapping: **Cover** auf **exakt passende** Geometrie — **kein** UV-Stretch, kein `object-fit: fill`. **User-Scale:** ein **uniformer Faktor** `sizeScale` (Default `1`) multipliziert die Referenzkante — **proportional**, nie verzerrend. Gizmo Scale + Panel-Feld → [`requirements-gimbals.md`](./requirements-gimbals.md). Geräte mit Bezel: Rahmen proportional, Screen-Inset folgt Bild-Ratio; Device dreht sich bei Portrait vs. Landscape.

**Ausnahme — `beverage-can`:** **Dosenformat bleibt fix** (`canBodyProfile` + Nennmaße / `beverageCanParams`). Das Label-Bild beeinflusst **nur** Textur-Mapping (Cover/Crop) auf dem festen Mantel-Band — **kein** Rebuild von Höhe, BOD oder Profil beim Bildwechsel. Skalierung = **`sizeScale`** auf die **ganze Dose** proportional → [`requirements-assets-beverage-can.md`](./requirements-assets-beverage-can.md) (**Dosenformat vs. Bild**).

**Ausnahme — `tin-can`:** Format aus **`bodyRadiusMm`** + **`bodyHeightMm`** (`tinCanParams`); Bild nur Textur auf **gewelltem** Label-Mantel (Cover/Crop). Skalierung = **`sizeScale`** auf die ganze Dose → [`requirements-assets-tin-can.md`](./requirements-assets-tin-can.md).

**Ausnahme — `pen`:** **Stiftformat fix** (`penBodyProfile` + **SVG-mm-Profil**). Bild nur auf **Body** (Cover/Crop). Skalierung = **`sizeScale`** uniform auf den **gesamten** Stift — **kein** User-„Max radius“; Lathe-Regeln → [`requirements-assets-lathe.md`](./requirements-assets-lathe.md), [`requirements-assets-pen.md`](./requirements-assets-pen.md).

**Ausnahme — `wine-bottle` (Bottle Wine):** Flaschenformat fix (`wineBottleBodyProfile` + `wineBottleParams.heightM` / SVG). Bild nur **Etikett** auf Mantel. Skalierung = **`sizeScale`** auf die ganze Flasche → [`requirements-assets-wine-bottle.md`](./requirements-assets-wine-bottle.md).

---

**Category:** Assets  
**Title:** Weltmaßstab — Referenzkante  
**Description:** Eine **Referenzkante** pro `assetKind` in Metern (Scene-Einheit = m, UI 3 Dezimalen → [`requirements-code.md`](./requirements-code.md)). Die **andere Kante** wird aus Bild-Aspect-Ratio berechnet. Beispiele (Richtwerte, TBD final):

| assetKind | Referenz | Berechnung |
|---|---|---|
| Print | Breite `0.148` m (A5) | **Ohne Bild:** Hochformat A5 (148 × 210 mm); mit Bild: Höhe aus Front-Bild-Ratio; **Tiefe** separat (Default `0.002` m, UI einstellbar — z. B. `0.120` m für Verpackung) |
| Picture Frame (`picture`) | Breite `0.500` m (50 cm) | Details → [`requirements-assets-picture-framed.md`](./requirements-assets-picture-framed.md) |
| Fabric cloth (`fabric-cloth`) | Breite `0.450` m (45 cm) | Höhe aus Bild-Ratio; Platzhalter **45 × 45 cm**; Details → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md) |
| Device Smartphone (`smartphone`) | Screen-Höhe `0.160` m | Breite aus Ratio; Bezel additiv — Geometrie → [`requirements-assets-devices-handheld.md`](./requirements-assets-devices-handheld.md) |
| Device Tablet (`tablet`) | Screen-Höhe `0.250` m | Breite aus Ratio — s. Handheld-Doc |
| Device Desktop (`monitor`) | Screen-Breite `0.480` m | Höhe aus Ratio; Bezel/Stand/Artikulation → [`requirements-assets-devices-monitor.md`](./requirements-assets-devices-monitor.md) |
| Can Beverage (`beverage-can`) | Gesamthöhe profilabhängig (330 ml) | **Fix** pro Profil — **nicht** aus Bild-Ratio; **Standard** 0,1152 m × Ø 0,0660 m; **Sleek** 0,14605 m × Ø 0,0574 m; `sizeScale` skaliert **gesamte** Dose → [`requirements-assets-beverage-can.md`](./requirements-assets-beverage-can.md) |
| Pen (`pen`) | Aus **SVG-mm-Profil** bei `sizeScale = 1` | Höhe/Breite **abgeleitet** aus Pfad — **nicht** aus Bild-Ratio; `sizeScale` skaliert **gesamten** Stift uniform → [`requirements-assets-pen.md`](./requirements-assets-pen.md), [`requirements-assets-lathe.md`](./requirements-assets-lathe.md) |
| Bottle Wine (`wine-bottle`) | Bauch-Durchmesser × **`heightM`** (Default **0,29 m**) | Profilabhängig (Bordeaux/Alsace/Sparkling); **nicht** aus Bild-Ratio; `sizeScale` skaliert **gesamte** Flasche → [`requirements-assets-wine-bottle.md`](./requirements-assets-wine-bottle.md) |
| Wheel Car (`wheel-car`) | **`outerRadiusM`** (Default **0,3305 m**, Referenz **255/30 R20**) | Niederquerschnitt-Sport; Maße in `wheelCarParams` (Panel + Gizmo-Scale baked); **kein** Bild, **kein** `entity.sizeScale` → [`requirements-assets-wheel-car.md`](./requirements-assets-wheel-car.md) |

**Hinweis:** Referenzmaße bewusst größer als Realmaß (A4 ≈ 0,21 m) — Mockups sollen im Viewport gut lesbar sein. „Real scale“-Toggle später optional.

Einheitlicher Maßstab über Szene — Agentur-Layouts wirken zusammengehörig.

---

**Category:** Assets  
**Title:** Bildtragende vs. reine Props  
**Description:** **Bildtragend** (haben `screenImageId` / `imageId`): Smartphone, Tablet, Monitor, **Print**, Buch (Cover), Bilderrahmen, **Pen** (nur **Schaft** / `penBody` → [`requirements-assets-pen.md`](./requirements-assets-pen.md)), **Fabric cloth** (Vorder- **und** Rückseite gleiches Bild → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md)), **Wall / Wall Doorway** (nur **Front**, Tapetenmuster → [`requirements-assets-wall.md`](./requirements-assets-wall.md)). **`print`** = ein Baustein für Flyer, Verpackung, Karten, … — **`faces`-Prisma** (6 Planes): Breite/Höhe aus Front-Bild; **Tiefe** (`depth`) unabhängig einstellbar. Front Bild; Back Farbe oder Bild; Seiten near-white. Später alle Seiten optional mit Bild — gleiches `AssetFaceContent` (`mode: 'color' | 'image'`). Klare Liste pro `assetKind` welche Flächen `imageId` akzeptieren.

---

**Category:** Assets  
**Title:** Szene-Panel — Footer Dimensions + Position (Ist)  
**Description:** **Right Main → Szene.** Pro Entity: Header (Name, Collapse, Remove) + **typ-spezifische Sektionen** (Image, Geometries, Physics, Profil, …) + **Footer**:

| Footer | Inhalt |
|---|---|
| **Dimensions** | Maß/Scale — je `assetKind`: z. B. gekoppeltes **Width/Height** (mit oder ohne **Size**-Feld), oder **Radius/Height** in `*Params` (Block, Cylinder, Wheel, …) |
| **Position** | **Pos** X/Y/Z, **Rot** — bidirektional mit Gizmo → [`requirements-scene-placement.md`](./requirements-scene-placement.md). **Kein** Scale im `transform`; uniforme Größe über `sizeScale` oder kind-spezifische Params |

**Kein** Panel-Abschnitt **Transform** mehr (alle Built-in-Kinds). Reihenfolge und Ausnahmen pro Kind → [`improve-04-asset-settings.md`](../improve/improve-04-asset-settings.md). Lathe/Packaging: **Size** + gekoppeltes W/H, Aspect aus Profil — [`requirements-assets-lathe.md`](./requirements-assets-lathe.md).

**Category:** Assets  
**Title:** Szene-Panel — Liste & Selection  
**Description:** **Right Sub** listet platzierte Asset-Entities. **Viewport-Selection** bleibt aktiv: Klick im Viewport selektiert Entity (Gizmo + Highlight); aktiver Block in der Szene-Liste wird hervorgehoben und per `scrollIntoView` sichtbar. **Header-Klick** auf Entity-Namen in der Liste = **Selection-Toggle** (bereits selektiert → Deselect via `selectEntity(null)`). **Chevron** links im Header = **Collapse/Expand** der Einstellungen — UI-only, unabhängig von Selection; Collapse-State wird **nicht** serialisiert. **Remove** (`trash-2`) rechts im Header — eigener Button mit Trennlinie (wie Chevron); ruft `removeEntity(id)`. **Delete / Backspace** entfernt die **selektierte Asset-Entity** (nicht Studio-Lichter); ignoriert wenn Fokus in Input/Textarea. Bei neuer Selection (Viewport oder Liste) wird der Block **automatisch aufgeklappt**. Leere Szene: Placeholder-Hinweis. Environment/Ground/Camera/Lighting bleiben eigene Right-Main-Einträge — kein Selection-Overlay mehr.

---

**Category:** Assets  
**Title:** Drag Image → Screen im Viewport (später)  
**Description:** **Ja, gewünscht — nicht v1-Pflicht.** Workflow: Bild aus Images (Sub Left) auf Screen-Fläche im Viewport ziehen → Raycast trifft Screen-Mesh der Entity → `screenImageId` setzen → Geometrie aktualisiert. Gleicher Effekt wie Picker im Selection-Panel. v1: nur Panel-Picker. Input-Modus und Priorität mit Select/Transform koordinieren → [`requirements-architecture.md`](./requirements-architecture.md).

---

**Category:** Assets  
**Title:** Entity-Modell & Daten  
**Description:** Jedes platzierte Asset = **Scene Entity** in der zentralen Registry:

`AssetEntity { id, type: 'asset', name, transform, assetKind, screenImageId?: string | null, imageSurfaces?: { … }, params?: { … } }`

- **`assetKind`:** Built-in-ID (`smartphone`, `flyer`, …).
- **`screenImageId`:** Referenz in Images-Store; `null` = Platzhalter.
- **`imageSurfaces`:** Pro Bild-Fläche Finish, Emissive, Passepartout (Farbe, Offset, Finish) — → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md).
- **`transform`:** position, rotation (Euler, rad) — **kein** `scale` in `transform` (verhindert non-uniform).
- **`sizeScale`:** uniformer Größenfaktor (Default `1`); Front-Maße = Referenzkante × `sizeScale`, zweite Kante aus Bild-Ratio. Panel: **Size**, **Width (m)** und **Height (m)** — Eingabe in einem Meter-Feld berechnet `sizeScale` zurück (kein separates Width/Height-Feld in der Entity).
- **`name`:** Default aus Katalog (z. B. „Device Smartphone 1“); User-Rename später.

Lights und Ground bleiben separate Entity-Typen bzw. fixed Ground. Save/Load: Entity-Liste inkl. `assetKind` + `screenImageId` → [`requirements-architecture.md`](./requirements-architecture.md).

---

**Category:** Assets  
**Title:** Image Surfaces auf Entity  
**Description:** `imageSurfaces?: Partial<Record<AssetFaceId, ImageSurfaceSettings>>` — pro Bild-Fläche Finish, Emissive, Passepartout. Handheld/Picture: typisch nur `front`; Print: `front` + `back` (wenn Image-Mode). Serialisierung mit Entity; Migration aus Legacy `frontMaterialId`/`backMaterialId`. Engine Passepartout (Zwei-Mesh, Z-Epsilon) → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md).

---

**Category:** Assets  
**Title:** Scene-API (Entwurf)  
**Description:** Erweiterung der Scene-API — kein Three in UI:

- `addAsset(assetKind, spawn?) → entityId`
- `removeAsset(entityId)`
- `setAssetImage(entityId, imageId | null)` — löst Geometrie-/Textur-Update aus
- `setAssetSizeScale(entityId, factor)` — uniform, Range `0.05`–`5`, Mesh-Rebuild; **`transform.position.y` bleibt unverändert** (Mittelpunkt fix)
- `getAssetEntities()` / über generisches `getEntities()` gefiltert
- Events: `onSelectionChanged`, `onEntityChanged`

Texture-Load: `resolveImageTexture(imageId)` intern → [`requirements-images.md`](./requirements-images.md). `dispose` bei Remove/Swap.

---

**Category:** Assets  
**Title:** Gizmo, Schatten, Physik  
**Description:** Platzierte Assets: **Move + Rotate + Scale (uniform)** per Gizmo ([`requirements-gimbals.md`](./requirements-gimbals.md)). **Alle Asset-Meshes empfangen Schatten** (`receiveShadow = true`) — Print, Picture, Geräte; **cast** ebenfalls (**Glazing** nur receive). Nach jedem Rebuild: `applyAssetShadowFlags(group)` setzt `castShadow` / `receiveShadow` und **`material.shadowSide = DoubleSide`** auf allen castenden Meshes (dünne Planes: Screen, Print — Schatten auch von Unterseite/Rückseite). **Glazing:** default off (`glazingEnabled: false`); wenn on → `transmission`, visuell durchsichtig, **kein** Shadow-Cast. v1: **keine** Dynamic-Physics — Assets kinematic/fixed. Vollständig → [`requirements-shadows.md`](./requirements-shadows.md). **`sizeScale`:** Mesh-Rebuild, **Y-Mittelpunkt bleibt**. **Bild- / Param-Wechsel:** `transform` (Position, Rotation) bleibt unverändert — **Ausnahme** nur [`wall` / `wall-door`](./requirements-assets-wall.md): Engine setzt nach Wand-Panel-Edits `position.y` auf Boden (`ASSET_SPAWN_BASE_Y`), X/Z/Rotation bleiben.

---

**Category:** Assets  
**Title:** Mehrfach-Instanzen  
**Description:** **Unbegrenzt viele Instanzen** desselben `assetKind` in einer Szene. Jede Instanz: eigene `id`, eigener `transform`, eigenes `screenImageId`. Agentur-Layout: z. B. Monitor + Tablet + 2× Smartphone mit verschiedenen Screenshots — Standard-Use-Case, kein Sonderfall.

---

**Category:** Assets  
**Title:** Was nicht in Assets gehört  
**Description:** **Ground** (globale Ebene, Right Ground Panel). **Lighting / Camera / Environment** (globale Szene). **Images-Upload** (Left Images). **Transform-System / Gizmo-Implementierung** (eigene Docs). Assets **nutzen** diese Systeme, definieren sie nicht neu.

---

**Category:** Assets  
**Title:** Offene Punkte (TBD)  
**Description:** Bei Implementierung klären: exakte Spawn-Position (Cursor vs. Mitte); Platzhalter-Ratio final; Buch-Rückseite; Box mit Decal in v2; Katalog-UI Kacheln vs. Liste; Selection vs. Right-Nav Wechsel-Animation; Performance bei vielen Rebuilds (debounce Bild-Wechsel). **Nicht im Code raten** — erst Requirement ergänzen oder Diary-Eintrag.

---

**Category:** Assets  
**Title:** Picture framed (Bilderrahmen)  
**Description:** Vollständige Anforderungen für `assetKind: picture` — Geometrie, Z-Stack, Glas, Rahmen-UVs, Panel, Materials, API → [`requirements-assets-picture-framed.md`](./requirements-assets-picture-framed.md).

---

**Category:** Assets  
**Title:** Print — Corner radius  
**Description:** `assetKind: print`: Panel-Feld **Corner radius (mm)**, Default **0,5 mm** (`0,0005` m in UI). Bei Radius > 0: Front-/Rücksilhouette = **Rounded Rectangle** (Kreisbögen wie Handheld); Seiten = verkürzte Streifen + 4 Eck-Viertelzylinder entlang Tiefe. `printParams.cornerRadiusMm` auf Entity; API `setPrintParams`. Passepartout auf Bild-Faces: bei Offset > 0 Innenradius `max(0, R − offset)` aus diesem Radius — → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md). Picture framed **ohne** Corner-Radius → [`requirements-assets-picture-framed.md`](./requirements-assets-picture-framed.md). UI-Längen global **4 Dezimalstellen** (0,0001 m). **Szene-Panel:** **Faces** → **Dimensions** (Width/Height gekoppelt, kein Size; Corner radius; Depth) → **Position** — [`improve-04-asset-settings.md`](../improve/improve-04-asset-settings.md).

---

**Category:** Assets  
**Title:** Beverage can (330 ml)  
**Description:** Vollständige Anforderungen für `assetKind: beverage-can` — Realmaß 330-ml-Dose, Label-Sleeve, Geometrie, Panel, Materials → [`requirements-assets-beverage-can.md`](./requirements-assets-beverage-can.md).

---

**Category:** Assets  
**Title:** Fabric cloth (Stoffbahn)  
**Description:** Vollständige Anforderungen für `assetKind: fabric-cloth` — **waagrecht** auf Ground, Bild **Ober- und Unterseite**, **Fabric (drape)**-Material, optional **Border**, Rapier-Simulation → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md). **Farbe:** Motiv **nur** `screenImageId`; Bordüre **nur** `borderColor` (Ring am selben Mesh).

---

**Category:** Assets  
**Title:** Fabric cloth — Farbe (Querschnitt)  
**Description:** Kurzverweis für alle Asset-Docs: **Motiv-Bahn** = Image-Albedo (`screenImageId`); **Bordüre** = `borderColor`; **Material-Preset** = Glanz/Rauheit/Struktur, **nicht** Produktfarbe. Normativ → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md) (Abschnitt „Farbe — Motiv aus Image …“).

---

**Category:** Assets  
**Title:** Pen (Marker & Fountain pen)  
**Description:** Vollständige Anforderungen für `assetKind: pen` — SVG-Lathe **Cap / Ring / Body**, Bild-Wrap auf Schaft, Material-Slots, **mm-Pfade** + **`sizeScale`** → [`requirements-assets-pen.md`](./requirements-assets-pen.md), [`requirements-assets-lathe.md`](./requirements-assets-lathe.md).

---

**Category:** Assets  
**Title:** Ausnahme — rigid primitives: Gizmo-Scale ohne `sizeScale`  
**Description:** **`block`**, **`cylinder`**, **`sphere`**, **`wheel-car`**: Größe steckt in **`blockParams` / `cylinderParams` / `sphereParams` / `wheelCarParams`** — **kein** `entity.sizeScale`. Uniform-Scale-Gizmo multipliziert beim Commit alle linearen Param-Felder (inkl. Corner-mm wo vorgesehen), Rebuild wie Panel-Edit; Boden-Fuß-Pivot bleibt (`syncEntityYForFoot`). Scene-API: `setAssetSizeScale` **ignoriert** diese Kinds; Engine intern `applyRigidPrimitiveUniformScale`. Gizmo & Panel → [`requirements-gimbals.md`](./requirements-gimbals.md), [`requirements-scene-placement.md`](./requirements-scene-placement.md). Einzel-Assets → jeweilige `requirements-assets-*.md`.

---

**Category:** Assets  
**Title:** Scene-API — `applyRigidPrimitiveUniformScale` (Engine)  
**Description:** Ergänzung zu **Scene-API (Entwurf)** oben: Gizmo-Scale-Commit für rigid primitives ruft **`AssetSystem.applyRigidPrimitiveUniformScale(entityId, factor)`** auf (Faktor pro Drag, Range wie `clampSizeScale`). UI-Store exponiert das **nicht** separat — nur Engine-Pfad aus `MockupEngine` nach Gizmo-Drag. Panel-Edits weiter über `setBlockParams` / `setCylinderParams` / `setSphereParams` / `setWheelCarParams`.

---

**Category:** Assets  
**Title:** Bake — User Assets (Querschnitt, Auswahl & Zukunft)  
**Description:** **Bake** = aus einer **konkreten Szene-Entity** einen **persistierten User-Asset-Katalogeintrag** erzeugen (steife Wiederverwendung per Drop/Add). **Nicht** „die ganze Szene“, **nicht** implizit alle simulierbaren Objekte. Domänen-Details pro bake-fähigem `assetKind` in der jeweiligen Asset-Datei (v1: nur Stoff → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md)).

| Thema | Regel |
|---|---|
| **Was wird gebacken?** | Die **ausgewählte Entity** — deren **aktueller Render-Zustand** (Meshes, Material-/Image-**Defaults** für neue Instanzen, asset-spezifische Params). Payload-Typ hängt vom **Quell-`assetKind`** ab (`bakedFromKind` im Katalog-Eintrag). |
| **Auswahl (v1)** | **Genau eine** Entity: **Szene-Selektion** (`selectedEntityId`) zum Zeitpunkt von **Bake**. Kein Multi-Bake, kein „alle Tücher“. Button **disabled** + kurzer Hinweis, wenn Selektion fehlt oder nicht bake-fähig. |
| **Bake-fähig (v1)** | Nur **`fabric-cloth`** mit World-Physics **`paused`**, aktive Cloth-Session auf dieser Instanz, deformiertes Mesh. |
| **Bake-fähig (später)** | Weitere Kinds nur nach Eintrag in einer zentralen **Bake-Registry** (Predicate + Payload-Encoder + Katalog-`placementKind`); z. B. deformierbare Props, Rig-Ergebnisse — **pro Kind** eigener Requirements-Block, **kein** generisches „alles mit Mesh“. |
| **UI-Ort** | **Bake** nahe Physics (World-Freeze-Kontext) **und** kontextuell im **Szene-Panel** der selektierten Entity — **gleiche** Aktion, gleiches Ziel-`entityId`. |
| **Katalog-Zeile** | User-Asset hat eigenen **`userAssetId`**, Anzeigename (editierbar), Thumbnail aus Bake, **`source: 'user'`**, **`bakedFromKind`** (z. B. `fabric-cloth` → platziert als `fabric-cloth-baked`). Kategorie/Icon aus Ziel-Kind, nicht aus Built-in-Liste duplizieren. |
| **Mehrere Instanzen** | Zwei `fabric-cloth` in der Szene → User wählt **welches** Tuch (Selektion), dann Bake → **ein** neuer Katalog-Eintrag pro Bake-Klick. |
| **Freeze vs. Bake** | **Freeze** = globale World-Phase; **Bake** = **per Entity** mit expliziter Auswahl. |

**Engine (Ziel):** `canBakeEntity(entity, worldPhysicsPhase, sessionHints) → boolean`; `bakeEntityToUserAsset(entityId) → userAssetId` — Scene-API; Implementierung delegiert an Kind-Handler (`fabricClothBake`, …).

**Nicht v1:** Batch-Bake; Bake ohne Selektion; ein User-Asset-Typ für heterogene Multi-Mesh-Szenen.

---
