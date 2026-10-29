# Assets — Fabric cloth (Stoffbahn / Textilstück)

Dünnes **Textilstück** mit **Bild auf Vorder- und Rückseite** — Mockups für Schals, Tücher, Stoffmuster, Swatches, Flatlays. **Nicht** nur Seide: beliebiges Stoffmotiv aus der Images-Bibliothek → [`requirements-images.md`](./requirements-images.md). Katalog, Entity-Modell, Drop/Add, image-driven sizing → [`requirements-assets.md`](./requirements-assets.md). Bild-Flächen (Finish, Emissive) → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md). Placement & Gizmo → [`requirements-scene-placement.md`](./requirements-scene-placement.md), [`requirements-gimbals.md`](./requirements-gimbals.md). Aspect Ratio → `.cursor/rules/image-aspect-ratio.mdc`. Simulation, **On/Freeze** über Right-Panel **Physics** → [`requirements-physics.md`](./requirements-physics.md).

**Englisch (Naming):** UI-Label **Fabric cloth**; `assetKind` **`fabric-cloth`**. Allgemeiner als „silk scarf“ / „silk handkerchief“ (Seide-spezifisch). Alternativ in anderen Tools: *fabric swatch*, *cloth panel* — im Projekt einheitlich **Fabric cloth**.

**Abgrenzung:** **Picture framed** → [`requirements-assets-picture-framed.md`](./requirements-assets-picture-framed.md) (Rahmen + Opening, Bild nur vorne im Opening). **Print** = Prisma mit optional getrennten Faces — typisch **senkrecht** (Front zur Kamera). **Fabric cloth** = eine **dünne Bahn**, **waagrecht** auf dem Boden (Flatlay), **gleiches Bild oben und unten**, optional **Border**. **Wall** = Architektur + Repeat, **senkrecht** → [`requirements-assets-wall.md`](./requirements-assets-wall.md). **Block** = Volumen ohne Bild → [`requirements-assets-block.md`](./requirements-assets-block.md).

**Status:** Bild, Material, **Border** (Live-Sim + **`fabric-cloth-baked`** nach Bake), Sizing, **Bake — User Asset** / Katalog-Platzierung **implementiert**. Physik: CPU **Verlet** (Silk Studio) — siehe [`requirements-physics.md`](./requirements-physics.md), Plan [`new-implementation.md`](../fabric-physics/new-implementation.md).

---

**Category:** Assets — Fabric cloth  
**Title:** Identität & Katalog  
**Description:** Built-in Baustein, nicht löschbar.

| `assetKind` | UI-Label | Kategorie (Ziel) |
|---|---|---|
| `fabric-cloth` | Fabric cloth | **Objects** (Lucide z. B. `layers`, `wind`, `scan`) |

Mehrfach-Instanzen unbegrenzt. Default-Szene: **keine** Pflicht-Instanz.

---

**Category:** Assets — Fabric cloth  
**Title:** Image-driven sizing  
**Description:** Wie [`requirements-assets.md`](./requirements-assets.md): **Nie Bilder verzerren.** Zugewiesenes Bild (`screenImageId`) definiert **Breite-zu-Höhe** der Stoffbahn. **Referenzkante:** **Breite** **0,450 m** (45 cm). Höhe = Breite / Aspect-Ratio. **`sizeScale`** (Default `1`, Range `0.05`–`5`) skaliert Breite und Höhe **proportional** — Ratio bleibt bildgetrieben. Panel **Dimensions:** nur **Width (m)** und **Height (m)** — **kein** separates Size-Feld; Änderung **einer** Kante setzt `sizeScale`, die **andere** Kante folgt automatisch der Bild-Ratio (bzw. Platzhalter-Quadrat ohne Bild). `setAssetSizeScale` hält **Bodenkontakt** (Fuß-Pivot, `position.y` nachziehen — nicht Mittelpunkt-Pivot wie senkrechter Print).

| Zustand | Aspect-Ratio |
|---|---|
| Mit `screenImageId` | `imageWidth / imageHeight` |
| Ohne Bild (Platzhalter) | **45 / 45 cm** → **Quadrat** 0,45 × 0,45 m |

Texture auf der Stofffläche: **Cover** auf Plane mit **exakt** berechneten Maßen — kein UV-Stretch. Panel **Width** = Ausdehnung entlang **Welt-X**, **Height** = Ausdehnung entlang **Welt-Z** (auf dem Boden, nicht Welt-Y).

---

**Category:** Assets — Fabric cloth  
**Title:** Orientierung — waagrecht (Default)  
**Description:** **Abweichung** von den meisten bildtragenden Assets (Print, Picture, Handheld, Monitor, Wall): Stoffbahn liegt **horizontal** auf der **Ground**-Ebene (**Welt-y = 0**), nicht senkrecht im Raum.

