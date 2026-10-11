# Asset-Kind-Registry

Zentraler Katalog pro **`AssetKind`** — ersetzt parallele `is*` / `set*Params` / Create-Slices in Engine und Scene, **ohne** das persistierte `AssetEntity`-Schema in v1 zu ändern.

Verknüpft: [`requirements-architecture.md`](./requirements-architecture.md), [`requirements-scene-placement.md`](./requirements-scene-placement.md), [`requirements-assets.md`](./requirements-assets.md). Audit: [`improve-vereinheitlichen.md`](../../improve-vereinheitlichen.md) (Phase 3).

**Status:** Phasen **3a–3e** umgesetzt (Registry v1 komplett). Phase **3f** (`geometryParts` + UI) umgesetzt (Registry v1.5).

---

**Category:** Architecture  
**Title:** Asset-Kind-Registry — Zweck & Scope v1  
**Description:** **Option B** (Audit): Eine **Asset-Kind-Registry** in `src/scene/` (vorgeschlagen: `asset-kind-registry.ts`) hält pro `AssetKind` Metadaten und Verhaltens-Hooks (Defaults beim Anlegen, Clamp, Rebuild-Strategie, Screen-Image-Rolle, Material-Defaults). **`AssetEntity` bleibt unverändert** in v1 — bestehende Felder (`params`, `printParams`, `wallParams`, `blockParams`, `beverageCanParams`, `tinCanParams`, `wineBottleParams`, `wallpaperPattern`) und Serialisierung später (Scene Save) dürfen nicht brechen. **Option A** — ein Feld `assetParams` als discriminated union `{ kind, params }` — ist **Save v2**, separates Requirement, **out of scope** für Registry v1. Registry **delegiert** an bestehende `scene/asset-*.ts` (`default*`, `clamp*`, `scaled*`); sie ersetzt keine Geometrie-Engine.

---

**Category:** Architecture  
**Title:** Asset-Kind-Registry — `AssetKindDefinition` (konzeptionell)  
**Description:** Jeder Eintrag beschreibt ein `AssetKind` (Union in `asset-kind.ts`). Pflicht-Inhalt pro Kind (Namen für Implementierung orientierend):

| Feld / Hook | Bedeutung |
|-------------|-----------|
| `kind` | `AssetKind` |
| `family` | `'print' \| 'picture' \| 'device' \| 'packaging' \| 'architecture' \| 'block'` — Gruppierung für Defaults/UI; ersetzt nicht jedes `is*AssetKind`, reduziert aber Import-Ketten in `asset-sizing` / `geometry-visibility` |
| `defaultEntitySlice` | Beim `addEntity`: welche optionalen Entity-Felder gesetzt werden (heute verteilt in `entity-registry.ts`) |
| `clampParams` | `Partial<…>` → vollständige Params; Delegation an `clamp*Params` im jeweiligen `asset-*.ts` |
| `cloneParams` | Shallow clone für Registry/Entity-Updates; darf Wrapper um bestehende `clone*Params` sein |
| `geometryVisibilityDefaults` | Default-`AssetGeometryVisibility` (heute `defaultGeometryVisibility` in `geometry-visibility.ts`) |
| `rebuildStrategy` | `'sync-populateAssetGroup'` (print, picture, devices, wall, block) oder `'async-packaging-group'` (beverage-can, tin-can, wine-bottle) → `src/engine/asset-meshes/` |
| `screenImageRole` | `'front'` (picture, devices, print front), `'label'` (packaging), `'wallpaper'` (wall / wall-door) — Images-Bibliothek / `screenImageId` |
| `defaultMaterials` | Verweis auf **eine** Zeile in `defaultMaterialsForKind` (`material-presets.ts`); **keine** zweite Material-Fallback-Kette in `populate*Group` (Material-IDs nur dort oder in Registry-Metadaten, nicht doppelt) |
| `geometryParts` | `readonly AssetGeometryPartDescriptor[]` — Teile, UI-Labels, `visibility-only` vs `visibility-and-material` + `materialSlot`; Defaults via `geometryVisibilityFromPartDescriptors` ([`geometry-parts.ts`](../../src/scene/geometry-parts.ts), Katalog [`geometry-parts-catalog.ts`](../../src/scene/geometry-parts-catalog.ts)); UI [`GeometryPartsSection`](../../src/ui/panels/GeometryPartsSection.tsx) |

