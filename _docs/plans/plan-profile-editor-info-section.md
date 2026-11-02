# Plan: 2D-Editor-Hinweistext → Sektion „Info“ im rechten Panel

## Ausgangslage
`src/ui/profile-editor/ProfileEditor.tsx` (~Z. 677) rendert unten im Viewport ein `<p className="profile-editor__hint">`
mit einer langen Fließtext-Zeile: Raster-Schritt + alle Shortcuts, getrennt mit „·“. Schwer lesbar, überdeckt die Zeichenfläche.

## Ziel
- Shortcuts wandern in eine neue `SubPanelSection title="Info"` in `ProfileInspector.tsx` (als letzte Sektion, nach „Paths“).
- Formatierung als Definitionsliste mit bestehender `.info-list` (lists.css): links Taste(n) als `<kbd>`, rechts Aktion.
- Gruppiert: **Tools** (V, P, C), **Editing** (Drag, Shift, Klick auf Pfad, Del, Doppelklick, Shift-Klick + J),
  **Pen** (Klick/Drag/erster Punkt/Enter), **Snapping** (G, N, Alt), **View** (Mausrad, Space/Mitte, Esc).
- Shortcut-Daten als Konstante (`PROFILE_EDITOR_SHORTCUTS`) in eigener Datei, damit sie testbar ist.

## Raster-Anzeige („Grid 0.01 m“)
Hängt vom Zoom (`view.scale`, lokaler State im Editor) ab. Vorschlag: bleibt im Viewport, aber als kleines,
dezentes Badge unten links (statt der langen Zeile) – live beim Zoomen sichtbar, ohne View-State in den Store zu heben.
Alternative: ebenfalls in „Info“ (erfordert `view.scale` im Store) – nicht empfohlen.

## Umsetzung
1. `profile-editor-shortcuts.ts` mit gruppierten Einträgen.
2. `InfoSection` in `ProfileInspector.tsx`, `<kbd>`-Style in `lists.css` ergänzen.
3. `profile-editor__hint` → `profile-editor__grid-badge` (nur Rasterwert); CSS anpassen.
4. Test in `ProfileInspector.test.tsx`: Info-Sektion rendert Shortcuts.
5. `npx vitest run`, `npm run lint`, `npm run build`, commit + push auf `main`.