| | Senkrechte Assets (z. B. Print) | **Fabric cloth** |
|---|---|---|
| Bildfläche | typ. vertikal, Front zur Kamera (**+Z** / Wand-Ebene) | **Waagrecht** in **XZ**, Oberseite **+Y** |
| Use-Case | Poster, Screen, Wand | Ausgelegtes Tuch, Flatlay, Draufsicht |
| Default nach `addAsset` | aufrecht vor der Kamera | **flach auf dem Boden**, `rotation` **Identity** (Mesh bereits in XZ gebaut — **kein** „Print-Plane + 90° kippen“ als Dauerlösung) |

- **Oberseite** (**Normal +Y**) = Hauptansicht (Flatlay); Material-Preset gilt auf **beide** Sichtseiten des Stoff-Meshes gleichermaßen.
- **Unterseite** (**−Y**): gleiches **Bild oder Platzhalter** sichtbar (`DoubleSide`) — z. B. wenn User das Tuch per Gizmo kippt oder von unten schaut.
- User darf per **Gizmo Rotate** weiterdrehen (Tuch an Wand hängen etc.) — **nur der Default-Spawn** ist waagrecht.
- `addAsset('fabric-cloth')` / Drop: Position wie andere Assets auf Boden; **kein** Default, das das Tuch aufstellt.

---

**Category:** Assets — Fabric cloth  
**Title:** Vorder- und Rückseite — gleiches Motiv (Bild oder Platzhalter)  
**Description:** Das zugewiesene Bild — bzw. **ohne** `screenImageId` der neutrale Platzhalter — ist auf **Ober- und Unterseite** der waagrechten Bahn **sichtbar** (von oben **und** von unten bei `DoubleSide`).

- **v1:** Ein Mesh (oder äquivalent), Material **`side: DoubleSide`**, **gleiche** Textur/UV auf beiden Sichtseiten — **kein** Spiegeln erforderlich, sofern nicht später als Option gewünscht.
- **Nicht** Picture-framed-Rückwand (opake Wand hinter dem Bild).
- Optional später: getrennte `backImageId` — **nicht v1** (nur ein `screenImageId`).

**Kein** `ImageSurfaceFields` (Matt/Glossy, Emissive) — Oberfläche über **Material-Preset** → Abschnitt **Material — Bibliothek, nur Struktur**.

---

**Category:** Assets — Fabric cloth  
**Title:** Geometrie — Flatlay-Mesh  
**Description:** Rechteckige Bahn in **XZ** (Normal **+Y**). Ruhe = flach; Verformung **nur** über Rapier nach **Physik Start** → [`requirements-physics.md`](./requirements-physics.md).

- Basis: **ein** rechteckiges Plane in **XZ** (`assetMeshRole: fabricCloth`); dünne Ausdehnung in **Y** für Schatten-Kontakt → [`requirements-shadows.md`](./requirements-shadows.md). **Kein** Ring-Grid, **keine** Border-Child-Meshes.
- **Subdivision** (unabhängig vom Border-Inset — Border nur Shader): Sim-`PlaneGeometry` mit festem Gitter für **`fabric-cloth`** (Rapier-Session) — **kein** separates Ruhe-Quad; **kein** Topologie-Wechsel während `simulating` / `paused`. **User-Asset nach Bake** = separates gespeichertes Mesh → *Bake — User Asset (stiff)*. Footprint **width × height** (Bildbahn); feste Zellgröße **`FABRIC_CLOTH_SIM_CELL_SIZE_M`** (~1,25 cm) → [`requirements-physics.md`](./requirements-physics.md). Implementierung: `fabricClothGridSegments` + `buildFabricClothMesh` in `src/engine/fabric-cloth-geometry.ts`.
- **UV:** Cover-UV auf dem Grid; **Texturkoordinaten an Vertices** — Motiv-Ratio **nicht** per UV-Stretch verzerren; Border-TSL nutzt **`restPlaneXY`** (Ruhe-Plane-Meter, frozen), nicht deformiertes `position`.
- **Cap:** Max. Zellen pro Achse / max. Partikel (Konstanten in `src/physics/constants.ts` oder `physics-settings`) — bei Überschreitung **clamp** (längere Kante begrenzt).
- Rebuild bei: `screenImageId`, `sizeScale`, `fabricClothParams`, `materials.fabricClothMaterialId`. **Während Session:** Rebuild → Cloth-Sim **neu initialisieren** (kein halb altes Gitter).

---

