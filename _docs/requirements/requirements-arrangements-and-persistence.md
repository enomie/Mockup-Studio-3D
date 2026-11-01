# Arrangements, Persistenz & Reset

## Arrangements (Left Main Panel → „Arrangements“)

- Ein Arrangement ist eine gespeicherte Zusammenstellung von **Szenen-Assets**: Typ, Position, Rotation, Größe, Material, Bilder und alle Kind-Parameter. **Nicht** enthalten: Environment, Licht, Kamera (eigene Presets).
- **Built-ins** (`src/data/builtin-arrangements.ts`), als Spawn-Regeln (`kind: 'spawn'`, Kind-Defaults + Position/Rotation/Material):
  - **Clothing**: Block + Silk-Fabric-Cloth (0,5 m hoch). **Start-Szene** der App.
  - **Devices**: Monitor, Tablet, Smartphone
  - **Beverages**: 2 Dosen, 2 Weinflaschen
- **Add new** speichert die aktuellen Szenen-Entities als User-Arrangement (`kind: 'entities'`, vollständige Entity-Snapshots). Name „My arrangement“, „My arrangement 2“ usw.
- **Laden ersetzt** alle Assets der Szene. Das ist **ein** Undo-Schritt („Load arrangement <Name>“), der auch die aktive Markierung zurücksetzt. Die Kamera bleibt unverändert. User-Entities bekommen beim Laden neue IDs.
- User-Arrangements: **Rename, Duplicate, Remove**. Built-ins lassen sich nur duplizieren. Duplicate und Remove ändern die Szene nicht.
- **Gemeinsame Patch-Punkte** (Patch-Nodes) und Kanten-Verknüpfungen (`edgeLinks`) werden mitgespeichert. Beim Laden bekommen Entities und Nodes neue IDs (`remapArrangementIds`), alle Verweise (`uses`, `PatchPoint.nodeId`, `partnerEntityId`) werden umgeschrieben. Fehlt ein Node (ältere Speicherstände), wird der Punkt zu einem normalen Punkt an seiner gespeicherten Position.

Code: `src/scene/arrangement-types.ts`, `src/ui/store/app-store-arrangements.ts`, `src/ui/panels/ArrangementsPanel.tsx`, Engine `MockupEngine.applyArrangement` → `AssetSystem.replaceWithSpawns` / `replaceWithEntities`.

## Persistenz (Neu laden stellt den Letztstand wieder her)

- Speicherort: **IndexedDB** `mockup-studio-3d`. Store `project` (ein Datensatz `current`) + `image-blobs` (Dateien hochgeladener Bilder).
- Gespeichert wird 500 ms nach jeder Store-Änderung und beim Verlassen der Seite (`pagehide`).
- Inhalt (`ProjectSnapshot`, `schemaVersion` = 1):
  - **Einstellungen:** Licht, Sky/Fog/Reflection, Ground, Viewport-Helpers, Export-Einstellungen, aktive Environment/Light-Rig/Arrangement-ID
  - **Libraries:** Materials und Colors komplett, weil Built-ins editierbar sind. Bei Environments, Light rigs, Arrangements und Images nur User-Einträge. Dazu die User-Baked-Assets.
  - **Szene:** Entities, Patch-Nodes, Kamera-Ansicht und Slots, Gravity
- Laden: in `main.tsx` **vor** dem ersten Render. Built-ins kommen immer aus dem Code, neue Built-ins erscheinen also auch bei alten Speicherständen. Die Szene wird nach dem Engine-Start ohne Undo-Schritt eingesetzt (`SceneApi.restoreSession`).
- Falsche `schemaVersion` oder kaputte Daten → werden ignoriert, die App startet mit Defaults. Der nächste Autosave überschreibt den Datensatz.

Code: `src/ui/persistence/*`.

## Settings (Right Main Panel → „Settings“)

- **Reset all…** (mit Bestätigung) löscht beide IndexedDB-Stores und lädt die Seite neu. Danach ist alles im Werkszustand (Clothing, Default-Environment, …).
