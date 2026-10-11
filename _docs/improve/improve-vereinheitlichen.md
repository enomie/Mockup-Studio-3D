# Source-Code-Audit — Vereinheitlichung

Stand: 2026-10-11 · Scope: `src/**` (ohne `node_modules`). Ziel: Kandidaten für **ein** Muster statt N paralleler Copy-Paste-Pfade — aligned mit `requirements-architecture.md` (Scene-API, Entity, kein Duplikat pro Feature).

---

## Kurzfassung

| Bereich | Symptom | Empfehlung (Kurz) |
|--------|---------|-------------------|
| Entity-Params | 7 verschiedene Feldnamen auf `AssetEntity` | Langfristig: **discriminated union** `params` pro `assetKind` (Save-Schema mitdenken) |
| Asset-Kind-Plumbing | `is*` / `default*` / `clamp*` / `set*Params` × N Kinds | **Registry v1 erledigt** — [`asset-kind-registry.ts`](src/scene/asset-kind-registry.ts) (3a–3e); Restliche `is*` in Sizing/Mesh bewusst offen |
| Einheiten | Handheld **mm**, Cans/Bottle **m** | **Phase 1 erledigt** — `units/length.ts` |
| Große Dateien | 1,2k–1,4k Zeilen in Mesh/UI/Store | Nach **Kind** oder **Schicht** splitten, nicht alles auf einmal |
| Zylinder-Assets | Beverage + Tin + Wine teilen Lathe/Label, aber 3 Pfade | **Lathe-Common erledigt** — [`lathe-asset-common.ts`](src/engine/lathe-asset-common.ts); offen: `LabelBuildContext`, Segment-Konstanten pro Kind |
| UI-Imports | `@/` vs `../../` gemischt | **Erledigt** — `@/` für Cross-Module in `src/**`; ESLint + [`requirements-code.md`](_docs/requirements/requirements-code.md) |
| `scene-api` Barrel | UI importiert Domäne + Konstanten massiv aus einer Datei | UI: schmale API; Domäne direkt aus `scene/asset-*` wo sinnvoll |

---

## 1. Architektur & Datenmodell

### 1.1 Uneinheitliche Param-Felder auf `AssetEntity`

`AssetEntity` (`entity-types.ts`) mischt:

| Kind-Gruppe | Feld |
|-------------|------|
| smartphone / tablet / monitor | `params` (Union Handheld \| Monitor) |
| print | `printParams` |
| wall / wall-door | `wallParams` + `wallpaperPattern` |
| block | `blockParams` |
| beverage-can | `beverageCanParams` |
| tin-can | `tinCanParams` |
| wine-bottle | `wineBottleParams` |
| picture | *(kein eigenes Params-Objekt — nur Sizing/Visibility)* |

**Folge:** `entity-registry.ts`, `asset-system.ts`, `scene-api.ts`, `app-store.ts`, `mockup-engine.ts` und `EntityPropertyFields.tsx` wiederholen dieselbe Kind-Abfrage-Kette.

**Vereinheitlichung (größerer Brocken, vor Save-Schema festzurren):**

- Option A: Ein Feld `assetParams` als **discriminated union** `{ kind: 'tin-can', params: TinCanParams } | …`.
- Option B: Registry mappt `AssetKind → { read, write, default, clamp, scaled }` — Entity-Feldnamen können vorerst bleiben, aber **eine** Registry ersetzt die ~15 `if (isX)`-Blöcke.

**Picture:** Kein `asset-picture.ts` — Logik verteilt auf `asset-meshes`, `asset-sizing`, `geometry-visibility`. Entweder bewusst so dokumentieren oder kleines `asset-picture.ts` (Ref-Breite, Default-Materials) wie bei Block.

### 1.2 Parallele „Kind-Schalter“ in Engine + Scene

Dieselbe Logik in mehreren Dateien:

- `asset-sizing.ts` — mehrere `switch (assetKind)`
- `geometry-visibility.ts` — lange `if (is…)`-Kette
- `asset-meshes.ts` — `populateAssetGroup` + separate `populate*Beverage|Tin|Wine*Group`
- `entity-registry.ts` + `asset-system.ts` — Create/Update/Rebuild pro Kind

**Vereinheitlichung:** Zentraler **`AssetKindDefinition`** — **v1 umgesetzt** in [`requirements-asset-kind-registry.md`](_docs/requirements/requirements-asset-kind-registry.md) + [`asset-kind-registry.ts`](src/scene/asset-kind-registry.ts) (`defaultEntitySlice`, `clamp`/`merge`, `rebuildStrategy`, Materials/Visibility). **v1.5 (2026-10-11):** `geometryParts` + [`GeometryPartsSection`](src/ui/panels/GeometryPartsSection.tsx). Noch **offen:** `sizingHooks`, vollständiger `rebuildGroup`-Dispatch für alle sync-Kinds.

### 1.3 Scene-API als Barrel für die UI

