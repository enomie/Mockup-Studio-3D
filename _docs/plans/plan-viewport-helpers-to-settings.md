# Plan: Viewport helpers vom Scene-Panel ins Settings-Panel verschieben

## Ausgangslage
- `ViewportHelpersBlock` (Floor grid, Quadrant grid, World origin, Compass arrows, Spot beams)
  wird in `src/ui/panels/SceneSubPanel.tsx` gerendert.
- Die Helfer sind reine Viewport-Hilfen: nicht Teil von Environments, Szenen-Inhalt oder Exports
  (siehe JSDoc im Block). Inhaltlich gehören sie damit eher zu "Einstellungen" als zur Szene.
- `SettingsSubPanel.tsx` hat aktuell nur die Section "Project" (Reset all).

## Vorschlag
1. In `SettingsSubPanel` eine neue `SubPanelSection` **"Viewport"** oberhalb von "Project" einfügen,
   mit den fünf Checkboxen + einem Master-Toggle "Show all helpers"
   (nutzt bestehende `toggleViewportHelpersAll` / `isAnyViewportHelperEnabled`).
2. `ViewportHelpersBlock` aus `SceneSubPanel` entfernen. Den Inhalt in eine wiederverwendbare
   Komponente `ViewportHelpersFields` extrahieren (nur Checkboxen, ohne `SceneEntityBlock`-Hülle);
   `ViewportHelpersBlock.tsx` löschen.
3. Store/Engine/Persistenz bleiben unverändert (State-Pfad `viewportHelpers` gleich).
4. Optional (separat entscheiden): Quick-Toggle im Viewport-Toolbar (ein Icon "Helpers an/aus"),
   damit man beim Arbeiten nicht jedes Mal ins Settings-Panel muss.
5. Tests anpassen/ergänzen (Rendering der Section im Settings-Panel), dann
   `npx vitest run`, `npm run lint`, `npm run build`.

## Abwägung
- Pro: Scene-Panel bleibt auf echten Szenen-Inhalt fokussiert; Settings bekommt sinnvollen Inhalt.
- Contra: Helfer werden häufig während der Arbeit umgeschaltet → ein Klick mehr. Deshalb Punkt 4.
