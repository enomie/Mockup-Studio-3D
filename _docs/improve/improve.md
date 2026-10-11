# Code Cleanup — Imports / Exports

Audit vom 2026-10-08. Basis: `src/**` (142 TS/TSX-Dateien).  
`npm run lint` und `tsc --noEmit` sind **grün** — keine offensichtlich unbenutzten Imports (TS `noUnusedLocals` greift).  
Die Findings betreffen Struktur, Konsistenz, tote Module und Architektur-Grenzen.

---

## Priorität 1 — Tote Module ✅ (2026-10-08)

**Erledigt.** 6 Dateien nach `_deleted/` verschoben (`*-OLD-202610081529`):

| Datei | Anmerkung |
|---|---|
| `noise/simplex.ts` | Wrapper um `simplex-noise`; `simplex-noise` Dependency bleibt für später |
| `ui/components/Toolbar.tsx` | Alte Shell; ersetzt durch `TopMainBar` / `TopSubBar` |
| `ui/components/ModeToolbar.tsx` | Nur von `Toolbar.tsx` importiert |
| `ui/components/AssetSidebar.tsx` | Alte Sidebar; ersetzt durch `LeftMainPanel` / `AssetsPanel` |
| `ui/components/PanelSection.tsx` | Ersetzt durch `SubPanelSection` |
| `ui/components/ScrollPanel.tsx` | Ersetzt durch `SubPanel` / AppShell-Layout |

**Store:** `sidebarOpen`, `propertiesOpen`, `toggleSidebar()`, `toggleProperties()` aus `app-store.ts` entfernt.

---

## Priorität 2 — Zirkuläre Import-Abhängigkeiten ✅ (2026-10-08)

**Erledigt.** Alle 4 Zyklen aufgelöst (Zyklus-Check: 0 relevante Zyklen).

| Zyklus | Lösung |
|---|---|
| `entity-types` ↔ `asset-faces` | `AssetKind` → `scene/asset-kind.ts` (Leaf) |
| `entity-types` ↔ `geometry-visibility` ↔ `asset-handheld` | `AssetKind` in Leaf; `HandheldDeviceParams` → `asset-handheld.ts` |
| `entity-types` ↔ `image-surface` | `ImageSurfaceMigrationInput` statt `AssetEntity`-Import |
| `material-resolver` ↔ `procedural-params` | `multiplyRgb` → `colors/rgb.ts` |

`entity-types.ts` bleibt Re-Export-Fassade — keine Consumer-Änderungen.

---

## Priorität 3 — Doppelte Import-Zeilen ✅ (2026-10-08)

**Erledigt.** 22 Dateien bereinigt — jedes Modul pro Datei nur einmal importiert (Duplikat-Check: 0 Treffer).

Betroffene Bereiche: `colors/`, `data/`, `engine/` (inkl. lighting), `materials/`, `ui/shell/` (`viewport-tools`, `shell-nav`), `ui/panels/` (`EntityPropertyFields`, …).

Konvention: gemischte Imports mit inline `type` — z. B. `import { foo, type Bar } from '…'`.

---

## Priorität 4 — Barrel-Dateien (`index.ts`) ✅ (2026-10-08)

**Erledigt.** Alle 3 Barrel-Dateien konsistent genutzt.

| Barrel | Status |
|---|---|
| `ui/components/ColorPicker/index.ts` | ✅ |
| `ui/components/RangeSlider/index.ts` | ✅ |
| `materials/procedural/index.ts` | ✅ — externe Consumer über Barrel; Dispatch-Logik in `procedural-registry.ts` |

Änderungen: `material-resolver` + `MaterialsPanel` importieren `from '../materials/procedural'`; `index.ts` ist reines Re-Export-Barrel; `create-textured-material` importiert Siblings direkt (kein Zyklus).

---

## Priorität 5 — Ungenutzte Exports internalisieren ✅ (2026-10-08)

**Erledigt.** `export` bei file-local Symbolen entfernt; toter Code gelöscht; Procedural-Barrel auf minimale Public API getrimmt.

