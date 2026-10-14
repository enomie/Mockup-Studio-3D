# Assets — Book (Softcover & Hardcover)

Parametrischer **Buch-Mockup** für Print- und Verpackungspräsentationen — **Papierblock** (Seitenstapel) plus **Einband** (Vorderdeckel, Rückdeckel, Buchrücken). Bilder aus der **Images-Bibliothek** auf Deckeln und optional am Rücken. Katalog, Entity-Modell, Drop/Add → [`requirements-assets.md`](./requirements-assets.md). **Nie Bilder verzerren** → [`.cursor/rules/image-aspect-ratio.mdc`](../../.cursor/rules/image-aspect-ratio.mdc), [`requirements-images.md`](./requirements-images.md). Material-Slots → [`requirements-materials.md`](./requirements-materials.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md).

**Abgrenzung:** Nicht **Print** (flaches Prisma/Flyer) und nicht **Picture framed** (Rahmen um eine Opening). Zwei **Built-in-Varianten** im Katalog: **Softcover** und **Hardcover** — gleiche Parametrik, unterschiedliches Verhalten beim **Cover-Überhang**.

**Status:** **Spezifikation (User-Input)** — noch nicht implementiert.

**v1-Ziel (Scope aus User-Input):** Rechteckiges Buch, geschlossen (keine aufgeschlagenen Seiten). Einband als dünne Volumen-Teile um einen zentralen Papierblock. Pro Teil: **Farbe/Material** über Material-Preset (ggf. Farb-Swatches → [`requirements-colors.md`](./requirements-colors.md)). **Falz/Gelenk** an Vorder- und Rückdeckel: **nur** per **TSL auf der Deckel-Außenfläche** (s. unten) — keine Extra-Meshes in v1. Keine Physik-Pflicht in v1 (optional später Fixed-Collider wie Block).

---

**Category:** Assets — Book  
**Title:** Identität & Katalog  
**Description:** Zwei Built-in Bausteine, nicht löschbar.

| `assetKind` | UI-Label | Kategorie (Ziel) |
|---|---|---|
| `book-softcover` | Book (softcover) | **Print** (Lucide z. B. `book`) |
| `book-hardcover` | Book (hardcover) | **Print** |

Mehrfach-Instanzen unbegrenzt. Default-Szene: **keine** Pflicht-Instanz.

**Unterschied Softcover vs. Hardcover:**

| Aspekt | Softcover | Hardcover |
|---|---|---|
| Cover-Außenmaß (XY) | **Exakt gleich** wie der Papierblock (Seitenstapel) — kein Überhang | **Überhang** des Covers über den Papierblock hinaus (Parametrierbar, z. B. mm pro Kante) |
| Optik | Flexibler Einband, dünn | Steifer Deckel, typischer Hardcover-Look |

Gemeinsame Geometrie-Logik; Umschalten zwischen Soft/Hard über `assetKind` (oder ein Kind + `coverStyle` — Implementierung TBD, Ziel: zwei Katalog-Kacheln wie User beschrieben).

---

**Category:** Assets — Book  
**Title:** Koordinaten, Pivot & Placement  
**Description:** Lokales Achsensystem (Vorschlag, an Block/Picture anlehnen):

- **X** = Breite des Buches (von Buchrücken zur Vorderkante / „Leserichtung“ quer zur Bindung)
- **Y** = Höhe (von unten nach oben)
- **Z** = **Dicke** — Stapelrichtung der Seiten (Buch liegt typisch mit Rücken links/rechts, Dicke entlang **Z**)

**Pivot:** **Unterkante** des Gesamtobjekts bei **lokal y = 0** (Mittelpunkt in **X** und **Z** auf der Bodenfläche) — analog Block / bildtragende Assets mit Bodenkontakt → [`requirements-scene-placement.md`](./requirements-scene-placement.md).

**Orientierung im Katalog:** Ein Baustein; Portrait/Landscape der **Deckel-Bilder** folgt dem zugewiesenen Bild (s. Image-driven sizing), nicht einem separaten Asset pro Orientierung.

---

**Category:** Assets — Book  
**Title:** Bauteile — Überblick  
**Description:** Das Buch besteht aus **zwei Schichten**:

1. **Papierblock (Seitenstapel)** — simuliert den Buchblock innen.  
2. **Einband** — umschließt den Block: **Vorderdeckel**, **Rückdeckel**, **Buchrücken**.

```
        +Y (Höhe)
         |
         |   [ Rückdeckel ]  |  Papier  |  [ Vorderdeckel ]
         |                   |  block   |
         +-------------------Rücken---+-------------------> +X (Breite)
                            (Spine)
        Cover-Dicke oft entlang ±Z (Deckelstärke)
```

