# Look & Feel

Visuelles Design und UX von Mockup Studio 3D.

---

**Category:** Look & Feel  
**Title:** Figma-like workspace, not Adobe  
**Description:** Die UI soll sich an Figma orientieren — nicht an Adobe-Produkten (Photoshop, Illustrator, XD). Helle Arbeitsfläche als Standard: clean, minimal, viel Weißraum. Keine dunklen Panel-Wüsten, keine überladene Toolbar-Kultur.

---

**Category:** Look & Feel  
**Title:** Responsive & touch-ready  
**Description:** UI funktioniert auf **Desktop und Mobile** (alle gängigen Browser). Layout responsive: Desktop = Sidebars/Toolbar; Mobile = Drawer/Bottom-Sheets statt schmaler Multi-Panel-Leiste. **Touch-ready:** ausreichend große Hit-Areas (min. ~44px), kein Hover-only für kritische Aktionen, Touch-Gesten für Viewport bewusst definieren (Pan/Pinch vs. Scroll-Konflikt vermeiden). Canvas füllt verfügbaren Platz; UI-Chrome darf Viewport nicht überdecken.

---

**Category:** Look & Feel  
**Title:** Viewport-Steuerung (Space = Pan)  
**Description:** **Leertaste gedrückt halten + Ziehen** = Arbeitsfläche verschieben (Pan), wie Figma Hand-Tool / Blender. Cursor wechselt zu Hand-Symbol. **Ohne Space:** Linksklick + Ziehen = Orbit; **Linksklick** (ohne Drag, &lt; 4 px) = Select/Deselect. **Mausrad = Zoom** — Wirkung abhängig von Projection: **Perspective** = näher/weiter (Dolly); **Orthographic** = Frustum-Zoom (siehe [`requirements-camera.md`](./requirements-camera.md)). Mittlere Maustaste = Pan (Alternative zu Space). **Rechte Maustaste + Ziehen** = Pan (siehe nächster Block). Mobile: 2-Finger-Drag = Pan, Pinch = Zoom. Space-Pan darf nie mit UI-Scroll kollidieren — Events nur auf dem Canvas wenn Fokus im Viewport.

---

**Category:** Look & Feel  
**Title:** Viewport-Steuerung — RMB Pan & Click-Select  
**Description:** **Rechte Maustaste gedrückt halten + Ziehen** = Pan (gleichwertig zu Space+Drag und MMB-Drag). **Linksklick** (ohne Drag) auf Objekt = Select/Deselect — unabhängig vom aktiven Tool (Select/Move/Rotate/Scale). **Linksklick + Ziehen** = Kamera Orbit. Click-vs-Drag-Schwelle: 4 px (`VIEWPORT_CLICK_DRAG_THRESHOLD_PX`). Gizmo-Handle hat Priorität; Gizmo-Drag blockiert Orbit. Siehe auch [`requirements-scene-placement.md`](./requirements-scene-placement.md).

---

**Category:** Look & Feel  
**Title:** Panel-Scrollbars (Figma-like)  
**Description:** Side-Panels (Left/Right Main + Sub) nutzen **custom scrollbars** — dezent, nicht Windows-95-dick. Richtwerte: **~6–8px** Breite, **abgerundeter Thumb**, Track **transparent** oder leicht `#f0f0f0`, Thumb **`#c4c4c4`**, Hover **`#a8a8a8`**. WebKit: `::-webkit-scrollbar` + thumb/track; Firefox: `scrollbar-width: thin`, `scrollbar-color`. Figma-Ästhetik: Scrollbar erscheint bei Hover/Scroll oder dauerhaft dünn — **dauerhaft dünn** bevorzugt (Mockup-Studio: viele Panels, User muss Scrollbar sehen). Kein horizontales Scrollen in Property-Panels.

---

**Category:** Look & Feel  
**Title:** Panel Sections (Accordion)  
**Description:** Aufklappbare Sections: **13–14px** Section-Titel, semibold, Chevron rechts, **~40px** Zeilenhöhe (touch-ready). Getrennt durch **1px** `#e8e8e8`. Inhalt: **12–16px** Padding, Form-Controls wie Figma Properties (Label links, Control rechts oder volle Breite). Eingeklappte Section: nur Titelzeile — spart Platz bei „ziemlich vielen" Panels.

---

