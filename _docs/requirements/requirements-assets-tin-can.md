# Assets — Tin can (Blechdose / Food can)

Parametrischer **klassischer Blechdosen**-Baustein — **Zylindermantel** mit **horizontalen Beads** (Riffelung) im Mittelband, **Deckel/Boden** mit **Endring** im **gleichen Außendurchmesser** wie der Mantel (kein Getränke-Hals). **Etikett** als Bild aus der **Images-Bibliothek** → [`requirements-images.md`](./requirements-images.md). Katalog, Entity, Placement → [`requirements-assets.md`](./requirements-assets.md). Bild-Flächen → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md). Uniform Scale → [`requirements-gimbals.md`](./requirements-gimbals.md).

**Abgrenzung:** Keine **Getränkedose** (Alu-Lathe, 202-Neck, Schulter) → [`requirements-assets-beverage-can.md`](./requirements-assets-beverage-can.md). Keine Flasche. **Block**, **Picture framed** → eigene Docs.

**Status:** **implementiert** (v1).

**v1-Scope:** Ein Built-in **`tin-can`**; **ein Default-Nennmaß**; User stellt **`bodyRadiusMm`** und **`bodyHeightMm`** ein (Geometrie-Rebuild); **Bead-Zone** = mittlere **80 %** des **Mantels** (oben/unten je **10 %** glatt); **Label-Mesh** folgt der **gewellten** Mantelgeometrie (kein flaches Zylinder-UV über Beads); **`sizeScale`** uniform auf **gesamte** Dose; Szene-Panel **Geometries**; **kein** Öffnungsmechanismus, **kein** Längsnaht-Mesh in v1 (optional später).

**Skalierung (Querschnitt):** kein Lathe-SVG — gleiche **Uniform-only**- und Szene-Panel-Ziele → [`requirements-assets-lathe.md`](./requirements-assets-lathe.md) (*Nicht Lathe-SVG*).

---

**Category:** Assets — Tin can  
**Title:** Identität & Katalog  
**Description:** Built-in Baustein, nicht löschbar.

| `assetKind` | UI-Label | Kategorie (Ziel) |
|---|---|---|
| `tin-can` | Can Tin | **Objects** (Lucide z. B. `cylinder` / `package`) |

Stabile Katalog-ID über `kind`. Mehrfach-Instanzen unbegrenzt. Default-Szene: **keine** Pflicht-Instanz.

---

**Category:** Assets — Tin can  
**Title:** Default-Nennmaß (einziges Built-in-Profil v1)  
**Description:** v1 liefert **keine** Volumen-Presets (400 ml / 800 ml / …). **Ein** Referenz-Default beim ersten Add; alle sichtbaren Maße skalieren proportional, wenn User **Radius** oder **Höhe** ändert.

| Parameter | Default (Nenn) | Hinweis |
|---|---|---|
| **`bodyRadiusMm`** | **36,5** | Außenradius **Zylindermantel** (= **Ø 73,0 mm**, typ. schmale Konservengröße) |
| **`bodyHeightMm`** | **110,0** | **Gesamthöhe** der Dose (Pivot unten bis oberste Kante), inkl. Endringe — **ohne** Pull-Tab |

**Scene-Einheit bei `sizeScale = 1`:** `bodyRadiusM = 0,0365`, `bodyHeightM = 0,110`.

User-Panel (Geometries): **Radius (mm)** und **Höhe (mm)** — Änderung → **Mesh-Rebuild** (Mantel-Beads, Endringe, Label-Mantel). **Clamps** (v1-Vorschlag): Radius **25–60 mm**, Höhe **60–200 mm** (feinjustierbar bei Implementierung).

---

**Category:** Assets — Tin can  
**Title:** Mantel — glatte Zonen vs. Bead-Zone (Pflicht)  
**Description:** Die **Seitenwand** (Zylinder zwischen unterem und oberem **Endring**, s. Geometrie) ist **nicht** über die volle Höhe geriffelt.

| Vertikaler Abschnitt (Anteil der **Mantelhöhe** `mantleHeightMm`) | Anteil | Geometrie |
|---|---|---|
| **Unten** | **10 %** | **Glatt** — konstanter Außenradius = `bodyRadiusMm` |
| **Mitte** | **80 %** | **Beads** — horizontale Wellung (Perlen) um die Dosenachse |
| **Oben** | **10 %** | **Glatt** — gleicher Radius |

**Mantelhöhe:** `mantleHeightMm = bodyHeightMm − bottomEndRingHeightMm − topEndRingHeightMm` (Ringhöhen siehe Geometrie). Bead-Bereich in **lokal Y** (Pivot unten): von `y = bottomEndRingHeightMm + 0,10 × mantleHeightMm` bis `y = bottomEndRingHeightMm + 0,90 × mantleHeightMm`.

