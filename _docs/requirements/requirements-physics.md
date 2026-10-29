# Physics

**Engine:** [Rapier](https://rapier.rs/) (`@dimforge/rapier3d-simd-compat`) — **kein** GPU-Cloth, **kein** separater Verlet-Solver.

**Bezüge:** Block → [`requirements-assets-block.md`](./requirements-assets-block.md). Zylinder → [`requirements-assets-cylinder.md`](./requirements-assets-cylinder.md). Stoff → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md). Panel-Layout → [`requirements-app-layout.md`](./requirements-app-layout.md). Rigid-Test-Würfel → [`requirements-physics-test.md`](./requirements-physics-test.md). Export/Freeze → [`requirements-export.md`](./requirements-export.md).

**Status (kurz):** Boden **immer** Fixed. **World physics** (Start/Freeze/Reset) implementiert. **Block:** `physicsBodyMode`, `physicsDensityKgPerM3`, Collider-Margin, globale Kontakt-/Damping-Konstanten. **Stoff:** Rapier **SoftBody** auf subdividiertem Flatlay-Mesh (`resolveFabricDrape`, `FabricClothPhysicsColliders`). **Offen:** Zylinder-Physik. Export Stoff: WYSIWYG → [`requirements-export.md`](./requirements-export.md).

---

**Category:** Physics  
**Title:** Nutzer-Ziel  
**Description:** Szene **bauen** (Block, Zylinder, Stoff, Maße/Radien, …) — pro Objekt im **Asset-Editor** wählen, ob es **Fixed** oder **Dynamic** ist — dann **Physik Start**: alles Teilnehmende verhält sich entsprechend (Dynamic: Fallen, Kollision, Reibung; Fixed: Hindernis). **Freeze** = Pose halten. **Reset** = Stand von **Start**. Keine Auto-Physik beim Laden.

---

**Category:** Physics  
**Title:** Fixed / Dynamic — Asset-Editor (Scene-Panel)  
**Description:** Für **rigide** Assets mit Physik-Collider (**Block**, **Cylinder**, später weitere Props): Feld **`physicsBodyMode`**.

| Wert | Bedeutung |
|---|---|
| **fixed** | Statisches Hindernis — bleibt, wo es liegt (User bewegt per Gizmo → Collider-Pose mit). |
| **dynamic** | Rigider Körper — ab **Physik Start** in Rapier **Dynamic** (Schwerkraft, Kollision). **Idle** (vor Start, nach Reset): **kein** Rapier-Body — kein Collider für Stoff/andere Dynamics. |

**UI:** Sektion **Physics** (oder Unterpunkt in Dimensions) im **Right Sub**, wenn Entity selektiert — **nicht** im globalen Physics-Nav verstecken. Default **`dynamic`** (fällt/kollidiert ab Start); **`fixed`** für Podeste und Hindernisse.

**Stoff (`fabric-cloth`):** kein Fixed/Dynamic-Toggle — bei World-**Start** immer Stoff-Simulation (Rapier); Ruhezustand ohne Session = nur Mesh.

**Boden:** immer **fixed**. **Rigid-Test-Würfel** (Panel **Test**): separates Debug-Objekt, nicht `physicsBodyMode`.

Scene-API: `setPhysicsBodyMode`, `setPhysicsDensityKgPerM3` (Block). Serialisierung in Entity-JSON.

---

**Category:** Physics  
**Title:** Dichte & Gewicht — Block / Zylinder (Asset-Editor)  
**Description:** Jedes **Block**- und **Cylinder**-Entity speichert **`physicsDensityKgPerM3`** (pro Instanz, nachträglich änderbar).

| Feld | Default | UI |
|---|---|---|
| **`physicsDensityKgPerM3`** | **1000** (≈ Wasser, **1 kg/dm³**) | **Density** (kg/m³) |
| **Masse (berechnet)** | — | **Weight** (kg), **read-only** |

