# Assets — Block (parametrischer Quader)

Einfacher **3D-Quader** für Stilleben, Podeste, Abstraktionen und Props — **ohne Bild**, **ein Material** auf allen Flächen. Katalog, Entity-Modell, Placement → [`requirements-assets.md`](./requirements-assets.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md). Material-Zuweisung → [`requirements-materials.md`](./requirements-materials.md) (alle Presets im Dropdown).

**Abgrenzung:** Kein `screenImageId`, keine `faces`, kein Tapeten-Repeat. Print (Prisma mit Bild/Farbe pro Face), Wall (Architektur), Picture framed → eigene Docs.

**Status:** v1 **implementiert** — Katalog (`objects`), `block`, Rounded-Box-Geometrie, Panel (Maße, Corner radius, Material), Bottom-Pivot-Spawn, Default **Print Matt**.

**v1-Scope:** Ein Built-in `block`; Maße **Breite × Höhe × Tiefe** in m; **Corner radius** ein Wert für **alle Kanten gleich** (3D-Rundung, Rounded-Box); ein Material-Slot für **alle sechs Seiten**; Panel + Rebuild; Boden-Pivot wie Wand/Print; **kein** `sizeScale` / kein Uniform-Scale-Gizmo (Maße nur über Params).

---

**Category:** Assets — Block  
**Title:** Identität & Katalog  
**Description:** Ein Built-in Baustein, nicht löschbar.

| `assetKind` | UI-Label | Kategorie (Ziel) |
|---|---|---|
| `block` | Block | **Objects** (Lucide z. B. `box` / `cube`) |

Mehrfach-Instanzen unbegrenzt. Default-Szene: **keine** Pflicht-Instanz.

---

**Category:** Assets — Block  
**Title:** Koordinaten, Pivot & Placement  
**Description:** Lokal:

- **X** = Breite (`widthM`)
- **Y** = Höhe (`heightM`)
- **Z** = Tiefe (`depthM`)

**Pivot:** **Unterkante** des Quaders bei **lokal y = 0** (Mittelpunkt in **X** und **Z**). Beim Add/Drop: `transform.position.y` so, dass die Unterkante auf Ground (+ optional `ASSET_SPAWN_BASE_Y`) steht — gleiches Muster wie Wall / bildtragende Assets mit Bodenkontakt.

**Transform:** Move + Rotate per Gizmo → [`requirements-scene-placement.md`](./requirements-scene-placement.md). **Kein** Uniform-Scale am Gizmo für `block` (nur explizite Maße im Panel) → analog Wall (`sizeScale` nicht verwenden).

---

**Category:** Assets — Block  
**Title:** Abmessungen (Defaults & Panel)  
**Description:** Maße in **Metern**, UI **4 Dezimalstellen** (0,1 mm). Gespeichert als **`blockParams`** auf der Entity.

| Parameter | Default | UI | Hinweis |
|---|---|---|---|
| `widthM` | **1,0** | Width (m) | Entlang **X** |
| `heightM` | **1,0** | Height (m) | Entlang **Y** |
| `depthM` | **1,0** | Depth (m) | Entlang **Z** |
| `cornerRadiusMm` | **5,0** | Corner radius (mm) | **Ein** Wert für **alle** Kanten gleich |

**Kein image-driven sizing** — Geometrie hängt nur von `blockParams` ab.

**Clamps (Ziel):** Breite/Höhe/Tiefe z. B. **0,01–20 m**; `cornerRadiusMm` **0–min(widthM, heightM, depthM)×1000/2** (Radius darf halbe kleinste Kante nicht überschreiten). Bei `cornerRadiusMm = 0`: scharfe Box (`BoxGeometry`).

**Rebuild** bei jeder Änderung von `blockParams` oder Material-Slot.

---

**Category:** Assets — Block  
**Title:** Geometrie — Corner radius (alle Kanten)  
**Description:** **v1:** **Rounded box** — gleicher Fillet-Radius an **allen 12 Kanten** (typisches „Kantenradius überall gleich“, nicht nur Front-Silhouette wie Print).

- Implementierung: z. B. `RoundedBoxGeometry` (Three) oder gleichwertiges Mesh; Segment-Anzahl fest (Qualität TBD, z. B. 4–8 pro Ecke).
- **Clamp:** `effectiveRadiusMm = min(cornerRadiusMm, widthM×500, heightM×500, depthM×500)` in mm (halbe kleinste Kante).
- Kein separates Radius pro Achse, keine asymmetrischen Ecken in v1.

**Später (nicht v1):** unterschiedliche Radien pro Achse; Chamfer statt Fillet.

---

**Category:** Assets — Block  
**Title:** Material — eine Oberfläche für alle Seiten  
**Description:** **Ein** Material-Preset für **alle sechs Flächen** — keine per-Face-Zuweisung in v1.

| Slot (Ziel) | Bedeutung |
|---|---|
| `blockMaterialId` | Gesamter Körper |

**Dropdown:** **Alle** Materialien der Bibliothek (built-in + user) — keine Einschränkung auf PBR-only o. ä.

**Default:** **Print Matt** (`material-paper`).

Kein `imageSurfaces`, kein Transmission-Sonderfall auf dem Block (Glas-Preset erlaubt, wenn User wählt).

---

**Category:** Assets — Block  
**Title:** Schatten  
**Description:** Block-Mesh: **`castShadow`** und **`receiveShadow`** — Pflicht, keine Ausnahme → [`requirements-shadows.md`](./requirements-shadows.md), `applyAssetShadowFlags` nach Rebuild.

---

**Category:** Assets — Block  
**Title:** Entity-Felder & Scene-API (Ziel)  
**Description:**

```typescript
type BlockParams = {
  widthM: number;
  heightM: number;
  depthM: number;
  cornerRadiusMm: number;
};

// AssetEntity (Auszug)
{
  assetKind: 'block';
  blockParams?: BlockParams;
  materials?: { blockMaterialId?: string };
  // kein screenImageId, kein sizeScale (v1)
}
```

**API (Ziel):**

- `addAsset('block', spawn?)`
- `setBlockParams(entityId, partial: Partial<BlockParams>)`
- `setEntityMaterial(entityId, 'blockMaterialId', materialId)`

Szene-Panel (Right): Sektion **Dimensions** (Width, Height, Depth, Corner radius mm); Sektion **Material** (Block material).

---

**Category:** Assets — Block  
**Title:** Serialisierung & Presets  
**Description:** `blockParams`, `materials.blockMaterialId` Teil von **Scene Save** / Entity-JSON → [`requirements-architecture.md`](./requirements-architecture.md). Scene-Presets optional später.

---

**Category:** Assets — Block  
**Title:** Bewusst nicht v1  
**Description:** Bild/Decal auf Flächen; mehrere Material-Slots pro Face; `sizeScale` + Gizmo-Scale; Drag-to-viewport-only-Workflows; CSG/Loch; Physik-Masse; UV-Atlas für Texturen pro Seite.
