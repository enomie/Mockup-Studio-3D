# Physics

**Engine:** [Rapier](https://rapier.rs/) (`@dimforge/rapier3d-simd-compat`) — **kein** GPU-Cloth, **kein** separater Verlet-Solver.

**Bezüge:** Block → [`requirements-assets-block.md`](./requirements-assets-block.md). Zylinder → [`requirements-assets-cylinder.md`](./requirements-assets-cylinder.md). Stoff → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md). Panel-Layout → [`requirements-app-layout.md`](./requirements-app-layout.md). Rigid-Test-Würfel → [`requirements-physics-test.md`](./requirements-physics-test.md). Export/Freeze → [`requirements-export.md`](./requirements-export.md).

**Status (kurz):** Boden **immer** Fixed. **World physics** (Start/Freeze/Reset) implementiert. **Block:** `physicsBodyMode`, `physicsDensityKgPerM3`, Collider-Margin, globale Kontakt-/Damping-Konstanten. Stoff: **Rapier SoftBody**-Cloth (deformierendes subdividiertes Mesh); Dynamic-Plane-MVP entfällt. **Offen:** Zylinder-Physik, **`fabricClothSimQuality`** (UI), Drape-Resolver, Taste **`P`**. Export Stoff: WYSIWYG → [`requirements-export.md`](./requirements-export.md).

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
| **Fabric cloth (Plane-MVP)** | Fuß-Pivot = **Stoffebene** (Unterseite der Bahn). Collider-Slab **±5 mm um diese Ebene** (`colliderOffsetY = 0`, Halbdicke = `PHYSICS_COLLIDER_MARGIN_M`, **1 cm** gesamt) — **nicht** das ganze Slab nur oberhalb der Plane. Stapel **Block–Stoff–Block:** nach Settle **~1 cm** sichtbar zwischen Block-Oberseite und Stoffebene sowie zwischen Stoffebene und Block-Unterseite (je **0,5 cm** Margin der Partner-Collider). **Kein** extra 5-mm-Streifen in **X/Z** um die Footprint-Kante. |
| **Fabric cloth (später — Rapier-Cloth / Joints)** | Partikel bzw. Joint-Kugeln: **Radius = `PHYSICS_COLLIDER_MARGIN_M` (5 mm)**. Wenn der Stoff später eine **echte Dicke** hat: **Gesamtdicke 1 cm** = **0,5 cm** pro Seite zur Mittel-Ebene (gleiche Konstante, nicht ein zweiter Wert). |
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
| **Stoff (Plane-MVP)** | Bodenkontakt ebenfalls **Restitution 0** — kein federndes Abprallen der Plane. |
| **UI v1** | **Kein** Nutzer-Slider „Bounciness“, **keine** Feder-/Spring-Joints. |

Kurzzeitiges numerisches Zittern beim Stillstand ist tolerierbar; Rapier **`sleep()`** nach **Freeze** und stabile Ruhepose sind das Ziel. Material-Presets (Glas, Gummi-Look im Render) ändern **nicht** die Rapier-Elastizität — Kontakt bleibt mockup-trocken.

---

**Category:** Physics  
**Title:** Damping — alle Dynamic-Rigid-Bodies  
**Description:** Jeder **Dynamic**-`RigidBody` in Rapier erhält **lineare** und **rotatorische** Dämpfung aus **einer** zentralen Konstanten-Quelle (`src/physics/constants.ts`) — damit Aufprall, Gleiten und Kippen schnell abklingen (Mockup: **satt liegen**, kein ewiges Rockern).

| Gilt für | Gilt nicht für |
|---|---|
| Block **`physicsBodyMode: dynamic`** (nach World-**Start**) | **Fixed**-Collider (Block/Zylinder-Hindernis, Boden) |
| **Fabric cloth** Plane-MVP (Dynamic-Box-Proxy) | Render-Mesh / Masse-Berechnung |
| **Rigid-Test-Würfel** (Panel **Test**) | |
| Später: **Cylinder** **dynamic** | |