**Papierblock**

| Teil | Rolle | Abmessungen (User) | Oberfläche |
|---|---|---|---|
| **Pages / paper block** | Rechteckiger **Quader** (Box) | Breite × Höhe × **Seitenstapel-Dicke** (`pagesDepthM` oder `pagesThicknessM` entlang **Z**) | **Farbe + Material** einstellbar (ein Slot für den ganzen Block) |

**Einband** (um den Papierblock)

| Teil | Rolle | Abmessungen (User) | Bild / Farbe |
|---|---|---|---|
| **Front cover (Vorderdeckel)** | Dünnes Volumen vorne | **Deckel-Dicke** entlang **Z** einstellbar; Fläche = Cover-Außenmaß (s. Soft/Hard) | **Bild** (Images-Bibliothek) auf der Außenseite; Material/Farbe für Einband |
| **Back cover (Rückdeckel)** | Dünnes Volumen hinten | **Gleiche Deckel-Dicke Z** wie Vorderdeckel | **Bild** *oder* **einfarbig** (ohne Bild) |
| **Spine (Buchrücken)** | Verbindet Vorder- und Rückdeckel an der Bindungskante | **Dicke entlang X** = **gleich wie Vorderdeckel-Dicke Z** (User-Vorgabe: „Buchrücken Dicke x gleich wie Vorderwand“) | Optional **Bild** am Rücken (s. eigener Abschnitt); sonst Einband-Material/Farbe |

**Material-Trennung (Pflicht):**

| Slot (Ziel) | Bedeutung |
|---|---|
| `bookPagesMaterialId` | Papier / Seitenstapel — PBR-Preset |
| `bookPagesTint` | Seitenfarbe (multipliziert mit Preset) — **immer** auf dem Block |
| `bookCoverMaterialId` | Einband — PBR-Preset (Deckel, Rücken) |
| `bookCoverTint` | Einbandfarbe auf **Rücken**, **Rückdeckel ohne Bild**; **nicht** auf Front/Back-**Cover-Bildern** |
| Deckel-Bilder | Über `screenImageId` / eigene Image-IDs pro Face (Front, Back, Spine) — TBD einheitliches Muster mit anderen Assets |

**Rebuild** bei Änderung von Maßen, Cover-Typ, Bild-IDs, Material-Slots.

---

**Category:** Assets — Book  
**Title:** Softcover — Cover ohne Überhang  
**Description:** Bei **Softcover** ist der **Einband in Breite und Höhe identisch** mit dem **Papierblock** (Außenkontur deckungsgleich). Es gibt **keinen** sichtbaren Überstand der Cover-Platten über die Schnittkante der Seiten hinaus.

- Vorder- und Rückdeckel: gleiche **XY-Extent** wie `pages` block.  
- Buchrücken: schmale Fläche an der Bindungskante; Gesamtbreite **X** = Seitenblock-Breite inkl. Rückenanteil (Geometrie-Detail bei Implementierung — Zielbild: geschlossenes Taschenbuch/Paperback).

---

**Category:** Assets — Book  
**Title:** Hardcover — Cover-Überhang  
**Description:** Bei **Hardcover** ragt der **Einband** über den **Papierblock** hinaus (**Überhang** / „jacket overhang“).

- Parametrierbarer **Überhang** pro Kante (Vorschlag v1: **ein** Wert in mm für alle vier Seiten gleich, z. B. `coverOverhangMm`) — oder getrennt oben/unten/links/rechts **später**.  
- Papierblock bleibt **kleiner** in **X** und **Y** als die äußere Cover-Fläche; Dicke **Z** des Blocks unverändert User-wählbar.  
- Vorder-/Rückdeckel und Rücken folgen der **größeren** Cover-Silhouette; Block sitzt **zentriert** im Überhang (TBD exakte Offset-Regel).

---

**Category:** Assets — Book  
**Title:** Falz / Gelenk am Deckel (Hinge groove)  
**Description:** An der **Bindungsseite** von **Vorder- und Rückdeckel** (Außenfläche) ein **vertikaler Streifen** — die Stelle, an der sich der Deckel vom Rücken „ablöst“ und das Buch aufklappt (Joint / **French groove** bei Hardcover; weichere **Knicklinie** bei Softcover). Referenz: sichtbare Schattenrinne parallel zum Buchrücken, wenige mm von der Spine-Kante entfernt.

**Pflicht in v1 (Mockup-Qualität):** Optisch erkennbar in Nah- und Mittelaufnahme; **kein** separates User-Bild — rein **parametrisch**.

