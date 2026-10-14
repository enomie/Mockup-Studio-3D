# Assets — Pen (Marker & Fountain pen)

Parametrischer **Stift**-Baustein — **Cap**, **Ring** und **Schaft (body)** aus **SVG-Profil → Lathe**; **Schaft-Bild** (Branding, Muster) aus der **Images-Bibliothek** → [`requirements-images.md`](./requirements-images.md). Katalog, Entity-Modell, Drop/Add → [`requirements-assets.md`](./requirements-assets.md). Bild-Flächen → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md). Material-Slots → [`requirements-materials.md`](./requirements-materials.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md). Uniform Scale → [`requirements-gimbals.md`](./requirements-gimbals.md).

**Abgrenzung:** Keine Getränkedose (zylindrisches Label-Band) → [`requirements-assets-beverage-can.md`](./requirements-assets-beverage-can.md). Kein `print`-Prisma, keine Flasche. **Block**, **Picture framed** → eigene Docs. Marken-Druck = User-Bilder.

**Status:** **v1 fertig** — Katalog, Szene-Entity, Engine-Rebuild, Body-Wrap (90°-Mapping, PNG-Underlay, Orientierung Kappe links). Code: [`asset-pen.ts`](../../src/scene/asset-pen.ts), [`pen-svg-profile.ts`](../../src/engine/pen-svg-profile.ts), [`pen-geometry.ts`](../../src/engine/pen-geometry.ts), [`pen-body-wrap-unfold.ts`](../../src/engine/pen-body-wrap-unfold.ts), [`material-resolver.ts`](../../src/engine/material-resolver.ts) (`createPenBodyWrapMaterial`), [`populate-packaging.ts`](../../src/engine/asset-meshes/populate-packaging.ts) (`populatePenGroup`), [`PenFields.tsx`](../../src/ui/panels/entity-fields/PenFields.tsx). SVGs: [`profiles/lathe/pen-marker.svg`](../../public/profiles/lathe/pen-marker.svg), [`pen-fountain.svg`](../../public/profiles/lathe/pen-fountain.svg).

**v1-Scope:** Ein Built-in **`pen`**; **zwei Körperprofile** (**Marker**, **Fountain pen**); **real scale** (Nennmaß über **max. Außenradius**); **Stiftformat fix** — Bild bestimmt **nicht** Länge oder Profil (analog Dose → [`requirements-assets.md`](./requirements-assets.md)); **drei Lathe-Teile** pro Profil (Cap, Ring, Body); **Bild nur auf Body**; **Material + Farbe** pro Teil (`cap` / `ring` / `body`); **`sizeScale`** uniform auf **gesamten** Stift; Szene-Panel **Geometries**; **kein** Clip-Mechanismus, **keine** Feder-Spitze als separates Mechanik-Mesh in v1.

---

**Category:** Assets — Pen  
**Title:** Identität & Katalog  
**Description:** Built-in Baustein, nicht löschbar.

| `assetKind` | UI-Label | Kategorie |
|---|---|---|
| `pen` | Pen | **Objects** |

Stabile Katalog-ID über `kind`. Mehrfach-Instanzen unbegrenzt. Default-Szene: **keine** Pflicht-Instanz.

**Profil-Parameter:** `penBodyProfile: 'marker' | 'fountain'`.

**Katalog-UI:** Ein Katalog-Eintrag **`pen`**; Profil-Umschaltung im **Szene-Sub-Panel** (`PenFields` → Body profile).

---

**Category:** Assets — Pen  
**Title:** Fachbegriffe — zwei Profile  
**Description:** Zwei Built-in-Silhouetten, gleiche Teile-Logik, unterschiedliche SVG-Pfade.

| Profil-ID | Deutsch (Mockup) | Englisch | Kurz |
|---|---|---|---|
| `marker` | **Marker**, Filzstift, Permanentmarker | **Marker**, **felt-tip pen** | kurze Kappe, breiterer Schaft, Spitze unten im Body-Pfad |
| `fountain` | **Füllfeder**, Fountain pen | **Fountain pen** | längere Kappe / Kolben oben, Ring weiter unten am Schaft |

**Hinweis:** Kugelschreiber (**ballpoint**) mit Klickmechanik — **nicht** v1 (eigenes Profil später möglich).

