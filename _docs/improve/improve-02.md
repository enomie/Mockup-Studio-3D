# improve-02 — Block-Physik (offene Review-Punkte)

Nur noch **beanstandete** Lücken und Aufräum-Kandidaten — kein Scope-Change am Zielverhalten. Erledigtes (Margin, Dämpfung, Fabric-Collider, Store-Clamps, Friction-Konstanten, `refreshOne`/`reconcileEntity`, Default-Scene-Resolver, Clone-Physikfelder, Registry-Tests für Block-Slice, …) ist hier **nicht** gelistet.

Normativ für Physik: [`requirements-physics.md`](../requirements/requirements-physics.md).

---

## Engine / Store / Scene-API

- **`mockup-engine`:** `setPhysicsBodyMode` / `setPhysicsDensityKgPerM3` nutzen `applyAssetMutation(async …)`; `setBlockParams` sync — einheitlich machen oder kurz kommentieren, warum async nötig ist.
- **`asset-system.setPhysicsBodyMode`:** Reconcile nur für Block — bei **Cylinder**-Physik auf `isRigidColliderKind` (o. ä.) erweitern, nicht jedes Entity.

---

## Verhalten / Produkt-Klarheit

- **Test fehlt:** Block-Dimensionen ändern, während World physics **simulating** (Body-Rebuild).
- **Dynamic idle:** kein Rapier-Collider bis Start — optional UX-Hinweis im Block-Physics-Panel.
- **Pause:** nur `sleep()`; Rapier stepped weiter wenn noch andere Dynamic-Bodies — in Requirements/Docs festhalten (Pause ≠ Step-Stopp).

---

## Masse / Collider / `PhysicsWorld`

- **`blockVolumeM3`:** ohne Fillet-Korrektur — in Requirements als Known Limitation verlinken oder später `effectiveVolumeM3`.
- **`blockColliderDesc`:** noch in `physics-world.ts` — optional nach `block-collider-shape.ts` als `toRapierColliderDesc` (Rapier-Import nur unter `physics/`).
- **`upsertFixed`:** immer `removeBody` + neu — optional Pose-Update, wenn Shape unverändert (nur bei Performance-Bedarf).

---

## UI (`BlockFields`)

- **`formatMassKg` / Density-Parsing:** bei Cylinder → shared `physics-ui-format` o. ä.
- **Weight:** read-only als echte Anzeige-Zeile statt `disabled` + leeres `onChange`.
- **Shared `RigidBodyPhysicsFields`:** Mode, Density, Weight für Block + später Cylinder.
- **`PanelSelect` Body mode:** Guard `fixed|dynamic` redundant zu `options`.
- **Fixed + Density:** optional ausgrauen (Produktfrage).

---

## Tests

- **`block-physics-colliders`:** `syncEntityTransformsFromPhysics`, `setAllSleeping`, `dispose`, `remove` nicht abgedeckt.
- **`PhysicsWorld.createDynamicBlockCollider`:** keine Integration (roundCuboid + Masse) — analog rigid-test oder minimal Rapier.
- **`app-store-asset-params`:** keine Tests für `setPhysicsBodyMode` / `setPhysicsDensityKgPerM3`.
- **`world-physics-session`:** `tick` → Block-Sync nicht assertet.
- **Fixture:** `makeBlockEntity` dupliziert — `test/fixtures/block-entity.ts`.

---

## `asset-system` / Lifecycle

- **`setAssetSizeScale` auf Block:** prüfen, ob Rebuild + `reconcileEntity` immer laufen.
- **Rebuild-Baum:** Fabric `refreshOne` vs Block über `rebuildBlock` — Lesbarkeit in `asset-system-rebuild`.
- **Entity-Delete:** `remove(entityId)` auf Block-Physics — Test?
- **`dispose`:** zwei Schleifen — `clearAll()` oder `remove` pro Id.

---

## `mockup-engine` / Gizmo

- **`syncRigidPrimitivePoseFromRuntimeIfFixed`:** optional nur Collider-Service ohne Mode-Check in Engine.
- **Gizmo bei simulating + dynamic Block:** Registry-Transform änderbar, Body nicht — dokumentieren oder sperren wenn `worldPhysicsPhase === 'simulating'`.

---

## Docs

- **`requirements-assets-block.md`:** Abschnitte noch „Ziel“ bei API/Panel — auf **implementiert** angleichen.
- **Scene Save/Load:** `physicsBodyMode` / `physicsDensityKgPerM3` durchreichen, sobald Serialisierung existiert (grep `scenes`/Store).
- **`requirements-architecture.md` / Physics-Doc:** `physics-rigid-body.ts` als shared rigid helpers erwähnen.

---

## Kleine Code-Qualität

- **`spawnDynamicOne`:** `readBlockPhysicsSpawnArgs(runtime)` für Testbarkeit.
- **Nach größerem Refactor:** volles `npm test` + `npm run lint` (nicht nur Einzeldateien).

---

## Bewusst zurückgestellt

- Kein ECS-Physics-Framework für zwei Asset-Typen.
- Kein `setMass` ohne Rebuild.
- Fillet-Volumen für Masse — erst wenn produktkritisch.
