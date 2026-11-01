# Assets — Pen (Marker & Fountain pen)

Parametrischer **Stift**-Baustein — **Cap**, **Ring** und **Schaft (body)** aus **SVG-Profil → Lathe**; **Schaft-Bild** (Branding, Muster) aus der **Images-Bibliothek** → [`requirements-images.md`](./requirements-images.md). Katalog, Entity-Modell, Drop/Add → [`requirements-assets.md`](./requirements-assets.md). Bild-Flächen → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md). Material-Slots → [`requirements-materials.md`](./requirements-materials.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md). Uniform Scale → [`requirements-gimbals.md`](./requirements-gimbals.md).

**Abgrenzung:** Keine Getränkedose (zylindrisches Label-Band) → [`requirements-assets-beverage-can.md`](./requirements-assets-beverage-can.md). Kein `print`-Prisma, keine Flasche. **Block**, **Picture framed** → eigene Docs. Marken-Druck = User-Bilder.

**Status:** **v1 fertig** — Katalog, Szene-Entity, Engine-Rebuild, Body-Wrap (90°-Mapping, Druck im Body-Material, Orientierung Kappe links). Code: [`asset-pen.ts`](../../src/scene/asset-pen.ts), [`pen-svg-profile.ts`](../../src/engine/pen-svg-profile.ts), [`pen-geometry.ts`](../../src/engine/pen-geometry.ts), [`pen-body-wrap-unfold.ts`](../../src/engine/pen-body-wrap-unfold.ts), [`rotational-print-material.ts`](../../src/engine/rotational-print-material.ts) (`createRotationalPrintMaterial`), [`populate-packaging.ts`](../../src/engine/asset-meshes/populate-packaging.ts) (`populatePenGroup`), [`PenFields.tsx`](../../src/ui/panels/entity-fields/PenFields.tsx). SVGs: [`profiles/lathe/lathe-y-pen-marker.svg`](../../public/profiles/lathe/lathe-y-pen-marker.svg), [`lathe-y-pen-fountain.svg`](../../public/profiles/lathe/lathe-y-pen-fountain.svg).

**v1-Scope:** Ein Built-in **`pen`**; **zwei Körperprofile** (**Marker**, **Fountain pen**); **real scale** aus **SVG-mm-Pfaden**; **Stiftformat fix** — Bild bestimmt **nicht** Länge oder Profil (analog Dose → [`requirements-assets.md`](./requirements-assets.md)); **drei Lathe-Teile** pro Profil (Cap, Ring, Body); **Bild nur auf Body**; **Material + Farbe** pro Teil (`cap` / `ring` / `body`); **`sizeScale`** uniform auf **gesamten** Stift; Szene-Panel **Geometries**; **kein** Clip-Mechanismus, **keine** Feder-Spitze als separates Mechanik-Mesh in v1.

**Lathe (Querschnitt):** mm-Pfade, **kein** User-Max-Radius, anderes Modell = SVG → [`requirements-assets-lathe.md`](./requirements-assets-lathe.md).

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
**Description:** Beide Profile: **Pfadkoordinaten in mm** (projektweit → [`requirements-assets-lathe.md`](./requirements-assets-lathe.md)). **Drehachse X = 0**. **`viewBox`** ist nur Zeichenrahmen — **Länge und Radien kommen aus den Pfaden**, nicht aus der ViewBox-Fläche.

| Maß | Quelle | Hinweis |
|---|---|---|
| **Querschnitt / Länge** | SVG **Cap / Ring / Body** | **`viewBox="0 0 10 200"`** (mm); Gesamthöhe **200 mm**; Engine: `× MM_TO_M` bei `sizeScale = 1`. |
| **Gesamthöhe / Breite (Footprint)** | Abgeleitet aus Profil | Panel: **Size** + gekoppeltes Width/Height — **kein** separates „Max radius“ |
| **Pivot** | Spitze unten, `y = 0` | Body-Pfad endet auf der Achse |

**`sizeScale`:** **Uniform** auf Cap, Ring, Body und Body-Wrap — **kein** Stretch; **kein** separates Skalieren einzelner Teile.

