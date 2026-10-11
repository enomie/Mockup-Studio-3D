# Architecture — Querschnitt & gemeinsame Nenner

Zentrale **Querschnitts-Themen**, die mehrere Feature-Systeme teilen. Hier festhalten **bevor** implementiert wird — damit Lighting, Placement, Camera, Assets, Export **nicht** jeweils eigene Ad-hoc-Strukturen bekommen.

Verknüpfte Feature-Docs: [`requirements-scenes.md`](./requirements-scenes.md), [`requirements-environment.md`](./requirements-environment.md), [`requirements-reflections.md`](./requirements-reflections.md), [`requirements-lighting.md`](./requirements-lighting.md), [`requirements-scene-placement.md`](./requirements-scene-placement.md), [`requirements-camera.md`](./requirements-camera.md), [`requirements-app-layout.md`](./requirements-app-layout.md).

**Status:** Laufend — Camera, Lighting v1, Placement, Images/Colors/Materials als Bibliotheken umgesetzt; Export-Save-Schema TBD.

---

**Category:** Architecture  
**Title:** Scene-API — einzige UI↔Engine-Grenze  
**Description:** React/UI spricht **nur** über `SceneApi` (`src/scene/scene-api.ts`) mit der Engine. Keine Three.js-Typen in UI. Neue Features (Lights, Entities, Camera, Presets) = **Methoden/Events auf dieser API erweitern**, keine parallele Brücke. Engine implementiert; UI ruft auf und subscribed auf State-Updates.

---

**Category:** Architecture  
**Title:** Scene Entity — gemeinsames Platzierungs-Modell  
**Description:** Alles Platzierbare (Lights, Meshes, später Props/Decals) = **Scene Entity** mit `id`, `type`, `name`, `transform`, typ-spezifischen `params`. Eine **Registry** in der Engine. Lighting, Placement-UI und Save/Load nutzen **dieselbe** Entity-Liste — keine separaten Light-Listen und Mesh-Listen in UI. Details: [`requirements-scene-placement.md`](./requirements-scene-placement.md).

---

**Category:** Architecture  
**Title:** UI Store — spiegelt Engine-State  
**Description:** React-Store hält **Anzeige- und Form-State** für Panels (Selection, Panel-Werte, Preset-Liste, Mode). **Single direction:** User-Aktion → Store → Scene-API → Engine → Callback/Event → Store → UI. Keine Business-Logik im Store; keine direkten Engine-Imports in Components.

---

**Category:** Architecture  
**Title:** Viewport invalidation hub  
**Description:** Sichtbare Canvas-Updates laufen über **`ViewportInvalidation`** in der Engine (nicht über den React-Store). Scene-API-Subscriber syncen nur Panel-State; **`invalidate()`** / **`commitVisualState`** nach Three-Mutationen (Selection+Gizmo, Mode, Lighting, Environment, Ground, async Asset/PMREM). Details → [`requirements-code.md`](./requirements-code.md) (Invalidation Contract).

---

**Category:** Architecture  
**Title:** Shared UI — ColorPicker  
**Description:** Alle Farben in Panels nutzen **`ColorPicker`** — [`requirements-color-picker.md`](./requirements-color-picker.md). Ein Popover-Verhalten, ein `Rgb`-Wert-Typ, Store → Scene-API. Ground, Sky, Fog, Lights importieren dieselbe Komponente.

---

**Category:** Architecture  
**Title:** Shared UI — RangeSlider  
**Description:** Numerische Bereiche nutzen **`RangeSlider`** / **`DualRangeSlider`** — [`requirements-range-slider.md`](./requirements-range-slider.md). Fog Near/Far = Dual; skalare Werte (Intensity, …) = Single. Store → Scene-API, gleiches Panel-Zeilen-Muster wie ColorPicker.

---

**Category:** Architecture  
**Title:** Panel-Muster (App Shell)  
**Description:** Funktions-Panels leben in **Right Main / Right Sub** (und Left) laut [`requirements-app-layout.md`](./requirements-app-layout.md). **Main** = Nav-Rail; **Sub** = scrollbares Detail zum gewählten Punkt (`SubPanel` + `SubPanelSection`). Wiederkehrende Muster: (1) **Form-Sections** (Environment, Ground, Camera), (2) **Liste + Detail** (Images, Colors, Materials) oder **Liste + Apply** (Environments, Light rigs — Klick lädt Preset), (3) **Preset-Chips** (Top Main Quick Bar) oder **Slot-Karten** (Camera Sub). Add / Remove konsistent. Bausteine: `SubPanel`, `SubPanelSection`, `RangeSlider`, `ColorPicker`, `preset-chip`.

---

