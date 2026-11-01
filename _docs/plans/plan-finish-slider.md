# Plan: Finish-Schieberegler statt Dropdown (Matt ↔ Glossy)

Status: **Entwurf – wartet auf Freigabe**

## Ziel

Überall, wo heute das Dropdown „Finish: Matt / Glossy“ steht, gibt es stattdessen
einen stufenlosen Schieberegler **„Finish (Matt ↔ Glossy)“** (0 = matt, 1 = glossy),
genau wie bereits bei den Rotations-Assets (Dose, Flasche, Tasse).

Betrifft:
- Bild-Finish (Front/Back) aller Bildflächen: Picture, Print, Smartphone, Tablet, Monitor, Wand/Tapete, Faces im Image-Mode
- Passepartout-Finish

## Ist-Zustand

- `src/scene/image-surface.ts`: `finish` / `passepartoutFinish` sind `'matt' | 'glossy'`.
  `finishToMaterialId()` mappt auf zwei feste Presets: **Paper** (matt) bzw. **Print Glossy**.
- `gloss?: number` gibt es schon, aber nur für Rotations-Assets (Print-Settings-Shader).
- Renderer: `src/engine/material-resolver.ts` (Bild + Passepartout),
  `src/engine/asset-meshes/populate-primitives.ts` (Tapete/Screen),
  `src/engine/asset-meshes/rotational-print-populate.ts`, `src/scene/rotational-print.ts`.
- UI: `src/ui/panels/ImageSurfaceFields.tsx` → `ImageFinishSelect` (Dropdown) vs. `RangeSlider` (nur Print-Settings).
- Migration: `migrateImageSurfaces()` leitet `finish` aus alten Material-Slots ab.

## Konzept

1. **Datenmodell**
   - `ImageSurfaceSettings.gloss: number` (0–1) wird Pflichtfeld für das Bild.
   - Neu `passepartoutGloss: number` (0–1).
   - `finish` / `passepartoutFinish` werden entfernt (bzw. nur noch beim Laden gelesen).
   - Defaults: Bild `gloss = 1` (heute glossy), Passepartout `passepartoutGloss = 0` (heute matt).

2. **Migration beim Laden** (Szenen-/Projektdateien)
   - `finish: 'matt'` → `gloss = 0`, `'glossy'` → `gloss = 1`; vorhandenes `gloss` hat Vorrang.
   - analog `passepartoutFinish` → `passepartoutGloss`.
   - Material-Slot-Migration (`finishFromMaterialId`) liefert direkt 0/1.
   - Tests für alte Dateien (matt, glossy, gemischt, mit/ohne `gloss`).

3. **Rendering: Interpolation zwischen den Presets**
   - Neue Hilfsfunktion z. B. `resolveFinishPreset(gloss, resolvePreset)`:
     lädt Paper- und Print-Glossy-Preset und interpoliert linear
     `roughness`, `clearcoat`, `clearcoatRoughness`, `specularIntensity` (u. ä. numerische PBR-Werte).
   - Nicht-numerische Eigenschaften (Typ, prozedurale Struktur, Papierfaser-Normal etc.):
     von Paper übernehmen und deren Stärke mit `(1 - gloss)` ausblenden, falls vorhanden;
     sonst Schwelle bei 0.5. → im Spike prüfen, welche Felder die beiden Presets wirklich haben.
   - `finishToMaterialId()` entfällt bzw. bleibt nur für Migration.
   - Rotations-Assets bleiben unverändert (nutzen `gloss` bereits).

4. **UI**
   - `ImageFinishSelect` ersetzen durch `RangeSlider` „Finish (Matt ↔ Glossy)“, gleiche
     Step-/Decimal-Konstanten wie bei Print-Settings (`NORMALIZED_STEP`, `NORMALIZED_DECIMALS`).
   - Passepartout: „Passepartout finish (Matt ↔ Glossy)“.
   - Damit gibt es für Rotations- und Flach-Assets denselben Regler, die Sonderverzweigung
     `printSettings ? null : <ImageFinishSelect>` fällt weg.

5. **Allgemeine Regel (für künftige UI)**
   - Notiz in `_docs/diaries/diary-code-decisions.md`: binäre/stufige Material-Eigenschaften
     werden als Schieberegler (0–1) umgesetzt, nicht als Dropdown.

## Offene Fragen

- **Materials-Panel-Kopplung:** Heute springt das Dropdown um, wenn im Materials-Panel Paper/Print Glossy
  zugewiesen wird. Vorschlag: Bildflächen-Finish ist ab jetzt nur noch über den Regler steuerbar;
  andere Material-Zuweisungen auf Bildflächen bleiben wie bisher (Regler dann wirkungslos → ausgrauen).
- **Zwischenwerte-Optik:** Reicht lineare Interpolation, oder soll die Kurve (z. B. Roughness quadratisch)
  angepasst werden, damit der Regler sich gleichmäßig anfühlt? Vorschlag: zuerst linear, visuell prüfen.
- Gibt es weitere Dropdowns dieser Art (z. B. im Materials-Panel), die ebenfalls umgestellt werden sollen?

## Schritte

1. Spike: Paper- und Print-Glossy-Preset vergleichen, interpolierbare Felder festlegen.
2. Datenmodell + Migration + Unit-Tests.
3. Interpolations-Helper + Einbau in `material-resolver.ts` und `populate-primitives.ts`.
4. UI-Umstellung in `ImageSurfaceFields.tsx`.
5. Visuelle Prüfung (0 / 0.5 / 1) an Picture, Smartphone, Tapete, Passepartout.
6. `npx vitest run`, `npm run lint`, `npm run build`, Commit auf `main`.
