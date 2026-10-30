# Assets — Beverage can (330 ml)

Parametrischer **Getränkedosen**-Baustein (klassische **330-ml-Aluminiumdose**, z. B. Cola-Mockup) — **Etikett / Sleeve** als Bild aus der **Images-Bibliothek** → [`requirements-images.md`](./requirements-images.md). Katalog, Entity-Modell, Drop/Add, Szene-Panel-Grundlagen → [`requirements-assets.md`](./requirements-assets.md). Bild-Flächen (Matt/Glossy, Emissive) → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md). Material-Slots → [`requirements-materials.md`](./requirements-materials.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md). Uniform Scale → [`requirements-gimbals.md`](./requirements-gimbals.md).

**Abgrenzung:** Kein `print`-Prisma, keine Flasche. **Block**, **Picture framed** → eigene Docs. Marken-Logos sind User-Bilder — kein Coca-Cola-Branding im Built-in. **Nicht** dasselbe wie **Slim Can** (Ø 53 mm, meist 150–250 ml) — s. Profil-Tabelle unten.

**Status:** **nicht implementiert** — nur Requirements.

**v1-Scope:** Ein Built-in `beverage-can`; **330 ml** in zwei **Körperprofilen** (**Standard** und **Sleek**); **real scale**; **Dosenformat fix** — Bild bestimmt **nicht** Höhe/BOD/Profil (Ausnahme zu Image-driven sizing → [`requirements-assets.md`](./requirements-assets.md)); **Alu-Körper** = **SVG-Silhouette → `LatheGeometry`** + **parametrischer Mantel-Endring** (2,5 × 1,5 mm); **Label** = **`screenImageId` auf dem Lathe-Mesh** (Cover auf festem Band); **`sizeScale`** = **uniform** auf **gesamte** Dose; Szene-Panel **Geometries**; **Kein** Pull-Tab, **kein** Verschluss-Mesh in v1.

**Lathe (Querschnitt):** SVG-Pfade in **mm**, nur **uniform** skalieren, Szene-Panel-Ziel **Size** + gekoppeltes Width/Height → [`requirements-assets-lathe.md`](./requirements-assets-lathe.md).

---

**Category:** Assets — Beverage can  
**Title:** Identität & Katalog  
**Description:** Built-in Baustein, nicht löschbar.

| `assetKind` | UI-Label | Kategorie (Ziel) |
|---|---|---|
| `beverage-can` | Can Beverage | **Objects** (Lucide z. B. `cylinder` / `package`) |

Stabile Katalog-ID über `kind`. Mehrfach-Instanzen unbegrenzt. Default-Szene: **keine** Pflicht-Instanz (optional später Stilleben-Layout).

---

**Category:** Assets — Beverage can  
**Title:** Fachbegriffe — Dosenfamilien & 330 ml  
**Description:** In der **Getränkedosen-Industrie** (Aluminium **DWI**-Körper + **EOE**-Deckel) unterscheidet man vor allem **Körperprofile** über den **Außendurchmesser des Mantels** (*outside body diameter*, **BOD**). Für **330 ml Füllvolumen** sind in Europa/Global zwei Profile üblich — beide nutzen typischerweise denselben **202-Neck** / **202-End** (Innendurchmesser Hals ≈ 52,4 mm), aber **unterschiedliche Höhe und Umfang**.

| Umgangssprache (DE) | Englisch (Industrie) | Kurz |
|---|---|---|
| **Standard-Dose**, **Normdose**, klassische Cola-/Bier-Dose | **Standard can**, **classic profile** | niedrig, breit |
| **Sleek-Dose**, schlanke Premium-Dose | **Sleek can** | hoch, schmaler Mantel |
| *(nicht 330-ml-Zwilling)* **Slim-Dose** | **Slim can** | **Ø 53 mm**, meist **kleinere Volumina** (z. B. 250 ml) |

**Lieferanten-Kurzbezeichnung (Beispiel Crown):** `Körper/Hals/Ende × Höhe`, z. B. **66/52×115 mm** = Standard 330 ml; Sleek analog **57/52×146 mm** (Näherung). **CDL** = *Curl Development Lid* (Deckeltyp); **B64** = Bodenprofil — für Mockup v1 nur Silhouette, keine Seamer-Physik.

**Parameter im Asset (Ziel):** `canBodyProfile: 'standard' | 'sleek'` — setzt Nennmaße und Label-Näherungen aus der Tabelle unten; User kann danach noch einzelne mm-Felder tweaken.

---

**Category:** Assets — Beverage can  
**Title:** Realmaß-Referenz — 330 ml Standard vs. 330 ml Sleek  
**Description:** Nennwerte für **Mockup-Geometrie** (geschlossene Dose, ohne Pull-Tab). Körper, Verjüngungen, Gesamthöhe und Toleranzen aus Projektspezifikation / Lieferanten-CIM (Crown **N** Neck Length **17,40 mm** bei Standard). App nutzt **festen Nennwert** pro Profil; Bereiche in Klammern für Panel-Clamps / spätere Feinjustierung.

### Vergleich 330 ml

