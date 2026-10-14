# Assets — Wheel Car (Reifen + Felge)

Parametrischer **Autorad**-Baustein für Stilleben und Fahrzeug-Mockups — **Gummi/Reifen** (matte Kunststoff-Optik) + **Felge** (Chrom, mehrteilige Subassembly). **Kein Bild**, keine `screenImageId`. Katalog, Entity, Placement → [`requirements-assets.md`](./requirements-assets.md). Material-Slots → [`requirements-materials.md`](./requirements-materials.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md). Rigid **Fixed / Dynamic** → [`requirements-physics.md`](./requirements-physics.md).

**Abgrenzung:** Kein komplettes Fahrzeug, keine Bremsanlage v1, kein Reifen-Label/Decal, keine Profilrillen (Tread-Pattern). **Cylinder** (voller Zylinder, Achse Y) → [`requirements-assets-cylinder.md`](./requirements-assets-cylinder.md). **Tin can** / **Beverage can** = Getränkedosen — nicht dieses Asset.

**Status:** **implementiert (v1)** — SVG-Lathe + prozedurale Speichen.

**v1-Scope:** Built-in `wheel-car`; **Default-Maße = Sportwagen-Niederquerschnitt** (Referenz **255/30 R20**, s. Abmessungen); **Silhouette** aus [`wheel-car.svg`](../../public/profiles/lathe/wheel-car.svg) (Reifen + Felgenband + Nabe); **5 Speichen** engine-seitig; zwei Material-Slots (**Tire**, **Rim**); Achse **+X**; Foot-Pivot **y = 0**; Panel skaliert über `wheelCarParams` (u. a. `outerRadiusM`); Uniform-Scale-Gizmo **baked** in alle linearen `wheelCarParams`; async SVG-Load beim Rebuild; Physik: Zylinder-Collider (Außenradius + Reifenbreite). **Kein** `entity.sizeScale`.

**Referenz (nicht normativ):** Demo-HTML `createPrettyWheel` — **verworfen** für Engine; normativ ist das mm-SVG.

---

**Category:** Assets — Wheel Car  
**Title:** Identität & Katalog  
**Description:**

| `assetKind` | UI-Label | Kategorie |
|---|---|---|
| `wheel-car` | Wheel Car | **Objects** (Lucide z. B. `circle-dot` / `life-buoy`) |

Mehrfach-Instanzen unbegrenzt. Default-Szene: **keine** Pflicht-Instanz.

---

**Category:** Assets — Wheel Car  
**Title:** Koordinaten, Achse, Pivot & Placement  
**Description:** Lokal (Einheit = m):

| Achse | Bedeutung |
|---|---|
| **+X** | **Radachse** (Drehachse des Rades) |
| **+Y** | **oben** (Rad steht auf dem Boden) |
| **+Z** | seitlich (Speichen liegen in der **YZ**-Ebene) |

- **Orientierung v1:** Rad „steht“ auf dem Ground wie ein losgelöstes Autorad — **kein** Kippen der Achse im Panel (Achse immer horizontal **X**). Später optional: `axleAxis` / Fahrzeug-Parent.
- **Pivot:** **Unterster Punkt** der **Außen-Lauffläche** (Tread) bei **lokal y = 0**; Radmittelpunkt auf der Achse bei **y = `outerRadiusM`** (bei symmetrischem Reifenprofil).
- Spawn: wie **Sphere** / **Cylinder** — Unterkontakt auf Ground → [`requirements-scene-placement.md`](./requirements-scene-placement.md).
- Move + Rotate + uniform Scale per Gizmo; Scale-Commit multipliziert lineare `wheelCarParams` (inkl. `tireCornerRadiusMm`); **kein** `entity.sizeScale`.

**Hinweis Implementierung:** Three.js-`LatheGeometry` dreht standardmäßig um **Y**; Reifen-/Felgen-Meshes werden nach Build **`rotation.z = π/2`** (oder äquivalent) gesetzt, damit die Lathe-Achse mit **X** zusammenfällt — einmalig in der Wheel-Group, nicht am Entity-Transform.

---