**Formel (Dynamic):** `massKg = volumeM3 × physicsDensityKgPerM3`. Volumen aus aktuellen **`blockParams`** / **`cylinderParams`**. **Masse v1 (Block):** Rechteck-Volumen `widthM × heightM × depthM` — **Corner radius** wird nicht vom Volumen abgezogen (leichte Überschätzung; siehe `blockVolumeM3` im Code). Langfristig: eine Quelle für Mesh/Collider **und** Masse inkl. Fillet. Bei Maß-Änderung im Panel: Gewicht-Anzeige **live** neu berechnen; nach **Physik Start** Rapier-Masse aktualisieren (Rebuild Body oder `setMass`).

**Fixed:** Dichte speichern und anzeigen (Mockup-Metadaten); Rapier Fixed hat keine Trägheitsmasse — wirkt erst bei Wechsel auf **dynamic** oder neuem **Start**.

**Clamps:** Dichte **50–15 000 kg/m³** (`physics-rigid-body.ts`, Block-Panel).

**API:** `setPhysicsBodyMode(entityId, 'fixed' | 'dynamic')`, `setPhysicsDensityKgPerM3(entityId, kgPerM3)` (Synonym in Docs: `setPhysicsDensity`). Scene Save: `physicsDensityKgPerM3` + `physicsBodyMode` am Entity.

**Stoff:** keine kg/m³ am Block-Panel — Flächendichte / Drape über Material → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md).

---

**Category:** Physics  
**Title:** Einheiten & Schwerkraft  
**Description:** SI: **m**, **kg**, **s**. Gravity **−9,81 m/s²**, Panel **Gravity scale** **0,01–2** (`GRAVITY_SCALE_MIN` = **0,01** — kein **0**, damit Fall/Simulation auch bei „schwacher“ Schwerkraft noch sichtbar bleibt).

---

**Category:** Physics  
**Title:** Collider — einheitlicher Physik-Sicherheitsabstand (nur Rapier)  
**Description:** Alle **sichtbaren** Meshes bleiben exakt; **nur** Rapier-Collider tragen einen **globalen, festen** Abstand, damit Kontakte nicht „durch“ dünne Flächen oder scharfe Kanten zittern und Stoff/Props sich zuverlässig trennen.

| Konstante (Ziel) | Wert |
|---|---|
| **`PHYSICS_COLLIDER_MARGIN_M`** | **0,005 m** (**5 mm** = **0,5 cm**) |

**Nicht** auf Masse, Panel-Maße, Export-Mesh oder UI-Dimensionen anwenden — **nur** Collider-Geometrie in Rapier. Zentrale Definition in `src/physics/constants.ts` (bzw. Hilfsfunktionen in `src/physics/`).

| Teilnehmer | Regel |
|---|---|
| **Rigide Props** (Block, Zylinder, Sphere, Rigid-Test-Würfel) | Sichtbare Außenhülle **+ 5 mm** Physik-Margin (nur Rapier). **Bottom-Pivot:** Mesh-Fuß unverändert; Collider-Unterkante **5 mm unter** sichtbarer Unterkante → Dynamic liegt nach Fall mit **`position.y = 0,005 m`** (Fuß), nicht 0. **Block mit Fillet:** Rapier `roundCuboid` — **inner** Half-Extents = Mesh-Half + Margin **minus** `borderRadius`. **Sharp Box:** `cuboid` mit Mesh-Half + Margin. **Zylinder:** `cylinder` (ggf. gerundete Kreiskanten analog Block-Fillet-Regel). **Sphere:** `ball` mit Collider-Radius = **`radiusM + 5 mm`**; Masse aus **`(4/3)π radiusM³`** ohne Margin. |
| **Masse / Weight** | Volumen aus **Panel-Maßen** (ohne Margin) — Collider-Inflation ändert **nicht** `massKg`. |
| **Fabric cloth (SoftBody)** | Fuß-Pivot = **Stoffebene** (Unterseite der Bahn). Kontakt über **Partikel-Surface-Collider** mit Radius **`PHYSICS_COLLIDER_MARGIN_M` (5 mm)** — **kein** separates Rigid-Plane-Slab. Stapel **Block–Stoff:** nach Settle typ. **~1 cm** sichtbarer Spalt (je **0,5 cm** Margin Block + Stoff-Partikel). Footprint **X/Z** = Bildbahn, **kein** extra Margin-Streifen an der Kante. Render-Mesh bleibt dünn; Margin nur Rapier. |
| **Boden** | Ground-Collider **ohne** diesen Margin (eigene feste Halb-Dicke `GROUND_HALF_THICKNESS` — Kontaktfläche Szene, kein Asset). |