| | **Standard** (`standard`) | **Sleek** (`sleek`) |
|---|---|---|
| **Füllvolumen (nominal)** | 330 ml | 330 ml |
| **Körper-Außendurchmesser (BOD)** | **66,0 mm** (Spec. max. 66,3) | **57,4 mm** |
| **Bodendurchmesser** (*Standring*, Kontaktfläche unten) | **47,24–47,40 mm** | **47,24 mm** |
| **Verschluss / Deckelring** (202, gemeinsam) | **Außenkante / Falz: 54,00 mm** · **Innentopf: 52,40 mm** | **Außenkante / Falz: 54,00 mm** · **Innentopf: 52,40 mm** |
| **Höhe Verjüngung oben** (*Neck Length*, Schulter → Hals) | **17,40–19,27 mm** | **10,50 mm** (**± 0,5 mm**) |
| **Höhe Verjüngung unten** (*Bodenkuppel-Einzug*) | **ca. 3,00–4,00 mm** | **ca. 3,50–4,50 mm** |
| **Gesamthöhe** (geschlossene Dose, ohne Tab) | **115,20 mm** (**± 0,4 mm**) | **146,05 mm** (**± 0,3 mm**) |
| **Höhe ÷ Durchmesser** (Aspect) | **≈ 1,74** | **≈ 2,54** |
| **Mantel-Umfang** (π × BOD) | **207,345 mm** | **180,327 mm** |
| **Neck / End (typ.)** | **202** | **202** |
| **Typische Produkte** | CSD, Bier, Massenmarkt-Saft | Energy, RTD, Hard Seltzer, Premium-Cider |

**Bodendurchmesser (Standring):** Außendurchmesser der **Kontaktfläche** am Boden (innen gewölbt, nach außen schmaler als BOD). **Sleek** und **Standard** teilen denselben **202**-Boden-Typ — daher bei Sleek fester Nenn **47,24 mm**; bei **Standard** Toleranzband **47,24–47,40 mm**. **Mockup-Nenn Standard:** **47,32 mm** (Mittelwert des Bands), bis verfeinerte Messung — **Sleek:** **47,24 mm**.

**Verschluss / Deckelring (202):** **Identisch** für Standard und Sleek — **202**-End (*neck size 202*). **Außenkante / Falz** (sichtbarer Außendurchmesser des Verschlusses): **54,00 mm**. **Innentopf** (*inside neck*, **202er-Maß** / Neck-Plug-Ø): **52,40 mm** (entspricht Crown/Ardagh **M ≈ 52,4 mm**). Der zuvor nachgemessene **Mantel-Endring** (**2,5 mm** Höhe, **1,5 mm** Dicke) sitzt **unter** diesem Verschluss; Geometrie v1: Falz-Ø **54 mm** für Deckelscheibe / Lippe, **52,4 mm** für Öffnung/Hals-Innenkontur.

**Verjüngung oben (*Neck Length*):** Höhe der **konischen Schulter** vom **zylindrischen Mantel** (BOD) zum **Hals / Verschluss** — **nicht** identisch mit dem sichtbaren **2,5-mm-Mantelring** oder der Crown-Größe **Overall neck height ~19 mm** (enthält End/Flansch). **Standard** deutlich längere Schulter (**17,40–19,27 mm**); **Sleek** kürzer (**10,50 ± 0,5 mm**). **Mockup-Nenn:** Standard **18,34 mm** (Mittel des Bands), Sleek **10,50 mm**.

**Verjüngung unten (*Bodenkuppel-Einzug*):** Vertikaler **Einzug** der Bodenkuppel vom **Zylindermantel** zum **Standring** (innen gewölbt). **Standard ca. 3,00–4,00 mm**, **Sleek ca. 3,50–4,50 mm**. **Mockup-Nenn:** Standard **3,50 mm**, Sleek **4,00 mm** (jeweils Bandmitte).

### Metallzonen — gemeinsam für Standard & Sleek (nachgemessen)

**Quelle:** Referenz-330-ml-Dose (Standard-Profil) **manuell nachgemessen** (Projekt-Referenz, 2026-10-09). Werte gelten **für beide** Körperprofile (**Standard** und **Sleek**) — gleicher **202**-End/Deckel und gleicher Boden-Chime-Typ; nur **Mantelhöhe** und **Umfang** unterscheiden sich.

| Zone | Maß | Hinweis |
|---|---|---|
| **Boden — blankes Alu** (Label beginnt darüber) | **5,0 mm** | Vertikal vom **Bodenkontakt** (Pivot) bis Unterkante Bedruckung / Lack |
| **Oberer Endring** — **Höhe** (vertikal am Mantel) | **2,5 mm** | Sichtbarer **Ring** unter dem Deckel; Label endet darunter |
| **Oberer Endring** — **Dicke** (radial, Querschnitt) | **1,5 mm** | Ring-Profil im Querschnitt: **Rechteck Hochformat** mit **abgerundeten Ecken** (nicht nur Linie auf der Zylinderfläche) — für v1-Geometrie als extrudierter Ring / Fillet-Rechteck modellieren |
| **Verschluss — Außenkante / Falz** (202) | **54,00 mm** Ø | Deckel/Verschluss außen; **beide** Profile |
| **Verschluss — Innentopf** (202) | **52,40 mm** Ø | Hals-Innenmaß / Öffnung |

**Was das Bild abdeckt:** Nur der **zylindrische Label-Mantel** zwischen **5 mm** Boden-Alu und **2,5 mm** oberem Ring (voller **360°-Umfang**) — **nicht** Deckel, Boden-Chime oder Endring.

### Label-Band (abgeleitet)

`labelHeight = canHeight − 5 mm − 2,5 mm` (**7,5 mm** Metall reserve).

