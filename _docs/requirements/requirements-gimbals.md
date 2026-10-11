# Gimbals (Transform Gizmo)

Viewport-Gizmo zum **Verschieben** und **Drehen** selektierter Objekte. Gehört zum Placement-System → [`requirements-scene-placement.md`](./requirements-scene-placement.md). UI-Tools → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md).

**Bestand (Inventur):** `GizmoController` (`gizmo-controller.ts`), `TransformControls` + WebGPU-Material-Upgrade; `ViewportInputController`; `SelectionHighlight`; Kamera `camera-controller.ts`; Modi `AppMode` in `scene-api.ts` / Store. Debug-Würfel optional (`DEBUG_PHYSICS_CUBE`), kein Gizmo-Target mehr.

---

**Category:** Gimbals  
**Title:** Translate, Rotate & Scale  
**Description:** Vier Gizmo-Modi: **Select** (kein Gizmo), **Translate** (Achsen-Pfeile X/Y/Z), **Rotate** (Rotations-Ringe), **Scale** (uniform). Umschalten über Viewport-Toolbar (Top Sub) — Lucide `mouse-pointer` / `move` / `rotate-cw` / `scaling` (o. ä.). Achsenraum Start: **World**. Local/World-Toggle später.

---

**Category:** Gimbals  
**Title:** Sichtbarkeit & Selection  
**Description:** Gizmo erscheint nur wenn **Transform-Tool aktiv** (`translate`, `rotate` oder `scale`) **und** ein Objekt attached ist. An **Entity-Selection** gekoppelt (Assets + Studio-Lichter Key/Fill für Translate). **Select-Modus** (`mouse-pointer`): kein Gizmo. **Scale-Modus:** nur Assets — Lichter bekommen kein Scale-Gizmo. Selection-Highlight (Outline/Wireframe) bleibt in allen Modi sichtbar → [`requirements-scene-placement.md`](./requirements-scene-placement.md).

---

**Category:** Gimbals  
**Title:** Input vs. Kamera  
**Description:** **Space + Drag = Pan** bleibt immer. Gizmo-Drag blockiert **Orbit** auf Linksklick (solange Gizmo-Handle gezogen wird). Kein Orbit während aktiver Gizmo-Interaktion. Mittelklick-Pan und Mausrad-Zoom unverändert. Implementierung: `dragging-changed` → Kamera `setOrbitEnabled(false)` während Drag.

---

**Category:** Gimbals  
**Title:** Engine — TransformControls  
**Description:** Three.js **`TransformControls`** aus `three/addons/controls/TransformControls.js` — in `src/engine/gizmo-controller.ts` gekapselt. Helper via `getHelper()` in Hauptszene. **WebGPU:** Addon-Materialien (WebGL-`three`) werden nach Erzeugung via `upgradeGizmoMaterialsToWebGPU()` auf **Node-Materials** (`MeshBasicNodeMaterial`, `LineBasicNodeMaterial`) gemappt — sonst unsichtbar. Kamera pro Frame `updateCamera()`. Eigenes TSL-Gizmo nur falls Addon scheitert.

---

**Category:** Gimbals  
**Title:** Physics-Sync (Debug only)  
**Description:** Optionaler Debug-Würfel (`DEBUG_PHYSICS_CUBE`) mit Rapier-Body — **kein Produkt-Feature**. Assets v1 ohne Dynamic-Physics. Falls Debug-Würfel aktiv: Gizmo-Änderung sync Body Translation/Rotation, Velocities nullen.

---

**Category:** Gimbals  
**Title:** UI — Viewport-Toolbar  
**Description:** **Top Sub** rechts: kompakte Icon-Toolgruppe (~28px): **Select**, **Move**, **Rotate**, **Scale** — gleicher Stil wie Top Main. Lucide: `mouse-pointer`, `move`, `rotate-cw`, `scaling`. Aktives Tool hervorgehoben (`--color-active-*`). Status-Zeile spiegelt Modus. Store → `setMode` → Scene-API.

