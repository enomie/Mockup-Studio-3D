# Plan: Clipboard (Ausschneiden / Kopieren / Einfügen / Duplizieren) + „Asset erstellen“

Status: Etappe 1 und 3 umgesetzt. Etappe 4 („Asset erstellen“) zurückgestellt (auf Wunsch, vorerst nicht).

## Anforderungen (abgestimmt)

| Kürzel | Verhalten |
|---|---|
| ⌘C | Auswahl kopieren (Einzel- und Multiselect) |
| ⌘X | Auswahl ausschneiden – wird **sofort** aus dem aktuellen Arrangement entfernt |
| ⌘V | Einfügen **versetzt**, danach ist **Move-Tool sofort aktiv** auf den eingefügten Objekten |
| ⌘⇧V | Einfügen **an derselben Position** wie das Original |
| ⌘D | Duplizieren (= Kopieren + versetzt Einfügen, ohne das Clipboard zu überschreiben) |
| ⌥ + Ziehen (Move) | Duplizieren beim Verschieben – Kopie bewegt sich, Original bleibt

- Funktioniert **über Arrangements hinweg** (Clipboard überlebt `loadArrangement`).
- **3D-Editor** und **2D-Editor (Profil-Editor)** haben **getrennte Clipboards**, kein Austausch.
- Das bestehende Kopieren von Patch-Punkt-Positionen (`patch-point-clipboard-store.ts`, `usePatchPointClipboardShortcuts.ts`) bleibt unverändert. Es hat Vorrang, solange ein Patch-Punkt-Edit aktiv ist.
- Optionale Buttons gibt es nur in der **TopSubBar** (`src/ui/shell/TopSubBar.tsx`): Ausschneiden, Kopieren, Einfügen, Duplizieren. Sie sind deaktiviert, wenn nichts ausgewählt bzw. das Clipboard leer ist.
- **„Asset erstellen“**: Auswahl markieren → linkes Main-Panel **Assets** → unten Button „Create asset“. Mehrere Objekte werden zu **einem gruppierten Asset** zusammengefasst. Die Originale bleiben unverändert in der Szene. Der Name wird abgeleitet: „Ding“ → „Ding 2“.
- Alle Shortcuts werden ignoriert, solange ein Textfeld fokussiert ist (gleiche `isEditableTarget`-Logik wie `useUndoRedoShortcuts`).
- Jede Aktion ist ein Undo-Schritt (`app-store-history`).

## Etappen

### Etappe 1 – 3D: Copy/Cut/Paste/Duplicate (inkl. Multiselect)
1. **Entity-Snapshot**: In `scene-api.ts` kommen neu `serializeEntities(ids): EntitySnapshot[]` (Deep-Clone von Kind, Params, Transform, Material- und Bild-Referenzen) und `insertEntities(snapshots, { offset?: Vec3 }): string[]` dazu. `insertEntities` vergibt neue IDs und neue, abgeleitete Namen und selektiert die eingefügten Objekte. Bilder und Materialien werden nur referenziert, nicht dupliziert.
2. **Store** `src/ui/store/scene-clipboard-store.ts`: hält `EntitySnapshot[]` sowie das Zentrum der Quellauswahl. Nicht persistiert.
3. **Aktionen** in `app-store-scene-entities.ts`: `copySelection`, `cutSelection` (Kopieren + `removeEntity` für alle, ein History-Schritt), `pasteClipboard({ inPlace })`, `duplicateSelection`.
   - Versatz bei ⌘V: fester Offset auf der Bodenebene (z. B. +10 cm in x/z). Mehrfaches Einfügen versetzt kumulativ.
   - Nach ⌘V: Move-Tool aktivieren (wie die Tool-Shortcuts in `useViewportToolShortcuts`), Gizmo auf die Gruppe.