**Bead-Profil (v1):** **Nur nach innen** geriffelt (Nenn-OD = `bodyRadius` an den Kämmen, Einschnitte nach innen); **`beadCount`** = Anzahl **voller Wellen** in der 80-%-Bead-Zone (**1–20**, Default **11**), unabhängig von Mantelhöhe. Tiefe **klein** gegenüber Radius (interner Nennwert, kein Slider). **Innen** optional gleicher Radius (dünne Wand) oder einfacher Zylinder — nur Außenform muss für Label/Schatten stimmen.

**Verboten:** Beads über die **gesamte** Seitenhöhe; Beads auf **Deckel/Boden**-Scheiben.

---

**Category:** Assets — Tin can  
**Title:** Endringe oben & unten  
**Description:** Analog **Getränkedose** (sichtbarer **Mantel-Endring**), aber **Außendurchmesser = Mantel** (`2 × bodyRadiusMm`) — **keine** Verjüngung zum Hals.

| Zone | v1-Nenn (bei Default) | Hinweis |
|---|---|---|
| **Oberer Endring** — Höhe | **2,5 mm** | Unter Deckelscheibe; Label endet darunter |
| **Unterer Endring** — Höhe | **2,5 mm** | Über Boden-Kontakt; Label beginnt darüber |
| **Endring** — **Dicke** (radial, Falz) | **1,5 mm** | Wie Getränkedose-Mantel-Endring (`endRingThicknessM`) |
**Ring-Position (Pflicht):** Vertikale **Mitte** des Endrings auf der **Naht** am Dosenende (**unten** `y = 0` vor Pivot-Offset, **oben** `y = bodyHeight`); Ring erstreckt sich **halb nach außen / halb über den Mantel** (±½ Ringhöhe). **Außenradius** = `bodyRadius + endRingThickness` — **breitester** Teil; Mantel-Beads **dürfen nicht** darüber ragen.

**Deckel/Boden:** Scheibe **leicht nach innen** (`lidInset`, Default **0,8 mm** kleiner Radius als Mantel), **auf der Innenkante** des Rings (Boden oben am unteren Ring, Deckel unten am oberen Ring). **Double-Seam** = radialer Ring-Streifen. **Kein** 202-Verschluss.

**Pivot:** Nach Geometrie-Offset liegt **ymin = 0** (physikalische Unterkante inkl. unterer Ringhälfte).

---

**Category:** Assets — Tin can  
**Title:** Dosenformat vs. Bild — keine Image-driven sizing (Pflicht)  
**Description:** Abweichung wie [`requirements-assets.md`](./requirements-assets.md) (**Image-driven sizing**). Für `tin-can` gilt:

| Quelle | Steuert |
|---|---|
| **`bodyRadiusMm`**, **`bodyHeightMm`**, `tinCanParams` | Gesamthöhe, Radius, Bead-Zone, Endringe → **Geometrie-Rebuild** |
| **`screenImageId`** / Bild-Pixelmaße | **Nur** Textur auf Label-Mantel (**Cover**, Crop, Finish) — **kein** Rebuild von Radius/Höhe |
| **`sizeScale`** (+ uniform Gizmo) | **Proportionale** Skalierung der **fertigen** Dose |

**Verboten:** Radius oder Höhe aus `ImageAsset.width` / `height` ableiten; non-uniform Scale am Transform. **Platzhalter** ohne Bild: Unfold-Aspect des **aktuellen** Radius/Höhe — **nicht** 16:9.

**Aspect / Cover:** Bild wird auf das **unfolded Label-Band** gemappt (Umfang × Labelhöhe). Falsches Bild-Aspect → **Cover/Crop** auf **unverändertem** Band — **kein** Stretch (Override aspect ratio nur per globaler Checkbox → [`requirements-images.md`](./requirements-images.md)).

---

**Category:** Assets — Tin can  
**Title:** Label — gewellte Geometrie & UV (Pflicht)  
**Description:** Das Label ist **kein** separater glatter Zylinder über einer geriffelten Hülle.

| Regel | Detail |
|---|---|
| **Geometrie** | Label-Mantel = **dieselbe** Außenkontur wie der **Metall-Mantel** im Label-Band (Beads **mit** modelliert) |
| **UV** | UVs auf **der gewellten** Mesh-Oberfläche; Texel folgen **sichtbarer** Wellung (kein „flaches“ Planar-Map, das Wellen ignoriert). **Horizontal (U):** dieselbe **`cylindricalLabelUv`** wie Getränkedose (`src/engine/cylindrical-label-uv.ts`) — Bildmitte **U = 0,5** an **+Z**, Naht an **−Z**, **U** für Außenmantel gespiegelt (lesbares Unfold) |
| **Glatte 10-%-Zonen** | Liegen **innerhalb** des Mantels, aber **außerhalb** der 80-%-Bead-Zone — **kein** extra Boden-Metallband wie Getränkedose |
| **360°** | Voller Umfang **2π × bodyRadiusMm** (Mittelradius im Bead-Band: Näherung **bodyRadiusMm** für Unfold) |

