# UI & CSS Guide

Lebendes Referenz-Dokument für UI und CSS in Mockup Studio 3D.
Zwei Zwecke:

1. **Aufräumen** – Bestandsaufnahme + Abarbeitungsliste (Teil B/C).
2. **Regelwerk** – Was man beim Bauen neuer Features nachschlägt (Teil A). Wird bei jedem Cleanup-Schritt ergänzt.

Verwandt: [`requirements-look-and-feel.md`](../requirements/requirements-look-and-feel.md), [`requirements-app-layout.md`](../requirements/requirements-app-layout.md), [`requirements-colors.md`](../requirements/requirements-colors.md).

---

## A. Regeln (Stand: Entwurf – wird pro Schritt festgezurrt)

### A1. Wo CSS lebt
- Eine Datei: `src/ui/styles/app.css` (aktuell ~1660 Zeilen). Kein Tailwind, keine CSS-in-JS-Lib.
- Naming: BEM-artig `.block__element--modifier`.
- Inline `style={{…}}` nur für **dynamische Werte** (z. B. Farbe eines Swatches, Slider-Position) – nie für Layout/Abstände.
- 🔲 *Offen:* app.css in Abschnitte/Dateien aufteilen? (Tokens / Shell / Panels / Controls / Feature-spezifisch)

### A2. Design Tokens (`:root`)
Neue Werte **immer** über Tokens, keine Hex-Codes direkt in Regeln.

| Gruppe | Vorhanden | Offen |
|---|---|---|
| Farben Text | `--color-text`*, `--color-text-secondary`, `--color-text-muted` | *`--color-text` wird verwendet, ist aber nicht definiert (body hat `#1a1a1a` hart) |
| Farben Rahmen | `--color-border`, `--color-border-light`, `--color-border-strong`* | *nicht definiert |
| Active/Selected | `--color-active-bg/-border/-text` | Konkurriert mit hartem Blau `#7eb8e8`, `#0284c7`, `#4a7dff`, `#eef6fc` |
| Flächen | `--color-panel-subtle`* | *nicht definiert; `#fff`, `#fafafa`, `#f0f0f0`, `#f5f5f5`, `#f3f3f3`, `#f3f4f6` hart |
| Danger | – | `#e55353`, `#b33`, `#f00`, `#fdf0f0` |
| Panel-Abstände | `--panel-pad-x/-y`, `--panel-gap`, `--panel-stack-gap` | Rest nutzt freie px-Werte |
| Typo / Radius | – | siehe A3 |

### A2a. Farbpalette (Schritt 1 – umgesetzt 2026-10-30)

> **Regel:** In `app.css` stehen Farben nur noch im `:root`-Block. Überall sonst `var(--color-…)`. Einzige Ausnahme: Color-Picker-Spektrum/Sättigungsverläufe. Alte Namen `--color-active-*` → `--color-accent-*`, `--color-border-light` → `--color-border`, `--color-panel-subtle` → `--color-surface-subtle`. Zusätzlich: `--color-text-on-accent`, `--color-checker`, `--color-mark-anchor/-edge`.

Ziel: 51 rohe Farbwerte → **16 Tokens** + klar abgegrenzte Ausnahmen.

| Token | Wert | Ersetzt (Ist-Werte, Anzahl) | Wofür |
|---|---|---|---|
| **Flächen** ||||
| `--color-bg` | `#ffffff` | `#fff` (21) | Panels, Inputs, Karten |
| `--color-surface-subtle` | `#fafafa` | `#fafafa` (8), `#f8fafc`, `#f7f7f7`, `#f5f5f5` (3) | Sektions-/Listen-Hintergrund |
| `--color-surface-hover` | `#f0f0f0` | `#f0f0f0` (5), `#f3f3f3` (2), `#f3f4f6` (2), `#eee` als Fläche | Hover auf neutralen Elementen |
| **Rahmen** ||||
| `--color-border` | `#e5e5e5` | `#e5e5e5`, `#e8e8e8`, `#eee` als Linie | Standard-Trennlinie (merged mit `--color-border-light`) |
| `--color-border-strong` | `#d0d0d0` | `#e0e0e0` (8), `#ddd`, `#d0d0d0` (2), `#ccc` (2) | Input-/Button-Rahmen |
| **Text** ||||
| `--color-text` | `#1a1a1a` | `#1a1a1a`, `#000`, `#333` (6), `#444` (3) | Haupttext, Icon-Hover |
| `--color-text-secondary` | `#666666` | `#666` | Labels |
| `--color-text-muted` | `#8a8a8a` | `#888`, `#94a3b8` | Hints, Platzhalter, Meta |
| **Akzent (Auswahl/Aktiv/Fokus)** ||||
| `--color-accent` | `#2f6bff` | `#4a7dff` (3), `#0284c7` (3) | Aktiver Toggle, Fokusring |
| `--color-accent-text` | `#1a56db` | `#1a56db` | Text/Icon auf Akzent-BG |
| `--color-accent-bg` | `#eef4ff` | `#eef4ff`, `#eef6fc` (4), `#eef3ff`, `#f2f5ff`, `#e0f2fe`, `#e4f0f9` | Selected-Hintergrund |
| `--color-accent-border` | `#93b4ff` | `#93b4ff` (2), `#7eb8e8` (8) | Selected-Rahmen |
| **Danger** ||||
| `--color-danger` | `#d93636` | `#e55353` (3), `#b33` (3), `#922`, `#f00` (als Text) | Löschen, Fehler |
| `--color-danger-bg` | `#fdf0f0` | `#fdf0f0` (2), `#fce8e8` | Danger-Hover |
| **Scrollbar** ||||
| `--color-scrollbar` | `#c4c4c4` | `#c4c4c4` (4) | laut Look & Feel |
| `--color-scrollbar-hover` | `#a8a8a8` | `#a8a8a8` | |