| Maß | **Standard** | **Sleek** |
|---|---|---|
| **Gesamthöhe** | 115,20 mm (± 0,4) | 146,05 mm (± 0,3) |
| **Label-Unterkante** über Boden | **5,0 mm** | **5,0 mm** |
| **Label-Oberkante** unter Ring | **2,5 mm** unter Kante | **2,5 mm** unter Kante |
| **Label-Band Höhe** | **107,70 mm** | **138,55 mm** |
| **Mantel-Umfang** (π × BOD) | **207,345 mm** | **180,327 mm** |
| **Flaches Unfold** (1× Umfang × Labelhöhe) | **207,345 × 107,70 mm** | **180,327 × 138,55 mm** |
| **Unfold Aspect-Ratio** (Breite ÷ Höhe) | **≈ 1,9252 : 1** | **≈ 1,3015 : 1** |
| **Höhe ÷ Breite** (Portrait-Reciprok) | **≈ 1 : 1,9252** | **≈ 1 : 1,3015** |

### Bildformat — flaches Label (User-Images)

**Dosenformat vs. Bild (Pflicht):** Maße der Dose kommen aus **`canBodyProfile`** / **`beverageCanParams`** (bzw. Profil-Defaults) — **niemals** aus `ImageAsset.width` / `height`. Bildwechsel oder falsches Aspect → **nur** UV **Cover/Crop** auf dem **unveränderten** Label-Band; **kein** Mesh-Rebuild der Körpergeometrie wegen des Bildes. User vergrößert/verkleinert die Instanz nur über **`sizeScale`** (oder Gizmo-Uniform-Scale) — **alle** Teile (Lathe, Ring, Label-UV-Band) × gleicher Faktor, **kein** Stretch.

**Orientierung:** **Landscape** (Breite = einmal **360°-Umfang**, Höhe = **Label-Band**). **Kein Stretch** — ideales Design-Unfold entspricht dem Band-Aspect (Toleranz z. B. `imageMatchesLabelUnfoldAspect`); Abweichung ändert **nicht** die Dose.

**Formel:**

- `labelHeightMm = canHeightMm − 5,0 mm − 2,5 mm`
- `unfoldWidthMm = π × bodyDiameterMm`
- `unfoldHeightMm = labelHeightMm`

| DPI | **Standard** (px, gerundet) | **Sleek** (px, gerundet) |
|---|---|---|
| **72** | **588 × 305** | **511 × 393** |
| **150** | **1224 × 636** | **1065 × 818** |
| **300** (Druck/Design) | **2449 × 1272** | **2130 × 1636** |

Gerundete Pixelmaße können vom exakten Ratio um **±1 px** abweichen — für Proofing exakte mm-Ratio oder höhere Auflösung mit gleichem Aspect nutzen.

**Abgrenzung Druck-Dieline:** Lieferanten-Templates (z. B. Ardagh **207 × 107 mm** Standard) können **Warp-/Bleed-Zonen** enthalten; **3D-Mockup-UV** folgt der **physischen Label-Bandhöhe** (**107,70 mm**), nicht zwingend der PDF-Dieline-Höhe.

**Engine (intern, keine App-UI):** [`beverage-can-label-unfold.ts`](../../src/engine/beverage-can-label-unfold.ts) — `computeLabelUnfoldForProfile`, `computeLabelUnfoldAspect`, `computeLabelUnfoldPixelsRounded`, `labelUnfoldPixelsForReferenceDpis`, `imageMatchesLabelUnfoldAspect`.

**Scene-Einheit (m) bei `sizeScale = 1`:**

| Maß | **Standard** | **Sleek** |
|---|---|---|
| `heightM` | **0,1152** (± 0,0004) | **0,14605** (± 0,0003) |
| `diameterM` | **0,0660** | **0,0574** |
| `neckLengthM` | **0,01834** (Band 17,40–19,27) | **0,0105** (± 0,0005) |
| `bottomDomeInsetM` | **0,0035** (ca. 3–4) | **0,0040** (ca. 3,5–4,5) |
| `bottomStandDiameterM` | **0,04732** (Band 47,24–47,40) | **0,04724** |
| `labelBottomOffsetM` | **0,0050** | **0,0050** |
| `labelHeightM` | **0,1077** | **0,13855** |
| `topRingHeightM` | **0,0025** | **0,0025** |
| `topRingThicknessM` | **0,0015** | **0,0015** |
| `closureOuterDiameterM` | **0,0540** | **0,0540** |
| `closureInnerDiameterM` | **0,0524** | **0,0524** |
| `bottomMetalBandM` | **0,0050** | **0,0050** |

**Abgeleitet (Pivot unten):** Label-Mantel **y = 5,0 mm … (Gesamthöhe − 2,5 mm)** — Standard **5,0…112,7 mm**, Sleek **5,0…143,55 mm**.

**355 ml (US 12 oz)**, **Slim Can (Ø 53 mm)** und weitere Volumina → **nicht** v1 (eigene Presets / `assetKind` später).

---

**Category:** Assets — Beverage can  
**Title:** Dosenformat vs. Bild — keine Image-driven sizing (Pflicht)  
**Description:** Abweichung vom Default in [`requirements-assets.md`](./requirements-assets.md) (**Image-driven sizing**). Für `beverage-can` gilt:

| Quelle | Steuert |
|---|---|
| **`canBodyProfile`**, **`beverageCanParams`**, SVG-Profil | Gesamthöhe, BOD, Neck, Label-Band (mm), Geometrie-Rebuild |
| **`screenImageId`** / Bild-Pixelmaße | **Nur** Textur auf Label-Gruppe (Cover, Crop, Finish) |
| **`sizeScale`** (+ uniform Gizmo) | **Proportionale** Skalierung der **fertigen** Dose (Geometrie + Ring; UV-Band skaliert mit) |

