# Assets — Fabric cloth (Stoffbahn / Textilstück)

Dünnes **Textilstück** mit **Bild auf Vorder- und Rückseite** — Mockups für Schals, Tücher, Stoffmuster, Swatches, Flatlays. **Nicht** nur Seide: beliebiges Stoffmotiv aus der Images-Bibliothek → [`requirements-images.md`](./requirements-images.md). Katalog, Entity-Modell, Drop/Add, image-driven sizing → [`requirements-assets.md`](./requirements-assets.md). Bild-Flächen (Finish, Emissive) → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md). Placement & Gizmo → [`requirements-scene-placement.md`](./requirements-scene-placement.md), [`requirements-gimbals.md`](./requirements-gimbals.md). Aspect Ratio → `.cursor/rules/image-aspect-ratio.mdc`. Simulation, **On/Freeze**, Taste **`P`**, Right-Panel **Physics** → [`requirements-physics.md`](./requirements-physics.md).

**Englisch (Naming):** UI-Label **Fabric cloth**; `assetKind` **`fabric-cloth`**. Allgemeiner als „silk scarf“ / „silk handkerchief“ (Seide-spezifisch). Alternativ in anderen Tools: *fabric swatch*, *cloth panel* — im Projekt einheitlich **Fabric cloth**.

**Abgrenzung:** **Picture framed** → [`requirements-assets-picture-framed.md`](./requirements-assets-picture-framed.md) (Rahmen + Opening, Bild nur vorne im Opening). **Print** = Prisma mit optional getrennten Faces — typisch **senkrecht** (Front zur Kamera). **Fabric cloth** = eine **dünne Bahn**, **waagrecht** auf dem Boden (Flatlay), **gleiches Bild oben und unten**, optional **Border**. **Wall** = Architektur + Repeat, **senkrecht** → [`requirements-assets-wall.md`](./requirements-assets-wall.md). **Block** = Volumen ohne Bild → [`requirements-assets-block.md`](./requirements-assets-block.md).

**Status:** Bild, Material, Border, Sizing **implementiert**. Physik mit **World physics Start** → [`requirements-physics.md`](./requirements-physics.md).

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
**Description:** Wie [`requirements-assets.md`](./requirements-assets.md): **Nie Bilder verzerren.** Zugewiesenes Bild (`screenImageId`) definiert **Breite-zu-Höhe** der Stoffbahn. **Referenzkante:** **Breite** **0,450 m** (45 cm). Höhe = Breite / Aspect-Ratio. **`sizeScale`** (Default `1`, Range `0.05`–`5`) skaliert Breite und Höhe **proportional** — Ratio bleibt bildgetrieben. Panel: **Size**, **Width (m)**, **Height (m)**; `setAssetSizeScale` hält **Bodenkontakt** (Fuß-Pivot, `position.y` nachziehen — nicht Mittelpunkt-Pivot wie senkrechter Print).

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
- **Subdivision** (unabhängig vom Border-Inset — Border nur Shader): **ein** subdividiertes `PlaneGeometry` über die gesamte Session — **kein** separates Ruhe-Quad und **kein** Mesh-Wechsel bei Physics Start/Reset. Footprint **width × height** (Bildbahn); Zellgröße aus globaler **`fabricClothSimQuality`** → [`requirements-physics.md`](./requirements-physics.md). Implementierung: `fabricClothGridSegments` + `buildFabricClothMesh` in `src/engine/fabric-cloth-geometry.ts`.
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

**Farbe auf der Stoffbahn:** Das **sichtbare Motiv und alle Farben** auf der Bildfläche (Ober- und Unterseite) kommen **ausschließlich** aus dem zugewiesenen **`screenImageId`** (Cover, ohne Stretch). **Kein** ColorPicker, **kein** Preset-`color`, **kein** `tint` auf dieser Fläche — auch Presets mit Namen wie „Silk“ oder „Fabric“ sind **keine** Stofffarbe: sie liefern nur **PBR-Struktur** (Roughness, Metalness, ggf. Sheen/Anisotropie, procedural Normal/Roughness), multipliziert mit der **Bild-Albedo** bei neutralem Faktor **(1,1,1)**. Es gibt **kein** separates „Seiden-Material“ o. Ä., das die Bahn einfärbt.

**Bordüre:** **Shader-Inset** auf demselben Material — `colorNode`-Mix Motiv × `borderColor` im Randstreifen (`createFabricClothMaterial` / TSL); **kein** Bild, **kein** Material-Dropdown für den Rand.

**Engine:** Bild-×-Preset-Pipeline (`createImageOnPresetMaterial` + Inset-Border-Nodes), **ohne** `finishToMaterialId()`; Preset-ID aus `materials.fabricClothMaterialId`. **`side: DoubleSide`** wird in **`createFabricClothMaterial`** gesetzt (nach Border-Nodes) — **auch** im Platzhalter-Zweig ohne Textur (`createImageOnPresetMaterial` mit `tex === null` liefert sonst Default `FrontSide`). Procedural: `tileScale` / Sampling auf der Stoff-Plane (meter-konsistent auf XZ-Fläche — Inventur `surfaceRole` / `planar-meters`). Test: `fabric-cloth-material.test.ts`.