---

**Category:** Assets — Pen  
**Title:** Gemeinsame Nennmaße & Skalierung  
**Description:** Beide Profile nutzen **dieselbe** SVG-`viewBox`-Höhe zum Authoring (`0 0 28.35 566.93`); **Maßstab** einheitlich über **max. Außenradius** im Profil (größtes **X** über alle drei Pfade nach Import, Achse **X = 0**).

| Maß | Wert (v1) | Hinweis |
|---|---|---|
| **`maxRadiusM`** | **0,0065 m** (6,5 mm) | User-stellbar; skaliert **Cap, Ring, Body** gemeinsam; Default = **Mantel-Außen-Ø 13,0 mm** (typ. Permanentmarker) |
| **Gesamthöhe** | **≈ 0,1412 m** (141 mm) bei Default | **Abgeleitet:** `heightM = (svgHeight / svgMaxRadius) × maxRadiusM` mit `svgHeight = 566.93`, **`svgMaxRadius = 26.09`** (Ring-Pfad, breitester Querschnitt) |
| **Pivot** | **Spitze / unterer Kontakt** unten, `y = 0` | Wie Block / Beverage can — Body-Pfad endet unten auf der Achse |

**Authoring-Einheiten vs. Meter:** Zeichnung mit **Achse X = 0** (Stiftmitte). Zahlen in `viewBox` / Pfaden sind **Illustrator-Authoring-Einheiten** — **kein** 1:1 „eine SVG-Einheit = eine Engine-mm“. Import mappt **`max(profileMaxX) → maxRadiusM`** (wie Beverage can); `viewBox`-Höhe **566,93** ist **nicht** die Körperlänge in Metern vor Skalierung.

**Einheiten im Code:** Meter + `sizeScale`; mm nur in Tabellen / UI.

**`sizeScale`:** Multipliziert **`maxRadiusM`** und damit **alle** abgeleiteten Längen proportional — **kein** Stretch; **kein** separates Skalieren von Cap vs. Body.

**Profilwechsel:** SVG neu laden, Geometrie-Rebuild, Platzhalter-Ratio des Body-Wraps neu — **Bild bleibt** zugewiesen, UV passt sich an.

---

**Category:** Assets — Pen  
**Title:** Stiftformat vs. Bild — keine Image-driven sizing (Pflicht)  
**Description:** Abweichung vom Default in [`requirements-assets.md`](./requirements-assets.md) (**Image-driven sizing**). Für `pen` gilt:

| Quelle | Steuert |
|---|---|
| **`penBodyProfile`**, **`penParams`** (`maxRadiusM`, …), SVG-Profil | Gesamthöhe, Radien, Cap/Ring/Body-Geometrie |
| **`screenImageId`** / Bild-Pixelmaße | **Nur** Textur auf **Body**-Mesh (Cover, Crop, Finish) |
| **`sizeScale`** (+ uniform Gizmo) | **Proportionale** Skalierung des **fertigen** Stifts |

**Verboten:** `heightM`, `maxRadiusM` oder Profil aus Bild-Ratio ableiten; non-uniform Scale am Transform. **Platzhalter** ohne Bild: Aspect des **Body-Wrap-Unfolds** des aktiven Profils — **nicht** 16:9.

---

**Category:** Assets — Pen  
**Title:** Koordinaten, Pivot & Placement  
**Description:** Lokal:

- **Y** = Stiftachse, **+Y** nach oben (Kappe oben)
- **X / Z** = Querschnitt; Profil liegt in der **X–Y**-Ebene, Lathe um **Y**

**Pivot:** **Unterer Endpunkt** des Stifts (Schreibspitze / Body-Spitze auf der Achse) bei **lokal (0, 0, 0)**. Beim Add/Drop: Kontakt auf Ground (+ optional `ASSET_SPAWN_BASE_Y`).

**Transform:** Move + Rotate + **uniform Scale** → [`requirements-scene-placement.md`](./requirements-scene-placement.md).

**Front / Branding:** **+Z** = **Vorderseite** in Default-Spawn. **Bildmitte = Front** auf dem Body-Wrap (analog Dose) — s. **Body-Bild — Front & UV**.

---