4. **Hook** `useSceneClipboardShortcuts.ts` (im 3D-Modus aktiv, nicht im Profil-Editor).
5. **Alt-Drag-Duplizieren** (`gizmo-interaction-controller.ts`): Ist im Move-Modus beim **Start** des Ziehens die Alt-Taste (⌥) gedrückt, wird die Auswahl (auch Multiselect) per `insertEntities` an Ort und Stelle dupliziert. Danach bewegt sich die **Kopie**, das Original bleibt stehen. Das gilt sowohl beim Ziehen am Gizmo als auch beim direkten Ziehen am Objekt.
   - Wird Alt erst während des Ziehens gedrückt, passiert nichts. Maßgeblich ist der Zustand beim Drag-Start.
   - Duplikat und Verschiebung zusammen sind **ein** Undo-Schritt. Das Clipboard bleibt unberührt.
   - Bricht man den Drag mit Esc ab, wird das Duplikat wieder entfernt.
   - Test: Alt-Drag erzeugt N neue Entities, die Originale behalten ihren Transform.
6. **TopSubBar-Buttons** (englische Labels: Cut, Copy, Paste, Duplicate).
7. **Tests**: Snapshot-Roundtrip, neue IDs, Offset vs. In-place, Cut als ein Undo-Schritt, Multiselect.

### Etappe 2 – Über Arrangements hinweg
- Prüfen, dass `loadArrangement` / `applyArrangement` das Clipboard nicht leert und eingefügte Objekte ins jetzt aktive Arrangement gehen.
- Test: in A ausschneiden → B laden → einfügen → A ohne, B mit Objekt.

### Etappe 3 – 2D-Editor (Profil-Editor)
- Eigener Store `profile-clipboard-store.ts` mit ausgewählten Punkten/Segmenten inkl. Handles. Beim Kopieren werden die Topologie-Verbindungen innerhalb der Auswahl übernommen.
- Gleiche Kürzel in `profile-editor-shortcuts.ts`. ⌘V = versetzt + Move aktiv, ⌘⇧V = gleiche Position, ⌘X entfernt sofort, ⌘D dupliziert.
- Ist der Profil-Editor offen, greifen die 3D-Shortcuts nicht.
- Tests für Einfügen in offene/geschlossene Pfade.

### Etappe 4 – „Asset erstellen“ aus Auswahl (ZURÜCKGESTELLT)
- Neue Quellart für User-Assets: `UserGroupAsset { id, name, members: EntitySnapshot[] }`. Die Member-Transforms werden relativ zum Gruppenzentrum (Boden) gespeichert. Ablage neben `UserBakedAsset` in `app-store-user-baked-assets.ts`, oder ein umbenanntes, gemeinsames `app-store-user-assets.ts`. Kein Migrationscode nötig.
- Button „Create asset“ unten im `AssetsPanel.tsx`, aktiv bei ≥ 1 Auswahl.
- Name: Einzelobjekt → `<Name> 2` (nächste freie Nummer, analog `nextArrangementSaveName`). Mehrere Objekte → Name des ersten Objekts + Nummer.
- Platzieren aus der Asset-Liste: fügt alle Member per `insertEntities` an der Spawn-Position ein und selektiert sie gemeinsam.
- Persistenz in `project-snapshot.ts`.
- **Offen:** Bleibt die Gruppe nach dem Platzieren als Gruppe bestehen, also als gemeinsam selektierbares Objekt? Vorschlag für Etappe 4: **nein**. Die Objekte werden einzeln eingefügt und nur gemeinsam selektiert. Eine echte, dauerhafte Gruppierung in der Szene wäre ein eigenes Feature.

## Abgrenzung
- Kein Clipboard-Austausch mit dem System (andere Apps oder Browser-Tabs).
- Keine Clipboard-Persistenz über einen Reload.
- Patch-Punkt-Positionskopie bleibt wie sie ist.

## Checks vor jedem Push
`npx vitest run`, `npm run lint`, `npm run build`.
