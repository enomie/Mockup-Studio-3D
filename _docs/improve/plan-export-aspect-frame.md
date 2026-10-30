# Plan — Export-Seitenverhältnis, Format-Rahmen & feste Auflösung

Status: **Plan** (noch nicht umgesetzt). Normative Spezifikation nach Umsetzung → [`requirements-export.md`](../requirements/requirements-export.md) ergänzen.

---

## Problem

`captureViewportImageFromEngine` (`src/engine/mockup-engine-capture.ts`) liest den **Live-Canvas** per `toBlob`. Export-Seitenverhältnis und -Auflösung = aktuelle Viewport-Größe. Die hängt vom Shell-Layout ab (`grid-template-columns: auto auto auto minmax(0, 1fr) auto auto auto` in `shell.css`): Main-Panels ein/aus, Sub-Panels, Detail-Spalten, `max-content`-Listen, Fenstergröße, Browser-Zoom. → Export ist nicht reproduzierbar, Zielformat (16:9, 9:16 …) nicht planbar.

## Ziel

1. User wählt im **Export-Panel** ein Seitenverhältnis + Pixelgröße.
2. **Viewport zeigt Format-Rahmen** — Ausschnitt im Rahmen = exportiertes Bild (WYSIWYG).
3. Export rendert in **fester Auflösung**, unabhängig von Fenster-/Viewport-Größe.

---

## Entscheidungen (besprochen)

| Thema | Entscheidung |
|-------|--------------|
| Ort der Auswahl | Export-Panel (`ExportSubPanel`), neue Section **Size** |
| Presets | **16:9, 4:3, 1:1, 4:5** + **Custom** (zwei Felder `W : H`) |
| Orientierung | Toggle **Landscape / Portrait** — tauscht Verhältnis (9:16, 3:4, 5:4). Bei 1:1 wirkungslos (disabled) |
| Pixelgröße | Felder **Width** + **Height**, über Verhältnis gekoppelt. Eingabe einer Seite → andere wird berechnet |
| Rundung | `Math.round` auf ganze Pixel (z. B. 16:9 @ 1000 → 563) |
| Obergrenze | Deckel bei Device-Limit (`maxTextureDimension2D`, typ. 8192) pro Seite, Hinweis im Panel (`panel-hint`) |
| Schnellwahl (HD/4K/Insta) | **Nein** |
| Rahmen-Sichtbarkeit | **Immer** sichtbar, mit **Ein/Aus-Toggle** (Default: an) |
| Panel-Overlay-Layout | **Später**, eigener Schritt (siehe unten) |

---

## Verhalten im Detail

### Kopplung Breite / Höhe
- Store merkt sich `exportSizeAnchor: 'width' | 'height'` (zuletzt bearbeitete Seite) + deren Wert.
- **Width-Eingabe:** `height = round(width * rh / rw)`; Anchor = width.
- **Height-Eingabe:** `width = round(height * rw / rh)`; Anchor = height.
- **Preset-/Custom-Wechsel:** Anchor-Seite bleibt, andere wird neu berechnet.
- **Orientierung tauschen:** Width ↔ Height tauschen (Anchor tauscht mit).
- Clamp: min 16 px, max Device-Limit. Wird die berechnete Seite > Limit, beide proportional herunterskalieren + Hinweis.
- **Default:** 16:9 Landscape, Width 3840 → 2160.

### Custom-Verhältnis
- Zwei Zahlenfelder (positiv, Dezimal erlaubt, z. B. 2.39 : 1). Ungültig → letzter gültiger Wert bleibt.

### Format-Rahmen im Viewport
- DOM-Overlay in `ViewportFrame` (kein Render-Pass): größtes Rechteck des Verhältnisses, zentriert, „contain“ im Viewport.
- Außerhalb: halbtransparente Abdunklung; dünne Rahmenlinie. Pointer-Events: `none` (Navigation/Gizmo unverändert).
- Label klein in der Ecke, z. B. `16:9 · 3840 × 2160`.
- Neuberechnung bei Viewport-Resize (bestehender `ResizeObserver`) und Store-Änderung.

### Kamera-Konsistenz (wichtig für WYSIWYG)
- Live-Kamera behält Viewport-Aspect. Rahmen-Ausschnitt muss exakt dem Export entsprechen:
  - Rahmen **breiter** als Viewport-Aspect ⇒ Rahmen füllt Breite, vertikaler FOV im Export = FOV, der dem Rahmen-Höhenanteil entspricht (`fovExport = 2·atan(tan(fov/2) · frameH/viewportH)`).
  - Rahmen **höher** ⇒ Rahmen füllt Höhe, Export nutzt Live-FOV, Aspect = Ziel-Aspect.