| Parameter | Bedeutung | UI (Ziel) |
|---|---|---|
| `hingeGrooveEnabled` | Falz ein/aus | Checkbox (Default **an**) |
| `hingeGrooveOffsetMm` | Abstand der Falz **vom Buchrücken** (Bindungskante) zur **Mitte** des Streifens — entlang der Deckelbreite, Richtung Fore edge | z. B. **3–8 mm** Default je nach Cover-Typ |
| `hingeGrooveWidthMm` | **Breite** des sichtbaren Streifens (Rinne + Übergang) | z. B. **1–6 mm** |
| `hingeGrooveIntensity` | **Stärke** des Effekts: Tiefe/Schatten/Scherung (0 = aus, 1 = maximal) | Slider **0–1** |

**Defaults (Ziel):**

| Cover-Typ | `hingeGrooveIntensity` | Charakter |
|---|---|---|
| **Softcover** | **0,25** (Default) | Dezenter Falz |
| **Hardcover** | **0,45** (Default) | Etwas stärker sichtbar — **gleiche Parameter**, nur andere Defaults |

User kann Intensität/Breite **überschreiben** (z. B. Hardcover mit stärkerem Falz).

**Platzierung:** Je **eine** Falz pro **Vorderdeckel** und **Rückdeckel** auf der **Außenfläche**, Spiegelung zur Bindung (Rückdeckel Falz an derselben logischen Spine-Seite). **Nicht** auf dem Papierblock. Cover-Bilder laufen **über** die Falz — der Effekt moduliert Licht/Farbe oben drauf (kein Ausschnitt im Bild).

**Umsetzung v1 (normativ): Deckel-Außenfläche — TSL-Material-Modifier**

Die Falz wird **ausschließlich im Shader** der **äußeren Deckelfläche** (Front + Back) erzeugt — analog zum **Border-Inset** bei Fabric cloth (ein Mesh, Effekt im Material), nicht als separates Geometrie-Teil.

| Aspekt | Regel |
|---|---|
| **Pipeline** | Cover-Material = Preset + optionales **Cover-Bild** über bestehende Textur-Pipeline (`create-textured-material` / Bild-auf-Preset); **Hinge-Groove-Nodes** werden **asset-spezifisch** für `book-*` angebunden (eigene Builder-Funktion, z. B. `createBookCoverMaterial` — Name bei Implementierung). |
| **Sampling** | **Objektspace** entlang Deckelbreite (Achse **Fore edge**, Bindung bei Spine): Welt-/Local-Position in **Metern** aus `hingeGrooveOffsetMm` + `hingeGrooveWidthMm` — **nicht** von Cover-UV abhängig, damit das Motiv nicht mitwandert. |
| **Intensität** | `hingeGrooveIntensity` moduliert kombiniert: **Normalen** (Mulde), **Albedo/AO** (Schatten in der Rinne), optional leichter **Roughness**-Peak; bei Bedarf schmaler **Highlight**-Streifen zur Spine-Seite. |
| **Rebuild** | Uniform-/Node-Update bei `bookParams` (Falz-Felder); **kein** Mesh-Split für die Falz. |
| **Rücken & Papier** | Falz **nur** auf Vorder- und Rückdeckel-Außenfläche; **nicht** auf Spine-Mesh oder Papierblock. |

Technik-Referenz → [`requirements-code.md`](./requirements-code.md) (*Asset-specific TSL on surfaces*).

**Später (nicht v1):** zweite parallele Linie (French groove innen/außen); leichte **Vertex-Vertiefung** nur wenn Shader in Extrem-Nah nicht reicht.

**Verworfen für v1:** Falz als **zweites Mesh** oder **eigene Textur** nur für die Rinne (Aufkleber-Look / bricht Cover-UV); reine **Geometrie-Falz** ohne Shader.

**Panel:** Unter **Cover** — Falz aktiv, Offset, Breite, Intensität (mm + Slider). Soft/Hard ändert nur **Voreinstellung**, nicht die verfügbaren Regler.

---

**Category:** Assets — Book  
**Title:** Abmessungen — Panel (User-Parameter)  
**Description:** Maße in **Metern** (UI 4 Dezimalstellen / mm-Anzeige optional). Gespeichert als **`bookParams`** (Name TBD) auf der Entity.

