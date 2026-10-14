# Handoff: Fabric-Cloth — Default-Szene, Drape, FPS

## Was der User erwartet (Soll)

**Default-Szene** (`src/config/default-scene-assets.ts`):

| Objekt | Setup |
|--------|--------|
| **Block** | 0,3 × 0,3 × 0,3 m, Fuß auf **y = 0** (Oberkante **y = 0,3 m**) |
| **Fabric cloth** | **0,45 × 0,45 m** (Platzhalter-Quadrat), **Silk**-Preset, zentriert auf Block, **`positionY: 0.5`** → Stoff**ebene** (Fuß-Pivot) bei **0,5 m** |

Nach **World physics → Start** soll es wie eine **kleine Tischdecke** wirken: Tuch liegt auf dem Würfel, an den Seiten nur **wenig** Überhang (ca. **7,5 cm** pro Kante: (0,45 − 0,30) / 2), leicht nach unten — **nicht** eine riesige Plane, die **bis auf den Boden (y = 0)** durchhängt wie **zäher Schleim**.

Default-Kamera ist bewusst auf Review eingestellt (`src/constants.ts`: Distance **2,237 m**, Azimuth **−18,4°**, Elevation **41,5°**, Target **Y = 0,137**).

---

## Erfolgskriterium (Acceptance)

Mit **Default-Szene**, **Default-Kamera**, **Physics Start**:

1. Welt-Footprint des Tuchs bleibt **~0,45 m** (nicht boden-zu-deckel).
2. Nach Settle: Tuch auf dem Würfel, Seitenüberhang **kurz** (Größenordnung cm, nicht Meter bis y = 0).
3. Visuell **Silk-Tischdecke**, nicht **Schleim**.
4. **FPS:** Bis **64×64** Sim-Segmente (~4,2k Partikel) soll die Viewport-Rate nicht primär am **Triangle-Count** scheitern (Pipeline: Rapier + CPU-Sync + Render + Schatten).

Vitest-Referenz: `fabric-cloth-default-scene.integration.test.ts` (Silk vs. Legacy-Drape, Settle nach Block). **Browser-WYSIWYG** bleibt manuell (User, **localhost:4040**).

---

## Stand Code (2026-10-14) — erledigt

| Thema | Ist |
|--------|-----|
| **Physik** | Rapier **SoftBody** (`FabricClothPhysicsColliders`), kein Plane-Proxy |
| **Drape / Schleim** | `resolveFabricDrape(materialId)` → `clothAnisotropic`, Masse, `setSurfaceCollider`-Reibung — **nicht** `uniform(1, friction)` |
| **Border bei Sim** | TSL-Inset über **`restPlaneXY`** (frozen), nicht deformiertes `positionLocal` |
| **Zittern** | Profil-Damping, `deformationDamping`, `setCanSleep(true)` — Mikro-Oszillation ggf. noch sichtbar |
| **Grid-Default** | **`high`** → ~1,25 cm Zelle; 0,45 m² ≈ **36×36** → **~1,37k** Partikel |
| **CPU-Sync FPS** | Positionen **jeden** Tick; **Grid-Normals** [`fabric-cloth-grid-normals.ts`](src/physics/fabric-cloth-grid-normals.ts) statt `computeVertexNormals`; Bounds **jeden 2.** Tick |
| **Render** | Continuous während `simulating` (User); `invalidateViewport` nach Render nur wenn `needsPhysics && !continuous` |
| **Totcode** | Plane-Collider-Shape, `FABRIC_CLOTH_PHYSICS_MASS_KG`, Block-Physics-Shims → `_deleted/` |

**Noch offen (Produkt/UI):**

- **`fabricClothSimQuality`** — nur Code-Default, kein Physics-Panel.
- **Sleep-Gate** (`isSleeping()`-Skip) — bewusst **nicht** umgesetzt (User).
- **GPU-Normals** / Procedural-Sampling auf `restPlaneXY` während Sim — siehe Audit **C**.

Details: [`_docs/diaries/diary-code-decisions.md`](_docs/diaries/diary-code-decisions.md) (Einträge 2026-10-14).

---

## Relevante Dateien

| Bereich | Pfad |
|---------|------|
| Default-Szene | `src/config/default-scene-assets.ts` |
| Mesh / Grid | `src/engine/fabric-cloth-geometry.ts`, `src/physics/fabric-cloth-grid.ts` |
| Grid-Normals | `src/physics/fabric-cloth-grid-normals.ts` |
| Drape | `src/physics/fabric-cloth-drape.ts` |
| Spawn + Sync | `src/engine/fabric-cloth-physics-colliders.ts`, `src/physics/fabric-cloth-soft-body.ts` |
| Session / Frame | `src/engine/world-physics-session.ts`, `src/engine/mockup-engine.ts` |
| Konstanten Sync | `src/physics/constants.ts` (`FABRIC_CLOTH_SYNC_*_EVERY_N_FRAMES`) |
| Normativ | `_docs/requirements/requirements-assets-fabric-cloth.md`, `_docs/requirements/requirements-physics.md` |