**Verboten:** `heightM`, `diameterM`, Profil oder Orientierung der Entity aus Bild-Ratio ableiten; non-uniform Scale am Transform. **Platzhalter** ohne Bild: Unfold-Aspect des **aktiven Profils** — nicht 16:9.

**Engine:** `setAssetImage` / Bild-Picker → Material/UV-Update, **kein** `rebuildBeverageCanFromImageDimensions`. Optional Advanced-Panel: User darf mm manuell tweaken — unabhängig vom Bild.

---

**Category:** Assets — Beverage can  
**Title:** Mockup-Maßstab & Referenzkante  
**Description:** Im Gegensatz zu Smartphone/Print bewusst **real scale** (Dose ist im Viewport neben 0,16 m Screen-Höhe noch gut erkennbar). **`sizeScale`** (Default `1`, Range `0,05`–`5`) multipliziert **alle** mm/m-Maße proportional — **kein** Stretch; skaliert **immer die ganze Dose**, nie nur das Label.

| Referenzkante | Wert bei `sizeScale = 1` |
|---|---|
| **Gesamthöhe** | **0,1152 m** (Standard) bzw. **0,14605 m** (Sleek) |

**Außendurchmesser** skaliert mit: `diameterM = (Profil-Nenn) × sizeScale`. Panel **Size** / Gizmo-Uniform-Scale wie [`requirements-assets.md`](./requirements-assets.md); `setAssetSizeScale` ändert **nicht** `transform.position.y` (Bodenkontakt). **Profilwechsel** im Panel setzt Nennmaße + Platzhalter-Ratio neu (Geometrie-Rebuild) — **Bild bleibt** zugewiesen, Mapping passt sich dem neuen Band an.

---

**Category:** Assets — Beverage can  
**Title:** Koordinaten, Pivot & Placement  
**Description:** Lokal:

- **Y** = vertikal (Dosenachse), **+Y** nach oben
- **X / Z** = Durchmesser-Ebene; Mantel liegt auf Radius **r = diameterM / 2**

**Pivot:** **Mittelpunkt der Unterseite** der Dose (Kontaktpunkt mit Boden) bei **lokal (0, 0, 0)** — Achse der Dose durch **(0, y, 0)**. Beim Add/Drop: Unterseite auf Ground (+ optional `ASSET_SPAWN_BASE_Y`) — gleiches Muster wie Block / bildtragende Assets mit Bodenkontakt.

**Transform:** Move + Rotate + **uniform Scale** (`sizeScale` + Gizmo) → [`requirements-scene-placement.md`](./requirements-scene-placement.md). **Kein** non-uniform Scale am `transform`.

**Front / Etikett:** **+Z** = **Vorderseite der Dose** in Default-Spawn (Kamera/Portfolio). **Bildmitte = Front** — s. **Label-Bild — Front & UV**.

---

**Category:** Assets — Beverage can  
**Title:** Geometrie — Mesh-Stack (v1)  
**Description:** **Zwei oder drei** Meshes (ein `Group` pro Entity). Alle Längen × `sizeScale` beim Rebuild. **Kein** 202-Verschluss/Deckel-Mesh.

| # | Teil | Geometrie | Material | Bild |
|---|---|---|---|---|
| 1 | **Hülle — Blech** (`body`) | **`LatheGeometry`** aus **SVG-Profil** (volle Silhouette, eine Materialfläche) | `metalMaterialId` | — |
| 2 | **Label-Mantel** (`label`) | **Offener Mantel** (`buildOpenMantleGeometry`) zwischen `labelBottomOffsetM` und `heightM − topRingHeightM` — nur wenn **`screenImageId`** gesetzt | Bild-PBR + `imageSurfaces` | `screenImageId` |
| 3 | **Mantel-Endring** (`topRing`) | Parametrisch — siehe **Endring — Platzierung** | `metalMaterialId` | — |

**Label auf der Hülle:** Mit Bild fehlen die **Zylinder-Mantel-Dreiecke** in der Hülle (nur Schulter/Boden-Chime im **y**-Band bleiben Blech); der Label-Mantel schließt das Band (gleicher Radius). **Ohne Bild:** volle Hülle inkl. Band. UV/Mapping unverändert (zylindrisches Unfold, Front **+Z**).

**Label-UV:** Nur für die Label-Gruppe **zylindrisches Unfold** neu berechnen (Default-Lathe-UV **nicht** verwenden). Unfold-Aspect und Cover-Regeln gelten für diese UVs. **Mitte des Bildes** (`U = 0,5`) auf **lokal +Z**; Naht **U = 0 / 1** auf **−Z**; **V** über `labelY0…labelY1`; Cover-Crop **symmetrisch** um Bildzentrum. **Implementierung (horizontal):** `cylindricalLabelUv` in `src/engine/cylindrical-label-uv.ts` — `atan2(z,x)`, **U-Zentrum +Z**, danach **U spiegeln** (`1 − u`), damit flaches Artwork auf der **Außenseite** nicht spiegelverkehrt liest (geteilt mit **Tin can**).

**Ohne Bild / Label aus:** Label-Gruppe rendert mit **`metalMaterialId`** (blankes Alu im Band) — Geometrie bleibt.

