# Assets — Bottle Wine

Parametrischer **Weinflaschen**-Baustein (Glas + optional Etikett) — **Label** als Bild aus der **Images-Bibliothek** → [`requirements-images.md`](./requirements-images.md). Katalog, Entity-Modell, Drop/Add → [`requirements-assets.md`](./requirements-assets.md). Bild-Flächen → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md). Material-Slots (Glas, Korken, Kapsel-Folie, Kapsel-Scheibe) → [`requirements-materials.md`](./requirements-materials.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md). Uniform Scale → [`requirements-gimbals.md`](./requirements-gimbals.md).

**Abgrenzung:** Eigenes Asset neben **Beverage can** → [`requirements-assets-beverage-can.md`](./requirements-assets-beverage-can.md). Kein `print`-Prisma. Marken-Etiketten = User-Bilder.

**Status:** **implementiert (v1)** — Engine: [`asset-wine-bottle.ts`](../../src/scene/asset-wine-bottle.ts), [`wine-bottle-svg-profile.ts`](../../src/engine/wine-bottle-svg-profile.ts), [`wine-bottle-geometry.ts`](../../src/engine/wine-bottle-geometry.ts). SVGs: `public/profiles/lathe/lathe-y-bottle-*-open.svg`.

**v1-Scope (Ziel):** Ein Built-in `wine-bottle`; **drei Körperprofile** (**Bordeaux**, **Alsace**, **Sparkling**); **real scale**; **Flaschenformat fix** — Bild bestimmt **nicht** Höhe/Profil (analog Dose → [`requirements-assets.md`](./requirements-assets.md)); **`sizeScale`** uniform auf **gesamte** Flasche **inkl. Korken + Kapsel**; **Etikett** auf **Außen-Mantel** (s. Etikett-Blöcke); **Korken**, **Kapsel-Folie** (Mantel), **Kapsel-Scheibe** (Disc oben) als separate Meshes (s. jeweilige Blöcke). **Alle drei Profile:** Folie + Disc Default **sichtbar**. **Kein** Muselet / Drahtkorb in v1.

**Lathe (Querschnitt):** SVG-Pfade in **mm**, keine Verzerrung, Panel-Ziel → [`requirements-assets-lathe.md`](./requirements-assets-lathe.md).

---

**Category:** Assets — Bottle Wine  
**Title:** Identität & Katalog  
**Description:** Built-in Baustein, nicht löschbar.

| `assetKind` | UI-Label (Ziel) | Kategorie (Ziel) |
|---|---|---|
| `wine-bottle` | Bottle Wine | **Objects** (Lucide z. B. `wine` / `bottle`) |

Stabile Katalog-ID über `kind`. Mehrfach-Instanzen unbegrenzt. Default-Szene: **keine** Pflicht-Instanz.

**Profil-Parameter (Ziel):** `wineBottleBodyProfile: 'bordeaux' | 'alsace' | 'sparkling'`.

---

**Category:** Assets — Bottle Wine  
**Title:** Fachbegriffe — drei Profile  
**Description:** Industrie- und Mockup-Sprache für die drei Built-in-Silhouetten.

| Profil-ID | Deutsch (Mockup) | Englisch (Industrie / Handel) | Kurz |
|---|---|---|---|
| `bordeaux` | **Bordeaux-Flasche**, Standard-Weinflasche | **Bordeaux bottle**, **claret bottle** (UK) | hohe Schulter, kurzer bis mittlerer Hals, 0,75 l typisch |
| `alsace` | **Elsass- / Schlegelflasche**, Langhals-Wein | **Alsace bottle**, **Hock bottle**, **slim-neck wine bottle** | schlanker, **längerer Hals**, flachere Schulter |
| `sparkling` | **Sektflasche**, Schaumwein | **Sparkling wine bottle**, **Champagne bottle** (Form, nicht nur AOC) | dickwandiges Glas, tiefe **Punt** (Boden), längerer Hals |

**Hinweis:** **Burgundy bottle** (*Bourgogne*) ist eine **vierte** Form (runde Schulter, mittlerer Hals) — **nicht** in v1-Profil-Set. **Bocksbeutel** ist keine Lathe-Silhouette — **nicht** v1.

---

**Category:** Assets — Bottle Wine  
**Title:** Gemeinsame Nennmaße (vorläufig)  
**Description:** Erste Projekt-Nennwerte; **profil-spezifische** Durchmesser, Schulter, Hals, Punt und Etikett-Zonen **folgen**.