**Erledigt (2026-10-11):** `scene-api.ts` nur noch `SceneApi` + Shell-Typen; Entity-Fields importieren Read-only aus `asset-{kind}`, [`asset-ui-helpers.ts`](src/scene/asset-ui-helpers.ts), [`asset-kind-predicates.ts`](src/scene/asset-kind-predicates.ts). Konvention → [`requirements-code.md`](_docs/requirements/requirements-code.md) (Scene-API vs scene domain).

---

## 2. Assets & Engine (3D)

### 2.1 Längeneinheiten pro Domäne

**Erledigt (Phase 1):** `MM_TO_M` / `mmToM` / `mToMm` in [`src/units/length.ts`](src/units/length.ts). Handheld/Print weiter **mm**, Packaging weiter **m** — bewusst (Abschnitt 8).

### 2.2 Zylinder / Lathe-Familie (Beverage, Tin, Wine)

Bereits geteilt:

- `cylindrical-label-uv.ts` (Beverage + Tin)
- `lathe-seam-normals.ts` (Wine + Tests)
- `createCanLabelMaterial` (Beverage + Tin in `asset-meshes`)

**Erledigt (Quick Win 2026-10-11):** [`lathe-asset-common.ts`](src/engine/lathe-asset-common.ts) — `LATHE_SEAM_PHI_START`, `FULL_LATHE_PHI_LENGTH`, `applyLatheGeometryFootToY0` (Beverage/Tin/Wine-Glass).

Noch parallel / ähnlich:

- Segmentanzahl pro Kind (80 vs 64) — bewusst produktbedingt
- ~~`populateBeverageCanGroup` / `populateTinCanGroup`~~ **teilweise Phase 2** — `cylindrical-can-populate.ts`
- Wine SVG vs Beverage SVG vs Tin parametrisch — ok; **`disposeAssetGroup`** / **`applyAssetShadowFlags`** bereits in `asset-meshes` / `render/shadow-setup` (nicht in lathe-common)

**Offen:** `buildCylindricalLabelMaterialContext` / `LabelBuildContext` (§2.3).

### 2.3 Label-Material-Pfad

- Cans: `createCanLabelMaterial` (UV auf Mantel)
- Wine / Picture / Print faces: `createImagePbrMaterial`

Sinnvolle Trennung — aber gemeinsame **Image-Surface + Cover/Contain-Plane**-Signatur könnte ein Typ `LabelBuildContext` sein (weniger Parameter-Tupel-Duplikat in `asset-meshes`).

### 2.4 `asset-meshes` modular

**Erledigt (Phase 2):** [`src/engine/asset-meshes/`](src/engine/asset-meshes/) + Re-Export [`src/engine/asset-meshes.ts`](src/engine/asset-meshes.ts) (Vite `./asset-meshes` → Datei vor Ordner).

---

## 3. UI & Store

### 3.1 `EntityPropertyFields` Router

**Erledigt (Phase 2):** [`src/ui/panels/entity-fields/`](src/ui/panels/entity-fields/) + schlanker Router [`EntityPropertyFields.tsx`](src/ui/panels/EntityPropertyFields.tsx) (~115 Zeilen).

### 3.2 `app-store.ts` (~1167 Zeilen)

**Erledigt (Registry 3e):** Asset-Param-Setter in [`app-store-asset-params.ts`](src/ui/store/app-store-asset-params.ts) (~116 Zeilen) — optimistischer Patch über `mergeKindParamPatch` / `mergeKindWallpaperPatternPatch`, Re-Export aus `app-store.ts`. Hauptdatei bleibt groß (Lighting, Images, Camera, …).

**Offen:** Generisches `setAssetParams` erst mit **Save v2** / Entity-Union; weiteres Splitten des Stores optional.

### 3.3 Import-Pfade

**Erledigt (2026-10-11):** Cross-Module-Imports in `src/**` auf `@/`; ESLint `no-restricted-imports` (tiefe `../`-Pfade); Dokumentation in [`requirements-code.md`](_docs/requirements/requirements-code.md) (Path alias).

### 3.4 Ordner `ui/demo/`

**Erledigt (2026-10-11):** Produktive UI aus `ui/demo/` nach [`src/ui/shell/`](src/ui/shell/) (Top/Status, Main-Nav, Sub-Router, [`shell-nav.ts`](src/ui/shell/shell-nav.ts), [`viewport-tools.ts`](src/ui/shell/viewport-tools.ts)) und [`src/ui/panels/`](src/ui/panels/) (Library/Sub-Panels, `entity-fields`, shared Field-Komponenten). Rein organisatorisch — kein Verhalten.

---

## 4. Code-Stil & Requirements-Alignment

### 4.1 `clamp` dupliziert

**Erledigt (Phase 1):** zentral in [`src/units/math.ts`](src/units/math.ts).

### 4.2 Winkel-Konstanten

**Erledigt (Phase 1):** `DEG_TO_RAD` / `degToRad` in [`src/units/angle.ts`](src/units/angle.ts).

### 4.3 Async-Stil in `mockup-engine.ts`