**Category:** Assets — Fabric cloth  
**Title:** Border (Bordüre / Rand) — optional  
**Description:** Optionaler **Inset-Rand** auf der **gesamten** Stoffbahn (UI: **Border**; textil nah: *trim*, *binding* — hier einheitlich **Border**). **Keine** zusätzliche Geometrie — **ein** Plane-Mesh; der Rand ist **eingefärbt** im Stoff-Material (TSL).

**Rendering (v1):**

- **Breite:** Default **2 mm** (`borderWidthM = 0.002`); im Panel **Width (mm)** einstellbar (Clamp `FABRIC_CLOTH_BORDER_WIDTH_MIN_M`–`MAX_M`, Ziel ca. 0,5–50 mm).
- **Lage:** **innen** — vom äußeren Rechteckrand **`borderWidthM`** Weltmaß **zur Mitte**; überdeckt dort das Motiv (Cover bleibt unverändert berechnet, sichtbar nur im Innenfeld).
- **Kante:** **Scharfkantig** — harter Übergang Motiv ↔ `borderColor` (`step` in TSL), **kein** Weichzeichner / kein `smoothstep` in v1.
- **Abstand:** In **Plane-Metern** aus **`restPlaneXY`** (Attribut, einmal beim Mesh-Build; unverändert während Physik-Sync), damit der Rand bei Letterbox-Crop parallel zur Bahnkante bleibt und bei Drapierung sichtbar bleibt.
- **Mesh / Footprint:** Unverändert **Bildbahn-Maß** (Panel Width/Height); Border vergrößert Collider oder Außenkontur **nicht**.

| Parameter | Bedeutung | Default (Ziel) |
|---|---|---|
| `borderEnabled` | Bordüre ein/aus | `false` |
| `borderWidthM` | Streifenbreite pro Seite (Weltmaß, Inset) | `0.002` (2 mm) |
| `borderColor` | **User-wählbare** Bordürenfarbe | z. B. neutral dunkelgrau `#3a3a3a` |

**Border UI:** Sektion **Border** — **Enable**, **Width (mm)**, **Color** (`ColorPicker` → [`requirements-color-picker.md`](./requirements-color-picker.md)). `setFabricClothParams({ borderWidthM | borderColor })` → Entity-Rebuild (Material). Felder **sichtbar** wenn `borderEnabled`; Werte bleiben gespeichert wenn aus.

- Border ist **kein** zweites Bild — nur **einfarbige** Fläche im Randstreifen; **kein** separates Material-Preset-Dropdown für die Bordüre in v1 (Roughness im Randstreifen fest, z. B. ~0,65).
- **Kein** Stretch auf dem Motiv — Cover-UV der Plane unverändert.
- **PNG/WebP-Cutout:** `alphaTest` auf der Bild-Alpha; der **Bordürenstreifen** bleibt **opak** (`max(imageAlpha, borderMask)`), damit transparente Motiv-Ränder keine Löcher am Saum erzeugen.
- **Live + gebacken:** Dieselbe Material-Pipeline (`createFabricClothMaterial` → `applyFabricClothInsetBorderToMaterial` in `src/engine/fabric-cloth-border-nodes.ts`) für **`fabric-cloth`** und **`fabric-cloth-baked`**; Katalog-Defaults enthalten `fabricClothParams` inkl. Border der Quell-Instanz beim Bake.
- **Nach Bake:** Bordüre am **Schnittmuster-Umfang** (Rechteck in `restPlaneXY`), nicht an beliebigen Falten-Silhouetten — wie bei der Live-Bahn während/ nach Sim.

**Implementierung (Referenz):** `fabric-cloth-material.ts`, `fabric-cloth-border-nodes.ts`, `fabric-cloth-render-shell.ts` (Render-Shell in `createFabricClothMaterial` nach Border-Nodes). Tests: `fabric-cloth-border-nodes.test.ts`, `fabric-cloth-material.test.ts`, `fabric-cloth-bake.test.ts`.

---

**Category:** Assets — Fabric cloth  
**Title:** Koordinaten, Pivot & Placement  
**Description:** **Pivot:** **Mittelpunkt der Bildbahn** in **X/Z** (ohne Border in Width/Height); **Bodenkontakt:** Unterseite der Bahn (**−Y**) liegt auf Ground — `assetTransformUsesFootPivot` **true** (Ziel, analog Block/Wand-Fuß): `transform.position.y` = Fuß auf Welt-`y = 0` (+ optional `ASSET_SPAWN_BASE_Y`), nicht „schwebender“ Mittelpunkt wie bei senkrechtem Print/Picture → [`requirements-assets.md`](./requirements-assets.md).

**Transform:** Move + Rotate + **uniform** `sizeScale` (Gizmo Scale) → [`requirements-gimbals.md`](./requirements-gimbals.md). **`setAssetSizeScale`:** Rebuild; **Y-Position** so anpassen, dass **Fuß** auf Ground bleibt (nicht nur „Mittelpunkt fix“ wie bei aufrechtem Print).