- Einfacher äquivalent: Export-Kamera = Live-Kamera mit `setViewOffset` / angepasstem FOV auf den Rahmenausschnitt. Ortho-Kamera analog über `halfH`/`halfW` (`camera-controller.ts`).
- Testbar als reine Funktion: `computeExportFrustum(viewportW, viewportH, targetAspect, fov) → { fov, aspect }`.

### Export-Rendering in fester Auflösung
- In `captureViewportImageFromEngine`:
  1. Aktuelle Größe + Pixel-Ratio merken.
  2. `renderer.setPixelRatio(1)`, `renderer.setSize(w, h, false)` (CSS-Größe unverändert → kein Layout-Flackern), `viewportPipeline.setSize(w, h)`, Kamera-Aspect/FOV für Export setzen, Planar-Reflection-Auflösung aktualisieren.
  3. Rendern, `toBlob`.
  4. `finally`: alles zurücksetzen + `handleResize()`-äquivalent + Live-Frame.
- Device-Limit aus `renderer.backend.device.limits.maxTextureDimension2D` (Fallback 8192) → an Store/Panel durchreichen.
- Hinweis: Speicher bei 8192² + Post-Pipeline-Targets hoch — ggf. Fehler abfangen und als Hinweis melden.

---

## Store / Typen

`src/scene/export-image.ts`:
```ts
export type ExportAspectPreset = '16:9' | '4:3' | '1:1' | '4:5' | 'custom';
export type ExportOrientation = 'landscape' | 'portrait';
export interface ExportSizeSettings {
  aspectPreset: ExportAspectPreset;
  customRatio: { w: number; h: number };
  orientation: ExportOrientation;
  width: number;
  height: number;
  anchor: 'width' | 'height';
  frameVisible: boolean;
}
```
- `CaptureViewportImageOptions` erweitert um `width`, `height`.
- Pure Helpers (eigene Datei, z. B. `src/scene/export-size.ts`): `resolveAspectRatio`, `applyWidth`, `applyHeight`, `applyPreset`, `toggleOrientation`, `clampToLimit`, `computeFrameRect`, `computeExportFrustum`.
- `app-store-export.ts`: Setter je Aktion; Persistenz wie übrige Export-Settings (prüfen, ob Export-Settings in Szene/Session gespeichert werden).

## UI — `ExportSubPanel`

Neue Section **Size** (über/unter **Format**):
- `PanelSelect` **Aspect ratio**: 16:9 · 4:3 · 1:1 · 4:5 · Custom
- Custom: zwei Felder `W` `:` `H`
- Segment/Toggle **Landscape | Portrait**
- `Width` / `Height` (px), Zahlenfelder
- Hinweis bei Clamp: „Limited to 8192 px per side (GPU limit).“
- `PanelCheckbox` **Show frame in viewport**

Alle UI-Strings Englisch (AGENTS.md).

---

## Umsetzungsschritte

1. **Pure Logik + Tests** — `export-size.ts` + Vitest (Kopplung, Rundung, Orientierung, Clamp, Frame-Rect, Frustum).
2. **Store** — State, Setter, Defaults.
3. **Panel-UI** — Section Size.
4. **Viewport-Rahmen** — Overlay-Komponente in `ViewportFrame`, CSS in `shell.css`/eigener Datei.
5. **Export-Render** — feste Auflösung + Export-Frustum in `mockup-engine-capture.ts`, Host-Interface erweitern (Pipeline-Resize, Kamera-Override, Limit).
6. **Doku** — `requirements-export.md` normativ ergänzen; Eintrag in `diary-code-decisions.md`.
7. Checks: `npx vitest run`, `npm run lint`, `npm run build`; manueller Test: Rahmen vs. exportiertes Bild bei allen Presets, beide Orientierungen, Perspektive + Ortho, Mirror-Ground an.

---

## Später (eigener Schritt): Panel-Overlay-Layout

- Grid nur noch: `Left-Icon-Rail | Viewport | Right-Icon-Rail`.
- Aufgeklappte Main-Nav, Sub- und Detail-Panels liegen `position: absolute` **über** dem Viewport.
- Effekt: Viewport-Größe ändert sich nur noch mit dem Fenster; Rahmen „springt“ nicht beim Auf-/Zuklappen. Für den Export selbst nicht nötig (Rahmen + feste Auflösung reichen).
- Offene Frage dann: soll der Rahmen Overlay-Panels berücksichtigen (z. B. nur im sichtbaren Bereich zentrieren)?

## Offene Punkte

- Persistenz der Size-Settings: pro Szene oder global?
- Verhalten des Rahmens im Modus „Export“ (`AppMode: 'export'`) — ggf. stärker hervorheben.
