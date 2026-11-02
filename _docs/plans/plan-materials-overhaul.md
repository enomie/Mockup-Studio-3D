# Plan: Materialien – Live-Update & Shader-Überarbeitung

Status: **Entwurf – wartet auf Freigabe**
Datum: 2026-11-02

## Ausgangslage

Analyse (ohne Code-Änderung) hat zwei Problemfelder ergeben:

1. Änderungen im Material-Panel kommen bei vielen Objekten nicht live im Viewport an.
2. Die prozeduralen Shader und ihre Parameter sind teils falsch, teils wirkungslos, und Panel und Shader haben keine gemeinsame Parameterbeschreibung.

Umsetzung in **5 Phasen**, jede einzeln committbar und testbar (`npx vitest run`, `npm run lint`, `npm run build`).

---

## Phase 1 – Live-Update reparieren (Bugfix, höchste Priorität)

### Ursache
`entityUsesMaterial` (`src/engine/asset-system.ts:942`) prüft eine handgepflegte Liste von 22 Slots. Es fehlen:
`patchMaterialId`, `capMaterialId`, `ringMaterialId`, `bodyMaterialId`, `tireMaterialId`, `rimMaterialId`, `pathMaterial0Id` … `pathMaterial9Id`.
Weitere Lücken:
- Bild-Oberflächen beziehen ihr Material über `surface.finish` / `passepartoutFinish` (`finishToMaterialId`) – nie erkannt.
- Entities ohne `materials` fallen beim Bauen auf `definition.getDefaultMaterials()` zurück, `entityUsesMaterial` liefert aber `false`.
- Legacy-IDs (`migrateMaterialId`) werden beim Vergleich nicht normalisiert.

### Änderungen
- `src/scene/material-types.ts`: Konstante `MATERIAL_ENTITY_SLOTS: readonly MaterialEntitySlot[]` als **einzige** Quelle; Typ `MaterialEntitySlot` daraus ableiten (`typeof …[number]`).
- Neue Funktion `collectEntityMaterialIds(entity, definition, imageSurface?)` → `Set<string>` (migrierte IDs):
  - alle Slots aus `entity.materials ?? definition.getDefaultMaterials()`
  - Bild-Finish + Passepartout-Finish, falls das Entity eine Bildoberfläche hat
- `entityUsesMaterial` nutzt diese Funktion; Vergleich mit `migrateMaterialId(materialId)`.
- Fallback-Sicherheit: Wenn ein Material nicht zugeordnet werden kann (unbekannte Quelle), lieber alle Entities neu bauen als keines (optional, nur falls Tests Lücken zeigen).

### Tests
- Test: jeder Eintrag aus `MATERIAL_ENTITY_SLOTS` wird erkannt (Schleife über alle Slots).
- Test: Entity ohne `materials` erkennt Default-Material.
- Test: Bild-Entity erkennt Finish-Material (`material-paper`, `material-glossy-print`).
- Test: Legacy-ID `material-silver` ↔ `material-chrome`.

---

## Phase 2 – Gemeinsame Parameter-Beschreibung pro Profil

### Ziel
Eine Tabelle pro Material-Typ/Profil, aus der **Panel** (welche Regler, Bereich, Schritt, Default) und **Engine** (Defaults, Material-Klasse) lesen. Ersetzt die verstreuten Sonderregeln in `MaterialsPanel.tsx` (`showNormalScale`, `showPatternSection`, `showClearcoatInFinish`, `showAnisotropySection`, `tileScaleConfig`) und `create-textured-material.ts` (`usePhysical`) sowie `defaultTileScaleForProfile`.