---

**Category:** Gimbals  
**Title:** Scene-API  
**Description:** `AppMode`: `select` | `translate` | `rotate` | `scale` | `place-texture` | `export`. `setMode(mode)` schaltet Gizmo ein/aus und Modus. Asset-Scale: `setAssetSizeScale(entityId, factor)` — kein Three in UI. Gizmo attach an aktuelle Selection in Engine.

---

**Category:** Gimbals  
**Title:** v1-Umfang & Offen  
**Description:** **Implementiert:** vier Viewport-Tools; Gizmo an Assets + Key/Fill (Translate); uniform Scale auf Assets; Panel-Transform-Inputs bidirektional; Physics nur optionaler Debug-Würfel. **Out of Scope v1:** Multi-Select, Light-Rotate-Gizmo, Light-Scale, Touch-Gizmo-Optimierung, Local/World-Toggle.

---

**Category:** Gimbals  
**Title:** Targets & Light Rotate v1  
**Description:** Gizmo-Targets: **Asset-Entities** (Registry) und **Studio-Lichter** (`light-key`, `light-fill`). Demo-Würfel nicht mehr Gizmo-Target. **Rotate-Modus für Lichter deaktiviert** in v1 — Spot-Richtung über Target, nicht Helper-Rotation. Light-Rotate später via Direction-Handle. Move (Translate) für Key/Fill bleibt aktiv.

---

**Category:** Gimbals  
**Title:** Scale — nur uniform (Assets)  
**Description:** **Scale-Gizmo nur für Asset-Entities** (`print`, `picture`, später Devices). **Immer proportional** — ein Skalierungsfaktor, **nie** unabhängige X/Y/Z-Achsen, **nie** Stretch. Bild-Seitenverhältnis bleibt aus dem zugewiesenen Bild (bzw. Platzhalter-Ratio) — Scale multipliziert nur die Referenzkante. Technik: `sizeScale` auf Entity (Default `1`), **nicht** `object.scale` auf dem Three-Root als persistente Wahrheit. Gizmo-Drag → `sizeScale` aktualisieren → **Mesh-Rebuild** (wie bei Bild-Wechsel). `TransformControls` Scale-Modus mit Uniform-Constraint im `GizmoController` (`object.scale` nach Commit auf `(1,1,1)` zurücksetzen). **Lichter:** kein Scale-Gizmo. Panel: **Size** (Faktor), **Width (m)** und **Height (m)** (Frontfläche / Bildöffnung) — alle drei bidirektional mit Gizmo; Breite oder Höhe editieren passt die andere Kante über Bild-Ratio an (`sizeScale` bleibt Single Source of Truth). Regel: [`image-aspect-ratio.mdc`](../../.cursor/rules/image-aspect-ratio.mdc) — Override aspect ratio bleibt separate Checkbox, Scale verletzt Ratio nicht.

---

**Category:** Gimbals  
**Title:** Viewport-Tools — Tastatur-Shortcuts  
**Description:** Viewport-Toolbar (Top Sub) per **Einzelbuchstabe** umschaltbar — gleicher Effekt wie Toolbar-Klick. Mapping: **W** = Select (`select`), **E** = Move (`translate`), **R** = Rotate (`rotate`), **T** = Scale (`scale`). Default beim Start: **W** (Select). **Regeln:** nur **ohne Modifier** (kein Ctrl/Alt/Meta/Shift); **ignorieren** wenn Fokus in `input`, `textarea`, `select` oder `contenteditable`. `preventDefault` bei Treffer. UI: `useViewportToolShortcuts` in App-Shell → Store `setMode` → Scene-API (nicht paralleler Engine-Pfad). Toolbar-Tooltips und Status-Zeile zeigen Shortcut in Klammern (z. B. „Move (E)"). Daten: `src/ui/shell/viewport-tools.ts`.

---