**Category:** Architecture  
**Title:** Serialisierung & Projekt-Save (Querschnitt)  
**Description:** Szene, Entities, Lights, Camera-Presets und später Assets müssen in **ein** projekt-speicherbares Format passen (JSON o. ä.). IDs stabil; keine UI-only State der nicht persistiert werden kann. **`AtmosphereSnapshot`** (`environment` + `ground` + `lighting`) — [`requirements-environments.md`](./requirements-environments.md), `environment-preset-types.ts` — Teilmenge von **`SceneSnapshot`** (Entities + Atmosphäre + Camera-Framing) für **Scene-Presets** (Left Scenes) und **Environments**-Bibliothek. Apply-Querschnitt: `applyAtmosphereSnapshot` in Scene-API. Konkretes Top-Level-Schema TBD — aber **ein** Save-Pfad, nicht pro Feature ein eigenes Format.

---

**Category:** Architecture  
**Title:** Input-Routing Viewport vs. Panel  
**Description:** **`ViewportInputController`** (Engine): Pan (Space/RMB/MMB), Orbit (LMB-Drag), Select (LMB-Click, alle Modi), Gizmo-Priorität. **Select / Transform** = Entity-Interaktion im Viewport. Panel-Inputs = numerische Edits (inkl. `sizeScale`). Nicht pro Feature neu erfinden. Siehe [`requirements-look-and-feel.md`](./requirements-look-and-feel.md), [`requirements-scene-placement.md`](./requirements-scene-placement.md).

---

**Category:** Architecture  
**Title:** Images-Bibliothek ↔ Ground (und später Decals)  
**Description:** **Images** (Left Sub) = zentrale Bildliste — [`requirements-images.md`](./requirements-images.md). **Ground** referenziert `groundImageId` — kein duplizierter Upload. **+ New image** in Ground oder Images → immer derselbe Store. Später: Decals/Entities nutzen dieselbe Images-Quelle. Ground → [`requirements-ground.md`](./requirements-ground.md).

---

**Category:** Architecture  
**Title:** Reflections — IBL + Ground Mirror  
**Description:** Umgebungsreflexionen = **`scene.environment`** (PMREM aus Sky) — [`requirements-reflections.md`](./requirements-reflections.md). Ground **Roughness/Metalness** steuern Material; **Mirror floor** (Planar Pass) separat im Ground-Block. Sky-Pass bleibt unlit; IBL ist abgeleitete Cubemap. Environment-Intensity im Environment-Panel, Mirror-Toggle im Ground-Panel.

---

**Category:** Architecture  
**Title:** Images-Bibliothek ↔ Assets (Screen-Bild)  
**Description:** **Assets** (platzierte Bausteine) referenzieren Screens/Flächen per **`screenImageId`** aus der Images-Bibliothek — [`requirements-assets.md`](./requirements-assets.md). Kein duplizierter Upload. Bildwechsel → Engine rebuildet Asset-Geometrie (image-driven sizing, kein Stretch). Später: Drag Image → Viewport-Screen. Gleiches `imageId`-Pattern wie Ground (`groundImageId`) — ein Loader-Cache pro Session.

---

**Category:** Architecture  
**Title:** Materials-Bibliothek ↔ Entities (Oberflächen)  
**Description:** **Materials** (Left Main) = zentrale Preset-Liste — [`requirements-materials.md`](./requirements-materials.md). Entities referenzieren **`materialId`** pro Slot (z. B. Picture `frameMaterialId`, Print `sideMaterialId`). Kein hardcoded `FRAME_COLOR` in Engine. User-Presets + Built-ins (Print Matt/Glossy, Gold, Chrome, Gold Brushed, Aluminum Brushed, Wood, …). Store → `MaterialResolver` → Node-Material-Cache. Gleiches Bibliothek-Muster wie Images: **pflegen links**, **zuweisen rechts** (Dropdown).

---

**Category:** Architecture  
**Title:** Colors-Bibliothek ↔ ColorPicker  
**Description:** **Colors** (Left Main, vor Materials) = benannte RGB-Presets — [`requirements-colors.md`](./requirements-colors.md). Keine Entity-Referenz in v1; der **ColorPicker** liest `colors[]` aus dem Store und zeigt Library-Swatches im Popover. User pflegt Presets links; überall wo ColorPicker steht (Ground, Sky, Fog, Lights, Material-Editor) sind Built-ins + User-Farben wählbar. Recent bleibt Session-only. Gleiches Bibliothek-Muster: **pflegen links**, **nutzen über ColorPicker**.

---

