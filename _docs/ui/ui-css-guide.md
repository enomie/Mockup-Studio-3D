# UI & CSS Guide

Lebendes Referenz-Dokument für UI und CSS in Mockup Studio 3D.
Zwei Zwecke:

1. **Aufräumen** – Bestandsaufnahme + Abarbeitungsliste (Teil B/C).
2. **Regelwerk** – Was man beim Bauen neuer Features nachschlägt (Teil A). Wird bei jedem Cleanup-Schritt ergänzt.

Verwandt: [`requirements-look-and-feel.md`](../requirements/requirements-look-and-feel.md), [`requirements-app-layout.md`](../requirements/requirements-app-layout.md), [`requirements-colors.md`](../requirements/requirements-colors.md).

---

## A. Regeln (Stand: Entwurf – wird pro Schritt festgezurrt)

### A1. Wo CSS lebt (Schritt 8 – umgesetzt 2026-10-30)

`src/ui/styles/app.css` ist nur noch der Einstieg und importiert in fester Reihenfolge (spätere Dateien dürfen frühere überschreiben):

| Datei | Inhalt | Neue Regeln hierhin, wenn … |
|---|---|---|
| `tokens.css` | alle Variablen (`:root`) | neuer Farb-/Größenwert gebraucht wird – erst prüfen, ob ein bestehender passt |
| `base.css` | Reset, `html/body/#root` | fast nie |
| `shell.css` | Top-Bars, Navigation, Seitenpanels, Sections, Viewport, Statuszeile | es um den App-Rahmen geht |
| `controls.css` | `.btn`, Felder, Selects, Checkbox, Toggle-Group, Slider | ein wiederverwendbares Bedienelement entsteht |
| `lists.css` | `.tile-list`, `.tile` | – (Muster ist fertig) |
| `features/camera.css` | Kamera-Leiste, Projektion, Slots | |
| `features/scene.css` | Szenen-Blöcke, Entity-Detail | |
| `features/patch-inspector.css` | Patch-Punkt-Inspector | |
| `features/color-picker.css` | Color-Picker + Popover | |

- **Neues Feature mit eigenem Look** → eigene Datei unter `features/` + `@import` in `app.css` anhängen.
- Naming: BEM-artig `.block__element--modifier`. Ein Block lebt in genau einer Datei.
- Kein Tailwind, keine CSS-in-JS-Lib. Inline-Styles: siehe A8.

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

### A6. Listen & Tiles (Schritt 5 – umgesetzt 2026-10-30)

> **Regel:** Auswählbare Listen = `ul.tile-list > li > button.tile`. **Ausgewählt = `aria-current="true"`** (nicht `aria-pressed` – Auswahl in einer Liste ist kein Umschalter). Keine panel-spezifischen Tile-Klassen mehr.

```
<ul class="tile-list">
  <li>
    <button class="tile" aria-current="true">
      <span class="tile__thumb">…img/icon…</span>   <!-- oder tile__swatch (Farbfläche) -->
      <span class="tile__meta">
        <span class="tile__name">Name</span>
        <span class="tile__detail">Kategorie · Info</span>
      </span>
    </button>
  </li>
</ul>
```

| Klasse | Wofür |
|---|---|
| `.tile-list` / `.tile-list__row` | Liste; Row = Tile + Nebenbuttons in einer Zeile |
| `.tile__thumb` (+ `--icon`) / `.tile__swatch` | 32px Vorschaubild / Icon / Farbfläche |
| `.tile__name`, `.tile__detail`, `.tile__detail-text` | Text |

Verwendet in: Assets, Images, Materials, Colors, Environments, Light rigs.

**Szenen-Einträge** (`.scene-entity-block`) bleiben eigenes Muster (aufklappbarer Block mit Body). Header-Buttons: `.scene-entity-block__action` (+ `--danger`) statt drei Einzelklassen.

**Kamera-Slots** (`.camera-slot-card`) bleiben eigenes Karten-Muster (enthält Formular + Aktionen).

### A7. Panels, Sections & Felder (Schritt 6 – umgesetzt 2026-10-30)

**Aufbau eines Seitenpanels** – immer über die Komponenten, nie selbst nachbauen:

