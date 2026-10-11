# Range Slider (UI-Komponente)

Wiederverwendbare **Figma-like Slider** für Panels — ein Handle (`RangeSlider`) und zwei Handles (`DualRangeSlider`). React only — `src/ui/components/RangeSlider/`.

Bezüge: [`requirements-look-and-feel.md`](./requirements-look-and-feel.md), [`requirements-code.md`](./requirements-code.md), [`requirements-environment.md`](./requirements-environment.md).

**Status:** Implementiert — `DualRangeSlider` (Fog Near/Far), `RangeSlider` (Horizon fade). Gemeinsames Styling: `panel-slider` + `SliderValueField`.

---

**Category:** Range Slider  
**Title:** Eine Komponenten-Familie — überall gleich  
**Description:** Numerische Bereiche in Panels nutzen **`RangeSlider`** (ein Handle) oder **`DualRangeSlider`** (zwei Handles) — **kein** Copy-Paste pro Panel, keine externe Slider-Library. Import aus `src/ui/components/RangeSlider/`. Props: `min`, `max`, `step`, `disabled?`, `label?`. Werte: `number` bzw. `{ low, high }`. `onChange` continuous während Drag (live Engine-Update).

---

**Category:** Range Slider  
**Title:** DualRangeSlider — zwei Handles  
**Description:** **Ein Track**, **zwei Thumbs** (links = **low**, rechts = **high**). Aktiver Bereich zwischen den Thumbs hervorgehoben (filled track). **Constraint:** `low < high` immer — Thumbs dürfen sich nicht kreuzen; Mindestabstand = `step` (default 1). Drag per Pointer + **Touch** (`touch-action: none` am Track). Keyboard optional v1: Pfeiltasten am fokussierten Thumb. ARIA: jedes Thumb `role="slider"`, `aria-valuemin/max/now`, `aria-label` aus `lowLabel` / `highLabel`.

---

**Category:** Range Slider  
**Title:** Panel-Zeile (Layout)  
**Description:** Kompakte Property-Zeile wie ColorPicker: oben **Label** (11px, secondary), darunter **Track** (~full width Sub-Panel), darunter **Wertzeile** mit **Textinputs**: `Near` / `Far` + editierbares Feld + Einheit **`m`**. Format **3 Nachkommastellen** (Millimeter-Genauigkeit) — siehe [`requirements-code.md`](./requirements-code.md) Längen-Konvention. Zeilenhöhe gesamt ~56–64px. Track ~4px hoch, Thumbs ~14px Kreis, Border `#e5e5e5`, Fill `#93b4ff` (active token).

---

**Category:** Range Slider  
**Title:** Erste Nutzung — Fog Near / Far  
**Description:** Environment-Sub-Panel: **ein** `DualRangeSlider` mit Track + **Near/Far-Textinputs** in **Metern** (3 Dezimalen). Mappt auf Three.js `Fog.near` / `Fog.far`. Default: Near **8.000** m, Far **33.000** m (`FOG_NEAR`, `FOG_FAR`). Slider-Range **0.001–100 m**, Step **0.001 m**. Store → `setFogDistances(near, far)` → Scene-API → Engine. Label: **Fog distance**; Inputs **Near** / **Far** + **`m`**.

---

**Category:** Range Slider  
**Title:** RangeSlider — ein Handle (später)  
**Description:** Einzel-Slider für skalare Werte (Lighting intensity, Roughness, …). Gleiches Track/Thumb-Styling wie Dual. Lighting Panel nutzt `RangeSlider` + `SliderValueField` (Ambient, Key, Fill).

---

**Category:** Range Slider  
**Title:** Styling & Verhalten  
**Description:** Hell, Figma-like — weißer Track-Hintergrund, dezenter Border. Thumb: weiß, Border `#ccc`, leichter Schatten. Hover/Active: Thumb leicht größer oder stärkerer Border. **Disabled:** opacity 0.55, kein Pointer. Kein Tooltip nötig — Werte in Wertzeile sichtbar.

---

**Category:** Range Slider  
**Title:** Gemeinsame Komponenten & CSS  
**Description:** **`panel-slider`** — ein CSS-Block für Track, Thumb, Label (`RangeSlider` + `DualRangeSlider`). **`SliderValueField`** — Wertzeile mit Label links, Input + optionaler Unit rechts (gleiche Klassen wie ColorPicker: `panel-field-row`, `panel-field-label`, `panel-field-input`, `panel-field-unit`). Import aus `src/ui/components/RangeSlider/`.

---

**Category:** Range Slider  
**Title:** RangeSlider — Horizon fade (Environment)  
**Description:** Ein Handle, Range **0–1**, Step **0.01**. UI: Track-Label **Horizon fade**; Wertzeile **Fade** + Prozent-Input (`valueDisplayScale=100`, `valueUnit="%"`, 0 Dezimalen). Engine-Wert bleibt 0–1. Props: `valueInputLabel`, `valueInputDecimals`, `valueUnit`, `valueDisplayScale`.

---

**Category:** Range Slider  
**Title:** Thumb-Inset (kein Horizontal-Overflow)  
**Description:** Thumbs **14×14px** — Position mit **7px Inset** am Track (`SLIDER_THUMB_RADIUS_PX` in `dual-range-slider-utils.ts`). Pointer-Math und `thumbLeftCss` / `trackFillWidthCss` berücksichtigen Inset. Track-BG: `left/right: 7px`. Sub-Panel-Body: `overflow-x: hidden` — **kein** horizontaler Scroll in Property-Panels.

---