**Schatten** (keine Farben, aber gleiche Logik):
`--shadow-sm: 0 1px 2px rgb(0 0 0 / 8%)` · `--shadow-md: 0 2px 8px rgb(0 0 0 / 12%)` · `--shadow-popover: 0 4px 16px rgb(0 0 0 / 18%)` (ersetzt 8/12/18/35 %).

**Bewusste Ausnahmen (bleiben, aber als eigene Tokens):**
- Color-Picker-Hue-Verlauf (`#f00 #ff0 #0f0 #0ff #00f #f0f`) – Spektrum, gehört so.
- Patch-Punkt-Markierungen (`#0284c7`, `#a855f7`, `#ec4899`, `#eab308`) – sind *Daten-/Annotationsfarben*, nicht UI-Chrome → `--color-mark-*`.

**Größte Änderung:** Heute gibt es zwei „Auswahl-Welten“ – ein *helles Himmelblau* (`#7eb8e8`/`#eef6fc` bei Materials, Lights, Scene-Entities) und ein *kräftiges Blau* (`#4a7dff`/`#93b4ff`/`#eef4ff` bei Toggles und den bestehenden Tokens). Vorschlag: alles auf **eine** Akzentfamilie (die kräftige). → Auswahl sieht überall gleich aus.

**Offene Fragen:**
1. Akzent: kräftiges Blau `#2f6bff` (Vorschlag) oder Figma-Blau `#0d99ff`?
2. `--color-border-light` mit `--color-border` zusammenlegen (Vorschlag: ja)?
3. Dark Mode jetzt schon mitdenken? (Mit Tokens später nur ein zweiter `:root`-Block.)

### A3. Skalen (Schritt 2 – umgesetzt 2026-10-30)

> **Regel:** `gap`, `padding`, `margin`, `font-size`, `border-radius` nur über Tokens. Einzige px-Ausnahme: `1px` (Haarlinien/Mini-Gaps).

| Skala | Tokens | Zusammengelegt |
|---|---|---|
| Spacing | `--space-1` 2 · `-2` 4 · `-3` 6 · `-4` 8 · `-5` 12 · `-6` 24 | 5→4, 10→8 |
| Font-size | `--font-xs` 10 · `--font-sm` 11 · `--font-md` 12 · `--font-base` 13 (Body) | – |
| Radius | `--radius-sm` 3 · `--radius-md` 4 · `--radius-lg` 6 · `--radius-round` 50 % | 2→3, 5→4, 8→6 |
| Control-Höhe | `--control-h-sm` 22 · `--control-h` 28 | 24/32/36 bleiben vorerst (Schritt 3) |

Panel-Tokens (`--panel-pad-x/-y`, `--panel-gap`, `--panel-stack-gap`) sind jetzt Aliase auf die Spacing-Skala.

### A4. Buttons (Schritt 3 – umgesetzt 2026-10-30)

> **Regel:** Jeder Button ist `.btn` + Modifier. **Aktiv/gedrückt = `aria-pressed="true"`** – keine `--active`/`--on`-Klassen mehr. Keine neuen Button-Klassen erfinden; Kontext-Klassen (z. B. `side-toggle__btn`, `camera-slot-card__action`) nur für Layout (Breite, Ausrichtung), nie für Farbe/Rahmen.

| Klasse | Aussehen | Wofür |
|---|---|---|
| `.btn` | randlos, transparent, Hover grau | Toolbar, Chips, Aktionen in Panels |
| `.btn--icon` | quadratisch `--control-h` | nur Icon (`ToolbarIconButton`) |
| `.btn--outline` | weiß mit Rahmen | Auswahl-Buttons in Panels (Left/Right, Start/Pause …) |
| `.btn--danger` | rote Schrift, roter Hover | Löschen |
| `.btn--add` | gestrichelt, volle Breite | „+ Hinzufügen“ am Listenende |
| `.btn--block` | volle Breite | |
| `.btn__key` | Tastenkürzel-Badge im Button | |

