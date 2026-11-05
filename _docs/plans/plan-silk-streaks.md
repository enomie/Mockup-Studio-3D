# Plan: Silk mit feinen Streifen und Störungen statt Webmuster

Status: **Umgesetzt** – visuelle Abnahme (Werte justieren) lokal offen.
Datum: 2026-11-05

## Problem
`Fabric Silk` (`silk-fine`) glänzt kaum:
- Das Webmuster (150 Fäden pro Tile × `tileScale 20` ≈ 0,3 mm) ist fast immer kleiner als ein Pixel. Der Shader blendet es dann absichtlich aus → praktisch glatte, matte Fläche.
- Nicht-Metall, `roughness 0.45`, `anisotropy 0.2`, Sheen nur an streifenden Winkeln → wenig Glanz.
- `Brushed Aluminum` wirkt besser: lange, feine Streifen (Rauschen stark in Faserrichtung gedehnt) bleiben auch auf Distanz sichtbar, dazu ein anisotroper Highlight.

## Ziel
Silk bekommt feine, lange Linien wie bei Brushed, aber **gestört** (wellig, mit Bändern und Aussetzern), plus einen deutlich sichtbaren anisotropen Seidenglanz. Das Webmuster entfällt komplett.

## Entscheidung: Silk umbauen (kein zusätzliches Material)
- Profil-ID `silk-fine` und Preset `material-silk` bleiben. Nur das Aussehen ändert sich → minimale Änderungen, kein Umbenennen in Registry/Spec/Tests.
- `fabricDrape: { profile: 'silk' }` (Stoffphysik) bleibt unberührt.

## Umsetzung

### 1. `src/materials/procedural/silk-fine.ts` (neu geschrieben)
Basis: Streifenlogik wie `metal-brushed.ts` (Rauschen quer zur Faser hoch-, entlang niedrigfrequent). Zusätzlich:
- **Wellige Linien (Domain Warping):** Die Koordinate quer zur Faser wird mit einem langsamen Rauschen entlang der Faser verschoben → Linien laufen leicht gekrümmt statt schnurgerade.
- **Bänder:** Ein sehr niederfrequentes Rauschen quer zur Faser erzeugt breitere hellere/dunklere Zonen (unterschiedliche Fasergruppen).
- **Aussetzer:** Ein langsames Rauschen entlang der Faser schwächt einzelne Streifen stellenweise ab oder lässt sie abbrechen.
- **Ausgabe:** Relief (`bumpMap`, sehr schwach wie bei Brushed, um zerdrückte Schwarzwerte an Kanten zu vermeiden), leichte Farbmodulation, Roughness-Schwankung pro Linie (stärker als bei Brushed, ca. ±0,08) → lebendiges Glänzen.
- **Antialiasing:** Streifen sind quer zur Faser fein. Wie bisher bei zu kleiner Pixelgröße (`fwidth`) auf den Mittelwert ausblenden, damit kein Moiré entsteht.
- **Projektion:** unverändert (`uv`/`planar-meters` direkt, sonst `triplanarScalar`).

### 2. Preset `material-silk` (`src/data/material-presets.ts`)
Startwerte, per Augenschein zu justieren:
- `roughness` 0.45 → ca. 0.30
- `anisotropy` 0.2 → ca. 0.65
- `tileScale` 20 → so, dass der Linienabstand ca. 0,5–1 mm beträgt (wie Brushed, Startwert ca. 28)
- `sheen` bleibt, `normalScale` ca. 0.4 bleibt

### 3. Spec (`src/materials/material-spec.ts`, `silk-fine`)
Spiegelt die neuen Defaults (Roughness, Tile scale, Anisotropie). Label bleibt `Fabric Silk`.

### 4. Tests
- `src/materials/material-spec.test.ts`: Silk-Test prüft weiterhin Nicht-Metall + Sheen; Defaults anpassen, falls dort geprüft.
- `src/engine/material-resolver.test.ts`: Silk-Test bleibt gültig (Sheen 1 / 0.35); Anisotropie-Wert ergänzen.
- `procedural-params.test.ts` prüfen, ob Silk-Defaults dort stehen.

## Offen / Risiko
- Anisotropie bei Nicht-Metallen wirkt in three.js schwächer als bei Metall. Falls der Glanz nicht reicht: Roughness weiter senken oder einen kleinen Clearcoat-Anteil ergänzen (nur nach Sichtprüfung).
- Das Ergebnis ist visuell; Abnahme lokal durch dich (`git pull`, `npm run dev`, Silk auf Stoff und auf einem Objekt prüfen).

## Prüfung vor dem Push
`npx vitest run`, `npm run lint`, `npm run build`.

## Nach Umsetzung
- Plan löschen, „Wie es jetzt ist“ in die Material-Doku bzw. Requirements, „Warum“ (Gewebe unsichtbar, Streifen wirken besser) ins Tagebuch `_docs/diaries/diary-code-decisions.md`.