**Category:** Architecture  
**Title:** Image Surfaces — Finish & Emissive pro Face  
**Description:** Bild-Flächen (Screen, Print Front/Back-Image) nutzen **`imageSurfaces`** auf der Entity — **nicht** Material-Dropdowns. UI: `ImageSurfaceFields` (Finish Matt/Glossy, Emissive Checkbox + Intensity). Engine: `finish` → intern `material-paper` / `material-glossy-print`; Emissive = Bild-Texture × Intensity (`emissiveNode`). API: `setImageSurface(entityId, faceId, partial)`. Rahmen/Seiten/Glas bleiben Material-Slots. → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md).

---

**Category:** Architecture  
**Title:** Camera — Live Readout ohne Store-Flood  
**Description:** Navigation-Werte (Position, Target, Distance, Winkel) für UI **nicht** bei jedem Orbit-Frame in den Store schreiben. Scene-API **`getCameraReadout()`** (imperativ); Panel-Hook pollt per **`requestAnimationFrame`** nur solange Camera-Sub-Panel gemountet ist. Store hält **`camera`**-Slice für Projection, FOV, Zoom, Slots — synchron via Engine `onChange`. Details → [`requirements-camera.md`](./requirements-camera.md).

---

**Category:** Architecture  
**Title:** Offene Querschnitts-Punkte (TBD)  
**Description:** Noch zu klären und hier ergänzen: **Export** (Save, Presets, Pipeline) → [`requirements-export.md`](./requirements-export.md); **Camera/User-Slots in Scene Save**; Shadow-Settings global vs. pro Light; Performance-Budget bei N Lights; IndexedDB vs. inline Blob in Scene Save; HDRI-Asset-Pipeline; Decals auf Nicht-Asset-Meshes. **Asset-Kind-Registry** (Engine-Metadaten pro `AssetKind`, Entity-JSON unverändert in v1) → [`requirements-asset-kind-registry.md`](./requirements-asset-kind-registry.md) (spezifiziert). **Nicht im Code ausprobieren** — erst Requirement, dann Implementierung.

---

**Category:** Architecture  
**Title:** Viewport Input — zentraler Controller  
**Description:** `ViewportInputController` in der Engine routet Pointer-Events für den Canvas: LMB Click vs. Drag (Schwelle 4 px), Orbit, Pan (Space/RMB/MMB), Gizmo-Priorität, Selection-Raycast. `CameraController` imperativ (`beginDrag`, `updateDrag`, …). Kein paralleles Input-Handling in `SelectionController` oder Gizmo. Details → [`requirements-scene-placement.md`](./requirements-scene-placement.md), [`requirements-look-and-feel.md`](./requirements-look-and-feel.md).

---

**Category:** Architecture  
**Title:** Asset Scale — `sizeScale` statt `transform.scale`  
**Description:** Uniforme Größe von Assets über **`sizeScale`** auf `AssetEntity` (Default `1`, Range `0.05`–`5`) — **nicht** über `transform.scale`. Engine berechnet Front-Maße aus Referenzkante × `sizeScale` + Bild-`width`/`height`; Mesh-Rebuild bei Commit. Gizmo Scale: visuelles Uniform-Preview während Drag, persistiert als `sizeScale`. Scene-API: `setAssetSizeScale`. Serialisierung: `sizeScale` Teil der Entity. Details → [`requirements-assets.md`](./requirements-assets.md), [`requirements-gimbals.md`](./requirements-gimbals.md).

---

**Category:** Architecture  
**Title:** Picture framed — Rahmen-Geometrie & Material-Slot  
**Description:** Rahmen = **ein** Engine-Mesh (`src/engine/frame-geometry.ts` → `asset-meshes/`), **ein** `frameMaterialId` pro Entity. Perimeter-UVs koppeln Procedural-Grain/Anisotropie an Balkenorientierung — kein Material-Split H/V. Details Z-Stack, Glas, UI → [`requirements-assets-picture-framed.md`](./requirements-assets-picture-framed.md); Presets → [`requirements-materials.md`](./requirements-materials.md).

---

**Category:** Architecture  
**Title:** Asset-Kind-Registry (Engine)  
**Description:** Parallele `is*AssetKind` / `set*Params` / Create-Slices in `entity-registry`, `asset-system`, `asset-sizing` werden durch **einen Katalog pro `AssetKind`** ersetzt (Registry v1 = bestehende Entity-Felder, keine Union). Domänen-Logik bleibt in `scene/asset-*.ts`; Registry delegiert Defaults, Clamp, Rebuild-Strategie, Screen-Image-Rolle, Material-Defaults. Vollständige Spezifikation und Implementierungsphasen → [`requirements-asset-kind-registry.md`](./requirements-asset-kind-registry.md). Ergänzt den Abschnitt „Scene Entity — gemeinsames Platzierungs-Modell“ (Engine-Registry für Assets, nicht Light-Entities).

---
