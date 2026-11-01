# Plan: Arrangements (+ Persistenz & „Reset all“)

Status: **Entwurf – wartet auf Freigabe**

## Ziel

Neuer Eintrag **„Arrangements“** im Left Main Panel. Ein Arrangement = gespeicherte Zusammenstellung von **Assets** (nicht Environment / Licht / Kamera – die haben eigene Presets).

- 3 Built-in-Arrangements: **Clothing** (heutiger Default), **Devices**, **Beverages**
- **„Add new“** unten → speichert die aktuellen Szenen-Assets als User-Arrangement
- User-Arrangements: **umbenennen, duplizieren, löschen** (wie Environments)
- Laden **ersetzt** alle Assets der Szene; **Undo** stellt die vorherige Szene wieder her
- App startet weiterhin mit **Clothing**

## Teil 1 – Arrangements

### Datenmodell (`src/scene/arrangement-types.ts`)

```ts
interface ArrangementAsset {          // ein Asset, ohne Laufzeit-ID
  assetKind: AssetKind;
  name: string;
  transform: EntityTransform;         // Position + Rotation
  sizeScale: number;
  depth?: number;
  screenImageId: string | null;
  materials?: AssetMaterialSlots;
  faces?, imageSurfaces?, geometryVisibility?, physicsBodyMode?,
  *Params? (block, beverageCan, wineBottle, handheld/monitor, fabricCloth, …)
}
interface ArrangementPreset {
  id: string; name: string; source: 'builtin' | 'user';
  description?: string; createdAt?: string;
  assets: ArrangementAsset[];
}
```

Kurz: der `SceneAssetEntity` ohne `id`/`visible`-Laufzeitinfos, tief geklont. Bilder werden nur per ID referenziert (fehlt ein Bild beim Laden → `null`).

### Built-ins (`src/data/builtin-arrangements.ts`)

| ID | Name | Inhalt |
|---|---|---|
| `arrangement-clothing` | Clothing | Block + Silk-Fabric-Cloth (= heutiges `DEFAULT_SCENE_ASSETS`) |
| `arrangement-devices` | Devices | Monitor hinten, Tablet + Smartphone (`handheld`-Varianten) davor |
| `arrangement-beverages` | Beverages | 2–3 Dosen (`beverage-can`) + 1–2 Flaschen (`wine-bottle`) |

`DEFAULT_SCENE_ASSETS` wird durch das Clothing-Arrangement ersetzt; `seedDefaultScene()` lädt intern dieses Arrangement → nur noch **ein** Weg, Assets aus einer Vorlage zu erzeugen.

### Store (`src/ui/store/app-store-arrangements.ts`)

Analog `app-store-environment-presets.ts`:
`loadArrangement(id)`, `saveCurrentAsArrangement()` (Name „My arrangement“, „… 2“, …), `updateArrangement(id, {name})`, `duplicateArrangement(id)`, `removeArrangement(id)`, State `arrangements[]` + `activeArrangementId`.

`loadArrangement`: alle Asset-Entities entfernen → Assets aus Vorlage erzeugen (über `AssetSystem`, inkl. Physik-Reconcile/Rebuild) → **ein** Undo-Eintrag „Load arrangement: <Name>“.

### Engine (`AssetSystem`)

- `captureArrangementAssets(): ArrangementAsset[]`
- `applyArrangement(assets)`: Clear + Spawn + Overrides (Transform, Material, Params, Bild…). Bestehende `applyDefaultSceneAssetOverrides` wird darin aufgehen.
- Undo: bestehende Szenen-History nutzen; falls die keinen „Batch replace“ kann, Snapshot vorher/nachher als ein Eintrag.

### UI

- `shell-nav.ts`: `{ id: 'arrangements', label: 'Arrangements', icon: LayoutGrid }` (Position: vor „Assets“)
- `ArrangementsPanel.tsx`: Liste wie `EnvironmentsPanel` (Built-ins, dann User), aktive Zeile markiert, Kontextaktionen Rename / Duplicate / Delete (nur User), unten Button **„Add new“**.

## Teil 2 – Persistenz (Reload stellt Letztstand wieder her)

Bisher gibt es keine Persistenz. Vorschlag:

- **IndexedDB** (nicht localStorage – hochgeladene Bilder / gebackene Assets sind zu groß).
- Gespeichert: Szenen-Assets, aktive Environment/Light-Rig/Kamera-Einstellungen, User-Presets (Environments, Light rigs, Arrangements, Colors, Materials), User-Images, User-Baked-Assets.
- Schreiben **debounced** (~500 ms) nach jedem `emit()`; Laden beim App-Start, sonst Fallback auf Clothing.
- Versionsfeld im Snapshot (`schemaVersion`); unbekannte/kaputte Daten → verwerfen, Default-Szene.

## Teil 3 – „Reset all“ im Right Main Panel

- Neuer Eintrag in `RIGHT_SHELL_NAV`: `{ id: 'project', label: 'Project', icon: Settings }` (Name diskutierbar)
- Sub-Panel mit Button **„Reset all…“** → Bestätigungsdialog → IndexedDB leeren, App in Default-Zustand (Clothing, Default-Environment, …).
- Später erweiterbar (Export/Import Projektdatei).

## Reihenfolge

1. Teil 1 (Arrangements) – eigener Commit, voll nutzbar auch ohne Persistenz
2. Teil 2 + 3 zusammen (Persistenz ohne Reset-Button wäre eine Falle)

## Tests

- `builtin-arrangements.test.ts`: IDs eindeutig, alle `assetKind` gültig
- Store: save/rename/duplicate/remove, Built-ins nicht editierbar
- Capture → Apply Round-Trip ergibt gleiche Assets
- Persistenz: Serialisieren/Deserialisieren, `schemaVersion`-Mismatch → Default

## Offene Punkte

- Icon / Position des Menüpunkts ok?
- Name für das neue rechte Panel („Project“?)
- Sollen beim Laden die Assets für die aktuelle Kamera neu gerahmt werden? (Vorschlag: nein)
