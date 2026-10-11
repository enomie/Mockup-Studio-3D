# UI Dummy Demo

Erste **sichtbare Shell** — Layout und Look prüfen, **keine** echten Features. Bezüge: [`requirements-app-layout.md`](./requirements-app-layout.md), [`requirements-look-and-feel.md`](./requirements-look-and-feel.md).

**Ziel:** In 5 Minuten erkennen: „So fühlt sich Mockup Studio 3D an" — Spalten, Scroll, Accordion, Toolbar, Viewport mit laufender 3D-Szene.

**Bestand (Inventur):** `App.tsx` = nur `ViewportFrame` (fullscreen). Alte Komponenten (`Toolbar`, `AssetSidebar`, `PropertyPanel`, …) und CSS in `app.css` — **prüfen, wiederverwenden oder ersetzen**, nicht parallel neu erfinden. Layout unter `src/ui/layout/` anlegen.

---

**Category:** Demo  
**Title:** Scope — nur UI-Hülle  
**Description:** Die Demo zeigt die **komplette App-Shell** mit **Platzhalter-Inhalt**. **In Scope:** alle Zonen sichtbar, Dummy-Text/Buttons, Lucide-Icons, scrollbare Side-Panels, 2–3 aufklappbare Accordion-Sections rechts, Viewport mit **bestehender Engine** (Cube, Orbit, Pan). **Out of Scope:** Scene-API-Anbindung, echte Slider-Werte, Light/Camera/Environment-Logik, Save/Export, Asset-Upload, Mobile-Drawer, Collapse-Animationen (können stub sein).

---

**Category:** Demo  
**Title:** Shell — alle Zonen Pflicht  
**Description:** Vollständiges Layout laut App-Layout-Diagramm: **Top Main** · **Top Sub** (sichtbar, darf kurzen Dummy-Text haben) · Mittelzeile **Main Left | Sub Left | Viewport | Sub Right | Main Right** · **Status** unten. Kein Fullscreen-Viewport-only mehr. Viewport = mittlere Spalte, Engine unverändert mounten (`ViewportFrame`).

---

**Category:** Demo  
**Title:** Top Main — Actions + Kamera Quick Bar  
**Description:** **Links** App-Titel; **mitte** **Camera Quick Bar** (live: Persp/Ortho, Built-ins, User-Slots — [`requirements-camera.md`](./requirements-camera.md)); **rechts** Textbuttons **Save** (`save`), **Export** (`download`), **Share** (`share-2`). Save/Export/Share: Klick = `console.log` oder no-op bis Feature. Min-Höhe ~44px, heller Hintergrund, Figma-like.

---

**Category:** Demo  
**Title:** Top Sub — Platzhalter  
**Description:** Eine Zeile Dummy: z. B. „Mode: Navigate" oder Breadcrumb `Scene › Default`. Zeigt, dass der Slot reserviert ist. Kein Modus-Switch nötig.

---