Mehrfach-Toggle-Leiste (X | Y | Z): Komponente `PanelToggleGroup` (eigene Optik, ebenfalls `aria-pressed`).
Noch **nicht** migriert (Teil von Schritt 5): Header-Buttons in `.scene-entity-block`, Collapse-Buttons von Panels/Nav.

Shared React-Komponenten in `src/ui/components/`:
`SubPanel`, `SubPanelSection`, `SubPanelCollapse*`, `PanelCheckbox`, `PanelSelect`, `PanelTextField`, `PanelAxisField`, `PanelToggleGroup`, `RangeSlider`, `ColorPicker`, `ToolbarIconButton`, `Icon`.

### A5. Checkliste für neue Features
- [ ] Bestehende Komponente aus `src/ui/components/` verwendet?
- [ ] Nur Tokens, keine neuen Hex-/px-Magic-Numbers?
- [ ] Hit-Area touch-tauglich (Look & Feel: ~44 px bzw. bewusste Ausnahme)?
- [ ] Kein Hover-only für kritische Aktionen?
- [ ] Neue Klassen hier in Teil A/B nachgetragen, falls neues Muster?

---

## B. Bestandsaufnahme (2026-10-30)

### B1. Zahlen
- 1 CSS-Datei, 1664 Zeilen, **0 `@media`-Queries** (Responsive-Anforderung aus Look & Feel aktuell nicht umgesetzt).
- **51** verschiedene rohe Farbwerte (Hex/rgba) neben den Tokens.
- Inline-Styles in 7 Dateien: `ColorPicker.tsx`, `ColorPickerPopover.tsx`, `ViewportFrame.tsx`, `RangeSlider.tsx`, `DualRangeSlider.tsx`, `ColorsPanel.tsx`, `MaterialsPanel.tsx`.

### B2. Button-/Chip-/Toggle-Wildwuchs
Ähnliche Rolle, verschiedene Klassen:

| Rolle | Klassen |
|---|---|
| Icon-Button | `.top-bar__btn--icon`, `.toolbar-chip-btn--icon`, `.sub-panel__icon-btn`, `.viewport-tools__btn` |
| Text-Chip | `.toolbar-chip-btn`, `.preset-chip`, `.camera-quick-bar__chip`, `.camera-projection-chip` |
| Segment/Toggle | `.panel-toggle-group__button`, `.side-toggle__btn`, `.camera-panel-projection__btn` |
| Add-Button | `.image-add-btn` |
| Active-Modifier | `--active`, `--on`, `--selected`, `[aria-pressed]` gemischt |

### B3. Listen/Tiles
`.image-tile`, `.material-tile`, `.scene-entity-block`, `.light-role-block`, `.camera-slot-card`, `.simple-list`, `.preset-list` – teils gleiche Struktur (Thumb + Meta + Selected).

### B4. Auffälligkeiten
- `.camera-quick-bar__chip` ist an zwei Stellen definiert (Z. ~149 und ~276).
- Undefinierte Tokens (`--color-text`, `--color-border-strong`, `--color-panel-subtle`) → Fallback greift unbemerkt.

---

## C. Cleanup-Roadmap (der Reihe nach)

Jeder Schritt: besprechen → umsetzen → Teil A aktualisieren → Häkchen.

- [x] **1. Tokens** – fehlende Tokens definieren, Farbpalette auf ~10–12 Werte eindampfen, Hex-Codes ersetzen.
- [x] **2. Skalen** – Font-size, Radius, Spacing als Tokens festlegen und anwenden.
- [x] **3. Buttons** – eine Button-Basis (`.btn` + Varianten icon/chip/danger) oder Komponente; Active-State vereinheitlichen (`aria-pressed` / `--active`).
- [x] **4. Toggles/Segmente** (mit Schritt 3 erledigt) – `side-toggle`, `panel-toggle-group`, Projection-Toggle zusammenführen.
- [ ] **5. Listen & Tiles** – gemeinsames Tile/Row-Muster.
- [ ] **6. Panels & Sections** – Header/Body/Footer-Abstände konsistent.
- [ ] **7. Inline-Styles** – auf dynamische Werte reduzieren.
- [ ] **8. Datei-Struktur** – app.css aufteilen.
- [ ] **9. Responsive/Touch** – Entscheidung, was davon jetzt wirklich gilt.

---

## D. Entscheidungs-Log
| Datum | Entscheidung |
|---|---|
| 2026-10-30 | Guide angelegt. |
| 2026-10-30 | Palette umgesetzt: eine Akzentfamilie (`#2f6bff`), Himmelblau-Auswahl entfällt; border-light mit border zusammengelegt; Dark Mode später. |
| 2026-10-30 | Skalen umgesetzt: 6 Spacing-, 4 Font-, 4 Radius-Stufen, 2 Control-Höhen. |
| 2026-10-30 | Buttons: ~25 Klassen → `.btn` + 6 Modifier; Aktiv-Zustand einheitlich über `aria-pressed`. Ungenutzte `.sub-panel__icon-btn` entfernt. |