```
SubPanel (.sub-panel --form|--list, --left|--right)
├─ .sub-panel__body           ← scrollt, Padding --panel-pad-y/-x
│   └─ .panel-stack           ← Abstand --panel-stack-gap
│       ├─ SubPanelSection    ← Titel (10px, uppercase) + Body; Trennlinie zwischen Sections automatisch
│       │   └─ .panel-field-row   ← Label links, Control rechts, min. --row-h
│       │   └─ .panel-field-stack ← Label oben, Control volle Breite
│       └─ <p class="panel-hint"> ← Hinweistext
├─ .sub-panel__footer         ← optional, fix unten
└─ SubPanelCollapseBar/Row    ← Einklappen
```

**Felder:** `.panel-field-input` (schmal, Zahlen, monospace) · `.panel-field-input .panel-field-input--full` (Text, volle Breite) · `.panel-field-select`. Alle teilen eine Basis: Höhe `--control-h-sm`, Hover = stärkerer Rahmen, **Fokus = Akzent-Rahmen**, Disabled = `--opacity-disabled`, Fehler = `--invalid`.

**Navigation:** aktiver Eintrag = `aria-current="page"` (keine `--active`-Klasse).

**Neue Tokens:** `--control-h-lg` 32 · `--row-h` 24 · `--tile-h` 36 · `--opacity-disabled` 0.45 · `--opacity-hidden` 0.5.

**Zustände – Übersicht:**

| Zustand | Wie |
|---|---|
| Button an/aus | `aria-pressed` |
| Ausgewählt in Liste | `aria-current="true"` |
| Aktive Navigation | `aria-current="page"` |
| Deaktiviert | `disabled` → `--opacity-disabled` |
| Ungültig | `--invalid`-Modifier → `--color-danger` |

### A8. Inline-Styles (Schritt 7 – umgesetzt 2026-10-30)

> **Regel:** `style={…}` nur für Werte, die **zur Laufzeit berechnet** werden. Alles Feste (Abstände, Farben aus der Palette, Größen) → Klasse in `app.css`.

Erlaubte Fälle (Stand heute, alle geprüft):

| Wo | Was |
|---|---|
| `RangeSlider`, `DualRangeSlider` | Füllbreite + Thumb-Position |
| `ColorPicker`, `ColorPickerPopover` | Farbfelder, Hue-Fläche, Cursor-Position, Popover-Position |
| `ColorsPanel`, `MaterialsPanel` | Swatch-Farbe |
| `LightRigsPanel`, `EnvironmentsPanel` | Swatch-Verlauf aus Preset-Farben |
| `engine/camera-controller.ts` | Canvas-Cursor (grab/grabbing), `touch-action` |

### A5. Checkliste für neue Features
- [ ] Bestehende Komponente aus `src/ui/components/` verwendet?
- [ ] Nur Tokens, keine neuen Hex-/px-Magic-Numbers?
- [ ] Hit-Area touch-tauglich (Look & Feel: ~44 px bzw. bewusste Ausnahme)?
- [ ] Kein Hover-only für kritische Aktionen?
- [ ] Neue Klassen hier in Teil A/B nachgetragen, falls neues Muster?

---

## B. Bestandsaufnahme (2026-10-30)

### B1. Zahlen
- (Stand vor Cleanup) 1 CSS-Datei, 1664 Zeilen, **0 `@media`-Queries** (Responsive-Anforderung aus Look & Feel aktuell nicht umgesetzt).
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

### B5. Komplexitäts-Analyse vor Schritt 8 (2026-10-30)

Frage: Braucht `app.css` wirklich so viele Zeilen, oder ist sie aufgebläht?

**Stand:** 1664 → **1486 Zeilen** nach Schritt 1–7, 203 Regeln.

**Ergebnis:** Nach den Schritten 1–7 ist kaum noch Ballast übrig.
- **Toter Code:** nur noch 1 Regel (`.panel-checkbox--disabled`). Alles andere wird verwendet (geprüft gegen alle Klassennamen in `src/`, inkl. per Template gebauter wie `main-nav--${side}`).
- **Doppelte Selektoren / doppelte Properties:** keine.
- **Die Länge kommt vom Umfang, nicht vom Stil:** ~25 Feature-Blöcke mit je 20–180 Zeilen, eine Deklaration pro Zeile. Größte Blöcke: Color-Picker-Popover 176, Navigation 121, Szenen-Block 109, Patch-Inspector 93, Tiles 91, Slider 91.

**Was noch an Verdopplung übrig ist (≈ 80–100 Zeilen, ~6 %):**