**World physics:** Gizmo auf `fabric-cloth` nur bei **`worldPhysicsPhase === 'idle'`** — bei **simulating** / **paused** gesperrt; Pose ändern nur nach **Reset** → [`requirements-gimbals.md`](./requirements-gimbals.md), [`requirements-physics.md`](./requirements-physics.md).

---

**Category:** Assets — Fabric cloth  
**Title:** Material — Bibliothek, nur Struktur (kein Matt/Glossy)  
**Description:** **Abweichung** von Picture / Handheld / Print-Bildflächen: **kein** Finish **Matt/Glossy** (`ImageSurfaceFields`). Stattdessen **ein Material-Slot** mit Dropdown über die **gesamte Materials-Bibliothek** (built-in + user) — gleiche UX wie **Block** → [`requirements-assets-block.md`](./requirements-assets-block.md), [`requirements-materials.md`](./requirements-materials.md).

| Slot (Ziel) | Bedeutung |
|---|---|
| `fabricClothMaterialId` | Stoff-Bahn (Bild-Plane, **beide** Sichtseiten) |

**Default:** **`material-fabric`** (oder zum Implementierungszeitpunkt nächstpassendes Stoff-Preset).

**Farbe auf der Stoffbahn:** Das **sichtbare Motiv und alle Farben** auf der Bildfläche (Ober- und Unterseite) kommen **ausschließlich** aus dem zugewiesenen **`screenImageId`** (Cover, ohne Stretch). **Kein** ColorPicker, **kein** Preset-`color`, **kein** `tint` auf dieser Fläche — auch Presets mit Namen wie „Fabric Silk“ oder „Fabric Linen“ sind **keine** Stofffarbe: sie liefern nur **PBR-Struktur** (Roughness, Metalness, ggf. Sheen/Anisotropie, procedural Normal/Roughness), multipliziert mit der **Bild-Albedo** bei neutralem Faktor **(1,1,1)**. Es gibt **kein** separates „Seiden-Material“ o. Ä., das die Bahn einfärbt.

**Bordüre:** **Shader-Inset** auf demselben Material — `colorNode`-Mix Motiv × `borderColor` im Randstreifen (`createFabricClothMaterial` / TSL); **kein** Bild, **kein** Material-Dropdown für den Rand.

**Engine:** Bild-×-Preset-Pipeline (`createImageOnPresetMaterial` + Inset-Border-Nodes), **ohne** `finishToMaterialId()`; Preset-ID aus `materials.fabricClothMaterialId`. **`applyFabricClothRenderShellToMaterial`** und **`side: DoubleSide`** in **`createFabricClothMaterial`** (nach Border-Nodes) — **auch** Platzhalter ohne Textur. Procedural: `tileScale` / Sampling auf der Stoff-Plane (meter-konsistent). Tests: `fabric-cloth-material.test.ts`.

**UI:** Szene-Panel Sektion **Material** — Dropdown **Fabric material** (Label TBD); **keine** Emissive-Zeile in v1 (Stoff leuchtet nicht standardmäßig). Dropdown **ohne** `transmission`-Presets (kein Glas auf Stoffbahn).

---

**Category:** Assets — Fabric cloth  
**Title:** Simulation — Drape aus Fabric material  
**Description:** **Kein** separates Physics-Drape-Dropdown — nur **`fabricClothMaterialId`**. Drape-Parameter kommen aus dem **Material-Preset** (optional `fabricDrape`) → [`requirements-materials.md`](./requirements-materials.md).

- **Resolver (implementiert):** `resolveFabricDrape(materialId)` in `src/physics/fabric-cloth-drape.ts` → Sim-Konstanten; Spawn in `prepareFabricClothSimSession` (`clothAnisotropic`, Partikelmasse, Surface-Collider).

| `fabricDrape.profile` | Mockup-Bedeutung | Typische Built-in-Zuordnung (Ziel) |
|---|---|---|
| `silk` | leicht, weich fallend | `material-silk` (UI **Fabric Silk**) |
| `linen` | mittel | `material-fabric` (UI **Fabric Linen**, `fabric-linen`) |
| `heavy` | schwerer, träger | Preset-ID beim Implementieren (z. B. dickes Web) |
| `stiff` | steif, wenig Falten | Preset-ID beim Implementieren |

| Sim-Größe | Quelle | Einheit |
|---|---|---|
| Flächendichte | `areaDensityKgPerM2` pro `profile` | kg/m² — Masse = Fläche × Dichte |
| Stretch / Shear | Stiffness pro `profile` | Rapier-Äquivalent / 0–1 |
| Bend / Damping | Konstanten pro `profile` | **nicht** PBR-`roughness` als Proxy |
| Kontakt-Reibung | `FABRIC_PLANE_DYNAMIC_FRICTION` ± Profil-Offset | friction |