| Bereich | Änderung |
|---|---|
| ~20 Dateien (Teil A) | `export` entfernt bei nur intern genutzten Funktionen/Konstanten |
| `engine/lighting/light-rig.ts` | `createKeyLightRig` / `createFillLightRig` gelöscht |
| `engine/material-resolver.ts` | `applyHandheldDisplayGlazing` gelöscht (ungenutzt) |
| `ui/store/app-store.ts` | `getImageById` / `getMaterialById` file-local; tote `getSelectedEntity`, `setKeyCastShadow`, `setFillCastShadow` entfernt |
| `materials/procedural/index.ts` | Nur `createTexturedMaterial` + `DEFAULT_TILE_SCALE_PAPER` / `DEFAULT_TILE_SCALE_WOOD` |

**Nicht angefasst:** `constants.ts`, Barrel-UI (`ColorPicker`/`RangeSlider`), `HANDHELD_GLASS_EXTRUDE_*` (Tests).

---

## Priorität 6 — UI ↔ Scene/Engine Grenze ✅ (2026-10-08)

**Erledigt.** UI importiert Scene-Domain nur noch über `scene-api.ts`. Einzige Engine-Import in UI: `ViewportFrame` → `MockupEngine` (Canvas-Grenze).

| Bereich | Änderung |
|---|---|
| `scene/light-ids.ts` | `LIGHT_KEY_ID` / `LIGHT_FILL_ID` aus Engine nach Scene |
| `scene/lighting-merge.ts` | Lighting-Merge aus Engine nach Scene |
| `scene/asset-sizing.ts` | Asset-Sizing aus Engine nach Scene (+ Test) |
| `entity-types.ts` | `cloneTransform` als Scene-Domain-Hilfe |
| `scene-api.ts` | Re-Exports für alle UI-benötigten Typen, Konstanten, Hilfsfunktionen |
| UI (10 Dateien) | Alle `scene/*`-Submodule-Imports → `scene-api` |

---

## Priorität 7 — Path Aliases (`@/colors`, `@/units`) ✅ (2026-10-08)

**Erledigt.** `@/*` → `src/*` in `vite.config.ts` + `tsconfig.json` (`baseUrl`, `paths`). Alle `colors/*` / `units/*` Imports in `src/ui/**` auf `@/colors/…` bzw. `@/units/…` umgestellt (11 Dateien). Keine `../../../`-Imports mehr in UI.

Engine/Scene/Data behalten relative Pfade — dort kein Tiefgang-Problem.

---

## Priorität 8/9 — Import-Stil + ESLint Import-Regeln ✅ (2026-10-08)

**Erledigt.** Konvention dokumentiert und per ESLint erzwungen (ohne `eslint-plugin-import`).

**Konvention:** Nur Typen → `import type { T }`. Wert + Typ aus demselben Modul → `import { value, type T }`. Keine doppelten Import-Zeilen vom selben Modul.

**ESLint-Regeln in `eslint.config.js`:**
- `@typescript-eslint/consistent-type-imports` (`prefer: type-imports`, `fixStyle: inline-type-imports`)
- `@typescript-eslint/no-import-type-side-effects`
- `no-duplicate-imports`

Inline `import('…').Type`-Annotationen durch normale Type-Imports ersetzt (6 Dateien).

---

## Empfohlene Reihenfolge

1. ~~**Tote Module** klären + Store-State (`sidebarOpen` etc.) entfernen~~ ✅
2. ~~**Zirkuläre Deps** brechen (`multiplyRgb` auslagern, Scene-Typen entflechten)~~ ✅
3. ~~**Doppelte Imports** zusammenführen (schneller Win, ~20 Dateien)~~ ✅
4. ~~**Procedural Barrel** vereinheitlichen~~ ✅
5. ~~**Ungenutzte Exports** internalisieren~~ ✅
6. ~~**UI-Grenze** (`scene-api`) schärfen~~ ✅
7. ~~**Path Aliases**~~ ✅
8. ~~**Import-Stil + ESLint-Regeln**~~ ✅

---

## Colors-Bibliothek ✅ (2026-10-08)

**Erledigt** (separates Feature, nicht Cleanup). Left Main **Colors** vor Materials; `color-presets.ts` / `color-types.ts`; Store-CRUD in `app-store.ts`; `ColorsPanel.tsx`; ColorPicker-Popover Library-Swatches. Spec → `_docs/requirements/requirements-colors.md`.

---

## Nicht im Scope / bereits gut

- Keine unbenutzten Imports (TS strict)
- Keine Default-Exports
- Keine `export *` Wildcards
- Three.js Import-Pfade einheitlich
- Barrel für ColorPicker, RangeSlider + procedural sauber genutzt