| Was | Problem | Lösung |
|---|---|---|
| Patch-Inspector | eigener Remove-Button, eigenes Namensfeld, Aktiv-Zustand per `--active`-Klasse | `.btn--icon`, `.panel-field-input`, `aria-current` |
| Color-Picker-Felder | `.color-picker-popover__input` baut `.panel-field-input` nach | Basis-Klasse wiederverwenden |
| Scrollbars | Navigation und Panel-Body definieren dünne Scrollbar je separat (5 px vs. 7 px) | eine gemeinsame Regel |
| Kleinkram | `box-sizing: border-box` 2× (steht schon global), 1 tote Regel | löschen |

**Umgesetzt (7b):** Patch-Inspector → `aria-current` + `.btn--icon`; Color-Picker-Felder → `.panel-field-input`-Basis; eine gemeinsame Scrollbar-Regel (6 px); Kleinkram gelöscht. Ergebnis 1486 → ~1460 Zeilen – weniger als geschätzt, weil zwei echte Fehler dazukamen (ungültige Eingabe bei Fokus wieder rot; Zahlen in R/G/B-Feldern nicht mehr abgeschnitten).

**Fazit:** Kein Grund für einen Neuschrieb. Restliche Duplikate entfernen (Schritt 7b), dann aufteilen (Schritt 8) – das Aufteilen bringt mehr Übersicht als weiteres Kürzen.

## C. Cleanup-Roadmap (der Reihe nach)

Jeder Schritt: besprechen → umsetzen → Teil A aktualisieren → Häkchen.

- [x] **1. Tokens** – fehlende Tokens definieren, Farbpalette auf ~10–12 Werte eindampfen, Hex-Codes ersetzen.
- [x] **2. Skalen** – Font-size, Radius, Spacing als Tokens festlegen und anwenden.
- [x] **3. Buttons** – eine Button-Basis (`.btn` + Varianten icon/chip/danger) oder Komponente; Active-State vereinheitlichen (`aria-pressed` / `--active`).
- [x] **4. Toggles/Segmente** (mit Schritt 3 erledigt) – `side-toggle`, `panel-toggle-group`, Projection-Toggle zusammenführen.
- [x] **5. Listen & Tiles** – gemeinsames Tile/Row-Muster.
- [x] **6. Panels & Sections** – Header/Body/Footer-Abstände konsistent.
- [x] **7. Inline-Styles** – auf dynamische Werte reduzieren.
- [x] **7b. Rest-Duplikate** (siehe B5)
- [x] **8. Datei-Struktur** – app.css aufteilen.
- [ ] **9. Responsive/Touch** – Entscheidung, was davon jetzt wirklich gilt.

---

## D. Entscheidungs-Log
| Datum | Entscheidung |
|---|---|
| 2026-10-30 | Guide angelegt. |
| 2026-10-30 | Palette umgesetzt: eine Akzentfamilie (`#2f6bff`), Himmelblau-Auswahl entfällt; border-light mit border zusammengelegt; Dark Mode später. |
| 2026-10-30 | Skalen umgesetzt: 6 Spacing-, 4 Font-, 4 Radius-Stufen, 2 Control-Höhen. |
| 2026-10-30 | Buttons: ~25 Klassen → `.btn` + 6 Modifier; Aktiv-Zustand einheitlich über `aria-pressed`. Ungenutzte `.sub-panel__icon-btn` entfernt. |
| 2026-10-30 | Tiles: `image-tile` + `material-tile` → `.tile`; Auswahl über `aria-current`. Scene-Header-Buttons → `__action`. Ungenutzt entfernt: `light-role-block`, `simple-list`, `preset-list`. |
| 2026-10-30 | Panels: Inputs/Selects mit gemeinsamer Basis + Fokus-Rahmen; Nav-Aktiv über `aria-current`; Collapse-Leisten zusammengelegt; Höhen/Opacity als Tokens. |
| 2026-10-30 | Inline-Styles geprüft: nur dynamische Werte übrig; fixer Abstand in `ViewportFrame` → `.viewport__gate-text`. |
| 2026-10-30 | 7b: Rest-Duplikate entfernt (Patch-Inspector, Color-Picker-Felder, Scrollbars). Fix: `--invalid` gewinnt jetzt auch bei Fokus. |
| 2026-10-30 | `app.css` in 9 Dateien aufgeteilt. Geprüft: alle 201 Regeln identisch, berechnete Styles von 2513 Elementen in 11 UI-Zuständen vorher = nachher. |