**Category:** Assets — Pen  
**Title:** SVG — drei Pfade pro Profil (Authoring)  
**Description:** Pro Profil **eine** Datei unter [`public/profiles/lathe/`](../../public/profiles/lathe/) — **drei** offene Pfade (`fill: none`, **Stroke**), **keine** Gruppen-`transform` auf der Geometrie. **Drehachse:** linke Kante **X = 0** (Pfad startet typisch mit `M0,…`).

| Datei | URL | `penBodyProfile` |
|---|---|---|
| [`pen-marker.svg`](../../public/profiles/lathe/pen-marker.svg) | `/profiles/lathe/pen-marker.svg` | **`marker`** |
| [`pen-fountain.svg`](../../public/profiles/lathe/pen-fountain.svg) | `/profiles/lathe/pen-fountain.svg` | **`fountain`** |

**Gemeinsame `viewBox`:** `0 0 28.35 566.93` (Authoring-Koordinaten; Import **normalisiert** auf `maxRadiusM` + Fuß-Pivot).

### Teil-Zuordnung (Pflicht) — Stroke-Farbe

| Teil | Stroke (Pflicht) | `cls-n` in beiden SVGs (Authoring) |
|---|---|---|
| **Cap** (`cap`) | **#ff0000** | `cls-1` |
| **Ring** (`ring`) | **#00ff00** | `cls-2` |
| **Body** (`penBody`) | **#0000ff** | `cls-3` |

**Engine:** Pfad → Teil anhand **exakter** Stroke-Hex (Tabelle oben). Optional später: `data-pen-part="cap|ring|penBody"` am `<path>` zusätzlich.

**Zeichenregeln (Pflicht für Revisionen):**

1. **Nur rechte Halbseite** (Lathe um **Y**); **ein Pfad pro Teil**.
2. **Cap** = oberes Segment (Kappe); **Ring** = schmales Band (oft Rechteck im Profil); **Body** = Schaft inkl. Spitze unten — **ohne** Cap- und Ring-Geometrie duplizieren (keine Überlappung nötig; kleine Y-Überlappung an Soll-Grenzen ist ok, Meshes sind getrennt).
3. **Kein** Fill; Stroke-Kontur = Außenkontur des gedrehten Teils (wie Dosen-Silhouette).
4. **Y-Achse:** Authoring oft **Y nach unten** (Illustrator) → Import **spiegelt** zu Engine (**Y nach oben**, Fuß bei `y = 0`) wie bei Beverage can / Wine bottle.

### Profil-Unterschiede (Ist-SVG)

| | **marker** | **fountain** |
|---|---|---|
| **Ring — Y-Lage** (groß) | ~**56,8** … **65,4** (SVG-Einheiten) | ~**216,8** … **225,4** |
| **Cap** | kürzer, breiterer Schulterblock oben | längere Kappe / Griffkolben oben |
| **Body** | langer gerader Schaft + Spitze | Schaft mit längerem oberen Abschnitt vor Ring |

---

**Category:** Assets — Pen  
**Title:** Geometrie — Mesh-Stack (v1)  
**Description:** **Drei** Meshes (ein `Group` pro Entity). Alle Längen aus normalisiertem SVG × `maxRadiusM` × `sizeScale`.

| # | Teil-ID | Geometrie | Material | Bild |
|---|---|---|---|---|
| 1 | **`cap`** | `LatheGeometry` aus **Cap-Pfad** | `capMaterialId` | — |
| 2 | **`ring`** | `LatheGeometry` aus **Ring-Pfad** | `ringMaterialId` | — |
| 3 | **`penBody`** | `LatheGeometry` aus **Body-Pfad** | `bodyMaterialId` + Bild-PBR | `screenImageId` |

**Lathe:** `Vector2(radius, y)` in Metern; **80** Segmente; Naht → [`lathe-asset-common.ts`](../../src/engine/lathe-asset-common.ts) (`LATHE_SEAM_PHI_START`, `weldLathePhiSeam`).

**Mit Bild:** Body-UV = [`cylindricalLabelUv`](../../src/engine/cylindrical-label-uv.ts) über Body-Y-Spanne (`penBodyYBounds`).

**Ohne Bild:** Body rendert mit **`bodyMaterialId`** allein (einheitliche Farbe / PBR) — Geometrie bleibt.