**Mantel-SVG endet** an der **Oberkante des Zylinder-/Halsprofils** **unter** dem Endring — typisch bei **y = Gesamthöhe − 2,5 mm**, Radius = BOD/2 (Verschluss **nicht** zeichnen). Bodenkuppel, Standring und Neck sind **im SVG** enthalten.

**Lathe:** `Vector2(radius, y)` in **Metern** nach Import; Segmente z. B. **64–96**. Authoring → Abschnitt **SVG-Profil — Mantel** unten.

**Rebuild** bei: `canBodyProfile`, `screenImageId`, `sizeScale`, `beverageCanParams`, `imageSurfaces`, `metalMaterialId`, `geometryVisibility`.

**Referenz nur (kein Mesh v1):** Maße **202-Verschluss** (54 / 52,4 mm) bleiben in der Spec-Tabelle für spätere Erweiterung.

---

**Category:** Assets — Beverage can  
**Title:** SVG-Profil — Mantel (Authoring & Ablage)  
**Description:** Zwei Built-in-Dateien — **je ein `<path>`** pro Körperprofil. **Ablage:** Vite [`public/`](../../public/) (Runtime-URL unter Site-Root). Index → [`../can-profiles/README.md`](../can-profiles/README.md).

| Datei | URL | `canBodyProfile` | `viewBox` (Ist, Authoring) |
|---|---|---|---|
| [`lathe-y-can-330ml-classic.svg`](../../public/profiles/lathe/lathe-y-can-330ml-classic.svg) | `/profiles/lathe/lathe-y-can-330ml-classic.svg` | **`standard`** | `0 0 94.185 322.799` |
| [`lathe-y-can-330ml-sleek.svg`](../../public/profiles/lathe/lathe-y-can-330ml-sleek.svg) | `/profiles/lathe/lathe-y-can-330ml-sleek.svg` | **`sleek`** | `0 0 81.854 410.248` |

**Status:** Silhouetten **vom User geliefert** (2026-10-09). Referenz-Render: [`../images/330ml-standard.png`](../images/330ml-standard.png), [`../images/330ml-sleek.png`](../images/330ml-sleek.png).

**Zeichenregeln (Pflicht für künftige Revisionen):**

1. **Nur die rechte Halbseite** (Drehung um **Y**); **ein** Pfad pro Datei.
2. **Keine** Gruppen-`transform` — Geometrie im Pfad.
3. **Oberes Ende** ohne 202-Verschluss; **Endring 2,5 mm** nur im Code.
4. **Ziel-Norm:** **1 SVG-Einheit = 1 mm**, Pivot **Bodenmitte (0,0)**, **Y nach oben** — entspricht Engine-Pivot. **Ist-Exporte** können abweichen (anderes `viewBox`, **Y nach unten**, Start nicht auf der Achse) → Import **normalisiert** (Skalierung auf `heightM` / BOD, **Y spiegeln**, **Translation** auf Pivot unten).

**Import-Pipeline (Ziel, Engine):**

1. `SVGLoader` laden von `/profiles/lathe/lathe-y-can-330ml-classic.svg` bzw. `/profiles/lathe/lathe-y-can-330ml-sleek.svg` (Profilwechsel).
2. Ersten Pfad → `createShapes` → `getPoints(n)` (n TBD, glatte Kurven).
3. **Normalisieren** zu `Vector2(radiusM, yM)` mit **y = 0** am Bodenkontakt, **x = 0** an der Achse, Gesamthöhe ≈ `heightM` (115,2 / 146,05 m).
4. `LatheGeometry(points, segments)`; danach Bounding-Check vs. Doc-Maße (`diameterM`, `bottomStandDiameterM`, Label-Zone 5 mm / 2,5 mm).
5. Modul-Ziel: `src/engine/beverage-can-geometry.ts` (TBD). Label-Unfold bleibt [`beverage-can-label-unfold.ts`](../../src/engine/beverage-can-label-unfold.ts).

**Endring-SVG:** **nicht** v1 — parametrischer Ring (2,5 × 1,5 mm).

---

**Category:** Assets — Beverage can  
**Title:** Label-Bild — kein Stretch (Pflicht)  
**Description:** Regel projektweit → `.cursor/rules/image-aspect-ratio.mdc`, [`requirements-images.md`](./requirements-images.md). Textur **nur** auf der **Label-Material-Gruppe** des Lathe-Mantels (zylindrisches Band) zwischen **5 mm** Boden-Alu und **2,5 mm** Endring — **nicht** auf Kuppel, Neck, Boden-Chime oder Endring.

**Ziel-Unfold (einmal rum, Landscape):** Breite = **Umfang**, Höhe = **Label-Band** (**Standard ≈ 1,9252 : 1**, **Sleek ≈ 1,3015 : 1** — s. **Bildformat**).

| Situation | Verhalten (v1) |
|---|---|
| **Ratio passt** (Design-Unfold / `imageMatchesLabelUnfoldAspect`) | Bild füllt das Band **einmal** über **360°** — „rumherum“ ohne Naht-Sprung, **kein** Stretch. |
| **Ratio passt nicht** (z. B. **Hochformat**, zu schmal, zu breit) | **`object-fit: cover`-Logik** im **UV-Raum** des Bands: Bild so skaliert (**uniform**), dass die Fläche **bedeckt** ist; **überstehende Teile werden abgeschnitten** (Crop), **nicht** gestreckt, **nicht** gekachelt/repeated. |
| **Zu breit** (würde horizontal „überlappen“) | Kein doppeltes Wrap — Überschuss an den **Seiten** der UV-Map **clippen** (eine Umfangsrunde = **U 0…1**). |
| **Hochformat** | Bedeckt typischerweise nur einen **Teil** der sichtbaren Bandfläche sinnvoll; Rest wird per **Cover** oben/unten (oder seitlich, je nach Ratio) **weggeschnitten** — **kein** Letterbox mit leerem Blech in v1 (dafür müsste **Contain** — bewusst **nicht** Default). |

