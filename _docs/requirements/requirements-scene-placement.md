# Scene Placement

Projektweites System zum **Platzieren, Verschieben und Drehen** aller relevanten Objekte im Raum — Lichter, Meshes, Kameras (Helper), später Props/Decals.

Bezüge: [`requirements-lighting.md`](./requirements-lighting.md), [`requirements-camera.md`](./requirements-camera.md), [`requirements-code.md`](./requirements-code.md).

---

**Category:** Scene Placement  
**Title:** Unified Entity System  
**Description:** **Alles Platzierbare** ist eine **Scene Entity** mit: `id`, `type`, `name`, `transform` (position, rotation — **kein** `scale` in `transform`), optional typ-spezifische Felder (`sizeScale` bei Assets), optional `parentId`. Typen z. B.: `asset`, `light`, `camera-helper`, später `group`, `decal`. Zentrale Registry in der Engine (`EntityRegistry`). Eine Quelle der Wahrheit — UI, Export und Serialisierung lesen dieselbe Liste.

---

**Category:** Scene Placement  
**Title:** Selection  
**Description:** **Linksklick im Viewport** (&lt; 4 px, ohne Drag) wählt Entity — **in allen Modi** (Select/Move/Rotate/Scale), nicht nur im Select-Tool. Leerer Klick = Deselect. **Szene-Panel:** Klick auf Entity-Namen = Select; **zweiter Klick auf bereits selektierten Namen** = Deselect (`selectEntity(null)`). Collapse (Chevron) ändert **nicht** die Selection. **Remove:** Trash-Button im Entity-Header oder **Delete / Backspace** bei selektierter **Asset-Entity** → `removeEntity(id)` (Studio-Lichter nicht löschbar). Selection Highlight (Outline für Assets, Wireframe für Key/Fill). Selection im UI spiegeln (Szene-Liste, Properties). **Escape** deselektiert. Nur eine Primary Selection (Multi-Select später optional). Selection-State in Store, Engine meldet `onSelectionChanged`. Raycast mit `getBoundingClientRect()` — Canvas liegt zwischen Sidebars.

---

**Category:** Scene Placement  
**Title:** Transform — Move, Rotate & Scale  
**Description:** Modi **`translate`**, **`rotate`** und **`scale`**: Verschieben, Drehen und **proportional Skalieren** der selektierten Entity. Viewport-Gizmo — Details [`requirements-gimbals.md`](./requirements-gimbals.md). **Scale nur uniform** auf Assets; Bild-Aspect-Ratio bleibt erhalten ([`requirements-assets.md`](./requirements-assets.md)). **Space = Pan** bleibt Kamera-Navigation. Achsen: World; Start: World. Lights: Translate only (kein Rotate/Scale in v1).

---

**Category:** Scene Placement  
**Title:** Was ist platzierbar?  
**Description:** Mindestens: **alle Light-Typen** (mit Position), **Asset-Entities** (Smartphone, Flyer, Box, … — [`requirements-assets.md`](./requirements-assets.md)), **Meshes** (Cube, importierte Models, Ground ausnahme: fixed), **Kamera-View-Helper** (virtueller Punkt für gespeicherte Presets, optional sichtbar). Nicht platzierbar: Skybox, globaler Ambient (kein Transform). Ground/Plane: fix oder nur im Spezial-Mode — Default: fix.

---

**Category:** Scene Placement  
**Title:** UI ↔ Engine  
**Description:** React Panel zeigt Transform-Werte (Position X/Y/Z, Rotation, **Size/Scale**, **Width (m)**, **Height (m)** bei Assets) als **Inputs** — bidirektional mit Gizmo. Width/Height = Frontfläche / Bildöffnung; verknüpft über Bild-Seitenverhältnis; persistiert als `sizeScale`. Änderung im Panel → Engine; Gizmo-Drag → Store → Panel. Scene-API: `selectEntity`, `setEntityTransform`, `setAssetSizeScale`, `getEntities`, `addEntity`, `removeEntity`. Kein Three in UI.

---

**Category:** Scene Placement  
**Title:** Serialisierung (Vorbereitung)  
**Description:** Entity-Liste muss **projekt-speicherbar** sein (Save Scene). Transform + Typ + Parameter als JSON. Placement-System designt mit Persistenz im Hinterkopf — IDs stabil, keine ad-hoc Mesh-Referenzen in UI.

---

**Category:** Scene Placement  
**Title:** Modes & Input-Priorität  
**Description:** `ViewportInputController` routet zentral. **Space / RMB / MMB + Drag** = Kamera Pan. **LMB Klick** = Select/Deselect (alle Modi). **LMB Drag** = Orbit. **Gizmo-Handle** hat Priorität vor Select/Orbit. Transform-Gizmo nur wenn Entity selektiert + Tool aktiv. **Tool-Shortcuts:** **W/E/R/T** schaltet Select/Move/Rotate/Scale — Details [`requirements-gimbals.md`](./requirements-gimbals.md). Konflikte Viewport vs. Panel: Viewport hat Fokus für 3D-Input. Details → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md).

---

**Category:** Scene Placement  
**Title:** Selection Highlight — Outline & Light Wireframes  
**Description:** Selektierte **Assets** erhalten einen sichtbaren **Silhouetten-Outline** (Inverted-Hull, `BackSide`, leicht skaliert, Farbe `--color-active-text` / `#4d9fff`). Selektierte **Studio-Lichter** (Key/Fill) erhalten einen **Wireframe-Helfer** (Icosahedron, halbtransparent idle, volle Opacity + größer wenn selected). Highlight bleibt in **allen Modi** sichtbar (Select, Move, Rotate, Scale). Implementierung: `SelectionHighlight` in Engine; kein Post-Processing in v1.

---

**Category:** Scene Placement  
**Title:** Viewport Input — Click vs. Drag  
**Description:** `ViewportInputController` routet Pointer-Events zentral. **LMB Klick** (&lt; 4 px Bewegung) auf Objekt = Select; auf leeren Raum = Deselect — **in allen Modi** (nicht nur Select-Tool). **LMB Drag** (≥ 4 px) = Kamera Orbit. **RMB Drag** und **MMB Drag** = Pan (wie Space). **Space + Drag** = Pan. **Gizmo-Handle** hat Priorität vor Select/Orbit. Escape = Deselect. Details auch [`requirements-look-and-feel.md`](./requirements-look-and-feel.md).

---

**Category:** Scene Placement  
**Title:** Entity Sichtbarkeit  
**Description:** Jedes Asset im Szene-Panel hat einen **Eye/EyeOff-Icon-Button** im Entity-Header — **links vom Trash**. Toggle setzt `AssetEntity.visible` und `object.visible` in der Engine. Default: **sichtbar**. Unsichtbare Entities werden im Viewport nicht gerendert und sind **nicht per Raycast selektierbar**; Panel-Selection per Entity-Namen bleibt möglich. Gizmo wird bei versteckter Selection deaktiviert. Pattern wie Ground-Sichtbarkeit → [`requirements-ground.md`](./requirements-ground.md). API: `setEntityVisible(id, visible)`.

---