**Zielbild:** Ein fallender Würfel „fühlt“ die Block-Kante **leicht früher** als das Pixel-Mesh; ein Tuch kollidiert mit **1 cm** dickem Kontaktvolumen statt einer mathematischen Null-Ebene — ohne dass das Render-Mesh dicker wird.

---

**Category:** Physics  
**Title:** Kontaktverhalten — satt liegen bleiben (kein Gummiball)  
**Description:** Mockup-Physik ist **kein** Spiel-Sandbox-Look: fallende **Dynamic**-Körper (Block, Zylinder, Rigid-Test-Würfel) sollen **nicht** wie ein Gummiball **abprallen**, **nachfedern** oder **mehrfach hüpfen**. Ziel: Aufprall → Energie verlieren → **ruhig liegen bleiben** (Reibung, kein Feder-/Gummi-Eindruck).

| Aspekt | Vorgabe |
|---|---|
| **Restitution (Elastizität)** | **0** auf Boden und allen rigiden Dynamic-Collidern — keine bewusste Sprungenergie. |
| **Reibung** | Boden und Körper mit ausreichend hoher Reibung (zentrale Werte in `src/physics/constants.ts`) — Rutschen nur soweit physikalisch plausibel, nicht ewig gleiten. |
| **Dämpfung** | Siehe Abschnitt **Damping — alle Dynamic-Rigid-Bodies** (Pflicht für jeden Dynamic-Rapier-Body). |
| **Stoff (SoftBody)** | Surface-Collider **Restitution 0** — kein federndes Abprallen am Boden. |
| **UI v1** | **Kein** Nutzer-Slider „Bounciness“, **keine** Feder-/Spring-Joints. |

Kurzzeitiges numerisches Zittern beim Stillstand ist tolerierbar; Rapier **`sleep()`** nach **Freeze** und stabile Ruhepose sind das Ziel. Material-Presets (Glas, Gummi-Look im Render) ändern **nicht** die Rapier-Elastizität — Kontakt bleibt mockup-trocken.

---

**Category:** Physics  
**Title:** Damping — alle Dynamic-Rigid-Bodies  
**Description:** Jeder **Dynamic**-`RigidBody` in Rapier erhält **lineare** und **rotatorische** Dämpfung aus **einer** zentralen Konstanten-Quelle (`src/physics/constants.ts`) — damit Aufprall, Gleiten und Kippen schnell abklingen (Mockup: **satt liegen**, kein ewiges Rockern).

| Gilt für | Gilt nicht für |
|---|---|
| Block **`physicsBodyMode: dynamic`** (nach World-**Start**) | **Fixed**-Collider (Block/Zylinder-Hindernis, Boden) |
| **Rigid-Test-Würfel** (Panel **Test**) | |
| Später: **Cylinder** **dynamic** | |
| **Fabric cloth** (SoftBody) | Eigenes Drape (`resolveFabricDrape` → `linearDamping`, Feder-Damping, `deformationDamping`) — **nicht** `PHYSICS_DYNAMIC_*` |

| Konstante (Ziel) | Rolle |
|---|---|
| **`PHYSICS_DYNAMIC_LINEAR_DAMPING`** | Rapier `linearDamping` |
| **`PHYSICS_DYNAMIC_ANGULAR_DAMPING`** | Rapier `angularDamping` |