**Rebuild** bei: `penBodyProfile`, `screenImageId`, `sizeScale`, `penParams`, `imageSurfaces`, `capMaterialId`, `ringMaterialId`, `bodyMaterialId`, `geometryVisibility` → [`asset-system-rebuild.ts`](../../src/engine/asset-system-rebuild.ts) (`rebuildPen`).

---

**Category:** Assets — Pen  
**Title:** Body-Bild — Wrap vs. Dosen-Label („anders rum“)  
**Description:** **Beverage can:** flaches Label = **einmal Umfang** (Breite) × **Bandhöhe** auf einem **zylindrischen** Mantelstück — Landscape-Unfold, UV **nicht** die Default-Lathe-UV der ganzen Dose.

**Pen body:** Bild liegt auf dem **variablen Radius** des **Body-Lathe** (konisch / stufenförmig wie im blauen Pfad). Wrap = **360° um die Achse** über die **gesamte Y-Spanne des Body-Pfads** (Spitze bis Anschluss an Ring).

| | **Dose (Label)** | **Pen (Body)** |
|---|---|---|
| **Träger** | oft separates Mantel-Mesh (Band) | **Body-Lathe-Mesh** |
| **V-Richtung** | vertikal am Zylinder (Bandhöhe) | entlang **Stiftlänge** (Body-Profil-Y) |
| **U-Richtung** | ein Umlauf = 360° | ein Umlauf = 360° |
| **Radius** | konstant (BOD) im Band | **r(y)** aus Profil |
| **Unfold-Aspect** | π×BOD × labelHeight | aus **Body-Profil** abgeleitet (s. unten) |

**Unfold (Ist):** `penBodyWrapCoverPlaneM` — `planeH` = Body-Y-Spanne; `planeW` = `2π × maxBodyRadiusM` (max **X** nur am Body-Pfad). Platzhalter-Aspect: `penBodyWrapAspectNominal(maxRadiusM)` (nominaler Body-Radius ≈ `maxRadiusM × PEN_NOMINAL_BODY_RADIUS_RATIO`).

**Textur-Achsen (90° zur Dose):** Mesh-**U** → Textur-**t** (Bild**höhe** = Umfang); Mesh-**V** → Textur-**s** (Bild**breite** = Schaftlänge). Cover-Spans: `penWrapCircumferenceSpan` / `penWrapBodyLengthSpan`; Shader [`fitPenBodyWrapColorNode`](../../src/engine/material-resolver.ts). Umlauf-Spiegelung + **180°**-Rotation (`rotatePenWrapTextureSt180`) für lesbare Front und **Kappe links** im Motiv — s. **Body-Bild — Front & UV**.

**PNG-Alpha:** Transparente Pixel → **Body-Material-Farbe** (`bodyMaterialId`-Preset), **deckend** — **`createPenBodyWrapMaterial`** (wie Dosen-`createCanLabelMaterial`, Underlay = Plastik statt Alu).

**Kein** separates Mantel-Mesh — Textur auf Body-Lathe mit zylindrischen UVs (konischer Radius im Profil; Cover-Plane nutzt max Body-Radius).

---

**Category:** Assets — Pen  
**Title:** Body-Bild — kein Stretch (Pflicht)  
**Description:** Regel projektweit → `.cursor/rules/image-aspect-ratio.mdc`, [`requirements-images.md`](./requirements-images.md). Textur **nur** auf **`penBody`** — **nicht** auf Cap oder Ring.

| Situation | Verhalten (v1) |
|---|---|
| **Ratio passt** (Body-Wrap-Unfold / Toleranzfunktion) | Bild bedeckt Body **einmal** über **360°** und volle Body-Länge — **kein** Stretch. |
| **Ratio passt nicht** | **Cover** im UV-Raum: uniform skalieren, überstehendes **croppen** — **kein** Letterbox-Default, **kein** Repeat. |
| **Ohne Bild** | Neutraler Platzhalter; Ratio = Unfold des Profils. |

---

**Category:** Assets — Pen  
**Title:** Body-Bild — Front & UV (Pflicht)  
**Description:** **Horizontale Bildmitte** auf **lokal +Z** (Default-Front), wie Beverage can.

