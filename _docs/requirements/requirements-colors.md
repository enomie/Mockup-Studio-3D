# Colors — Bibliothek & Presets

Zentrale **Farben-Bibliothek** im Projekt — benannte RGB-Swatches für schnelle Auswahl im ColorPicker. Alles was eine **einzelne Farbe** braucht (Ground-Tint, Sky, Fog, Light color, Print-Seiten-Tint, Material-Editor …) kann Swatches aus dieser Liste nutzen. UI: **Left Main → Colors** (vor Materials) + **Left Sub** (Liste + Editor). Bezüge: [`requirements-color-picker.md`](./requirements-color-picker.md), [`requirements-materials.md`](./requirements-materials.md), [`requirements-images.md`](./requirements-images.md), [`requirements-architecture.md`](./requirements-architecture.md).

**Status:** v1 implementiert — Built-ins, User-Presets, Colors Panel, ColorPicker Library-Swatches.

**Bestand (Inventur):** `ColorsPanel.tsx`, `color-presets.ts` (`COLOR_PRESETS`), `color-types.ts`, Store-Slice in `app-store.ts`, Nav in `shell-nav.ts` (`colors` vor `materials`), ColorPicker-Popover Library-Swatches.

---

**Category:** Colors  
**Title:** Rolle — Single Source of Truth (benannte Farben)  
**Description:** **Colors** ist die **einzige Farben-Bibliothek** pro Projekt — analog **Images** für Bilder und **Materials** für Oberflächen-Looks. Ein Preset = **Name + RGB** (`Rgb` 0..1). Der ColorPicker zeigt alle Presets als Swatches; Auswahl setzt den aktuellen `Rgb`-Wert am Aufrufer. **Kein** `colorId` auf Entities in v1 — nur Hilfe bei der Farbauswahl, keine Engine-Referenz.

---

**Category:** Colors  
**Title:** Panel-Platzierung (UI)  
**Description:** **Left Main** Nav: **Colors** (Lucide `Droplet`), **vor** Materials. Reihenfolge: Assets → Images → **Colors** → Materials. **Left Sub:** scrollbare **Liste** aller Presets + **Footer „Add color"** (+). Liste und ColorPicker-Library-Swatches **alphabetisch A–Z** nach `name` → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md). Klick auf Eintrag = **Selection** + Editor im Sub (Name, ColorPicker für RGB). Kompakte Dichte → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md).

---

**Category:** Colors  
**Title:** Datenmodell — ColorPreset  
**Description:**

```ts
type ColorSource = 'builtin' | 'user';

type ColorPreset = {
  id: string;
  name: string;
  source: ColorSource;
  rgb: Rgb; // src/colors/rgb.ts — sRGB 0..1
};
```

Typen: `src/scene/color-types.ts`. Built-ins: `src/data/color-presets.ts` (`COLOR_PRESETS`).

---

**Category:** Colors  
**Title:** Built-in Presets (Werk)  
**Description:** Feste IDs, **nicht löschbar**, **nicht editierbar**, **duplizierbar** (→ User-Kopie). Gold und Aluminum nutzen **dieselben RGB-Werte** wie die Material-Presets.

| ID | Name | RGB (0..1) | Quelle |
|---|---|---|---|
| `color-nearwhite` | Nearwhite | `#EFEFEF` | — |
| `color-gold` | Gold | `1 / 0.77 / 0.33` | = `material-gold` |
| `color-aluminum` | Aluminum | `0.91 / 0.92 / 0.93` | = `material-aluminium-brushed` |
| `color-almost-black` | Almost Black | `0.13 / 0.13 / 0.14` | = Plastic Matte |
| `color-blue` | Blue | `46,135,200` / 255 | — |
| `color-turquoise` | Türkis | `34,175,193` / 255 | — |

---

**Category:** Colors  
**Title:** User-Presets  
**Description:** **Add color** (+) → neues Preset (`source: 'user'`, Default-Farbe **Nearwhite** aus Built-in `color-nearwhite`). Editor: **Name** (editierbar), **ColorPicker** für RGB (editierbar). **Duplicate** (auch von Built-ins) → Kopie mit `source: 'user'`, Name z. B. „Gold copy". **Remove** nur bei `source: 'user'`. IDs: `user-${uuid}`.

---

**Category:** Colors  
**Title:** Built-in Editor — Read-only  
**Description:** Bei `source: 'builtin'`: **Name** und **ColorPicker** im Editor **disabled** (nur Anzeige). Aktion: **Duplicate** → User-Kopie zum Bearbeiten. Kein Remove.

---

**Category:** Colors  
**Title:** Listeneintrag — Anzeige  
**Description:** Pro Preset eine Zeile: **Swatch** + **Name** (wie Materials-Liste — wiederverwendet `.material-list` / `.material-tile`). Built-ins und User in **einer** Liste — Built-ins zuerst (Reihenfolge aus `COLOR_PRESETS`), User danach. Klick = Selection (highlight). Namen **nur** in der Left-Sub-Liste sichtbar — nicht im ColorPicker-Popover.

---

**Category:** Colors  
**Title:** Store & Selection  
**Description:** UI-Store (`app-store.ts`): `colors: ColorPreset[]`, `selectedColorId: string | null`. Exportierte Aktionen: `selectColor`, `addColor`, `updateColor`, `duplicateColor`, `removeColor` (nur `source: 'user'`). Init: `COLOR_PRESETS.map(cloneColorPreset)`. Lookup intern file-local (wie Materials). Keine Engine/Scene-API in v1.

---

**Category:** Colors  
**Title:** ColorPicker-Integration  
**Description:** Popover unten: (1) **Library** — alle Presets als Mini-Swatches (Built-ins, dann User); Klick → `onChange(rgb)` live. Swatch: `title` / `aria-label` = Preset-Name — **kein sichtbarer Text** im Popover. (2) **Recent** — letzte 8 Session-Farben (`color-picker-recent.ts`); Update nur **Commit-on-close** des Popovers (siehe [`requirements-color-picker.md`](./requirements-color-picker.md) UX-Details). (3) **Current color preview** — breiter Live-Streifen unter Recent. Library aus Store; Recent session-only.

---

**Category:** Colors  
**Title:** Serialisierung  
**Description:** Projekt-Save: **Built-in IDs** referenziert; **User-Presets** voll im JSON (Name + rgb). Load: unbekannte Built-in-ID → aus `COLOR_PRESETS` auflösen; unbekannte User-ID → Eintrag behalten oder Warnung (TBD mit globalem Save-Schema). Gleiches Muster wie [`requirements-materials.md`](./requirements-materials.md) § Serialisierung.

---

**Category:** Colors  
**Title:** Abgrenzung — Colors vs. Materials vs. ColorPicker  
**Description:**

| | **Materials** | **Colors** | **ColorPicker** (inline) |
|---|---|---|---|
| Inhalt | PBR-Oberfläche | Name + RGB | Einzelne Farbe (Widget) |
| Referenz | `materialId` auf Entity | keine Entity-Referenz v1 | setzt `Rgb` am Aufrufer |
| Panel | Left Materials | Left Colors | Komponente in Editors |

Gold/Aluminum **Material** = glänzende/gebürstete Oberfläche. Gold/Aluminum **Color** = gleicher RGB-Wert als Swatch für Tint/Licht/Himmel.

---

**Category:** Colors  
**Title:** Bewusst nicht in v1  
**Description:** `colorId`-Referenzen auf Entities/Ground/Lights; „Save to library" aus ColorPicker; Built-ins editierbar; Projekt Save/Load-Implementierung (nur Schema dokumentiert).

