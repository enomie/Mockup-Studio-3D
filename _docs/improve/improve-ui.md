# UI Cleanup — Form Controls & Input-Stil

Audit 2026-10-08. Basis: `src/ui/**`, `app.css`, Requirements (`requirements-look-and-feel.md`, `requirements-range-slider.md`, `requirements-color-picker.md`).

**Ziel:** Minimalistisch, kompakt (Figma/Linear-Dichte), ein Standard pro Control-Typ — kein Sauhaufen.

---

## Kurzfassung

**Ja — alle Panel-Form-Controls sind standardisiert.** Shared Components (`ColorPicker`, `RangeSlider`, `PanelCheckbox`, `PanelSelect`, `PanelTextField`) + `panel-field-*` Tokens. Legacy `dummy-field` entfernt (P4).

---

## Was bereits standardisiert ist

| Komponente | Layout | Input-CSS | Verwendung |
|---|---|---|---|
| `ColorPicker` | `panel-field-row` (Label links, Control rechts) | `panel-field-input` 72×22px, 11px mono | Environment, Ground, Lighting, Materials, Colors, Entity |
| `RangeSlider` / `DualRangeSlider` | `panel-slider` (Label oben, Track, optional Wertzeile) | `SliderValueField` → `panel-field-input` | Environment, Ground, Lighting, Camera, Materials, ImageSurface |
| `PanelCheckbox` | `panel-field-row` | `panel-checkbox__input` 14×14px | Ground, Lighting, ImageSurface, GeometryPartField |
| `PanelSelect` | `panel-field-stack` (Label oben, Select full-width) | `panel-field-select` 22px, 12px system | MaterialSelect, ImageSurfaceFields, MaterialsPanel, EntityPropertyFields |
| `PanelTextField` | `panel-field-stack` (Namen) oder `panel-field-row` (Zahlen) | `panel-field-input--full` / `panel-field-input` 22px | ColorsPanel, MaterialsPanel, EntityPropertyFields (AxisField) |

Gemeinsame Tokens (`app.css`):

- Label: `panel-field-label` — 11px, `#666`
- Kompakt-Input: `panel-field-input` — **22px** Höhe, **11px** mono, weiß, radius 4px
- Zeile: `panel-field-row` — min-height **24px**, horizontal

Das entspricht den Requirements (Figma-like, kompakte Dichte).

---

## Inkonsistenzen (grep-Ergebnis)

### 1. `dummy-field` — ~~Legacy-System~~ ✅ erledigt (P4)

Entfernt. Profil-Read-only in MaterialsPanel nutzt `panel-field-row` + `panel-field-value`.

### 2. `<select>` — ~~gar kein CSS~~ ✅ erledigt (P1)

Alle 5 Selects migriert auf `PanelSelect` (`panel-field-stack` + `panel-field-select`, 22px). Einziger `<select>` in `src/ui`: `PanelSelect.tsx`.

### 3. Checkbox — ~~zwei Varianten~~ ✅ erledigt (P3)

Alle Checkboxen nutzen `PanelCheckbox` (`panel-checkbox__input`, 14×14, `panel-field-row`) — inkl. Geometry-Visibility in `GeometryPartField`.

### 4. Text-Input — ~~drittes Einzelstück~~ ✅ erledigt (P2)

| Variante | CSS | Wo |
|---|---|---|
| `panel-field-input` | 22px, mono, 72px breit | ColorPicker, SliderValueField, PanelTextField row |
| `panel-field-input--full` | 22px, 12px system, full-width | PanelTextField stack, Camera slot rename |

### 5. Layout-Muster (konventionell)

- **Horizontal** (`panel-field-row`): ColorPicker, Checkbox, SliderValueField, Read-only (`panel-field-value`)
- **Vertikal** (`panel-field-stack`): Select, Text-Name
- **Slider** (`panel-slider`): Label → Track → optional Wertzeile

### 6. Popover-Inputs & Library-Swatches (OK, eigener Kontext)

`ColorPickerPopover`: `color-picker-popover__input` — 22px, 10px Font. **Library-Swatches** (`color-picker-popover__library`) aus Colors-Store + **Recent** darunter — Namen nur per `title`/`aria-label`. Konsistent mit Kompakt-Dichte, eigener Scope — kein Problem.

---

## Inventur: alle Inputs in UI

| Typ | Anzahl | Standard? |
|---|---|---|
| `panel-field-input` (via ColorPicker / SliderValueField) | ~30+ | ✅ |
| `panel-field-input--full` (via PanelTextField stack / Camera) | 3 | ✅ |
| `panel-field-input` (via PanelTextField row / AxisField) | 13 | ✅ |
| `panel-field-select` (via PanelSelect) | 5 | ✅ |
| `panel-checkbox__input` (via PanelCheckbox) | ~14 | ✅ |
| `color-picker-popover__input` | 4 | ✅ (Popover) |
| Hidden file input (`ImagesPanel`) | 1 | n/a |

---

## Empfohlene Reihenfolge (Prioritäten)

### P1 — `PanelSelect` + Select-Styling ✅

- `src/ui/components/PanelSelect/` — Stack-Layout, `panel-field-select` (22px)
- Migration: `MaterialSelect`, `ImageSurfaceFields`, `MaterialsPanel`, `EntityPropertyFields`

### P2 — `PanelTextField` für Full-Width-Text ✅

- `src/ui/components/PanelTextField/` — Stack (Namen) + Row (AxisField)
- CSS: `.panel-field-input--full` (22px, 12px system)
- Migration: ColorsPanel, MaterialsPanel, EntityPropertyFields (AxisField), CameraSubPanel

### P3 — Checkbox vereinheitlichen ✅

- `GeometryPartField` → `PanelCheckbox`; toter `geometry-part-row__*` Checkbox-CSS entfernt

### P4 — `dummy-field` umbenennen / entfernen ✅

- Letzte Stelle (Profil Read-only) → `panel-field-row` + `panel-field-value`
- Gesamtes `.dummy-field` / `.dummy-field--checkbox` CSS gelöscht; kein `#f9f9f9` mehr in `src/ui`

### P5 — Layout-Konvention dokumentieren ✅

- Block in [`requirements-look-and-feel.md`](_docs/requirements/requirements-look-and-feel.md): `panel-field-row` / `panel-field-stack` / `panel-slider`, Shared Components, Unit-Suffix

### P6 — Panel-Stack Spacing ✅

- `--panel-stack-gap` (6px) + `.panel-stack` auf `sub-panel__body` und `scene-entity-block__body`
- Sektions-Trenner vereinheitlicht; Entity-Overrides und title `padding-top`-Hack entfernt
- Hardcodes (8px/10px) → Tokens; Requirement-Block + Diary

---

## Nicht im Scope

- Touch-Target 44px (Requirements: Icons/Buttons; Panel-Inputs bleiben kompakt)
- Neue externe UI-Library
- Dark Mode

---

## Referenz: Soll-Zeile (kompakt)

```
[Label 11px secondary     ] [Wert 22px] [Unit?]
```

- **Horizontal** (`panel-field-row`): ColorPicker, PanelCheckbox, SliderValueField, PanelTextField row
- **Numerisch mit Einheit:** Einheit als `panel-field-unit` **rechts** (z. B. `Far` `100.0000` `m`) — nicht im Label (`Width (m)`)
- **Dimensionlos:** kein Unit-Suffix (Roughness, Intensity, Size)
- **Stack** (`panel-field-stack`): Namen, Selects
