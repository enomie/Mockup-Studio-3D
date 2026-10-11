# Camera

Kamera-Navigation, Panel, Einstellungen und **Presets**. Navigation-Implementierung: `src/engine/camera-controller.ts`. Layout: [`requirements-app-layout.md`](./requirements-app-layout.md) (Right Panel).

---

**Category:** Camera  
**Title:** Zwei Kameratypen (Pflicht)  
**Description:** **Perspective** (Primary, Orbit) und **Orthographic** (Maßstabsgetreu) — siehe [`requirements-code.md`](./requirements-code.md). Umschaltbar in **Top Main Quick Bar**, **Camera Sub-Panel** (Right Sub) und per Shortcut **`O`**. Wechsel behält Target + Pan bei.

---

**Category:** Camera  
**Title:** Camera Sub-Panel (Right Sub)  
**Description:** Gewählt über Right Main Nav **Camera** → Inhalt in **Right Sub** (`CameraSubPanel`). Reihenfolge (Sections): **Projection** (Persp / Ortho, redundant zu Top Main) · **FOV** (nur Perspective) oder **Zoom** (nur Orthographic) · **Saved views** (3 Slot-Karten) · **Navigation** (live Anzeige **und** direkte Eingabe). Später: Near, Far.

---

**Category:** Camera  
**Title:** Top Main — Kamera Quick Bar (zentriert)  
**Description:** **Top Main Panel**, **horizontal zentriert** zwischen App-Titel (links) und Datei-Aktionen (rechts). Kompakte **Chips/Buttons** — keine zweite Toolbar in Top Sub (dort bleiben Viewport-Tools W/E/R/T). Reihenfolge: **Persp / Ortho** (ganz links, ohne Trenner) · Built-in Views (Default … Right) · **Trenner** · User Slots 1–3. Tooltip/`title` inkl. Shortcut. Leere Slots: muted, Klick = no-op. Touch-ready (~44px Hit-Area). Details Shortcuts → nächster Block.

---

**Category:** Camera  
**Title:** Built-in Views (Achsen + Default)  
**Description:** **Nicht löschbar**, werkseitig fest (`src/data/camera-views.ts`). UI-Label **Default** (interne ID `normal`), Shortcut **`1`**. Reset auf **Scene-Default** — Standard-Arbeitsansicht beim Scene-Load (typisch leichte 3/4-Perspektive auf Scene-Center); **kein** „letzte freie Position". **Achsenansichten** — Blick auf Scene-Center (`target`), feste Weltachsen, pole-safe `up`: **Front (2)** … **Right (7)**. Built-ins **und** User-Slots beim Load ändern nur **Framing** (target, Winkel, Distanz, gespeichertes fov/orthoZoom) — **nicht** die aktive **Projection** (Perspective/Orthographic bleibt wie vom User gewählt). Built-ins überschreiben **keine** User-Slots.

---

**Category:** Camera  
**Title:** Tastatur-Shortcuts — Views & Slots  
**Description:** **UI-seitig** (gleiches Muster wie Viewport-Tools `useViewportToolShortcuts`): keine Modifier; **Guard** bei Fokus in Input/Textarea/Select. Mapping: **`1`** Default · **`2`** Front · **`3`** Top · **`4`** Back · **`5`** Bottom · **`6`** Left · **`7`** Right · **`8`** User Slot 1 · **`9`** Slot 2 · **`0`** Slot 3. Leerer Slot: Shortcut ignoriert (optional kurzer Status-Hinweis). **`O`** bleibt Ortho-Toggle (Engine). Definitionen zentral (z. B. `camera-views.ts`). Built-ins `1–7`, Slots `8–9–0`.

---

