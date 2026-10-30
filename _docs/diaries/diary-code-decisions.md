# Code Decision Diary

Kurze Historie: **wie** wir uns entschieden haben (Warum, Alternativen). Requirements → `_docs/requirements/`.

---

## Einträge

### 2026-10-30 — Git: nur noch `main`
- **Entscheidung:** Ein Branch (`main`). Agent-Arbeit wird nach Tests/Lint/Build sofort nach `main` gemergt; User testet mit `git pull`.
- **Grund:** Drei parallele Agent-Branches (Fabric-Fixes, Engine-Refactor, Panel-Umbau) waren nie gemergt — Fixes schienen „verschwunden“, Arbeit wurde doppelt gemacht (Bake-Upsampling). Alle drei in `main` zusammengeführt, Branches gelöscht.

### 2026-10-30 — Panels: Detail-Panel statt Split, kein Titel-Header, Breite nach Inhalt
- **Entscheidung:** Listen-Sub-Panel + eigenes Detail-Panel zum Viewport hin (Scene, Materials). Sub-Panel-Titelzeile entfernt. Spalten `auto`; `SubPanel width="list" | "form"`; Main-Nav `max-content`.
- **Grund:** Scene-Accordion war unübersichtlich; Split quetschte den Material-Editor (~160px) und machte Listen zu breit; Titel doppelt zum aktiven Main-Nav-Eintrag.
- **Verworfen:** Split auf der rechten Seite gespiegelt (`SubPanelSplit` gelöscht).

### 2026-10-30 — Einheitliche Bedienelemente in Entity-Settings
- **Entscheidung:** Auswahlfelder immer `PanelSelect` (Fabric: Pinned corners, Active pin, Fabric behavior); keine `btn btn-xs`-Button-Gruppen, keine Status-Hinweise wie „Preset: Linen“.
- **Grund:** Ein einfacher, einheitlicher Look statt Elementen, die pro Asset anders aussehen.

### 2026-10-30 — Fabric cloth — Verlet-Solver neu, fester Substep-Ablauf
- **Entscheidung:** Substep = Predict → (Constraints → Collide) × Iterationen → **Reibung** → Pins. Reibung **nur** dort, auf der tangentialen Substep-Verschiebung, mit Haftreibung; Boden = Collider mit Normale (0,1,0). Sleep nach 30 Ruhe-Frames, Wake per Fingerprint.
- **Grund:** Tuch rutschte am Boden weg und wurde schneller. Ursachen: Slip-Formel addierte die Geschwindigkeit doppelt; danach verschoben Constraint-/Projektions-Pässe Kontakt-Vertices ungebremst (Drift ~20 cm in 10 s über Box).
- **Verworfen:** Weitere Flicken am alten Solver (Reibung an drei Stellen, OGC-lite-Bounds, `oldPosY`-Tricks) — entfernt.

### 2026-10-30 — Fabric cloth bake — Basis-Pivot, Catmull-Rom, Zeilen-Spiegelung
- **Entscheidung:** Bake-Payload: X/Z zentriert, tiefster Punkt Y = 0 (auch beim Load → Legacy repariert). Glättung Catmull-Rom ×3 statt bilinear ×4; Normals mit derselben Funktion wie Live. Live-Zeilen (0 bei −Y) werden in `PlaneGeometry`-Reihenfolge (0 bei +Y) gespiegelt.
- **Grund:** Gebackenes Tuch lag unter dem Ground (Fallhöhe im Ursprung), Gizmo darüber; bilinear = facettiert; ohne Spiegelung Bild kopfüber und Rückseiten-Shading (blass).
- **Verworfen:** Align an Live-Mesh-AABB (übernahm falschen Ursprung); Bake nur in Sim-Auflösung (Zwischenstand, zu grob).

### 2026-10-29 — Fabric cloth — Platzhalter ohne Bild = Preset-Pipeline
- **Entscheidung:** `createImageOnPresetMaterial` bei `tex === null` → `createStructureBaseMaterial(preset)` + `DoubleSide`, nicht `createPassepartoutPbrMaterial`.
- **Grund:** Requirements: `fabricClothMaterialId` gilt **auch ohne** `screenImageId`; Passepartout-Matt ignorierte Aluminum Brushed / Silk / Linen-Struktur.
- **Verworfen:** Graues Matt als einziger No-Image-Look.

### 2026-10-29 — metal-brushed — MikkTSpace-Tangents auf Render-Geometrie
- **Entscheidung:** Zentral `ensureGeometryTangents()` nach Normals/UVs in allen Asset-Geometrie-Buildern; Cloth-Sim rekalkuliert Tangents mit Grid-Normals.
- **Grund:** Ohne `tangent`-Attribut nutzt WebGPU/TSL derivative-TBN (pro Dreieck konstant) → sichtbare Facetten bei anisotropem Brushed auf jeder Mesh.
- **Verworfen:** Nur Roughness-Streifen ohne Anisotropie; Shader-Workaround statt korrekter Tangent-Basis.

### 2026-10-24 — Fabric cloth bake — restPlaneXY vor Deformation
- **Entscheidung:** Beim Bake `restPlaneXY` aus dem dichten Ruhe-`PlaneGeometry` **vor** dem Schreiben deformierter `position` serialisieren; `planeWidthM`/`planeHeightM` aus `fabricClothRestPlaneFootprintM(restPlane)`; Load: `normalizeFabricClothBakedMeshPayload` wenn Metadaten von Extents abweichen.
- **Grund:** Border-TSL braucht zentriertes Ruhe-Gitter — Kopie nach Deformation verschob Center und brach Bake/Footprint-Validierung; Legacy-Katalog mit falschem `planeWidthM` bleibt ladbar.
- **Verworfen:** Footprint aus deformierten XY-Positionen.

### 2026-10-24 — Fabric cloth border v1 — TSL cutout + render shell + bake
- **Entscheidung:** Bordüre bleibt `restPlaneXY`-TSL (kein Canvas); Cutout-Alpha `max(imageAlpha, borderMask)`; `applyFabricClothRenderShellToMaterial` in `createFabricClothMaterial` (live + baked); gleiches Material für `fabric-cloth-baked`.
- **Grund:** Saum meter-genau nach Falten/Bake; PNG-Ränder dürfen Bordüre nicht weg-testen; DoubleSide ohne Vertex-Shell flackert (Requirements Depth).
- **Verworfen:** Silk-Canvas-Bordüre in der Albedo-Map.

### 2026-10-24 — Fabric cloth bake — Entity-lokal AABB-Alignment
- **Entscheidung:** Nach Centerline-Dichte `alignFabricClothBakePayloadToSourceMesh` verschiebt Payload-Vertices so dass min-Y und X/Z-Zentrum zur Live-Shell (entity-lokal, `mesh.matrix`) passen.
- **Grund:** Gizmo ~0,3 m über platziertem baked cloth trotz korrekter Centerline — stiff Plane vs. Double-Shell-Frame.
- **Verworfen:** Nur `mesh.position`-Offset auf Instanz (Pose muss im serialisierten Mesh stehen).

### 2026-10-24 — Fabric cloth bake — Verlet centerline als Bake-Quelle
- **Entscheidung:** Bake liest mesh-lokale Centerline aus `binding.pos` (`fabricClothMeshLocalCenterlineFromBinding`) nach `flushBindingShell`; `getBindingForBake` in Participant; stiff Payload unverändert (PlaneGeometry + -X rotation).
- **Grund:** Gebackene Instanz wich vom Gizmo ab, obwohl pausierte Quelle stimmte — Top-Shell-Attribute ≠ Centerline-Frame.
- **Verworfen:** Shell-Top-Vertices als coarse source für Double-Shell.

### 2026-10-23 — Fabric cloth Phase F — physics UI ohne Rebuild
- **Entscheidung:** Presets + vier Slider in `FabricClothFields` (`fabricClothParams.physics`); `isFabricRuntimeTuningPatch` (nur `physics`/`sim`) überspringt `rebuildEntity`; `wakeFabricClothVerletBinding` bei Physics-Änderung während World-Session.
- **Grund:** Live-Drape wie Silk Studio; Border/Material weiterhin Rebuild.
- **Verworfen:** Silk-PBR-Optik-Slider in Phase F (Material bleibt `fabricClothMaterialId`).

### 2026-10-23 — Fabric cloth pins — scene anchors + entity-local persist
- **Entscheidung:** Pin-Meshes in Hauptszene (Weltkoordinaten); Gizmo translate an aktive Ecke während World-Session; `sim.pinCorners` bleiben Entity-lokal und werden bei Drag persistiert; Sim-only Param-Patches ohne Mesh-Rebuild.
- **Grund:** Silk-Parität + Requirements Gimbals (Entity-Root gesperrt, Pins beweglich).
- **Verworfen:** Pins als Child des Cloth-Meshes.

### 2026-10-23 — Fabric cloth Phase D — live CPU Verlet + double shell
- **Entscheidung:** World physics nutzt `FabricClothSimulationParticipant` + `fabric-cloth-verlet-session` (Welt-`pos`, `buildSceneColliderSnapshot`, `entity.fabricClothParams.physics`); Mesh = physische Doppelhülle (`shell-vertices`, `SHELL_HALF_THICKNESS`); Shader-Render-Shell aus Material entfernt.
- **Grund:** Silk-Verhalten im Browser; Rapier SoftBody nur noch ungenutzt bis Phase G.
- **Verworfen:** Rapier `createSoftBody` weiter für Stoff.

### 2026-10-23 — Fabric cloth collider snapshot — Rapier-equivalent SDF
- **Entscheidung:** `buildSceneColliderSnapshot` liest `rigidColliderShapeFromEntity` + `colliderWorldMatricesFromObject` (Foot-Pivot `centerOffsetY`, Wheel `WHEEL_COLLIDER_AXLE_QUATERNION`); Zylinder-SDF v1 ohne `borderRadiusM`-Fillet.
- **Grund:** Cloth-Kontakt muss dieselbe Hülle wie Rapier-Rigids nutzen, nicht Mesh-Bounding-Box.
- **Verworfen:** Roh-Mesh-Half-Extents für Snapshot.

### 2026-10-23 — Fabric cloth SDF — non-uniform round box half extents
- **Entscheidung:** Cloth collision SDF `sdfRoundBoxLocal` nutzt **`RoundBoxHalfExtents` {x,y,z}** (IQ round box), nicht Silk-Scalar — passt zu Mockup-Block-Maßen; Snapshot (Phase C) liefert Welt-Matrix + diese Half-Extents.
- **Grund:** Blöcke sind kein Würfel; ein Skalar `half` würde Kontakt verzerren.
- **Verworfen:** Silk-Scalar beibehalten und nur größte Kante verwenden.

### 2026-10-23 — Fabric cloth — CPU Verlet (Silk Studio) statt Rapier SoftBody
- **Entscheidung:** Stoff-Simulation = **1:1-Port** aus `_docs/fabric-physics/src-silk-studio` (Verlet, OGC-lite, SDF, physische Doppelhülle, Pins). Rapier nur noch für **Rigid primitives** + Ground. Collider-Snapshot aus **allen** bestehenden Rapier-Collider-Formen (Block, Sphere, Cylinder, Wheel-Car) inkl. Welt-Transform.
- **Grund:** Rapier SoftBody liefert falsches Drape/Kontakt; Silk-Referenz ist produktreif und dokumentiert.
- **Verworfen:** Rapier-Parameter-Tuning (`fabric-cloth-drape`, Partikel-Balls); Shader-only Render-Shell als Ersatz für Sim-Dicke.

### 2026-10-23 — Schatten — Export 8192² + adaptive Spot-Coverage
- **Entscheidung:** Live-Viewport **`SHADOW_MAP_SIZE` 4096²**; Bild-Export temporär **`SHADOW_MAP_SIZE_EXPORT` 8192²** (`LightingSystem.pushExportShadowQuality` im Capture-`finally`). Spot-Frustum-Coverage aus Entity-AABB: `computeSceneShadowCoverageRadius` zwischen **`SHADOW_COVERAGE_RADIUS_MIN`** und **`SHADOW_COVERAGE_RADIUS`**.
- **Grund:** Weiche Schatten (PCF) zeigten Texelgitter auf Boden und Assets; Export-Frame kann mehr Shadow-Fillrate, engere Coverage erhöht Texel/m im Mockup ohne dauerhaft 8192² im Viewport.
- **Verworfen:** Dauerhaft 8192² im Viewport; nur Softness reduzieren als Produktfix.

### 2026-10-14 — Fabric cloth Bake v1 — Session store, kein Workspace
- **Entscheidung:** `userBakedAssets` im AppState; Bake-Button Physics-Panel; Placement `fabric-cloth-baked` + `userBakedAssetResolver` in Engine; Mesh-Glättung `fabric-cloth-bake.ts` (bilinear, subdiv factor 2).
- **Grund:** Requirements User-Asset-Flow; Reload-Persistenz bewusst später (Workspace).
- **Verworfen:** IndexedDB in v1.

### 2026-10-14 — Bake — explizite Entity-Selektion (Querschnitt)
- **Entscheidung:** Bake erzeugt **einen** User-Asset-Katalogeintrag aus **`selectedEntityId`**; v1 nur bake-fähiges **`fabric-cloth`** bei `paused`. Später: zentrale Bake-Registry pro `assetKind`, nicht „alles mit Mesh“.
- **Grund:** Mehrere Tücher / künftige deformierbare Assets brauchen klares „was wird gebacken“.
- **Verworfen:** Implizit alle Cloth-Instanzen beim Freeze; globaler Bake ohne Selektion.

### 2026-10-14 — Fabric cloth — „Bake“ = User-Asset (stiff), Glättung beim Bake
- **Entscheidung:** **Bake** = eingefrorene Pose als **`source: 'user'`** in der **Assets-Liste** persistieren (`fabric-cloth-baked` o. ä.) — **steif**, ohne Rapier; **Fold-Glättung** (dichteres Mesh + Interpolation) nur in dieser Bake-Pipeline, **nicht** live in `simulating`. **Freeze** = nur Pause (Voraussetzung), separater Bake-Trigger.
- **Grund:** User-Intent: photoreal Falten wiederverwendbar wie Katalog-Baustein; nicht nur temporäres Freeze-Mesh für Export.
- **Verworfen:** „Bake“ = automatisches Freeze-Viewport-Subdivide ohne Bibliotheks-Eintrag (Missverständnis Agent 2026-10-14).

### 2026-10-14 — Fabric Silk — Built-in = `metal-brushed` (Preset-Parität)
- **Entscheidung:** `material-silk` → **`proceduralProfile: metal-brushed`** + dieselben strukturellen PBR-Felder wie Gold Brushed (metalness 1, tileScale 28, anisotropy 0.25, roughness 0.32); Generator nur `buildMetalBrushedNodes`. Profil-Id **`silk-fine`** bleibt Legacy-Alias (Registry + Re-Export).
- **Grund:** Nur TSL-Duplikat reichte nicht — unterschiedliche Preset-Werte ließen Silk nicht wie Brushed aussehen.
- **Verworfen:** Paralleles `silk-fine`-Shaderfile mit eigenen Konstanten; `silk-speckle`.

### 2026-10-14 — Fabric Silk — `silk-speckle` statt `silk-fine`
- **Entscheidung:** Built-in `material-silk` → Procedural-Profil **`silk-speckle`**: Mikro-Bump + **hohe Roughness-Variation** + **moderater Clearcoat** (~0,30); `silk-fine` bleibt für Legacy/User-Duplikate.
- **Grund:** `silk-fine` (Satin-Albedo-Shimmer, kaum Normal) wirkt visuell zu flach; Zielbild näher **Print Glossy**, aber fleckiger/rauer (viele Reflexionsstärken nebeneinander).
- **Verworfen:** Nur Preset-Tuning auf `silk-fine`; reines `coated-gloss` ohne stärkere Variation (zu homogen für Stoff).

### 2026-10-14 — Fabric cloth — PNG alpha cutout (depthWrite)
- **Entscheidung:** `createFabricClothMaterial` → `createImageOnPresetMaterial({ imageAlphaMode: 'cutout' })` — `applyImagePlaneAlphaCutout` statt transparentem Alpha-Blend (`depthWrite: false`).
- **Grund:** Durchsicht auf den Boden/Objekte ~dm dahinter beim Kameradreh; Requirements verbieten `depthWrite: false` auf Stoff.
- **Verworfen:** Alpha-Blend wie Print-Overlays (ok für senkrechte Screens, nicht für drapiertes DoubleSide-Cloth).

### 2026-10-14 — Fabric cloth — render shell gegen Z-Fighting
- **Entscheidung:** `DoubleSide` bleibt; Vertex-`positionNode` verschiebt Vorder-/Rückseite entlang `normalLocal * faceDirection` um **`FABRIC_CLOTH_RENDER_SHELL_HALF_M`** (½ × `FABRIC_CLOTH_MESH_THICKNESS_M`, 1 mm gesamt) — `applyFabricClothRenderShellToMaterial`.
- **Grund:** Dünnes Plane + beidseitiges Rendering → koplanare Depth-Kämpfe beim Drapieren/Kameradreh; Shell trennt Front/Back im Depth-Buffer ohne zweites Mesh.
- **Verworfen:** Nur `polygonOffset` (hilft kaum bei Self-Overlap); `FrontSide` only (Requirements: Unterseite sichtbar).

### 2026-10-14 — Lathe SVG — path_red / path_green / path_blue
- **Entscheidung:** Alle Built-in-Lathe-SVGs: bis zu drei Geometrie-Pfade mit festen Klassen + RGB-Strokes; zentraler Parser [`lathe-svg-path-slots.ts`](../../src/engine/lathe-svg-path-slots.ts); strikt (kein „erster Pfad“-Fallback). Asset-Code mappt Slot 0/1/2 auf Semantik (cap/tire/can body, …).
- **Grund:** Nachhaltiges Authoring; keine gemischten Illustrator-`cls-n`/schwarzer Reifen mehr.
- **Verworfen:** Asset-spezifische Stroke-Paletten und semantische SVG-Klassen (`.tire`, …) als Engine-Quelle.

### 2026-10-14 — Bottle Wine — UI label + Dimensions footprint
- **Entscheidung:** Katalog-Label **Bottle Wine** (wie Can Beverage); `computeFaceSize` + `sizeScaleFromFace*` für `wine-bottle` nutzen **Entity**-`heightM` und **Bauch-Durchmesser** pro Profil (nicht generischen `referenceFaceHeight('bordeaux')`).
- **Grund:** Panel Width/Height gekoppelt zu `sizeScale`; vorher falscher Ref bei Profil/Höhe ≠ Default.
- **Verworfen:** `assetKind` umbenennen (`wine-bottle` bleibt stabil).

### 2026-10-14 — Pen engine — mm SVG import, no maxRadiusM
- **Entscheidung:** `pen-svg-profile` skaliert Pfade mit `MM_TO_M` × `sizeScale`; `PenParams` nur `penBodyProfile`; Panel-Footprint aus `penNominalFootprintM` (nicht Label-Unfold-Aspect).
- **Grund:** Lathe-Doc + Szene-Dimensions; gespeichertes `maxRadiusM` wird beim Load ignoriert (nur `sizeScale` skaliert).
- **Verworfen:** Weiterer User-Radius-Param; alte ~13 mm-Normierung über `maxRadiusM/bounds.maxX`.

### 2026-10-14 — Lathe assets — SVG path coordinates in mm
- **Entscheidung:** Neue Querschnitt-Spec [`requirements-assets-lathe.md`](../requirements/requirements-assets-lathe.md): **1 Pfad-Einheit = 1 mm**; **viewBox ≠ Produktmaß**; Szene nur **uniform** (`sizeScale`, gekoppeltes Width/Height); keine Verzerrung von Dose/Flasche/Rad/Stift; anderes Profil = SVG. Pen-Panel: **kein** „Max radius“.
- **Grund:** User-Intent vor Lathe-Panel-Rollout; trennt bildgetriebene Assets (gekoppeltes WH ohne Size) von Profil-Assets.
- **Verworfen:** User-stellbarer `maxRadiusM` im Pen-UI; non-uniform Width/Height für Lathe.

### 2026-10-14 — Fabric cloth — kein Sim-Quality-Toggle
- **Entscheidung:** Ein festes Subdivision-Grid — **`FABRIC_CLOTH_SIM_CELL_SIZE_M` = 0,0125 m** (~36×36 bei 0,45 m); `fabricClothGridSegments(width, height)` ohne Quality-Parameter; keine `draft` / `standard` / `high`, kein Physics-Panel-Feld.
- **Grund:** Aktuelles Verhalten (ehem. „high“) reicht; weniger Produkt- und Doc-Overhead.
- **Verworfen:** `fabricClothSimQuality` in Store/UI und drei Zellgrößen-Konstanten.

### 2026-10-14 — Fabric cloth — Grid vertex normals (CPU quick win)
- **Entscheidung:** `writeFabricClothGridNormalsFromPositions` ersetzt `computeVertexNormals` im Stoff-Sync/Reset/Mesh-Build; O(vertices) zentrale Differenz auf PlaneGeometry-Grid; `FABRIC_CLOTH_SYNC_NORMALS_EVERY_N_FRAMES = 1`, Bounds-Stride bleibt 2.
- **Grund:** `computeVertexNormals` war CPU-Hotspot bei high-Grid; Rapier bleibt einzige Physik.
- **Verworfen:** GPU-Normals in dieser Runde; Sleep-Gate.

### 2026-10-14 — Fabric cloth — FPS sync stride (ohne Sleep-Gate)
- **Entscheidung:** `syncFabricClothMeshFromSoftBody` mit optionalen Flags; World-Physics-Tick: **Positionen jeden Frame**, `computeVertexNormals`/Bounds nur jeden **2.** Tick (`FABRIC_CLOTH_SYNC_*_EVERY_N_FRAMES`); Spawn/Reset voller Sync. Continuous Rendering während `simulating` unverändert; `invalidateViewport` nach Render nur wenn nicht bereits continuous.
- **Grund:** CPU-Hotspot `computeVertexNormals` bei high-Grid; Sleep-Gate bewusst nicht (User).
- **Verworfen:** `isSleeping()`-Skip; On-Demand-Viewport nach Cloth-Settle.

### 2026-10-14 — Dead code — Fabric plane collider + Block physics shims
- **Entscheidung:** Legacy `fabric-cloth-collider-shape` (nur Tests) und `block-physics-colliders` Re-Export nach `_deleted/`; `FABRIC_CLOTH_PHYSICS_MASS_KG` entfernt; tote API (`spawnAll`/`removeAll`/`isActive` auf Cloth-Colliders, `spawnDynamicAll`/`removeDynamicAll`, `setBlockPhysicsColliders`, `BlockPhysicsColliders`-Alias); SoftBody-Material-Helfer nur in `fabric-cloth-soft-body.ts`.
- **Grund:** SoftBody-Pfad seit Tagen produktiv; kein Caller mehr auf Plane-Proxy-Collider-Shape und Deprecation-Shims.
- **Verworfen:** Dateien hart löschen (Projektregel: `_deleted/`).

### 2026-10-14 — Fabric cloth — Settle-Damping + Border `restPlaneXY`
- **Entscheidung:** Drape-Profile ergänzt um `deformationDamping` / `elasticDampingRatio`; höheres Profil-`linearDamping`; `SoftBodyDesc.setCanSleep(true)`. Border-TSL liest **`restPlaneXY`** (StaticDraw, beim Build aus Ruhe-`position.xy`) — Physik-Sync ändert nur `position`.
- **Grund:** Dauer-Zittern nach Landung; Border verschwand, weil Inset aus deformiertem `positionLocal` berechnet wurde.
- **Verworfen:** Border aus aktuellem `positionLocal` während Sim.

### 2026-10-14 — Fabric cloth — Drape aus Material-Preset (Rapier SoftBody)
- **Entscheidung:** `resolveFabricDrape(materialId)` + Preset-`fabricDrape.profile` (`silk`/`linen`/…); `prepareFabricClothSimSession(mesh, drape)` nutzt `clothAnisotropic`, getrennte edge/bend/shear-Frequenzen, `setParticleMass` aus `areaDensityKgPerM2`, Kontakt-Reibung via `setSurfaceCollider` — **nicht** `SoftBodyMaterial.uniform(1, FABRIC_PLANE_DYNAMIC_FRICTION)` (war Damping-Ratio, nicht Friction).
- **Grund:** Default-Szene Silk wirkte „Schleim bis Boden“; Requirements: Drape nur über `fabricClothMaterialId`.
- **Verworfen:** Globales Drape-Dropdown; Default-`positionY` 0,5 → 0,31 in dieser Session (User: nur Drape fixen).

### 2026-10-14 — Fabric cloth — WebGPU vertex sync + Spawn-Invarianten
- **Entscheidung:** Stoff-`position` mit `DynamicDrawUsage`; nach Sync/Reset `needsUpdate` + Bounds; `spawnOne` aktualisiert Root-`matrixWorld`, prüft Rest-Pose (`maxFabricClothRestPoseWorldError`), sync sofort; Integrationstests (Sizing→Mesh→`FabricClothPhysicsColliders`).
- **Grund:** WebGPU lädt statische Attribute sonst nicht zuverlässig nach CPU-Vertex-Updates; Tests deckten isoliertes Mesh, nicht `populateAssetGroup`-Pfad.
- **Verworfen:** Nur `needsUpdate` ohne `DynamicDrawUsage` (Browser zeigte „explodiertes“ Mesh trotz korrekter CPU-Daten).