| Maß | Wert | Hinweis |
|---|---|---|
| **Gesamthöhe** (`heightM`) | **290,0 mm** → **0,2900 m** | **Alle drei Profile** (vorläufig gleich; Abweichung pro Profil später möglich) |
| **Glas — Wandstärke** (`wallThicknessM`) | **2,5 mm** → **0,0025 m** | Stirn-Innenradius (Open-SVG) + Label-Standoff + Transmission **`meshDepthM`** (×0,4) — s. **Glas-Mesh** |
| **Füllvolumen** | *TBD* | Ziel typ. **0,75 l** Stillwein; **0,75 l** Sekt — nach Silhouette |
| **Bodendurchmesser / Punt** | *TBD* | Sparkling: tiefe Punt; Bordeaux/Alsace: flacher Boden |
| **Max. Außen-Radius (Bauch)** | **38,0 mm** (Bordeaux + Alsace); **44,0 mm** (Sparkling) | Bei **290 mm** Gesamthöhe — **User-Nennmaß** aus SVG-Zeichnung; s. Profil-Tabelle |
| **Hals-Ø / -länge** | **aus SVG** | Alsace **längerer** Hals / frühere Schulter als Bordeaux |

**Pivot (Ziel):** Fußkontakt unten, `y = 0` (wie Block / Beverage can).

**Einheiten im Code (Ziel):** Meter + `sizeScale`; mm nur in dieser Tabelle zur Lesbarkeit.

---

**Category:** Assets — Bottle Wine  
**Title:** Profil-Tabelle — aus SVG (Nennhöhe 290 mm)  
**Description:** Silhouette aus **offenen Außen-SVGs** (`public/profiles/lathe/lathe-y-bottle-*-open.svg`) — **ein** Stroke-Pfad, **ohne** Pflicht-`Z` (Illustrator-Umlauf nach dem Mund wird in der Engine **nicht** gelathe). **Einheitlich skaliert:** SVG-**Höhenspanne → 290 mm**, **X mit demselben Faktor** (Achse = **min X** im Pfad). **Bauch-Außenradius** aus normalisiertem Profil; Schulter/Hals/Punt folgen der Kurve im SVG.

| | **bordeaux** | **alsace** | **sparkling** |
|---|---|---|---|
| **Gesamthöhe** | 290 mm | 290 mm | 290 mm |
| **Wandstärke Glas** (im SVG) | ~2,5 mm | ~2,5 mm | ~2,5 mm |
| **Max. Außen-Radius (Bauch)** | **38,0 mm** | **38,0 mm** | **44,0 mm** |
| **Max. Außen-Ø (Bauch)** | **76,0 mm** | **76,0 mm** | **88,0 mm** |
| **Hals-Außen-Ø (Lippe, grob)** | **~25,7 mm** | **~25,7 mm** | **~28,0 mm** |
| **Punt — Außen-Ø unten (groß)** | **~23,2 mm** | **~23,2 mm** | **~25,5 mm** |
| **Silhouette (Mockup)** | hohe Schulter, kürzerer Hals | **längerer Hals**, Bauch tiefer | **breiter** Bauch, **tiefere Punt** |
| **Etikett** | User-Parameter (nicht festes Band) | wie bordeaux | wie bordeaux |
| **Korken — Radius** | **9,0 mm** | **9,0 mm** | **10,0 mm** |
| **SVG-Außenprofil** | [`lathe-y-bottle-bordeaux-open.svg`](../../public/profiles/lathe/lathe-y-bottle-bordeaux-open.svg) | [`lathe-y-bottle-alsace-open.svg`](../../public/profiles/lathe/lathe-y-bottle-alsace-open.svg) | [`lathe-y-bottle-sparkling-open.svg`](../../public/profiles/lathe/lathe-y-bottle-sparkling-open.svg) |

**Hinweis:** Bordeaux und Alsace: **gleicher** Bauch-Radius **38,0 mm**; Unterschied nur **Halslänge / Schulter** im SVG (Alsace längerer Hals). Sparkling: **44,0 mm** Radius (**+6 mm**) + tiefere Punt im SVG.

---

