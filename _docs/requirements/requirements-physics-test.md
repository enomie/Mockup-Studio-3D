# Physics — Rigid-Body-Test (Fall-Würfel)

**Sanity-Check** für Rapier in der laufenden Szene: User startet einen **kurzen Falltest** aus dem **Physics**-Sub-Panel, um Schwerkraft (inkl. **Gravity scale**), Boden-Collider, Block-Hindernisse und Viewport-Stepping zu prüfen — **ohne** Scene-Entity, **ohne** Export.

**Bezüge:** Querschnitt Physik → [`requirements-physics.md`](./requirements-physics.md). Rapier-Regeln → [`requirements-code.md`](./requirements-code.md). Panel-Platzierung → [`requirements-app-layout.md`](./requirements-app-layout.md). Material nur visuell → [`requirements-materials.md`](./requirements-materials.md) (`material-paper`, Print Matt). Export-Ausschluss → [`requirements-export.md`](./requirements-export.md).

**Status:** **implementiert & verifiziert** — Fall auf Boden, **Gravity scale**, Kollision mit **Block**-Fixed-Collider (inkl. Fillet / Pose mit Entity-Transform). `PhysicsRigidTestController` (`src/engine/physics-rigid-test.ts`), Scene-API `startPhysicsRigidTest` / `stopPhysicsRigidTest`, Store `physics.rigidTestPhase`. Compile-Time-Debug **`DEBUG_PHYSICS_CUBE`** entfernt.

**Abgrenzung:** **Nicht** Fabric-Cloth **World physics** (Start / Freeze / Reset) — siehe [`requirements-physics.md`](./requirements-physics.md). Test-**Stop** = Test-Würfel **entfernen** (Mesh + Body weg). Cloth-**Freeze** = **Pause**; **Bake** = selektierte Entity → User-Asset in Assets-Katalog → [`requirements-assets.md`](./requirements-assets.md).

---

**Category:** Physics — Rigid test  
**Title:** Zweck & Zielgruppe  
**Description:** Entwickler und User sollen **ohne Code-Flag** sehen, ob Physik „lebt“: Würfel fällt, landet auf **Ground** (`y = 0`), optional prallt auf **Block**-Collider. Dient der Validierung von **Gravity scale** und später Reibungs-Parametern im Physics-Panel. **Kein** Mockup-Asset, **kein** Stilleben-Baustein.

---

**Category:** Physics — Rigid test  
**Title:** UI — Sektion Test im Physics Sub-Panel  
**Description:** In **Right Sub** `PhysicsSubPanel`, eigene **`SubPanelSection` „Test“** (über **Simulation**; Collision/Interaction später):

| Control | Label (UI) | Wirkung |
|---|---|---|
| **Start** | Start | **Neuen** Test-Würfel spawnen + simulieren (s. Spezifikation). **Immer** klickbar — jeder Start **addiert** einen weiteren Würfel; bestehende fallen weiter. |
| **Stop** | Stop | **Alle** Test-Würfel **entfernen** (Meshes aus Szene, alle Rapier Dynamic Bodies weg). Continuous Rendering aus, wenn keine anderen Dynamic Bodies. Nur enabled, solange mindestens **ein** Test-Würfel existiert. |

Keine dritte Taste „Pause“ in v1. **Stop** ist **nicht** Cloth-Bake.

---

**Category:** Physics — Rigid test  
**Title:** Test-Objekt — Geometrie & Spawn  
**Description:** Feste Norm-Spezifikation (nicht im Panel editierbar in v1):

| Parameter | Wert |
|---|---|
| Form | Würfel (Box) |
| Kantenlänge | **0,1 m** (10 cm) — **sichtbares** Mesh |
| Rapier-Collider | Gleiche Orientierung/Spawn; Box **+ 5 mm pro Fläche** nach außen (globaler Physik-Margin) → [`requirements-physics.md`](./requirements-physics.md) |
| Masse | **1 kg** (Rapier: explizite Masse am Collider) |
| Spawn-Höhe | **3 m** über Ground — **Unterkante** des Würfels bei **`y = 3 m`** (Center bei `y = 3,05 m`) |
| Spawn **X / Z** | **Szene-Mitte** / Orbit-**Target** (Implementierung: gleicher Horizontal-Punkt wie Kamera-Target, `y` nur vertikal) — nicht zufällig am Bildschirmrand |
| Orientierung | **Zufällige** Einheits-Rotation bei jedem **Start** (alle drei Euler-Achsen) |