**Ohne Bild:** neutraler Platzhalter auf dem Band; Platzhalter-Ratio = Unfold des Profils.

---

**Category:** Assets — Beverage can  
**Title:** Label-Bild — Front & UV (Pflicht)  
**Description:** Die **horizontale Mitte** des zugewiesenen Bildes (Pixel-/Design-Mitte) muss auf der **Vorderseite** der Dose liegen — **lokal +Z**, Default-Blickrichtung beim Platzieren.

| Mapping | Regel |
|---|---|
| **Bildmitte ↔ Front** | Textur-**U = 0,5** (horizontal) auf Mantelpunkt mit **θ = 0°** bzw. **+Z**; Logo/Hauptmotiv in der Datei **zentriert** → erscheint frontal. |
| **Naht** | **U = 0** und **U = 1** treffen auf **−Z** (hinten) — typisch unsichtbar im Hero-Shot. |
| **Cover-Crop** | Zuschneiden **symmetrisch** um **Bildzentrum** (nicht um eine Ecke), damit die Front nach Crop noch die Mitte des Motivs trägt. |
| **Entity-Rotation** | User dreht die ganze Dose per Gizmo — UV bleibt am Mesh kleben; Front ist dann die neue Weltrichtung von **+Z** lokal. |

**Design-Hinweis:** Druck-Datei oft mit Motiv zentriert auf Unfold-Breite; bei Abweichung vom Ziel-Aspect trotzdem **Mitte = Front** in der Engine, nicht „linker Bildrand = Front“.

**Nicht v1:** Checkbox **Override / Allow distortion** (Stretch), **Contain** (Letterbox), manuelles **U/V-Offset** des Labels auf dem Band.

**Kein image-driven sizing** — s. **Dosenformat vs. Bild**; `screenImageId` ändert **nicht** `heightM` / BOD / Profil.

---

**Category:** Assets — Beverage can  
**Title:** Parameter — `beverageCanParams` (Panel)  
**Description:** Maße in **Metern** (UI **4 Dezimalstellen**), Bandhöhe/Offsets alternativ in **mm** (UI mm mit 1 Dezimalstelle) — einheitlich mit Block/Handheld.

| Parameter | Default | UI | Hinweis |
|---|---|---|---|
| `canBodyProfile` | **`standard`** | Body profile | `standard` \| `sleek` — lädt Nennmaße |
| `heightM` | **0,1152** / **0,14605** | Height (m) | Gesamthöhe geschlossene Dose |
| `neckLengthM` | **0,01834** / **0,0105** | Neck length (m) | Verjüngung oben |
| `bottomDomeInsetM` | **0,0035** / **0,0040** | Bottom dome inset (m) | Bodenkuppel-Einzug |
| `diameterM` | **profilabhängig** | Diameter (m) | Körper-Außendurchmesser (BOD) |
| `bottomStandDiameterM` | **0,04732** / **0,04724** | Bottom stand diameter (m) | Standring-Kontakt unten |
| `labelHeightM` | **profilabhängig** (abgeleitet) | Label height (m) | `height − 5 mm − 2,5 mm` |
| `labelBottomOffsetM` | **0,0050** | Label offset from bottom (m) | Boden-Alu **5 mm** |
| `bottomMetalBandM` | **0,0050** | Bottom metal band (m) | Gemeinsam beide Profile |
| `topRingHeightM` | **0,0025** | Top ring height (m) | Gemeinsam beide Profile |
| `topRingThicknessM` | **0,0015** | Top ring thickness (m) | Radial / Querschnitt |
| `closureOuterDiameterM` | **0,0540** | *(read-only Referenz)* | Kein Mesh v1 |
| `closureInnerDiameterM` | **0,0524** | *(read-only Referenz)* | Kein Mesh v1 |

**Clamps (Ziel):** `heightM` **0,05–0,30**; `diameterM` **0,04–0,10**; `labelHeightM` + `labelBottomOffsetM` + `topRingHeightM` ≤ `heightM`; `labelHeightM` ≥ **0,02 m**.

**v1:** Nur **330 ml** in **Standard** und **Sleek** — keine 355 ml / Slim-53-mm-Presets.

---

**Category:** Assets — Beverage can  
**Title:** Material-Slots  
**Description:**

| Slot | Default | Bedeutung |
|---|---|---|
| `metalMaterialId` | **Aluminum Brushed** (`material-aluminium-brushed`) | Lathe-Gruppe `body`, Endring, Label-Gruppe wenn kein Bild / Label ausgeblendet |
| *(Label)* | Bild-PBR via `imageSurfaces` / Finish | Lathe-Gruppe `label` auf dem Mantel-Band; kein separates `labelMaterialId` in v1 — Finish Matt/Glossy wie Handheld |

Dropdown: alle Material-Presets erlaubt; Metall-Slots typisch **Chrome**, **Aluminum Brushed**, **Plastic Smooth** (für lackierte Dosen später).

---