**User-Material ohne `fabricDrape`:** Fallback **`linen`**. Preset-`color` beeinflusst **nur** Render-Struktur, **nicht** Albedo auf der Motivbahn (unverändert).

---

**Category:** Assets — Fabric cloth  
**Title:** Schatten  
**Description:** Stoff-Mesh: **`castShadow`** und **`receiveShadow`** — Pflicht → [`requirements-shadows.md`](./requirements-shadows.md). Dünne Plane: `material.shadowSide = DoubleSide` wie andere bildtragende Planes.

---

**Category:** Assets — Fabric cloth  
**Title:** Physik — Rapier SoftBody (implementiert)  
**Description:** Kein `physicsBodyMode`-Toggle. Bei **World physics Start** pro Instanz ein Rapier **SoftBody** (`fabric-soft:${entityId}`) auf dem **gleichen** subdividierten Render-Mesh — **kein** Dynamic-Rigid-Plane-Proxy, **kein** separates Sim-Mesh. Details Session, Margin, Freeze → [`requirements-physics.md`](./requirements-physics.md).

| Aspekt | Regel |
|---|---|
| **Teilnehmer** | `FabricClothPhysicsColliders` — `SoftBodyDesc.clothAnisotropic` aus Mesh-Ruhepose + `resolveFabricDrape(fabricClothMaterialId)` |
| **Kollision** | Soft-Body-**Surface-Collider** (Partikel-Radius **`PHYSICS_COLLIDER_MARGIN_M`**, 5 mm) gegen Boden und rigide Props (Fixed/Dynamic) |
| Footprint **X/Z** | **Bildbahn-Maß** (wie Mesh) — Border-Inset ändert Kollision **nicht** |
| Stapel mit **Block** | Kontakt über Partikel + Partner-Margins — sichtbarer Spalt typ. **~1 cm** (je **0,5 cm** Collider-Margin) → [`requirements-physics.md`](./requirements-physics.md) |
| **Render-Mesh** | Dünn in Y (Schatten); Deformation = Vertex-**`position`**-Sync aus Partikeln |
| **Damping** | Aus Drape-Profil — **nicht** `PHYSICS_DYNAMIC_*` (nur rigide Dynamic-Bodies) |
| **Gitter** | Siehe **Geometrie — Flatlay-Mesh**; fest hardcoded (`FABRIC_CLOTH_SIM_CELL_SIZE_M`), kein Panel |
| **Freeze (`paused`)** | Letzte Vertex-Deformation **sichtbar** — **kein** `tick`-Sync (Voraussetzung für **Bake** in die Assets-Liste) |
| **Reset** | Sim-Gitter flach; Snapshot-Transform; SoftBody entfernt — **kein** Löschen von User-Assets aus dem Katalog |
| **Export** | WYSIWYG aus aktuellem Mesh; Instanz aus **gebackenem User-Asset** = steife Geometrie wie platziert → [`requirements-export.md`](./requirements-export.md) |

**Historisch (entfernt):** Dynamic-Box- / Plane-Proxy (`fabric-physics:${entityId}`).

---

**Category:** Assets — Fabric cloth  
**Title:** Entity-Felder & Scene-API (Ziel)  
**Description:**

```typescript
type FabricClothParams = {
  borderEnabled: boolean;
  borderWidthM: number; // meters per side; default FABRIC_CLOTH_BORDER_WIDTH_M (0.002)
  borderColor: string; // hex — ColorPicker / colors library
};

// AssetEntity (Auszug)
{
  assetKind: 'fabric-cloth';
  screenImageId?: string | null;
  materials?: { fabricClothMaterialId?: string };
  sizeScale?: number;
  fabricClothParams?: FabricClothParams;
  // kein imageSurfaces (kein Matt/Glossy)
}
```

**API (Ziel):**

- `addAsset('fabric-cloth', spawn?)`
- `setAssetImage(entityId, imageId | null)` — Rebuild Maße + Textur
- `setAssetSizeScale(entityId, factor)`
- `setFabricClothParams(entityId, partial: Partial<FabricClothParams>)`
- `setEntityMaterial(entityId, 'fabricClothMaterialId', materialId)`

**Szene-Panel (Right):** **Image** → **Material** (Fabric drape Presets) → **Border** → **Dimensions** (Width, Height gekoppelt — **kein** Size-Feld) → **Position** (Pos/Rot). Verformung nur **Physics → Start** (Rapier). Footer-Muster → [`improve-04-asset-settings.md`](../../improve/improve-04-asset-settings.md).