### 2026-10-14 — Fabric cloth — Rapier SoftBody (statt Plane-Proxy)
- **Entscheidung:** World-Physics-Stoff = `SoftBodyDesc.cloth(origin, du, dv, nu, nv)` mit **Spacing** `du`/`dv` (nicht Kantenvektor); `createSoftBody(bodies, colliders, desc)`; Vertex-Sync über Partikel→`PlaneGeometry`-Index-Map (`v * nu + u`); Dynamic-Box-Proxy entfernt.
- **Grund:** Rapier-only im Browser (`@dimforge/rapier3d-simd-compat`); eine `world.step()`-Pipeline; Requirements WYSIWYG-Mesh.
- **Verworfen:** `cloth(width, height, …, cell)`-Missbrauch (NaN); separates CPU-XPBD v1; Einbindung des Rust-Crates [botrail/rapier-cloth](https://github.com/botrail/rapier-cloth) (Vorlage für Integration/Material, kein WASM in v1).

### 2026-10-13 — Fabric cloth — ein subdividiertes Grid (Geometrie)
- **Entscheidung:** Stoff-Mesh **immer** subdividiert (`fabricClothGridSegments` + `buildFabricClothMesh`); Default-Quality **`standard`**; **kein** Ruhe-1×1 und kein Mesh-Swap bei Physics Start/Reset — Solver schreibt später nur Vertices.
- **Grund:** Eine Topologie für Render und Rapier-Cloth; weniger Rebuild-Churn.
- **Verworfen:** Getrenntes Ruhe-Quad vs. Sim-Gitter.

### 2026-10-13 — Fabric cloth — Cloth-Sim Requirements (Docs)
- **Entscheidung:** Normativ: Ruhe-Mesh **1×1** Quad; Sim subdividiert per global **`fabricClothSimQuality`** (`draft` / `standard` / `high`); Drape über Preset-**`fabricDrape.profile`** + `resolveFabricDrape` (UI nur Fabric material); Export **WYSIWYG** ohne Bake-Schritt v1; Gizmo auf `fabric-cloth` **gesperrt** bei `simulating`/`paused`.
- **Grund:** Docs first vor Rapier-Cloth-Implementierung; eine Pipeline (Rapier-only); keine Desync-Transforms; Export = Viewport-Mesh.
- **Verworfen:** Pflicht-`FabricClothBakedMesh` + Export-Bake-Button v1; separates Physics-Drape-Dropdown.

### 2026-10-13 — Wheel Car: Felgen-Stirnseiten + Speichen aus SVG-Bounds
- **Entscheidung:** `rimOuter` / `rimInner` je **zwei** `RingGeometry`-Stirnflächen (axial min/max des SVG-Bands); Speichen radial von **Innenkante Außenband** bis **Naben-Innenkante** (`rimInner`), axial **Mitte** des Außenbands minus halbe Box-Tiefe.
- **Grund:** Dünne Lathe-Bänder zeigen sonst keine sichtbare Felgenfläche; Speichen sauber in der Felge statt proud an der Stirn.
- **Verworfen:** Nur Lathe ohne Stirn; Speichen nur über `rimRadiusM` / `hubRadiusM`-Panel.

### 2026-10-13 — Wheel Car: SVG-Lathe (3 Teile) + Speichen
- **Entscheidung:** Reifen/Felge/Nabe aus `lathe-x-wheel-car.svg` als drei Lathe-Meshes; Speichen bleiben prozedural; Skalierung nur uniform über `outerRadiusM`; Pfad-Zuordnung per **CSS-Klasse vor** Default-Stroke (sonst alles schwarz = Reifen).
- **Grund:** Illustrator-Profil ist autoritativ; Pen-Pattern für SVG-Load.
- **Verworfen:** Parametrisches Reifen-Lathe + Barrel/Hub-Zylinder; getrennte radial/axiale Skalierung; sync populate.

### 2026-10-13 — Wheel Car (`wheel-car`) — Physik & Achse *(weiter gültig)*
- **Entscheidung:** Achse **+X** via `rotation.z = π/2`; Foot-Pivot **min y = 0** auf Gruppe. Physik: Rapier-**Zylinder** mit **90°-Z-Rotation**; Defaults **255/30 R20**.
- **Grund:** [`requirements-assets-wheel-car.md`](../requirements/requirements-assets-wheel-car.md).

### 2026-10-13 — Transmission — surfaceNormalScale (glass-surface)
- **Entscheidung:** `surfaceNormalScale` auf `MaterialPreset`; Engine wendet implizites TSL-Profil **`glass-surface`** auf `MeshPhysicalNodeMaterial.normalNode` bei `createTransmissionMaterial` und **`createDisplayGlazingMaterial`**. Built-ins: Pane/Frosted pane/Wine **0.15**, Solid/Frosted solid **0.20**. Skala 0 → kein `normalNode`.
- **Grund:** Subtiles Glas-Relief ohne Transmission-`kind` mit `proceduralProfile` zu vermischen; Requirements Surface-Sektion.
- **Verworfen:** `proceduralProfile: glass-surface` auf transmission-Presets; Pattern-UI (seed/tile) für Glas in v1.

### 2026-10-13 — Concrete — Stained vs. Porous (Profile-Split)
- **Entscheidung:** Bisheriger Beton-Look = Built-in **`Concrete Stained`**, Profil **`concrete-stained`** (Shader aus altem `concrete-porous`). Neues Built-in **`material-concrete-porous`** + Profil **`concrete-porous`** = echte Kavitäten (blasig, Referenz Wood Porous). Load: alte `proceduralProfile: concrete-porous` auf Presets ≠ `material-concrete-porous` → `concrete-stained`.
- **Grund:** Name/Profil passten nicht zum sichtbaren Look; poröser Beton braucht eigenen Generator.
- **Verworfen:** Ein Preset „Concrete“ mit beiden Looks; globales Profile-Rename ohne Load-Migration.

### 2026-10-13 — Sub-Panel Split & Collapse
- **Entscheidung:** **List | Detail** in der Sub-Spalte (`SubPanelSplit`); Collapse **eine** Fußzeile — links ganzes Sub, rechts nur Editor; Main-Collapse schließt Sub mit; Sub öffnet per Main-Nav-Klick. Kein Viewport-Reopen-Streifen.
- **Grund:** Mehr Canvas; klare Hierarchie Main → Sub → Detail.
- **Verworfen:** Drittes Shell-Segment; Collapse im Header; Reopen-Strip.

### 2026-10-13 — Viewport helpers — X-Ray + Forward arrow
- **Entscheidung:** Alle Viewport helpers gemeinsam **see-through** (`transparent`, `depthWrite: false`, `depthTest: false`, feste Opacity in constants). **Forward arrow** am Boden: Checkbox **Forward arrow**, Richtung XZ vom Stage-Center **zum Key** (Fallback Fill), „vorne“ = Lichtseite; mit Scene center mitwandern.
- **Grund:** Orientierung im Set ohne Mockup zu verdecken; Pfeil erklärt Studio-Layout vs. Kamera.
- **Verworfen:** Pfeil fix auf Welt-+Z unabhängig von Key side; volle Opacity/depthTest wie Produkt-Meshes.

### 2026-10-13 — Viewport helpers vs. Light fixtures (UI & Export)
- **Entscheidung:** Neue Environment-Sektion **Viewport helpers** (unter Ground): Floor grid, World origin, Light handles (Wireframe) — WYSIWYG im Export wenn an. **Fixture-Discs** = Lighting (Show fixtures), **kein** Helper. Export: Fixtures primär über Lighting-State; `exportHideLightFixtures` nur Übergang/optionaler Override.
- **Grund:** Discs sind Studio-/Mockup-Inhalt (Spiegel, sichtbare Softbox), Grid/Achsen/Wireframe sind Authoring-Referenz.
- **Verworfen:** Fixture-Toggle in Environment helpers; Fixtures und Wireframe dauerhaft über eine Export-Checkbox koppeln.

### 2026-10-13 — Wine bottle SVG — offene Außen-Silhouette (Ist)
- **Entscheidung:** Shipped `bottle-*-open.svg` = **ein offener** Außen-Stroke (kein Pflicht-`Z`); Glas = **`trimLatheProfileToAscendingOuterMantle`** + Lathe + Stirnringe — nicht geschlossener Wandring im SVG.
- **Grund:** Stabiler Mockup-Pfad; Tests/Requirements an offene Pfade angepasst (kein „geschlossenes Wand-SVG“ als Norm).
- **Verworfen:** Requirement/Test, dass jede Flaschen-SVG `Z` schließt.

### 2026-10-13 — Builtin SVG profiles — `public/profiles/lathe` + `extrude`
- **Entscheidung:** Lathe-Authoring-SVGs aus `public/` root nach **`public/profiles/lathe/`**; **`public/profiles/extrude/`** leer für spätere Extrude-Assets. URLs `/profiles/lathe/…` via `src/constants/builtin-profile-paths.ts` (`builtinLatheProfileUrl`).
- **Grund:** Parallele Struktur zu `public/images/`; klare Trennung Mockup-Bilder vs. Engine-Silhouetten.
- **Verworfen:** Alles unter `public/svg/` ohne lathe/extrude-Unterteilung.

### 2026-10-13 — Pen body wrap — 90°-Mapping, Plastik-Underlay, Orientierung
- **Entscheidung:** Body-Bild = **`createPenBodyWrapMaterial`** (`fitPenBodyWrapColorNode`): Bild**höhe** auf Umfang (`maxBodyRadiusM`), Bild**breite** auf Schaft; PNG → **`bodyMaterialId`-Farbe** (deckend, kein `createImagePbrMaterial`); Umlauf gespiegelt + **180°** in ST damit Front lesbar und **Kappe links** im Motiv; UV = `cylindricalLabelUv` auf Body-Lathe.
- **Grund:** Gleiches Alpha-Problem wie Dose vor Fix; Design-Dateien portrait entlang Schaft; Dosen-Label bleibt Breite=Umfang.
- **Verworfen:** Transparentes Body-Mesh; separates Wrap-Mantel-Mesh in v1.

### 2026-10-13 — Book hinge groove — TSL auf Deckel-Außenfläche (v1)
- **Entscheidung:** Falz/Gelenk an Vorder- und Rückdeckel **nur** per **TSL-Material-Modifier** auf der äußeren Cover-Fläche (mm-Offset/Breite, Intensität 0–1); Sampling in **Objektspace**, nicht Cover-UV; Cover-Bild bleibt vollflächig, Effekt moduliert Licht/Relief darüber.
- **Grund:** Mockup-Qualität wie Referenzfoto; ein Mesh pro Deckel; gleiches Pattern wie Fabric-Border-Inset; Soft/Hard nur Default-Intensität.
- **Verworfen:** Falz als zweites Mesh oder reine Geometrie-Vertiefung in v1.

### 2026-10-13 — Pen asset — ein Kind, SVG-Stroke-Teile, maxRadiusM
- **Entscheidung:** `assetKind: pen` mit `penBodyProfile: marker | fountain`; je Profil eine SVG mit **drei** Pfaden (Cap/Ring/Body); Stroke **#ff0000 / #00ff00 / #0000ff** (Cap/Ring/Body), `cls-1/2/3` in beiden Dateien gleich; Default **`maxRadiusM = 0,0065 m`** (Permanentmarker Mantel **Ø 13 mm**, Höhe **≈ 141 mm** via `svgMaxRadius = 26.09`); Authoring-Koordinaten ≠ Engine-mm; Bild nur auf Body-Wrap.
- **Grund:** Ein Kind + Profil wie Wine bottle/Dose; normierte Farben für Parser; Kalibrierung am Ring-Querschnitt.
- **Verworfen:** Zwei `assetKind`s; image-driven sizing für Stiftlänge; 7 mm Default-Radius.

### 2026-10-13 — Fabric cloth border — Inset im Shader, scharfkantig
- **Entscheidung:** Border = **Inset** auf dem einen Plane-Mesh (`step` in TSL, `borderColor` + `borderWidthM`); Footprint/Collider = Bildbahn ohne Aufschlag.
- **Grund:** Eingefärbte Kante ohne Extra-Meshes; Requirements Ring-Grid war nie im Code.
- **Verworfen:** Außen-Ring / vier Border-Planes; Diary 2026-10-12 „Rand innen verworfen“ für Plane-Proxy; weicher Rand in v1.

### 2026-10-13 — Builtin Images — public/images + Auto-Manifest
- **Entscheidung:** Werk-Bilder nur in `public/images/`; Dateiname `{name}--{format}--{pixelsize}.{ext}` (Feldtrenner `--`); Build-Skript `scripts/generate-builtin-images.ts` → `builtin-images.generated.ts`; `predev`/`prebuild` via `tsx`.
- **Grund:** Neue Samples ohne manuelles `STARTER_IMAGES`; Parser testbar; Browser kann Ordner nicht listen; `import.meta.glob` greift nicht auf Vite-`public/`.
- **Verworfen:** Manuelle Pflege in `image-assets.ts`; altes `sample-{ori}-{WxH}` nur mit `-` (mehrdeutig bei `label-F-…`).

### 2026-10-13 — Grid paper — triplanar dominant axis
- **Entscheidung:** Grid-Linienmaske auf Solids: **eine** Projektion pro Pixel (|n| max → XY / XZ / YZ), nicht `max`/Summe über drei Ebenen.
- **Grund:** Konstante Koordinate auf Box-Face macht in „falschen“ Projektionen `min(distX,distY)→0` → volle Linienfarbe auf der Fläche.
- **Verworfen:** Gewichtete Triplanar-Summe (gestrichelt/schwach); `max()` über alle drei (solides Blau auf Flächen).

### 2026-10-13 — Grid paper — gridUnit (mm/cm/dm/m)
- **Entscheidung:** Preset-Feld `gridUnit`; `tileScale` via `grid-paper-unit.ts`; UI-Dropdown; Linienbreite mm-konstant (`smoothstep` in Zell-Einheiten × `tileScale/1000`); Major alle 5 Minor-Zellen.
- **Grund:** Rasterabstand in lesbaren Einheiten ohne mitwachsende Strichstärke.
- **Verworfen:** Freier `tileScale`-Slider für Grid; reine Meter-`smoothstep` ohne Major-Zell-Raum (Hauptlinien unsichtbar).

### 2026-10-13 — Wood on solids — triplanar-meters (not meter-3d)
- **Entscheidung:** `wood-soft` / `wood-porous` auf `default` surface role → `triplanar-meters` (Grain-Scalar pro Ebene blenden); Ground → `planar-meters`; Frame unverändert `uv`.
- **Grund:** `meter-3d` mit Ringen nur entlang Objekt-X wirkt auf Kugeln wie „Schnitt durch den Block“, nicht wie Millimeterpapier auf allen Flächen; Sphere-Mesh war nicht das Problem.
- **Verworfen:** Nur `positionGeometry` statt `positionLocal` auf der Kugel.

### 2026-10-13 — Sphere render mesh — Icosahedron detail 20
- **Entscheidung:** `IcosahedronGeometry(radiusM, 20)` + `mergeVertices` + `computeTangents()` vor Bottom-Pivot; Konstante `SPHERE_RENDER_ICOSAEDRON_DETAIL`.
- **Grund:** Gleiche Mesh-Vorbereitung wie tsl-textures `USE_BALL` — dichteres Netz, Tangents für PBR/Anisotropie; unabhängig von triplanar vs. meter-3d Sampling.
- **Verworfen:** Tetrahedron detail 17; ungemergte Duplikat-Vertices.

### 2026-10-13 — TSL Textures material upgrade (meter-3d + triplanar)
- **Entscheidung:** Ports aus [tsl-textures](https://boytchev.github.io/tsl-textures/) (MIT) für Concrete, Fabric, Silk, Plastics, Coated gloss, Grid; **`meter-3d`** auf vielen Solids; **Wood** später auf **`triplanar-meters`** (Solids); `tsl-noise.ts` re-exports `mx_noise_float`.
- **Grund:** Boytchev-3D-Position + triplanar wo 2D-Muster alle Box-/Kugelflächen brauchen.
- **Verworfen:** NPM-Dependency `tsl-textures`; Wood nur `meter-3d` auf Kugeln.

### 2026-10-13 — Procedural triplanar-meters (box faces)
- **Entscheidung:** `triplanar-meters` für `grid-paper-*` auf Solids; später auch Wood; Blend via `procedural-triplanar-meters.ts`. `paper-grain` auf Solids: `meter-3d` (nicht triplanar).
- **Grund:** `positionLocal.xy` zeigt Gitter nur auf Front/Back eines Blocks; professionelles Box-Mapping ohne per-Face-UV-Authoring.
- **Verworfen:** Nur Geometry-UV-Fix für Block; NPM-Dependency `tsl-textures` (nur Docs-Referenz).

### 2026-10-13 — Grid paper materials (opaque + transparent lines)
- **Entscheidung:** Zwei `textured`-Profile `grid-paper-opaque` / `grid-paper-lines`; zweite Preset-Farbe `lineColor` nur für opaque; 1 mm + 5 mm Raster im TSL-Shader; `tileScale` = Linien/m; Lines-Profil mit `opacityNode`, `depthWrite: false`.
- **Grund:** Millimeterpapier-Look als Material (Mockups, Overlays, PNG-Export) — getrennt von Asset-Geometrie-mm.
- **Verworfen:** Gitter als Mesh-Geometrie; ein Preset mit Alpha-Slider statt zwei klarer Built-ins.

### 2026-10-13 — Rigid primitives: Block, Cylinder, Sphere
- **Entscheidung:** Ein Engine-Service `RigidPrimitivePhysicsColliders` für `block` | `cylinder` | `sphere`; Rapier-IDs `physics:${kind}:${entityId}`; Collider-Union in `rigid-collider-desc.ts`; shared UI `RigidBodyPhysicsFields`.
- **Grund:** Cylinder/Sphere ohne Copy-Paste von Block-Physik; Architecture-Doc „World physics participants“.
- **Verworfen:** Drei getrennte Collider-Klassen; Block weiter mit bare `entityId` als Body-Key.

### 2026-10-13 — Fabric plane collider centered on sheet
- **Entscheidung:** `fabricClothColliderShapeFromExtents`: `colliderOffsetY = 0` — 1 cm Rapier-Slab **±5 mm um die Stoffebene** (Fuß), nicht nur darüber.
- **Grund:** Stapel Block–Stoff–Block soll **~1 cm** sichtbaren Abstand liefern (0,5 cm Partner-Margin); vorher lag Collider komplett über der Plane → Stoff wirkte „auf“ dem Block.
- **Verworfen:** Extra Render-Offset nur für Luft.

### 2026-10-13 — Physics parameter inventory follow-up
- **Entscheidung:** `STANDARD_GRAVITY_Y_MPS2` nur in `physics/constants.ts`; `createDynamicBox` verlangt `massKg`; Fabric-Masse in `constants`; Restitution über `RIGID_DYNAMIC_RESTITUTION`; Kontakt-Friction/Restitution-Tests auf Ground/Box/Fixed-Block.
- **Grund:** Requirement „Parameter sinnvoll besetzt“ — eine g-Quelle, keine stillen Default-Massen, weniger Literale.
- **Verworfen:** CCD pro Asset abschalten (Fabric bleibt CCD an in v1).

### 2026-10-13 — Dynamic rigid damping — global constants
- **Entscheidung:** `PHYSICS_DYNAMIC_LINEAR_DAMPING` (0.4) und `PHYSICS_DYNAMIC_ANGULAR_DAMPING` (0.55) in `physics/constants.ts`; gesetzt nur in `PhysicsWorld.createDynamicRigidBody` (Block, Fabric-Plane, Rigid-Test).
- **Grund:** Alle Dynamic-Bodies gleich schnell zur Ruhe kommen; Requirements explizit; Werte erhöht gegen Rockern nach Aufprall.
- **Verworfen:** Pro-Asset-Damping oder UI-Slider in v1.

### 2026-10-13 — World physics DRY (Block + Fabric)
- **Entscheidung:** Gemeinsame Helfer in `physics-sync.ts` (`poseFromObject3D`, `setPhysicsBindingsSleeping`, `syncPhysicsBindingsToRegistry`). `WorldPhysicsSessionController` iteriert `dynamicParticipants` (`WorldPhysicsDynamicParticipant`). `PhysicsWorld.createDynamicRigidBody` für Block-Box und Fabric-Box.
- **Grund:** Weniger Copy-Paste; Cylinder später als weiterer Participant.
- **Verworfen:** Separate Adapter-Objekte in `mockup-engine`.

### 2026-10-13 — Physics cleanup — participants + Block collider API
- **Entscheidung:** `physics-participants.ts` an fixed/dynamic Block + Fabric angepasst (`spawnsDynamicBodyOnWorldStart`, `hasIdleFixedPhysicsCollider`, …). `BlockPhysicsColliders` nur noch `reconcileEntity` (kein `upsertFromRuntime` / tote Helfer). Unbenutzter `fixedAssetColliderCount` in `PhysicsWorld` entfernt.
- **Grund:** Semantik nach Block-Physik-Implementierung; weniger tote Oberfläche.
- **Verworfen:** „Jeder Block = Collision participant“.

### 2026-10-13 — Rigid props — Dichte pro Entity
- **Entscheidung:** Block/Zylinder: **`physicsDensityKgPerM3`** Default **1000**; Panel **Density** editierbar, **Weight (kg)** read-only aus Volumen × Dichte; Scene Save.
- **Grund:** Mockup-realistische Masse; User kann Material nachstellen ohne separates Gewichtsfeld.
- **Verworfen:** Nur implizite Masse ohne UI.

### 2026-10-13 — Physics body mode + Cylinder asset (Docs)
- **Entscheidung:** Rigide Props (**Block**, **Cylinder**): **`physicsBodyMode`** `fixed` | `dynamic` im **Scene-Panel** (Asset-Editor); World-**Start** aktiviert Dynamics nur für `dynamic` + Stoff. Neues Asset **`cylinder`** wie Block, **Corner radius** nur an **2 Kreiskanten** (Deckel↔Mantel).
- **Grund:** User platziert Szene, wählt pro Objekt Verhalten, dann ein Start-Button.
- **Verworfen:** Block immer Fixed ohne UI.

### 2026-10-13 — Fabric cloth — kein wavy/deformation
- **Entscheidung:** Kein prozeduraler **wavy**-Modus; kein `fabricClothParams.deformation` — Verformung nur **Rapier** (World physics).
- **Grund:** Eine Pipeline; Docs und Types vereinfacht.
- **Verworfen:** stiff/wavy/physical-Tripel.

### 2026-10-13 — Physics-Requirements — eine kurze Datei
- **Entscheidung:** Normativ nur [`requirements-physics.md`](../requirements/requirements-physics.md) (Szene bauen → Start; **1 dm³ ≈ 1 kg**; Rapier). `requirements-physics-fabric-pbd.md` nach `/_deleted`; `requirements-physics-fabric-rapier.md` nur Redirect.
- **Grund:** Weniger Docs, klares Nutzer-Ziel statt Meilenstein-Listen.
- **Verworfen:** Getrennte GPU-/Fabric-Requirement-Dateien als Pflicht-Lektüre.

### 2026-10-13 — Fabric cloth — Rapier-only nach Backup (Docs)
- **Entscheidung:** Stoff-Simulation **nur Rapier** — MVP = dynamisches Plane-Proxy; Ziel = Partikel + Spring-Impulse-Joints + Mesh-Sync. **Kein** WebGPU GPU-PBD, **kein** CPU-Verlet als Produktpfad.
- **Grund:** Backup-Stand (flaches Tuch fällt per Rapier auf Block); eine Pipeline in `PhysicsWorld.step`, weniger Sonderfälle.
- **Verworfen:** `requirements-physics-fabric-pbd.md` / GPU-Fahrplan; `FabricClothVerletSession` als Primärweg; `deformation` stiff/wavy/physical in UI.

### 2026-10-13 — Fabric cloth — Registry-Reconcile + Pose-Sync pro Step
- **Entscheidung:** `BlockPhysicsColliders.reconcileWithRegistry` / `getClothColliderEntityIds`; jeden Cloth-Step `syncAllBlockPosesFromRuntime`; Sim-Start `syncAllBlocks` + Reconcile; Verlet **1×** `FIXED_TIMESTEP`/Frame, `subSteps=1`, Blöcke vor Boden in `fixedBodyIds`.
- **Grund:** Geister-Würfel = Rapier-Body an alter Pose / verwaiste `trackedIds`; Ruckeln = bis 4×4 Substeps vs. TSL (2) `step(1/60, 10)`.
- **Verworfen:** Blindes `getTrackedEntityIds` ohne Registry; Multi-Step-Accumulator pro Frame.

### 2026-10-13 — Fabric cloth — Kollision nur Rapier-Collider
- **Entscheidung:** Tuch-Partikel via `collider.projectPoint` auf **dieselben** Fixed-Bodies wie `BlockPhysicsColliders` (roundCuboid inkl. Radius); paralleles `fabric-cloth-block-collision` entfernt.
- **Grund:** Block-Panel-Änderungen müssen 1:1 die Drapierfläche sein; kein zweites Shape-Modell.
- **Verworfen:** TS-Obstacle-Buffer / SDF-Duplikat.

### 2026-10-13 — Fabric cloth — TSL-Demo Block-SDF + Kontaktreibung
- **Entscheidung:** Block-Kollision = **rounded-box SDF** (Kanten/Corners), Margin `halfThickness + 10 mm`; Boden/Block **Verlet-Reibung** auf `prev`; PBD **Stretch/Shear/Bend** mit Stiffness 1 / 0.75 / 0.45, ~10 Iterationen, Dämpfung 0.991.
- **Grund:** Tischtuch: scharfe AABB ließ Würfelkanten durchscheinen; ohne Reibung keine Ruhe (TSL-Demo).
- **Verworfen:** Nur 2 mm Skin + Facetten-Push (gemini AABB).

### 2026-10-13 — Fabric cloth Verlet — fixed dt, Boden 1 mm, enge Block-AABB
- **Entscheidung:** Cloth-Step nur mit **`FIXED_TIMESTEP`** (Accumulator, max 3/Frame); Boden **`FABRIC_CLOTH_GROUND_CONTACT_Y_M = 0.001`**; Block-Kollision ohne Fillet-Puffer auf `halfExtents`, Margin 1 mm; Dämpfung ~0.992 wie Demo.
- **Grund:** Variables `deltaSeconds` → Zappeln; `groundY = 0.02` → sichtbare Luft über y=0-Boden; aufgeblähte Block-Box → cm-Abstand.
- **Verworfen:** Rapier-`borderRadius` im Cloth-AABB; 0.01 m Block-/Boden-Puffer.

### 2026-10-13 — Fabric cloth — CPU Verlet/PBD wie HTML-Demo, keine Rapier-Federn
- **Entscheidung:** Tuch = **`FabricClothVerletSession`** (Welt-Partikel, Distanz-Constraints, Boden + Block-AABB). Rapier bleibt für Boden/Blöcke/Rigid-Test; **keine** Spring-Joints pro Kantenpixel.
- **Grund:** Referenz-Beispiel ist PBD/Verlet, nicht Rapier-Springs; stabileres Drapieren ohne tausende Dynamic Bodies.
- **Verworfen:** Rapier Spring-Gitter (`FabricClothRapierSession`).

### 2026-10-13 — Fabric cloth — Rapier Spring-Gitter statt GPU/Deformation-Modi
- **Entscheidung:** Ein Verhalten: waagrechtes Tuch; Simulation nur **Rapier** (Partikel + Spring-Impulse-Joints, Kantenlänge aus Quality). UI/Entity **`deformation`** entfällt. GPU/Verlet/PBD-Cloth-Code entfernt.
- **Grund:** Eine Pipeline, weniger Sonderfälle; Mockup-Physik im bestehenden `PhysicsWorld.step`.
- **Verworfen:** WebGPU-PBD/Verlet als Primärpfad; stiff/wavy/physical-Tripel; Rapier-Plane-Proxy; separates GPU-Block-Collider-Array für Tuch.

### 2026-10-12 — Fabric cloth M4a — Block-Kontakt aus `blockBody`-Mesh
- **Entscheidung:** Snapshot `axisAlignedWorldVolume` = `Box3.setFromObject(blockBody)` (+ Margin); Pose `getWorldPosition/Quaternion`; nur sichtbare Blocks; Shape-Fallback für gedrehte Round-Cuboid-Pfade.
- **Grund:** Param-only AABB wich vom platzierten Asset ab („anderer Würfel“).
- **Verworfen:** Nur `entity.transform` / theoretische Maße ohne Render-Mesh.

### 2026-10-12 — Fabric cloth M4a — Block-Kollision Performance
- **Entscheidung:** Ungedrehte Blöcke → gecachtes `axisAlignedWorldVolume` + Silk-`collideCube`-Pfad (O(1)); gedrehte Blöcke → Round-Cuboid nur mit 3 mm Margin + Kollision in Constraint-Pässen nur letzter Pass; Fillet: AABB-Slab vor SDF.
- **Grund:** Round-Cuboid + 20 mm Margin auf jedem Vertex × 8 Pässe war spürbar ruckelig.
- **Verworfen:** Rapier auslesen; komplett zurück auf Entity-AABB ohne Shape/Pose.

### 2026-10-12 — Fabric cloth M4a — Block-Kontakt aus Entity-Shape, nicht Rapier
- **Entscheidung:** Cloth-Verlet-Kollision: `fabricClothBlockCollidersFromRegistry` = `blockColliderShapeFromParams` + `poseFromObject(runtime.object)`; Snapshot in `FabricClothGpuSession.spawnAll`; `resolveWorldPointAgainstBlockCollider` (Fillet + Rotation). Gemeinsam mit Rapier nur die **Shape-Definition** (`block-collider-from-runtime.ts`), **kein** Auslesen aus `PhysicsWorld`.
- **Grund:** Hot Path nutzte Silk-`collideCube`-AABB aus `entity.transform` — weder sichtbarer Block noch Rapier-Fillet/Rotate.
- **Verworfen:** Rapier-Collider-Liste als Datenquelle für GPU/Verlet (Rigid-Test-Cube, Lifecycle).

### 2026-10-12 — Fabric border — Ring-Grid DRY (stiff + physical)
- **Entscheidung:** `fabric-cloth-ring-grid.ts` — `fabricClothRingAxisCoords` + `buildFabricClothRingGridMesh`; Stiff und Sim teilen Achsen/Material-Quads; Sim ohne gleichmäßiges Voll-Grid bei Border.
- **Grund:** Nach dem Fallen uneinheitliche Bordürenbreite (Sim-Grenze wich von 2-mm-Innenkante ab).
- **Verworfen:** Dreieck-Klassifikation per Vertex-Position auf uniformem Sim-Raster.

### 2026-10-12 — Fabric border — exakte 2 mm + `borderWidthM`
- **Entscheidung:** Ring-Geometrie mit 4×4-Vertices (Innenkante = Bildmaß, Außen = +`borderWidthM`); kein `PlaneGeometry(3×3)` mit gleichen Dritteln. Parameter `borderWidthM` (Default 0,002 m), Panel Width (mm).
- **Grund:** Equal-thirds wirkte ~15 cm breit; Physical-Sim nutzte korrektes Außenmaß, Material-Rand nicht.
- **Verworfen:** Fixe 2 mm nur per Konstante (früher Diary „borderWidthMm verworfen“ — wieder aufgenommen auf User-Wunsch).

### 2026-10-12 — Fabric drape — Leather statt „Stiff cloth“
- **Entscheidung:** Built-in **`material-leather`** (Optik Leder, PBR); Physik weiter `fabricDrapePresetId: 'stiff'` (schwer/steif). `material-stiff` → Migration auf Leather.
- **Grund:** User-sichtbarer Name; steifes Mockup-Material ohne generisches „Stiff cloth“.
- **Verworfen:** Canvas als viertes Preset (Leder passt besser zu schwerem Drape-Mockup).

### 2026-10-12 — Fabric drape — Material-Preset statt Physics-Panel
- **Entscheidung:** Vier Built-ins (`material-silk` … `material-stiff`) mit `fabricDrapePresetId`; Solver via `resolveFabricDrapeForClothEntity`; Physics-Panel Drape-Dropdown entfernt; `physicsOverride` am Entity entfällt; `material-fabric` → Cotton.
- **Grund:** User wählt Stoff wie Optik — eine Dropdown am Asset; weniger globale Settings.
- **Verworfen:** Globales `physicsSettings.fabricDrapePreset`.

### 2026-10-12 — Fabric cloth — Silk-HTML Verlet reference solver
- **Entscheidung:** `physical` CPU-Pfad = Port von `interactive_silk_cloth_simulation.html`: Verlet + prevPos, 10 Substeps, 8 Constraint-Pässe, Stiffness 0,75, nur Stretch+Shear (keine Bend-Pairs), `collideCube`-AABB + Boden, Damping `pow(0.989, subDt*600)`.
- **Grund:** User-Referenz für draping; alter Euler+PBD/Bend wich stark ab (Gelee, Zappeln).
- **Verworfen:** Bend-Pairs im Hot Path; separater GPU-PBD-Pfad für MVP-Drape.

### 2026-10-12 — Fabric PBD — Damping, Block-AABB, Constraint-Passes
- **Entscheidung:** `effectiveVelocityDamping`: Panel=1 → Preset ζ; Block-Kollision = volles AABB (Push-out + Top), Kollision **in** jedem Constraint-Pass; 2 Substeps × 6 interleaved Stretch/Shear/Bend; Silk ζ≈0,985.
- **Grund:** Zappeln/Schrumpfen (kein Preset-Damping bei global 1); Glitch in Würfel (nur Top bei XZ, keine Seiten); Referenz-HTML: Kollision während Constraint-Relaxation.
- **Verworfen:** `Math.max` für ζ bei Multiplikatoren (wirkte wie „aus“).

### 2026-10-12 — Fabric PBD — Welt↔Mesh-Matrix + stabiler CPU-Solver
- **Entscheidung:** Sim nutzt `clothMesh.matrixWorld` (nicht Entity-Root); bei Physics-Start `rotation.x = 0` (Sim-Grid = XZ, Y = Fall); keine Boden-Clamps mitten in Distance-Constraints; skip-2 out-of-plane vorerst aus; Velocity-Cap + weichere Constraint-Stärke.
- **Grund:** Zickzack/„Explosion“ — Schwerkraft in Welt-Y, aber Plane −90° + falsche Matrix koppelten Deformation falsch; skip-2-Constraints destabilisierten bei 3D-Drape.
- **Verworfen:** Out-of-plane skip-2 im Hot Path bis dihedral/XPBD.

### 2026-10-12 — Fabric cloth — CPU PBD hot path + Default `physical`
- **Entscheidung:** `FabricClothGpuClothSim.step` = Welt-PBD nur CPU (integrate, stretch/shear/bend + skip-2 out-of-plane, Block-Top-AABB + Boden); Default-Szene `fabricClothDeformation: 'physical'`, Start-Y ~0,32 m; Default-Drape-Preset **silk**.
- **Grund:** „Steif auf Würfel“ war oft **`stiff`** (Rapier-Platte fällt als Ganzes) + GPU-Constraint-Blend wirkungslos; CPU-Pfad liefert sichtbare Deformation ohne Readback-Risiko.
- **Verworfen:** Default-Szene ohne `deformation`-Override (blieb `stiff`).

### 2026-10-12 — Fabric PBD M3 — Hybrid integrate GPU + CPU constraints
- **Entscheidung:** Nach `computeAsync(integrate)` GPU→CPU Readback (pos/vel); Stretch/Shear/Bend auf CPU mit `constraintStrengthFromK` (Preset-k, nicht XPBD-Compliance); Upload zurück. GPU-Jacobi-Passes deaktiviert im Hot Path (Blend war ~0).
- **Grund:** Keine sichtbaren Falten — `complianceToDeltaBlend` aus riesiger Compliance wirkungslos; CPU-Array ohne Readback stale.
- **Verworfen:** Nur GPU-Jacobi ohne Readback pro Substep.

### 2026-10-12 — Fabric PBD M3 — GPU Jacobi constraints + skip-pair bend
- **Entscheidung:** Stretch/Shear/Bend als TSL-Compute (edge-dispatch, `atomicAdd` auf `posDelta`, apply + ground pass); Bending = **skip-pair hinge** aus `bendPairs`; Drape → `compliancesFromDrapeParams`; Mesh-Sync ein `getArrayBufferAsync`/Frame.
- **Grund:** M3 Roadmap; CPU-PBD nur noch Tests (`solveDistanceConstraints`).
- **Verworfen:** Dihedral 4-vertex bend in M3; Gauss-Seidel edge coloring (Jacobi + atomics stattdessen).

### 2026-10-12 — Fabric PBD — Primärpfad WebGPU; Docs Stand M2
- **Entscheidung:** `physical` bleibt **WebGPU-PBD** (M3 Bend, M4 Block-Kontakt aus Rapier-Collider-Daten). **Kein** Rapier SoftBody/SpringJoint-Cloth. Requirements/Roadmap: „flach auf Block“ = M2-Limit (kein Block in GPU, kein Bending).
- **Grund:** Mockup-Ziel Tischtuch; Rapier nur für rigide Welt; M2 bewiesen Compute+Sync.
- **Verworfen:** Rapier-Cloth als Ersatz für GPU-PBD (Diskussion 2026-10-12).

### 2026-10-12 — Fabric PBD M2 — GPU integrate + world-space ground
- **Entscheidung:** WebGPU `ComputeNode` (TSL) integriert `worldPos`/`worldVel`; Boden `max(y,0)` in Welt; `getArrayBufferAsync` → lokales `position`-Attribut; fixed timestep in Session; nur Hauptbahn-Mesh subdividiert.
- **Grund:** M2-Spike laut Roadmap; Entity-Foot/Rotation über matrixWorld.
- **Verworfen:** Deep-import ComputeNode langfristig — vorerst `three/src/nodes/gpgpu/ComputeNode.js` als Typ.

### 2026-10-12 — Fabric PBD M1 — Sim-Mesh, GpuSession shell, Plane nur stiff
- **Entscheidung:** `FabricClothSimMesh` CPU-Builder; `FabricClothGpuSession` an World-Session; Rapier-Plane nur `deformation: 'stiff'`; `physical` → GpuSession (step leer bis M2). Drape/Quality in `physics-settings` + `fabric-cloth-drape-presets.ts`.
- **Grund:** Fahrplan M1 — Daten/Teilnehmer trennen vor WebGPU-Spike.
- **Verworfen:** Plane für alle Stoffe parallel zu GPU.

### 2026-10-12 — Fabric cloth GPU — Sim-State / Bake ohne SAB
- **Entscheidung:** **Freeze** = GPU-Compute pause, Buffer behalten; **Bake** = expliziter async GPU→CPU Readback ins Mesh; zwei Schichten `SimState` vs `BakedMesh`. **Kein** SharedArrayBuffer / COOP-COEP für Cloth v3.
- **Grund:** SAB hilft Worker/Parallelität, nicht Freeze; Bake-Kosten liegen am GPU-Readback, nicht am CPU-Sharing.
- **Verworfen:** World-Freeze als Vertex-Bake; SAB „von Anfang an“ für Export.

### 2026-10-12 — Fabric cloth — World physics: Rapier plane proxy
- **Entscheidung:** Beim World-Physics-**Start** jedes `fabric-cloth` → **dynamischer** dünner Cuboid (Plane-Proxy, ~0,2 kg, Foot-Pivot); Pose-Sync Rapier → Entity; **Reset** entfernt Bodies; **Freeze** = `sleep`.
- **Grund:** Schnell Kollision/Masse testen, bevor GPU-PBD für `physical` da ist.
- **Verworfen:** Softbody in Rapier; nur `physical`-Cloths mit Dynamic (vorerst alle Stoffe gleich).

### 2026-10-12 — Block — Default-Maße 0,3 m Würfel
- **Entscheidung:** `defaultBlockParams`: **0,3 × 0,3 × 0,3 m** (statt 1 m); `cornerRadiusMm` unverändert **5**.
- **Grund:** Neuer Block soll Stilleben-Prop-Größe sein, nicht metergroßer Platzhalter.
- **Verworfen:** 1×1×1 m als Spawn-Default.

### 2026-10-12 — Fabric cloth — Material-Dropdown statt Matt/Glossy
- **Entscheidung:** Stoffbahn: **gesamte** Materials-Bibliothek (`fabricClothMaterialId`), **kein** `ImageSurfaceFields`; Bild = Albedo, Preset nur **Struktur** (Roughness, procedural, …) — **keine** Material-Farbe/Tint auf der Bahn.
- **Grund:** Stoffmockup = Motiv + Stoffcharakter (Seide, Leinen, …), nicht Print-Finish.
- **Verworfen:** Matt/Glossy wie Picture; Preset-`color` auf bildtragender Fläche.

### 2026-10-12 — Fabric cloth — Default waagrecht auf Boden
- **Entscheidung:** `fabric-cloth` wird **horizontal** platziert (Ebene **XZ**, Oberseite **+Y**, Flatlay); Default-Spawn **flach auf Ground** — Abweichung von senkrechten bildtragenden Planes (Print, Picture, …). Mesh in XZ gebaut, nicht aufrecht + Dauer-Rotation.
- **Grund:** Ausgelegtes Tuch / Draufsicht-Mockups.
- **Verworfen:** Gleiche Default-Orientierung wie Print-Front (senkrecht).

### 2026-10-12 — Fabric cloth — Border 2 mm außen, flach
- **Entscheidung:** Optionale **Bordüre** fest **2 mm** breit, **flach** in der Bahn-Ebene, **außen** rund um die Bildfläche; Panel **Enable** + **Color** (`ColorPicker`, Colors-Bibliothek); Panel-Maße = Motiv ohne Border.
- **Grund:** Einfaches Mockup (Saum/Bindung), keine extrudierte Paspel, keine mm-Slider in v1.
- **Verworfen:** Rand **innen** auf dem Motiv; erhabene Extrusion. *(User-`borderWidthM` später ergänzt — s. Eintrag Ring-Grid.)*

### 2026-10-11 — Große Module — Store/Engine Aufräumen (ohne Verhalten)
- **Entscheidung:** [`app-store-internals.ts`](../../src/ui/store/app-store-internals.ts) + Domain-Slices (`app-store-*`); [`app-store.ts`](../../src/ui/store/app-store.ts) Barrel/`setSceneApi`. Engine: [`asset-system-rebuild.ts`](../../src/engine/asset-system-rebuild.ts), [`mockup-engine-capture.ts`](../../src/engine/mockup-engine-capture.ts). Section-Kommentare in `entity-registry` / `asset-kind-registry`.
- **Grund:** Audit „Große Dateien“ — Lesbarkeit; öffentliche Imports bleiben `@/ui/store/app-store`.
- **Verworfen:** Generisches `setAssetParams` im Store (Save v2).

### 2026-10-11 — Produktname Mockup Studio 3D, Version 0.0.1
- **Entscheidung:** Anzeigename **Mockup Studio 3D**; npm-Paket `mockup-studio-3d`; Version **0.0.1**. Zentrale Konstanten in [`app-meta.ts`](../../src/app-meta.ts) (Name + `version` aus `package.json`); UI: Top-Bar-Titel, Status-Bar, `document.title`.
- **Grund:** Umbenennung von „Mockup Studio Light“; frühe 0.0.x-Versionierung.
- **Verworfen:** Weiterer Name „Light“; Version 0.1.0 beibehalten.

### 2026-10-11 — UI-Ordner shell + panels (§3.4)
- **Entscheidung:** `src/ui/demo/` aufgeteilt in [`src/ui/shell/`](../../src/ui/shell/) (Chrome, Main/Sub-Router, [`shell-nav.ts`](../../src/ui/shell/shell-nav.ts), `viewport-tools`) und [`src/ui/panels/`](../../src/ui/panels/) (Library/Sub-Panels, `entity-fields`, shared Fields). Nav-Typen: `ShellNavItem`, `LEFT_SHELL_NAV` / `RIGHT_SHELL_NAV`.
- **Grund:** Produktive Shell — Name `demo/` war irreführend; Audit §3.4, explizite User-Freigabe.
- **Verworfen:** Ein Ordner nur `panels/`; Umbenennung 2026-10-08 (damals verworfen, jetzt bewusst nachgezogen).

### 2026-10-11 — Scene-API-Facade entschlacken (§1.3)
- **Entscheidung:** [`scene-api.ts`](../../src/scene/scene-api.ts) ohne Asset-Re-exports; [`asset-ui-helpers.ts`](../../src/scene/asset-ui-helpers.ts) + [`asset-kind-predicates.ts`](../../src/scene/asset-kind-predicates.ts); Entity-Fields direkt aus Domänenmodulen; Store: `mergeLightingSettings` / `migrateMaterialId` / `cloneAtmosphereSnapshot` aus Fachmodulen.
- **Grund:** Neue Kinds ohne Barrel-Aufblähung; Mutationen bleiben `SceneApi` + Store.
- **Verworfen:** `scene-api-types.ts` Split in diesem Schritt.

### 2026-10-11 — PNG export alpha — Canvas + SMAA bypass
- **Entscheidung:** WebGPU-Renderer `alpha: true`; Composite-RT `RGBAFormat`; bei `transparentBackground` SMAA überspringen (`pipelineDirect`), Canvas vor Output mit Alpha-0 clearen.
- **Grund:** `toBlob` PNG hatte opaken Schwarz — SMAA und `alpha: false` zerstörten/leerten den Alpha-Kanal.
- **Verworfen:** Separater Export-Render-Pfad; dauerhaft SMAA aus.

### 2026-10-11 — Export — Ground contact shadows (GroundMaterial catcher)
- **Entscheidung:** `exportGroundSurface` (`viewport` | `contact-shadows-only`); [`GroundMaterial.setExportShadowCatcherActive`](../../src/materials/groundMaterial.ts) — gleicher Shader-Output, Alpha aus `1 − min(shaded/albedo)`; Mirror off beim Capture; kein Material-Swap.
- **Grund:** Multi-Light-Schatten wie Viewport; `ShadowMaterial` war zu dunkel und einheitlich.
- **Verworfen:** `ShadowMaterial`-Swap; separater Shadow-Only-Pass.

### 2026-10-11 — Export — Right Panel Format + PNG transparent / JPG
- **Entscheidung:** [`requirements-export.md`](../requirements/requirements-export.md); Store `exportImageFormat`; Scene-API `captureViewportImage`; Capture ohne Sky-Pass + `setClearColor(0,0)` bei PNG transparent; Top-Bar `exportViewportImage()`; `ExportSubPanel` + Nav-Eintrag rechts.
- **Grund:** Mockup-Workflow (Cutout vs. volles JPG); eine Viewport-Pipeline (WYSIWYG JPG / sky-only transparent PNG).
- **Verworfen:** Separater Export-Render-Pfad; opakes PNG als dritte Option.

### 2026-10-11 — Asset-Kind-Registry Phase 3f — geometryParts
- **Entscheidung:** `geometryParts` auf [`AssetKindDefinition`](../../src/scene/asset-kind-registry.ts); Katalog [`geometry-parts-catalog.ts`](../../src/scene/geometry-parts-catalog.ts); Sichtbarkeits-Defaults aus [`geometryVisibilityFromPartDescriptors`](../../src/scene/geometry-parts.ts); UI [`GeometryPartsSection`](../../src/ui/panels/GeometryPartsSection.tsx) für Picture/Handheld/Monitor/Wine/Beverage/Tin.
- **Grund:** Audit Registry v1.5 — eine Quelle für Teile/Labels/Slots statt duplizierter Entity-Fields; Material-IDs aus `getDefaultMaterials()` in der Section (Vorbereitung Material-Resolver Phase 4).
- **Verworfen:** Generisches Param-Form; neue `AssetGeometryPart`-Union-Typen.

### 2026-10-11 — Audit Quick Wins — Lathe-Common, MockupEngine async, `@/`-Imports
- **Entscheidung:** [`lathe-asset-common.ts`](../../src/engine/lathe-asset-common.ts) (`LATHE_SEAM_PHI_START`, `applyLatheGeometryFootToY0`) für Beverage/Tin/Wine; [`mockup-engine.ts`](../../src/engine/mockup-engine.ts) `applyAssetMutation` (async/await, optional `refreshGizmo`); alle Cross-Module-Imports unter `src/**` auf `@/`; ESLint `no-restricted-imports` für tiefe `../`-Pfade.
- **Grund:** `improve-vereinheitlichen.md` Backlog §2.2 / §3.3 / §4.3 — Lesbarkeit ohne Save-Break; Tin-Fuß-Pivot und `disposeAssetGroup`/`shadow-setup` bewusst domänenspezifisch bzw. schon zentral.
- **Verworfen:** `invalidateViewport` in Asset-Mutationen nachziehen (bisher nur `emit()`); Entity-`assetParams`-Union (Save v2).

### 2026-10-11 — Wine bottle — Offset-Lathe Innen-Mantel (Spike, nicht aktiviert)
- **Entscheidung:** Spike in [`wine-bottle-glass.ts`](../../src/engine/wine-bottle-glass.ts): `offsetLatheProfileForInnerMantle` (Fuß-Punt trim ≥ 1,5 mm Innenradius), zweiter Lathe + `scale(-1,1,1)`, Merge mit Außen-Mantel + Stirn; Schalter `WINE_BOTTLE_GLASS_INNER_MANTLE` + `buildOptions.innerMantle` — **Default `false`**.
- **Grund:** A/B (Bordeaux/Alsace/Sparkling, gleiche Szene): kein klarer Gewinn bei Transmission/Schatten; ~+1× Mantel-Triangles, Boden weiter über Stirn-Ring. Geometrie + Tests bleiben für späteres Re-Enable.
- **Verworfen:** Default on; Aesop-Duplikat (gleiche Geometrie BackSide/FrontSide); Innen-Lathe bis zur Punt-Spitze (Lathe-Pol degeneriert).

### 2026-10-11 — Wine bottle — grüne Env-Specular (`specularColor`)
- **Entscheidung:** Preset **`material-glass-wine-bottle`**: **`specularColor`** = aufgehelltes Flaschengrün (×2,25 vs. `attenuationColor` #176132); `attenuationColor` / `attenuationDistance` unverändert für Transmission.
- **Grund:** HDR/Sky-Glanzflecken auf dem Glas nutzen Three.js **F0/specularColor** — Default weiß wirkte neutral statt grünlich.
- **Verworfen:** FrontSide + gedämpftes `envMapIntensity` gegen Phantom-Innenreflexionen (anderes Problem).

### 2026-10-11 — Asset-Kind-Registry Phase 3e — app-store asset params
- **Entscheidung:** [`app-store-asset-params.ts`](../../src/ui/store/app-store-asset-params.ts) — neun typisierte Param-Setter + `setWallpaperPattern`; optimistischer `state.entities`-Patch via `mergeKindParamPatch` / `mergeKindWallpaperPatternPatch`, danach Scene-API. Re-Export aus [`app-store.ts`](../../src/ui/store/app-store.ts).
- **Grund:** Requirements Phase 3e — Gruppierung + snappere UI vor Engine-Subscribe; Registry v1 Phasen abgeschlossen.
- **Verworfen:** Öffentliches `setAssetParams` im Store.

### 2026-10-11 — Asset-Kind-Registry Phase 3d — visibility defaults + sizing predicates
- **Entscheidung:** [`geometry-visibility-defaults.ts`](../../src/scene/geometry-visibility-defaults.ts) als Single Source; Registry + `defaultGeometryVisibility` delegieren dorthin (kein Import-Zyklus). `asset-sizing`: `usesHeightReference` / `assetTransformUsesFootPivot` über `usesAsyncPackagingRebuild` + `getAssetKindFamily`.
- **Grund:** Requirements Phase 3d — schrittweise Registry-Metadaten ohne `computeFaceSize` Big-Bang.
- **Verworfen:** `defaultGeometryVisibility` direkt aus Registry in UI/Engine.

### 2026-10-11 — Asset-Kind-Registry Phase 3c — asset-system
- **Entscheidung:** [`asset-system.ts`](../../src/engine/asset-system.ts) — `usesAsyncPackagingRebuild` für Spawn/Rebuild; `rebuildPackagingAsset` Dispatcher; Materials/Visibility-Defaults über `getAssetKindDefinition` in allen `rebuild*`-Helfern.
- **Grund:** Requirements Phase 3c — `rebuildStrategy` statt dreifacher `isBeverageCan`/`isTin`/`isWine`-Ketten.
- **Verworfen:** Family-basierter `rebuildEntity` für alle sync-Kinds in 3c.

### 2026-10-11 — Asset-Kind-Registry Phase 3b — entity-registry
- **Entscheidung:** [`entity-registry.ts`](../../src/engine/entity-registry.ts) — `addEntity` nutzt `getAssetKindDefinition` (Materials, Visibility, `getDefaultEntitySlice`); alle `set*Params` / `setWallpaperPattern` via `mergeKindParamPatch` / `mergeKindWallpaperPatternPatch`.
- **Grund:** Requirements Phase 3b — eine Merge-/Default-Quelle; öffentliche Scene-API unverändert.
- **Verworfen:** `getEntities()`-Clone in 3b auf Registry umstellen.

### 2026-10-11 — Asset-Kind-Registry Phase 3a — Modul ohne Caller
- **Entscheidung:** [`src/scene/asset-kind-registry.ts`](../../src/scene/asset-kind-registry.ts) mit `getAssetKindDefinition`, Delegation an `asset-*` / `material-presets` / `geometry-visibility`; exhaustiver Test co-located.
- **Grund:** Requirements Phase 3a — Tabelle + Hooks für 3b (`entity-registry`) ohne Verhaltensänderung.
- **Verworfen:** `entity-registry` / `asset-system` in 3a anbinden.

### 2026-10-11 — Asset-Kind-Registry v1 — Docs first (Option B)
- **Entscheidung:** Registry v1 dokumentiert in [`requirements-asset-kind-registry.md`](../requirements/requirements-asset-kind-registry.md) — zentraler Katalog pro `AssetKind`, **ohne** Änderung an `AssetEntity`-Feldern bis Scene Save v2.
- **Grund:** Audit Phase 3 / [`improve-vereinheitlichen.md`](../../improve-vereinheitlichen.md); Refactor ohne Serialisierungs-Risiko; Implementierung in Phasen 3a–3e nach Freigabe.
- **Verworfen:** Entity-Union (`assetParams`) jetzt; öffentliches generisches `setAssetParams` in Scene-API in v1.

### 2026-10-11 — Vereinheitlichung Phase 2 — asset-meshes + entity-fields
- **Entscheidung:** Engine: [`src/engine/asset-meshes/`](../../src/engine/asset-meshes/) (Module statt Monolith); Beverage/Tin-Label-Setup in [`cylindrical-can-populate.ts`](../../src/engine/cylindrical-can-populate.ts). UI: Kind-Panels unter [`src/ui/panels/entity-fields/`](../../src/ui/panels/entity-fields/), Router bleibt [`EntityPropertyFields.tsx`](../../src/ui/panels/EntityPropertyFields.tsx).
- **Grund:** Audit Phase 2 — Wartbarkeit ohne Verhaltensänderung; öffentliche Imports (`asset-system` → `./asset-meshes`) unverändert.
- **Verworfen:** Ein PR nur Engine — User wollte UI-Split im selben PR.

### 2026-10-11 — Shared units — clamp, mm, deg/rad
- **Entscheidung:** `clamp` in [`src/units/math.ts`](../../src/units/math.ts); `MM_TO_M` / `mmToM` / `mToMm` in [`src/units/length.ts`](../../src/units/length.ts); `DEG_TO_RAD` / `degToRad` in [`src/units/angle.ts`](../../src/units/angle.ts). Scene/Engine/UI importieren statt lokaler Kopien.
- **Grund:** Audit Phase 1 — eine Quelle, `requirements-code.md` (keine verstreuten Magic Numbers / Duplikat-Helfer).
- **Verworfen:** `clamp` nur im RangeSlider belassen; `MM_TO_M` in jeder `asset-*.ts`.

### 2026-10-11 — Wine bottle — ein Profil für Glas + Radius-Sampling
- **Entscheidung:** `buildWineBottleMeshes` — einmal `prepareWineBottleGlassLatheProfile`; Glas via `buildWineBottleGlassMeshFromLatheProfile`; Label/Folie/Disc `sampleWineBottleRadiusAtY(latheProfile, y)`.
- **Grund:** Mantel-Radius soll dieselbe offene Polyline wie `LatheGeometry` nutzen, nicht normalize-only inkl. `Z`-Duplikat.
- **Verworfen:** `openWall` direkt für Sampling.

### 2026-10-11 — Wine bottle — Transmission-Faktor in Asset-Scene
- **Entscheidung:** `WINE_BOTTLE_GLASS_TRANSMISSION_MESH_DEPTH_FACTOR` in [`asset-wine-bottle.ts`](../../src/scene/asset-wine-bottle.ts); [`wine-bottle-glass.ts`](../../src/engine/wine-bottle-glass.ts) nur Geometrie.
- **Grund:** Shader-Dicke hängt an Entity-`wallThicknessM`, nicht an Lathe-Code.
- **Verworfen:** Konstante im Glas-Engine-Modul.

### 2026-10-11 — Wine bottle — Glas-Geometrie (Außen-Mantel + Stirn)
- **Entscheidung:** `bottle-*-open.svg` = **Außen-Silhouette** mit `Z`. `prepareWineBottleGlassLatheProfile` (Dedupe, `x ≥ 0`, `pop` bei Schließ-Duplikat) → **`trimLatheProfileToAscendingOuterMantle`** (Slice bis globalem `maxY`) → `LatheGeometry` (`phiStart = π`, 64) → **`weldLathePhiSeam`** → zwei **`RingGeometry`**-Stirnflächen (`resolveWineBottleStirnRadiiAtY` / `wallThicknessM`) → **`mergeGeometries`**, Fuß-Pivot. Beauty Transmission `DoubleSide`; Depth `FrontSide`.
- **Grund:** Abwärts-`Z`-Ast nach dem Mund erzeugte beim Lathe eine Scheibe durchs Volumen; monotones Y-Filter zerstörte Schulter/Hals; geschlossener Wandring-Lathe und Punt-Naht/Revolve waren instabil.
- **Verworfen:** Geschlossener SVG-Wandring als eine Lathe; `closeOpenWallProfileAtPuntSeam`; monoton steigendes Y; `prepareClosedGlassLatheProfile` / Foot-Trim / `buildClosedWallRevolveGeometry`; Winding-Module; Profil `push(first)`; reine Außen-Shell ohne Stirnringe.

### 2026-10-11 — Wine bottle — Glas v1.1 Transmission-Feintuning
- **Entscheidung:** `meshDepthM` beim Resolve = **`wallThicknessM × 0,4`** (`wineBottleTransmissionMeshDepthM`); Preset **`attenuationColor` #176132**, **`attenuationDistance` 0,015 m**; `customDepthMaterial` **FrontSide**.
- **Grund:** Hohlschale + `DoubleSide` stapelt Screen-Space-Transmission; echte 2,5 mm pro Hit wirken wie 5–10 mm + Mehrfachbrechung.
- **Verworfen:** Geometrie-Wandstärke im Shader belassen; `attenuationDistance: Infinity` für Flaschengrün.

### 2026-10-11 — Wine bottle — Glas nur `wine-bottle-glass.ts`
- **Entscheidung:** Ein Modul **`wine-bottle-glass.ts`** (Profil + Mesh); `wine-bottle-svg-profile.ts` nur SVG/Radius; Diagnostics/Lathe-QA nach `_deleted/`.
- **Grund:** User — „ganz einfachen normalen Code“; eine Datei zum Lesen.
- **Verworfen:** Glas-Logik verteilt über Profile/Diagnostics/Geometry.

### 2026-10-10 — Handheld/Monitor-Rahmen — Mesh-Tuning zurückgenommen
- **Entscheidung:** **Zurück** zu Solid + `createScreenOpeningCutterGeometry` (CSG). Sichtbarer Rahmen: **12** `curveSegments`, **3** `bevelSegments` (wie vorher). CSG-Cutter/Recesses: **6** `curveSegments` (unsichtbar, schnellere Booleans). `createHandheldFrameRingGeometry` bleibt im Code, **nicht** im Rebuild-Pfad.
- **Grund:** Ring-Extrude + hohe Tessellation (36/10) — **kein** sichtbarer Gewinn, **extrem** langsamer Load/Rebuild (schwere CSG-Basis-Meshes).
- **Verworfen:** Hohe globale Segmentzahl; Ring-Extrude als Default (Diary-Eintrag „Tessellation + Ring-Extrude“ obsolet).

### 2026-10-10 — Handheld/Monitor-Rahmen — Tessellation + Ring-Extrude
- **Entscheidung:** Engine-Konstanten `HANDHELD_CURVE_SEGMENTS` (36) und `HANDHELD_BEVEL_SEGMENTS` (10) für alle abgerundeten Device-Konturen (Extrude, Screen-Plane, Monitor-Stand). Bezel = **`createHandheldFrameRingGeometry`** (Shape + Loch, konzentrische `absarc`-Konturen) statt Solid + CSG Screen-Cutter; CSG nur noch Recesses + Seitentasten.
- **Grund:** Default Three.js (12 / bevel 3) wirkte facettiert; CSG-Schnitt innen am Bezel unsauber. Ring-Extrude = saubere Innenkante, weniger Boolean-Flächen.
- **Verworfen:** User-UI für Segmentzahl; Screen-Opening weiter per CSG (ersetzt durch Ring). **→ zurückgenommen, s. Eintrag oben.**

### 2026-10-10 — Zylindrisches Label-UV (Dose + Blechdose)
- **Entscheidung:** Gemeinsame `cylindricalLabelUv` (`src/engine/cylindrical-label-uv.ts`): **U = 0,5** an **+Z** (Spec), Naht **−Z**, danach **U → 1 − U** — flaches Artwork auf Außenmantel nicht spiegelverkehrt.
- **Grund:** Alte Formel legte Front bei **U = 0,25**; User-Feedback spiegelverkehrtes Label an beiden Dosen.
- **Verworfen:** Nur Shader-Flip ohne Zentrumskorrektur; getrennte UV-Logik pro Asset.

### 2026-10-10 — Weinflasche — Etikett-Alpha vs. Dosen-Label
- **Entscheidung:** Flaschen-Label-Material = **`createImagePbrMaterial`** (Alpha-Blend, Glas dahinter). **Beverage can / tin can** bleiben bei **`createCanLabelMaterial`** (opaque + Metall-Underlay im Shader).
- **Grund:** Requirements Teiletikett PNG → Glas; Dosen-Underlay wirkte als weißes/deckendes Feld; Körper der Dose darf nicht „durchscheinen“.
- **Verworfen:** Ein Materialpfad für alle Mantel-Labels.

### 2026-10-10 — Image-Surfaces — PNG-Alpha im Viewport
- **Entscheidung:** Zentrale Hilfe `image-surface-alpha.ts`: **Planes** (`createImagePbrMaterial`, Wallpaper) → `transparent` + `opacityNode` aus Textur-Alpha; **Can/Tin-Label** → opaque `mix(underlay, rgb, coverage × alpha)`. Dateiname-Heuristik + `texture.userData.imageName` vom Loader; `ImageMeta.name` im Resolver.
- **Grund:** Transparente PNG-Pixel hatten oft RGB=0 → schwarzes Rechteck; Requirements RGBA; Dosenwände bleiben (kein Transparent-Pass am Label-Körper).
- **Verworfen:** Canvas-Scan pro Bild; globales `renderer alpha: true`.

### 2026-10-10 — Image surface emissive — nur Intensity
- **Entscheidung:** `emissiveEnabled` aus Schema/UI entfernt; Emissive nur über **`emissiveIntensity`** (0–1, `RangeSlider` + Input). Engine: `emissiveNode` nur bei `intensity > 0`. Legacy-Saves: `emissiveEnabled === false` → Intensity 0 beim Resolve; Persistenz strippt Legacy-Key bei `setImageSurface`.
- **Grund:** Vorbereitung Bild-Stack (§10); eine Steuerung statt Checkbox + Slider.
- **Verworfen:** Checkbox „Emissive an/aus“.

### 2026-10-10 — Bild-Stack — Passepartout + transparentes Image (Plan)
- **Entscheidung (Übergangsdoc):** Passepartout **optional** (Sichtbarkeit), mit **Material + Farbe + Offset**; **Image-Layer** immer mit **Alpha**, **Material** statt Matt/Glossy, **Emissive** nur Slider (Default 0, keine Checkbox). Label Dose/Flasche: **Underlay-RGB im Shader entfällt** — Durchsicht zum Body/Passepartout.
- **Grund:** Transparenz ≠ Asset-„keine Farbe“; schließt Material-Kopie-Modell (§2) mit Image-Surfaces.
- **Docs:** `transition-material-profile-and-entity-albedo.md` §10 — normative Requirements folgen.

### 2026-10-10 — Material-Default-Farbe + Albedo-Kopie am Asset
- **Entscheidung:** **`color` bleibt am MaterialPreset** (Bibliothek, User editierbar) = Default für **neue** Zuweisungen; **Render** nutzt **`albedoColor` am Entity-Slot** (Kopie bei Spawn/Materialwechsel). Preset-Farbe ändern betrifft **nicht** bestehende Objekte.
- **Grund:** Einfacheres UX als Preset ohne Farbe; trennt „Werkstatt-Default“ von „dieses Objekt in der Szene“.
- **Verworfen:** Preset ohne `color` + separate Built-in-Tabelle nur für Defaults.
- **Weiterhin:** `tint` nur transmission; Ground Welle 1 ausgenommen; kein `useAlbedoColor` in v1; Fabric bilddominiert → Slot neutral (1,1,1) bei Assign.
- **Docs:** `transition-material-profile-and-entity-albedo.md`.

### 2026-10-10 — Material-Profil / Asset-Albedo — Schritt-1-Entscheidungen (teilweise obsolet)
- Siehe Eintrag **Material-Default-Farbe + Albedo-Kopie** (Preset-`color` bleibt).

### 2026-10-10 — Datenmodell — kein deprecated
- **Entscheidung:** Schema- und API-Wechsel **ohne** deprecated-Felder — nie parallel „alt aber ignoriert“ im Zielmodell; alte Saves **einmal** beim Load migrieren, danach nur neues Format.
- **Grund:** Klarheit in Types/Saves; kein Doppelpflege (Material-`color` vs. Asset-Albedo).
- **Verworfen:** `color` am MaterialPreset als deprecated behalten; dauerhaft ignorierte Legacy-Keys im gespeicherten JSON.
- **Docs:** `_docs/planning/transition-material-profile-and-entity-albedo.md`.

### 2026-10-10 — Fabric cloth — Asset-Scope & Physik-Roadmap
- **Entscheidung:** Neues Asset **`fabric-cloth`** (UI **Fabric cloth**); v1 = steife Plane, Bild **DoubleSide** (vorne+hinten), optional **Border** (Breite/Dicke/Farbe); Referenzbreite **45 cm**, Platzhalter quadratisch; Ausbaustufen **wavy** (prozedural) dann **physical**.
- **Grund:** Allgemeines Textilstück, nicht nur Seide; Bild-Ratio-Regel wie andere bildtragende Assets; Physik erst Stufe 3 — Rapier SIMD bleibt sinnvoll für grobe Bodies, feine Falten **primär WebGPU Compute (PBD)**.
- **Verworfen:** „Silk scarf“ als `assetKind`; v1 ohne Border; Rapier-Softbody als alleiniger High-Res-Cloth-Pfad.
- **Docs:** `requirements-assets-fabric-cloth.md`, Verweise in `requirements-assets.md` + Index.

### 2026-10-10 — Lighting — emissive fixture discs (prototype)
- **Entscheidung:** Key/Fill je eine **emissive Circle-Disc** am `SpotLightRig` (`light-fixture-disc.ts`), Konstanten-Radius, Hybrid mit unveränderten **Spots** (Schatten + direktes Licht).
- **Grund:** Punkt-Specular in Reflexionen wirkt CG; Discs liefern runde Flächenreflexe in Viewport, Planar Mirror und auf glänzenden Meshes ohne RectArea/HDRI.
- **Verworfen:** v0 RectAreaLight oder Spot abschalten — erst nach visuellem Check; keine UI/Settings in diesem Schritt.

### 2026-10-10 — Ground — procedural planar-meters
- **Entscheidung:** `surfaceRole: 'ground'` → `resolveProceduralSamplingSpace` liefert **`planar-meters`** für Wood/Metall (Paper war schon planar); Rahmen bleibt **`uv`** (Perimeter in m). `tileScale` = repeats/m überall dort, wo Meter-Koordinaten gelten.
- **Grund:** Ground-Plane UV 0–1 über 5 km → Wood Soft nur große unscharfe Bänder; User: Muster überall gleich groß.
- **Verworfen:** UV-Tiling auf der 5-km-Plane belassen; ad-hoc Ground-`tileScale`-Multiplier.
- **Docs:** `requirements-ground.md` (Procedural tiling), `requirements-materials.md` (Sampling-Räume), Environment-Ground-Verweis aktualisiert; manuell bestätigt (Wood Soft am Boden).

### 2026-10-09 — Viewport — ViewportInvalidation Hub
- **Entscheidung:** `ViewportInvalidation` vor `ViewportRenderScheduler`; Store-`notifySceneApiListeners` getrennt von `invalidateViewport`; `commitVisualState` für Selection/Mode/Atmosphere; Asset + PMREM async über dieselbe Invalidation.
- **Grund:** Ad-hoc `requestRender`/`emit` — Gizmos/Sliders sichtbar erst nach Interaktion; fehlende Invalidierung bei `setMode` und Environment/Lighting.
- **Verworfen:** Registry-Änderungen weiter automatisch rendern (Doppel-Frames, falsche Reihenfolge vor Gizmo).

### 2026-10-09 — Tin can — Open-Mantle + radial Beads
- **Entscheidung:** `tin-can` = parametrischer Zylindermantel (`buildOpenMantleGeometry` + `tinCanOuterRadiusAtY`, 10/80/10 Bead-Zone), Label-Mantel mit gleicher Wellung; kein SVG-Lathe. Params `bodyRadiusM` / `bodyHeightM`; Bild nur Cover auf festem Band.
- **Grund:** Klassische Blechdose vs. Getränkedose (Alu-Profil/202); User-Vorgabe Radius/Höhe + gewelltes Label.
- **Verworfen:** Lathe-Silhouette wie `beverage-can`; Image-driven sizing.

### 2026-10-09 — Boden-Schatten — Kontakt (Bias 0, Flasche Depth-Pass)
- **Entscheidung:** `SHADOW_DEPTH_BIAS` **0**, `SHADOW_NORMAL_BIAS` **0** (negativer Depth-Bias = Peter Panning am Boden). Weinflasche-Glas: `customDepthMaterial` = `MeshDepthMaterial` **FrontSide** (Transmission-Beauty unverändert).
- **Grund:** Browser-Check: sichtbare Lücke Flaschenfuß ↔ Schatten; negativer Bias verschlimmert Kontakt. User bestätigt nach Anpassung: Kontakt passt.
- **Verworfen:** `SHADOW_DEPTH_BIAS` -0.0003; nur `shadowSide` ohne Depth-Material an Transmission-Glas.

### 2026-10-09 — Ground — Materials Library statt eigene PBR/Opacity
- **Entscheidung:** `GroundSettings.materialId` (Default **Print Matt**); UI nur Material-Dropdown + Receive shadows + Mirror. `GroundMaterial.applyMaterialPreset` via `MaterialResolver` / `createGroundSurfaceMaterial`; Transmission-Presets am Boden als opaque Solid-PBR. Kein Ground-Opacity (immer deckend).
- **Grund:** Opacity &lt; 1 + Transparent-Pass überdeckte Asset-Füße ohne sichtbare Transparenz; PBR-Duplikat neben Materials Library.
- **Verworfen:** Color/Roughness/Metalness/Emissive-Slider am Boden; Ground-Opacity.

### 2026-10-09 — Viewport — Render-on-demand statt Dauer-Loop
- **Entscheidung:** `ViewportRenderScheduler` startet `setAnimationLoop` nur bei `requestRender()` oder kontinuierlicher Interaktion (Kamera, Gizmo); stoppt bei Idle und `document.hidden`. `emit()` und Resize triggern Render; Rapier nur bei dynamischen Bodies.
- **Grund:** Dauer-Render (2× 4096² Schatten + MSAA + SMAA) hielt GPU warm ohne Nutzen; Lüfter/thermisch auch bei statischer Szene.
- **Verworfen:** Schatten-Auflösung oder SMAA in Idle abschalten — Qualität bei jedem Frame unverändert.

### 2026-10-09 — Asset placement — Foot on ground, Y stable after rebuild
- **Entscheidung:** Spawn und Foot-on-ground bei **y = 0** (kein `ASSET_SPAWN_BASE_Y`). Foot-Welt-Y vor jedem Mesh-Rebuild merken; danach `transform.position.y` nur anpassen, wenn sich die Footprint-Höhe geändert hat (Center-Pivot: Smartphone/Tablet/Picture/Print). `syncWallGroundContact` entfernt — Panel-Edits überschreiben User-Y nicht mehr.
- **Grund:** Move setzt gewollte Position; 5 cm-Default und Wand-Y-Reset wirkten wie „alles rutscht“; Center-Pivot-Assets drifteten bei Bild/Scale ohne Y-Korrektur.
- **Verworfen:** Dauerhaftes Zurücksetzen der Wand-Y auf Spawn-Offset nach jedem Wall-Edit.

### 2026-10-09 — three-bvh-csg — targetLeafSize (patch-package)
- **Entscheidung:** `three-bvh-csg@0.0.18` + `patches/three-bvh-csg+0.0.18.patch` (`maxLeafSize` → `targetLeafSize` in `Brush.js`, PR #254). Zentraler Subtract in `src/engine/csg-subtract.ts` (ein `Evaluator`, ein Material). Git-`main`-Pin war Ziel — npm `EALLOWGIT` in Agent-CI; Patch bis npm-Release oder lokaler Git-Install.
- **Grund:** `three-mesh-bvh` 0.9.x deprecates `maxLeafSize`; Console-Warnung bei jedem CSG-Brush.
- **Verworfen:** Duplizierte `subtractVolumes` in wall/handheld; ungepatchtes 0.0.18.

### 2026-10-09 — Viewport AA — RenderPipeline + SMAA + Export
- **Entscheidung:** `ViewportRenderPipeline` mit `SkyMainCompositeNode` (ein RT, Sky → clearDepth → Main), `RenderPipeline` + `smaa()`; MSAA-Samples zentral (`VIEWPORT_MSAA_SAMPLES`); Mirror-`reflector({ samples })` gekoppelt; PNG via `captureViewportPng` / Top-Bar Export.
- **Grund:** Bessere Kanten (Specular/IBL), WYSIWYG Export, kein AA in Materials; zwei `pass()`-Nodes teilen kein Depth-Target.
- **Verworfen:** Nur Swapchain-MSAA ohne Post; separater Export-Render-Pfad.

### 2026-10-09 — Beverage can — Hülle + Label-Mantel (wie Flasche)
- **Entscheidung:** Körper = **eine** `LatheGeometry` (SVG) + Pivot + `computeVertexNormals` — **kein** Triangle-Split, **kein** `fixLatheOutwardNormals` / `weldLathePhiSeamNormals` am Dosen-Lathe. Label = **separates** offenes Mantel-Mesh (`open-mantle-geometry.ts`, geteilt mit Weinflasche) nur bei Bild; `polygonOffset` auf Label.
- **Grund:** User — Vereinfachung analog Flasche; weniger Winding/Gruppen-Logik.
- **Verworfen:** Ein Mesh, zwei `geometry.groups` per Dreiecks-Klassifikation.

### 2026-10-09 — Planar Mirror — Mipmaps + Mirror-State
- **Entscheidung:** `reflector({ generateMipmaps: true })` via `PLANAR_REFLECTION_GENERATE_MIPMAPS`; `GroundMaterial` hält `mirrorEnabledDesired` und wired nach `bindGroundMesh` (kein `SCENE_DEFAULTS`-Sonderfall). `updateResolution` nur wenn Mirror an; beim UI-Toggle Mirror an einmalig in `setGround`.
- **Grund:** Prüfbericht 01 — Aliasing ohne Mip-Kette; Mirror-Enable vor Mesh-Bind ging verloren.
- **Verworfen:** Fresnel-Mix / Sky im Spiegelpass (eigene Iteration).

### 2026-10-09 — Wine bottle — Glas `FrontSide` via Preset-ID
- **Entscheidung:** **`material-glass-wine-bottle`** → Clear-Transmission **ohne** `DoubleSide` (`FrontSide`); **kein** generisches `outerSurfaceOnly` in `MaterialResolveOptions`.
- **Grund:** Außen-Lathe-Shell; Flag war nur Flaschen-Sonderfall.
- **Verworfen:** `outerSurfaceOnly` am Wine-Bottle-Resolve.

### 2026-10-09 — Wine bottle — kein `surfaceRole` fürs Glas
- **Entscheidung:** Flaschenglas **`meshDepthM`** + Clear-Transmission-Preset — **kein** `wineBottleGlass` in `MaterialResolveOptions`. `createTransmissionMaterial`: klare `if`-Zweige statt verschachtelter Spreads.
- **Grund:** `wineBottleGlass` duplizierte den Clear-Glas-Pfad (`depthWrite: false` wenn nicht Glazing-Cap).
- **Verworfen:** Eigener Surface-Role-Zweig nur für die Flasche.

### 2026-10-09 — Wine bottle — Glas-Lathe, Schatten, Label-Defaults, Geometries
- **Entscheidung:** Glas **wirft immer Schatten** (`castShadow`); weniger Transparenz → dunklerer Schatten. **Kein Bild** → **kein** Label-Mesh. Label-Defaults: **`labelBottomOffsetM` 100 mm**, Druckmaß-Start **4∶3** (90×120 mm) + Bild-Aspect für zweite Seite. Kapsel Default **`material-gold-brushed`**. **`geometryVisibility`:** `body`, `label`, `cork`, `capsuleFoil`, `capsuleDisc` — alle mit Checkbox.
- **Grund:** User — Mockup-Klarheit; keine leere Etikett-Fläche; Sekt-Kapsel Gold; volle Teil-Sichtbarkeit.
- **Verworfen:** Display-Glazing ohne Schatten auf Flasche. (Glas-Geometrie → Diary **2026-10-11 — Glas-Geometrie**.)

### 2026-10-09 — Wine bottle v1 — Engine-Umsetzung
- **Entscheidung:** SVG **nur Höhen-Skalierung**; Außenradius via **`sampleWineBottleRadiusAtY`**. **Label** = separates **Mantel-Mesh** (nicht Vertex-Split am Glas). Kork/Folie/Disc eigene Meshes; **`populateWineBottleGroup`** analog Dose.
- **Grund:** Separates Label vermeidet Material-Gruppen-Konflikt mit Transmission; Folie/Disc brauchen variable `r(y)`.
- **Verworfen:** Dose-`normalizeSvgProfileToLathePoints` (Diameter-Stretch); Label-UV auf Glas-Lathe split.

### 2026-10-09 — Wine bottle — Kapsel-Folie + Kapsel-Scheibe
- **Entscheidung:** Zwei Meshes: **`capsuleFoil`** — nur **Mantel** (360°, `r(y)` = Glas-Außenradius + ~**0,4 mm** Standoff), Höhe **`capsuleFoilHeightM`** von **`heightM`** nach unten; **`capsuleDisc`** — Zylinder auf **`y = heightM`**, **`capsuleDiscHeightM`** nach oben (BBox **`heightM + discHeight`**). Material + Höhe im Panel; **alle Profile**, Checkbox Default **an**. Kein Muselet v1.
- **Grund:** User — Schrumpfkapsel-Mockup (seitlich + Deckscheibe); Folie folgt Flaschenform, leicht erhaben.
- **Verworfen:** „Keine Schrumpfkapsel v1“; Folie inkl. Deckel (Deckel = Disc); Standoff als User-Slider v1.

### 2026-10-09 — Wine bottle — Korken (Mesh, Maße, Wood Porous)
- **Entscheidung:** Separates Mesh **`cork`**: Radius **10 mm** (Bordeaux/Alsace) / **11 mm** (Sparkling), Höhe **40 mm**, Kantenradius **1,5 mm**; **Oberkante bündig** mit Flaschen-`heightM` → **`position.y = heightM − corkHeightM`** (kein Kork-Überstand); Default **`material-wood-porous`**; **`geometryVisibility.cork`** + Material-Dropdown.
- **Grund:** User-Mockup mit Stopfen; Kork ≠ Glas; Sekt etwas dickerer Kork.
- **Verworfen:** Kork in Glas-SVG; Kork **ragt über** den Flaschenmund hinaus; Kork-Maße im v1-Panel editierbar; Muselet v1.

### 2026-10-09 — Wine bottle — Built-in Glas `material-glass-wine-bottle`
- **Entscheidung:** Eigenes **transmission** / **solid**-Preset mit Tint **`#176132`**; Default `glassMaterialId` am Asset. **2,5 mm** nur Geometrie + `meshDepthM` beim Resolve — **nicht** im Preset.
- **Grund:** Mockup-typisches Flaschengrün; neutral `glass-solid` / `glass-pane` (Display-Zweig) passen nicht.
- **Verworfen:** Wandstärke im Material-Editor; generisches Solid ohne Preset-Farbe.
- **Implementierung:** Preset in `material-presets.ts` (nach Glass solid); **`createMaterialFromPreset`**: Display-Glazing nur noch bei **`glassVariant: pane`** (solid/wine bottle immer Transmission).

### 2026-10-09 — Wine bottle — Etikett: User-Maß + Wrap vs. PNG
- **Entscheidung:** Label **nicht** wie Dose (festes Band): User **`labelBottomOffsetM`** (vertikal verschieben) + **`labelSizeMode`** `width`|`height` + **`labelSizeM`**; andere Seite aus **Bild-Aspect**; **`labelWrap`** `full` (360°) | `partial` (Front, PNG-Alpha). Bild **proportional**, kein Stretch.
- **Grund:** User — Vollmantel-Sleeves und kleine PNG-Etiketten; Mockup braucht reale Druckmaße.
- **Verworfen:** Festes Etikett-Band pro Profil; Breite nur aus Dose-Height-fit.

### 2026-10-09 — Wine bottle — SVG-Wandprofile + Höhen-Skalierung
- **Entscheidung:** `public/bottle-{bordeaux,alsace,sparkling}.svg` — je **ein geschlossener** Wandpfad; Normalisierung **nur über Gesamthöhe** (`scale` aus Y-Spanne → **290 mm**), **X mit gleichem Faktor** (Achse = `minX`); **kein** fixes `diameterM` wie bei der Dose.
- **Grund:** User-Zeichnungen inkl. **~2,5 mm** Wand; bei **290 mm** Höhe Bauch-Außenradius **38,0 mm** (Bordeaux/Alsace), **44,0 mm** (Sparkling).
- **Verworfen:** SVG auf tabellarischen Max-Ø strecken (würde Wandstärke verfälschen).

### 2026-10-09 — Wine bottle — Lathe aus geschlossenem Wandprofil (doppelte Outline)
- **Entscheidung:** Glas nicht wie Dose (**eine** Radius-Linie), sondern **Außen- + Innenkontur** im Querschnitt (**2,5 mm** Wand), zu **geschlossenem** Profil verbunden → **Lathe** = hohles Glasvolumen (Lippe, Punt-Innenkante im Mesh).
- **Grund:** User-Skizze; realistische Glaswand und Kanten für Mockup.
- **Verworfen:** Nur Außen-Lathe + reine Transmission-Thickness ohne Innenfläche.

### 2026-10-09 — Beverage can — Label height-fit (kein Cover)
- **Entscheidung:** Label-Textur **nur an Druckband-Höhe** skalieren (`t = v`); horizontal `uSpan = imageAspect/planeAspect` — schmal → Alu-Ränder, breit → `s` clamp. Referenz-Aspect **`computeLabelPrintableBandMm`** (107,7 mm Band), nicht Unfold-Brief 110,2 mm. **`createCanLabelMaterial`** + `fitHeightLabelColorNode`.
- **Grund:** User — keine Cover-Crops in der Höhe; Sleeve nur bei passendem Band-Aspect voller Umfang.
- **Verworfen:** `coverUvNode` auf Dosen-Label; 2D-Contain.

### 2026-10-09 — Beverage can — Bottom-Pivot + Vertex-Split Label
- **Entscheidung:** Lathe/Ring **`bbox.min.y → 0`** (nicht `+heightM/2`). Label: **pro Dreieck duplizierte Vertices** (body = Lathe-UV, label = zyl. UV) — **kein** geteiltes Vertex zwischen Gruppen. Endring-Mesh **`position.y = heightM − topRingHeightM`**. Label-Material: **`createCanLabelMaterial`** (nur Textur, `metalness: 0`); Cover **`planeH = labelY1 − labelY0`**.
- **Grund:** Y-Bounds passten nicht → Bild endete unter Schulter; shared UV → Metall kaputt + jedes 2. Dreieck; Glossy-Print-Weiß durch.
- **Verworfen:** Index-Gruppen auf einem UV-Buffer; `translateBottomPivot` wie Block auf Lathe.

### 2026-10-09 — Beverage can — Label-Unfold nur 5 mm Boden; UV nur auf Label-Vertices
- **Entscheidung:** Flaches Unfold / `labelHeightM` = **Gesamthöhe − 5 mm** (2,5 mm Endring nur separates Mesh, keine extra Mantel-Reserve). Label-Dreiecke inkl. **Schulter** via `sampleProfileRadiusAtY`. Zylindrische UV **nur** Label-Vertices; Lathe-UV bleibt für **body**-Alu. **Ohne Bild:** ein Material, keine Label-Gruppe.
- **Grund:** User — Bild bis oben, nur Boden-Alu; Streifen-Artefakt durch globale UV auf gebürstetem Metal.
- **Verworfen:** Unfold `height − 5 − 2,5`; zylindrische UV auf gesamtes Lathe-Mesh; Label-Gruppe ohne Bild.

### 2026-10-09 — Beverage can — festes Dosenformat, kein Image-driven sizing
- **Entscheidung:** Geometrie nur aus **Profil** + **`beverageCanParams`** / SVG; Bild nur **Textur** (Cover auf festem Band). **`sizeScale`** skaliert **gesamte** Dose uniform — Ausnahme zu [`requirements-assets.md`](../requirements/requirements-assets.md) Image-driven sizing.
- **Grund:** Physische 330-ml-Dose ist definiert; Label-Datei ist Sleeve-Unfold, kein Maßstab für den Körper.
- **Verworfen:** Höhe/BOD aus Bild-Ratio; „Dose an Bild anpassen“.

### 2026-10-09 — Beverage can v1 — Label auf Lathe-Mesh (Alu), kein Label-Zylinder
- **Entscheidung:** **Ein** `LatheGeometry`-Körper (Alu) + **Material-Gruppen** `body` / `label` auf dem **zylindrischen Mantel-Band**; `screenImageId` = Textur **direkt auf dem Mesh** (eigene zylindrische UV + Cover); **Mantel-Endring** weiter separates Mesh; **kein** radialer/weltlicher Epsilon (nicht Handheld-Screen-Abstand).
- **Grund:** Mockup = Bedruckung **auf** dem Blech; kein Z-Fighting durch koplanares Zweit-Mesh; User-Vorgabe.
- **Verworfen:** Separates **CylinderGeometry** für das Label (Diary-Eintrag „Zylinder-Label“ obsolet); Lathe-Default-UV für das ganze Profil; ε-Offset Label vs. Mantel.

### 2026-10-09 — Beverage can v1 — SVG-Lathe Mantel + Zylinder-Label *(obsolet)*
- **Entscheidung:** … separates **CylinderGeometry** …
- **Grund:** …
- **Verworfen:** … — **ersetzt** durch Eintrag „Label auf Lathe-Mesh“ oben.

### 2026-10-09 — Passepartout Zwei-Mesh — koplanar, polygonOffset + renderOrder
- **Entscheidung:** Offset > 0: Passepartout + Bild **gleiches `zBase`** (`createPassepartoutDisplayMeshes`). Passepartout: `depthWrite: true`, `polygonOffset` +2/+2, `renderOrder` 2. Bild: `renderOrder` 3, `polygonOffset` −2/−2 (Handheld Screen +1/+1). Handheld `innerBack`: `renderOrder` 0, `polygonOffset` −1/−1 — nicht mehr Order 1 mit positivem Offset (Passepartout-Ring unsichtbar).
- **Grund:** Welt-Z-Epsilon (~0,2 mm) schiebt Screen ins Glas (`handheld-layer-stack.ts`, Spalt ~0,02 mm) → Z-Fighting / Bild weg bei Orbit.
- **Verworfen:** `zBase + ε` zwischen Passepartout und Bild; Passepartout `depthWrite: false` (Ring fiel gegen Innen-Rückwand weg).

### 2026-10-09 — Passepartout Engine v2 — Zwei-Meshes + Innenradius
- **Entscheidung:** Offset > 0: **zwei** Flächen (außen Passepartout-Material, innen Bild-Material), Tiefe s. Eintrag „koplanar, polygonOffset“. **Gerundete Screens** (Handheld, Monitor, Print-Bildfaces): Innen-`createRoundedScreenGeometry` mit **`R_inner = max(0, R − offset)`** — **R** nur aus bestehendem `screenCornerRadiusMm` / `cornerRadiusMm`, kein UI-Feld. **Picture framed:** nur **rechteckige** zwei Planes, **kein** Radius.
- **Grund:** Shader-Inset auf einem Mesh lässt Bild in runden Display-Ecken „rausstehen“; getrennte Materialien ohne Mix-Shader.
- **Verworfen:** Round-Rect-SDF auf einem Mesh; Picture mit `R = 0` über Rounded-Geometry; zusätzlicher Passepartout-Radius; anfänglicher Plan mit projektweitem Z-Epsilon zwischen den Screen-Planes.

### 2026-10-09 — Image Surfaces — Passepartout (Farbe, Offset, eigenes Finish)
- **Entscheidung:** Pro Bild-Fläche optional **Passepartout**: `passepartoutColor`, `passepartoutOffsetM` (Default 0), `passepartoutFinish` (Matt/Glossy, **gleiches Dropdown** wie Bild-`finish`). Farb-Defaults: Picture/Print weiß, Handheld/Monitor schwarz. Scope: Picture, Print (Image-Faces), Smartphone/Tablet/Monitor — **nicht** Wall/Tapete. Emissive nur auf Bild.
- **Grund:** Mockups mit Passpartout-Rand bzw. Display-Underscan ohne Rand im Bildfile; mattes Passepartout + glänzendes Bild unabhängig einstellbar.
- **Verworfen:** Ein gemeinsames Finish für Ring und Bild; Passepartout auf Wall.

### 2026-10-09 — Camera Navigation — PanelAxisField + Scene-API-Setter
- **Entscheidung:** Navigation im Camera Sub-Panel editierbar über extrahiertes `PanelAxisField` (shared mit Entity-Transform); Engine `CameraController` Setter für Target/Position/Distance/Azimuth/Elevation; Live-Readout weiter per rAF/`getCameraReadout` (kein Store-Flood).
- **Grund:** [`requirements-camera.md`](../requirements/requirements-camera.md) Navigation-Eingabe + Winkel-Reset; UI-Dichte [`requirements-look-and-feel.md`](../requirements/requirements-look-and-feel.md) `panel-field-*`.
- **Verworfen:** Read-only Readout; Kamera-State in Zustand-Store spiegeln.

### 2026-10-09 — Spot castShadow — Engine-Shim (Three r186 WebGPU)
- **Entscheidung:** Studio Key/Fill: logisches `LightingSettings.*.castShadow` nicht mehr als `light.castShadow = false` umsetzen, solange das Licht `enabled` ist. Stattdessen `light.castShadow = true` + `light.shadow.intensity` 0/1 via `applySpotShadowCast()` in `shadow-setup.ts`. Shadow-Camera-Updates an Settings (`enabled && castShadow`) koppeln.
- **Grund:** Three.js 0.186 WebGPU: `castShadow` off disposed `ShadowNode` (`shadowMap = null`), Node bleibt in `updateBeforeNodes` → Crash beim Light-Rig-Umschalten (z. B. Dramatic ohne Fill-Shadow). Upstream: [PR #34353](https://github.com/mrdoob/three.js/pull/34353) (noch nicht in npm).
- **Verworfen:** `node_modules`-Patch; echtes `castShadow` off bis Three-Fix. **Später:** Shim entfernen nach Three-Upgrade mit null-Guard.
- **Wartung (wöchentlich):** Prüfen, ob Three.js den `ShadowNode`-Fix shipped hat ([PR #34353](https://github.com/mrdoob/three.js/pull/34353) oder Issue-Merge mit `if ( this.shadowMap === null ) return` in `updateShadow`/`updateBefore`). Wenn ja: `three` upgraden, `applySpotShadowCast()`-Shim in `shadow-setup.ts` / `LightingSystem` zurückbauen, Light-Rig-Umschaltung (Default ↔ Dramatic, Fill Cast shadows) testen. Checkliste → [`requirements-tips-and-tricks.md`](../requirements/requirements-tips-and-tricks.md) (Abschnitt „Wöchentliche Wartung“).
- **Nebenbei:** Pooled Directional — `castShadow` erst bei `allocateDirectional`, nicht im Pool-Init.

### 2026-10-09 — Block asset — Rounded box, ein Material
- **Entscheidung:** `assetKind: block` — `blockParams` (width/height/depth m, `cornerRadiusMm` Default 5), `RoundedBoxGeometry` (segments 4), ein Slot `blockMaterialId` (Default Print Matt), Boden-Pivot wie Wall, kein `sizeScale`.
- **Grund:** [`requirements-assets-block.md`](../requirements/requirements-assets-block.md); Stilleben-Prop ohne Bild.
- **Verworfen:** Uniform-Scale-Gizmo; per-Face-Materialien v1.

### 2026-10-08 — Wall Tapete — Strip-Höhe aus Bild-Seitenverhältnis
- **Entscheidung:** Mit `screenImageId`: `stripHeightM = stripWidthM × (imageH / imageW)` in `resolveWallpaperPattern` (Render + UI); Strip height read-only im Panel; bei Breitenänderung Höhe mitpersistieren.
- **Grund:** UV 0…1 auf `stripWidthM × stripHeightM` — feste Default-Höhe (z. B. 2 m) verzerrt das Motiv in Y.
- **Verworfen:** Unabhängige manuelle Strip-Höhe bei gesetztem Bild.

### 2026-10-08 — Wall Tapete — Z-Epsilon + columnOffsetM
- **Entscheidung:** Front-Plane `z = thickness/2 + 0,5 mm` + `polygonOffset` am Tapeten-Material. **`columnOffsetM`** auf `wallpaperPattern` — Y-Versatz nur ungerade Spalten; Default `stripHeight/2`, `0` = kein Half-Drop. UV-Logik geteilt: `wall-wallpaper-uv.ts` + TSL.
- **Grund:** Z-Fighting Körper vs. Tapete; User soll Nachbar-Bahnen-Versatz einstellbar haben.
- **Verworfen:** Hardcoded Half-Drop nur im Shader ohne Panel-Feld.

### 2026-10-08 — Wall & Wall with Door — Mesh-Split + Half-Drop Shader
- **Entscheidung:** `wall` / `wall-door`: Körper-Mesh (Box, Tür per `three-bvh-csg`) + separates Front-Mesh nur mit `screenImageId`; Tapete = TSL `positionLocal` + Half-Drop (`stripWidthM` / `stripHeightM`, Repeat, kein Cover). Pivot **Unterkante** `y=0`; Spawn-Y = `ASSET_SPAWN_BASE_Y`. Maße über `wallParams`, kein Scale-Gizmo.
- **Grund:** CSG verliert Face-Groups; Requirements [`requirements-assets-wall.md`](../requirements/requirements-assets-wall.md).
- **Verworfen:** Cover-UV auf Wandfront; `sizeScale` für Wände.

### 2026-10-08 — Monitor asset (Stand + Handheld display)
- **Entscheidung:** `assetKind: monitor` — Display via shared `buildHandheldDisplayMeshes` + CSG/Layer-Stack; `sideButtonCenterYFactor` (−0,25) für Tasten in unterer Hälfte; Stand in `monitor-stand.ts`; Pivot `displayTiltDeg` / `displayMountHeightMm`. Defaults Alu brushed inkl. Backplates. `MonitorDeviceParams` extends Handheld-Felder + Stand-mm.
- **Grund:** Requirements [`requirements-assets-devices-monitor.md`](../requirements/requirements-assets-devices-monitor.md); kein Duplikat der Handheld-Geometrie-Engine.
- **Verworfen:** `monitor` in `isHandheldAssetKind`; Chrome-Backplates als Monitor-Default.

### 2026-10-08 — Left Light rigs + cloneLightingSettings
- **Entscheidung:** **Left Main → Light rigs** (`LampFloor`): Built-ins Default/Softbox/Dramatic + User-Save; Preset = `LightingSettings` only. `cloneLightingSettings` in `lighting-preset-types.ts` (Store + Presets). `activeLightingPresetId` unabhängig von `activeEnvironmentId`.
- **Grund:** Nur Rig wechseln ohne Sky/Ground; paralleles Muster zu Environments; Softbox/Dramatic-Lighting-Zweig mit `builtin-environments` synchron (Kommentar).
- **Verworfen:** Scene-API-Erweiterung für Apply (v1 `applyLighting` reicht).

### 2026-10-08 — Left Environments-Bibliothek + AtmosphereSnapshot
- **Entscheidung:** **Left Main → Environments**: Built-ins (Default, Softbox, Dark Stage) + User-Save; Preset = `AtmosphereSnapshot` (`environment` + `ground` + `lighting`). `applyAtmosphereSnapshot` in Scene-API; Store `loadEnvironment` / `saveCurrentAsEnvironment`. Default-Built-in aus `SCENE_DEFAULTS` via `atmosphereFromSceneDefaults()`.
- **Grund:** Atmosphäre schnell wechseln ohne Entity-Layout; Querschnitt für spätere Scenes; ergänzt (ersetzt nicht) die Entscheidung „nur Scenes für Presets“.
- **Verworfen:** Ground-Preset-Chips im Right-Panel; v1 Confirm-Dialog beim Apply.

### 2026-10-08 — Environment-Blöcke + SceneEntityBlock
- **Entscheidung:** Environment-Panel: Sky, Reflections, Fog, Ground als `scene-entity-block` (Collapse + Eye). `StudioLightBlock` → `SceneEntityBlock` (generisch). Neue Flags `skyEnabled` / `fogEnabled` in Store + Engine; Reflections Eye = `reflectionEnabled` (Checkbox im Body entfernt).
- **Grund:** Gleiches UI-Muster wie Lighting; Eye steuert Sichtbarkeit/Wirkung, Collapse nur Layout.
- **Verworfen:** `SubPanelSection` ohne Eye; separates Enable-Checkbox für Reflections.

### 2026-10-08 — Shadow Softness pro Key/Fill
- **Entscheidung:** `shadowSoftness` von Root `LightingSettings` in `key.shadowSoftness` / `fill.shadowSoftness` verschoben. Slider im jeweiligen Licht-Block (nach Cast shadows). Globale Shadows-Sektion entfernt.
- **Grund:** Key und Fill brauchen unabhängige PCF-Weichheit; passt zu per-Light Cast shadows.
- **Verworfen:** Globale `LightingSettings.shadowSoftness` für beide Rigs.

### 2026-10-08 — Fill decay=0 wenn Cast shadows an
- **Entscheidung:** Fill mit `castShadow` aktiv → `decay = 0` (wie Key), unabhängig ob Key parallel castet. Ohne Cast shadows: `decay = 1.5`. Three.js: eine Shadow Map **pro Licht**, kombiniert im Shader — kein Single-Pass.
- **Grund:** Schattenstärke skaliert mit Lichtbeitrag; `decay=1.5` auf ~8 m machte Fill-Schatten unsichtbar (nur sichtbar wenn Key aus war).
- **Verworfen:** Solo-Caster-only decay-0; gemeinsamer Shadow-Pass für Key+Fill (nicht Three.js-Standard).

### 2026-10-08 — Cast shadows Checkbox Key + Fill
- **Entscheidung:** Pro Key/Fill Checkbox **Cast shadows** im Licht-Block (`castShadow` in Store). Default **on** für beide (inkl. Fill). Ground Receive shadows Toggle bleibt.
- **Grund:** Fill soll Schatten werfen können; User steuert pro Rolle. Max. 2 Caster = Studio Key + Fill.
- **Verworfen:** Fill fest `castShadow: false`; keine UI-Toggles.

### 2026-10-08 — Lighting-Blöcke mit Scene-Item-Header
- **Entscheidung:** Ambient / Key / Fill im Lighting-Panel als `scene-entity-block` mit Collapse + Eye (`enabled` pro Rolle). Follow scene center bleibt oben. Key/Fill: Titel = Select. **Kein Trash** in v1.
- **Grund:** Gleiches UI-Muster wie Scene-Panel; Ein-/Ausblenden pro Licht ohne Preset-Chips.
- **Verworfen:** `light-role-block`-Button; Remove-Button bis Multi-Light v2.

### 2026-10-08 — Lighting-Presets entfernt
- **Entscheidung:** Built-in Lighting-Presets (Key Left, Key Right, High Contrast, Soft Studio) aus UI und `lighting-presets.ts` entfernt. Key-Side-Toggle und manuelle Slider bleiben.
- **Grund:** Vorlagen gehören in **Left Scenes**, nicht als Feature-Chips pro Panel.
- **Verworfen:** Lighting-Preset-Chips im Sub-Panel.

### 2026-10-08 — Ground ins Environment-Panel; Env-Presets weg
- **Entscheidung:** Ground-Einstellungen als **Sektion** im **Environment Sub-Panel** (Sky → Reflections → Fog → Ground). Right Main **Ground** und **Presets** entfernt. Built-in Ground-Presets (White Studio, …) und Sky-Presets aus Requirements/UI gestrichen — Vorlagen über **Left Scenes**.
- **Grund:** Environment = eine zusammengehörige Atmosphäre; Preset-Chips im Ground-Panel überflüssig neben Scenes-Bibliothek.
- **Verworfen:** Eigener Ground-Nav; Ground-Preset-Chips; Right-Main-Presets-Dummy.

### 2026-10-08 — Default-Szene: Print + Szenen-Label „Default“
- **Entscheidung:** `DEFAULT_SCENE_ASSETS` enthält zusätzlich `print` (A5, x −0,05); Breadcrumb `Scene › Default` via `DEFAULT_SCENE_NAME` in `default-scene-assets.ts`.
- **Grund:** Print im Portfolio-Layout sichtbar; „Demo“ war irreführend für die produktive Start-Szene.
- **Verworfen:** Umbenennung des internen `src/ui/demo/`-Ordners.

### 2026-10-08 — Print Defaults A5 Hochformat + Corner radius
- **Entscheidung:** Print-Referenzbreite `0.148` m (A5); Placeholder-Aspect `148/210` (Hochformat); `cornerRadiusMm` Default **0,5** (= `0,0005` m in UI).
- **Grund:** Realistisches Druckformat statt 0,6 m / 16:9-Landscape; dezente abgerundete Ecken out-of-the-box.
- **Verworfen:** Vergrößerte Viewport-Referenz (0,6 m) und rechteckiger Default (Radius 0).

### 2026-10-08 — Panel-Stack Spacing (UI P6)
- **Entscheidung:** Einheitliches Zwei-Ebenen-System: `--panel-gap` (2px Felder), `--panel-stack-gap` (6px vertikaler Rhythmus). Utility `.panel-stack` auf `sub-panel__body` und `scene-entity-block__body`; Sektions-Trenner via border + padding, negativer margin cancelt flex-gap. `--panel-section-gap` und title `padding-top`-Hack entfernt; Entity-Section-Overrides entfernt.
- **Grund:** `sub-panel-section__title`-Abstände wirkten je nach Panel unterschiedlich (Lighting vs. Scene vs. Materials) — vier konkurrierende Spacing-Mechanismen.
- **Verworfen:** Nur title padding-top erhöhen; kontextspezifische `.scene-entity-block .sub-panel-section`-Padding behalten.

### 2026-10-08 — Panel-Form-Layout dokumentiert (UI P5)
- **Entscheidung:** Layout-Konvention in `requirements-look-and-feel.md` festgehalten: `panel-field-row` (horizontal), `panel-field-stack` (full-width), `panel-slider`; Shared Components; Unit als `panel-field-unit`-Suffix.
- **Grund:** UI-Cleanup P1–P4 abgeschlossen — Konvention für neue Panel-Felder nachvollziehbar ohne Code-Audit.
- **Verworfen:** Nur Diary ohne Requirements-Block.

### 2026-10-08 — dummy-field entfernt (UI Form Controls P4)
- **Entscheidung:** `dummy-field` vollständig entfernt — CSS inkl. `#f9f9f9`-Inputs und `.dummy-field--checkbox`. Profil-Read-only in MaterialsPanel → `panel-field-row` + `panel-field-value` (wie Lighting „Side“).
- **Grund:** Kein Legacy-Naming/Styling mehr; alle Panel-Felder über `panel-field-*`.
- **Verworfen:** `PanelField` Barrel; `panel-field-stack` für Read-only (horizontal reicht).

### 2026-10-08 — Checkbox vereinheitlicht (UI Form Controls P3)
- **Entscheidung:** `GeometryPartField` nutzt `PanelCheckbox` für Visibility statt raw `<input type="checkbox">`. Toten CSS `geometry-part-row__header/label/checkbox` entfernt.
- **Grund:** Eine Checkbox-Variante im gesamten Panel-UI; Label links, Control rechts wie Ground/Lighting.
- **Verworfen:** Nur `panel-checkbox__input`-Klasse ohne Komponente.

### 2026-10-08 — Numerische Felder: Unit als Suffix
- **Entscheidung:** Einheit immer als `panel-field-unit` rechts neben dem Input (`Label | Wert | Unit`) — nicht im Label eingeklammert. `PanelTextField` row + `AxisField` mit `unit` prop; 12 Entity-Felder migriert (`m`, `°`).
- **Grund:** Konsistenz mit `SliderValueField` / `RangeSlider` (`valueUnit`); User-Präferenz.
- **Verworfen:** Einheit im Label (`Width (m)`); mm-Suffix bei Meter-Anzeige (Corner radius zeigt Meter → Unit `m`).

### 2026-10-08 — PanelTextField (UI Form Controls P2)
- **Entscheidung:** Shared `PanelTextField` mit zwei Layouts: **Stack** (`panel-field-input--full`, 12px system) für Namen; **Row** (`panel-field-input`, 72px mono) für numerische AxisFields. Camera-Slot-Name nutzt `--full`-Tokens direkt.
- **Grund:** `dummy-field`-Text-Inputs (28px, grau) vereinheitlichen auf 22px wie ColorPicker/PanelSelect.
- **Verworfen:** Stack für AxisField; `dummy-field` CSS in P2 löschen (bleibt P4).

### 2026-10-08 — PanelSelect (UI Form Controls P1)
- **Entscheidung:** Shared `PanelSelect` mit Stack-Layout (`panel-field-stack` + `panel-field-select`, 22px, full-width). Alle 5 Dropdowns in Demo-Panels migriert.
- **Grund:** Selects hatten kein CSS (Browser-Default in `dummy-field`); visuell an `panel-field-input`-Tokens angeglichen, 12px system font für Labels.
- **Verworfen:** Horizontal `panel-field-row` für Dropdowns; `dummy-field` für Selects behalten.

### 2026-10-08 — Colors-Bibliothek (Left Main)
- **Entscheidung:** Eigene **Colors**-Bibliothek (`ColorPreset`: Name + RGB) — Left Main vor Materials. 6 Built-ins (Nearwhite, Gold, Aluminum, Almost Black, Blue, Türkis); Gold/Aluminum RGB = Material-Presets. User: add/edit/remove; Built-ins nur duplizierbar. ColorPicker-Popover: Library-Swatches aus Store + Recent (Session). Kein `colorId` auf Entities v1.
- **Grund:** Benannte Projekt-Farben zentral pflegen; schnelle Auswahl überall wo ColorPicker steht — ohne Materials/PBR zu vermischen.
- **Verworfen:** Built-ins editierbar; Recent durch Library ersetzen; `colorId`-Referenzen auf Scene-Entities.

### 2026-10-08 — Import-Konvention + ESLint (Cleanup P8/P9)
- **Entscheidung:** Konvention: `import type` für reine Typen; inline `type` bei gemischten Imports. ESLint: `consistent-type-imports` (inline-type-imports), `no-import-type-side-effects`, `no-duplicate-imports`. Inline `import('…').Type` durch Top-Level-Type-Imports ersetzt.
- **Grund:** Regressionen nach Import-Cleanup verhindern; keine neue Dependency (`eslint-plugin-import` verworfen).
- **Verworfen:** `import/order`; `verbatimModuleSyntax` in tsconfig.

### 2026-10-08 — Path Aliases für UI (Cleanup P7)
- **Entscheidung:** `@/*` → `src/*` in Vite + tsconfig. UI-Layer importiert `colors/` und `units/` nur noch als `@/colors/…`, `@/units/…` (11 Dateien). Engine/Scene unverändert.
- **Grund:** Keine `../../../`-Pfade in verschachtelten UI-Komponenten (ColorPicker, RangeSlider).
- **Verworfen:** Separate Aliase nur für `@/colors` und `@/units` ohne generisches `@/`; globaler Refactor außerhalb UI.

### 2026-10-08 — UI-Grenze über scene-api (Cleanup P6)
- **Entscheidung:** UI importiert Scene-Domain nur noch `from scene-api` (10 Dateien). Domain-Module `light-ids`, `lighting-merge`, `asset-sizing` nach `scene/` verschoben. `cloneTransform` in `entity-types`. Einziger UI-Engine-Import: `ViewportFrame` → `MockupEngine`.
- **Grund:** Architektur-Regel — React spricht nur über SceneApi; keine Engine-Kopplung in Panels/Store.
- **Verworfen:** `shared/`-Modul für asset-sizing; Engine-Shim für light-ids.

### 2026-10-08 — Export-Oberfläche verkleinert (Cleanup P5)
- **Entscheidung:** File-local Symbole ohne `export` (~20 Module). Procedural-Barrel nur `createTexturedMaterial` + `DEFAULT_TILE_SCALE_*`. Store-Getter (`getImageById`, `getMaterialById`) file-local; ungenutzte Store-Setter/Getter entfernt. Toter Code: `createKeyLightRig`/`createFillLightRig`, `applyHandheldDisplayGlazing`, nur-exportierte Hilfsfunktionen in `normalized.ts`.
- **Grund:** Kleinere Public API; weniger versehentliche Cross-Module-Kopplung; Scanner-False-Positives (`constants.ts`, Barrel-UI) unverändert.
- **Verworfen:** `DEFAULT_NORMAL_SCALE` aus Source unexporten (wird von `procedural-params` importiert).

### 2026-10-08 — Procedural Barrel vereinheitlicht (Cleanup P4)
- **Entscheidung:** `materials/procedural/index.ts` = reines Public-API-Barrel. Dispatch-Logik (`getProceduralMaterialNodes`, Profile-Checks) nach `procedural-registry.ts`. Externe Consumer (`material-resolver`, `MaterialsPanel`) importieren nur noch `from '../materials/procedural'`. `create-textured-material` importiert Siblings direkt, nicht `./index`.
- **Grund:** Konsistenz mit ColorPicker/RangeSlider-Barrel; Barrel↔create-textured Zyklus vermeiden.
- **Verworfen:** `create-textured-material` aus Barrel ohne Registry-Auslagerung (Zyklus).

### 2026-10-08 — Zirkuläre Imports aufgelöst (Cleanup P2)
- **Entscheidung:** `multiplyRgb` nach `colors/rgb.ts`. Scene-Leaf-Typen: `AssetKind` in `scene/asset-kind.ts`; `HandheldDeviceParams` / `PrintDeviceParams` in `asset-handheld.ts` / `asset-print.ts`. `image-surface` nutzt lokalen `ImageSurfaceMigrationInput` statt `AssetEntity`. `entity-types.ts` re-exportiert weiterhin alle öffentlichen Typen.
- **Grund:** 4 Import-Zyklen (Scene + Engine↔Materials) ohne Logik-Änderung brechen; Consumer-Imports stabil halten.
- **Verworfen:** Monolithisches `scene/types.ts`; Consumer auf Leaf-Module umstellen.

### 2026-10-08 — Legacy-UI-Module entfernt (Cleanup P1)
- **Entscheidung:** Tote Komponenten (`Toolbar`, `ModeToolbar`, `AssetSidebar`, `PanelSection`, `ScrollPanel`, `noise/simplex.ts`) nach `_deleted/` verschoben. Store-State `sidebarOpen` / `propertiesOpen` + Toggle-Funktionen entfernt. `simplex-noise` Dependency bleibt in `package.json` für spätere Nutzung.
- **Grund:** Module nirgends importiert; aktive Shell nutzt `AppShell` + `TopMainBar` / `TopSubBar` / `SubPanel` / `SubPanelSection`.
- **Verworfen:** Legacy-Komponenten weiter im `src/` belassen; `simplex-noise` Dependency entfernen.

### 2026-10-08 — Image Surfaces — Matt/Glossy + Emissive pro Fläche
- **Entscheidung:** `imageSurfaces` auf Entity (`finish: matt|glossy`, `emissiveEnabled`, `emissiveIntensity` 0–1). UI: `ImageSurfaceFields` für Print/Picture/Handheld Bild-Flächen. Emissive = Bild-Texture × Intensity (kein ColorPicker). Finish mappt auf `material-paper` / `material-glossy-print`.
- **Grund:** Einheitliche Controls für Screens, hinterleuchtete Rahmen, Print-Front/Back; Legacy `frontMaterialId`/`backMaterialId` wird beim Load migriert.
- **Verworfen:** Globales Entity-Setting; Emissive-Farb-Override; volles Material-Dropdown auf Bild-Flächen.

### 2026-10-08 — Display Glazing — Clearcoat statt Transmission (klares Pane)
- **Entscheidung:** Glazing-Caps mit `surfaceRole: displayGlass` + Clear-Preset (roughness &lt; 0.1) → **`createDisplayGlazingMaterial`** (Clearcoat, opacity ~0.04, **kein** `transmission`). Frosted bleibt Transmission. Glass (pane) roughness **0**.
- **Grund:** Three.js-Transmission sampelt den Viewport mit Mip-Blur — Bild hinter klarer Scheibe wirkte milchig/unscharf.
- **Verworfen:** `handheldGlazing` + volumetrische Transmission für klares Display-Glas; `displayGlass`-Transmission-Pfad mit thickness ≈ 0.

### 2026-10-08 — Handheld Screen = Plane (0 Z-Dicke)
- **Entscheidung:** Screen-Bild `createRoundedScreenGeometry` (0-dick, abgerundete Plane) statt `createRoundedScreenSlabGeometry` (1 mm Extrude). Ein Material, kein Frame auf Seitenwänden. Front-Glas bleibt 1 mm Extrude + Multi-Material. Stack-Tiefe: 6 mm mit Glas, 4 mm ohne.
- **Grund:** User — Bilder sind Planes, brauchen keine Z-Dicke.
- **Verworfen:** 1-mm-Screen-Slab + Multi-Material gegen Tunnel-Linie; `HANDHELD_SCREEN_SLAB_THICKNESS_MM`.

### 2026-10-08 — Frame-Inhalte exakt = Lochgröße
- **Entscheidung:** Alle Handheld-Layer (Glas, Screen, Base backplate, Outer backplate) **exakt** `screenWidth × screenHeight` + `innerRadius` — **kein XY-Inset**. `insetLayerBounds` entfernt, `holeBounds` direkt. Outer backplate ebenfalls Screen-Opening (nicht Außenkontur).
- **Grund:** User — Inhalte müssen das Frame-Loch exakt füllen, nicht kleiner.
- **Verworfen:** `HANDHELD_LAYER_XY_INSET_MM` (0,5 mm), `HANDHELD_INNER_BACK_XY_INSET_MM` (2 mm); Outer backplate an Außenkontur.

### 2026-10-08 — Print Corner radius + 4 Dezimalstellen
- **Entscheidung:** Print: `printParams.cornerRadiusMm` (Default **0**); `print-geometry.ts` baut abgerundetes Prisma (Front/Back + Seiten + Eckbögen); Panel-Feld wie Handheld. **LENGTH_DECIMALS = 4** global (0,1 mm). Picture framed unverändert.
- **Grund:** User — Print mit optionalen Eckenrundungen; feinere mm-Eingabe für Radien/Bezel.
- **Verworfen:** Corner radius für Picture framed; separate Radius-Dezimalstellen.

### 2026-10-08 — Geometries Panel — Checkbox + Material pro Teil
- **Entscheidung:** Picture + Handheld: UI-Sektion **„Geometries“** statt Materials; pro Teil Checkbox (`geometryVisibility`) + Material-Dropdown (alle Presets). `setGeometryVisible` ersetzt `setGlazingEnabled`. Screen/Image bleibt separat.
- **Grund:** User — Geometrie-Teile einzeln sichtbar schalten; Materialwahl unabhängig pro Teil.
- **Verworfen:** Flache Materials-Liste; globales Glazing-Checkbox ohne Teil-Trennung.

### 2026-10-08 — Handheld Base backplate — kleiner + am Heck
- **Entscheidung:** `HANDHELD_INNER_BACK_XY_INSET_MM` **2** (statt 0,5 wie Screen); Z **verankert an Outer backplate** (`innerBack.zBack = outerBack.zFront + 1 mm`); kleiner als Screen-Slab, innerhalb Screen-Opening.
- **Grund:** User — Base backplate zu groß in XY; muss nah an Outer backplate (nicht hinter Screen gestapelt).
- **Verworfen:** Gleiche XY wie Screen-Slab; Z-Stack Screen → Base → Outer.

### 2026-10-08 — Handheld Seitentasten + Base backplate — Proud 2 mm, CSG-Pad
- **Entscheidung:** `SIDE_BUTTON_PROUD_MM` **2**; Button-Loch-Cutter mit `HANDHELD_CSG_EPSILON_M`-Pad über Außenwand (voller Durchbruch).
- **Grund:** User — Buttons 2 mm nach außen; Löcher zu kurz (koplanare CSG-Caps).
- **Verworfen:** Proud 0,5 mm.

### 2026-10-08 — Handheld Seitentasten — CSG-X-Fix, dynamische Lochtiefe
- **Entscheidung:** `sideButtonCenters` mit `x = sideWallOuterX`; CSG-Cutter als `Vector3`; Lochtiefe **dynamisch** `sideWallThicknessX + SIDE_BUTTON_HOLE_EXTRA_MM` (2 mm); `subtractSideButtonHoles` entfernt.
- **Grund:** Cutter landeten bei x=0 — Löcher nicht an Außenwand; fixe 3-mm-Tiefe passte nicht zu variablem Bezel.
- **Verworfen:** Fixe `SIDE_BUTTON_HOLE_DEPTH_MM = 3`.

### 2026-10-08 — Handheld Außenkanten — Edge roundness (0–3 mm)
- **Entscheidung:** Neuer Param `outerEdgeRadiusMm`; Panel „Edge roundness (mm)“; Range **0–3 mm**, Engine-Clamp zusätzlich `bodyDepthMm / 2`; Default **1 mm**; Bevel nur auf `createHandheldSolidFrameGeometry` (Außenkontur), CSG-Cutter bleiben scharf.
- **Grund:** Scharfe 90°-Seitenkanten wirkten unrealsitisch; Bezel-Breite als Max verworfen (falsche Dimension).
- **Verworfen:** 0–`bodyDepthMm` als Panel-Range (zu groß/unintuitiv); Bevel auf Glas/Screen/Backplate in v1.

### 2026-10-08 — Kamera — Max Orbit-Distance 10 m
- **Entscheidung:** `CAMERA_ORBIT_MAX_RADIUS` **80 → 10** m; `clampOrbitRadius()` zentral in `applyActiveProjection` + Zoom.
- **Grund:** Mockup-Arbeitsbereich begrenzt — Kamera nicht weiter als 10 m vom Orbit-Target.
- **Verworfen:** 80 m (zu weit für Produkt-Mockups).

### 2026-10-08 — Handheld Seitentasten — Höhe ×2, obere Hälfte zentriert
- **Entscheidung:** `SIDE_BUTTON_LENGTH_MM` **7 → 14**; Stack-Mitte **dynamisch** `outerHeight / 4` (Zentrum der oberen Gerätehälfte) statt fix `35 mm`.
- **Grund:** User-Feedback — Tasten zu klein; feste Y-Position passt nicht zu variabler Gerätehöhe (Smartphone vs. Tablet, Bild-Ratio).
- **Verworfen:** Feste `SIDE_BUTTON_CENTER_Y_MM`.

### 2026-10-08 — Handheld Tunnel-Linien — Final: Multi-Material Extrude (Glas + Screen)
- **Entscheidung:** **Glas** und **Screen** je **1-mm-Extrude**, `ExtrudeGeometry` Groups: **Caps** = Glas/Screen-Material, **Seitenwände** = shared `frameMaterial`; XY-Inset **0,5 mm**; Screen-Loch **volle Tiefe**; Glas `handheldGlazing` + `depthWrite: true` auf Caps.
- **Grund:** Seitenblick in Tunnel — Plane = Bild-Linie; einheitliches Slab-Material = Transmission/Bild auf Seitenwänden (~1 mm / ~2 mm); opake Rahmen-Flanken an Caps lösen beides.
- **Verworfen:** Screen-Plane; Öffnungstiefe reduzieren; seitlicher XY-Überstand; nur polygonOffset.

### 2026-10-08 — Handheld Glas — Multi-Material (Caps + Frame-Seiten)
- **Entscheidung:** Glas-Extrude **2 Groups**: Caps → Transmission (`handheldGlazing`); **Seitenwände** → gleiches Material wie Rahmen (`frameMaterial`) — Geometrie bleibt 1-mm-Extrude mit Walls.
- **Grund:** Transmission auf Seitenwänden → helle Linie im Screen-Tunnel bei Seitenblick; opake Rahmen-Flanken unsichtbar am Bezel.
- **Verworfen:** Glas ohne Seitenwände; nur polygonOffset.

### 2026-10-08 — Handheld Screen — Plane statt Extrude-Slab *(superseded)*
- **Zwischenstand:** Plane entfernte Slab-Kante, erzeugte aber **Bild-Linie** edge-on — ersetzt durch Multi-Material-Extrude (s. Eintrag „Tunnel-Linien — Final“).

### 2026-10-08 — Handheld Screen-Opening — CSG muss durchgehen
- **Entscheidung:** Screen-Loch im Rahmen **Pflicht-Durchbruch** Front→Back; `createScreenOpeningCutterGeometry` mit ε-Padding über z=0 und z=−bodyDepth (koplanare CSG-Caps vermeiden); Requirement + Tests (Mittel-Säule ohne Vertices).
- **Grund:** Bündiger Cutter ließ nur flache Mulde — Bild nur bei Zoom sichtbar; User-Debug bestätigte fehlendes Durchloch.
- **Verworfen:** Nur `renderOrder`/polygonOffset ohne echten CSG-Durchbruch; flache Öffnung als akzeptabel.

### 2026-10-08 — Handheld Rahmen-Glitch — Frame-Wall-Clearance 0,5 mm
- **Entscheidung:** `HANDHELD_LAYER_XY_INSET_MM` **0,5 mm** (statt 0,1); Glas `surfaceRole: handheldGlazing` mit **`depthWrite: true`**; `polygonOffset` auf Inserts (+1) und Rahmen (−2, `renderOrder` 5); **CSG-Recess** für Frontglas-Z-Pocket im Bezel-Ring; Screen-Öffnung bleibt **volle Tiefe** (Ring).
- **Grund:** Slab-Seitenwände (Screen/Glas/Backplate) lagen koplanar an Bezel-Innenwand → Z-Fighting / Ebenen durch Rahmen; Glas ohne depthWrite verstärkte Artefakte.
- **Verworfen:** Öffnungstiefe reduzieren; seitlicher XY-Überstand.

### 2026-10-08 — Handheld Glas & Backplate — 1 mm + 0,5 mm Z-Überstand
- **Entscheidung:** Sichtglas und äußere Backplate je **1 mm** dick (separates Glas-Mesh); Base backplate **1 mm**; **0,5 mm Z-Überstand** vor/hinter Rahmen (`HANDHELD_LAYER_Z_OVERHANG_MM`) — **kein** seitlicher XY-Überstand; XY-Inset später **0,5 mm** (s. Rahmen-Glitch).
- **Grund:** User-Vorgabe — Glas/Backplate ragen in der Tiefe über den Rahmen, nicht an den Seiten.
- **Verworfen:** XY-Überstand; Clearcoat-only Glazing; 2-mm Base backplate.

### 2026-10-08 — Handheld Sichtglas — Clearcoat auf Screen (kein Transmission-Mesh)
- **Entscheidung:** Glazing = **`applyHandheldDisplayGlazing`** auf Screen (Clearcoat **0.9**, roughness ≤ **0.06**) — **kein** separates Glas-Mesh. Screen Front z = **0** bei Glazing an. Stack **6 mm** (Glazing addiert keine mm).
- **Grund:** Transmission-Plane/Volumen + IBL wirkten wie undurchsichtiges Milchglas; echtes Klarglas am Display = Oberflächen-Glanz, nicht Volumen-Shader.
- **Verworfen:** Separates `material-glass-pane`-Mesh am Handheld; Transmission `displayGlass`-Rolle.

### 2026-10-08 — Glass Clear vs. Frosted — Roughness-Tuning + Built-ins
- **Entscheidung:** Clear-Glass: Roughness **0.001** (pane) / **0.005** (solid), IOR **1.52**, Thickness aus **`meshDepthM`** (pane und solid). Engine: bei roughness &lt; 0.1 → `specularIntensity`, `DoubleSide`, `depthWrite: false`, keine Attenuation. Zwei neue Built-ins **Glass Frosted (pane/solid)** mit Roughness **0.35** / **0.40**.
- **Grund:** Bestehendes Glas wirkte milchig (Roughness zu hoch, pane ignorierte Mesh-Tiefe); Milchglas als eigenes Preset statt Verwechslung mit Clear.
- **Verworfen:** Separater Frosted-Shader; User-Duplicate als einziger Weg zu Milchglas; feste 2 mm Thickness für pane.

### 2026-10-08 — Handheld Layer-Maße — User-Spec 1 mm / 2 mm Stack
- **Entscheidung:** Sichtglas **1 mm**, Bild **1 mm**, Base backplate **2 mm**, Outer backplate **1 mm**; **1 mm** Luftspalt zwischen jeder Layer-Fläche (`HANDHELD_LAYER_Z_GAP_MM`); Stack von hinten aufgebaut, passt exakt in **8 mm** Body-Tiefe; Tablet-Default ebenfalls 8 mm.
- **Grund:** User-Vorgabe; klare, gleichmäßige Abstände (0,5 mm je Seite an jeder Grenze = 1 mm zwischen Wänden).
- **Verworfen:** Dynamische Inner-Back-Dickenberechnung; 0,4/0,05/3-mm-Altmaße.

### 2026-10-08 — Handheld Z-Fighting — Recess-CSG + Outer Backplate
- **Entscheidung:** CSG-Recess für äußere Rückplatte (Frame-Material im Bezel-Back entfernt); Screen als 0,05-mm-Slab + `polygonOffset`; XY-Inset **0,1 mm**; `validateHandheldLayerStack()`; UI „Outer backplate“ (Slot `backGlassMaterialId` bleibt), Default Chrome, alle Materialien; `assetMeshRole` = `outerBackPlate` (castet Schatten).
- **Grund:** Äußere Rückplatte (Außenkontur) überlappte volumetrisch den Frame-Bezel; Screen-Plane verursachte Coplanar-Z-Fighting; „Back glass“-Label + Transmission-Filter falsch.
- **Verworfen:** Nur `renderOrder`/größere Gaps ohne Recess; Umbenennung des Serialisierungs-Slots.

### 2026-10-08 — Plastic Built-ins — Matte & Smooth
- **Entscheidung:** Zwei Built-ins `material-plastic-matte` / `material-plastic-smooth` (`solid-pbr`), gemeinsame dunkelgraue Farbe; Smooth mit Preset-`clearcoat` (0.35) → `MeshPhysicalNodeMaterial` in `createSolidPbrMaterial`. Listen-Reihenfolge nach Metall. Handheld-Defaults unverändert.
- **Grund:** Schwarze Kunststoff-Gehäuse/Props; Clearcoat preset-getrieben (nicht hardcoded wie Wood).
- **Verworfen:** `textured` + `plastic-die` Profil in v1; Handheld-Default auf Plastic Matte.

### 2026-10-08 — Handheld Rahmen — CSG-Öffnung + Layer-Stack
- **Entscheidung:** Rahmen = Solid-Block per CSG (Screen-Öffnung + Button-Löcher); `handheld-layer-stack.ts` als Single Source of Truth für Z-Grenzen; Screen als 0,05-mm-Slab; Insert-Meshes 0,02 mm XY-Inset; Back-Stack bündig ohne 0,1-mm-Gaps.
- **Grund:** Echte Löcher im Bezel; Z-Fighting zwischen Frame-Innenwand und Layer-Meshes.
- **Verworfen:** 2D-Ring-Extrude mit Shape-Loch; 0-dick `ShapeGeometry` für Screen.

### 2026-10-08 — Handheld Seitentasten v1 — CSG-Löcher + Volume rechts
- **Entscheidung:** Löcher per **`three-bvh-csg`** aus Bezel-Ring subtrahieren (`handheld-frame-csg.ts`); 2× kleinere Button-Meshes (1 mm proud, 2 mm Inset, Spalt 0,15 mm); rechts oben (+X), Z-zentriert, gestapelt; Slot `sideButtonMaterialId` (Default = Frame).
- **Grund:** Echte Löcher im Rahmen; sichtbarer Spalt; Material unabhängig wählbar.
- **Verworfen:** Separates `buttonWell`-Mesh; Power-Button; Positions-/Längen-UI in v1.

### 2026-10-08 — Handheld Devices v1 — Smartphone & Tablet
- **Entscheidung:** Gemeinsame Engine `handheld-geometry.ts`; `assetKind` `smartphone` / `tablet`; Geometrie-Params auf `AssetEntity.params` (`screenCornerRadiusMm`, `bezelWidthMm`); Sizing **height-basiert** (Referenz Screen-Höhe); v1 **Kreisbogen-Ecken** (`absarc`), kein Squircle; Z-Stack: Bezel-Ring (volle Body-Tiefe) + abgerundeter Screen + Glas + Backplate; `backWallMaterialId` = Body material.
- **Grund:** Phone/Tablet strukturell gleich; bildgetriebene Screen-Geometrie mit echten Rundungen (Schatten/Kontakt); minimaler v1-Diff — kein separates Body-Shell-Mesh.
- **Verworfen:** Rechteckiger Screen + Alpha-Maske; Squircle/Notch in v1; eigener `bodyMaterialId`-Slot.

### 2026-10-08 — Schatten — Softness-Slider im Lighting-Panel
- **Entscheidung:** `LightingSettings.shadowSoftness` (0–30, Default 4) → `keyLight.shadow.radius`; UI: SubPanelSection **Shadows** in Lighting (kein eigenes Right-Main-Panel). Presets lassen Softness unverändert.
- **Grund:** Harte mm-Kontaktschatten + einstellbare Penumbra ohne VSM/Bias-UI.
- **Verworfen:** Eigenes Shadow-Panel; Softness in Presets mischen.

### 2026-10-08 — Scene Panel — Width/Height in Metern (derived UI)
- **Entscheidung:** Transform-Panel zeigt **Width (m)** und **Height (m)** zusätzlich zu **Size** (`sizeScale`); Eingabe in Breite oder Höhe invertiert zu `sizeScale` via `asset-sizing.ts` — kein neues Entity-Feld.
- **Grund:** User will reale Maße eingeben; Bild-Ratio bleibt aus Image-Metadaten; Öffnungsmaße (nicht Rahmen-Außenmaß bei Picture).
- **Verworfen:** Persistente `widthM`/`heightM` auf Entity; unabhängige Breite/Höhe ohne Override-aspect.

### 2026-10-08 — Schatten — Asset shadowSide DoubleSide
- **Entscheidung:** `applyAssetShadowFlags` setzt `material.shadowSide = DoubleSide` auf allen castenden Asset-Meshes (Glazing ausgenommen).
- **Grund:** Einseitige Planes (Screen/Print) werfen mit Default-BackFace-Shadow-Pass nur aus einer Richtung Schatten; Unterseiten/Rückseiten fehlen.
- **Verworfen:** `material.side = DoubleSide` (sichtbar beidseitig); echte Back-Geometrie pro Plane.

### 2026-10-08 — Schatten — PCF + shadow.focus (kein VSM)
- **Entscheidung:** `PCFShadowMap` + `renderer.highPrecision`; Spot-Frustum via **`shadow.focus`**; Ground **nur receive** (kein cast). `SHADOW_RADIUS=2`, `bias=-0.0001`.
- **Grund:** VSM → Receiver casten mit → diagonale Streifen auf 5-km-Boden (Shadow-Acne). Focus-Fix bleibt für Auflösung.
- **Verworfen:** `VSMShadowMap` für Studio-Mockups; `camera.fov` direkt setzen.

### 2026-10-08 — Schatten — 4096² + 5 m Frustum
- **Entscheidung:** `SHADOW_MAP_SIZE = 4096`; Coverage **5 m** (`SHADOW_CAMERA_HALF_EXTENT` / `SHADOW_COVERAGE_RADIUS = 2.5`); Spot-FOV in `updateSpotShadowCamera` aus Licht→Target-Distanz berechnet; `near = 0.1`.
- **Grund:** 22-m-Frustum + 2048² = ~10 mm/Texel — zu grob für mm-Mockups; enges Frustum + 4K = ~1,2 mm/Texel im Produktbereich.
- **Verworfen:** 2048 nur für Viewport / Export-Pass mit höherer Map.

### 2026-10-08 — Lighting — Panel-Vereinfachung + Light-Pool
- **Entscheidung:** Panel-Sektionen **Ambient Light / Key Light / Fill Light**; **Cast-shadow-Checkboxen** aus UI entfernt (Key immer `castShadow=true`, Fill immer `false` — Werte bleiben in `LightingSettings`). Engine: **`LightPool`** — 10 Spot, 10 Directional, 10 Point vorkonfiguriert; Studio-Rig reserviert Spot-Slots 0+1; max. 2 Shadow-Caster.
- **Grund:** Weniger Verwirrung (Mesh-Schatten ≠ Licht-Schatten); Pool vermeidet Runtime-Alloc für v2 Multi-Light.
- **Verworfen:** Cast-shadow im Panel; `new SpotLight()` pro User-Aktion in v2.

### 2026-10-08 — Wood — Glanz + Normal-Logik
- **Entscheidung:** Woods → `MeshPhysicalNodeMaterial` + **Clearcoat 0.08** / `clearcoatRoughness 0.35`. Wood Soft: helle Bänder erhaben (`bumpMap(grain)`), Roughness sinkt mit Helligkeit. Wood Porous: Poren vertieft (`bumpMap(1-spotMask)`), Roughness in Löchern höher. Base-Roughness: Soft 0.42, Porous 0.48.
- **Grund:** Lackierter Rahmen hat dezenten Glanz; Poren müssen optisch tiefer wirken, Frühholz höher/glänzender.
- **Verworfen:** Nur Roughness ohne Clearcoat; Poren als erhabene Bumps.

### 2026-10-08 — Wood — Soft + Porous
- **Entscheidung:** `material-wood` → **Wood Soft** (`wood-soft`, Fichten-Ton helleres Gelbbraun). Neu: **Wood Porous** (`material-wood-porous`, `wood-porous`) — nur gestretchte dunkle Punkte, keine Ringe. Profil `wood-mahogany` → `wood-soft` + Migration (`normalizeProceduralProfile`).
- **Grund:** Zwei Rahmen-Looks; bisheriges Wood wirkt wie Fichte, nicht Mahagoni.
- **Verworfen:** Ein Wood; Mahagoni-Name.

### 2026-10-08 — Rahmen — Perimeter-UV Bogenlänge + Sampling pro Profil
- **Entscheidung:** `computeFramePerimeterS`: `UV.u` = globale Bogenlänge entlang Außen-Mittellinie (CCW), nicht lokal pro Balken. Procedural: `planar-meters` für `paper-grain`, `uv` für Wood/Metall; `buildProceduralSampleUv` zentral. Frame-Resolve: `surfaceRole: 'frame'`, `grainAlongU: true`. Brushed: Standard-`anisotropy`/`anisotropyRotation` (Tangent-U folgt fixierten UVs).
- **Grund:** Lokales `u` an rechter Seite sprang auf 0 → Maserung/Bürstung an senkrechten Stücken falsch; Paper braucht mm-Sampling auf dünnen Flächen.
- **Verworfen:** Triplanar; World-Space-Grain; `anisotropyNode`-H/V-Split.

### 2026-10-08 — metal-brushed — schwarze Kantenflächen
- **Entscheidung:** Rahmen-Geometrie: `toCreasedNormals(π/2)` statt `computeVertexNormals()` (harte Kanten am Extrude-Ring). Brushed: **kein Bump-Normal** — Look nur über Anisotropie + leichte Roughness-Welle; `anisotropyNode` entfernt, Standard `anisotropy`/`anisotropyRotation`.
- **Grund:** Gemittelte Normalen an 90°-Kanten → lichtabgewandte Flächen komplett schwarz; Bump auf Metall verstärkte das.
- **Verworfen:** Nur Kontrast/Sinus ohne Normalen-Fix.

### 2026-10-08 — metal-brushed — weicherer Kontrast
- **Entscheidung:** Höhenfeld **Sinus** statt `smoothstep` (keine Klippen-Normalen). Bump **×0.01**, Roughness-Modulation **±0.01**, Anisotropie **0.25** (war 0.35). Streifenabstand unverändert (~0,3 mm via Multiplikator 120).
- **Grund:** Harte Bänder → lichtabgewandte Flächen fielen ins Schwarz (Metall + steile Normalen).
- **Verworfen:** Nur Anisotropie ohne Bump; breitere smoothstep-Bänder.

### 2026-10-08 — metal-brushed — Streifenabstand ~0,3 mm
- **Entscheidung:** `BRUSHED_STREAKS_PER_TILE_UNIT` **120** (war 36). `tileScale` Gold/Aluminum Brushed **28** — ~**0,3 mm** Periode am Rahmen.
- **Grund:** Ziel echtes gebürstetes Aluminium, nicht mm-breite Bänder.
- **Verworfen:** Multiplikator 12 + tileScale 14 (~6 mm Periode).

### 2026-10-08 — Materials v2 — paper-grain (Print Matt)
- **Entscheidung:** `paper-grain` sampled in **local plane meters** (`positionLocal.xy`), nicht `uv()`. `tileScale` = **repeats per meter** (Default 400 ≈ 2,5 mm Period). Print Matt (`material-paper`) → `textured` + `paper-grain`. `createImagePbrMaterial` nutzt bei `textured` Preset procedural Normal/Roughness, überschreibt nur `colorNode` mit Cover-Image.
- **Grund:** Print-Seiten 2 mm × ~600 mm — UV-Tiling wie Wood würde auf dünnen Kanten falsch skalieren; Meter-Koordinaten = konsistente mm-Struktur auf allen Flächen.
- **Verworfen:** `buildGrainSampleUv` für Paper; Print Matt als `solid-pbr` ohne Maserung.

### 2026-10-08 — Kamera — Navigation Readout + Zoom-Semantik
- **Entscheidung:** Camera Sub-Panel Section **Navigation**: live Position, Target, Distance, Azimuth, Elevation (`getCameraReadout` / `useCameraReadout`, rAF-Poll). **Mausrad:** Persp = Dolly (radius), Ortho = `orthoZoom` (Frustum) — FOV nur Slider in Persp.
- **Grund:** User sieht Orbit-State; Ortho braucht Frustum-Zoom, nicht Dolly.
- **Verworfen:** Zoom-Wert im Readout statt Distance; FOV per Mausrad in Persp.

### 2026-10-08 — Kamera — Saved views als Slot-Karten
- **Entscheidung:** Camera Sub-Panel: **vertikal gestapelte Slot-Karten** (Badge, Name, Load/Capture/Clear) — kein horizontales Chip-Layout im schmalen Sub-Panel.
- **Grund:** ~196px Breite; Überlappung bei Mini-Chips.
- **Verworfen:** Horizontale Mini-Chips im Right Sub.

### 2026-10-08 — Kamera — Default-Label, FOV/Zoom-Slider
- **Entscheidung:** Built-in UI **Default** (ID `normal`). Camera Sub-Panel: **FOV**-Slider (Persp), **Zoom**-Slider (Ortho); Projection-Toggle **auch** im Sub-Panel (redundant zu Top Main).
- **Grund:** Einstellungen am gewählten Nav-Punkt; Top Main = schneller Modus-Wechsel.
- **Verworfen:** „Normal"-Label; Projection nur Top Main.

### 2026-10-08 — Kamera — Projection + Framing-only Load
- **Entscheidung:** **Persp/Ortho** in **Top Main** (links) **und** Camera Sub-Panel. Built-ins **und** User-Slots beim Load nur **Framing** (`applyFramingState`); Projection bleibt User-Wahl (`O` + Toggle).
- **Grund:** Projection = globaler Modus, unabhängig von gespeicherten Views.
- **Verworfen:** Slots/Built-ins stellen Projection beim Load wieder her.

### 2026-10-08 — Kamera — Built-ins behalten Projection
- **Entscheidung:** Built-in Views setzen nur Framing; Projection unverändert.
- **Grund:** Ortho/Persp unabhängig von Ansicht.
- **Verworfen:** Built-ins erzwingen Perspective.

### 2026-10-08 — Kamera — Top Main Quick Bar, Shortcuts, 3 leere Slots
- **Entscheidung:** **Top Main zentriert:** Persp/Ortho · Built-ins Default + 6 Achsen · **3** User-Slot-Chips. **Default (1)** = Reset auf Scene-Default. Slots **leer** beim Start; Capture im **Camera Sub-Panel**. Shortcuts UI-seitig: Built-ins **`1–7`**, Slots **`8–9–0`**.
- **Grund:** 10 Aktionen auf Ziffernreihe; 3 Slots reichen. Top Main = Speed; Panel = Verwaltung.
- **Verworfen:** 4 Slots + Minus; Slots vorausgefüllt; Kamera-Presets in Right Sub; Slots nur `7–0` ohne Left/Right-Shortcut.

### 2026-10-08 — Picture framed — Extrudierter Rahmen + Perimeter-UVs
- **Entscheidung:** Rahmen = **ein** `ExtrudeGeometry`-Ring (Außen − Opening), Custom-UVs: `u` entlang Balkenmitte (H ∥ X, V ∥ Y). Ein Material-Slot; Brushed-Anisotropie entlang Tangent-U.
- **Grund:** Echte Gehrung, keine Überlappung/Z-Fighting; konsistente Bürstung/Highlights an Ecken (kein falscher Streifenglanz auf senkrechten Box-UVs).
- **Verworfen:** 4× BoxGeometry; Plane-Faces; `grainAlongU` H/V-Split am Rahmen.

### 2026-10-08 — Metall-Presets — Chrome, poliert, gebürstet
- **Entscheidung:** Silver entfernt → **Chrome** (`material-chrome`, Migration von `material-silver`). Gold + Chrome: `textured` + `metal-polished` (glänzend). Neu: **Gold Brushed**, **Aluminum Brushed** (`material-aluminium-brushed`) mit `metal-brushed` + Anisotropie **~0.35**. `MeshPhysicalNodeMaterial` für Metalle.
- **Grund:** Rahmen-Metalle photorealistisch (IBL + Mikro-Struktur / Streifenglanz); klare Namensführung statt Silver.
- **Verworfen:** Silver behalten; **Silver Brushed** (Plan v2) → **Aluminum Brushed** umgesetzt; ID `material-silver` mit Chrome-Label.

### 2026-10-08 — Picture framed — Default 50 × 60 cm Hochformat
- **Entscheidung:** Referenzbreite **0,5 m**; ohne Screen-Bild Placeholder-Aspect **50/60** (Hochformat wie Echtmaß).
- **Grund:** Standard-Bilderrahmen in Agentur-Mockups; mit Bild weiterhin image-driven Ratio.
- **Verworfen:** 1,0 m Referenzbreite + 16:9 Placeholder.

### 2026-10-08 — Picture framed — Z-Aufbau (4 mm Falz, Glas 1 mm vor Bild)
- **Entscheidung:** Bild-Falz **4 mm** (statt 5); Glas **2 mm**, **1 mm** Luftspalt vor Bild (nicht bündig mit Rahmenfront). Hohlraum Bild↔Rückwand = **5 mm** (12 − 3 − 4).
- **Grund:** Realistischer Aufbau: Rahmen 12 mm, Rückwand 3 mm bündig; Rest für Bild + Glas + Luft.
- **Verworfen:** Glas bündig z = 0, Bild bei 5 mm Falz.

### 2026-10-08 — Schatten empfangen — alle Meshes, nicht nur Picture
- **Entscheidung:** `applyAssetShadowFlags(group)` zentral nach jedem Asset-Rebuild in `populateAssetGroup` — alle Meshes `receiveShadow = true`; Glazing nur receive, kein cast. `SHADOW_NORMAL_BIAS = 0.002` (statt 0.025) für sichtbare Kontaktschatten auf Prints/Screens.
- **Grund:** Requirement „alles empfängt Schatten“ gilt projektweit; hoher normalBias unterdrückte Schatten auf nah liegenden Flächen (Rahmen → Bild).
- **Verworfen:** Shadow-Flags nur pro Mesh-Typ in Picture-Code; globaler normalBias 25 mm.

### 2026-10-08 — Viewport-Tool-Shortcuts (W/E/R/T)
- **Entscheidung:** Shortcuts **UI-seitig** (`useViewportToolShortcuts` in AppShell) → Store `setMode` — gleicher Pfad wie Toolbar. Mapping W/E/R/T; keine Modifier; Guard bei Textfeldern. Tool-Definitionen zentral in `viewport-tools.ts`.
- **Grund:** Konsistenz Toolbar/Status/Engine; kein paralleler Mode-Pfad in Engine.
- **Verworfen:** Shortcuts in `SelectionController` / Engine.

### 2026-10-08 — Material-Resolver vor Default-Asset
- **Entscheidung:** Engine setzt **Builtin-Material-Resolver** (`resolveBuiltinMaterialPreset`) vor `addAsset('picture')`. Beim UI-Connect (`setMaterialPresetResolver` / `setImageResolver`) → `rebuildAllEntities()`.
- **Grund:** Default-Picture wurde mit Fallback-Grau gebaut (Resolver noch null); UI zeigte korrekt „Gold", Viewport nicht.
- **Verworfen:** Nur UI-Rebuild ohne Engine-Builtins.

### 2026-10-08 — Szene — Entity entfernen (Delete + Trash)
- **Entscheidung:** Asset-Entities löschbar per **Trash-Button** im Szene-Panel-Header (rechts, Trennlinie wie Chevron) und **Delete/Backspace** bei Selection. `removeEntity` → Scene-API; Studio-Lichter (Key/Fill) nicht per Taste löschbar.
- **Grund:** Standard-Editor-Workflow; Trash sichtbar pro Zeile ohne Kontextmenü.
- **Verworfen:** Löschen nur per Kontextmenü; Lights mit Delete entfernen (v1).

### 2026-10-07 — Scale — Y-Mittelpunkt fix (kein Boden-Kleben)
- **Entscheidung:** `setAssetSizeScale` ändert **nicht** `transform.position.y`. Mesh-Rebuild um Pivot (Gruppenmittelpunkt); User-Position bleibt. Kein `syncGroundContact` bei Scale.
- **Grund:** User will Objekt an Ort skalieren, nicht am Boden „kleben".
- **Verworfen:** Y an Footprint-Höhe anpassen bei jedem Scale (syncGroundContact).

### 2026-10-07 — Szene-Panel — Collapse + Selection-Toggle
- **Entscheidung:** Entity-Block: **Chevron** = Collapse/Expand (UI-only, `collapsedIds` lokal im Panel, nicht serialisiert); **Name-Klick** = Selection-Toggle (selected → `setSelectedEntity(null)`). Neue Selection (Viewport/Liste) → Block auto-expand + `scrollIntoView`.
- **Grund:** Lange Listen übersichtlicher; Deselect aus Panel ohne Viewport/Escape; Collapse und Selection getrennt vermeidet Mehrdeutigkeit.
- **Verworfen:** Ein Klick für Collapse + Deselect; Collapse-State in Store/Scene-Save.

### 2026-10-07 — Print-Material-Namen & Listen-Reihenfolge
- **Entscheidung:** Built-in UI-Namen: **Paper** → **Print Matt**, **Glossy Print** → **Print Glossy**. IDs unverändert (`material-paper`, `material-glossy-print`). Materials-Liste: Print-Gruppe zuerst (Matt, Glossy), dann Rahmen/Flächen, Glas zuletzt.
- **Grund:** Klarere Zuordnung zum Print-Asset; Matt vs. Glossy als Paar erkennbar.
- **Verworfen:** ID-Umbenennung (Save/Load-Bruch).

### 2026-10-07 — Materials v2 — Procedural Textured Presets
- **Entscheidung:** v2 `MaterialKind: 'textured'` mit **`proceduralProfile`** (TSL on-the-fly) — kein Bitmap-Map-Upload, **keine** Material-Maps in Images. Profile: `paper-grain`, `wood-mahogany`, `fabric-linen`, `silk-fine`, `concrete-porous`, `metal-polished`, `metal-brushed`, `glass-surface`. Paper migriert zu textured (Papiermaserung). Neue Built-ins **`material-gold-brushed`**, **`material-silver-brushed`**. Nur **ein** Wood (Mahagoni). Glossy Print bleibt `solid-pbr`.
- **Grund:** Oberflächenstruktur lichtabhängig (Normal, Anisotropie) ohne Asset-Pipeline; Images nur für Fotos.
- **Verworfen:** User Normal/Albedo-Maps in Images-Bibliothek; `/public/materials/` Bitmap-Sets; Wood-Varianten (Eiche/Walnuss); Gold-brushed nur per Duplicate.

### 2026-10-07 — Uniform Asset Scale (`sizeScale`)
- **Entscheidung:** `sizeScale` auf `AssetEntity` (Default `1`); Front-Maße = Referenzkante × `sizeScale`, Höhe aus Bild-Ratio. Gizmo-Modus `scale` mit Uniform-Constraint; Commit beim Drag-Ende → Mesh-Rebuild, `object.scale` bleibt `(1,1,1)`. Picture-Rahmen-mm skalieren mit. Print-`depth` unabhängig.
- **Grund:** User will skalieren ohne Verzerrung; `transform.scale` xyz würde Stretch erlauben.
- **Verworfen:** Freies `TransformControls`-Scaling; non-uniform Scale in Entity-Modell.

### 2026-10-07 — Selection Outline + Viewport Input
- **Entscheidung:** `SelectionHighlight` (Inverted-Hull-Outline für Assets, Wireframe-Icosahedron für Key/Fill). `ViewportInputController` zentral: LMB-Klick = Select (alle Modi), LMB-Drag = Orbit, RMB/MMB/Space-Drag = Pan. `SelectionController` nur Raycast; Emissive-Hack entfernt. Light-Rotate-Gizmo v1 deaktiviert.
- **Grund:** Selection unsichtbar, Gizmo-UX verwirrend, Select nur im Select-Modus — User konnte nicht erkennen was selektiert ist.
- **Verworfen:** Post-Processing OutlinePass; Emissive-Tint; Light-Rotate ohne Target-Handle.

### 2026-10-07 — Materials System v1
- **Entscheidung:** Store-owned `materials[]` (wie Images) + `MaterialResolver` in Engine. 10 Built-ins inkl. **Glossy Print**. Entity-Slots (`frameMaterialId`, `sideMaterialId`, …) + `faceTints` für Print. `MeshPhysicalNodeMaterial` für transmission (pane/solid). Materials Left Panel mit Editor; `invalidateMaterial` + debounced Rebuild (75 ms).
- **Grund:** Ein System für Rahmen, Print-Seiten, Glas — ersetzt hardcoded `FRAME_COLOR` und lose Side-Colors.
- **Verworfen:** PBR-Werte inline auf Entity; ein Glas-Preset mit mm-Feldern.

### 2026-10-07 — Spot-Schatten — Rig-Bugfixes (Kette)
- **Entscheidung:** Key + Fill = **SpotLight** auf Scene-Root (nicht nested). Fixes: (1) `light.position.set(0,0,0)` — ctor setzt default `(0,1,0)`; (2) `shadow.updateMatrices(light)` statt falschem FOV-Update; (3) `lighting.updateFrame()` pro Render-Frame; (4) Key `decay=0`, Fill `decay=1.5`; (5) Helper nur für Pick/Gizmo, Licht-Position synced.
- **Grund:** Schatten fehlten durch mehrere Code-Bugs in der Rig-Kette — nicht WebGPU-Limit.
- **Verworfen:** Directional-Workaround; falsche FOV-Formel in `updateSpotShadowCamera`.

### 2026-10-07 — Lighting v1 implementiert
- **Entscheidung:** `LightingSystem` + `LightingSubPanel`; `LightingSettings` in Store/Scene-API; Gizmo + Viewport-Pick für `light-key`/`light-fill` außerhalb `EntityRegistry`; Presets in `lighting-presets.ts`.
- **Grund:** Requirements v1 Studio-Rig; gleiches Panel-Muster wie Ground/Environment.
- **Offen:** Scene Save; Add Light (v2).

### 2026-10-07 — Materials-Bibliothek (Querschnitt vor Rahmen/Glas)
- **Entscheidung:** Materials-Library analog Images. Glas: zwei Presets **Glass (pane)** / **Glass (solid)** — optik im Material, **mm nur in Geometrie** (Scheibe 2 mm, Rahmen 12 mm im Asset). Kein einzelnes Clear-glass mit Rahmen-mm in der Preset-Tabelle.
- **Grund:** Gold/Silber/Holz-Rahmen + Print-Seiten + später Ground — ein System statt verteilter ColorPicker/hardcoded Werte.
- **Verworfen:** Rahmen-Farben nur im Entity-Panel; Glas/Metall als Einmal-Shader pro Asset.

### 2026-10-07 — Box + Flyer → ein Baustein `print`
- **Entscheidung:** `assetKind: 'print'` ersetzt `'box'` und `'flyer'`; ein Katalog-Eintrag, ein Prisma-Modell (`faces` + `depth`). Flyer = dünn (Default 0,002 m), Verpackung = Tiefe im Panel (z. B. 0,12 m).
- **Grund:** Gleiche Engine/UI; weniger Duplikat-Logik.
- **Verworfen:** Separate `box` / `flyer` assetKinds.

### 2026-10-07 — Faceted Prism: Box + Flyer vereinheitlicht
- **Entscheidung:** `addFacetedPrism()` für Box und Flyer; `faces` + `depth` auf Entity. Front-Breite/Höhe aus Front-Bild (Cover-UV); Tiefe separat (`setAssetDepth`, Default Box 0,12 m / Flyer 0,002 m). Flyer: Front+Back Bild; Seiten near-white (`0.98`).
- **Grund:** Flyer = Box mit anderer Tiefe; Spieleverpackung kein Würfel; Bild ändert nur Front-Maße, nicht Tiefe.
- **Verworfen:** Separater Flyer-Mesh (`BoxGeometry`); feste 0,5 m Box-Würfel.

### 2026-10-07 — Box: universelles `faces`-Modell (6 Seiten)
- **Entscheidung:** `AssetFaces` / `AssetFaceContent` (`color` | `image`) pro Seite; Box-Mesh = 6 Planes mit je eigenem Material. Front = Bild (wie Flyer); Back = Farbe oder Bild; Seiten/Oben/Unten = Farbe. `SceneApi.setAssetFace()`; Szene-Panel **Faces**-Sektion für Box.
- **Grund:** User-Wunsch „Vorderseite wie Flyer, Seiten farbig, Rückseite Farbe oder Bild“; universell erweiterbar wenn später alle Seiten Bilder tragen.
- **Verworfen:** Einfarbig-grauer Würfel ohne Face-API; nur `screenImageId` ohne `faces`.

### 2026-10-07 — Szene-Panel statt Selection-Overlay + Mockup-Maßstab
- **Entscheidung:** Right Main **Szene** listet alle Entities im Sub-Panel untereinander (Image + Transform pro Block). Viewport-Selection synced (Highlight + scrollIntoView). Kein Right-Sub-Overlay mehr bei Selection.
- **Maßstab:** Asset-Referenzgrößen ~3× (Flyer 0,6 m, Picture 1,0 m, Box 0,5 m); Kamera Default-Radius 2,5 m, Min-Zoom 0,35 m, Target-Y 0,3 m — Realmaß später optional.
- **Grund:** Selection-Overlay verdrängte Environment/Ground; Objekte wirkten winzig (0,2 m Assets + 4 m Min-Kamera-Distanz).
- **Verworfen:** Selection ersetzt Right Sub (Variante A).

### 2026-10-07 — Lighting Panel v1 — Studio-Rig (Ambient / Key / Fill) [Requirements]
- **Entscheidung:** v1 = drei feste Rollen (kein Add Light bis v2). Gizmo Key+Fill; Fill: Ratio zu Key (50 %) + Distance; **Follow scene center** vs. world-fixed; Presets Key Left/Right, High Contrast, Soft Studio; Near-White-Defaults.
- **Grund:** Mockup-typisches 3-Punkt-Studio; Key/Fill-Geometrie ±45°/45° bzw. Fill 35°.
- **Implementierung Lichttyp:** Key + Fill Spot — siehe Diary „Key + Fill = SpotLight (Rig-Bugfix)".

### 2026-10-07 — Assets v1 — Entity Registry + 3 Built-ins
- **Entscheidung:** `EntityRegistry` + `AssetSystem` in Engine; `SceneApi` erweitert (`addAsset`, `selectEntity`, `setAssetImage`, `subscribe`). Built-ins v1: **Flyer**, **Box**, **Picture** — parametrisch, image-driven sizing via `computeFaceSize`. Images zentral im Store (`image-assets.ts`); Engine resolved Texturen per `setImageResolver`. Selection: Raycast + Right Sub **Selection**-Panel (Screen + Transform). Gizmo wieder aus `_deleted/` — nur auf Asset-Entities, keine Physics.
- **Grund:** Requirements `requirements-assets.md`; ein Entity-Muster für alle Bausteine; UI↔Engine-Grenze bleibt `SceneApi`.
- **Verworfen:** Legacy `AssetSidebar`; separates `requirements-devices.md`; Drag-to-viewport in v1.

### 2026-10-07 — Planar Mirror (Ground) — TSL reflector()
- **Entscheidung:** `PlanarReflectionPass` (`reflector()` aus `three/tsl`); `GroundMaterial.setupOutput` mischt PBR + Mirror (`mirrorOpacity × (1 − roughness)`). Target als Child des Ground-Mesh; Pass nur wired wenn `mirrorEnabled`. Max RT 1024px.
- **Grund:** Phase C `requirements-reflections.md` — scharfe Objektspiegelung für Produkt-Mockups; WebGPU-native statt manueller RT-Pass.
- **Verworfen:** Separater Custom-Render-Pass in `render-pipeline.ts`; Mirror immer im Shader-Graph (Performance).

### 2026-10-07 — IBL aus Sky (PMREM) + Reflection Intensity
- **Entscheidung:** `SkyEnvironmentMap` (`src/render/environment-map.ts`): PMREM aus Sky-Gradient via `PMREMGenerator.fromScene`, shared `SkyboxMaterial`, `scene.environment` auf Main-Scene. Rebuild debounced (100 ms) bei Sky-Edits. UI: Environment → Reflections (Enable + Intensity 0–2).
- **Grund:** PBR-Ground braucht IBL für glaubwürdige Reflexionen; Roughness/Metalness allein reichen nicht. Requirements `requirements-reflections.md` Phase A/B.
- **Verworfen:** Separate PMREM-Material-Kopie (Uniform-Sync); SSR.

### 2026-10-07 — Ground Panel v1 — PBR + Emissive
- **Entscheidung:** `GroundSettings` (eigenes Objekt, Store + Scene-API); Material via `GroundMaterial` Uniforms (`roughnessNode`, `metalnessNode`, `opacityNode`, `emissiveNode`); UI: `RangeSlider` + Input (3 Dezimalen, Step 0.001), `PanelCheckbox`, Eye-Toggle im SubPanel-Header, 5 Preset-Chips. Bild/Textur v1 ausgelassen.
- **Grund:** Requirements `requirements-ground.md`; feine PBR-Kontrolle für Mockups; gleiches Slider-Pattern wie Environment/Fog.
- **Verworfen:** `groundColor` in `EnvironmentState`; Metalness „später"; Emissive nur als Hex ohne Intensity-Slider.

### 2026-10-07 — Panel Property-Zeilen + Slider ohne Overflow
- **Entscheidung:** Gemeinsame CSS-Klassen `panel-field-*` für ColorPicker + `SliderValueField`; Slider-Styling `panel-slider` (ein Block für Range + Dual). Thumb-Position mit 7px Inset (`thumbLeftCss`, `pointerToRatio`). Sub-Panel `overflow-x: hidden`.
- **Grund:** Doppeltes CSS und uneinheitliche Zeilen; Thumbs bei 100% ragten 1px über Panel → horizontaler Scrollbar.
- **Verworfen:** Getrennte `range-slider__*` / `dual-range-slider__value-*` Styles; `overflow: hidden` am Track (clippt Thumb-Hälfte).

### 2026-10-07 — Sky Horizon fade — Uniform live + UI Prozent
- **Entscheidung:** `horizonEnd` per Arithmetik (`0.9 - fade * 0.85`), nicht `mix(float, float, uniform)`; `createFloatUniform`. UI: **Horizon fade** + Wertzeile **Fade** in **%** (`valueDisplayScale=100`).
- **Grund:** `mix()` mit Uniform wurde beim Shader-Compile eingefroren — Slider wirkte tot. Prozent verständlicher als `0.35`.
- **Verworfen:** Nur Read-only Zahl unter Slider ohne Label/Einheit.

### 2026-10-07 — Sky-Pass: Color-Buffer behalten + opaque Canvas
- **Entscheidung:** `renderSceneFrame`: Pass 2 mit `autoClear = false`, nur `clearDepth()`; `WebGPURenderer({ alpha: false })`.
- **Grund:** Zweiter `render()` mit `autoClear=true` löschte Sky-Pixel (transparent → CSS-Grau `#f0f0f0`); Sky-Gradient war unsichtbar trotz korrektem Shader.
- **Verworfen:** Ein-Pass mit Sky in Main-Scene (Fog/Lights-Konflikt).

### 2026-10-07 — Sky-Gradient Fix (unlit + positionLocal)
- **Entscheidung:** `SkyboxMaterial`: `lights = false`, `fog = false`; Gradient über `normalize(positionLocal).y` statt `positionWorldDirection`. `skyScene` ohne fog/background.
- **Grund:** `MeshBasicNodeMaterial` mit `lights = true` + komplexem mix-Node lieferte weißgrauen Himmel ohne Live-Farben; Ground-Pattern braucht unlit Basic für Sky-Pass.
- **Verworfen:** `positionWorldDirection` für Sky-Kugel; Lighting auf Sky-Material.

### 2026-10-07 — Sky-Gradient (2 Farben + Fade)
- **Entscheidung:** Skybox = TSL-Gradient (`skyHorizonColor`, `skyZenithColor`, `skyGradientFade`) in `SkyboxMaterial`; Fade = Höhe des Horizont-Bands (0 = weit oben, 1 = knapp über Horizont). UI: 2× ColorPicker + `RangeSlider`.
- **Grund:** Flache Einzelfarbe wirkte wie Bug; Gradient macht Sky-Edits sichtbar und realistischer. Uniform-Pattern wie Ground (`createRgbUniform`).
- **Verworfen:** Three `Sky.js` (physikalisch, Overkill); flaches `setSkyColor`.

### 2026-10-07 — Rapier-Physik: Registry + Three-Trennung
- **Entscheidung:** `src/physics/` ohne Three-Imports — `PhysicsWorld`, `PhysicsBody`, Fixed-Timestep-Accumulator. Engine hält `PhysicsBinding[]` und synct nach `step` via `physics-sync.ts`. Debug-Würfel isoliert in `debug-physics-cube.ts`, kein Gizmo.
- **Grund:** Requirements (`requirements-code.md`): Physics→Graphics-Sync in Engine, Registry statt Raw-Handles, 1 unit = 1 m, Ground-Collider an `GROUND_PLANE_SIZE`.
- **Verworfen:** `syncMesh(mesh)` in PhysicsWorld; Three-`RapierPhysics`-Addon (CDN + Mesh in Physics).

### 2026-10-07 — TSL RGB-Uniform: Vector3 statt vec3()-Node
- **Entscheidung:** `createRgbUniform()` nutzt `uniform(new Vector3(r,g,b))` — **nicht** `uniform(vec3(r,g,b))`. Live-Update via `uniform.value.set()`.
- **Grund:** `uniform(vec3(...))` extrahiert intern nur den letzten Const-Wert (Skalar) — falsche Sky-Farbe, `.set()` schlägt fehl, keine Live-Updates für Sky/Ground.
- **Verworfen:** TSL-`vec3()` als Uniform-Initialwert.

### 2026-10-07 — ViewportFrame: StrictMode-Race
- **Entscheidung:** `cancelled`-Flag im Engine-`useEffect` — async `create()` nach Unmount disposed und setzt kein `sceneApi`.
- **Grund:** React StrictMode kann alte Engine-Instanz nach neuer registrieren → Store ruft tote/falsche Instanz auf.

### 2026-10-07 — Scene-Defaults, EnvironmentSystem, RenderPipeline
- **Entscheidung:** Alle Panel-/Engine-Startwerte in **`SCENE_DEFAULTS`** (`src/config/scene-defaults.ts`). Environment-Updates in **`EnvironmentSystem`**; Zwei-Pass-Render in **`render-pipeline.ts`**. Store sync via **`applyEnvironment`** (Batch); Einzel-Setter für Live-Edits bleiben.
- **Grund:** Defaults waren verstreut (constants + doppelte Fog-Farben); MockupEngine war God-Object; weißer Fog + grauer Boden machten Farbänderungen unsichtbar. Neue Palette (Cyan-Sky, Sand-Ground, Blaugrau-Fog, 25–100 m) bewusst unterscheidbar.
- **Verworfen:** Farb-Defaults in `constants.ts` behalten; weiterhin 5 einzelne Store→API-Calls beim Mount.

### 2026-10-07 — Ground-Farbe live (WebGPU)
- **Entscheidung:** Boden = **`GroundMaterial`** (`MeshStandardNodeMaterial` + TSL-`uniform` für Albedo), wie Skybox — **nicht** `MeshStandardMaterial.color.setRGB`.
- **Grund:** WebGPU aktualisiert Legacy-`.color` zur Laufzeit nicht zuverlässig; Uniform `.value.set()` funktioniert.
- **Verworfen:** Direktes `material.color` ohne Node-Uniform.

### 2026-10-07 — Längen: Meter mit 3 Dezimalen (mm-Genauigkeit)
- **Entscheidung:** Engine = **Meter** (1 unit = 1 m). UI-Längen/Abstände = **Meter-Anzeige mit 3 Nachkommastellen** (`8.000` m), Schritt **0.001 m** — kein separates mm-Feld.
- **Grund:** Mockup-Studio-Skala; Millimeter über Dezimalstelle, einheitlich lesbar.
- **Verworfen:** Reine mm-Einheit in der UI.

### 2026-10-07 — Ground-Panel UI + shared ColorPicker
- **Entscheidung:** Ground: Visibility = **Eye-Icon** im Header; Farbe = **`ColorPicker`** (eigene Komponente, Figma-like Popover) — wiederverwendbar für Sky/Fog/Lights.
- **Grund:** Kompakt, konsistent; kein natives color input, kein Text „Visible On".
- **Verworfen:** Disabled Hex-Textfeld als Dauerlösung.

### 2026-10-07 — Bilder: Aspect Ratio nie verzerren
- **Entscheidung:** Projektweit Ratio einhalten (UI + 3D + Export); Stretch/fill nur mit Checkbox **Override aspect ratio**.
- **Grund:** Mockups müssen glaubwürdig bleiben; Verzernung bewusst opt-in.
- **Verworfen:** Stretch als Default-Mapping am Ground.

### 2026-10-07 — Gimbals: WebGPU-Material-Upgrade
- **Entscheidung:** `TransformControls`-Helper nach Erzeugung: Legacy-Materialien → `MeshBasicNodeMaterial` / `LineBasicNodeMaterial` (`gizmo-material-upgrade.ts`).
- **Grund:** Addon importiert aus `three` (WebGL) — mit `WebGPURenderer` sonst **unsichtbar**.
- **Verworfen:** Nur Addon ohne Upgrade.

### 2026-10-07 — Gimbals: TransformControls + Toolbar-Modi
- **Entscheidung:** `TransformControls` (Three Addon) in `GizmoController`; AppMode `translate` | `rotate`; Top-Sub Viewport-Tools; Physics-Body folgt Mesh im Transform-Modus.
- **Grund:** Schneller stabiler Demo-Slice; Orbit blockiert nur während Gizmo-Drag.
- **Verworfen:** Eigenes TSL-Gizmo in v1.

### 2026-10-07 — UI-Demo als Design-Referenz
- **Entscheidung:** Freigegebene Demo-Shell → bindende Design-Richtlinien in `requirements-look-and-feel.md` (Tokens, Dichte, Main/Sub).
- **Grund:** User-Freigabe „absolut perfekt" — einheitlicher Look für alle Features.

### 2026-10-07 — Main-Nav + Sub-Detail, kompakte UI
- **Entscheidung:** Main-Panels = Icon-Nav (Hauptpunkte), Sub-Panels = Einstellungen dazu; Main einklappbar auf Icon-Rail; Top-Toolbar Icon-only ~28px.
- **Grund:** Feedback „zu plump"; Figma-like Dichte; klare Trennung Navigation vs. Detail.
- **Verworfen:** Accordion-Stack im Right Main; große Text-Buttons oben.

### 2026-10-07 — UI Dummy Demo: Shell-Struktur
- **Entscheidung:** `AppShell` in `src/ui/layout/`, Platzhalter in `src/ui/demo/`, wiederverwendbar: `ScrollPanel`, `PanelSection`, `Icon`.
- **Grund:** Demo-Code klar von späteren echten Panels trennen; Shell-Bausteine bleiben.
- **Verworfen:** Alte 3-Spalten-Components (`Toolbar`, `AssetSidebar`, …) direkt erweitern — passt nicht zum 5-Spalten-Layout.

### 2026-10-07 — Icons: Lucide
- **Entscheidung:** [`lucide-react`](https://lucide.dev/icons/) als einziges UI-Icon-Set.
- **Grund:** Figma-like Stroke-Stil, tree-shaking, ISC-Lizenz, breite Abdeckung.
- **Verworfen:** Phosphor (Weights nice, aber ein Stil reicht), Material/Font Awesome.

### 2026-10-07 — Viele Panels: Scroll + Accordion
- **Entscheidung:** Left/Right Main+Sub jeweils **vertikal scrollbar**; Inhalte als **Panel Sections** (Accordion) in einer Spalte, nicht pro Feature eine Spalte.
- **Grund:** Skaliert bei Environment, Ground, Camera, Lights, Assets ohne Layout-Explosion.
- **Verworfen:** Separates Fog-Panel — Fog als Untersektion unter Environment.

### 2026-10-07 — Environment-Panel-Struktur
- **Entscheidung:** Sky + Fog = eine Environment-Section; Ground = eigene Section darunter.
- **Grund:** Fog optisch/technisch an Himmel gekoppelt; Boden hat andere Parameter (Material, Textur).

### 2026-10-07 — Docs first, dann Querschnitt, dann Code
- **Entscheidung:** Workflow in `requirements-development-workflow.md` + `development-workflow.mdc`; Querschnitt in `requirements-architecture.md`.
- **Grund:** Kein Code der „100× adaptiert" werden muss; gemeinsame Nenner (Entity, Scene-API) vor Implementierung klären.
- **Verworfen:** Feature-weise direkt coden ohne Requirement-Datei.

### 2026-10-07 — Multi-Light & Placement & Camera (geplant)
- **Entscheidung:** Unbegrenzt viele Lichter aller Three-Typen; ein **Entity-System** für alles Platzierbare; Kamera-Panel + **speicherbare Presets**.
- **Grund:** Mockup-Studio braucht volle Licht-Kontrolle und wiederholbare Export-Views — nicht nur eine Sonne.
- **Status:** Lighting **v1** (Studio-Rig) umgesetzt; **Camera v1** (Orbit, Presets, Quick Bar, Sub-Panel) umgesetzt; Multi-Light **v2** offen.

### 2026-10-07 — App-Shell Layout
- **Entscheidung:** Top Main + Top Sub + Mittelzeile `MainLeft · SubLeft · Viewport · SubRight · MainRight` + Status; Main/Sub **horizontal** nebeneinander (Main außen, Sub innen).
- **Grund:** Figma-like; Sub näher am Viewport für Presets/Filter, Main außen für Bibliothek/Properties.

### 2026-10-07 — Scene-API als einzige UI↔Engine-Grenze
- **Entscheidung:** React spricht nur über `src/scene/scene-api.ts`; kein Three in UI.
- **Grund:** Klare Schicht, testbar, später Save/Serialisierung an einer Stelle.

### 2026-10-07 — Schatten-Pflicht
- **Entscheidung:** Alles cast + receive Shadows (Meshes); Ausnahme Skybox; min. 2048 Shadow-Map; `applyFullShadowFlags()` für neue Meshes.
- **Grund:** Photorealistische Mockups leben von glaubwürdigen Schatten.

### 2026-10-07 — Kamera-Navigation
- **Entscheidung:** Perspective-Orbit (Primary) + Orthographic (Toggle `O`); **Space + Drag = Pan**; Mausrad Zoom (Persp: Dolly, Ortho: Frustum); Engine in `camera-controller.ts`.
- **Grund:** Figma/Blender-artige Navigation; Ortho für maßstabsgetreue Mockups.

### 2026-10-07 — React nur UI-Chrome, Engine Vanilla TS
- **Entscheidung:** React 19 für Shell/Panels; **kein** R3F; Three WebGPU + Rapier in `src/engine/`, `src/render/`, `src/physics/`.
- **Grund:** Kein Re-Render pro Frame; WebGPU-Lifecycle sauber; Beispiel-Code meist WebGL/R3F — passt nicht.

### 2026-10-07 — WebGPU only
- **Entscheidung:** Nur `three/webgpu`; bei fehlendem `navigator.gpu` UI-Meldung, kein WebGL-Fallback.
- **Grund:** Hard Requirement Projekt; kein doppelter Render-Pfad pflegen.

### 2026-10-07 — Browser-only
- **Entscheidung:** Kein Electron/Backend-Kern; alles clientseitig im Browser (Desktop + Mobile).
- **Grund:** Projektscope Mockup-Studio, nicht Desktop-App.

### 2026-10-07 — Stack-Versionen
- **Entscheidung:** Three **0.186**, React **19.3**, TS **5.9** (strict), Vite **8**, Rapier `@dimforge/rapier3d-simd-compat`, TSL für Custom-Materialien.
- **Grund:** TS 7.x inkompatibel mit eslint-typescript; TSL braucht explizite Fn-Typen + `.setLayout()`.

### 2026-10-07 — Skybox & Ground (Initial)
- **Entscheidung:** Solid-color Skybox (eigene Scene, BackSide Sphere); großer Ground-Plane; weißer Fog linear; Rapier static ground.
- **Grund:** Schnell sichtbare Demo-Szene; Skybox ohne Shadow; Ground fixed (nicht platzierbar).

### 2026-10-07 — Code-Sprache & Cleanup
- **Entscheidung:** Code/Kommentare **Englisch**; Docs/Requirements Deutsch ok; gelöschte Dateien nach `/_deleted/` umbenennen, nicht löschen.
- **Grund:** Team-Konvention; History behalten.

### 2026-10-07 — Dev-Server
- **Entscheidung:** Vite Port **4040**; Dev-Server startet **User**, Agent **nie** `npm run dev`.
- **Grund:** HMR läuft dauerhaft; Agent soll Server nicht doppelt starten.
