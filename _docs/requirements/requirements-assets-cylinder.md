# Assets — Object Cylinder (`cylinder`)

**Zylinder** für Stilleben und Props — **ohne Bild**, **ein Material**, gleiches Konzept wie **Block** → [`requirements-assets-block.md`](./requirements-assets-block.md). Katalog, Placement → [`requirements-assets.md`](./requirements-assets.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md). Material → [`requirements-materials.md`](./requirements-materials.md). **Fixed / Dynamic** und World-Start → [`requirements-physics.md`](./requirements-physics.md).

**Abgrenzung:** Kein `screenImageId`, keine `faces`. **Tin can** / **Beverage can** = Getränkedosen mit Label — **nicht** dieses Asset.

**Status:** v1 **implementiert** — Katalog, Mesh (Lathe-Fillet), Panel, Rigid Fixed/Dynamic wie Block.

**v1-Scope:** Built-in `cylinder`; **Radius** + **Höhe** in m; **Corner radius** nur an den **zwei Kreiskanten** (obere und untere Mantelkante, Fillet zwischen Deckfläche und Mantel); ein Material-Slot; Bottom-Pivot; Panel + Rebuild; **kein** `sizeScale` — Uniform-Scale-Gizmo **baked** in `cylinderParams`.

---

**Category:** Assets — Cylinder  
**Title:** Identität & Katalog  
**Description:**

| `assetKind` | UI-Label | Kategorie |
|---|---|---|
| `cylinder` | Object Cylinder | **Objects** (Lucide z. B. `cylinder`) |

Mehrfach-Instanzen unbegrenzt.

---

**Category:** Assets — Cylinder  
**Title:** Koordinaten, Pivot & Placement  
**Description:**

- **Y** = Höhe (`heightM`), Achse entlang **Welt-Y** (stehender Zylinder).
- **Pivot:** **Unterkante** (Mittelpunkt der unteren Kreisfläche) bei **lokal y = 0**; Mittelpunkt in **X/Z**.
- Spawn: Unterkante auf Ground — wie Block → [`requirements-scene-placement.md`](./requirements-scene-placement.md).
- Move + Rotate + uniform Scale per Gizmo; Scale-Commit multipliziert `cylinderParams` (radius, height, corner radius mm); **kein** `entity.sizeScale`.

---

**Category:** Assets — Cylinder  
**Title:** Abmessungen (Defaults & Panel)  
**Description:** Meter, UI **4 Dezimalstellen**. Gespeichert in **`cylinderParams`**.

| Parameter | Default (Ziel) | UI | Hinweis |
|---|---|---|---|
| `radiusM` | **0,15** | Radius (m) | Mantel-Radius |
| `heightM` | **0,3** | Height (m) | Entlang **Y** |
| `cornerRadiusMm` | **5,0** | Corner radius (mm) | **Nur** obere + untere **Kreiskante** (2 Kanten) |

**Clamps (Ziel):** `radiusM`, `heightM` z. B. **0,01–20 m**; `cornerRadiusMm` **0–min(radiusM×1000, heightM×1000/2)** (Fillet darf Mantel nicht „verschließen“).

Bei `cornerRadiusMm = 0`: scharfer Zylinder (Kreis + gerade Mantel + flache Deckel).

**Rebuild** bei `cylinderParams`, Material oder `physicsBodyMode`.

---

**Category:** Assets — Cylinder  
**Title:** Geometrie — Corner radius (2 Kanten)  
**Description:** **v1:** Ein **Fillet-Radius** für **beide** Übergänge **Deckel ↔ Mantel** (oben und unten symmetrisch) — **nicht** Fillet entlang der vertikalen Mantellinie (das wäre Block-Logik).

- Mesh: Zylinder-Mantel + obere/untere Kappe mit **gerundeter** Kreiskante (Lathe oder Round-Cylinder-Profil).
- **Clamp:** effektiver Radius wie in Abmessungen-Tabelle.
- **Später:** getrennte Radien oben/unten; Hohlzylinder.

---

**Category:** Assets — Cylinder  
**Title:** Material  
**Description:** Ein Slot **`cylinderMaterialId`** für gesamten Körper; Dropdown = volle Materials-Bibliothek. Default: **Print Matt** (`material-paper`) — wie Block.

---

**Category:** Assets — Cylinder  
**Title:** Schatten  
**Description:** `castShadow` + `receiveShadow` — Pflicht → [`requirements-shadows.md`](./requirements-shadows.md).

---

**Category:** Assets — Cylinder  
**Title:** Physik  
**Description:** Collider-Form = Zylinder (+ 2-Kanten-Fillet wie Mesh), plus **5 mm Physik-Margin nach außen** (nur Rapier) → [`requirements-physics.md`](./requirements-physics.md). **`physicsBodyMode`** am Entity (Scene-Panel) → [`requirements-physics.md`](./requirements-physics.md):

| Modus | Vor **Physik Start** | Nach **Start** (World-Session) |
|---|---|---|
| **Fixed** | Collider in Rapier; Pose folgt Gizmo | Bleibt Fixed (Hindernis) |
| **Dynamic** | Collider optional nur Preview / erst bei Start | Fällt, kollidiert; `massKg = volumeM3 × physicsDensityKgPerM3` |

---

**Category:** Assets — Cylinder  
**Title:** Entity-Felder & Scene-API (Ziel)  
**Description:**

```typescript
type CylinderParams = {
  radiusM: number;
  heightM: number;
  cornerRadiusMm: number;
};

type PhysicsBodyMode = 'fixed' | 'dynamic';

// AssetEntity (Auszug)
{
  assetKind: 'cylinder';
  cylinderParams?: CylinderParams;
  materials?: { cylinderMaterialId?: string };
  physicsBodyMode?: PhysicsBodyMode; // default 'dynamic'
  physicsDensityKgPerM3?: number; // default 1000
}
```

**Volumen (Ziel):** Zylinder inkl. 2-Kanten-Fillet — gleiche Definition wie Collider/Mesh (kein zweites Modell).

**API (Ziel):** `addAsset('cylinder')`, `setCylinderParams`, `setEntityMaterial`, `setPhysicsBodyMode`, `setPhysicsDensity`.

**Szene-Panel:** **Material** → **Physics** (Mode, Density kg/m³, Weight kg read-only) → **Dimensions** (Radius, Height, Corner radius) → **Position** (Pos/Rot).

---

**Category:** Assets — Cylinder  
**Title:** Serialisierung  
**Description:** `cylinderParams`, `cylinderMaterialId`, `physicsBodyMode`, `physicsDensityKgPerM3` in Scene Save.

---

**Category:** Assets — Cylinder  
**Title:** Bewusst nicht v1  
**Description:** Bild/Decal; Hohlzylinder; Ellipse statt Kreis; `sizeScale`; separates Fillet oben/unten.