Mehrere **Start**-Klicks = mehrere gleichzeitige Test-Würfel (gleiche Spawn-Regeln, jeweils neue zufällige Rotation). **Stop** löscht **alle** auf einmal.

---

**Category:** Physics — Rigid test  
**Title:** Test-Objekt — Material & Schatten (nur Rendering)  
**Description:** Sichtbares Material: Built-in **`material-paper`** (Print Matt) über **MaterialResolver** — gleiche Pipeline wie Block, **kein** eigener Farb-Picker. **Keine** Kopplung Preset-Roughness → Rapier-Reibung in v1 (Physik-Friction separat, s. Engine).

Mesh: **`castShadow`** und **`receiveShadow`** — Pflicht → [`requirements-shadows.md`](./requirements-shadows.md).

---

**Category:** Physics — Rigid test  
**Title:** Rapier & Engine  
**Description:**

- **Boden:** Fixed Ground-Collider ist **immer** aktiv (Engine-Start, Half-Extent ≈ `GROUND_PLANE_SIZE / 2`) — **unabhängig** von sichtbarem Ground-Mesh (Environment Eye). Visueller Ground aus ≠ kein Boden in Physik.
- **Blöcke:** **Block** Fixed-Collider (`BlockPhysicsColliders`, Form inkl. **corner radius**, Pose = Entity-Transform) — Kollision mit Test-Würfel **implementiert** (Würfel rollt/ab auf Block-Oberfläche und Kanten).
- **Gravity:** `STANDARD_GRAVITY_Y × gravityScale` aus Physics-Panel (**scale 0,01–2**, nicht 0) → [`requirements-physics.md`](./requirements-physics.md).
- **Dynamic Body:** Cuboid-Collider Half-Extents **0,05 m**; **CCD** an (kleiner Körper, ~3 m Fall).
- **Collider:** Restitution **0**; Reibung Würfel **0,8**; Ground-Collider-Reibung **`GROUND_COLLIDER_FRICTION` (0,65)**.
- **Damping:** globale **`PHYSICS_DYNAMIC_LINEAR_DAMPING`** / **`PHYSICS_DYNAMIC_ANGULAR_DAMPING`** (wie alle Dynamic-Rigid-Bodies) → [`requirements-physics.md`](./requirements-physics.md).
- **Sync:** Physics → Graphics nach `step` → [`requirements-code.md`](./requirements-code.md).
- **Viewport:** Continuous Rendering solange Dynamic Test-Body existiert; nach **Stop** wieder on demand, sofern keine anderen Dynamic Bodies.

**Scene-API:** `startPhysicsRigidTest()`, `stopPhysicsRigidTest()` — kein Asset; UI **Start** / **Stop** → Store → Scene-API.

**Identität:** Interne IDs mit Präfix `physics-rigid-test-` + fortlaufende Nummer; **nicht** in `EntityRegistry` / Scene-Entity-Liste.

---

**Category:** Physics — Rigid test  
**Title:** Was der Test nicht ist  
**Description:**

- **Kein** `AssetEntity`, kein Gizmo-Target, kein Left-Assets-Katalog-Eintrag.
- **Kein** Inhalt in **Scene Save** / Scene-Presets (v1).
- **Kein** Erscheinen im **PNG/JPG-Export** — Test-Mesh beim Export **ausblenden** oder nicht miterfassen → [`requirements-export.md`](./requirements-export.md).
- **Kein** Ersatz für Cloth-Simulation — nur **rigide** Rapier-Probe.

---

**Category:** Physics — Rigid test  
**Title:** Implementierung (Referenz)  
**Description:** Boden-Reibung: `GROUND_COLLIDER_FRICTION` (**0,65**) in `src/physics/constants.ts`. Export: `mockup-engine-capture` ruft `pushExportHidePhysicsTest` / `pop` — Viewport unverändert sichtbar. IDs **`physics-rigid-test-*`** — nicht in Entity-Registry.

---

**Category:** Physics — Rigid test  
**Title:** Bewusst nicht v1  
**Description:** Panel-editierbare Masse/Höhe/Größe; Test-Würfel als permanentes Prop in der Szene speichern (einzeln stehen lassen ohne **Stop**); Rapier-Material aus Paper-Preset; Wind/Impulse; Aufnahme in Video-Export; **Start** per Tastaturkurz; Obergrenze Anzahl Würfel (Performance).