**Erledigt (2026-10-11):** Private `applyAssetMutation` (async/await, optional `refreshGizmo`); Verhalten unverändert (`emit()` nach Mutation, kein zusätzliches `invalidateViewport`).

### 4.4 `clone*Params` überall `{ ...params }`

Identisches Muster in jedem `asset-*.ts`. Bei Registry: optional **ein** `shallowClone` oder weglassen wo Immutability ohnehin über Partial-Patches läuft.

---

## 5. Typen & Katalog

### 5.1 `AssetKind` vs `ASSET_CATALOG`

**Erledigt (Phase 1):** [`src/data/asset-catalog.test.ts`](src/data/asset-catalog.test.ts) mit `Record<AssetKind, true>`.

### 5.2 `is*AssetKind` pro Datei

10+ kleine Funktionen — ok für Lesbarkeit, aber **geometry-visibility** und **asset-sizing** importieren jeweils 5+ Module.

**Teilweise (3d):** `getAssetKindFamily` / `usesAsyncPackagingRebuild` in Registry; `geometry-visibility-defaults.ts` als Single Source. Weitere `is*`-Ketten in `asset-sizing`/`computeFaceSize` unverändert.

### 5.3 Material-Defaults

`defaultMaterialsForKind` in `material-presets.ts` deckt nicht alle Kinds gleich tief ab (Handheld/Monitor explizit, Rest teils in `asset-meshes` hardcoded Fallback-IDs).

**Vereinheitlichung:** Pro Kind **eine** `defaultMaterialsForKind` Zeile / Registry-Eintrag; keine zweite Fallback-Kette in `populate*Group`.

---

## 6. Was schon gut / beibehalten

- **Scene-API-Interface** als Mutation-Grenze; `useAppStore` + `app-store` Subscribe-Pattern klar getrennt.
- **Domäne pro Asset-Datei** `scene/asset-{kind}.ts` mit `default*`, `clamp*`, `scaled*` (Packaging) — gutes Template für neue Assets.
- **Tests** co-located (`*.test.ts` neben Modul) — durchgängig.
- **ViewportInvalidation** zentral — nicht über Store-Spam.
- **Image surfaces** einheitlich über `image-surface.ts` + `ImageSurfaceFields`.
- **WebGPU-only** Import-Pfad `three/webgpu` konsistent in Engine.

---

## 7. Vorschlag Reihenfolge (inkrementell)

1. **Quick wins (kein Save-Break):** ~~`MM_TO_M` / `clamp` / Winkel in `units/*`~~ **erledigt (2026-10-11)**; Katalog-Test `asset-catalog.test.ts`. ~~Import `@/` + ESLint~~ **erledigt (2026-10-11)**. ~~`lathe-asset-common` / `mockup-engine` async~~ **erledigt (2026-10-11)**.
2. **Mittel:** ~~`asset-meshes` + `EntityPropertyFields` splitten; gemeinsame Tin/Beverage `populate*` Hilfe~~ **erledigt (2026-10-11)** — `src/engine/asset-meshes/`, `cylindrical-can-populate.ts`, `src/ui/panels/entity-fields/`.
3. **Groß:** ~~Docs Asset-Kind-Registry~~ **Requirements spezifiziert (2026-10-11)** → [`_docs/requirements/requirements-asset-kind-registry.md`](_docs/requirements/requirements-asset-kind-registry.md). ~~**Code 3a–3e**~~ **erledigt (2026-10-11)** — Registry v1 komplett (`app-store-asset-params` optimistic patch); Entity-Union erst Save v2.
4. **Docs:** ~~Diary + Architecture-Verweis~~ **erledigt (2026-10-11)** mit Punkt 3.

---

## 8. Bewusst nicht vereinheitlichen (ohne Requirement)

- **SVG-Profil (Wine/Beverage) vs rein parametric (Tin)** — unterschiedliche Produktanforderungen.
- **Handheld mm vs Packaging m** — UI/UX-Entscheidung; Vereinheitlichung nur mit explizitem „alle Params in m“ Requirement.
- **React in `ui/**` vs Vanilla TS in Engine** — Architektur-Entscheidung steht; nicht vermischen.

---

## Anhang: große Dateien (Zeilen, grob)

| Datei | ~Zeilen (Stand 2026-10-11) |
|-------|--------|
| `ui/store/app-store.ts` | 1167 |
| `ui/store/app-store-asset-params.ts` | 116 |
| `engine/asset-system.ts` | 1014 |
| `engine/mockup-engine.ts` | 929 |
| `engine/entity-registry.ts` | 567 |
| `scene/asset-kind-registry.ts` | 419 |
| `ui/panels/EntityPropertyFields.tsx` | 116 (Router) |
| `engine/asset-meshes/` | modular + Shim `asset-meshes.ts` |

**Nächster Code-Fokus (optional, Audit-Backlog):** Registry `sizingHooks` · `rebuildGroup`-Dispatch · Material-Slots in `populate*` (§5.3). **Save v2:** Entity `assetParams`-Union (§1.1).