**Category:** Assets — Beverage can  
**Title:** Schatten  
**Description:** Alle Meshes der Dose: **`castShadow`** und **`receiveShadow`** — Pflicht → [`requirements-shadows.md`](./requirements-shadows.md). Nach Rebuild: `applyAssetShadowFlags`. Dünne Scheiben (Boden/Deckel): `shadowSide = DoubleSide` wie Print-Screen.

---

**Category:** Assets — Beverage can  
**Title:** Endring — Platzierung & Form (v1)  
**Description:** Separates Mesh **`topRing`**, gleiches `metalMaterialId` wie Mantel. Maße aus `topRingHeightM` / `topRingThicknessM` (× `sizeScale`).

| | Nenn (scale 1) |
|---|---|
| **Vertikal** | **y ∈ [heightM − topRingHeightM, heightM]** — oberste **2,5 mm** der Dose |
| **Radial** | Außenmantel des Rings beginnt bei **r = diameterM / 2** (BOD); Ring steht **nach außen** um **topRingThicknessM** (**1,5 mm**) — Außenradius **r_out = BOD/2 + 1,5 mm** |
| **Querschnitt** | Rechteck **2,5 × 1,5 mm** (H × radial), **Ecken gerundet** — Fillet-Radius **0,3 mm** (Nenn, × `sizeScale`) bis Implementierung verfeinert |
| **Label** | Endet bei **y = heightM − topRingHeightM** — kein Überlap mit Ring |

**Sichtbarkeit:** `geometryVisibility.topRing` (Default **an**). Aus → nur Mantel + Label, Ring nicht gerendert.

---

**Category:** Assets — Beverage can  
**Title:** Geometries Panel (Szene)  
**Description:** Right Sub bei selektierter `beverage-can`-Entity: Sektion **„Geometries“** — wie Picture / Handheld → [`requirements-assets-picture-framed.md`](./requirements-assets-picture-framed.md): pro Teil **`GeometryPartField`** = **Checkbox** (Sichtbarkeit) + optional **Material** nur wo sinnvoll.

| Teil (`geometryVisibility` Key) | UI-Label | Checkbox | Material-Dropdown |
|---|---|---|---|
| `body` | Body (metal) | ja | **nein** — global **Metal** oben |
| `topRing` | Top ring | ja | **nein** |
| `label` | Label (print) | ja | **nein** — Finish über **Label / Image** |

**Screen / Image:** eigene Sektion **`ImageSurfaceFields`** (`screenImageId`, Finish, Emissive, Passepartout **nein** in v1). Face-Id `imageSurfaces`: **`label`** (Material-Gruppe am Lathe-Mesh).

**Sichtbarkeit `label`:** Aus → Label-Gruppe nutzt **`metalMaterialId`** (unbedrucktes Band); **ein** Lathe-Mesh bleibt. **`body` aus** → nur Blech-Dreiecke der Gruppe `body` unsichtbar (Label + Ring unabhängig). **`topRing`** → separates Mesh wie bisher.

**Datenmodell:** `AssetEntity.geometryVisibility`: `{ body?, topRing?, label? }` — Default **alle `true`**. API: `setGeometryVisible(entityId, part, visible)` → Rebuild. Serialisierung mit Entity → [`requirements-scenes.md`](./requirements-scenes.md).

**Rebuild** bei Sichtbarkeits-Toggle — kein UI-only Hide.

---

**Category:** Assets — Beverage can  
**Title:** Szene-Panel (Ist)  
**Description:** Label / Image → Geometries → Body profile → Materials → Footer **Dimensions** (Size + gekoppeltes W/H) → **Position**. Kein Transform-Block. Advanced mm (Höhe/Durchmesser) im Panel **nicht** in v1 — nur `sizeScale` + Footprint.

---

**Category:** Assets — Beverage can  
**Title:** Implementierung — Inventur & offene TBD (vor Code-Start)  
**Description:** Checkliste gegen bestehenden Stack (`asset-meshes`, `EntityRegistry`, Katalog, `ImageSurfaceFields`, `beverage-can-label-unfold.ts`). **Bereit:** Maße, Label-Unfold, Cover/Front-UV, Mesh-Stack, SVG-Pfade, Ring-Maße, Geometries-UI-Muster.

| Bereich | Status |
|---|---|
| Requirements / Maße / Bildformat | **doc** |
| Label-Unfold-Rechner | **Code** (`beverage-can-label-unfold.ts`) |
| SVG-Profile | **Dateien** `public/profiles/lathe/lathe-y-can-330ml-classic.svg`, `lathe-y-can-330ml-sleek.svg` — Normalisierung Engine ✓ |
| `beverage-can-geometry.ts` (SVG→Lathe, Gruppen body/label, zyl. UV + Cover, Ring) | **fehlt** |
| Katalog `assetKind: beverage-can`, `addAsset`, Rebuild-Pfad in `asset-meshes` | **fehlt** |
| `geometryVisibility` + Panel Geometries | **doc** — Pattern aus Picture kopieren |
| Label auf Oberfläche | **fest** — **ein** Lathe-Mesh, **kein** Epsilon (nicht Handheld-Screen-Stack) |
| Spawn-Position (Drop) | **TBD** — wie andere Assets (Raycast Mitte / Boden) |
| Profilwechsel | SVG neu laden + `beverageCanParams`-Defaults + Label-Platzhalter-Ratio |
| Selection / Outline / Pick auf Label-Band | **TBD** — `userData` Material-Gruppe / `assetMeshRole` auf Lathe-Child |
| Scene Save / `beverageCanParams` serialisieren | **doc** Entity-Block — Migration nicht nötig (neu) |
| Advanced mm-Params im Panel | **optional v1** — Defaults reichen für ersten Wurf |
| BOD **66,0** vs. **66,10** mm | **TBD** — ein Nennwert + SVG-Skalierung abstimmen |
| Katalog-Eintrag in `requirements-assets.md` Built-in-Liste | **fehlt** (kleiner Doc-Nachtrag) |

