# Color Picker (UI-Komponente)

Wiederverwendbarer **Figma-like Color Picker** für alle Panels (Ground, Environment/Sky, Fog, Lights, …). React only — `src/ui/components/ColorPicker/`.

Bezüge: [`requirements-look-and-feel.md`](./requirements-look-and-feel.md), [`requirements-code.md`](./requirements-code.md), [`requirements-ground.md`](./requirements-ground.md).

**Status:** Implementiert — `src/ui/components/ColorPicker/`. Nutzung: Environment (Sky/Fog), Ground, Lighting, Materials-Editor, Entity-Tints, Colors-Panel. Popover: **Library-Swatches** aus Colors-Bibliothek + **Recent** (Session) — [`requirements-colors.md`](./requirements-colors.md).

---

**Category:** Color Picker  
**Title:** Eine Komponente — überall gleich  
**Description:** **`ColorPicker`** ist die **einzige** Farbauswahl in der App. Kein natives `<input type="color">` als alleinige Lösung, kein Copy-Paste pro Panel. Import: `src/ui/components/ColorPicker/ColorPicker.tsx` (+ ggf. `ColorPickerPopover.tsx`). Wert-Typ: **`Rgb`** aus `src/colors/rgb.ts` (Engine-kompatibel) + Hex-Anzeige in UI. Props: `value`, `onChange`, `label?`, `disabled?`.

---

**Category:** Color Picker  
**Title:** Inline-Trigger (Panel-Zeile)  
**Description:** Kompakte **Property-Zeile** (Figma Properties-Stil): links **Label** (11–12px), rechts **Trigger**: **Swatch** (~24×24px, abgerundet, Border, zeigt aktuelle Farbe) + **Hex-Feld** (`#RRGGBB`, editierbar). Klick auf Swatch oder Hex öffnet **Popover**. Zeilenhöhe ~32px — passt zu Demo-Dichte.

---

**Category:** Color Picker  
**Title:** Popover-Inhalt (Qualität)  
**Description:** Popover **über** dem Panel ( nicht Viewport überdecken wo möglich), Schatten dezent. Inhalt: (1) **SV-Fläche** (Sättigung × Helligkeit, 2D-Drag), (2) **Hue-Slider** (Regenbogen, vertikal oder horizontal), (3) **Hex-Input** mit Validierung, (4) optional **RGB** drei Mini-Inputs (0–255) — eingeklappt oder zweite Zeile. Live-Update während Drag (`onChange` continuous). **Escape** / Klick außerhalb schließt. Kein „OK"-Button — sofort anwenden (Figma-like).

---

**Category:** Color Picker  
**Title:** UX-Details  
**Description:** **Library swatches:** alle Presets aus der **Colors-Bibliothek** — [`requirements-colors.md`](./requirements-colors.md) — als Mini-Swatches oberhalb von Recent; Klick wählt Farbe + aktualisiert Recent. Namen nur per `title`/`aria-label`, nicht als sichtbarer Text. **Recent colors:** letzte **8** User-Farben als Mini-Swatches darunter (Session-only). **Copy hex** on click optional. **Invalid hex:** roter Rand, kein `onChange` bis gültig. **Alpha** später optional (v1: **opaque only**, kein Alpha-Slider). Keyboard: Hex-Feld normal; Popover fokussierbar.

---

**Category:** Color Picker  
**Title:** Styling  
**Description:** Hell, Figma-like — weißer Popover, `#e5e5e5` Border, 8px Radius. SV-Checkerboard-Hintergrund für „weiß" sichtbar. Hue-Slider ~12px dick. Kein Adobe-Farbwürfel-Overkill. Lucide nicht im Popover nötig außer optional Pipette später (`pipette`).

---

**Category:** Color Picker  
**Title:** Technik  
**Description:** **Keine** schwere External-Library ohne User-Freigabe — erst **eigene** leichte Implementierung (Canvas oder CSS gradients für SV/Hue). Strict TS. Farbraum: **sRGB** — passt zu Three/WebGPU. `onChange(rgb: Rgb)` → Store → Scene-API. Kein Three in ColorPicker.

---

**Category:** Color Picker  
**Title:** Erste Verwendung  
**Description:** **Ground Panel** → Color (Albedo/Tint). Danach: **Environment** Sky, **Fog**, **Light** color, ggf. Ground-Tint. Gleiche Komponente, gleiches Popover-Verhalten.

---

**Category:** Color Picker  
**Title:** Demo → Produkt  
**Description:** Demo-Ground/Environment nutzen noch disabled Text-Inputs — Migration: durch `ColorPicker` ersetzen sobald Ground-API oder Dummy-State wired ist.

---

**Category:** Color Picker  
**Title:** Panel-Zeile — Layout (aktualisiert)  
**Description:** Nutzt **`panel-field-row`** + **`panel-field-label`** + **`panel-field-controls`** (gemeinsam mit `SliderValueField` — [`requirements-look-and-feel.md`](./requirements-look-and-feel.md)). Swatch + Hex-Input rechtsbündig; Hex über **`panel-field-input`** (72×22px, Radius 4px). Zeilenhöhe ~24px in kompakter Sub-Panel-Dichte. Kein separates `color-picker__hex`-Styling mehr.

---
