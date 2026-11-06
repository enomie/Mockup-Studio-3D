# Plan: Material-Änderungen zuverlässig anwenden (Audit + vereinfachtes System)

Status: Entwurf, wartet auf Freigabe. Es wurde noch kein Code unter `src/**` geändert.

## Problem

Brushed Aluminum (Patch) gebaut, im Materials-Panel die Farbe geändert: Der Viewport zeigt die neue Farbe
erst nach Neuladen. Der Store hat den Wert (Persistenz stimmt), die sichtbaren Materialien nicht.

## Befund aus der Code-Durchsicht (read-only)

Der Weg Panel → Viewport hat heute **drei Mechanismen** mit handgepflegten Weichen:

1. **Live-Update** (`applyMaterialValues` → `applyLivePreset` in `live-material.ts`): schreibt Werte in
   registrierte Materialien. Nur Materialien, die „vollständig vom Preset getrieben“ sind, sind live.
2. **Rebuild** (`invalidateMaterial`, debounced über `scheduleMaterialInvalidation`): Cache verwerfen und
   alle nutzenden Entities neu bauen.
3. **Entity-Zuordnung** (`entityUsesMaterial` / `collectEntityMaterialIds`): Welche Entities nutzen welches Preset.

Entscheidung Live vs. Rebuild fällt in `isStructuralPresetChange` (Feldlisten `STRUCTURAL_FIELDS`,
`FEATURE_FIELDS`) und in `usesPhysicalMaterial`, das die Klassenwahl aus `createTexturedMaterial`
und `createSolidPbrMaterial` **nachbaut** (zwei Wahrheiten, die auseinanderlaufen können). Dazu kommen
`baseCache`, `createUncached`/`unregisterLiveMaterial` und `objectIsFullyLive` als weitere Sonderfälle.

Isoliert geprüft (temporärer Test, wieder entfernt): Für `material-aluminium-brushed` ist das Material
live registriert (`MeshPhysicalNodeMaterial`, auch mit `gloss`, `tint`, `surfaceRole`), und `applyLivePreset`
erreicht es. **Die Engine-Logik allein erklärt den Fehler also nicht.** Die Ursache liegt in einer der
Nahtstellen unten und ist noch nicht bestätigt.

### Verdächtige Nahtstellen (zu prüfen, in dieser Reihenfolge)

1. **Zeitpunkt:** Async-Rebuild (`rebuildEntity`) läuft noch, während der Live-Update schon geschrieben
   wird. Das neu gebaute Material nutzt dann den alten Preset-Stand und wird nie nachgezogen.
2. **Mehrere Materialinstanzen pro Preset:** Cache-Material, `create(..., options)` mit
   Tint/Gloss/Rolle und `createUncached` sind getrennte Instanzen; eine davon ist evtl. nicht registriert
   oder wurde disposed (`onDispose` meldet sie ab), der Patch zeigt aber genau diese.
3. **Patch-Pfad:** `populate-triangle-patch.ts` löst `patchMaterialId ?? MATERIAL_ALUMINUM_BRUSHED_ID` auf,
   setzt `side = DoubleSide` auf dem (geteilten) Material und nutzt Spiegelkopien. Prüfen, ob dabei ein
   Material ersetzt/geklont wird, das nicht mehr live ist.
4. **Zuordnung:** Patch ohne `entity.materials` (Default-Fallback) → `entityUsesMaterial` muss den
   Default-Slot erkennen; nur relevant, wenn ein Rebuild nötig wäre.
5. **Viewport-Invalidierung** nach dem Schreiben der Uniforms (`emit()` ruft sie auf; Reihenfolge bei
   debounced Rebuild prüfen).

## Vorgehen

### Phase 1 – Reproduzieren und Ursache festnageln
- Fehlerfall als **Test** nachstellen: echte `MaterialResolver`-Instanz mit Store-naher Preset-Quelle,
  Patch-Mesh über `populateTrianglePatch` bauen, Farbe ändern, prüfen ob das **Mesh-Material** die neue
  Farbe trägt (Uniform-Wert, nicht nur ein Preset-Objekt).
- Varianten: Änderung während laufendem Rebuild, nach Arrangement-Wechsel, nach Undo/Redo, mit
  Spiegelkopie, nach Duplizieren (Alt-Drag-Kopie).
- Falls die Tests grün bleiben: im Browser reproduzieren (Johann, kurze Schritte notieren: welcher Patch,
  welche Reihenfolge) und eine temporäre Diagnose ausgeben (Anzahl live Materialien pro Preset,
  Materialinstanz des Meshes).

### Phase 2 – Ursache beheben
Gezielter Fix der bestätigten Nahtstelle, mit Regressionstest.

### Phase 3 – System vereinfachen (alle Unklarheiten bereinigen)
Ziel: **ein** Mechanismus, kein Raten, welche Weiche greift.

- **Material-Bindung als einziges Konzept:** Jedes gebaute Material trägt eine `MaterialBinding`
  (Preset-ID, Ableitung wie Tint/Gloss/Rolle, Applier). Das Register kennt *alle* Instanzen eines Presets.
- **Klassenwahl nur an einer Stelle:** `usesPhysicalMaterial` und die Bauer teilen sich eine Funktion
  (`materialClassFor(preset)`), die Duplikation entfällt.
- **Strukturell = Klasse/Graph ändert sich:** abgeleitet aus dem Ergebnis der gemeinsamen Funktion statt
  aus handgepflegten Feldlisten, soweit möglich; die Restliste bleibt in einer Datei mit Test, der jedes
  `MaterialPreset`-Feld einer Kategorie (live / strukturell / nur Name) zuordnet und bei neuen Feldern fehlschlägt.
- **Rebuild-Sicherheit:** Beim Fertigstellen eines Rebuilds wird der aktuelle Preset-Stand nochmals
  angewendet (kein Verpassen durch Race).
- Sonderfälle `createUncached`, `objectIsFullyLive`, `baseCache` prüfen: vereinfachen oder in die Bindung falten.
- Doku: kurze Beschreibung des Material-Flusses in `_docs/principles/` bzw. `diary-code-decisions.md`.

### Tests
- Pro Kategorie (live / strukturell / Name) und pro Material-Erzeugungspfad (Cache, mit Tint, Gloss, Rolle,
  Patch, Bild-Overlay) ein Test: Preset ändern → sichtbares Material ändert sich ohne Neuladen.
- Feldabdeckungs-Test für `MaterialPreset`.

## Offene Fragen
- Wie genau lief der Fehler ab (Reihenfolge: Patch gebaut → Material gewählt → Farbe geändert; schnell
  nacheinander oder nach Pause; Patch dupliziert/gespiegelt)? Das beschleunigt Phase 1.
- Soll Phase 3 (Umbau) direkt nach dem Fix folgen oder erst nach deinem Test von Phase 2?

## Phase 0 – Dev-Server: Engine-Änderungen laden die Seite immer komplett neu (umgesetzt)

Verdacht für „Farbe erst nach Neuladen“: Nach einem Hot-Update (z. B. nach `git pull` bei laufendem
`npm run dev`) hat der neue Modulcode ein leeres Live-Register, die laufende Engine hängt am alten.
Absicherung in `vite.config.ts` (Plugin `engine-full-reload`) für `src/{engine,materials,physics,render,scene}`.
Die saubere Lösung (Register pro Engine statt Modulzustand) bleibt Teil von Phase 3.