**Category:** Assets — Bottle Wine  
**Title:** SVG — Außen-Silhouette (`bottle-*-open.svg`)  
**Description:** Pro Profil **eine** Datei unter **`public/profiles/lathe/`** — **ein** offener Pfad, **Außenkontur** (`class="path_red"`, Stroke **#ff0000**, kein Fill) — s. [`requirements-assets-lathe.md`](./requirements-assets-lathe.md). **Keine** separate Innenkontur im SVG; Wandstärke optisch über Transmission + **`wallThicknessM`**; geometrisch **Stirn-Ringe** an Mund/Boden (s. **Glas-Mesh**).

| Datei | URL (Dev) | `wineBottleBodyProfile` |
|---|---|---|
| [`lathe-y-bottle-bordeaux-open.svg`](../../public/profiles/lathe/lathe-y-bottle-bordeaux-open.svg) | `/profiles/lathe/lathe-y-bottle-bordeaux-open.svg` | **`bordeaux`** |
| [`lathe-y-bottle-alsace-open.svg`](../../public/profiles/lathe/lathe-y-bottle-alsace-open.svg) | `/profiles/lathe/lathe-y-bottle-alsace-open.svg` | **`alsace`** |
| [`lathe-y-bottle-sparkling-open.svg`](../../public/profiles/lathe/lathe-y-bottle-sparkling-open.svg) | `/profiles/lathe/lathe-y-bottle-sparkling-open.svg` | **`sparkling`** |

**Engine:** [`wine-bottle-svg-profile.ts`](../../src/engine/wine-bottle-svg-profile.ts) — `loadWineBottleOpenWallProfile` → `extractOpenPathPointsFromSvgText` (48 Kurven-Segmente) → **`normalizeOpenWallSvgToLathePoints`**: `scale = heightM / (maxY − minY)`, **`x_m = max(0, x) × scale`**, **`y_m = (maxY − y) × scale`** (Fuß bei `y ≈ 0`). Nicht `normalizeSvgProfileToLathePoints` (Dose).

**Authoring:** Pfad endet typisch am **Mund** (global `maxY`); kein geschlossener Wandring im SVG nötig. Enthält der Export doch einen Rückweg/`Z`, verwerfen **`trimLatheProfileToAscendingOuterMantle`** alles **nach** dem Mund.

---

**Category:** Assets — Bottle Wine  
**Title:** Glas-Mesh — Außen-Mantel + Stirnringe (implementiert)  
**Description:** **Abweichung von Beverage can:** Dose = eine offene Silhouetten-Halbachse. Flasche v1 = **Außen-Mantel** (Lathe der getrimmten SVG-Polyline) + **zwei Stirnflächen** (Mund/Boden) in **einem** Body-Mesh. Transmission + `meshDepthM` ergänzen die optische Wandstärke; **kein** geschlossener SVG-Wandring als eine Lathe.

**Mockup-Ziel (Querschnitt):** Lippe und Boden als **Ring** (Außen- und Innenkante); Mantel = rotierte **Außen**-Polyline.

**Pipeline** ([`wine-bottle-glass.ts`](../../src/engine/wine-bottle-glass.ts), aufgerufen aus [`wine-bottle-geometry.ts`](../../src/engine/wine-bottle-geometry.ts)):

1. **`prepareWineBottleGlassLatheProfile`** — Dedupe, `x ≥ 0`; falls erster/letzter Punkt identisch (geschlossener Export): **`pop()`** (kein `push(first)`).
2. **`trimLatheProfileToAscendingOuterMantle`** — nur **`profile[0 … lipIndex]`** mit **`lipIndex = argmax(y)`**; alles **nach** globalem Mund verwerfen (verhindert Scheibe durchs Volumen). **Nicht** nach „monoton steigendem Y“ filtern (Schulter→Hals→Mund braucht lokale Y-Dips).
3. **`LatheGeometry`** — **64** Segmente, **`phiStart = π`** (`LATHE_SEAM_PHI_START` in [`lathe-asset-common.ts`](../../src/engine/lathe-asset-common.ts)), dann **`weldLathePhiSeam`** ([`lathe-seam-normals.ts`](../../src/engine/lathe-seam-normals.ts)).
4. **Stirnseiten** — je **`RingGeometry`** bei **`y = min`** und **`y = max`** (nach Fuß-Pivot); Radien **`resolveWineBottleStirnRadiiAtY`**: bei zwei Schnittradien im Profil **`sampleWineBottleWallRadiiAtY`**, sonst **`rOuter = sampleWineBottleRadiusAtY`**, **`rInner = rOuter − wallThicknessM`**.
5. **`mergeGeometries`** (Mantel + Stirn) → **`applyLatheGeometryFootToY0`** ([`lathe-asset-common.ts`](../../src/engine/lathe-asset-common.ts)) → `computeVertexNormals`.
6. **Material / Schatten:** ein Mesh, `customDepthMaterial` **FrontSide**; Beauty Transmission **`DoubleSide`**, `depthWrite: false` — s. **Glas-Material**.

**Etikett / Kapsel:** **`sampleWineBottleRadiusAtY`** auf dem **gleichen** getrimmten Profil wie Glas (`buildWineBottleMeshes`).

**Tests:** [`wine-bottle-glass.test.ts`](../../src/engine/wine-bottle-glass.test.ts), [`wine-bottle-glass-axis.test.ts`](../../src/engine/wine-bottle-glass-axis.test.ts).

**Nicht Produktion:** [`wine-bottle-closed-wall-profile.ts`](../../src/engine/wine-bottle-closed-wall-profile.ts) (`closeOuterWallProfileToLatheRing`) — nur Tests / optionales Authoring-Skript; kein Runtime-Glas-Mesh.

---

**Category:** Assets — Bottle Wine  
**Title:** Glas-Material — Preset, Farbe, Wandstärke (2,5 mm)  
**Description:** **Ja — eigenes Built-in** für Weinflaschen (nicht `material-glass-solid` neutral als Default). Begründung: typisches **Flaschengrün** ist ein fester Mockup-Look; Display-Glazing (`material-glass-pane` / `displayGlass`) ist **falscher** Zweig (kein Transmission, scharfes Bild dahinter). Flasche = **Volumen-Glas** mit **Transmission** + **Tint**.

| Thema | Entscheidung |
|---|---|
| **Preset** | **`material-glass-wine-bottle`** — UI **Glass (wine bottle)** — **implementiert** (Built-in) |
| **Kind** | `transmission`, **`glassVariant: solid`** |
| **Farbe / Tint** | **`#176132`** → RGB **(23, 97, 50)** / **~(0,09, 0,38, 0,20)** — Preset-`tint` (nicht Entity-loses RGB) |
| **IOR / Roughness (Ziel)** | **1,52**; **~0,04–0,06** (gegossenes Flaschenglas, leicht matter als Kristall-`glass-solid`) |
| **Wandstärke 2,5 mm** | **Stirn-Innenradius** (`rOuter − wallThicknessM`) + Entity **`wallThicknessM`** für Label-Standoff. **Transmission:** `meshDepthM = wallThicknessM × 0,4` (optisch, Multi-Hit) — **nicht** ins Preset → [`requirements-materials.md`](./requirements-materials.md) |
| **Entity-Slot (Ziel)** | `glassMaterialId` — Default **`material-glass-wine-bottle`**; Geometries-Dropdown wie Picture/Handheld — **Asset-Wiring TBD** |
| **Schatten** | **`castShadow = true`** immer (Weinflaschen-Glas ≠ Display-Glazing). Glas-Body: **`customDepthMaterial`** (`MeshDepthMaterial`, **FrontSide**) in [`wine-bottle-glass.ts`](../../src/engine/wine-bottle-glass.ts) — Kontaktschatten am Boden aus Lathe-Silhouette, Beauty-Transmission unverändert. Weniger durchsichtig (Roughness, Tint, Preset) → **dunklerer** Schatten im Receive-Pass — kein Extra-Flag → [`requirements-shadows.md`](./requirements-shadows.md) |

**Engine:** `createTransmissionMaterial` — **kein** `displayGlass`. Wine-bottle: **`attenuationColor`** `#176132`, **`attenuationDistance` 15 mm** (Volumen/Transmission); **`specularColor`** = helleres gleiches Grün (~×2,25, clamp) für **Env/IBL-Specular** auf der Oberfläche ([`material-resolver.ts`](../../src/engine/material-resolver.ts)); `meshDepthM = wallThicknessM × 0,4` — [`WINE_BOTTLE_GLASS_TRANSMISSION_MESH_DEPTH_FACTOR`](../../src/scene/asset-wine-bottle.ts) in `populateWineBottleGroup`.

**User:** Darf im Materials-Panel Preset **duplizieren** (z. B. klarer Flint für Spirituosen) oder anderes Preset im Slot wählen — Built-in bleibt Wein-Default.

**Verworfen:** Nur `material-glass-solid` + manueller Tint pro Instanz ohne Preset; **2,5 mm** als Material-Parameter; **pane**-Variante für Flaschenwand.

---

**Category:** Assets — Bottle Wine  
**Title:** Korken — Maße, Geometrie, Platzierung  
**Description:** Optionaler **Naturkork**-Stopfen als **eigenes Mesh** (`cork`) — **nicht** Teil des Glas-Lathe. Mockup-typisch: Zylinder mit **abgerundeten** Ober- und Unterkante (Kantenradius). **Sekt:** etwas **dickerer** Kork (10 mm Radius). Kork-Oberkante bleibt **bündig** mit **`y = heightM`**; **Kapsel-Folie** und **Disc** können den Kork **visuell verdecken** (Mockup-Stack).

**Nennmaße (alle Profile, × `sizeScale`):**

| Parameter | Bordeaux / Alsace | Sparkling | Code (Ziel) |
|---|---|---|---|
| **Radius** | **9,0 mm** → **0,0090 m** | **10,0 mm** → **0,0100 m** | `corkRadiusM` (profilabhängig) |
| **Höhe** | **40,0 mm** → **0,0400 m** | gleich | `corkHeightM` |
| **Kantenradius** | **1,5 mm** → **0,0015 m** | gleich | `corkEdgeRadiusM` — Fillet an **oberer + unterer** Zylinderrand |

**Geometrie (Ziel):** Rotationszylinder um **Y**, Radius = `corkRadiusM`, Höhe = `corkHeightM`. **Kantenradius** = **1,5 mm** als **Rundung** der beiden **kreisförmigen** Enden (pill-/tablettenartiger Kork, keine scharfe Scheibe). Implementierung analog abgerundeter Prismen (vgl. Block `cornerRadiusMm`, Handheld-Extrude) — **kein** Stretch, einheitlicher Radius auf beiden Enden.

**Platzierung:**

- Glas-Flasche: Pivot **Fuß** `y = 0`, **Oberkante / Mund** bei **`y = heightM`** (**290 mm** Default).
- Korken: **Oberkante** schließt **bündig** mit der Flasche ab — **kein** Überstand nach oben. Lokales Mesh **`y ∈ [0, corkHeightM]`**, **`mesh.position.y = heightM − corkHeightM`** (Kork liegt im **Hals**, sichtbarer Zylinder **40 mm** nach **unten** vom Mund).
- **Gesamthöhe Glas + Kork** bleibt **`heightM`** (290 mm); Kork **verlängert** nicht über den Mund. **Kapsel-Disc** kann **darüber** ragen → s. **Kapsel-Scheibe** (`heightM + capsuleDiscHeightM`).

**Abgrenzung Dose:** Wie **`topRing`** — separates Teil-Mesh, eigenes Material, **nicht** in die Glas-SVG.

---

**Category:** Assets — Bottle Wine  
**Title:** Korken — Sichtbarkeit, Material, UI  
**Description:** Pattern wie **Beverage can** `topRing` / Picture **Geometries** → [`requirements-assets-beverage-can.md`](./requirements-assets-beverage-can.md), [`requirements-look-and-feel.md`](./requirements-look-and-feel.md).

| Teil (`geometryVisibility`) | UI-Label | Checkbox (Default) | Material-Dropdown (Default) |
|---|---|---|---|
| **`cork`** | Cork | **an** (`true`) | **`material-wood-porous`** (`Wood Porous`) |

**Material:** Built-in **`material-wood-porous`** — `textured` / `wood-porous`, matter Kork-Look (Poren), **kein** eigenes Kork-Preset in v1 → [`requirements-materials.md`](./requirements-materials.md). Slot **`corkMaterialId`**; User kann anderes Preset wählen (z. B. Wood Soft).

**Right Sub — Geometries (Ziel):** Zeile **Cork**: Checkbox + Material-Dropdown. API: `setGeometryVisible(entityId, 'cork', visible)` → Rebuild. **`cork` aus** → kein Kork-Mesh (Flasche „ohne Stopfen“).

**Schatten:** Kork **cast + receive** wie übrige Asset-Meshes → [`requirements-shadows.md`](./requirements-shadows.md) (`applyAssetShadowFlags`).

**Rebuild-Trigger:** `wineBottleBodyProfile`, `wineBottleParams` (Kork-Maße falls editierbar später), `corkMaterialId`, `sizeScale`, `geometryVisibility`.

**v1:** Kork-Maße **fest** (Tabelle oben), **nicht** im Panel editierbar — nur Sichtbarkeit + Material. **Verworfen v1:** Kork halb versenkt im Hals (ohne User-Anfrage); Muselet/Drahtkorb.

---

**Category:** Assets — Bottle Wine  
**Title:** Kapsel-Folie — Mantel (nur seitlich)  
**Description:** **Schrumpf-/Folienkapsel** am **Hals und oberen Schulterbereich** — **nur Mantel** (360° **um** die Flasche), **keine** Folien-Deckfläche oben (die übernimmt die **Kapsel-Scheibe**). Folie liegt **leicht erhaben** außerhalb des Glases und **folgt der Außen-Silhouette** (profilabhängig).

**Parameter (Ziel, `wineBottleParams`):**

| Parameter | Bedeutung |
|---|---|
| **`capsuleFoilHeightM`** | Tiefe **von oben** nach unten — Band **`y ∈ [heightM − capsuleFoilHeightM, heightM]`** |
| **`capsuleFoilStandoffM`** | Radialer Abstand **außerhalb** Glas-Außenradius — v1 **Engine-Konstante** **~0,0004 m** (0,4 mm), × `sizeScale`; **nicht** im Panel |

**Radius pro Höhe:** `r_foil(y) = r_outer_glass(y) + capsuleFoilStandoffM` mit **`r_outer_glass`** aus Außenkontur des Glas-SVG (analog `sampleProfileRadiusAtY` → [`beverage-can-svg-profile.ts`](../../src/engine/beverage-can-svg-profile.ts)).

**Geometrie (Ziel):** **Offener Mantel** — nur **laterale** Fläche (Zylinderstreifen / Lathe-Segment mit variablem Radius), **untere** Kante des Bands **offen**, **obere** Kante am Mund **ohne** Folien-„Deckel“. **360°**, Naht hinten **−Z** (wie Etikett/Dose). Normale nach außen.

**Clamps:** `capsuleFoilHeightM` z. B. **0,005–0,12 m**; Band darf nicht unter **`y = 0`**.

**Default:** **28 mm** (`0,028 m`).

---

**Category:** Assets — Bottle Wine  
**Title:** Kapsel-Folie — Sichtbarkeit, Material, UI  
**Description:** **Alle drei Profile**; Checkbox Default **an**.

| Teil (`geometryVisibility`) | UI-Label | Checkbox (Default) | Material |
|---|---|---|---|
| **`capsuleFoil`** | Capsule foil | **an** | **`capsuleFoilMaterialId`** — Default **`material-gold-brushed`** (Gold Brushed) |

**Right Sub — Geometries:** Checkbox + Material-Dropdown + **Höhe** (`capsuleFoilHeightM`, mm in UI). API: `setGeometryVisible(entityId, 'capsuleFoil', visible)`.

**Schatten:** cast + receive wie übrige Asset-Teile.

---

**Category:** Assets — Bottle Wine  
**Title:** Kapsel-Scheibe (Capsule disc)  
**Description:** **Scheibe / Kappen-Zylinder** **oben auf** der Flasche — separates Mesh **`capsuleDisc`**. v1: **einfacher Zylinder** (optional später leichte **Wölbung** der +Y-Fläche — **nicht** blockierend).

**Parameter (Ziel):**

| Parameter | Bedeutung |
|---|---|
| **`capsuleDiscHeightM`** | **Axiale Höhe** des Zylinders |
| **`capsuleDiscRadiusM`** (abgeleitet v1) | **`r_outer_glass(heightM) + capsuleFoilStandoffM`** — bündig mit Folie am Mund |

**Platzierung:**

- **Unterkante** Disc bei **`y = heightM`** (auf Flaschenoberkante / Kork-Ebene).
- Lokales Mesh **`y ∈ [0, capsuleDiscHeightM]`**, **`mesh.position.y = heightM`**.
- **Oberkante** Disc bei **`y = heightM + capsuleDiscHeightM`** → **Bounding-Box-Höhe** der Instanz mit sichtiger Disc: **`heightM + capsuleDiscHeightM`** (Disc **ragt nach oben**).

**Default:** **2 mm** (`0,002 m`) Höhe.

**Clamps:** `capsuleDiscHeightM` z. B. **0,001–0,03 m**.

---

**Category:** Assets — Bottle Wine  
**Title:** Kapsel-Scheibe — Sichtbarkeit, Material, UI  
**Description:**

| Teil (`geometryVisibility`) | UI-Label | Checkbox (Default) | Material |
|---|---|---|---|
| **`capsuleDisc`** | Capsule disc | **an** | **`capsuleDiscMaterialId`** — Default **`material-gold-brushed`** |

**Geometries:** Checkbox + Material + **Höhe** (`capsuleDiscHeightM`).

---

**Category:** Assets — Bottle Wine  
**Title:** Kapsel — Stack, Maße, `WineBottleParams` (Skizze)  
**Description:**

```text
     [capsule disc]     y = heightM … heightM + capsuleDiscHeightM
  |--[foil sleeve]---|  y = heightM − capsuleFoilHeightM … heightM  (nur Mantel)
        [cork]         y = heightM − corkHeightM … heightM
        [glass]        y = 0 … heightM
```

**`sizeScale`:** auf alle Kapsel- und Kork-Maße sowie `capsuleFoilStandoffM`.

**Render-Reihenfolge (Ziel):** Glas → Etikett (auf Glas) → Kork → Kapsel-Folie → Kapsel-Disc (oben).

```ts
// wineBottleParams (Auszug, Ziel)
capsuleFoilHeightM: number;
capsuleDiscHeightM: number;
// capsuleFoilStandoffM: Konstante Engine v1
```

**Rebuild-Trigger:** Kapsel-Parameter, `capsuleFoilMaterialId`, `capsuleDiscMaterialId`, `geometryVisibility.capsuleFoil` / `capsuleDisc`, Profil, `sizeScale`.

**Verworfen v1:** Muselet; Folie als durchgehende geschlossene Hülle inkl. Deckel (Deckel = **Disc**); user-editierbarer Folien-Standoff im Panel.

---

**Category:** Assets — Bottle Wine  
**Title:** Mesh-Stack (Ziel)  
**Description:** Übersicht der Meshes pro Instanz (Reihenfolge / `renderOrder` TBD):

| # | Teil | Mesh | Material-Slot |
|---|---|---|---|
| 1 | **Glas** | Außen-Mantel-Lathe + Stirnringe (ein Mesh) | `glassMaterialId` → Default `material-glass-wine-bottle` |
| 2 | **Etikett** | Mantel-Subset / Gruppe `label` | `screenImageId` + `imageSurfaces.label` |
| 3 | **Korken** | Zylinder + Kantenradius | `corkMaterialId` → Default `material-wood-porous` |
| 4 | **Kapsel-Folie** | Profil-konformer Mantel | `capsuleFoilMaterialId` → Default `material-gold-brushed` |
| 5 | **Kapsel-Scheibe** | Zylinder oben | `capsuleDiscMaterialId` → Default `material-gold-brushed` |

---

**Category:** Assets — Bottle Wine  
**Title:** Geometries — Sichtbarkeit (alle Teile)  
**Description:** Right Sub: Sektion **„Geometries“** wie Dose / Picture — **jedes** Teil mit **Checkbox** + Material-Dropdown (wo sinnvoll). API: `setGeometryVisible(entityId, part, visible)` → Rebuild. Default **alle `true`**.

| Key (`geometryVisibility`) | UI-Label | Checkbox | Material-Slot |
|---|---|---|---|
| **`body`** | Glass | **an** | `glassMaterialId` |
| **`label`** | Label | **an** | über **`screenImageId`** + `imageSurfaces.label` (nur wenn Bild gesetzt — s. Etikett) |
| **`cork`** | Cork | **an** | `corkMaterialId` |
| **`capsuleFoil`** | Capsule foil | **an** | `capsuleFoilMaterialId` |
| **`capsuleDisc`** | Capsule disc | **an** | `capsuleDiscMaterialId` |

**Label:** Ohne **`screenImageId`** → **kein** Label-Mesh (Flasche „leer“, nur Glas + ggf. Kork/Kapsel). Checkbox **`label`** wirkt nur, wenn ein Bild gewählt ist.

**Serialisierung:** Keys in Entity + Scene-Preset → [`requirements-scenes.md`](./requirements-scenes.md).

---

**Category:** Assets — Bottle Wine  
**Title:** Etikett — Abgrenzung zur Dose  
**Description:** Die **Dose** hat ein **festes** bedruckbares Band (`labelBottomOffsetM`, `labelHeightM` aus Profil + Nennhöhe) und skaliert die Textur primär **an die Bandhöhe** (Height-fit, horizontal je nach Aspect). Die **Flasche** hat **kein** fixes Industrie-Band in v1: der User legt **Druckformat** (flaches Etikett, real scale) und **vertikale Position** fest; das **Bild** skaliert **proportional** in dieses Rechteck — **nie** Verzerrung (→ [`image-aspect-ratio.mdc`](../../.cursor/rules/image-aspect-ratio.mdc)).

| | **Beverage can** | **Bottle Wine** |
|---|---|---|
| Körpermaß aus Bild | **nein** | **nein** |
| Label-Größe | aus **Profil** + 5 mm Boden | User: **Breite *oder* Höhe** (mm/m) |
| Label-Position Y | fest (Boden-Offset) | **verschiebbar** |
| Umfang | immer **360°** Sleeve | **360°** *oder* **Teil** (PNG, Front) |
| Textur-Fit | Height-fit + Metall-Ränder | Rechteck = Druckmaß; Bild füllt **1:1 Aspect** |

---

**Category:** Assets — Bottle Wine  
**Title:** Etikett — Druckmaß & Bild (proportional)  
**Description:** Das **flache Etikett** (Mockup: Rechteck auf dem Mantel) hat reale Abmessungen **`labelWidthM`** × **`labelHeightM`**. Der User gibt **genau eine** Seite vor; die andere wird aus dem **Bild-Seitenverhältnis** (Pixel width/height von `screenImageId`) berechnet — **ohne** Stretch.

**Größen-Modus (Ziel):**

| `labelSizeMode` | User-Eingabe | Berechnung |
|---|---|---|
| **`height`** | `labelSizeM` = gewünschte **Höhe** | `labelHeightM = labelSizeM`; `labelWidthM = labelSizeM × imageAspect` |
| **`width`** | `labelSizeM` = gewünschte **Breite** (flach, gerade Kante) | `labelWidthM = labelSizeM`; `labelHeightM = labelSizeM / imageAspect` |

`imageAspect = imageWidthPx / imageHeightPx` (aus Images-Bibliothek). **Ohne Bild (`screenImageId` leer):** **kein** Label-Mesh — Mantel bleibt **nur Glas** (kein Platzhalter, keine weiße Fläche).

**Defaults (v1, sobald Bild gesetzt):**

| Parameter | Default | Hinweis |
|---|---|---|
| **`labelBottomOffsetM`** | **0,05 m** (**50 mm** von Fuß `y = 0`) | UI **From bottom** |
| **`labelSizeMode`** | **`height`** | User-Seite = Höhe |
| **`labelSizeM`** | **0,09 m** (**90 mm**) | → **`labelHeightM = 90 mm`** |
| **Breite (Start)** | **0,12 m** (**120 mm**) | **4∶3** (Breite∶Höhe) = `90 mm × 4/3` — sobald Bild aktiv, **andere** Seite aus **Bild-Aspect** (eine Seite aus User/`labelSizeM`, andere aus Pixel-Ratio) |

**Textur:** Volles Bild auf das Rechteck — Aspect des Rechtecks **entspricht** dem Bild (weil eine Seite aus Bild abgeleitet). **Kein** Cover-Crop nötig für Standardfall. **Alpha (PNG):** transparente Pixel → **Glas** sichtbar (Teiletikett); Finish Matt/Glossy auf **bedruckten** Pixeln → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md). **Engine:** `createImagePbrMaterial` auf Label-Mantel-Mesh (Alpha-Blend, `depthWrite: false`) — **nicht** `createCanLabelMaterial` (Metall-Underlay der Dosen).

