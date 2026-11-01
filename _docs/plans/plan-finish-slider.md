# Plan: Ein Material „Paper“ mit Finish-Schieberegler (Matt ↔ Glossy)

Status: **Entwurf v2 – wartet auf Freigabe**

## Ziel

- „Paper“ und „Print Glossy“ werden zu **einem Material „Paper“** zusammengelegt.
- Matt/Glossy ist kein eigenes Material mehr, sondern ein stufenloser Regler
  **„Finish (Matt ↔ Glossy)“** (0 = matt, 1 = glossy).
- Der Regler erscheint **genau dann, wenn auf der Fläche/dem Slot „Paper“ liegt**.
- Der Gloss-Wert wird **pro Fläche bzw. pro Slot** gespeichert, nicht im Material
  (Poster glossy + Passepartout matt, beide „Paper“).
- Alle Matt/Glossy-Dropdowns verschwinden.

## Ist-Zustand

- Zwei Presets in `src/data/material-presets.ts`: Paper (`MATERIAL_PAPER_ID`) und
  Print Glossy (`MATERIAL_GLOSSY_PRINT_ID`, `src/scene/material-ids.ts`).
- Bildflächen: `ImageSurfaceSettings.finish` / `passepartoutFinish` (`'matt' | 'glossy'`),
  `finishToMaterialId()` in `src/scene/image-surface.ts` wählt das Preset.
- Rotations-Assets haben schon `gloss?: number` (eigener Print-Shader) – bleiben fachlich gleich.
- Beide IDs werden außerdem direkt genutzt in: Book (Cover/Spine), Block, Cylinder, Sphere, Wall,
  Print-Fields, `scene-defaults.ts`, `ground-settings.ts`, `engine/asset-meshes/shared.ts`,
  `populate-primitives.ts`, `populate-book.ts`, `book-cover-material.ts`, `book-spine-texture.ts`.

## Konzept

### 1. Material
- Print Glossy wird entfernt. Paper bekommt zwei Endpunkte für den Glanz
  (Werte aus den heutigen beiden Presets übernommen): `roughness`, `clearcoat`,
  `clearcoatRoughness` (+ ggf. `specularIntensity`) jeweils für matt und für glossy.
- Neue Funktion `resolvePaperPreset(gloss)` → liefert das Paper-Preset mit interpolierten Werten.
  Papier-Struktur (falls prozedural) wird mit steigendem Gloss abgeschwächt.
- Im Spike prüfen, welche Felder die beiden Presets tatsächlich unterscheiden.

### 2. Datenmodell (Gloss pro Fläche/Slot)
- Bildflächen: `gloss: number` (Bild) und `passepartoutGloss: number`; `finish`/`passepartoutFinish` entfallen.
- Bildflächen-Material ist damit immer Paper (wie heute faktisch auch).
- Andere Material-Slots, die Paper tragen können (Book-Cover, Block, Wall …):
  optionales `slotGloss?: Partial<Record<SlotName, number>>` neben `AssetMaterialSlots`
  (Name im Spike festlegen). Fehlt der Wert → Default des Slots.
- Defaults: Bild 1, Passepartout 0, übrige Slots nach heutigem Default-Material
  (war Print Glossy → 1, war Paper → 0).

### 3. Migration beim Laden
- Material-ID `material-glossy-print` → `material-paper` + Gloss 1 am betroffenen Slot.
- `material-paper` → Gloss 0 (falls kein Wert vorhanden).
- `finish: 'matt' | 'glossy'` → `gloss` 0 / 1; vorhandenes `gloss` hat Vorrang.
- `passepartoutFinish` → `passepartoutGloss`.
- Einbau in die bestehende `migrateMaterialId`-/`migrateImageSurfaces`-Logik.
- Unit-Tests mit alten Szenen (matt, glossy, gemischt, Book/Block mit Print Glossy).

### 4. UI
- `ImageFinishSelect` (Dropdown) wird durch `RangeSlider` ersetzt
  (`NORMALIZED_STEP`, `NORMALIZED_DECIMALS` wie bei Print-Settings).
- Bildfläche: „Finish (Matt ↔ Glossy)“; Passepartout: „Passepartout finish (Matt ↔ Glossy)“.
- Material-Slot-Felder (Book, Block, Wall …): wenn gewählter Slot = Paper, Regler direkt darunter einblenden.
- Print Glossy verschwindet aus allen Material-Auswahlen.
- Rotations-Assets: bestehender Regler bleibt, Sonderverzweigung entfällt.

### 5. Regel festhalten
- Eintrag in `_docs/diaries/diary-code-decisions.md`: Material-Varianten, die sich nur in
  einer Eigenschaft unterscheiden, werden **ein** Material mit Schieberegler – keine Dropdowns/Duplikate.

## Offene Fragen
- Lineare Interpolation reicht? Vorschlag: zuerst linear, visuell bei 0 / 0.5 / 1 prüfen, ggf. Kurve anpassen.
- Gibt es weitere Material-Paare dieser Art (z. B. Plastic matte / glossy), die gleich behandelt werden sollen?
  → zunächst nur Paper, Rest als eigener Plan.

## Schritte
1. Spike: Paper vs. Print Glossy vergleichen, Interpolationsfelder + Slot-Gloss-Struktur festlegen.
2. Preset zusammenlegen, `resolvePaperPreset(gloss)` + Tests.
3. Datenmodell + Migration + Tests.
4. Renderer umstellen (`material-resolver.ts`, `populate-primitives.ts`, `populate-book.ts`, `shared.ts`, Book-Cover/Spine).
5. UI umstellen (`ImageSurfaceFields.tsx`, Entity-Fields).
6. Visuelle Prüfung an Picture, Smartphone, Tapete, Passepartout, Book, Block.
7. `npx vitest run`, `npm run lint`, `npm run build`, Commit auf `main`.
