# Plan: Paper – Finish im Material-Panel + Maserung (Größe / Tiefe)

Status: **Entwurf, wartet auf Freigabe**
Datum: 2026-11-04

## Ist-Zustand (geprüft)

- „Print GlossyCoated" / „Print MattPaper" gibt es nicht mehr. Es existiert **ein** Material `Paper` (`MATERIAL_PAPER_ID`, Profil `paper-grain`).
- Matt↔Glossy ist ein Regler **pro Asset-Slot / Bildfläche** (`FinishSlider`, `slotGloss`, `src/scene/paper-gloss.ts` → `applyPaperGloss`). Er erscheint in `MaterialSelect` und `ImageSurfaceFields`, sobald dort Paper gewählt ist.
- Im **Material-Panel** (Paper-Preset selbst) gibt es keinen Finish-Regler, nur Roughness/Clearcoat/Normal scale/Tile scale. Das ist der Teil, der verwirrt.
- Maserung: `paper-grain.ts` nutzt feste Frequenzen (Fasern 0.25×6, Mikro 72×96) und feste Bump-Stärke (`normalScale * 0.025`). `tileScale` skaliert nur das Sampling-UV, die Korngröße ist nicht separat einstellbar. Beim Glossy-Ende wird `normalScale` auf 0.15 gedrückt → die Maserung verschwindet, obwohl es raues Glossy-Papier gibt.

## Ziel

1. Paper-Preset im Material-Panel bekommt denselben **Finish-Regler (Matt ↔ Glossy)** wie am Asset. Vorschau/Preset-Standard = Default-Gloss des Presets; am Asset bleibt der Slot-Wert maßgeblich (überschreibt).
2. Neu: zwei Regler für die Maserung, **unabhängig vom Gloss**:
   - **Grain size** – Größe des Korns/der Fasern.
   - **Grain depth** – Tiefe/Relief der Maserung.
3. Beide Regler auch in den Asset-Einstellungen (neben dem Finish-Regler), pro Slot/Fläche gespeichert wie `slotGloss`.
4. Raues Glossy muss sichtbar sein: Grain depth wird **nicht** mehr an Gloss gekoppelt (heute `normalScale` 0.85→0.15). Gloss steuert nur Roughness/Clearcoat; die Maserung wirkt im Clearcoat-Reflex weiter (Bump auf der Basisnormale, Clearcoat-Normal folgt ihr, damit die Rauheit im Glanz sichtbar bleibt).

## Umsetzung

1. **Spec** (`material-spec.ts`): `paper-grain` bekommt `grainSize` und `grainDepth` (min/max/step/default). Panel rendert sie generisch.
2. **Preset-Felder** (`material-types.ts`): `grainSize?`, `grainDepth?` am Preset; `slotGrainSize?`, `slotGrainDepth?` neben `slotGloss` (analog `AssetMaterialSlots`). Keine Migration (pre-release).
3. **Shader** (`paper-grain.ts`): Frequenzen mit `grainSize` multiplizieren (Fasern + Mikro), Bump-Stärke aus `grainDepth`. Als TSL-Uniforms führen, damit Regler live ohne Neubau wirken (Phase-6-Mechanik, `isStructuralPresetChange` nicht auslösen).
4. **`applyPaperGloss`**: `normalScale`-Lerp entfernen; neuer Parameter-Satz (gloss, grainSize, grainDepth) → `applyPaperFinish`.
5. **Material-Panel**: Finish-Regler bei Paper + Grain size / Grain depth. Standard-Gloss des Presets (`paperGloss` am Preset) für Vorschau/neue Slots.
6. **Asset-UI**: `MaterialSelect` zeigt bei Paper Finish, Grain size, Grain depth; Store `setEntityMaterialGloss` → erweitern (`setEntityMaterialPaperFinish`). Bildflächen/Passepartout analog.
7. **Tests**: Spec-Test, `applyPaperFinish` (Grain unabhängig vom Gloss), Resolver gibt Slot-Werte durch, Live-Update-Test.
8. Diary-Eintrag: Grain ist vom Gloss entkoppelt (Grund: raues Glossy-Papier).
9. `npx vitest run`, `npm run lint`, `npm run build`, Commit auf `main`.

## Offene Fragen

- Soll der Finish-Regler im Material-Panel den **Preset-Default** setzen (neue Slots starten damit), oder nur Vorschau sein? Vorschlag: Preset-Default.
- Reichen Grain size/depth als Reglerbereich 0.25–4× bzw. 0–1, oder andere Skala (z. B. Größe in mm)? Vorschlag: relative Faktoren, Default 1.
- Visuelle Abnahme nur lokal möglich (kein WebGPU im Container).