**Category:** Assets — Wheel Car  
**Title:** Abmessungen (Defaults & Panel)  
**Description:** Gespeichert in **`wheelCarParams`**. UI Meter, **4 Dezimalstellen**; mm-Felder wo sinnvoll.

**Referenz-Reifen (Defaults):** **255/30 R20** — typischer **Sportwagen-Niederquerschnitt** (breit, flache Flanke). v1 speichert **Meter** im Panel, keine Reifen-ETRTO-Felder (`/30`, `R20`) — Werte unten sind die Umrechnung in die Engine.

| Reifenangabe | Wert | → Parameter |
|---|---|---|
| Querschnittsbreite | **255 mm** | `tireWidthM` = **0,255** |
| Seitenverhältnis (Flanke) | **30 %** → Flankenhöhe **76,5 mm** | radial: `outerRadiusM − rimRadiusM` |
| Felgennennmaß | **20″** → Ø **508 mm** | `rimRadiusM` = **0,254** (Barrel-Außenradius, Mockup-Näherung) |
| Außen-Ø gesamt | **≈ 661 mm** | `outerRadiusM` = **0,3305** |

Flankenhöhe (radial): `sidewallM = outerRadiusM − rimRadiusM` — bei Default **0,0765 m** (30 % von 255 mm). Das ist bewusst **niedrig** gegenüber Touring/Reifen mit /45 oder /55.

| Parameter | Default (Ziel) | UI | Hinweis |
|---|---|---|---|
| `outerRadiusM` | **0,3305** | Outer radius (m) | **Master-Skala** (uniform); SVG-Referenz-Außenradius 330,5 mm |
| `tireWidthM` | **0,255** | Tire width (from SVG) | **read-only** im Panel; `0,255 × (outerRadiusM / 0,3305)` bei Änderung von `outerRadiusM` |
| `rimRadiusM` | **0,254** | — | Serialisierung / Speichen-Näherung; **Mesh** aus SVG, kein Panel-Feld |
| `rimInsetM` | **0,010** | Rim inset (m) | Speichen-Logik (Reserve); skaliert mit `outerRadiusM` |
| `hubRadiusM` | **0,048** | Hub radius (m) | Panel; skaliert mit `outerRadiusM` |
| `hubDepthM` | **0,025** | Hub depth (m) | Panel; skaliert mit `outerRadiusM` |
| `tireCornerRadiusMm` | **3,5** | — | Nur Serialisierung; **Profil aus SVG** |
| `spokeCount` | **5** | (fest v1) | Nur **5** Speichen |

**Clamps (Ziel):** `outerRadiusM` z. B. **0,05–2 m**; `rimRadiusM` **< `outerRadiusM`** (Flanke min. ~**15 mm** / 0,015 m — darunter wirkt es nicht mehr wie PKW-NQ); `hubRadiusM` **< `rimRadiusM`**; `tireWidthM` typ. **0,195–0,335 m** (195–335 mm Breite); `hubDepthM` > **0,01 m**; `tireCornerRadiusMm` **0–min((outer−rim)×1000, tireWidth×500)**.

**Später (nicht v1):** Panel-Felder **Section width (mm)**, **Aspect ratio**, **Rim inch** mit Live-Umrechnung in `wheelCarParams` — Defaults bleiben 255/30 R20.

**Rebuild** bei `wheelCarParams`, Material-Slots oder `physicsBodyMode` / Dichte.

---

**Category:** Assets — Wheel Car  
**Title:** Geometrie — Reifen (Gummi, SVG-Lathe)  
**Description:** **Ist v1:** Pfad **schwarz** in [`wheel-car.svg`](../../public/profiles/lathe/wheel-car.svg) → `LatheGeometry` (`wheelTire`), Material **`tireMaterialId`**. Schulter-Rundungen und Bead sind im **Authoring-SVG** — **kein** parametrisches `tireCornerRadiusMm` am Mesh.

**Mesh-Rolle:** `wheelTire`.

---

**Category:** Assets — Wheel Car  
**Title:** Geometrie — Felge (Chrom: SVG-Bänder, Stirnseiten, Speichen)  
**Description:** Felge = **mehrere Meshes**, **ein** Rim-Material (`rimMaterialId`).