**Nicht blockierend für Start:** Verschluss-Maße, Pull-Tab, Drag-Image→Viewport, Passepartout.

---

**Category:** Assets — Beverage can  
**Title:** Entity-Felder & Scene-API (Ziel)  
**Description:**

```typescript
type BeverageCanBodyProfile = 'standard' | 'sleek';

type BeverageCanParams = {
  canBodyProfile: BeverageCanBodyProfile;
  heightM: number;
  neckLengthM: number;
  bottomDomeInsetM: number;
  diameterM: number;
  bottomStandDiameterM: number;
  labelHeightM: number;
  labelBottomOffsetM: number;
  bottomMetalBandM: number;
  topRingHeightM: number;
  topRingThicknessM: number;
  /** Reference only until closure mesh — optional on entity */
  closureOuterDiameterM?: number;
  closureInnerDiameterM?: number;
};

// AssetEntity (Auszug)
// assetKind: 'beverage-can'
// screenImageId?: string | null
// sizeScale?: number
// beverageCanParams?: BeverageCanParams
// metalMaterialId?: string
// geometryVisibility?: { body?: boolean; topRing?: boolean; label?: boolean }
// imageSurfaces?: Partial<Record<'label', ImageSurfaceSettings>>
```

- `addAsset('beverage-can', spawn?)`
- `setBeverageCanParams(entityId, partial)`
- `setGeometryVisible(entityId, 'body' | 'topRing' | 'label', visible)`
- `setAssetImage` / `setAssetSizeScale` / `setEntityMaterial` (metal slot) wie global

Serialisierung mit Scene Save → [`requirements-architecture.md`](./requirements-architecture.md).

---

**Category:** Assets — Beverage can  
**Title:** Später (nicht v1)  
**Description:** **202-Verschluss / Deckel**-Mesh (54 / 52,4 mm); Pull-Tab + Öffnung; **355 ml**; **Slim can** (Ø 53 mm); User-upload SVG-Profil; Endring als SVG statt Parametrik; Kondenswasser; Physik (Rollen); **Drag Image → Label**; Solid-Farbe statt Bild auf dem Band.

---

**Category:** Assets — Beverage can  
**Title:** Label band & unfold (2026-10 — Produktklarstellung)  
**Description:** **Boden:** **5 mm** unbedrucktes Alu (`labelBottomOffsetM`). **Oben:** Bild auf dem **Lathe-Mantel** bis **Oberkante SVG** (`y = heightM − topRingHeightM`), inkl. **Schulter/Neck** — **keine** zusätzliche 2,5-mm-**Mantel**-Reserve unter dem Endring. **Endring** (`topRing`, 2,5 mm) bleibt separates Alu-Mesh darüber. **Unfold-Höhe** (flat artwork / Cover-Aspect): `canHeight − 5 mm` (nicht `− 7,5 mm`). **UV:** zylindrisches Unfold **nur** auf Label-Material-Gruppe; **body**-Blech behält Lathe-UV (gebürstetes `metalMaterialId`). **Ohne `screenImageId`:** gesamter Mantel **ein** Metall-Material, **keine** Label-Gruppe.

---

**Category:** Assets — Beverage can  
**Title:** Engine — pivot, vertex-split label UV (2026-10)  
**Description:** **Pivot:** Nach `LatheGeometry` → `translate` so **`boundingBox.min.y = 0`** (Fuß der Dose). **Endring-Mesh** lokal `y ∈ [0, topRingHeightM]`, **`mesh.position.y = heightM − topRingHeightM`**. **Label vs. body:** Material-Gruppen auf **duplizierten Vertices** (pro Dreieck neue Vertices; **kein** Index-Sharing zwischen Gruppen). Body: Lathe-UV; Label: **`cylindricalLabelUv`**, **`v`** über **`labelY0…labelY1`**. **Rendering-Cover:** `planeW = π×BOD`, **`planeH = labelY1 − labelY0`** (nicht nur Unfold-Briefhöhe). **`createCanLabelMaterial`:** Height-fit Shader (`fitHeightLabelColorNode`), **`metalness = 0`**; **PNG-Alpha** → Metall-Underlay im Shader (opaque, kein Loch in der Dose) → [`requirements-images.md`](./requirements-images.md).

---

**Category:** Assets — Beverage can  
**Title:** Label mapping — height-fit (2026-10)  
**Description:** Viewport-Textur am **bedruckbaren Band** (`planeH = labelY1 − labelY0`, `planeW = π×BOD`). **Vertikal:** Band-`v` 0…1 = Bildhöhe 0…1 (**kein** vertikaler Crop/Stretch). **Horizontal:** Breite aus Bild-Aspect × `planeH`; **Ratio passt** (`imageMatchesPrintableBandAspect`) → ein Umfang (u 0…1). **Schmaler:** volle Höhe, **Metall** seitlich. **Breiter:** volle Höhe, **horizontaler** Texture-Clip (`s` clamp). **Kein** 2D-`cover`. **„Richtiges Format“** = Aspect des **printable band**, nicht Unfold-Brief (`canHeight − 5 mm`). Code: `fitHeightLabelColorNode`, `computeLabelPrintableBandMm`.