**Profilwechsel:** anderes `penBodyProfile` oder **revidiertes SVG** — Geometrie-Rebuild; **Bild bleibt** zugewiesen, UV passt sich an.

---

**Category:** Assets — Pen  
**Title:** Stiftformat vs. Bild — keine Image-driven sizing (Pflicht)  
**Description:** Abweichung vom Default in [`requirements-assets.md`](./requirements-assets.md) (**Image-driven sizing**). Für `pen` gilt:

| Quelle | Steuert |
|---|---|
| **`penBodyProfile`**, **SVG-mm-Profil**, **`sizeScale`** | Gesamthöhe, Radien, Cap/Ring/Body-Geometrie |
| **`screenImageId`** / Bild-Pixelmaße | **Nur** Textur auf **Body**-Mesh (Cover, Crop, Finish) |
| **`sizeScale`** (+ uniform Gizmo) | **Proportionale** Skalierung des **fertigen** Stifts |

**Verboten:** Maße oder Profil aus Bild-Ratio ableiten; User-„Max radius“ oder non-uniform Scale. **Platzhalter** ohne Bild: Aspect des **Body-Wrap-Unfolds** des aktiven Profils — **nicht** 16:9.

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
| [`lathe-y-pen-marker.svg`](../../public/profiles/lathe/lathe-y-pen-marker.svg) | `/profiles/lathe/lathe-y-pen-marker.svg` | **`marker`** |
| [`lathe-y-pen-fountain.svg`](../../public/profiles/lathe/lathe-y-pen-fountain.svg) | `/profiles/lathe/lathe-y-pen-fountain.svg` | **`fountain`** |

**Gemeinsame `viewBox`:** `0 0 10 200` (`width="10mm"` `height="200mm"`). Import: `MM_TO_M`, Fuß-Pivot, Y-Spiegelung wie andere Lathe-Assets.

### Teil-Zuordnung (Pflicht) — Lathe path slots

| Teil | Slot-Klasse | Stroke |
|---|---|---|
| **Cap** (`cap`) | `path_red` | **#ff0000** |
| **Ring** (`ring`) | `path_green` | **#00ff00** |
| **Body** (`penBody`) | `path_blue` | **#0000ff** |

**Engine:** [`lathe-svg-path-slots.ts`](../../src/engine/lathe-svg-path-slots.ts) → Slots 0/1/2 → cap/ring/body. Normativ auch in [`requirements-assets-lathe.md`](./requirements-assets-lathe.md).

**Zeichenregeln (Pflicht für Revisionen):**

1. **Nur rechte Halbseite** (Lathe um **Y**); **ein Pfad pro Teil**.
2. **Cap** = oberes Segment (Kappe); **Ring** = schmales Band — **geschlossene Kontur** (Pillenform, berührt Achse nicht) → Ring mit Loch um den Schaft (Ist: marker; fountain noch offen bis zur Achse, Neuzeichnung folgt); **Body** = Schaft inkl. Spitze unten — **ohne** Cap- und Ring-Geometrie duplizieren (keine Überlappung nötig; kleine Y-Überlappung an Soll-Grenzen ist ok, Meshes sind getrennt).
3. **Kein** Fill; Stroke-Kontur = Außenkontur des gedrehten Teils (wie Dosen-Silhouette).
4. **Y-Achse:** Authoring oft **Y nach unten** (Illustrator) → Import **spiegelt** zu Engine (**Y nach oben**, Fuß bei `y = 0`) wie bei Beverage can / Wine bottle.

### Profil-Unterschiede (Ist-SVG)

| | **marker** | **fountain** |
|---|---|---|
| **Ring — Y-Lage** (mm von oben) | ~**20,1** … **23,2** | ~**76,5** … **79,5** |
| **Cap** | kürzer, breiterer Schulterblock oben | längere Kappe / Griffkolben oben |
| **Body** | langer gerader Schaft + Spitze | Schaft mit längerem oberen Abschnitt vor Ring |

---