**Category:** Camera  
**Title:** User Preset Slots (3 feste Plätze)  
**Description:** **Drei feste Slots** (Index 1–3), **projektgebunden** (Scene Save). **Start: leer** — kein vorausgefülltes Framing. User richtet View ein → **Capture** pro Slot im Camera Sub-Panel (Section **Saved views**). Gespeichert pro Slot: **name** (editierbar, Default „Slot N"), **projection**, **position**, **target**, **fov**, **orthoZoom**. **Load** per Top-Main-Chip, Panel-**Load**-Button oder Shortcut **`8`–`0`**. **Clear** setzt Slot zurück auf leer. Beim **Load** wird **projection** aus dem Slot **nicht** angewendet — nur Framing (siehe Built-ins). Slots sind **keine** unbegrenzte Preset-Liste — spätere Named-Presets ohne Hotkey optional separat.

---

**Category:** Camera  
**Title:** Camera Sub-Panel — Saved views (Slot-Karten)  
**Description:** Section **Saved views** im Camera Sub-Panel: **vertikal gestapelte Karten** (schmales Sub-Panel ~196px — keine horizontalen Mini-Chips). Pro Karte: Shortcut-Badge (`8` … `0`), **Name** (editierbar wenn belegt, sonst „Slot N — empty"), Aktionszeile **Load** · **Capture** · **Clear**. Load disabled wenn leer. **Redundanz zu Top Main beabsichtigt** — Top Main = Speed (Chips), Sub-Panel = Verwaltung + Capture/Clear.

---

**Category:** Camera  
**Title:** Preset vs. Live Navigation  
**Description:** **Live Navigation** (Orbit, Pan, Zoom) = temporär bis User Preset speichert oder lädt. Kein automatisches Überschreiben von Presets bei Navigation. Beim Laden: sanfter Sprung oder Cut — Start: **Cut** (sofort), Animation später optional.

---

**Category:** Camera  
**Title:** Export / Render Camera  
**Description:** Bild-Export nutzt aktuelle View / Preset-Framing — vollständig [`requirements-export.md`](./requirements-export.md).

---

**Category:** Camera  
**Title:** Engine & Datenmodell  
**Description:** `CameraController` (`src/engine/camera-controller.ts`) hält Live-State (Orbit-Spherical, Target, beide Three-Kameras, `orthoZoom`, `fov`). Orbit-Radius wird zentral via `clampOrbitRadius()` begrenzt (Zoom, Preset-Load, Projection-Update). **Built-in views** = feste IDs (`normal`, `front`, `top`, …), nicht serialisiert. **User slots:** `CameraSlot { name, projection, position, target, fov, orthoZoom }` — `null` wenn leer; in Engine/Store. Scene-API: `loadBuiltinView(id)`, `captureSlot(index)`, `loadSlot(index)` (Framing-only via `applyFramingState`), `clearSlot(index)`, `renameSlot(index, name)`, `setCameraProjection`, `setCameraFov`, `setCameraOrthoZoom`, `getCameraSettings`, `getCameraViewState`, **`getCameraReadout`**, **`setCameraPosition`**, **`setCameraTarget`**, **`setCameraDistance`**, **`setCameraAzimuth`**, **`setCameraElevation`** (Commit nach gültigem Parse; intern `target` + `spherical` + Kamera-`position` konsistent, analog `applyFramingState`). Shortcuts UI-seitig (`useCameraViewShortcuts`). Serialisierung Scene Save: TBD.

---

**Category:** Camera  
**Title:** Platzierung & Placement-System  
**Description:** Kamera **navigiert** frei (kein Gizmo für View-Camera im Normalfall). Optional: **Preset-Marker** im Raum als Entity ([`requirements-scene-placement.md`](./requirements-scene-placement.md)) — rein visuell, wo eine gespeicherte Kamera „stand". View-Camera selbst nicht per Transform-Gizmo verschieben wenn im Orbit-Mode — Navigation ersetzt das.

---

**Category:** Camera  
**Title:** Zoom — Mausrad / Pinch (modusabhängig)  
**Description:** **Gleicher Input** (Mausrad, Pinch) in beiden Modi — **unterschiedliche Wirkung** (Engine `CameraController.zoom`): **Perspective:** **Dolly** — ändert Orbit-**Distance** (`spherical.radius`), Kamera bewegt sich zum Target; **FOV** nur per Panel-Slider, nicht per Rad. **Orthographic:** **Frustum-Zoom** — ändert `orthoZoom` (sichtbares Rechteck), Kamera-**Position** bleibt; in Ortho bringt Näherfliegen keine Vergrößerung. Panel-Slider (FOV bzw. Zoom) und Rad sind gekoppelt. Grenzen: Orbit-Distance **0,350–10,000 m** (`CAMERA_ORBIT_MIN_RADIUS` / `CAMERA_ORBIT_MAX_RADIUS`), `CAMERA_ORTHO_MIN/MAX_ZOOM`, `CAMERA_FOV_MIN/MAX` in `src/constants.ts`.

---

**Category:** Camera  
**Title:** Navigation — live Anzeige & Eingabe  
**Description:** Section **Navigation** am Ende des Camera Sub-Panels. **Live** während Orbit/Pan/Zoom (Hook `useCameraReadout` pollt `getCameraReadout` per `requestAnimationFrame` — kein Store-Flood). Alle Werte sind **editierbar** (nicht nur Readout). **Interaktion** wie Entity-Transform im Right Panel: `PanelTextField` / **`AxisField`-Muster** (`EntityPropertyFields`) — Zeilenlabel, Fokus → Draft, Commit bei gültigem Parse und **onBlur**; ungültige Eingabe visuell markiert, letzter gültiger Wert bleibt in der Engine. Während ein Feld **fokussiert** ist, wird der angezeigte Draft **nicht** von Live-Navigation überschrieben. **Felder:** **Position** — **Pos X / Pos Y / Pos Z** (m, 3 Dezimalen, Parse wie Placement); **Target** — **Target X / Y / Z** (Orbit-Zentrum, gleiches Muster); **Distance** (m, 3 Dezimalen, Orbit-`radius`); **Azimuth** und **Elevation** (°, 1 Dezimalstelle, gleiche Definition wie Readout: Azimuth = `theta`, Elevation = 90° − `phi` in Grad). **Engine-Konsistenz:** Kamera bleibt Orbit-Modell — Änderungen aktualisieren `target`, `spherical` und Kamera-`position`/`lookAt` wie bei `applyFramingState` / Orbit-Drag (kein „freies“ Setzen der Position ohne Target/Spherical-Sync). **Distance** nach Commit: `clampOrbitRadius()`. **Elevation** nach Commit: gleiche **phi-Clamps** wie Maus-Orbit (kein Durchschwenken durch die Pole). Ortho: **Distance** = Orbit-Abstand Kamera ↔ Target, **nicht** Sicht-Zoom — Zoom bleibt im Projection-Abschnitt. Details Einheiten → [`requirements-code.md`](./requirements-code.md).

---

**Category:** Camera  
**Title:** Navigation — Azimuth / Elevation auf 0 setzen  
**Description:** Pro Zeile **Azimuth** und **Elevation** ein **kleiner Reset-Button** (Lucide **`X`**, kompaktes Icon-Button-Muster wie elsewhere in der Shell — touch-ready, `aria-label` z. B. „Azimuth auf 0° setzen“). **Klick** setzt nur den jeweiligen Winkel auf **0°** (Azimuth → `theta = 0`, Elevation → `phi = π/2`), **ohne** Target, Distance oder den anderen Winkel zu ändern; danach `applyActiveProjection()` + Change-Notify. Button nur sinnvoll wenn Wert ≠ 0° (sonst disabled oder ausgeblendet — UI-Entscheidung, Verhalten identisch). Kein Reset für Position, Target oder Distance in diesem Block.

---

**Category:** Camera  
**Title:** Orbit-Distance — Grenzen  
**Description:** Perspective-Orbit-Abstand (`spherical.radius` = Distanz Kamera → Target): **Minimum 0,350 m**, **Maximum 10,000 m**. Default **2,500 m** (`CAMERA_ORBIT_DEFAULT_RADIUS`). Engine: `CameraController.clampOrbitRadius()` bei Zoom, `applyFramingState` (Preset-Load) und jedem `applyActiveProjection`. Gespeicherte User-Slots mit Distanz > 10 m werden beim Load auf 10 m begrenzt. **Pan** verschiebt Target — Distanz bleibt relativ zum Target, nicht zum Weltursprung. Konstanten: `src/constants.ts`.

---