**UI:** Szene-Panel Sektion **Material** — Dropdown **Fabric material** (Label TBD); **keine** Emissive-Zeile in v1 (Stoff leuchtet nicht standardmäßig). Dropdown **ohne** `transmission`-Presets (kein Glas auf Stoffbahn).

---

**Category:** Assets — Fabric cloth  
**Title:** Simulation — Drape aus Fabric material  
**Description:** **Kein** separates Physics-Drape-Dropdown — nur **`fabricClothMaterialId`**. Drape-Parameter kommen aus dem **Material-Preset** (optional `fabricDrape`) → [`requirements-materials.md`](./requirements-materials.md).

- **Resolver (Ziel):** `resolveFabricDrape(materialId)` → Sim-Konstanten (eine Quelle, Tabelle in Physics-Doc).

| `fabricDrape.profile` | Mockup-Bedeutung | Typische Built-in-Zuordnung (Ziel) |
|---|---|---|
| `silk` | leicht, weich fallend | `material-silk` |
| `linen` | mittel | `material-fabric` (`fabric-linen`) |
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
**Title:** Physik — Plane-Collider (World physics)  
**Description:** MVP: eine **Dynamic**-Plane pro Tuch bei **Physik Start** (kein `physicsBodyMode`-Toggle) → [`requirements-physics.md`](./requirements-physics.md).

| Aspekt | Regel |
|---|---|
| Footprint **X/Z** | **Bildbahn-Maß** (wie Mesh) — optionaler Border-Inset ändert Collider **nicht** — **kein** extra 5-mm-Rand in der Ebene |
| Dicke **Y** (nur Rapier) | Slab **zentriert** auf der Stoffebene (Fuß): **±5 mm** → **1 cm** gesamt (`colliderOffsetY = 0`) |
| Stapel mit **Block** | Nach Physik **~1 cm** Luft zwischen sichtbarer Block-Fläche und Stoffebene (Margin addiert sich wie Block↔Block) → [`requirements-physics.md`](./requirements-physics.md) |
| Render-Mesh | Bleibt dünn (Schatten-Kontakt); Margin **nur** Collider |
| Später (Cloth-Mesh / Joints) | Joint-Kugeln **Radius 5 mm**; echte Stoffdicke später **1 cm gesamt** (0,5 cm pro Seite) — gleiche Konstante |
| **Damping** | SoftBody: `resolveFabricDrape` (`linearDamping`, Feder-`dampingRatio`, `deformationDamping`, `setCanSleep`) — **nicht** `PHYSICS_DYNAMIC_*` am Rigid-Proxy (Plane-MVP obsolet) → [`requirements-physics.md`](./requirements-physics.md) |

---

**Category:** Assets — Fabric cloth  
**Title:** Physik — Cloth-Mesh (Ziel)  
**Description:** Ersetzt Plane-MVP: subdividiertes Render-Mesh + Rapier Partikel/Joints. Details Session, Quality, Freeze → [`requirements-physics.md`](./requirements-physics.md).

| Aspekt | Regel |
|---|---|
| **Heute (MVP)** | Starre **Dynamic-Plane** (dünner Cuboid-Proxy) — Abschnitt oben |
| **Ziel** | Kein Dynamic-Box-Proxy mehr für dieselbe Entity; Kollision nur über **bestehende** Rapier-Collider (Boden, Fixed/Dynamic Props) |
| Partikel / Joints | Radius **`PHYSICS_COLLIDER_MARGIN_M` (5 mm)** |
| Gitter | Siehe **Geometrie — Flatlay-Mesh**; Quality global **`fabricClothSimQuality`** |
| Drape | `resolveFabricDrape(fabricClothMaterialId)` |
| **Freeze (`paused`)** | Letzte Vertex-Deformation **sichtbar** — kein Zurückflachen |
| **Reset** | Grid-Topologie unverändert; Vertices flach, Snapshot-Transform, Sim-State weg |
| Export | WYSIWYG aus aktuellem Mesh → [`requirements-export.md`](./requirements-export.md) |

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

**Szene-Panel (Right):** **Image**; **Material** (Fabric drape Presets); **Border**; **Dimensions** (Motivmaße). Verformung nur **Physics → Start** (Rapier).

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
**Title:** Bewusst nicht v1  
**Description:** Prozedurale Wellen ohne Rapier; getrenntes Rückseiten-Bild; Spiegeln der Rückseiten-UV; **erhabene** Bordüre (Extrusion); Border **außen** (Footprint-Erweiterung) oder **weicher** Rand; **Preset-Farbe oder Tint auf der Motiv-Bahn**; Matt/Glossy-Finish; Emissive auf Stoff; Blender-Export-Pipeline; eigenes `assetKind` „silk scarf“. *(Inset-Border im Shader ist **implementiert**.)*

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

Preset-Namen (z. B. „Silk“) beschreiben **Oberflächenverhalten**, nicht „rotes/seidenfarbenes Tuch ohne Bild“. Mockups: Muster, Logos, Fotos — alles über **Images**.

