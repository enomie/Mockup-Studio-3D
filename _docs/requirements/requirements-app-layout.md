# App Layout

Shell-Struktur der React UI-Chrome. Visuelles Styling → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md).

## Layout-Übersicht

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  TOP MAIN PANEL (full width) — text buttons                             │
├─────────────────────────────────────────────────────────────────────────┤
│  TOP SUB PANEL (full width, optional)                                   │
├───────────┬───────────┬─────────────────────────┬───────────┬───────────┤
│ MAIN      │ SUB       │                         │ SUB       │ MAIN      │
│ LEFT      │ LEFT      │       VIEWPORT          │ RIGHT     │ RIGHT     │
│ (außen)   │ (innen)   │       (3D Canvas)       │ (innen)   │ (außen)   │
├───────────┴───────────┴─────────────────────────┴───────────┴───────────┤
│  STATUS PANEL (full width) — horizontal                               │
└─────────────────────────────────────────────────────────────────────────┘
```

**Main** und **Sub** stehen **nebeneinander** (horizontal), nicht untereinander.  
Links: Main außen → Sub innen (Richtung Viewport). Rechts: Sub innen → Main außen.

---

**Category:** App Layout  
**Title:** Shell-Zonen (Pflicht)  
**Description:** Die App besteht aus: (1) Top Main, (2) Top Sub optional, (3) **Mittelzeile** = `Main Left | Sub Left | Viewport | Sub Right | Main Right`, (4) Status Bottom. Viewport = 3D-Engine, kein React-Inhalt. Side-Panels sind **5 Spalten** in einer Zeile — Main/Sub links und rechts **flankieren** den Viewport horizontal. React unter `src/ui/layout/`.

---

**Category:** App Layout  
**Title:** Top Main Panel  
**Description:** **Full width**, oberste Zeile. Zonen: **links** App-Titel/Branding; **mitte** **Kamera Quick Bar** (Details → [`requirements-camera.md`](./requirements-camera.md)) **+ direkt rechts daran** **Physics**-Cluster (**On** / **Freeze** — → [`requirements-physics.md`](./requirements-physics.md)); **rechts** Datei-Aktionen (z. B. *Save*, *Export*). Mindest-Höhe touch-ready (~44px).

---

**Category:** App Layout  
**Title:** Top Sub Panel  
**Description:** **Full width**, direkt **unter** Top Main. Optional (zweite Toolbar, Breadcrumb, Modus-Hinweis). Layout-Slot von Anfang an reservieren.

---

**Category:** App Layout  
**Title:** Left Main & Left Sub (horizontal)  
**Description:** **Zwei Spalten links** vom Viewport, **nebeneinander**: **Main Left** = äußerste Spalte (linke Bildschirmkante). **Sub Left** = daneben, **zwischen** Main Left und Viewport. Typisch später: Main = Asset-Bibliothek / Layer; Sub = Filter, Tags, Upload-Queue. Beide volle Höhe der Mittelzeile. Einzeln einklappbar. Mobile: als Drawer/Stack — Reihenfolge Main → Sub → Viewport beibehalten.

---

**Category:** App Layout  
**Title:** Right Main & Right Sub (horizontal)  
**Description:** **Zwei Spalten rechts** vom Viewport, **nebeneinander** — spiegelbildlich zu links: **Sub Right** = zwischen Viewport und Main Right (innen). **Main Right** = äußerste Spalte (rechte Bildschirmkante). Typisch später: Main = Properties / Export; Sub = Presets, History. Gleiche Collapse-/Drawer-Regeln wie links.

---

**Category:** App Layout  
**Title:** Mittelzeile — Spaltenreihenfolge  
**Description:** Feste Reihenfolge links → rechts: **`MainLeft` · `SubLeft` · `DetailLeft` · `Viewport` · `DetailRight` · `SubRight` · `MainRight`**. Detail-Spalten öffnen sich immer **zum Viewport hin** (links: rechts neben Sub, rechts: links neben Sub). **Overlay-Layout (seit 2026-10-30):** Grid hat nur `Rail (--panel-main-collapsed-width) | Viewport (minmax(0, 1fr)) | Rail`. Die eingeklappte Main-Nav (nur Icons) füllt genau die Rail. Ausgeklappte Main-Nav, Sub- und Detail-Panels liegen als `.app-shell__overlay` (`position: absolute`, Schatten) **über** dem Viewport — Viewport-Größe ändert sich nur mit dem Fenster, nicht beim Auf-/Zuklappen (stabiler Export-Rahmen). Leere Overlay-Fläche lässt Pointer-Input zum Viewport durch. Kein vertikales Stapeln von Main/Sub auf Desktop.

---

**Category:** App Layout  
**Title:** Status Panel (Bottom)  
**Description:** **Full width**, unter der Mittelzeile. **Horizontal** — Inhalte nebeneinander. Konkreter Inhalt **noch offen**. Kein Overlay über Viewport.

---

**Category:** App Layout  
**Title:** Viewport (Center)  
**Description:** 3D-Canvas in der **mittleren Spalte**. Nur Engine-Mount (`ViewportFrame`). Pan/Orbit/Zoom in Engine. Wächst/shrinkt zwischen Sub Left und Sub Right.

---

**Category:** App Layout  
**Title:** Main vs. Sub — Konvention  
**Description:** **Main** = primäres Panel einer Seite (außen). **Sub** = schmaleres/ergänzendes Panel (innen, näher am Viewport). Pro Seite max. **ein** Main + **ein** Sub. Sub darf leer/eingeklappt sein, Main unabhängig. Naming: `LeftMainPanel`, `LeftSubPanel`, `RightSubPanel`, `RightMainPanel`, `TopMainPanel`, `TopSubPanel`, `StatusPanel`, `AppShell`.

---

**Category:** App Layout  
**Title:** Side-Panels — scrollbar (Pflicht)  
**Description:** **Main Left, Sub Left, Main Right, Sub Right** — jede Spalte mit **eigenem vertikal scrollbarem Inhalt**. Viewport-Höhe ist fix (Mittelzeile); Panel-Inhalt darf beliebig wachsen (Environment, Ground, Camera, Lights, …). Sub- und Detail-Panels haben **keinen Titel-Header** — welcher Bereich offen ist, zeigt der aktive Main-Nav-Eintrag. Das Panel besteht aus **scroll body** (`overflow-y: auto`), optionalem Footer und Collapse-Zeile unten. Kein Page-Scroll der ganzen App für Panel-Inhalte. Horizontal: Panels selbst nicht scrollen (außer interne Listen mit eigener Mini-Scroll).

---

**Category:** App Layout  
**Title:** Panel Sections — viele Einstellungen skalierbar  
**Description:** **Umgesetzt:** **Main-Nav + Sub-Detail** — ein Nav-Punkt pro Feature, Detail im Sub-Panel (`SubPanel` + `SubPanelSection`). **Innerhalb** eines Sub-Panels: Sections (z. B. Camera: Projection, Saved views, Navigation). Früheres Accordion-Mehrfach-Stack im Right Main → ersetzt durch Nav-Rail (Demo freigegeben 2026-10-07). `SubPanelSection` projektweit wiederverwenden.

---

**Category:** App Layout  
**Title:** Scrollbar — Styling  
**Description:** Sichtbare, **schöne Scrollbars** in allen Side-Panel-Bodies — nicht OS-Default ungestylt. Details (Farbe, Breite, Hover) → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md). Scrollbar nimmt **keinen** extra Layout-Platz weg wo möglich (`scrollbar-gutter: stable` optional). Touch: nativer Momentum-Scroll; Wheel-Events in Panels **stoppen Propagation** — kein versehentliches Viewport-Zoom.

---

**Category:** App Layout  
**Title:** Panel-Zuordnung (Entwurf)  
**Description:** Vorläufige Zuordnung — kann sich verschieben, Struktur (scroll + sections) bleibt: **Right Main** = Nav-Rail (**Scene**, **Environment**, **Camera**, **Lighting**, **Physics**, **Export**, **Settings** — kein Ground). **Settings Sub:** Projekt, **Reset all…** → [`requirements-arrangements-and-persistence.md`](./requirements-arrangements-and-persistence.md). **Right Sub** = Detail zum gewählten Nav-Punkt (`EnvironmentSubPanel` inkl. Ground-Sektion, `CameraSubPanel`, `PhysicsSubPanel`, `ExportSubPanel`, …). **Physics Sub:** **World physics** (Start / Freeze-Toggle / Reset), **Test** (Rigid fall), **Gravity scale** — Details → [`requirements-physics.md`](./requirements-physics.md). **Export**-Inhalt (Format, Ground-Catcher, Pipeline) → ausschließlich [`requirements-export.md`](./requirements-export.md). **Kamera-Quick-Auswahl (Views + Slots) → Top Main**, nicht Right Sub. **Left Main** = Bibliotheken — **Ziel:** Scenes, Environments, **Light rigs**, Assets, Images, Colors, Materials; **aktuell:** **Environments**, **Light rigs**, **Arrangements**, Assets, Images, Colors, Materials (`shell-nav.ts` (`src/ui/shell/`); Scenes folgt). Arrangements → [`requirements-arrangements-and-persistence.md`](./requirements-arrangements-and-persistence.md). **Left Sub** = Listen + Apply/Save (`EnvironmentsPanel`, `ColorsPanel`, …). Konkrete Feature-Panels → jeweilige Requirement-Datei.

---

**Category:** App Layout  
**Title:** Main-Nav + Sub-Detail (entschieden)  
**Description:** **Main** (außen) = **Navigations-Rail**: Hauptbereiche mit Icon + Label, wählbar; **einklappbar auf Icon-only**. **Sub** (innen, am Viewport) = **Einstellungen/Inhalt** des gewählten Hauptbereichs — scrollbar, Formular/Liste/Presets. Kein Accordion-Mehrfach-Stack im Main. Links und rechts gleiches Muster. Shell-Details → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md).

---

**Category:** App Layout  
**Title:** Sub-Panel — Collapse (Shell & Detail)  
**Description:** Jedes Sub- und Detail-Panel hat **unten genau einen** Collapse-Button (`sub-panel__collapse-row`). **Hierarchie:** (1) **Main** — `main-nav__collapse` unten; klappt auf Icon-only (44px) und schließt zusätzlich **Sub + Detail derselben Seite**. (2) **Sub** — schließt Sub **und** Detail derselben Seite (Session-State in `AppShell`). (3) **Detail** — schließt das Detail-Panel durch **Aufheben der Auswahl** (z. B. `setSelectedEntity(null)`, `selectMaterial(null)`). **Wieder öffnen Sub:** Klick auf **Main-Nav-Eintrag**. **Kein** Reopen-Streifen am Viewport. Add-/Action-Footer **oberhalb** der Collapse-Zeile (`sub-panel__footer`).

---

**Category:** App Layout  
**Title:** Detail-Panel (Sub-Sub)  
**Description:** **Eigenes Panel** neben dem Sub-Panel — **kein** Split innerhalb einer Sub-Spalte. Sub zeigt nur die **Übersicht/Liste**; Klick auf einen Eintrag wählt ihn aus und öffnet daneben das Detail-Panel mit allen Einstellungen. **Öffnen:** Auswahl in der Liste **oder** im Viewport. **Schließen:** zweiter Klick auf den gewählten Eintrag oder Collapse-Button im Detail (hebt Auswahl auf). Erste Zeile im Detail = **Name** des gewählten Eintrags. Shell: `LeftDetailPanel` / `RightDetailPanel` (`src/ui/shell/`) wählen das Detail passend zum aktiven Main-Nav-Eintrag. **Live:** Scene (`SceneSubPanel` → `SceneDetailPanel`), Materials (`MaterialsPanel` → `MaterialDetailPanel`). **Bewusst ohne Detail-Panel:** Lighting (alle Lichter gleichzeitig sichtbar). **Kandidaten:** Images, Colors, Environments, Light rigs.

---

**Category:** App Layout  
**Title:** Panel-Breiten (list / form)  
**Description:** Panels sind **nicht breiter als nötig**. **Main-Nav:** `max-content` (längster Eintrag), eingeklappt `--panel-main-collapsed-width` (44px). **Sub/Detail:** `SubPanel` Prop `width`: **`list`** = `max-content`, begrenzt durch `--panel-list-min-width` (140px) / `--panel-list-max-width` (260px) — für reine Listen (Assets, Materials, Scene); **`form`** (Default) = feste `--panel-form-width` (220px) — für Label + Feld-Zeilen (Details, Camera, Lighting, Physics, Export, Environment, …). Keine weiteren Breiten-Modi.

---

**Category:** App Layout  
**Title:** Viewport helpers — Platzierung (Stand 2026-10-30)  
**Description:** **Viewport helpers** gehören **nicht** zur Umgebung. Sie liegen im **Scene** Sub-Panel unter der Entity-Liste (`ViewportHelpersBlock.tsx`). Das **Environment** Sub-Panel enthält nur Sky, Reflections, Fog, Ground. **Light fixtures**-Sichtbarkeit → **Lighting** Sub-Panel.

---

**Category:** App Layout  
**Title:** Scene Sub-Panel — Viewport helpers (scene-entity-block)  
**Description:** **Viewport helpers** im Scene-Panel als **`scene-entity-block`** (unter der Entity-Liste; bis 2026-10-30 fünfter Block im Environment-Panel) — aufklappbar, Eye schaltet **alle** Helper-Toggles gemeinsam ein/aus (Details → [`requirements-environment.md`](./requirements-environment.md) *Viewport helpers — Panel (scene-entity-block)*). **Light fixtures** bleiben im **Lighting** Sub-Panel.