**Clamps (Ziel):** `labelSizeM` sinnvoll **0,02–0,25 m**; resultierende Breite/Höhe müssen auf **Mantel** liegen (s. Position); bei Teil-Etikett `labelWidthM` ≤ Umfang am Label-Mittel (**π × D** max für Halbmantel-Logik — exakte Grenze Engine).

---

**Category:** Assets — Bottle Wine  
**Title:** Etikett — Position (Höhe)  
**Description:** Vertikale Lage ist **editierbar** (Mockup: typisch Hauptetikett im Bauch, kleines Neck-Label später optional — **ein** Label-Slot in v1).

**Parameter (Ziel):**

| Parameter | Bedeutung |
|---|---|
| **`labelBottomOffsetM`** | Unterkante des Etikett-Rechtecks über **`y = 0`** (Flaschenfuß / Pivot), in Metern, × `sizeScale` |
| *(abgeleitet)* | **`labelTopOffsetM = labelBottomOffsetM + labelHeightM`** |

Alternative Darstellung in UI: Slider „**von unten**“ oder „**Mitte Y**“ — **eine** kanonische API (`labelBottomOffsetM`); UI darf umrechnen.

**Mantel-Gültigkeit:** Label-Geometrie/UV nur auf **Außenmantel** zwischen Schulter und oberer Punt-Zone — **kein** Etikett auf reiner **Hals**-Zylinderfläche in v1 (Clamps/Warnung wenn `labelBottomOffsetM` + Höhe in Hals ragt). Feine **y**-abhängige Radien aus SVG-Außenkontur (`sampleProfileRadiusAtY` o. ä.).

