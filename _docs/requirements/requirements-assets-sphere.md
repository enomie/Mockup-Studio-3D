# Assets — Object Sphere (`sphere`)

**Kugel** für Stilleben und Props — **ohne Bild**, **ein Material**, gleiches Rigid-Physik-Konzept wie **Block** / **Cylinder** → [`requirements-assets-block.md`](./requirements-assets-block.md). Katalog, Placement → [`requirements-assets.md`](./requirements-assets.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md). **Fixed / Dynamic** → [`requirements-physics.md`](./requirements-physics.md).

**Abgrenzung:** Kein `screenImageId`, keine `faces`, **kein** Corner radius (nur Radius).

**Status:** v1 **implementiert** — Katalog, Mesh, Panel, Rigid Fixed/Dynamic wie Block.

**v1-Scope:** Built-in `sphere`; **Radius** in m; ein Material-Slot; Bottom-Pivot (Kugel berührt Boden); Panel + Rebuild; **kein** `sizeScale` — Uniform-Scale-Gizmo **baked** in `sphereParams.radiusM`.

---

**Category:** Assets — Sphere  
**Title:** Identität & Katalog  
**Description:**

| `assetKind` | UI-Label | Kategorie |
|---|---|---|
| `sphere` | Object Sphere | **Objects** (Lucide z. B. `circle`) |

Mehrfach-Instanzen unbegrenzt.

---

**Category:** Assets — Sphere  
**Title:** Koordinaten, Pivot & Placement  
**Description:**

- **Pivot:** **Unterster Punkt** der Kugel bei **lokal y = 0**; Kugelmittelpunkt bei **y = radiusM**.
- Spawn: Kugel auf Ground — wie Block → [`requirements-scene-placement.md`](./requirements-scene-placement.md).
- Move + Rotate + uniform Scale per Gizmo; Scale-Commit multipliziert `sphereParams.radiusM`; **kein** `entity.sizeScale`.

---

**Category:** Assets — Sphere  
**Title:** Abmessungen (Defaults & Panel)  
**Description:** Meter, UI **4 Dezimalstellen**. Gespeichert in **`sphereParams`**.

| Parameter | Default (Ziel) | UI | Hinweis |
|---|---|---|---|
| `radiusM` | **0,15** | Radius (m) | |

**Clamps (Ziel):** `radiusM` z. B. **0,01–10 m**.

**Rebuild** bei `sphereParams`, Material oder `physicsBodyMode` / Dichte.

---

**Category:** Assets — Sphere  
**Title:** Geometrie (Render)  
**Description:** Sichtbares Mesh = **`IcosahedronGeometry(radiusM, 20)`** (wie [TSL Textures](https://boytchev.github.io/tsl-textures/) Online-Ball), danach **`mergeVertices`** + **`computeTangents()`** für glatte Normalen / Anisotropie — **kein** UV-`SphereGeometry`. Bottom-Pivot: `translate(0, radiusM, 0)`. Implementierung: `src/engine/sphere-geometry.ts` (`SPHERE_RENDER_ICOSAEDRON_DETAIL = 20`). **Physik-Collider** bleibt mathematische Kugel (`ball`) aus `radiusM` — Render-Mesh und Rapier-Form sind bewusst getrennt → Physik-Abschnitt unten.

---

**Category:** Assets — Sphere  
**Title:** Material  
**Description:** Ein Slot **`sphereMaterialId`**; Dropdown = volle Materials-Bibliothek. Default: **Print Matt** (`material-paper`) — wie Block. Resolve mit **`surfaceRole: default`** (nicht Frame, nicht Ground).

**Procedural auf der Kugel:** Profile mit **`triplanar-meters`** (Grid Paper, Wood Soft/Porous) verhalten sich wie am Block — Muster auf der gesamten Oberfläche. Profile mit **`meter-3d`** (Fabric, Concrete, …) nutzen Objekt-Position; Look kann von TSL-Online-Demos abweichen — **kein** Hinweis auf falsche Sphere-Geometrie. Render-Mesh (Icosahedron detail 20, Tangents) dient Mesh-Qualität, nicht der Wahl des Sampling-Raums. Details → [`requirements-materials.md`](./requirements-materials.md) (*Procedural — Sampling (normativ)*).

---

**Category:** Assets — Sphere  
**Title:** Schatten  
**Description:** `castShadow` + `receiveShadow` — Pflicht → [`requirements-shadows.md`](./requirements-shadows.md).

---

**Category:** Assets — Sphere  
**Title:** Physik  
**Description:** Rapier **`ball`** mit Radius = Mesh-Radius **+ 5 mm** Margin (nur Collider) → [`requirements-physics.md`](./requirements-physics.md). **Masse:** `massKg = (4/3)π r³ × physicsDensityKgPerM3` aus **Panel-`radiusM`** (ohne Margin). **`physicsBodyMode`** Default **dynamic**; Scene-Panel: Mode, Density, Weight read-only.

---

**Category:** Assets — Sphere  
**Title:** Entity-Felder & Scene-API  
**Description:**

```typescript
type SphereParams = {
  radiusM: number;
};

// AssetEntity (Auszug)
{
  assetKind: 'sphere';
  sphereParams?: SphereParams;
  materials?: { sphereMaterialId?: string };
  physicsBodyMode?: 'fixed' | 'dynamic';
  physicsDensityKgPerM3?: number;
}
```

**API:** `addAsset('sphere')`, `setSphereParams`, `setEntityMaterial`, `setPhysicsBodyMode`, `setPhysicsDensityKgPerM3`.

**Szene-Panel:** **Material** → **Physics** (Mode, Density, Weight read-only) → **Dimensions** (Radius) → **Position** (Pos/Rot). Footer-Muster → [`improve-04-asset-settings.md`](../../improve/improve-04-asset-settings.md).

---

**Category:** Assets — Sphere  
**Title:** Serialisierung  
**Description:** `sphereParams`, `sphereMaterialId`, `physicsBodyMode`, `physicsDensityKgPerM3` in Scene Save.

---

**Category:** Assets — Sphere  
**Title:** Bewusst nicht v1  
**Description:** Ellipsoid; Hohlkugel; Bild/Decal auf Oberfläche.