| Konstante (Ziel) | Rolle |
|---|---|
| **`PHYSICS_DYNAMIC_LINEAR_DAMPING`** | Rapier `linearDamping` |
| **`PHYSICS_DYNAMIC_ANGULAR_DAMPING`** | Rapier `angularDamping` |

**Engine:** Ein Spawn-Pfad (`createDynamicRigidBody` in `physics-world.ts`) — **kein** zweites `RigidBodyDesc.dynamic()` ohne diese Werte. **CCD** (`setCcdEnabled(true)`) ebenfalls dort für **alle** Session-Dynamics v1 (Test-Würfel, Blöcke, Fabric-Plane). **UI v1:** kein Damping-Slider; nicht pro Asset überschreibbar.

**Später (Rapier-Cloth-Mesh):** gleiche **Ruhe-Ästhetik**; Vertex-/Joint-Damping ist dann **eigenes** Thema (nicht der Plane-`RigidBody`).

---

**Category:** Physics  
**Title:** World physics — Session  
**Description:**

| Control | Wirkung |
|---|---|
| **Start** | Snapshot Transforms; spawn **Dynamic**-Bodies (Mode **dynamic** + Stoff); **simulating** |
| **Freeze** | Phase **paused** — Dynamic-Bodies **`sleep()`**; **kein** Mesh-Sync aus Rapier (kein World-`tick`-Sync). **Kein** Export-Bake. Rapier **`step`** kann weiter laufen, solange Dynamic-Bodies in der Welt existieren — Freeze stoppt **nicht** den Integrator, nur Schlaf + kein Pose-Sync. |
| **Reset** | Dynamics weg; Transforms = Snapshot; **idle** |

`startWorldPhysics()`, `toggleWorldPhysicsPause()`, `resetWorldPhysics()`. Taste **`P`** (Ziel) = Start / Freeze.

---

**Category:** Physics  
**Title:** Teilnehmer bei Start  
**Description:**

| Asset | Collider | Bei **Start** |
|---|---|---|
| **Block / Cylinder** | Form aus Params + Corner radius | **fixed** → Fixed-Body; **dynamic** → Dynamic-Body |
| **Fabric cloth** | Stoff (Plane → später Cloth-Mesh) | Dynamic / Cloth-Sim |
| **Boden** | Fixed | immer |

**Code:** Block **fixed/dynamic** umgesetzt (`physics-participants.ts` für Zähler/Status-Helfer). **Cylinder** noch offen.

---

**Category:** Physics  
**Title:** Global Physics-Panel  
**Description:** Right Nav **Physics**: **World physics**, **Test**, **Gravity scale** (**0,01–2**, Default **1** — Minimum **0,01**, kein Null-Schwerkraft). Kein Ersatz für **Fixed/Dynamic** am Objekt.

---