**Engine:** Ein Spawn-Pfad (`createDynamicRigidBody` in `physics-world.ts`) — **kein** zweites `RigidBodyDesc.dynamic()` ohne diese Werte. **CCD** (`setCcdEnabled(true)`) für **rigide** Session-Dynamics v1 (Test-Würfel, Blöcke, …). **UI v1:** kein Damping-Slider; nicht pro Asset überschreibbar.

**Fabric cloth:** Damping und Masse aus **`resolveFabricDrape`** / Flächendichte — separates Thema von rigid `PHYSICS_DYNAMIC_*`.

---

**Category:** Physics  
**Title:** World physics — Session  
**Description:**

| Control | Wirkung |
|---|---|
| **Start** | Snapshot Transforms; spawn **Dynamic**-Bodies (Mode **dynamic** + Stoff); **simulating** |
| **Freeze** | Phase **paused** — Dynamic-Bodies **`sleep()`**; Stoff: **kein** weiterer Vertex-Sync aus Rapier. Voraussetzung für **Bake** (User-Asset) — Bake ist **eigener** Button, nicht automatisch beim Freeze. |
| **Bake** | Nur bei **`paused`**; Ziel = **`selectedEntityId`** (muss bake-fähig sein, v1: `fabric-cloth` mit Cloth-Session). Schreibt **User-Asset** in Left **Assets** — → [`requirements-assets.md`](./requirements-assets.md). **Disabled** ohne gültige Selektion. |
| **Reset** | Dynamics weg; Transforms = Snapshot; **idle** |

`startWorldPhysics()`, `toggleWorldPhysicsPause()`, `resetWorldPhysics()`, `bakeSelectedToUserAsset()` (Ziel-API) — **Right Sub-Panel Physics** (Start / Freeze / **Bake** / Reset), **kein** globaler Tastatur-Shortcut v1.

---

**Category:** Physics  
**Title:** Teilnehmer bei Start  
**Description:**

| Asset | Collider | Bei **Start** |
|---|---|---|
| **Block / Cylinder** | Form aus Params + Corner radius | **fixed** → Fixed-Body; **dynamic** → Dynamic-Body |
| **Fabric cloth** | Subdividiertes Flatlay-Mesh | Rapier **SoftBody** (Cloth-Sim) |
| **Boden** | Fixed | immer |

**Code:** Block **fixed/dynamic** umgesetzt (`physics-participants.ts` für Zähler/Status-Helfer). **Cylinder** noch offen.

---

**Category:** Physics  
**Title:** Global Physics-Panel  
**Description:** Right Nav **Physics**: **World physics** (Start / Freeze / **Bake** / Reset), **Test**, **Gravity scale** (**0,01–2**, Default **1** — Minimum **0,01**, kein Null-Schwerkraft). Kein Ersatz für **Fixed/Dynamic** am Objekt. **Bake** lebt primär hier (zusätzlich optional dieselbe Aktion im Szene-Panel der Selektion).

**Userflow — Stoff als User-Asset (v1, normativ):**

1. **Right → Physics** Panel offen; mindestens ein **`fabric-cloth`** in der Szene.
2. **Start** — World physics **`simulating`**; Tuch drapiert.
3. **Freeze** — Phase **`paused`**; Pose bleibt sichtbar (grobes Sim-Mesh).
4. Im **Viewport** das zu backende Tuch **mit der Maus selektieren** (Raycast/Pick wie üblich; bei mehreren Tüchern explizit das richtige).
5. **Bake** im Physics-Panel — ein neuer **User-Asset**-Eintrag in **Left → Assets**; Quell-Instanz **bleibt** in der Szene (`paused`).

**Reihenfolge Selektion:** Freeze **vor** Selektion wie oben ist der Referenz-Flow; Selektion **vor** Freeze ist erlaubt, solange beim Bake-Klick **`paused`** + bake-fähige Selektion gilt. **Bake** während **`simulating`** oder ohne Selektion: **nicht**.

---