**Horizontal (Teiletikett):** **Mitte des Bildes** auf **lokal +Z** (Front), wie Dose. **Drehen** um Flasche (Azimut) — *TBD v1.1* (`labelRotationDeg`); Default **0°**.

---

**Category:** Assets — Bottle Wine  
**Title:** Etikett — Vollmantel (360°) vs. PNG-Teiletikett  
**Description:** Zwei Anwendungsfälle:

**1 — Vollmantel (Sleeve / Wrap)**  
- Bild umschließt die Flasche **einmal** (**U 0…1** = voller Umfang).  
- User setzt z. B. **Höhe**; **Breite** = `H × imageAspect`. Wenn diese Breite **≈ Umfang** am Label-Mittel (`2πr`), passt das Artwork als **ein** Sleeve (wie Dose).  
- **Modus (Ziel):** `labelWrap: 'full'` — Textur **360°**, Naht hinten **−Z** (wie Dose, `phiStart = π`).  
- Optional UI: „**Umfang an Flasche anpassen**“ setzt `labelWidthM = 2π × r(labelCenterY)` und locked `labelSizeMode` auf abgeleitete Seite — *Komfort, nicht Pflicht*.

**2 — Teiletikett (PNG, Front)**  
- Rechteck nur auf der **vorderen** Mantelfläche; **Seiten und Rücken = Glas** (PNG-Alpha).  
- **`labelWrap: 'partial'`** (Default für schmale `labelWidthM` << Umfang).  
- **Breite** in Metern = **Bogenlänge** am Außenradius (Mittelhöhe des Rechtecks): `arcLength = labelWidthM`. Halbwinkel `θ/2 = arcLength / (2r)`. UV/Geometrie: nur Dreiecke im Winkelbereich **−θ/2…+θ/2** um +Z.  
- Typisch **PNG** mit Transparenz; auch **JPEG** möglich (volles Rechteck, keine Alpha).