---

**Category:** Assets — Fabric cloth  
**Title:** Serialisierung & Presets  
**Description:** `screenImageId`, `materials.fabricClothMaterialId`, `sizeScale`, `fabricClothParams` Teil von **Scene Save** / Entity-JSON → [`requirements-architecture.md`](./requirements-architecture.md). Alte JSON-Felder wie `deformation` werden ignoriert.

---

**Category:** Assets — Fabric cloth  
**Title:** Abhängigkeiten & Inventur (Implementierung)  
**Description:** Vor Code: [`requirements-assets.md`](./requirements-assets.md), Mesh **XZ/+Y**, `asset-sizing.ts` Foot-Pivot, Image-Textur-Resolver, MaterialResolver + **neutral Albedo** auf Stoff-Slot, Shadow-Flags. Panel: **kein** `ImageSurfaceFields` für `fabric-cloth`. Katalog **Objects**. Physik → [`requirements-physics.md`](./requirements-physics.md).

---

**Category:** Assets — Fabric cloth  
**Title:** Bake — User Asset (stiff)  
**Description:** **Bake** (Stoff) = die **selektierte** `fabric-cloth`-**Entity** wird als **User-Asset** in der **Left-Assets-Liste** persistiert — **steif**, Drop/Add als `fabric-cloth-baked`. Auswahl & Querschnitt → [`requirements-assets.md`](./requirements-assets.md) (*Bake — User Assets*). Ownership `source: 'user'` → löschbar → [`requirements-builtin-and-user-content.md`](./requirements-builtin-and-user-content.md).

| Aspekt | Regel |
|---|---|
| **Was genau?** | **Nur die selektierte Instanz:** deformiertes Stoff-**Mesh** (nach Glättungs-Pipeline), plus **Default-Metadaten** für neue Platzierungen (`screenImageId`, `fabricClothMaterialId`, `fabricClothParams`, Transform der Entity **nicht** im Katalog — nur Mesh/Defaults; Platzierung = neuer Spawn wie Built-in) |
| **Auswahl** | **`selectedEntityId`** muss diese `fabric-cloth`-Instanz sein — siehe Querschnitt; bei mehreren Tüchern explizit anklicken, dann Bake |
| **Voraussetzung** | World-Physics **`paused`**; diese Instanz hat aktive Cloth-Session + deformiertes Mesh (letzter Sim-Sync) |
| **Trigger (UI)** | **Primär:** Button **Bake** in **Right → Physics** (World physics, neben Start/Freeze/Reset) nach Selektion im Viewport — **nicht** beim Freeze-Klick allein. **Optional:** gleiche Aktion im Szene-Panel der selektierten Entity |
| **Katalog** | Neue Zeile unter **Assets** neben Built-ins: Anzeigename (User, Default z. B. „Fabric cloth (baked)“ + fortlaufend), Thumbnail aus Pose; `source: 'user'`; **Remove** aus Katalog |
| **Platzierung** | Drop/Klick wie Built-in → neue Entity mit **festem** deformiertem Mesh; **`assetKind`** Ziel: **`fabric-cloth-baked`** (oder äquivalent — **kein** World-physics-Teilnehmer) |
| **Physik** | **Kein** SoftBody bei Start/Freeze/Reset der World-Session; **kein** `fabric-cloth`-Sim auf Instanzen aus gebackenem User-Asset — rein **statisches** Mesh (optional später: rigid fixed collider TBD, v1: Schatten-Mesh wie Block-Plane) |
| **Gizmo** | Move/Rotate nach Platzierung erlaubt (nicht an World-`simulating` gebunden); Uniform-Scale-Regel wie `fabric-cloth` / Foot-Pivot TBD in Implementierung |
| **Gespeicherte Daten** | Deformierte **`position`** (+ `normal`, `uv`, **`restPlaneXY`**), Topologie (Indices/Segmente), **`planeWidthM`** / **`planeHeightM`** (Footprint für Border-TSL), **Default** beim Bake: `screenImageId`, `materials.fabricClothMaterialId`, `fabricClothParams` (Border) der Quell-Instanz; **kein** Rapier-State |
| **Border nach Bake** | **`restPlaneXY`** = Ruhe-Gitter **vor** Deformation (zentriert, ±½ Footprint); deformierte `position` ändert `restPlaneXY` **nicht**. Material wie Live: `planeWidthM`/`planeHeightM` + `restPlaneXY` in `buildBufferGeometryFromBakedMeshPayload` / `addBakedFabricCloth`. Legacy-Payloads: `normalizeFabricClothBakedMeshPayload` gleicht deklarierte Plane-Maße an `restPlaneXY`-Extents an (`fabric-cloth-bake.ts`). |
| **Bild nach Platzierung** | Jede platzierte **`fabric-cloth-baked`**-Entity: **`screenImageId` frei änderbar** (Images-Picker / Szene-Panel **Image** wie `fabric-cloth`). **Pose/Mesh bleibt fix** — Bildwechsel **kein** Geometrie-Rebuild, **kein** image-driven Footprint-Resize (Faltenform ≠ Bild-Ratio). Textur: **Cover** auf unveränderten UVs, **kein** Stretch → `.cursor/rules/image-aspect-ratio.mdc` |
| **Mesh-Glättung (Teil des Bake)** | Beim Bake aus grobem Sim-Gitter: **einmalig** dichteres Grid + **interpoliertes** Displacement (bilinear Minimum, bicubic Ziel) — Kanten an Falten für Seiden-Look; Konstanten `FABRIC_CLOTH_BAKE_SUBDIV_FACTOR`, `FABRIC_CLOTH_BAKE_MAX_VERTICES` |
| **Szene-Instanz nach Bake** | **Quell-`fabric-cloth` bleibt** in der Szene (weiter **`paused`**, grobes Sim-Mesh unverändert) — **kein** Ersetzen/Umwandeln der Entity. Bake legt **nur** einen neuen Katalog-Eintrag an; User platziert gebackenes Asset **optional** zusätzlich per Drop/Add |
| **Project Save** | User-Assets-Array im Projekt-JSON (mit Mesh-Payload oder dediziertem Blob-Store im Save) — **überlebt** Reload |
| **Built-in `fabric-cloth`** | Unverändert löschbar nur als **Entity**; Katalog-Baustein bleibt Werk |