**Category:** Physics  
**Title:** Fabric cloth (Stoff)  
**Description:** Nur Rapier. Deformierendes Cloth-Mesh via **`SoftBodyDesc.clothAnisotropic`** (`@dimforge/rapier3d-simd-compat`) auf dem **Render-**`PlaneGeometry`. Integrationsreferenz (Step-Order, Material-Limits): [botrail/rapier-cloth](https://github.com/botrail/rapier-cloth). UVs fix während Sim (Border: `restPlaneXY`). Drape aus **`fabricClothMaterialId`** → `resolveFabricDrape`. Geometrie, Border, Export → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md).

---

**Category:** Physics  
**Title:** Fabric cloth — SoftBody-Pipeline (implementiert)  
**Description:** Partikel-/Joint-Netz auf subdividiertem Stoff-Mesh; **ein** `PhysicsWorld.step` pro Frame wie rigide Dynamics (Cloth-Substeps nur als dokumentierte Konstante, **kein** UI v1).

| Thema | Regel |
|---|---|
| **Implementiert** | `FabricClothPhysicsColliders` — Rapier **SoftBody** pro Tuch; Sync **Vertex-`position`** |
| **Kollision** | Soft-Body-Surface-Collider gegen **dieselben** Rapier-Collider wie Props/Boden (kein paralleles TS-Shape-Modell) |
| Partikel / Joint-Kugeln | Radius = **`PHYSICS_COLLIDER_MARGIN_M` (5 mm)** |
| **Subdivision-Grid** | Feste Zellgröße **`FABRIC_CLOTH_SIM_CELL_SIZE_M`** (~**1,25 cm**); **kein** User-Toggle / keine Quality-Stufen |

**Segment-Formel:** `segmentsAxis = clamp(round(extentM / cellSizeM), minSegments, maxSegmentsPerAxis)` mit **`minSegments >= 2`** (`FABRIC_CLOTH_SIM_MIN_SEGMENTS_PER_AXIS`); Cap **`FABRIC_CLOTH_SIM_MAX_SEGMENTS_PER_AXIS` (64)** — `src/physics/constants.ts`, `fabricClothGridSegments` in `src/physics/fabric-cloth-grid.ts`. Beispiel: 0,45 m Bahn → ~**36×36** Zellen.

**Session & Mesh:**

| Phase | Stoff-Mesh | Sync |
|---|---|---|
| **alle Phasen** | Ein festes subdividiertes Sim-Grid — **kein** Topologie-Wechsel in der Session | — |
| **`simulating`** | gleiches Grid; Vertices deformierbar | Rapier → Vertex-**`position`** jeden `tick`; **Normals** aus nu×nv-**Grid** (`fabric-cloth-grid-normals.ts`); **Bounds** optional gedrosselt (Spawn/Reset/Export: voller Sync) |
| **`paused` (Freeze)** | **Eingefrorene** Deformation (grobes Gitter) sichtbar | **Kein** `tick`-Sync; Voraussetzung für **Bake** → User-Asset → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md) |
| **Reset** | Vertices wieder **flach**; Entity-Transform = Start-Snapshot | Dynamics / Sim-State entfernen |

**Drape (implementiert):** `resolveFabricDrape(materialId)` in `src/physics/fabric-cloth-drape.ts` — Preset-`fabricDrape.profile`, **`areaDensityKgPerM2`**, Warp/Weft/Shear, Bend, Damping pro Profil `silk` \| `linen` \| `heavy` \| `stiff`; Fallback **`linen`**; **nicht** PBR-`roughness` als Proxy → [`requirements-materials.md`](./requirements-materials.md).

**Rapier-ID:** `fabric-soft:${entityId}` — SoftBody only (Legacy **`fabric-physics:*`** / Dynamic-Box-Proxy **entfernt**).

---

**Category:** Physics  
**Title:** Parameter — bewusst und sinnvoll besetzen  
**Description:** Alles, was Rapier oder unsere Physik-Pipeline **beeinflussen kann**, wird **nicht** dem Zufall oder stillen Library-Defaults überlassen, wenn das Mockup-Verhalten davon abhängt. Jeder solche Parameter hat einen **sinnvollen Wert** (Mockup: trockene Kontakte, SI-Einheiten, vorhersagbares Liegenbleiben) und eine **klare Quelle** im Code — typisch `src/physics/constants.ts`, `physics-settings`, Entity-Defaults oder dokumentierte Asset-Konstanten.

