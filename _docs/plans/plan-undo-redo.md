# Plan: Undo / Redo

Status: **Abgestimmt – wartet auf Start**

## Ausgangslage

- Es gibt aktuell **kein** Undo/Redo in der App.
- Szenen-Objekte liegen im `EntityRegistry` als **unveränderliche** `AssetEntity`-Objekte („entities are never mutated in place“). Jede Änderung erzeugt eine neue Kopie → ideale Basis für Snapshot-Undo (alter Stand bleibt einfach als Referenz erhalten, kostet kaum Speicher).
- Alle Änderungen laufen über `SceneApi` (`setEntityTransform`, `setKindParams`, `setEntityMaterial`, `addAsset`, `removeEntity`, …).

## Bedienung

- **UI:** Im Sub-Navbar (`TopSubBar`: „Scene › Default  W E R T“) ganz rechts zwei Icon-Buttons **Undo** (↶) und **Redo** (↷). Ausgegraut, wenn nichts da ist. Tooltip mit Kürzel und Beschreibung des Schritts, z. B. „Undo: Paste point (Ctrl+Z)“.
- **Tastatur:**
  - Undo: **Ctrl+Z** / **⌘Z**
  - Redo: **Ctrl+Shift+Z** / **⌘⇧Z**, zusätzlich **Ctrl+Y** (Windows-Gewohnheit)
  - Nicht aktiv, wenn ein Text-/Zahlenfeld Fokus hat (dort gilt das Undo des Browsers fürs Feld).
- Neue Änderung nach Undo verwirft den Redo-Stapel (Standardverhalten).
- Verlauf: max. **100 Schritte**.

## Umfang (was ist undo-bar)

**Phase 1 (dieser Plan): Szenen-Objekte**
- Hinzufügen / Löschen von Objekten
- Transform (Move/Rotate/Scale über Gizmo und Panel-Felder)
- Alle Objekt-Parameter (`setKindParams` – inkl. Patch-Punkte, Point-Paste, Punkt hinzufügen/entfernen, Mirror)
- Material, Bild/Faces, Tints, Sichtbarkeit, Geometrie-Sichtbarkeit, Physik-Modus/Dichte, Name
- Die **Auswahl** wird mit-wiederhergestellt (nach Undo ist das betroffene Objekt ausgewählt), ist aber selbst **kein** eigener Schritt.

**Nicht undo-bar (bewusst):**
- Kamera-Bewegung und Kamera-Slots (sonst würde jedes Umschauen den Verlauf füllen)
- Auswahl wechseln, Tool wechseln (W/E/R/T), Viewport-Helfer, Export-Einstellungen
- Laufende Physik-Simulation (Start/Reset haben eigene Logik)

**Phase 2 (beschlossen):** Licht, Environment, Ground, Material-/Farb-Bibliothek – „alles“. Gleicher Snapshot-Mechanismus, der Verlaufseintrag wird um diese Zustände erweitert. Kamera, Auswahl und Tool-Wechsel bleiben weiterhin außen vor.

## Technischer Ansatz

**Snapshot statt Befehls-Umkehr.** Ein Verlaufseintrag = Liste der Entities vorher + nachher (+ ausgewählte Entity). Undo setzt die Liste „vorher“ zurück, Redo „nachher“. Vorteil: Jede bestehende und künftige Änderung ist automatisch undo-bar, keine Umkehr-Logik pro Funktion.

1. **`HistoryManager`** (neues Modul, rein, testbar): `record(before, after, label)`, `undo()`, `redo()`, `canUndo/canRedo`, Labels, Limit.
2. **`EntityRegistry.replaceEntities(entities)`**: setzt einen gespeicherten Stand zurück und baut nur die Objekte neu, deren Entity-Referenz sich geändert hat (unveränderte bleiben unangetastet → schnell).
3. **Einhängen in `SceneApi`**: Jede ändernde Methode läuft durch einen Wrapper `withHistory(label, fn)`, der den Stand vor/nach vergleicht und bei Unterschied einen Eintrag anlegt.
4. **Gesten zusammenfassen** (wichtig, sonst 200 Schritte pro Maus-Zug):
   - Gizmo-Drag (Objekt und Patch-Handles): ein Schritt pro Drag, gespeichert beim Loslassen (`dragging-changed`/`pointerup`).
   - Zahlenfelder mit Ziehen/Scrubben und Slider: ein Schritt pro Interaktion (Start → Ende).
   - Fallback: Änderungen am selben Objekt + selben Feld innerhalb von ~500 ms werden zusammengefasst.
5. **Store/UI**: `canUndo`, `canRedo`, `undoLabel`, `redoLabel` im App-Store; Buttons + Shortcut-Hook (analog `useViewportToolShortcuts`).
6. **Sonderfälle**:
   - Bilder: Undo von „Objekt löschen“ muss Texturen wieder laden – Bild-IDs bleiben im Entity, `releaseImageTexture` erst, wenn die Entity aus dem ganzen Verlauf verschwunden ist.
   - Physik: Während eine Simulation läuft, ist Undo deaktiviert; Reset/Stop erzeugt keinen Eintrag.
   - Patch-Handle-Auswahl / Add-Point-Modus werden bei Undo beendet, falls ihr Punkt nicht mehr existiert.

## Tests (Vitest)

- `HistoryManager`: record/undo/redo, Redo-Stapel wird verworfen, Limit 100, Labels.
- Zusammenfassen: viele Updates in einer Geste → ein Schritt.
- Registry: `replaceEntities` stellt Add/Remove/Transform/Params korrekt wieder her, unveränderte Objekte werden nicht neu gebaut.
- Patch: Point-Paste → Undo → Redo ergibt identische Punkte.

## Umsetzungsschritte

1. HistoryManager + Tests
2. `replaceEntities` im Registry
3. SceneApi-Wrapper + Gesten-Zusammenfassung (Gizmo, Felder)
4. Store, Buttons im TopSubBar, Shortcuts
5. Sonderfälle (Bilder, Physik, Patch-Auswahl)

## Entscheidungen

- Licht/Environment/Ground/Bibliotheken: **ja**, in Phase 2.
- Limit: **100 Schritte**.