**Abgrenzung:** **Freeze** hält die Sim-Pose in der **aktuellen Szene** (grobes Gitter). **Bake** schreibt eine **Bibliotheks-Kopie** (glatt + steif). **Reset** auf World-Physics setzt **simulierbare** Tücher zurück, **nicht** User-Assets.

**Nicht:** Bake während `simulating`; Bake nur in Export-Pipeline ohne Katalog-Eintrag; `SharedArrayBuffer` als Speicherformat; eingebettetes Bitmap „fest im Mesh“ ohne nachträglichen Image-Slot.

---

**Category:** Assets — Fabric cloth  
**Title:** `fabric-cloth-baked` — Image-Slot (Szene-Instanz)  
**Description:** Gebackenes User-Asset = **Form aus Bake**, **Motiv aus Images-Bibliothek** pro Instanz.

- Szene-Panel: Sektion **Image** mit `screenImageId` (null = neutraler Platzhalter wie `fabric-cloth`).
- `setAssetImage` / gleiche Store-Pfade wie andere bildtragende Assets — **Material-Rebuild** oder Textur-Swap, **ohne** `fabricClothGridSegments`-Rebuild.
- **Dimensions (Width/Height):** Footprint der **Bake-Pose** — nicht aus neuem Bild neu berechnen; optional **`sizeScale`** uniform auf die ganze Instanz (TBD Implementierung, analog steifer Props).
- Katalog-Eintrag kann Thumbnail mit Bake-Quellbild zeigen; **neu platzierte** Instanz startet mit dem beim Bake gespeicherten Default-`screenImageId`, User darf sofort ein anderes Bild wählen.
- **Border:** `fabricClothParams` aus Katalog-Defaults (Enable, Width, Color); Änderung → Entity-Rebuild wie bei `fabric-cloth`. Footprint für Sizing: `bakedClothFootprint` aus normalisiertem Mesh-Footprint beim Spawn.

---

**Category:** Assets — Fabric cloth  
**Title:** Rendering — Fold smooth (nur beim Bake)  
**Description:** Grobes Sim-Gitter (~**1,25 cm**) erzeugt **sichtbare Kanten an Falten**. **Kein** Live-Glätten während **`simulating`**. Die **Interpolations-Pipeline** läuft **nur** als Schritt von **Bake — User Asset (stiff)** — nicht als dauerhafter Freeze-Effekt auf dem Sim-Mesh.

---

**Category:** Assets — Fabric cloth  
**Title:** Rendering — Depth / Z-Fighting (DoubleSide)  
**Description:** Sim-Mesh bleibt ein **mathematisch dünnes** Plane; Material **`DoubleSide`** (Motiv oben/unten). Ohne Korrektur kämpfen Vorder- und Rückseite sowie überlappende Falten im Depth-Buffer beim Kameradreh.