**Umschalten:** explizites **`labelWrap: 'full' | 'partial'`** in v1 (nicht nur aus Breite raten), damit ein breites PNG nicht ungewollt wrapt.

---

**Category:** Assets — Bottle Wine  
**Title:** Etikett — Mesh, Material, UI  
**Description:** Separates **Label-Mantel-Mesh** (leicht radial versetzt) mit **`screenImageId`** + `imageSurfaces.label`; Glas-Körper darunter. **Material:** `createImagePbrMaterial` + Cover-UV aus Label-Rechteckmaßen — bei PNG **Transparenz → Glas**, kein deckendes Underlay. **Ohne Bild:** **kein** Label-Mesh. **`geometryVisibility.label` aus** → Label aus, auch wenn Bild gesetzt. (Dosen: separates Label + `createCanLabelMaterial` — anderer Alpha-Pfad.)

**Right Panel (Ist):** `ImageSurfaceFields` + Sektionen in [`WineBottleFields.tsx`](../../src/ui/panels/entity-fields/WineBottleFields.tsx). Footer **Dimensions** + **Position**. **Label** (im Panel):

- `labelWrap` — Full / Partial  
- `labelSizeMode` — Width / Height  
- `labelSizeM` — mm-Eingabe in UI, m intern  
- `labelBottomOffsetM` — Höhe verschieben  

**Rebuild-Trigger:** `wineBottleBodyProfile`, `wineBottleParams` (inkl. Label-Felder), `screenImageId`, `sizeScale`, `geometryVisibility`, `imageSurfaces`, Glas-Material.

**Image-driven sizing:** **aus** — Bild ändert **nicht** Flaschenhöhe/Profil; nur **eine** Label-Seite aus Pixel-Aspect.

---

**Category:** Assets — Bottle Wine  
**Title:** Szene-Panel (Ist)  
**Description:** Label / Image → Geometries → Body profile → Capsule → Label placement → Footer **Dimensions** (Size + gekoppeltes W/H, Footprint Bauch × `heightM`) → **Position**. Kein Transform-Block.

---

**Category:** Assets — Bottle Wine  
**Title:** Offen (nicht Panel Runde 1)  
**Description:** Optional später: Etikett-**Azimut**, zweites Neck-Label, gewölbte Kapsel-Disc, Abgleich Füllvolumen 0,75 l vs. 290 mm Nennhöhe, Glas-Innen-Punt-Feintuning.

---