| Parameter | Bedeutung | Hinweis |
|---|---|---|
| `pagesThicknessM` | **Dicke des Papierblocks** entlang **Z** | User: „Dicke Z einstellbar“ für Seiten |
| `coverThicknessM` | **Dicke Vorderdeckel** (und Rückdeckel) entlang **Z** | User: „Vorderwand Dicke Z“ |
| `spineThicknessM` | **Dicke Buchrücken** entlang **X** | **Default = `coverThicknessM`** (User: gleich wie Vorderwand) |
| `coverOverhangMm` | Nur **Hardcover** — Überhang Cover über Block | **0** bei Softcover (erzwungen) |
| `hingeGrooveOffsetMm` | Falz: Abstand von der Spine-Kante | s. Abschnitt Falz / Gelenk |
| `hingeGrooveWidthMm` | Falz: Streifenbreite | |
| `hingeGrooveIntensity` | Falz: Tiefe / Schatten (**0–1**) | Default **0,25** Softcover, **0,45** Hardcover |
| `hingeGrooveEnabled` | Falz sichtbar | Default **true** |

**Abgeleitet (kein separates Panel-Feld, Rebuild):**

| Größe | Formel | Bedeutung |
|---|---|---|
| **`totalThicknessM`** (Buchgesamttiefe) | `pagesThicknessM + 2 × coverThicknessM` | Geschlossene **Dicke entlang Z** — von Außenfläche Rückdeckel bis Außenfläche Vorderdeckel |
| **`coverWidthM` × `coverHeightM`** | Aus **Front-Cover-Bild** (`screenImageId`) + `sizeScale` + Referenzkante | **Nicht** im Panel editierbar — s. Image-driven sizing |
| **Gesamtbreite X** | `spineThicknessM + coverWidthM` | Abgeleitet |

**Weitere Defaults & Clamps:** z. B. Mindest-Dicke Deckel 0,5 mm, Block 5 mm (Implementierung).

**Sizing ohne Bild:** Referenzbreite **148 mm** (wie Print), Platzhalter-Aspect **148 / 210** (Hochformat).

---

**Category:** Assets — Book  
**Title:** Vorderdeckel & Rückdeckel — Bilder  
**Description:** **Vorderdeckel:** Bild aus Images-Bibliothek auf der **Außenseite** (Cover-Art). **Rückdeckel:** entweder **eigenes Bild** oder **kein Bild** → einheitliche **Einbandfarbe** über `coverMaterialId` / Color-Swatch.

- **Kein Stretch** — Texture-Mapping **Cover** auf Fläche mit **exakt passendem** Seitenverhältnis oder Geometrie folgt Bild (s. nächster Abschnitt).  
- Rückdeckel „einfarbig“: kein `backCoverImageId` → Materialfarbe sichtbar.
- **Nur Außenfläche** des jeweiligen Deckel-/Rücken-Teils trägt das Bild; **Kanten** und **Innenseite** des dünnen Deckelvolumens = `bookCoverTint` + `bookCoverMaterialId`.
- **Transparente PNG-Bereiche** auf der Außenfläche zeigen **Coverfarbe** (opaque Compositing), kein Durchscheinen der Szene.

**Image-IDs:** Front = `screenImageId`; Rücken optional = `bookBackCoverImageId`; Buchrücken optional = `bookSpineImageId`. **Nur** `screenImageId` beeinflusst **Cover-Breite/Höhe** (Format).

---

**Category:** Assets — Book  
**Title:** Image-driven sizing (Deckel)  
**Description:** **Normativ:** **Breite und Höhe** des **Cover-Panels** (Vorder-/Rückdeckel-Außenmaß ohne Rücken-Bauteil) kommen **ausschließlich** vom **Front-Cover-Bild** (`screenImageId`) — plus projektweite **Referenzkante** (148 mm Breite wie Print) und **`sizeScale`**. **Back-** und **Spine-Bilder** ändern **nie** `computeFaceSize` / Geometrie-Breite-Höhe.

- **Uniform `sizeScale`** auf das Gesamtobjekt — proportional, nie verzerrend → [`requirements-gimbals.md`](./requirements-gimbals.md).  
- Texture auf Deckel-Planes: **Cover** ohne UV-Stretch.

---

**Category:** Assets — Book  
**Title:** Buchrücken — Fläche vs. Bauteil (Begriffe)  
**Description:** Zwei verschiedene „Dicken“ nicht verwechseln:

| Begriff | Achse | Bedeutung |
|---|---|---|
| **Rücken-Bauteil** (`spineThicknessM`) | **X** | Wie **dick** das Rücken-Element in Richtung Buchbreite ist — **gleich** `coverThicknessM` (User: „wie Vorderwand“). |
| **Rücken-Fläche** (sichtbar von außen) | **Y × Z** | Rechteck **Höhe** × **Buchgesamttiefe** `totalThicknessM` (s. Tabelle Abmessungen). Die **Breite** dieser Fläche (entlang **Z**) ist **genau** die Gesamttiefe des geschlossenen Buchs — **nicht** die Seitenstapel-Dicke allein. |