| Regel | Bedeutung |
|---|---|
| **Kein „Rapier-Default“ blind** | Wo Reibung, Restitution, Damping, Masse, CCD, Gravity, Timestep o. Ä. das Ergebnis prägen: **explizit setzen** (z. B. `setFriction`, `setRestitution`, `setLinearDamping`) — nicht annehmen, dass 0 oder Engine-Default zum Produkt passt. |
| **Eine Wahrheit** | Globale Werte **einmal** benennen (`GROUND_COLLIDER_FRICTION`, `RIGID_DYNAMIC_RESTITUTION`, `PHYSICS_DYNAMIC_*_DAMPING`, `PHYSICS_COLLIDER_MARGIN_M`, …) — **keine** verstreuten Magic Numbers pro Spawn-Pfad. |
| **Spawn-Pfade** | Neue Dynamic-/Fixed-Collider über **bestehende** Builder (`createDynamicRigidBody`, `blockColliderDesc`, …) oder gleiche Konstanten — optionaler `options`-Override nur mit **Default = globale Konstante**. |
| **Entity & UI** | Nutzer-sichtbare Felder (`physicsBodyMode`, `physicsDensityKgPerM3`, Gravity scale) haben **dokumentierte Defaults** (z. B. dynamic, 1000 kg/m³) und **Clamps** — kein leeres/0-Wert-Loch, das erst beim Start crasht oder Unsinn erzeugt. |
| **Asset-spezifisch** | Wo es kein Panel gibt (Fabric-Plane-Masse, Rigid-Test-Masse): **benannte Konstante** + in Requirements oder Asset-Doc erwähnt; Wert mockup-plausibel (nicht „1 weil egal“ ohne Kommentar). |
| **Neues Feature** | Neuer Teilnehmer oder neuer Rapier-Desc → Inventur: welche Desc-/Body-Parameter existieren? → jeweils Wert festlegen, Konstante/Doc ergänzen, **vor** Merge nicht offen lassen. |

**Checkliste (rigide Dynamic v1 — Referenz, nicht abschließend):** Gravity + Scale; Fixed Timestep; Collider-Margin; Restitution **0**; Reibung Boden/Prop/Stoff; Damping an jedem Dynamic-Body; Masse aus Dichte×Volumen (Block) oder feste Test-/Fabric-Konstante; **CCD an** für **alle** Dynamic-Rigid-Bodies v1 (kein per-Asset-Toggle); Fixed-Hindernisse mit gleicher Kontakt-Ästhetik (Reibung/Restitution gesetzt, nicht Default).

**Konstanten — wo im Code (Index):**

| Bereich | Datei / Modul |
|---|---|
| Gravity (m/s²), Timestep, Margin, Boden/Prop-Reibung, Restitution, rigid Damping, Stoff-Kontakt-Reibung | `src/physics/constants.ts` |
| Gravity **scale** (Panel 0–2), Phasen-Settings | `src/scene/physics-settings.ts` |
| Drape-Profile → Sim-Konstanten | `src/physics/fabric-cloth-drape.ts` + Preset-`fabricDrape` → [`requirements-materials.md`](./requirements-materials.md) |
| Cloth-Segment-Caps, Zellgrößen pro Quality | `src/physics/constants.ts`, `src/physics/fabric-cloth-grid.ts` |
| Dichte Default/Clamp, `physicsBodyMode`-Resolver | `src/scene/physics-rigid-body.ts` |
| Rigid-Test-Würfel (Maße, Spawn, Masse) | `src/engine/physics-rigid-test.ts` → [`requirements-physics-test.md`](./requirements-physics-test.md) |
| Boden-Collider **Ausdehnung** (Half-Extent) | `GROUND_PLANE_SIZE` in `src/constants.ts` |
| **Fabric cloth — CPU Verlet** (Kern, Phase B) | `src/physics/cloth/*` (`verlet`, `scene-colliders`, `sdf-primitives`, …) |