**Category:** Look & Feel  
**Title:** Icons — Lucide (Pflicht)  
**Description:** Alle UI-Icons kommen aus **[Lucide](https://lucide.dev/icons/)** — einheitlicher Stroke-Stil, passt zum Figma-like Workspace. **Kein Mix** mit anderen Icon-Sets (kein Material, Font Awesome, Emoji als UI-Icons). Lizenz: **ISC** — frei für kommerzielle Nutzung. Referenz & Suche: [lucide.dev/icons](https://lucide.dev/icons/) (Kategorien u. a. Design, Photography, Layout, Weather). Kein separates „Mockup-Studio"-Icon-Pack — Lucide deckt die Domäne über generische UI-Icons ab.

---

**Category:** Look & Feel  
**Title:** Icon-Stil & Größen  
**Description:** **Outline/Stroke** — kein Fill-Variant als Standard. Default **18px** in Panels und Listen, **20px** in Toolbar/Top Main, **16px** nur für enge Inline-Hints. **Stroke width 1.5** (Panels) bzw. **2** (Toolbar) — konsistent pro Kontext. Farbe via **`currentColor`** (CSS/Textfarbe des Buttons oder Labels), nicht hardcoded pro Icon. Aktiv/Selected: stärkere Textfarbe oder Primary-Tint — **kein** zweites Icon-Glyph für den gleichen Zustand. Touch-Targets min. ~44px — Icon zentriert im Button, nicht das Icon vergrößern.

---

**Category:** Look & Feel  
**Title:** Icon-Zuordnung (Entwurf)  
**Description:** Feste Lucide-Namen pro Feature-Bereich (anpassbar, aber immer Lucide): **Top:** `save`, `download`, `share-2`. **Kamera Quick Bar (Top Main, zentriert):** Text-Chips — **Persp/Ortho** (links), Built-ins (Default … Right), User-Slots; Shortcut-Badge in Chip. Optional Icons TBD (`home` Default, `bookmark` belegter Slot). Shortcut in `title`/`aria-label` (z. B. „Front (2)", „Slot 1 (8)"). **Images:** `image`, `plus` (add). **Layers:** `layers`. **Environment:** `sun`, `cloud-fog`. **Ground:** `layers`. **Camera (Right Main Nav):** `camera`. **Lights:** `lightbulb`, `lamp`, `sun`. **Viewport-Tools:** `mouse-pointer` (Select **W**), `move` (Move **E**), `rotate-cw` (Rotate **R**), `scaling` (Scale **T**) — Shortcut in `title`/`aria-label` (z. B. „Move (E)"). **Panels:** `chevron-down` / `chevron-right` (Accordion), `plus` / `trash-2` (Add/Remove), `sliders-horizontal` (Settings). **Modi:** `hand` (Pan-Hinweis). Mapping bei neuen Features hier ergänzen.

---

**Category:** Look & Feel  
**Title:** Icons — Implementierung (React)  
**Description:** Package **`lucide-react`** — Icons als React-Komponenten importieren, **tree-shaking** (nur genutzte Icons im Bundle). Wrapper optional: `src/ui/components/Icon.tsx` für Default-Size/Stroke. Keine Icon-Font, keine SVG-Sprites manuell, keine kopierten SVGs im Repo. Technische Details → [`requirements-code.md`](./requirements-code.md).

---

**Category:** Look & Feel  
**Title:** Design-Richtlinien — kompakte Dichte (Referenz: UI-Demo)  
**Description:** Verbindliche UI-Dichte aus der **freigegebenen Demo-Shell** ([`requirements-demo.md`](./requirements-demo.md)). Basis-Schrift **13px** Body, **12px** Panel-Labels/Nav. **Top Main ~36px**, Icon-Buttons **28×28px**, Icons darin **16px** / stroke **1.75**. **Top Sub ~28px** — Breadcrumb + Viewport-Tools. **Status ~24px**, **11px** Text. Nicht plump — eher Figma/Linear-Dichte als Adobe-Toolbar.

---

**Category:** Look & Feel  
**Title:** Design-Richtlinien — Farben & Zustände  
**Description:** CSS-Variablen in `src/ui/styles/app.css` (Single Source für UI-Chrome): Border `#e5e5e5` / `#e8e8e8`, Text muted `#888`, secondary `#666`. **Aktiv/Selected:** BG `#eef4ff`, Text `#1a56db` (Primary-Tint). Main-Nav BG `#fafafa`, Sub-Panel/Content BG `#fff`. Viewport-Canvas-Hintergrund `#f0f0f0`. Hover: dezent `#f0f0f0` / `#fafafa` — kein starkes Grau.

---

**Category:** Look & Feel  
**Title:** Design-Richtlinien — Layout Main-Nav + Sub-Detail  
**Description:** **Main** (außen): Icon-Nav, **132px** expanded / **44px** Icon-Rail collapsed. **Sub** (innen): **196px**, Header **12px** semibold, Body-Padding **8–10px**. Listeneinträge **~32px** (Nav), **~28–36px** (Tiles/Chips). Trennlinien zwischen Spalten, **kein** Card-Overkill. Details → [`requirements-app-layout.md`](./requirements-app-layout.md).

---

**Category:** Look & Feel  
**Title:** Design-Richtlinien — Scrollbars & Form Controls  
**Description:** Scrollbars **7px** (Sub-Panel), **5px** (Main-Nav), Thumb `#c4c4c4`, Hover `#a8a8a8`. Dummy-/Form-Inputs: Höhe **28px**, Radius **5–6px**, Label **11px**. Preset-Chips / Asset-Tiles: kompakt, **12px** Text. Wheel in Panels: Propagation stoppen (kein Viewport-Zoom).

---

**Category:** Look & Feel  
**Title:** Icon-Stil & Größen (aktualisiert)  
**Description:** In **kompakter Shell** (Demo-Referenz): Nav/Panel-Icons **16px** stroke **1.75**; Top-Main-Actions **16px** in **28px** Hit-Area. Größere 18–20px nur wenn explizit außerhalb der Demo-Dichte — Default ab jetzt **16px** in Side-UI. Touch: Hit-Area vergrößern, nicht das Glyph.

---

**Category:** Look & Feel  
**Title:** Sub-Panel — kompakte Dichte (CSS-Variablen)  
**Description:** Minimal Padding über Variablen in `app.css`: `--panel-pad-x` / `--panel-pad-y` (**6px** / **4px**), `--panel-gap` (**2px** Zeilen), `--panel-section-gap` (**6px** Sektions-Trenner). Sub-Panel Header **11px** semibold. Sektions-Titel **10px** uppercase. Body: **nur vertikal** scrollen (`overflow-x: hidden`). Abstände in Sektionen via `gap`, nicht per Einzel-`margin-bottom` an Controls.

---

**Category:** Look & Feel  
**Title:** Property-Zeilen — `panel-field-*`  
**Description:** Einheitliche Zeile für **ColorPicker**, **SliderValueField** (Near/Far/Fade): **`panel-field-row`** — Label **links** (`panel-field-label`, 11px, secondary), Controls **rechts** (`panel-field-controls`, `justify-content: flex-end`). Input **`panel-field-input`**: **72×22px**, Radius **4px**, Mono. Unit **`panel-field-unit`**: 10px muted. ColorPicker-Swatch **22×22px**. Slider-Track **16px** Zeilenhöhe, Fill `#93b4ff`. Kein horizontales Scrollen — Inhalte müssen in **196px** Sub-Panel-Breite passen.

---

**Category:** Look & Feel  
**Title:** Panel-Form-Controls — Layout-Konvention & Shared Components  
**Description:** Drei Layout-Muster in Sub-Panels (196px Breite). **Horizontal** (`panel-field-row`): Label links, kompaktes Control rechts — Farbe (`ColorPicker`), Checkbox (`PanelCheckbox`), Zahlen (`PanelTextField` row / `SliderValueField`), Read-only (`panel-field-value`). **Stack** (`panel-field-stack`): Label oben, Control full-width — Dropdown (`PanelSelect` / `panel-field-select`, 22px), Text-Name (`PanelTextField` stack / `panel-field-input--full`, 12px system). **Slider** (`panel-slider`): Label → Track → optionale Wertzeile (`SliderValueField`). Numerische Felder mit Einheit: **`panel-field-unit` rechts** neben dem Wert (`Label | Wert | Unit`) — Einheit **nicht** im Label. Dimensionlose Werte (Roughness, Intensity, Size) ohne Unit-Suffix. Shared Components: `ColorPicker`, `RangeSlider`/`DualRangeSlider`, `PanelCheckbox`, `PanelSelect`, `PanelTextField`. Kein Legacy-`dummy-field`.

---

**Category:** Look & Feel  
**Title:** Panel-Stack — vertikales Spacing-System  
**Description:** Zwei Ebenen in `app.css`: **`--panel-gap`** (**2px**) — Felder innerhalb `sub-panel-section__body`; **`--panel-stack-gap`** (**6px**) — vertikaler Rhythmus zwischen Body-Kindern, Sektions-Trennern und Block-Abständen (Entity-Liste, Geometry-Rows, Light-Role-Block). Utility **`.panel-stack`**: `display: flex; flex-direction: column; gap: var(--panel-stack-gap)`. Auf **`sub-panel__body`** und **`scene-entity-block__body`** anwenden. Aufeinanderfolgende **`sub-panel-section`**: negativer `margin-top` cancelt flex-gap; **`border-top`** + **`padding-top: var(--panel-stack-gap)`** vor dem Titel — kein `padding-top`-Hack am Titel, keine kontextspezifischen Section-Padding-Overrides. Sub-Panel-Breite **`--panel-sub-width: 220px`**. Keine hardcodierten 8px/10px-Margins für Panel-Listen — nur die zwei Tokens.

---