### Neue Datei `src/materials/procedural/procedural-profile-spec.ts`
```ts
interface ParamSpec { min: number; max: number; step: number; default: number; decimals: number }
interface ProfileSpec {
  label: string;
  physical: boolean;          // MeshPhysicalNodeMaterial
  roughness: ParamSpec;       // Regler-Bereich = tatsächlich wirksamer Bereich
  metalness?: ParamSpec;      // fehlt → nicht einstellbar, fest
  normalScale?: ParamSpec;
  tileScale?: ParamSpec;
  seed: boolean;
  clearcoat?: { amount: ParamSpec; roughness: ParamSpec };
  anisotropy?: { amount: ParamSpec; rotation: ParamSpec };
  lineColor?: boolean;
  gridUnit?: boolean;
}
export const PROCEDURAL_PROFILE_SPECS: Record<ProceduralProfileId, ProfileSpec>;
```
Plus Specs für `solid-pbr`, `transmission` (inkl. `ior`, `surfaceNormalScale`, ggf. `tileScale`/`seed` für Glas-Oberfläche) und `analysis`.

### Regeln
- **Kein Regler ohne Wirkung**: Jeder angezeigte Parameter muss im Shader sichtbar wirken (Test über Spec ↔ Builder-Signatur, siehe Phase 5).
- **Keine versteckten Hart-Overrides**: Holz-Clearcoat (0.08/0.35) wird Spec-Default und als Regler angezeigt.
- Defaults nur noch in der Spec (Panel, `proceduralParamsFromPreset`, `glassSurfaceParamsFromPreset`, `addMaterial` lesen von dort).
- `MaterialsPanel.tsx` rendert Regler generisch aus der Spec.

---

## Phase 3 – Shader-Korrekturen (Mathematik)

### 3.1 Noise-Wertebereich
`mx_noise_float` liefert ≈ [-1, 1]. Neuer Helfer in `tsl-noise.ts`:
- `noiseSigned(p)` → [-1, 1] (direkt)
- `noise01(p)` → `noise.mul(0.5).add(0.5)` → [0, 1]

Alle Stellen mit `.sub(0.5)` auf Rohrauschen ersetzen (metal-polished, plastic-surface, paper-grain, wood-soft, wood-porous, glass-surface, concrete-porous). Amplituden danach visuell nachjustieren, sodass der Look erhalten bleibt (nur Bias entfernen).

### 3.2 Roughness-Clamps entfernen
Fest codierte `clamp(…, lo, hi)` ersetzen durch `clamp(…, 0.02, 1)`. Der Variationsanteil bleibt, der Basiswert kommt **vollständig** vom Regler. Die bisherigen Grenzen werden zu Regler-Bereich/Default in der Spec (z. B. Beton Default 0.92, Papier 0.85), nicht zu Shader-Grenzen.

| Profil | bisher | neu |
|---|---|---|
| metal-polished | 0.02–0.2 | Regler 0–0.4, Default 0.08 |
| metal-brushed | 0.12–0.5 | Regler 0.05–0.7, Default 0.3 |
| wood-soft/-porous | 0.28–0.72 | Regler 0.2–0.9 |
| paper-grain | 0.75–1 | Regler 0.4–1 |
| fabric-linen | 0.75–0.98 | Regler 0.5–1 |
| concrete-stained | 0.85–1 | Regler 0.5–1 |

### 3.3 Lineare Tile-Skalierung
- `fabric-linen`: `exp(tileScale/3 - 0.5)` entfernen; `tileScale` = Wiederholungen pro Meter, linear wie alle anderen Profile.
- `wood-soft` meter-3d: `detail = exp(tileScale/3 - 1)` ebenso linearisieren.
- Bestehende Presets: Default-tileScale so wählen, dass der aktuelle Look bei Default ungefähr gleich bleibt.

### 3.4 Triplanar korrekt mischen
`avgUv`-Mischung der Koordinaten (wood-soft, wood-porous, concrete-porous) ersetzen durch Mischung der **Ergebnisse** (je Ebene Rauschen auswerten, dann gewichten). Gemeinsamer Helfer `triplanarScalar(fn, tileScale, offset)` in `procedural-triplanar-meters.ts`.

### 3.5 Grid-Paper Anti-Aliasing
Linienmaske mit `fwidth` (Screen-Space-Ableitung) glätten; bei Zellen kleiner als ~1 Pixel ausblenden zur mittleren Linienfarbe (gegen Moiré beim mm-Raster).

---