**Label-Band (vertikal, bei Default):**

- **Voller Mantel** zwischen den Endringen: `labelY0 = mantleY0`, `labelY1 = mantleY1` — **kein** 5-mm-Boden-Abstand wie bei **Beverage can**; Bild/UV **von oben bis unten** auf dem Mantel (Height-fit auf **gesamte** Mantelhöhe).
- `labelHeightMm = mantleHeightMm` → bei Default **≈ 107,5 mm** (`bodyHeight − 2 × ½ Ringhöhe`).

**Flaches Unfold (Design-Referenz):** `unfoldWidthMm = 2π × bodyRadiusMm`, `unfoldHeightMm = labelHeightMm`. **Wellung im Unfold:** Das **flache** Lieferanten-Template bleibt **rechteckig**; die **3D-Engine** verformt die Textur durch **Geometrie + UV** — Export-Unfold optional später.

**Mit Bild / ohne Bild:** Wie Beverage can — Hülle kann im Label-Band **ohne** Mantel-Dreiecke sein; Label-Mantel schließt das Band. **Ohne Bild:** voller Mantel inkl. Metall inkl. Beads.

**Material:** `createCanLabelMaterial` (Height-fit + Metall-Underlay bei Alpha) — **nicht** `createImagePbrMaterial` (das wäre für ebene/glas-durchsichtige Stacks). → [`requirements-images.md`](./requirements-images.md).

---

**Category:** Assets — Tin can  
**Title:** Mockup-Maßstab & Referenzkante  
**Description:** **Real scale** (wie Beverage can). **`sizeScale`** (Default `1`) multipliziert **alle** mm proportional.

| Referenzkante | Wert bei `sizeScale = 1` (Default) |
|---|---|
| **Gesamthöhe** | **0,110 m** (`bodyHeightMm`) |

**Radius** skaliert mit: `bodyRadiusM × sizeScale`. Panel **Size** / Gizmo-Uniform-Scale wie [`requirements-assets.md`](./requirements-assets.md); Bodenkontakt: Pivot **unten**.

---

**Category:** Assets — Tin can  
**Title:** Koordinaten, Pivot & Placement  
**Description:** Lokal: **Y** = Dosenachse; **Pivot** = **Mittelpunkt Unterseite** (Bodenkontakt) **(0,0,0)**. **Front / Etikett:** **+Z** = Vorderseite in Default-Spawn; **Bildmitte = Front**.

**Transform:** Move + Rotate + **uniform Scale** only → [`requirements-scene-placement.md`](./requirements-scene-placement.md).

---

**Category:** Assets — Tin can  
**Title:** Geometrie — Mesh-Stack (v1, Ziel)  
**Description:** `Group` pro Entity; alle Längen × `sizeScale` beim Rebuild.

| # | Teil | Geometrie | Material | Bild |
|---|---|---|---|---|
| 1 | **Hülle** (`body`) | Zylinder-Mantel (glatt + **displaced** Beads) + Deckel/Boden + Endringe | `metalMaterialId` (Blech / lackiert) | — |
| 2 | **Label** (`label`) | **Open mantle** mit **identischer** Bead-Displacement wie Außenmantel im Band | Bild-PBR + `imageSurfaces` | `screenImageId` |

**Material:** Default **mattes Weißblech** oder **lackiertes Blech** (Materials-Bibliothek) — weniger spiegelnd als Alu-Getränkedose.

---

**Category:** Assets — Tin can  
**Title:** Szene-Panel (Ist)  
**Description:** Right **Szene** — **kein** Lathe-Packaging-Footer (kein gekoppeltes Width/Height aus Label-Aspect).

| Reihenfolge | Sektion |
|---|---|
| 1 | Label / Image |
| 2 | **Geometries** — **Waves** (`beadCount`, 1–20); Mesh-Sichtbarkeit |
| 3 | Materials |
| 4 | **Dimensions** — **Size** (`sizeScale`); **Radius** / **Height** (m → `bodyRadiusM`, `bodyHeightM`) |
| 5 | **Position** |

**Kein** Bead-Prozent-Slider in v1 — **fix** 10 % / 80 % / 10 % Mantel. Rebuild bei Params + `sizeScale` unabhängig vom Bild. → [`TinCanFields.tsx`](../../src/ui/panels/entity-fields/TinCanFields.tsx).

---

**Category:** Assets — Tin can  
**Title:** Serialisierung & Scene-API (Ziel)  
**Description:** Entity speichert `tinCanParams: { bodyRadiusMm, bodyHeightMm, beadCount }` (+ `sizeScale`, `screenImageId`, Material-IDs). `addAsset('tin-can')` → Default-Nennmaß. Änderung Radius/Höhe → Scene-API rebuild — **unabhängig** vom zugewiesenen Bild.