**Category:** Demo  
**Title:** Left Main — Asset-Dummy  
**Description:** Panel-Titel **Assets**. Scrollbarer Body: **6–8 Platzhalter-Kacheln** (graues Rechteck + `image`-Icon + „Image 01" …). Kein Upload, keine echten Bilder. Demonstriert Scroll + spätere Galerie-Struktur.

---

**Category:** Demo  
**Title:** Left Sub — Filter-Dummy  
**Description:** Schmaleres Panel, Titel **Filter**. 2–3 Dummy-Zeilen (Checkbox + Label: „Textures", „References"). Statisch, nicht funktional.

---

**Category:** Demo  
**Title:** Right Sub — Detail-Panels  
**Description:** Inhalt abhängig von Right-Main-Nav: **Scene**, **Environment** (inkl. Ground-Sektion), **Lighting**, **Camera** — jeweils eigenes Sub-Panel mit Live Store → Scene-API. **Left Sub:** u. a. **Environments** (Atmosphäre-Presets, Apply) — [`requirements-environments.md`](./requirements-environments.md); volle Layout-Vorlagen später **Scenes**. Kein Ground-/Presets-Nav rechts. Kamera-Views und Slots **Top Main** + **Camera Sub-Panel**.

---

**Category:** Demo  
**Title:** Right Main — Nav-Rail (ersetzt Accordion-Dummy)  
**Description:** **Main-Nav** mit Icon + Label: Scene, Environment, Camera, Lighting — Klick wechselt **Right Sub**-Inhalt. Kein Accordion-Stack mehr im Main. Camera-Einstellungen im **Camera Sub-Panel** (Projection, FOV/Zoom, Saved views, Navigation readout).

---

**Category:** Demo  
**Title:** Status — Dummy-Zeile  
**Description:** Horizontal: z. B. `WebGPU · Perspective · 60 FPS` als Static Text (FPS darf fake „—" sein). Kein Live-Telemetry nötig.

---

**Category:** Demo  
**Title:** Styling & Icons  
**Description:** [`requirements-look-and-feel.md`](./requirements-look-and-feel.md): hell, Figma-like, custom Scrollbars in Side-Panels, Lucide via `lucide-react`. Panel-Breiten Richtwert: Main ~220–260px, Sub ~160–200px — per CSS-Variablen, leicht anpassbar. Trennlinien `#e5e5e5` / `#e8e8e8`.

---

**Category:** Demo  
**Title:** Technik & Grenzen  
**Description:** React only in `src/ui/`. **`AppShell`** als Root in `App.tsx`. Wiederverwendbare Bausteine: `ScrollPanel`, `PanelSection`, `PanelHeader` (sticky). Store **optional leer** — Demo-State lokal in Components oder minimaler Dummy-State ok. **Kein** neues Feature-Requirement nötig für Demo-Inhalt. Nach Demo: Shell-Bausteine bleiben, Dummy-Inhalt wird schrittweise durch echte Panels ersetzt.

---

**Category:** Demo  
**Title:** Erfolgskriterium  
**Description:** User öffnet `http://localhost:4040` und sieht: **UI-Rahmen rund um die 3D-Szene**, links/rechts scrollbar, Accordion klickbar, Top-Buttons sichtbar — wirkt wie ein Mockup-Editor, obwohl nichts „echt" konfiguriert ist.

---

**Category:** Demo  
**Title:** Kompakte Dichte (Feedback)  
**Description:** UI **nicht plump** — insgesamt kleinere Typo (12–13px Panels), flache Top-Bar (~36px), **Icon-only** Toolbar-Buttons (~28px), schmalere Side-Spalten. Keine 44px-Monster-Buttons in der Top-Zeile. Touch-Targets in Panels ~32px ausreichend für Demo; Toolbar darf dichter sein.

---

**Category:** Demo  
**Title:** Main = Navigation, Sub = Einstellungen  
**Description:** **Main Left / Main Right** = **Hauptpunkte** (Nav-Liste mit Lucide-Icon + Label): z. B. links Scenes/Assets/Images, rechts Scene/Environment/Camera/Lighting. **Sub Left / Sub Right** = **Detail-Einstellungen** zum aktuell gewählten Hauptpunkt (Asset-Liste, Environment inkl. Ground, …). Kein Accordion-Stack mehr im Main — Auswahl in Main, Inhalt in Sub. Spiegelbildlich links und rechts.

---

**Category:** Demo  
**Title:** Main-Panel — Icon-Rail einklappbar  
**Description:** Main-Panels **einklappbar auf Icon-only** (~44px Rail): nur Icons sichtbar, Labels aus; Toggle unten im Panel (`PanelLeftClose` / `PanelRightClose`). Expanded ~132px mit Icon + Label. Aktiver Eintrag hervorgehoben. Komponente: `MainNavPanel`.

---

**Category:** Demo  
**Title:** Erfolgskriterium (aktualisiert)  
**Description:** User sieht kompakte Shell: Main-Nav mit Icons, Klick wechselt Sub-Inhalt, Main einklappbar, Top nur Icon-Buttons, Viewport mit 3D — wirkt leicht und Figma-nah, nicht überdimensioniert.

---

**Category:** Demo  
**Title:** Freigegeben — Design-Referenz  
**Description:** Stand **2026-10-07** vom User **freigegeben** („absolut perfekt"). Diese Shell ist **bindende Referenz** für Look & Feel → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md) Design-Richtlinien. CSS-Tokens in `app.css` pflegen, nicht ad-hoc überschreiben.

---

**Category:** Demo  
**Title:** Left Main — Scenes  
**Description:** Nav-Eintrag **Scenes** (Lucide z. B. `layout-template`), **erster** Left-Main-Punkt. Sub-Panel: Liste der **3 Built-in-Scenes** (Default, Phone only, Phone in front of tablet) + Footer **„Save as scene"** (+). Klick = Scene laden; Breadcrumb `Scene › …` in Top Sub. Vollständige Spec → [`requirements-scenes.md`](./requirements-scenes.md).

---

**Category:** Demo  
**Title:** Left Main — Images (ersetzt Assets)  
**Description:** Nav-Eintrag **Images** (`image`-Icon). Sub-Panel: Liste der **4 Starter-Bilder** aus `/public` (`sample-landscape-*`, `sample-portrait-*`) mit Thumbnail + Orientierung (Landscape/Portrait). Unten **„Add image"** (+) — File-Picker, hochgeladene Bilder an Liste anhängen (Demo: `objectUrl`, kein Persist). Upload-Eintrag in Main-Nav entfällt. Vollständige Spec → [`requirements-images.md`](./requirements-images.md).

---

**Category:** Demo  
**Title:** Left Main — Colors  
**Description:** Nav-Eintrag **Colors** (`droplet`-Icon), **vor** Materials. Sub-Panel: `ColorsPanel` — Liste der **6 Built-in-Farben** (Swatch + Name) + User-Farben; Footer **„Add color"** (+). Selection → Editor (Name, ColorPicker; Built-ins read-only, Duplicate erlaubt). ColorPicker-Popover app-weit: Library-Swatches + Recent. Vollständige Spec → [`requirements-colors.md`](./requirements-colors.md).

---

**Category:** Demo  
**Title:** Left Main — Materials  
**Description:** Nav-Eintrag **Materials** (`palette`-Icon). Sub-Panel: `MaterialsPanel` — Preset-Liste + Editor (PBR, transmission, textured). Vollständige Spec → [`requirements-materials.md`](./requirements-materials.md).

---

**Category:** Demo  
**Title:** Viewport-Gizmo (Gimbals) in Demo  
**Description:** Top Sub: **Select / Move / Rotate / Scale** (Lucide: `mouse-pointer`, `move`, `rotate-cw`, `scaling`). Move/Rotate/Scale aktiviert **Transform-Gizmo** an der **aktuellen Selection** (Default: Picture framed) — siehe [`requirements-gimbals.md`](./requirements-gimbals.md). Select = kein Gizmo. Status-Zeile zeigt aktives Tool. Scale nur auf Assets (uniform). Debug-Würfel (s. unten) kein Gizmo-Target mehr.

---

**Category:** Demo  
**Title:** Debug — fallender Physik-Würfel  
**Description:** Der **rote Würfel**, der aus der Höhe fällt und auf dem Boden landet, ist **kein Produkt-Feature** — nur ein **Debug-Sanity-Check**, ob Rapier-Physik (Init, Fixed Timestep, Ground-Collider, Body→Mesh-Sync) funktioniert. Steuerung per Flag **`DEBUG_PHYSICS_CUBE`** in `src/constants.ts` (Default **`false`**). Würfel nicht in UI konfigurierbar, kein Panel-Eintrag, kein Export-Asset, **kein Gizmo-Target**. Größe/Spawn: `CUBE_SIZE`, `CUBE_DROP_HEIGHT`. Placement-Entities (Assets) sind das Produkt-Feature.

---

**Category:** Demo  
**Title:** Environment — Sektionen Sky / Reflections / Fog / Ground  
**Description:** Right Sub → **Environment**: **Sky** (Horizon, Zenith, Fade) + **Reflections** + **Fog** (color, Near/Far) + **Ground** (Color, Material, Mirror, Emissive, Visibility). Live am Viewport — Store → Scene-API. Keine Preset-Chips. Spec → [`requirements-environment.md`](./requirements-environment.md), [`requirements-ground.md`](./requirements-ground.md), [`requirements-range-slider.md`](./requirements-range-slider.md).

---
