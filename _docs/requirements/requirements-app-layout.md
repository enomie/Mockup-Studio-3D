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
**Description:** **Full width**, oberste Zeile. Drei Zonen: **links** App-Titel/Branding; **mitte** **Kamera Quick Bar** (Persp/Ortho · Built-in Views · User-Slot-Chips — zentriert, Details → [`requirements-camera.md`](./requirements-camera.md)); **rechts** Datei-Aktionen (z. B. *Save*, *Export*). Mindest-Höhe touch-ready (~44px).

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
**Description:** Feste Reihenfolge links → rechts: **`MainLeft` · `SubLeft` · `Viewport` · `SubRight` · `MainRight`**. Viewport nimmt **flexiblen Rest** (`flex: 1` / `1fr`). Side-Panels feste oder min/max-Breiten aus Layout-Config. Kein vertikales Stapeln von Main/Sub auf Desktop.

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
**Description:** **Main Left, Sub Left, Main Right, Sub Right** — jede Spalte mit **eigenem vertikal scrollbarem Inhalt**. Viewport-Höhe ist fix (Mittelzeile); Panel-Inhalt darf beliebig wachsen (Environment, Ground, Camera, Lights, …). **Header** der Spalte (Titel, Collapse) bleibt **sticky** oben; darunter **scroll body** (`overflow-y: auto`). Kein Page-Scroll der ganzen App für Panel-Inhalte. Horizontal: Panels selbst nicht scrollen (außer interne Listen mit eigener Mini-Scroll).

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
**Description:** Vorläufige Zuordnung — kann sich verschieben, Struktur (scroll + sections) bleibt: **Right Main** = Nav-Rail (**Scene**, **Environment**, **Camera**, **Lighting**, **Export** — kein Ground). **Right Sub** = Detail zum gewählten Nav-Punkt (`EnvironmentSubPanel` inkl. Ground-Sektion, `CameraSubPanel`, `ExportSubPanel`, …). **Export**-Inhalt (Format, Ground-Catcher, Pipeline) → ausschließlich [`requirements-export.md`](./requirements-export.md). **Kamera-Quick-Auswahl (Views + Slots) → Top Main**, nicht Right Sub. **Left Main** = Bibliotheken — **Ziel:** Scenes, Environments, **Light rigs**, Assets, Images, Colors, Materials; **aktuell:** **Environments**, **Light rigs** (live), Assets, Images, Colors, Materials (`shell-nav.ts` (`src/ui/shell/`); Scenes folgt). **Left Sub** = Listen + Apply/Save (`EnvironmentsPanel`, `ColorsPanel`, …). Konkrete Feature-Panels → jeweilige Requirement-Datei.

---

**Category:** App Layout  
**Title:** Main-Nav + Sub-Detail (entschieden)  
**Description:** **Main** (außen) = **Navigations-Rail**: Hauptbereiche mit Icon + Label, wählbar; **einklappbar auf Icon-only**. **Sub** (innen, am Viewport) = **Einstellungen/Inhalt** des gewählten Hauptbereichs — scrollbar, Formular/Liste/Presets. Kein Accordion-Mehrfach-Stack im Main. Links und rechts gleiches Muster. Demo → [`requirements-demo.md`](./requirements-demo.md).

---