| Mapping | Regel |
|---|---|
| **Bildmitte ↔ Front** | **U = 0,5** auf Mantelpunkt **+Z** |
| **Naht** | **U = 0 / 1** auf **−Z** |
| **Kappe ↔ Bild** | **+Y (Kappe)** → **linke** Bildseite (Textur **180°** vs. nacktes Unfold) |
| **Cover-Crop** | Symmetrisch um **Bildzentrum** |

**Nicht v1:** Override Stretch, Contain, manuelles U/V-Offset.

---

**Category:** Assets — Pen  
**Title:** Materialien & Farbe  
**Description:** Drei unabhängige Material-Slots — User kann pro Teil Preset + Farbe wählen (wie Geometries/Materials bei anderen Props).

| Slot | Entity-Feld | Bild |
|---|---|---|
| Cap | `capMaterialId` | — |
| Ring | `ringMaterialId` | — |
| Body | `bodyMaterialId` | `screenImageId` (Albedo); Finish über `imageSurfaces.label` |

**Body mit Bild:** Albedo + Finish aus Image-Surface; **PNG-Löcher** zeigen **`bodyMaterialId`-Farbe** im Shader (kein separates Tint auf gedruckten Pixeln in v1).

---

**Category:** Assets — Pen  
**Title:** Parameter — `penParams` (Panel)  
**Description:** Maße in **Metern** (UI **4 Dezimalstellen**).

| Parameter | Default | UI | Hinweis |
|---|---|---|---|
| `penBodyProfile` | **`marker`** | Body profile | `marker` \| `fountain` |
| `maxRadiusM` | **0,0065** | Max radius (m) | Größter Außenradius im Profil (Default = Ø 13 mm Mantel); skaliert Höhe mit |
| `heightM` | **abgeleitet** (read-only UI optional) | Height (m) | `≈ 0,1412` bei Default-Radius |

Weitere mm-Feinjustierung **einzelner** Teile **nicht** v1 (nur SVG-Revision oder `maxRadiusM`).

---

**Category:** Assets — Pen  
**Title:** Szene-Panel — Geometries  
**Description:** Right Sub bei selektierter `pen`-Entity: Sektion **„Geometries“** — pro Teil **`GeometryPartField`**: Checkbox (Sichtbarkeit) + **Material** (`cap`, `ring`, `penBody`).

**Bild:** `screenImageId` + Image-Surface-Felder am Body (wie Dose/Flasche) — nur **`penBody`**.

---

**Category:** Assets — Pen  
**Title:** Physik  
**Description:** **Kein** Rapier-/Dynamic-Default in v1 — Stift = **Fixed** Prop (wie Wine bottle). Später optional leichtes Dynamic für Stilleben — **nicht** v1.

---

**Category:** Assets — Pen  
**Title:** Implementierung (v1 abgeschlossen)  
**Description:** Lieferumfang gegen Code-Stand.

| Baustein | Status |
|---|---|
| SVG `pen-marker.svg`, `pen-fountain.svg` | ✓ |
| `pen-svg-profile.ts` (Stroke → Cap/Ring/Body) | ✓ |
| `pen-geometry.ts` (3× Lathe, zyl. Body-UV) | ✓ |
| `pen-body-wrap-unfold.ts` + Tests | ✓ |
| `createPenBodyWrapMaterial` / PNG-Underlay | ✓ |
| `assetKind: 'pen'`, Katalog, `populatePenGroup` | ✓ |
| Entity `penParams`, Materials, `screenImageId` | ✓ |
| `PenFields` (Profil, `maxRadiusM`, Geometries, Label) | ✓ |

**Entity-Felder (Ist):**

```ts
// assetKind: 'pen'
// penParams: { penBodyProfile, maxRadiusM }
// capMaterialId, ringMaterialId, bodyMaterialId
// screenImageId → nur penBody; imageSurfaces.label
```

---

**Category:** Assets — Pen  
**Title:** Querverweise  
**Description:** Katalog-Ausnahmen → [`requirements-assets.md`](./requirements-assets.md) (Platzhalter, image-driven sizing, Referenzkante). Lathe-Konventionen → [`requirements-code.md`](./requirements-code.md). Wine bottle (mehrteiliges SVG, Profilwechsel) → [`requirements-assets-wine-bottle.md`](./requirements-assets-wine-bottle.md).