Wenn der User **Buchtiefe** / **Buchgesamttiefe** sagt, ist das **`totalThicknessM`** (Seiten + beide Deckel entlang **Z**).

---

**Category:** Assets — Book  
**Title:** Buchrücken — Bild  
**Description:** Am **Buchrücken** kann optional ein **Bild** platziert werden (z. B. Titel / Serie). Mapping auf die **Rücken-Fläche** (Y × `totalThicknessM`).

| Regel | Beschreibung |
|---|---|
| **Maximale Breite** | Ein Spine-Bild darf **niemals breiter** dargestellt werden als die **Rücken-Fläche** breit ist — also **nicht breiter als `totalThicknessM`** (Buchgesamttiefe). Ist das Bild im Pixel-Seitenverhältnis „zu breit“, wird es **verkleinert** (Contain), bis es in die Rückenbreite passt — **ohne** seitliches Überstehen. |
| **Anpassung an Gesamttiefe** | Ändert sich `pagesThicknessM` oder `coverThicknessM`, ändert sich **`totalThicknessM`** und damit die **Breite** der Rücken-Fläche; das Bild **skaliert mit** (weiterhin innerhalb dieser Breite, ohne Stretch). |
| **Kein Stretch** | Seitenverhältnis des Bildes bleibt erhalten — **Contain** innerhalb der Rückenfläche; **niemals** willkürliches Strecken → [`requirements-images.md`](./requirements-images.md). |
| **Ausrichtung** | **Oben ausgerichtet** (top-aligned): Oberkante Bild = Oberkante Buch (**Y**). Freier Raum **unten** bei zu hohem Bild; **links/rechts** bei schmalerem Bild innerhalb der Rückenbreite — **nicht** zentriert vertikal (v1). |

Ohne Spine-Bild: Rücken zeigt **Einband-Material/Farbe** (`coverMaterialId`).

---

**Category:** Assets — Book  
**Title:** Geometrie & Panel (UI-Ziel)  
**Description:** Right Sub bei selektierter Book-Entity (Struktur analog Picture **Geometries**):

- **Pages:** Dicke (Z), Material (Papier).  
- **Cover:** Stil (nur Anzeige bei Hard/Soft aus Kind), Deckel-Dicke (Z), Rücken-Dicke (X, Default = Deckel), Hardcover-Überhang.  
- **Images:** Front cover, Back cover (optional), Spine (optional); Back „solid color“ = Bild abwählen.  
- **Materials:** Pages vs. Cover (ggf. Unterteile später).

Sichtbarkeit pro Teil (Checkbox) optional v1 — TBD.

---

**Category:** Assets — Book  
**Title:** Schatten & Export  
**Description:** Cast/Receive gemäß [`requirements-shadows.md`](./requirements-shadows.md) — alle soliden Teile typischerweise **cast + receive**. Export → [`requirements-export.md`](./requirements-export.md); Aspect-Ratio-Regeln gelten für Deckel- und Spine-Bilder.

---

**Category:** Assets — Book  
**Title:** Offen / später  
**Description:** Aufgeschlagenes Buch; abgerundete Cover-Ecken; separater Material-Slot pro Deckel; Physik (Fixed box); Druck auf **Seitenkante** (fore edge); mehrere Überhang-Werte; Integration mit Scene Save / Katalog-Thumbnails; Falz nur auf **geschlossenem** Deckel (bei „open book“ eigene Geometrie).

---

## Kurzfassung (User-Intent)

- Neuer Asset-Typ **Book** in zwei Varianten: **Softcover** (Cover = gleiche Größe wie Seiten) und **Hardcover** (Cover mit **Überhang**).  
- Innen: **Box** als Seitenstapel — **Z-Dicke**, **Papierfarbe/Material**.  
- Außen: **Einband** — **Vorderdeckel** (Z-Dicke + Bild), **Rückdeckel** (gleiche Z-Dicke + Bild oder einfarbig), **Buchrücken** (Bauteil-Dicke **X** = Deckel-Z-Dicke; optional **Bild** auf der Rückenfläche: **höchstens so breit wie Buchgesamttiefe** `totalThicknessM`, skaliert mit, **ohne Stretch**, **oben ausgerichtet**).  
- Einband: **Farbe und Material** getrennt vom Papier; **Dicken** der Einband-Teile einstellbar.  
- **Falz/Gelenk** an beiden Deckeln: **Breite, Offset, Intensität**; v1 = **TSL auf Deckel-Außenfläche** (über Cover-Bild drüber).
