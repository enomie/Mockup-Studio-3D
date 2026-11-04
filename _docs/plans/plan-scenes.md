# Plan: Scenes

## Problem

Heute gibt es genau **einen** Szenenzustand (Autosave in IndexedDB, `project-persistence.ts`).
Ein Arrangement laden (`loadArrangement` → `SceneApi.applyArrangement`) **ersetzt alle Assets**.
Wer ein Arrangement ändert und dann ein anderes lädt, verliert seine Arbeit (nur Undo hilft).

## Begriffe

- **Project** = der gespeicherte Autosave-Slot. Vorerst genau eins (Project-Verwaltung kommt später, eigener Plan).
- **Scene** = eigenständiger Zustand eines Setups: Objekte, Licht, Schatten, Umgebung, Kamera, Boden.
- **Arrangement** = nur noch eine **Vorlage**, die beim Anwenden in eine Scene **kopiert** wird.
- **Libraries** (Bilder, Materialien, Farben, Profile, Presets, Baked Assets) bleiben **projektweit** und werden von allen Scenes geteilt.

## Was gehört in eine Scene (pro Scene, kein Teilen)

Aus `SceneSessionState`: `entities`, `patchNodes`, `cameraView`, `cameraSlots`, `gravityScale`.
Aus `PERSISTED_SETTING_KEYS`: `lighting`, Sky-/Fog-/Reflection-Felder, `ground`,
`activeEnvironmentId`, `activeLightingPresetId`, `activeArrangementId`.
Nicht pro Scene (bleiben global): `viewportHelpers`, Export-Einstellungen, Profil-Snap.

## Datenmodell

```ts
interface SceneDocument {
  id: string;
  name: string;
  createdAt: string;
  session: SceneSessionState;   // Objekte + Kamera + Gravity
  settings: PerSceneSettings;   // Licht, Sky, Fog, Reflection, Ground, aktive Preset-IDs
}
// ProjectSnapshot: scenes: SceneDocument[]; activeSceneId: string; globale settings; libraries
```

Kein Migrationscode (Pre-Release): `PROJECT_SCHEMA_VERSION` hochzählen, alter Snapshot wird verworfen.

## Ablauf

- **Wechseln:** aktuelle Scene erfassen und in `scenes[]` zurückschreiben, dann Ziel-Scene per `restoreSession` + Settings in den Store laden.
- **Neue Scene:** Default-Scene oder Duplikat der aktuellen.
- **Arrangement anwenden:** ändert nur die aktive Scene (wie heute, mit Undo). Andere Scenes bleiben unberührt, nichts geht mehr verloren.
- **Autosave:** schreibt weiter das ganze Projekt; erfasst vorher die aktive Scene.
- **Undo/Redo:** Historie gilt pro Scene und wird beim Wechsel geleert (einfachste Variante, siehe offene Fragen).

## UI

- Neuer Eintrag **Scenes** im linken Panel (`LEFT_SHELL_NAV` in `shell-nav.ts`, `ScenesPanel.tsx`): Liste, aktive hervorgehoben; Neu, Duplizieren, Umbenennen, Löschen (mindestens eine Scene bleibt).
- Optional später: Scene-Tabs in der Top-Bar, Thumbnails.

## Schichten (Regeln aus AGENTS.md)

- Neu `src/scene/scene-document.ts` (Typen, reine Funktionen, Tests).
- Store: `app-store-scenes.ts` (nur Spiegel + Aufruf `SceneApi`, keine Logik).
- Engine-Grenze bleibt `SceneApi` (`restoreSession`, Capture von der Persistenz nach `SceneApi`/Store verschieben).
- Persistenz: `project-snapshot.ts` / `project-persistence.ts` auf `scenes[]` umbauen.
- Tests: Snapshot-Roundtrip mit mehreren Scenes, Wechsel erhält Änderungen, Löschen der aktiven Scene, Store-Test für Wechsel.
- Doku: Requirements + Tagebucheintrag (Warum pro Scene statt geteiltem Licht).

## Phasen

1. Datenmodell + Persistenz (`scenes[]`, aktive Scene, Tests).
2. Wechsel-Logik (capture/restore inkl. Per-Scene-Settings).
3. `ScenesPanel` + Nav-Eintrag.
4. Doku, Tagebuch, diesen Plan löschen.

## Offene Fragen

1. Undo-Historie beim Wechsel leeren (einfach) oder pro Scene halten?
2. Neue Scene: leer oder Kopie der aktuellen?
3. Soll "Arrangement anwenden" optional eine **neue** Scene anlegen statt die aktive zu überschreiben?
4. Thumbnails sofort oder Phase 2?