**Category:** Assets — Pen  
**Title:** Geometrie — Mesh-Stack (v1)  
**Description:** **Drei** Meshes (ein `Group` pro Entity). Alle Längen aus **mm-SVG** × `sizeScale` (× interner Default-Skalierung bis Engine vollständig auf reine mm-Pfade umgestellt ist).

| # | Teil-ID | Geometrie | Material | Bild |
|---|---|---|---|---|
| 1 | **`cap`** | `LatheGeometry` aus **Cap-Pfad** | `capMaterialId` | — |
| 2 | **`ring`** | `LatheGeometry` aus **Ring-Pfad** | `ringMaterialId` | — |
| 3 | **`penBody`** | `LatheGeometry` aus **Body-Pfad** | `bodyMaterialId` + Bild-PBR | `screenImageId` |

**Lathe:** `Vector2(radius, y)` in Metern; **80** Segmente; Naht → [`lathe-asset-common.ts`](../../src/engine/lathe-asset-common.ts) (`LATHE_SEAM_PHI_START`, `weldLathePhiSeam`).

**Druck-UV:** Body bekommt immer `printUv` über die Body-Y-Spanne (`penBodyYBounds`), `uv` bleibt Lathe-Standard → [`requirements-rotational-print.md`](./requirements-rotational-print.md).

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

**Textur-Achsen (90° zur Dose):** Mesh-**U** → Textur-**t** (Bild**höhe** = Umfang); Mesh-**V** → Textur-**s** (Bild**breite** = Schaftlänge). Cover-Spans: `penWrapCircumferenceSpan` / `penWrapBodyLengthSpan`; Mapping `rotationalPrintFit('wrap-height', …)` → [`rotational-print-mapping.ts`](../../src/engine/rotational-print-mapping.ts). Umlauf-Spiegelung + **180°**-Rotation (`rotatePenWrapTextureSt180`) für lesbare Front und **Kappe links** im Motiv — s. **Body-Bild — Front & UV**.

**PNG-Alpha:** Transparente Pixel → Body-Material (`bodyMaterialId`) mit allen Eigenschaften. Default **Substrate 1** (Direktdruck, Multiply) → [`requirements-rotational-print.md`](./requirements-rotational-print.md).

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
| `sizeScale` | **1** | Dimensions → Size | Uniform auf gesamten Stift |
| Width / Height | **abgeleitet** | Dimensions (gekoppelt) | Aus Profil-Footprint; siehe [`requirements-assets-lathe.md`](./requirements-assets-lathe.md) |

Weitere mm-Feinjustierung **einzelner** Teile **nicht** v1 — nur **SVG-Revision** oder anderes Profil.

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
| SVG `lathe-y-pen-marker.svg`, `lathe-y-pen-fountain.svg` | ✓ |
| `pen-svg-profile.ts` (Stroke → Cap/Ring/Body) | ✓ |
| `pen-geometry.ts` (3× Lathe, zyl. Body-UV) | ✓ |
| `pen-body-wrap-unfold.ts` + Tests | ✓ |
| Druck im Body-Material (`createRotationalPrintMaterial`) | ✓ |
| `assetKind: 'pen'`, Katalog, `populatePenGroup` | ✓ |
| Entity `penParams`, Materials, `screenImageId` | ✓ |
| `PenFields` (Profil, Geometries, Label; **kein** Max radius) | ✓ |

**Entity-Felder (Ist):**

```ts
// assetKind: 'pen'
// penParams: { penBodyProfile } (+ intern maxRadiusM Default bis mm-only Engine)
// capMaterialId, ringMaterialId, bodyMaterialId
// screenImageId → nur penBody; imageSurfaces.label
```

---

**Category:** Assets — Pen  
**Title:** Querverweise  
**Description:** Katalog-Ausnahmen → [`requirements-assets.md`](./requirements-assets.md) (Platzhalter, image-driven sizing, Referenzkante). Lathe-mm, Panel-Ziel → [`requirements-assets-lathe.md`](./requirements-assets-lathe.md), [`requirements-code.md`](./requirements-code.md). Wine bottle (mehrteiliges SVG, Profilwechsel) → [`requirements-assets-wine-bottle.md`](./requirements-assets-wine-bottle.md).
