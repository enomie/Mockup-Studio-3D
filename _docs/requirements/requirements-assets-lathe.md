# Assets — Lathe profile (SVG, Millimeter)

**Querschnitt** für alle Bausteine, deren **Körpergeometrie** aus einem **2D-Profil** per **`LatheGeometry`** (Drehung um **Y**) entsteht. Profile liegen unter [`public/profiles/lathe/`](../../public/profiles/lathe/) — Dateinamen **`lathe-y-*.svg`** (Drehachse **Y**, Default), **`lathe-x-*.svg`** (z. B. Rad), **`lathe-z-*.svg`** (reserviert) — Katalog → [`requirements-images.md`](./requirements-images.md) (*profiles/lathe/*). Einzel-Assets → jeweilige `requirements-assets-*.md`.

**Nicht Lathe-SVG:** z. B. **`tin-can`** (parametrischer Zylinder + Beads) — gleiche **Uniform-Scale**-Regeln für Szene-Skalierung, aber **keine** Pfad-mm-Datei → [`requirements-assets-tin-can.md`](./requirements-assets-tin-can.md).

---

**Category:** Assets — Lathe  
**Title:** Pfadkoordinaten — immer Millimeter (normativ)  
**Description:** Für **Lathe-SVG-Assets** gilt projektweit:

| Regel | Bedeutung |
|---|---|
| **1 Pfad-Einheit = 1 mm** | Alle **Pfadkoordinaten** (`d`, `M`, `L`, `C`, …) sind **Millimeter** in der Engine-Ebene (nach Import: × `MM_TO_M` → Meter). |
| **ViewBox ist Rahmen, nicht Maß** | `viewBox`-Breite/Höhe, Illustrator-Artefakte oder leerer Rand **definieren nicht** die Produktgröße. **Normativ** sind nur die **Pfade** (und ggf. dokumentierte Pivot-/Achs-Regeln pro Asset). |
| **Achse & Pivot** | Pro Asset dokumentiert (z. B. Stift: **X = 0** Drehachse; Dose/Flasche: Fuß **y = 0**). Pfade müssen zur Achse passen — keine `transform` auf der Geometrie, die Maße verfälscht. |
| **Profilwechsel = andere Form** | Andere Proportionen (längerer Stift, andere Flasche, anderes Rad) → **neues/überarbeitetes SVG**, **nicht** non-uniform Stretch im UI. |

**Authoring:** Planar Editor / externe Tools → [`requirements-planar-editor.md`](./requirements-planar-editor.md). Bestehende Dateien, die noch **normalisiert** werden (Legacy-Skalierung auf Nennmaß), migrieren schrittweise auf **reine mm-Pfade** — Zielbild ist **kein** separates „Max radius“- oder „auf SVG-Breite skalieren“-Feld für den User.

---

**Category:** Assets — Lathe  
**Title:** Skalierung — uniform only, keine Verzerrung  
**Description:** Lathe-Körper (Dose, Flasche, Stift, Rad, …) dürfen **niemals** gestaucht oder gestreckt werden (kein unabhängiges Width/Height-Stretch, kein UV-/Mesh-Stretch für „Format“).

| Mechanismus | Verhalten |
|---|---|
| **`sizeScale`** (Entity) | **Uniform** auf den **fertigen** Körper (alle Lathe-Teile, Label-UV, Zubehör-Meshes desselben Assets) — Default `1`. |
| **Gizmo Scale** | Nur **uniform**; baked in `sizeScale` bzw. asset-spezifische lineare Params (s. Wheel) → [`requirements-gimbals.md`](./requirements-gimbals.md). |
| **Bilder** (`screenImageId`, …) | **Nie** Höhe/Breite/Profil der Lathe-Geometrie — nur **Textur** (Cover/Contain auf Mantel/Band/Wrap) → [`requirements-images.md`](./requirements-images.md), `.cursor/rules/image-aspect-ratio.mdc`. |

**Verboten:** Aus Bild-Aspect `heightM` / Radius / Profil ableiten; non-uniform Transform-Scale; zwei unabhängige Meter-Felder, die X und Y des Profils trennen.

---

**Category:** Assets — Lathe  
**Title:** Szene-Panel — Dimensions + Position (Ist)  
**Description:** Right Sub **Szene** für Lathe-/Packaging-Kinds (umgesetzt → [`improve-04-asset-settings.md`](../improve/improve-04-asset-settings.md)):

1. Asset-spezifische Sektionen **oben** (Image/Label, Geometries, Profil-Auswahl, Material, …).
2. **Dimensions** — **`sizeScale` (Size)** plus **Width** und **Height** in m als **gekoppelte** Anzeige/Steuerung:
   - **Size** ändern → Width **und** Height aktualisieren (effektive Außenmaße).
   - **Width** editieren → `sizeScale` neu berechnen, **Height** proportional mit.
   - **Height** editieren → analog (gleicher Uniform-Faktor).
   - **Kein** dritter Freiheitsgrad für Aspect — Aspect kommt aus **SVG-Profil** (mm-Pfade), nicht aus dem Panel.
3. **Position** — nur Pos X/Y/Z + Rotation (Footer, kein „Transform“-Block).

**Ausnahme `wheel-car` (Ist v1):** Skalierung primär über **`wheelCarParams`** (z. B. `outerRadiusM`); Gizmo uniform scale **baked** in Params — **kein** `entity.sizeScale`. Panel-Ziel: dieselbe **gekoppelte** Width/Height-Logik aus effektiven Rad-Maßen → [`requirements-assets-wheel-car.md`](./requirements-assets-wheel-car.md).

**Lathe-Kinds (SVG):**

| `assetKind` | Profil / Params | Detail |
|---|---|---|
| `beverage-can` | `canBodyProfile` + `beverageCanParams` | [`requirements-assets-beverage-can.md`](./requirements-assets-beverage-can.md) |
| `wine-bottle` | `wineBottleBodyProfile` + `wineBottleParams` | [`requirements-assets-wine-bottle.md`](./requirements-assets-wine-bottle.md) |
| `pen` | `penBodyProfile` | [`requirements-assets-pen.md`](./requirements-assets-pen.md) |
| `wheel-car` | `lathe-x-wheel-car.svg` + `wheelCarParams` | [`requirements-assets-wheel-car.md`](./requirements-assets-wheel-car.md) |

**Engine-Gemeinsam:** [`lathe-asset-common.ts`](../../src/engine/lathe-asset-common.ts) (Segmente, Naht, Fuß-Pivot).

---

**Category:** Assets — Lathe  
**Title:** SVG path slots — path_red / path_green / path_blue (normativ)  
**Description:** Geometrie-Pfade in Lathe-SVGs werden **projektweit** über **bis zu drei Slots** identifiziert — **nicht** über beliebige Illustrator-Farben oder asset-spezifische Klassen (`.tire`, `cls-1`, …).

| Slot | CSS-Klasse | Stroke (Pflicht) | Engine |
|---|---|---|---|
| 1 | `path_red` | `#ff0000` (`#f00`) | [`lathe-svg-path-slots.ts`](../../src/engine/lathe-svg-path-slots.ts) |
| 2 | `path_green` | `#00ff00` (`#0f0`) | optional |
| 3 | `path_blue` | `#0000ff` (`#00f`) | optional |

| Regel | Bedeutung |
|---|---|
| **Strikt** | Nur Pfade mit Slot-Klasse **oder** normiertem RGB-Stroke zählen. Kein Fallback „erster `<path>` im Dokument“. |
| **`fill: none`** | Authoring-Standard für Lathe-Konturen. |
| **Semantik im Code** | Slot → Teil pro Asset (z. B. Pen: red=cap; Wheel: red=tire; Dose/Flasche: nur red). |
| **Hilfsgrafik** | Keine Slot-Klasse / kein Slot-Stroke (z. B. gestrichelte `.guide`-Linie am Rad). |

**Code:** `extractLathePathPointsBySlot`, `extractLatheSubpathPointsBySlot` (Flasche: erstes Subpath am red-Slot).

---

**Category:** Assets — Lathe  
**Title:** Code-Referenz  
**Description:** Import-Pipeline pro Familie (Beispiele): [`lathe-svg-path-slots.ts`](../../src/engine/lathe-svg-path-slots.ts), [`pen-svg-profile.ts`](../../src/engine/pen-svg-profile.ts), [`beverage-can-svg-profile.ts`](../../src/engine/beverage-can-svg-profile.ts), [`wine-bottle-svg-profile.ts`](../../src/engine/wine-bottle-svg-profile.ts), Wheel [`wheel-car-svg-profile.ts`](../../src/engine/wheel-car-svg-profile.ts). Sizing-Footprint: [`asset-sizing.ts`](../../src/scene/asset-sizing.ts).