- **Render-Shell (v1):** Vertex-`positionNode` verschiebt jede Sichtseite entlang der Normalen um **`FABRIC_CLOTH_RENDER_SHELL_HALF_M`** (½ × **`FABRIC_CLOTH_MESH_THICKNESS_M`**, Ziel **1 mm** Gesamtdicke) — Front **`+`**, Back **`−`** via TSL **`faceDirection`**. Wired in **`createFabricClothMaterial`** (`fabric-cloth-render-shell.ts`) — gilt für Sim- und **gebackenes** Mesh. **Kein** zweites Mesh; Physik/Collider unverändert.
- **Grenze:** Stark überlappende Schichten derselben Bahn können bei sehr flachen Winkeln noch minimal flackern — kein OIT in v1.
- **Alpha (PNG/WebP/…):** **`imageAlphaMode: cutout`** — `depthWrite: true`, `alphaTest` (kein Alpha-Blend mit `depthWrite: false`; sonst scheint der Boden ~dm dahinter durch).
- **Nicht:** `depthWrite: false` auf dem Stoff (würde Boden/Hintergrund durchscheinen lassen).

---

**Category:** Assets — Fabric cloth  
**Title:** Bewusst nicht v1  
**Description:** Prozedurale Wellen ohne Rapier; getrenntes Rückseiten-Bild; Spiegeln der Rückseiten-UV; **erhabene** Bordüre (Extrusion); Border **außen** (Footprint-Erweiterung) oder **weicher** Rand; **Preset-Farbe oder Tint auf der Motiv-Bahn**; Matt/Glossy-Finish; Emissive auf Stoff; Blender-Export-Pipeline; eigenes `assetKind` „silk scarf“; **Live**-Glättung während `simulating`. *(Inset-Border TSL + Bake/`fabric-cloth-baked` **implementiert** — siehe Border- und Bake-Abschnitte oben.)*

---

**Category:** Assets — Fabric cloth  
**Title:** Farbe — Motiv aus Image, Struktur aus Preset, Bordüre separat  
**Description:** Normative Kurzfassung (Anti-Missverständnis bei Implementierung und externen Beispielen):

| Bereich | Woher kommt die Farbe / das Aussehen? |
|---|---|
| **Motiv-Bahn** (mit Bild) | **Nur** `screenImageId` — Texture-Albedo, Aspect Ratio, Cover |
| **Motiv-Bahn** (ohne Bild) | Neutraler Platzhalter (Projekt-Regel), **kein** Preset-Product-Color — **beidseitig** wie mit Bild (`DoubleSide`) |
| **Stoff-Optik** (Glanz, Faser, Rauheit) | `materials.fabricClothMaterialId` — **Struktur**, Preset-`color` auf der Bahn **ignorieren** |
| **Bordüre** | `fabricClothParams.borderColor` — einfarbig, beidseitig, **kein** User-Bild |

Preset-Namen (z. B. „Fabric Silk“) beschreiben **Oberflächenverhalten**, nicht „rotes/seidenfarbenes Tuch ohne Bild“. Mockups: Muster, Logos, Fotos — alles über **Images**.

---

**Category:** Assets — Fabric cloth  
**Title:** Simulation — CPU Verlet (Ziel; ersetzt Rapier-Abschnitte oben)  
**Description:** Normativ ab Phase A. Vollständige Sim-Spezifikation: [`cloth-physics.md`](../fabric-physics/cloth-physics.md). **Superseded (Historie):** Abschnitte *Simulation — Drape aus Fabric material* und *Physik — Rapier SoftBody* gelten nur bis Code-Port abgeschlossen.

| Thema | Regel |
|---|---|
| **Solver** | CPU Verlet + OGC-lite + SDF (kein Rapier SoftBody) |
| **Mesh** | Physische **Doppelhülle** (Top/Bottom); Centerline-Partikel; `restPlaneXY` für Border-TSL unverändert |
| **Tuning** | `fabricClothParams.physics` — Presets `silk` \| `satin` \| `linen` \| `chiffon` + Slider (wie Silk Studio Panel) |
| **Pins** | `sim.pinnedCornersCount` 0–4; `sim.pinCorners[4]` in **Entity-Lokalraum**; Gizmo Phase E |
| **Rest / Spawn** | `entity.transform` (Position, Rotation) + `sim.restPose` (lokales Offset/Extra-Rotation für Ruhegitter) |
| **Material** | `fabricClothMaterialId` nur **Look** (PBR/Procedural); Preset-Buttons dürfen optional PBR-Felder setzen (wie Silk) — **nicht** Sim-Resolver über `fabricDrape` |

**Panel-Reihenfolge (Ziel):** Image → Material → **Fabric simulation** → Border → Dimensions → Position.

**Geometrie-Subdiv:** bis Phase D unverändert (`FABRIC_CLOTH_SIM_CELL_SIZE_M`, `fabricClothGridSegments`).

---