| Teil | Geometrie (Ist v1) | Hinweis |
|---|---|---|
| **Außenfelgen-Band** | Pfad **rot** → Lathe `wheelRimOuter` | Radiales Band im SVG (Bead-Zone) |
| **Stirnseiten Außenband** | `RingGeometry` je **min/max axial** des Bands | Rollen `wheelRimOuterStirnIn` / `wheelRimOuterStirnOut` — Muster wie Weinflasche-Stirn |
| **Nabe / innen** | Pfad **blau** → Lathe `wheelRimInner` | Hub-Profil am Achsende |
| **Stirnseiten Nabe** | `RingGeometry` je Band-Ende | `wheelRimInnerStirnIn` / `wheelRimInnerStirnOut` |
| **Speichen** | **5×** `BoxGeometry` in **YZ** | Prozedural; **nicht** im SVG |

**Speichen-Platzierung (Ist):** Achslage **X** = Mitte des Außenfelgen-Bands minus halbe Speichentiefe; **radial** von **Innenkante** `rimOuter` bis **Naben-Innenkante** aus `rimInner` (min. ~4 mm zur Achse). Winkel **`2π / 5`**.

**Später (nicht v1):** Speichen im SVG; getrennte Materialien rot/blau; Bremsscheibe; `hubDepthM` als extrudierte Nabe vor der Stirn.

---

**Category:** Assets — Wheel Car  
**Title:** Materialien (Defaults)  
**Description:**

| Slot | Feld | Default (Built-in) |
|---|---|---|
| Reifen | `tireMaterialId` | **Plastic Matte** (`material-plastic-matte`) — matte Gummi-Optik |
| Felge | `rimMaterialId` | **Chrome** (`material-chrome`) |

Beide Slots: volle Materials-Bibliothek im Dropdown. **Kein** Bild auf Reifen v1.

---

**Category:** Assets — Wheel Car  
**Title:** Schatten  
**Description:** Alle Wheel-Meshes **`castShadow`** + **`receiveShadow`** → [`requirements-shadows.md`](./requirements-shadows.md).

---

**Category:** Assets — Wheel Car  
**Title:** Physik  
**Description:** Wie **Sphere** / **Cylinder** / **Block** → [`requirements-physics.md`](./requirements-physics.md):

| Modus | Verhalten |
|---|---|
| **Fixed** | Statisches Hindernis nach Physik-Start |
| **Dynamic** | Rollt/fällt; Masse aus **vereinfachtem Volumen** (z. B. Ring + Zylinder-Näherung) × `physicsDensityKgPerM3` |

**Collider v1 (Ziel):** **Zylinder** um Achse **X** (Rapier `ColliderDesc.cylinder` mit korrekter Orientierung) mit Radius **`outerRadiusM`**, Halbhöhe **`tireWidthM/2`**, plus **5 mm Margin** nach außen — **kein** detailliertes Speichen-Mesh im Collider. Später: optional **Compound** oder nur Reifenring.

---

**Category:** Assets — Wheel Car  
**Title:** Entity-Felder & Scene-API (Ziel)  
**Description:**

```typescript
type WheelCarParams = {
  outerRadiusM: number;
  tireWidthM: number;
  rimRadiusM: number;
  rimInsetM: number;
  hubRadiusM: number;
  hubDepthM: number;
  tireCornerRadiusMm: number;
  spokeCount: 5;
};

// AssetEntity (Auszug)
{
  assetKind: 'wheel-car';
  wheelCarParams?: WheelCarParams;
  materials?: {
    tireMaterialId?: string;
    rimMaterialId?: string;
  };
  physicsBodyMode?: PhysicsBodyMode; // default 'dynamic'
  physicsDensityKgPerM3?: number;
}
```

**API (Ziel):** `addAsset('wheel-car')`, `setWheelCarParams`, `setEntityMaterial` (pro Slot), `setPhysicsBodyMode`, `setPhysicsDensity`.

**Szene-Panel:** **Dimensions** — `outerRadiusM`, **Tire width (from SVG)** read-only, `rimInsetM`, `hubRadiusM`, `hubDepthM`; **Materials** (Tire, Rim); **Physics** (Mode, Density, Weight read-only).

