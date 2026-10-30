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

### A3. Skalen (Vorschlag, noch zu entscheiden)
- **Font-size** – Ist: 10 / 11 / 12 / 13 px. Vorschlag: 3 Stufen (`--font-xs` 10?, `--font-sm` 11, `--font-md` 12) + Body 13.
- **Radius** – Ist: 2 / 3 / 4 / 5 / 6 / 8 / 50 %. Vorschlag: `--radius-sm` 3, `--radius-md` 4/6, `--radius-round` 50 %.
- **Spacing** – Ist: 1 / 2 / 4 / 6 / 8 / 10 px gemischt. Vorschlag: 2-4-6-8-Skala als Tokens.

### A4. Komponenten statt Klassen-Neuerfindung
Vor neuem Button/Chip/Toggle → existiert schon etwas? (siehe B2). Shared React-Komponenten liegen in `src/ui/components/`:
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

- [ ] **1. Tokens** – fehlende Tokens definieren, Farbpalette auf ~10–12 Werte eindampfen, Hex-Codes ersetzen.
- [ ] **2. Skalen** – Font-size, Radius, Spacing als Tokens festlegen und anwenden.
- [ ] **3. Buttons** – eine Button-Basis (`.btn` + Varianten icon/chip/danger) oder Komponente; Active-State vereinheitlichen (`aria-pressed` / `--active`).
- [ ] **4. Toggles/Segmente** – `side-toggle`, `panel-toggle-group`, Projection-Toggle zusammenführen.
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