---

## Performance-Audit — Fabric cloth (offen vs. erledigt)

Zielbild: Verlust aus **Rapier SoftBody + CPU position-Sync + Vollzeit-Render (MSAA/SMAA) + 4096² Schatten**, nicht aus Dreieckanzahl allein.

### A. Hot path pro Frame (`simulating`)

Reihenfolge [`mockup-engine.ts`](src/engine/mockup-engine.ts) `onFrame`:

1. **`setContinuous(true)`** bei Kamera/Gizmo/`needsPhysics`/**`worldSimulating`** → voller Viewport jeden Frame während Sim.
2. **`physics.step`** — Fixed 1/60; bei Drops mehrere `world.step()` pro angezeigtem Frame.
3. **`worldPhysics.tick`** → [`syncFabricClothMeshFromSoftBody`](src/physics/fabric-cloth-soft-body.ts):
   - Partikel → `position`, `DynamicDrawUsage`, `needsUpdate` — **jeden Tick**
   - Normals: **`writeFabricClothGridNormalsFromPositions`** — **jeden Tick** (`NORMALS_EVERY_N = 1`)
   - Bounds: `computeBoundingSphere/Box` — **jeden 2.** Tick (`BOUNDS_EVERY_N = 2`)
4. **Kein Sleep-Gate** — Sync läuft auch wenn Rapier ruht (bewusst).

| Maßnahme | Status |
|----------|--------|
| Sleep-Gate | Zurückgestellt (User) |
| Grid-Normals statt `computeVertexNormals` | **Erledigt** |
| Bounds-Stride | **Erledigt** (2) |
| Continuous während `simulating` | Bewusst **an** (User) |
| Doppel-`invalidateViewport` | **Erledigt** |

### B. Rapier SoftBody (offen)

- `softBodiesMaxExtraSubsteps` (Default 4) nicht in [`physics-world.ts`](src/physics/physics-world.ts) gesetzt.
- Profilieren: `world.step()` vs. Sync vs. `renderViewportFrame`.
- Partikel-Ball-Collider (5 mm) — Kontaktkosten skaliert mit Partikelzahl.

### C. GPU / Material (offen)

- `DoubleSide` + **Silk** über deformiertes `positionLocal` (Fragment-Last + visuelles „Kochen“).
- Optional: Procedural/UV/`restPlaneXY` während Sim; Preview-Material-Regel in Requirements.

### D. Schatten & Post (offen)

- Stoff **cast + receive**, `shadowSide = DoubleSide`, **4096²** Key/Fill während Sim jeden Frame.

### E. Legacy / Dedupe

| Artefakt | Status |
|----------|--------|
| `fabric-cloth-collider-shape`, `FABRIC_CLOTH_PHYSICS_MASS_KG`, Block-Shims | **Erledigt** → `_deleted/` |

### F. Grid / Quality

| Quality | Zelle | 0,45 m → Segmente | Partikel (ca.) |
|---------|-------|-------------------|----------------|
| draft | 5 cm | 9×9 | 100 |
| standard | 2,5 cm | 18×18 | 361 |
| **high (Default)** | 1,25 cm | **36×36** | **~1 369** |
| high (1 m Bahn, cap) | 1,25 cm | 64×64 | **~4 225** |

Empfehlung offen: `fabricClothSimQuality` im Physics-Panel; Default ggf. wieder `standard` für Alltag.

### G. Nächste Schritte (priorisiert)

1. **Profilieren** im Browser (step / sync / render).
2. Rapier **`softBodiesMaxExtraSubsteps`** / IntegrationParameters dokumentieren + tunen.
3. Material/Schatten nur wenn FPS danach noch knapp.
4. Optional später: **GPU-Normals** oder Sleep-Gate (nur mit User).

### H. Nicht anfassen (ohne User)

- Kein Plane-Proxy / kein zweites Sim-Mesh.
- Kein `npm run dev` (User-Server **localhost:4040**).
- Kein Commit ohne `commit`.
- Grid-Cap **64** beibehalten.

---

## Historisch — ursprünglicher „Schleim“-Handoff (nicht mehr Ist-Code)

Früher (vor Drape-Wiring): `SoftBodyMaterial.uniform(1, FABRIC_PLANE_DYNAMIC_FRICTION)` — zweiter Parameter war **Damping-Ratio**, nicht Reibung → gummiartiges Verhalten. **Behoben** durch `resolveFabricDrape` + Tests.

Symptom „riesiges Plane bis Boden“ konnte zusätzlich **WebGPU-Static-Attribute** (ohne `DynamicDrawUsage`) oder falscher Spacing-`du`/`dv` sein — Diary 2026-10-14. Bei neuem Browser-Bug: Rest-Pose-Check in `spawnOne`, Welt-Span XZ ~0,45 m, Rapier vs. Mesh vergleichen.

Optional diskutiert, **nicht** umgesetzt: Tuch-`positionY` von 0,5 auf Block-Oberkante (~0,31) — User wollte **0,5** behalten.