## Phase 4 – Profile fachlich überarbeiten

### 4.1 Eigener Silk-Shader (`silk-fine`)
Neue Datei `silk-fine.ts`, statt Metall-Builder:
- Physical-Material mit `sheen` / `sheenColor` (aus Farbe abgeleitet) und `sheenRoughness`
- feine Webstruktur (Kett-/Schussfaden, Bump über `normalScale`), Anisotropie optional
- metalness fest 0
- Spec: roughness, normalScale, tileScale, seed, sheen

### 4.2 Metall gebürstet
- `seed` und `normalScale` wirklich nutzen: feine Streifen als Bump entlang der Bürstrichtung (schwach, mit Begrenzung gegen die früher beobachteten schwarzen Kanten), Rauheitsvariation sichtbar (statt ±0.006).
- Anisotropie bleibt Hauptträger; `tileScale`/`seed` dann im Panel anzeigen.

### 4.3 Beton porös
Bandpass-Konturlinien ersetzen durch echte runde Poren: Zell-/Worley-Rauschen (`mx_worley_noise_float`), Pore = `smoothstep` auf Abstand zum Zellmittelpunkt, Dichte über Schwellwert. Parameter: tileScale (Porengröße), seed, normalScale (Tiefe).

### 4.4 Beton fleckig, Leinen, Papier, Kunststoff
Nur Phase-3-Korrekturen + Regler gemäß Spec; Look anschließend visuell abgleichen.

### 4.5 Glas
`tileScale` und `seed` der Oberflächen-Mikrostruktur im Panel anzeigen (Spec), oder aus Builder entfernen – Entscheidung: **anzeigen** (Oberflächenstruktur bei Milchglas sinnvoll).

### 4.6 Wahl der Material-Klasse
`usePhysical` aus Spec (`physical`) + dynamisch, wenn clearcoat/anisotropy/sheen > 0. Solid-PBR mit clearcoat bleibt wie bisher.

---

## Phase 5 – Tests & Abnahme

- Unit-Tests:
  - `procedural-profile-spec`: jedes `ProceduralProfileId` hat eine Spec; Defaults liegen im Bereich.
  - `proceduralParamsFromPreset`: Defaults kommen aus Spec.
  - Panel: zeigt genau die Regler der Spec (Testing-Library, ein Test pro Material-Typ).
  - Live-Update (Phase 1).
- Visuelle Abnahme: Testszene mit je einem Objekt pro Profil (Box, Kugel, Rahmen, Boden), Screenshots vorher/nachher über Playwright, ablegen unter `_docs/` zum Vergleich.
- Migration: gespeicherte User-Presets laden weiter; Werte außerhalb des neuen Reglerbereichs werden beim Laden geklemmt (in `project-persistence`).
- `npx vitest run`, `npm run lint`, `npm run build` vor jedem Push.

---

## Reihenfolge / Commits

1. Phase 1 (eigenständiger Bugfix, sofort nutzbar)
2. Phase 2 (Spec + Panel generisch, ohne Look-Änderung)
3. Phase 3 (Shader-Mathematik)
4. Phase 4 (Silk, Brushed, Beton porös, Glas)
5. Phase 5 läuft je Phase mit; Abschluss-Screenshots am Ende

## Risiken

- Look-Änderungen bestehender Szenen durch Noise-Bias-Korrektur und lineare Skalierung → Defaults bewusst so wählen, dass der Standard-Look gleich bleibt; Vorher/Nachher-Screenshots.
- WebGPU-Shader-Kompilierzeit bei Live-Updates (jede Änderung = neues Material) → falls spürbar: später Parameter als `uniform` statt Konstanten führen, damit Farbe/Rauheit ohne Neukompilieren wirken (optionale **Phase 6**).

## Offene Fragen an dich

1. Phase 6 (Uniforms für flüssige Regler ohne Neubau) gleich mit einplanen?
2. Silk: eigener Shader mit Sheen wie vorgeschlagen ok?
3. Bestehender Look soll bei Default-Werten möglichst gleich bleiben – oder darf er sich verbessern/ändern?
