# Plan: Viewport helpers ins Settings-Panel + im Export mitrendern

## Ausgangslage
- `ViewportHelpersBlock` (Floor grid, Quadrant grid, World origin, Compass arrows, Spot beams)
  wird in `src/ui/panels/SceneSubPanel.tsx` gerendert.
- `SettingsSubPanel.tsx` hat aktuell nur die Section "Project" (Reset all).
- Export: `src/engine/mockup-engine-capture.ts` (`captureViewportImageFromEngine`).
  Dort wird kein Helper explizit versteckt; Physics-Test, Schatten, Ground werden per push/pop
  umgeschaltet. Ob Helper im Export fehlen (z. B. durch Layers, Post-Processing, Transparenz/
  Depth-Test der X-Ray-Materialien, Sky-Override, Output-Size-Kamera), muss im Code/Browser
  verifiziert werden.

## Entscheidungen (User)
- Kein zusätzlicher Quick-Toggle. Das **ganze Element** wandert unverändert ins Settings-Panel.
- Aktive Helper müssen **im Export mitgerendert** werden (WYSIWYG).

## Umsetzung
1. **UI verschieben**
   - `<ViewportHelpersBlock />` aus `SceneSubPanel.tsx` entfernen.
   - In `SettingsSubPanel.tsx` einfügen (oberhalb von "Project"), Block selbst unverändert
     (Titel, Master-Toggle, Collapse, fünf Checkboxen).
2. **Export**
   - Ursache finden, warum aktive Helper im Export fehlen (falls sie fehlen), und beheben,
     sodass Floor grid, Quadrant grid, World origin, Compass arrows und Spot beams genau dann
     im Bild sind, wenn sie im Viewport aktiv sind. Inaktive bleiben draußen.
   - Gilt für JPEG, PNG und PNG transparent sowie für fixe Output-Size.
   - JSDoc in `ViewportHelpersBlock.tsx` ("not part of … exports") korrigieren.
   - Nicht betroffen: Gizmos, Selektions-Highlight, Light-Pick-Meshes bleiben aus dem Export raus.
3. **Tests**: Settings-Panel rendert den Block; Scene-Panel nicht mehr; Capture lässt
   Helper-Sichtbarkeit unverändert. Dann `npx vitest run`, `npm run lint`, `npm run build`,
   plus manueller Export-Check im Browser.
4. Store/Persistenz unverändert.