**Category:** Physics  
**Title:** Fabric cloth (Stoff)  
**Description:** Nur Rapier. **Ziel:** deformierendes Cloth-Mesh via **`SoftBodyDesc.cloth`** (`@dimforge/rapier3d-simd-compat`). Integrationsreferenz (Step-Order, Material-Limits): [botrail/rapier-cloth](https://github.com/botrail/rapier-cloth). UVs fix. Drape aus **`fabricClothMaterialId`** / `fabricDrape` am Preset. Geometrie, Border, Export → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md).

---

**Category:** Physics  
**Title:** Fabric cloth — Cloth-Mesh (Ziel)  
**Description:** Nach MVP: Partikel-/Joint-Netz auf subdividiertem Stoff-Mesh; **ein** `PhysicsWorld.step` pro Frame wie rigide Dynamics (Cloth-Substeps nur als dokumentierte Konstante, **kein** UI v1).

| Thema | Regel |
|---|---|
| **Implementiert** | `FabricClothPhysicsColliders` — Rapier **SoftBody** pro Tuch; Sync **Vertex-`position`** |
| **Kollision** | Soft-Body-Surface-Collider gegen **dieselben** Rapier-Collider wie Props/Boden (kein paralleles TS-Shape-Modell) |
| Partikel / Joint-Kugeln | Radius = **`PHYSICS_COLLIDER_MARGIN_M` (5 mm)** |
| **`fabricClothSimQuality`** | Global im **Physics Sub-Panel** (neben Gravity scale); Default **`standard`**; Werte **`draft`** \| **`standard`** \| **`high`** → Zellgröße auf der Bahn |

**Zellgröße (Ziel)** — längere Kante der Bildbahn:

| Quality | Ziel-Zellgröße |
|---|---|
| `draft` | ~**5 cm** |
| `standard` | ~**2,5 cm** |
| `high` | ~**1,25 cm** |

**Segment-Formel (Ziel):** `segmentsAxis = clamp(round(extentM / cellSizeM), minSegments, maxSegmentsPerAxis)` mit **`minSegments >= 2`** pro Achse für Sim; Caps in `src/physics/constants.ts` oder `physics-settings.ts`.

**Session & Mesh:**

| Phase | Stoff-Mesh | Sync |
|---|---|---|
| **alle Phasen** | Ein subdividiertes Grid (Quality **`fabricClothSimQuality`**) — **kein** Topologie-Wechsel bei Start/Reset | — |
| **`simulating`** | gleiches Grid; Vertices deformierbar (Ziel: Rapier-Cloth) | Rapier → Vertex-**`position`** jeden `tick`; **Normals** aus nu×nv-**Grid** (nicht Three-Dreieck-Pass); **Bounds** optional gedrosselt (Spawn/Reset/Export: voller Sync) |
| **`paused` (Freeze)** | **Eingefrorene** Deformation sichtbar | **Kein** `tick`-Sync (bestehend) |
| **Reset** | Vertices wieder **flach**; Entity-Transform = Start-Snapshot | Dynamics / Sim-State entfernen |

**Drape (Ziel):** `resolveFabricDrape(materialId)` aus Preset-`fabricDrape.profile` — Tabelle **`areaDensityKgPerM2`**, Stretch/Shear, Bend, Damping pro Profil `silk` \| `linen` \| `heavy` \| `stiff`; Fallback **`linen`**; **nicht** PBR-`roughness` als Proxy → [`requirements-materials.md`](./requirements-materials.md).

**Plane-MVP vs. Cloth:**

| Stufe | Rapier-Teilnehmer pro `fabric-cloth` |
|---|---|
| Legacy (entfernt) | Dynamic-Box-Proxy (`fabric-physics:${entityId}`) |
| Cloth-Mesh | `fabric-soft:${entityId}` — SoftBody, kein Rigid-Proxy |

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
| Gravity (m/s²), Timestep, Margin, Boden/Prop-Reibung, Restitution, Damping, Fabric-Plane-Masse | `src/physics/constants.ts` |
| Gravity **scale** (Panel 0–2), Phasen-Settings, **`fabricClothSimQuality`** (Ziel) | `src/scene/physics-settings.ts` |
| Drape-Profile → Sim-Konstanten (Ziel) | `resolveFabricDrape` + Preset-`fabricDrape` → [`requirements-materials.md`](./requirements-materials.md) |
| Cloth-Segment-Caps, Zellgrößen pro Quality (Ziel) | `src/physics/constants.ts` oder `physics-settings.ts` |
| Dichte Default/Clamp, `physicsBodyMode`-Resolver | `src/scene/physics-rigid-body.ts` |
| Rigid-Test-Würfel (Maße, Spawn, Masse) | `src/engine/physics-rigid-test.ts` → [`requirements-physics-test.md`](./requirements-physics-test.md) |
| Boden-Collider **Ausdehnung** (Half-Extent) | `GROUND_PLANE_SIZE` in `src/constants.ts` |

**Bewusst Rapier-Default lassen** nur, wenn dokumentiert **warum** (selten) — z. B. Parameter ohne Mockup-Effekt in v1.

---

**Category:** Physics  
**Title:** Bewusst nicht  
**Description:** WebGPU-PBD; Auto-Physik beim Export; Wind ohne Freigabe; Hollywood-Garantie; **Gummiball-/Trampolin-Physik**, federnde Contacts, einstellbare Restitution pro Objekt (v1).

---