**Picture:** Kein Pflicht-Modul `asset-picture.ts` in v1; Registry-Eintrag `family: 'picture'` mit Defaults aus `asset-sizing` + `geometry-visibility`. Optionales Mini-Modul später.

**API (später):** `getAssetKindDefinition(kind: AssetKind): AssetKindDefinition` und exhaustiver Test `Record<AssetKind, AssetKindDefinition>` (analog `asset-catalog.test.ts`).

---

**Category:** Architecture  
**Title:** Asset-Kind-Registry — Grenzen (was nicht in die Registry gehört)  
**Description:**

- **Geometrie / Mesh-Build:** `beverage-can-geometry`, `wine-bottle-glass`, `handheld-frame-csg`, … — bleiben in `src/engine/`.
- **UI:** `src/ui/panels/entity-fields/*` bleiben pro Kind; [`EntityPropertyFields.tsx`](../../src/ui/panels/EntityPropertyFields.tsx) bleibt Router. Kein generisches Param-Form in v1.
- **Scene-API öffentliches Interface:** v1 behält typisierte Methoden (`setBeverageCanParams`, `setTinCanParams`, …). Intern darf die Engine die Registry nutzen; ein öffentliches `setAssetParams(entityId, union)` erst mit Save v2 / User-Freigabe.
- **Domänen-Module:** `scene/asset-{kind}.ts` bleiben Source of Truth für Param-Typen und Clamp-Logik; Registry orchestriert nur.

---

**Category:** Architecture  
**Title:** Asset-Kind-Registry — Implementierungsphasen (Code, nach Docs)  
**Description:**

| Phase | Inhalt |
|-------|--------|
| **3a** | `asset-kind-registry.ts` + `getAssetKindDefinition` + exhaustiver Test; noch keine Caller-Umstellung |
| **3b** | `entity-registry`: `addEntity` + `set*Params` über Registry |
| **3c** | `asset-system`: Rebuild-Pfade (`populate*Group`) an `rebuildStrategy` / Registry |
| **3d** | `asset-sizing`, `geometry-visibility`: schrittweise Metadaten aus Registry (`family`, visibility defaults) — kein Big-Bang |
| **3e** | Optional: `app-store` gruppieren oder interner Patch — **nach** 3b |
| **3f** | `geometryParts` auf `AssetKindDefinition`; `getGeometryPartsForKind`; `geometry-visibility-defaults` delegiert; Entity-Fields „Geometries“ über `GeometryPartsSection` |

Jede Phase: `npm run lint`, `npm run build`, bestehende Tests grün; kein Verhalten ändern außer Refactor-Äquivalenz.

---

**Category:** Architecture  
**Title:** Asset-Kind-Registry — Modul-Auflösung `asset-meshes`  
**Description:** Import `./asset-meshes` aus der Engine: Datei [`src/engine/asset-meshes.ts`](../../src/engine/asset-meshes.ts) re-exportiert den Ordner [`src/engine/asset-meshes/`](../../src/engine/asset-meshes/). Grund: Auflösung **Datei vor Verzeichnis** — ohne Re-Export kann der Vite-Dev-Server nach Umbau `asset-meshes.ts` mit **404** laden. Bei weiteren Splits: Re-Export-Shim beibehalten oder Import-Pfad explizit auf `./asset-meshes/index` umstellen und Dev-Server neu laden.

---

**Category:** Architecture  
**Title:** Asset-Kind-Registry — Save v2 (TBD, nicht v1)  
**Description:** Wenn **Scene Save** ein einheitliches Entity-JSON bekommt, kann Option A (`assetParams` discriminated union) evaluiert werden. Voraussetzung: festes Top-Level-Schema in `requirements-architecture.md` / `requirements-scenes.md`. Registry v1 muss so designed sein, dass `defaultEntitySlice` / `clampParams` später auf Union umstellbar sind, ohne Geometrie-Module neu zu schreiben.