---

**Category:** Assets — Wheel Car  
**Title:** Serialisierung  
**Description:** `wheelCarParams`, `tireMaterialId`, `rimMaterialId`, `physicsBodyMode`, `physicsDensityKgPerM3` in Scene Save.

---

**Category:** Assets — Wheel Car  
**Title:** Wiederverwendung im Code (Inventur)  
**Description:** Bei Implementierung **erweitern**, nicht parallel erfinden:

| Baustein | Wo |
|---|---|
| SVG → Lathe (mm, Klassen/Stroke) | [`wheel-car-svg-profile.ts`](../../src/engine/wheel-car-svg-profile.ts) (Pen-Muster) |
| Lathe + Stirn + Speichen | [`wheel-car-geometry.ts`](../../src/engine/wheel-car-geometry.ts) |
| Async Populate / Rebuild | [`populate-wheel-car.ts`](../../src/engine/asset-meshes/populate-wheel-car.ts), `rebuildRigidPrimitive` |
| Stirn-`RingGeometry` | [`wine-bottle-glass.ts`](../../src/engine/wine-bottle-glass.ts) (Orientierung) |
| Params / Clamp | [`asset-wheel-car.ts`](../../src/scene/asset-wheel-car.ts) |
| Rigid Collider | [`wheel-car-collider-shape.ts`](../../src/physics/wheel-car-collider-shape.ts) |
| Panel | [`WheelCarFields.tsx`](../../src/ui/panels/entity-fields/WheelCarFields.tsx) |

---

**Category:** Assets — Wheel Car  
**Title:** Tests (Ist)  
**Description:**

- [`wheel-car-svg-profile.test.ts`](../../src/engine/wheel-car-svg-profile.test.ts): drei SVG-Teile, max. Reifenradius ≈ `outerRadiusM`.
- [`wheel-car-geometry.test.ts`](../../src/engine/wheel-car-geometry.test.ts): keine NaN-Vertices; Foot **y ≥ 0**; Außendurchmesser-BBox.
- [`wheel-car-collider-shape.test.ts`](../../src/physics/wheel-car-collider-shape.test.ts): Zylinder-Collider zu Params.

---

**Category:** Assets — Wheel Car  
**Title:** Bewusst nicht v1  
**Description:** Fahrzeug-Chassis; 4-Rad-Gruppe; Bremsscheibe/Bremssattel; Reifenprofil/Tread; Felgen-Designs (Multi-Preset); Spiegelung links/rechts (Nabe); Decals; `sizeScale`; Achse kippen; Speichenzahl ≠ 5; getrennte Materialien pro Speiche; weiche Reifen-Deformation (Physik).

---

**Category:** Assets — Wheel Car  
**Title:** Geometrie v1 — SVG-Lathe + Stirn + Speichen (Norm)  
**Description:**

- **SVG:** [`public/profiles/lathe/wheel-car.svg`](../../public/profiles/lathe/wheel-car.svg) — viewBox mm; Achse **y = 330,5**; Pfade `.tire` / `.rim-outer` / `.rim-inner` (Stroke #000 / #f00 / #00f). Graue `.guide`-Linie ignorieren. **Speichen nicht** im SVG.
- **Mapping:** `radiusM = (330.5 − svgY) × scale / 1000`, `axialM = (svgX − 127.5) × scale / 1000`, `scale = outerRadiusM / 0.3305`. Lathe-Punkt `Vector2(radiusM, axialM)`; Revolution um **Y**, Mesh `rotation.z = π/2` → Achse **+X**.
- **Felge:** Lathe-Bänder + **zwei Stirnringe** pro Band (axial min/max) aus `latheProfileBandBounds` + `RingGeometry`.
- **Speichen:** 5 Boxen; Position/Radius aus SVG-Bounds (`rimOuter` / `rimInner`), siehe Felge-Tabelle.
- **Load:** `builtinLatheProfileUrl('wheel-car.svg')`, Cache in `wheel-car-svg-profile.ts`; `addAsset` leere Group → `rebuildEntity` → `addWheelCar` async.