**Bewusst Rapier-Default lassen** nur, wenn dokumentiert **warum** (selten) — z. B. Parameter ohne Mockup-Effekt in v1.

---

**Category:** Physics  
**Title:** Bewusst nicht  
**Description:** WebGPU-PBD; Auto-Physik beim Export; Wind ohne Freigabe; Hollywood-Garantie; **Gummiball-/Trampolin-Physik**, federnde Contacts, einstellbare Restitution pro Objekt (v1).

---

**Category:** Physics  
**Title:** Fabric cloth — CPU Verlet (Ziel, ersetzt Rapier SoftBody)  
**Description:** **Normativ ab Phase A (Datenmodell + Docs).** Implementierung: [`_docs/fabric-physics/new-implementation.md`](../fabric-physics/new-implementation.md), Sim-Detail [`cloth-physics.md`](../fabric-physics/cloth-physics.md). **Stoff nutzt keinen Rapier SoftBody mehr** (Legacy-Abschnitte oben nur Historie bis Code-Port fertig).

| Thema | Regel |
|---|---|
| **Solver** | Position-based **Verlet** auf Centerline-Partikeln (CPU), 6 Substeps/Frame, Distance-Constraints (structural / shear / bending) |
| **Rendering** | **Physische Doppelhülle** (Top + Bottom); `updateClothShellVertices` nach jedem Sim-Step |
| **Kontakt** | Analytische **SDF** (Boden + alle rigiden Mockup-Collider-Formen) mit `d_hat` gekoppelt an `SHELL_HALF_THICKNESS` — **OGC-lite** Displacement Bounds |
| **Rapier** | Nur **Ground** + **Rigid primitives** (Block, Cylinder, Sphere, Wheel-Car); Posen pro Frame in Collider-Snapshot für Cloth |
| **Collider-Snapshot** | `buildSceneColliderSnapshot(registry, { worldSessionActive })` — feste Rigids immer; dynamische nur bei aktiver World-Session; unsichtbar + `fabric-cloth` / baked ausgeschlossen; SDF-Maße = Rapier-Collider-Builder + Foot-Pivot-Offset (Wheel: gemeinsame Achsen-Rotation) |
| **Session** | Start / Pause / Reset / Bake unverändert phasenweise → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md) |
| **Tuning** | Entity `fabricClothParams.physics` (Silk-Presets `silk` \| `satin` \| `linen` \| `chiffon`) — **nicht** `resolveFabricDrape` / Material-`fabricDrape` |

**Frame-Ablauf (Ziel):** `physics.step` (Rigids) → `buildSceneColliderSnapshot` → `simulateVerletStep` pro `fabric-cloth` → Shell-Vertices → Viewport.

**Code-Zielpfad:** `src/physics/cloth/*`, `src/engine/fabric-cloth-simulation.ts` (Name TBD), Participant statt `FabricClothPhysicsColliders` + Rapier.

---

**Category:** Physics  
**Title:** Collider-Margin — Fabric cloth (Ersetzung Tabellenzeile)  
**Description:** Die Zeile **„Fabric cloth (SoftBody)“** in *Collider-Margin (global)* (5 mm Partikel, ~1 cm Block-Spalt) gilt **nicht** für den Verlet-Zielzustand.

| Teilnehmer | Regel (Verlet) |
|---|---|
| **Fabric cloth** | **Kein** Rapier-Partikel-Radius am Stoff. Kontakt über **SDF + `CONTACT_D_HAT`** auf der Sim-**Centerline**; sichtbare Dicke = Shell-Halbdicke (`SHELL_HALF_THICKNESS`, siehe `cloth-physics.md`). Rigide Props behalten **`PHYSICS_COLLIDER_MARGIN_M`** nur in Rapier — Snapshot mappt **sichtbare** Collider-Geometrie in SDF (Welt-Matrix inkl. Rotation/Scale). |

---
