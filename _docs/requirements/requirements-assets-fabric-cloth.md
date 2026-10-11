# Assets — Fabric cloth (Stoffbahn / Textilstück)

Dünnes **Textilstück** mit **Bild auf Vorder- und Rückseite** — Mockups für Schals, Tücher, Stoffmuster, Swatches, Flatlays. **Nicht** nur Seide: beliebiges Stoffmotiv aus der Images-Bibliothek → [`requirements-images.md`](./requirements-images.md). Katalog, Entity-Modell, Drop/Add, image-driven sizing → [`requirements-assets.md`](./requirements-assets.md). Bild-Flächen (Finish, Emissive) → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md). Schatten → [`requirements-shadows.md`](./requirements-shadows.md). Aspect Ratio → `.cursor/rules/image-aspect-ratio.mdc`.

**Englisch (Naming):** UI-Label **Fabric cloth**; `assetKind` **`fabric-cloth`**. Allgemeiner als „silk scarf“ / „silk handkerchief“ (Seide-spezifisch). Alternativ in anderen Tools: *fabric swatch*, *cloth panel* — im Projekt einheitlich **Fabric cloth**.

**Abgrenzung:** **Picture framed** = Rahmen + Opening + Rückwand (Bild nur vorne sichtbar im Opening). **Print** = Prisma mit optional getrennten Faces. **Fabric cloth** = eine **dünne Bahn**, **gleiches Bild vorne und hinten**, optional **Border** (Rand) um die gesamte Kontur. **Wall** = Architektur + Repeat.

**Status:** **nicht implementiert** — nur Requirements.

**Roadmap:**

| Stufe | Name (intern) | Kurz |
|---|---|---|
| **v1** | Stiff plane | Plane (steif), Bild double-sided, Border optional |
| **v2** | Wavy | Prozedurale Wellen (Vertex-Displacement), keine Physik |
| **v3** | Physical | Echtzeit-Verformung (Mass-Spring / PBD), Seiden-Look optional verstärkt |

---

**Category:** Assets — Fabric cloth  
**Title:** Identität & Katalog  
**Description:** Built-in Baustein, nicht löschbar.

| `assetKind` | UI-Label | Kategorie (Ziel) |
|---|---|---|
| `fabric-cloth` | Fabric cloth | **Objects** (Lucide z. B. `layers`, `wind`, `scan`) |

Mehrfach-Instanzen unbegrenzt. Default-Szene: **keine** Pflicht-Instanz.

---

**Category:** Assets — Fabric cloth  
**Title:** Image-driven sizing  
**Description:** Wie [`requirements-assets.md`](./requirements-assets.md): **Nie Bilder verzerren.** Zugewiesenes Bild (`screenImageId`) definiert **Breite-zu-Höhe** der Stoffbahn. **Referenzkante:** **Breite** **0,450 m** (45 cm). Höhe = Breite / Aspect-Ratio. **`sizeScale`** (Default `1`, Range `0.05`–`5`) skaliert Breite und Höhe **proportional** — Ratio bleibt bildgetrieben. Panel: **Size**, **Width (m)**, **Height (m)** wie andere bildtragende Assets; `setAssetSizeScale` ändert **nicht** `transform.position.y` (Mittelpunkt fix).

| Zustand | Aspect-Ratio |
|---|---|
| Mit `screenImageId` | `imageWidth / imageHeight` |
| Ohne Bild (Platzhalter) | **45 / 45 cm** → **Quadrat** 0,45 × 0,45 m |

Texture auf der Stofffläche: **Cover** auf Plane mit **exakt** berechneten Maßen — kein UV-Stretch.

---

**Category:** Assets — Fabric cloth  
**Title:** Vorder- und Rückseite — gleiches Bild  
**Description:** Das zugewiesene Bild ist auf der **Vorder- und Rückseite** der Bahn **sichtbar** (User-Anforderung: Motiv auch von hinten erkennbar).

- **v1:** Ein Mesh (oder äquivalent), Material **`side: DoubleSide`**, **gleiche** Textur/UV auf beiden Sichtseiten — **kein** Spiegeln erforderlich, sofern nicht später als Option gewünscht.
- **Nicht** Picture-framed-Rückwand (opake Wand hinter dem Bild).
- Optional später: getrennte `backImageId` — **nicht v1** (nur ein `screenImageId`).

Finish / Emissive über `imageSurfaces` (typisch `front`; Rückseite folgt demselben Bild-Setup in v1).

---

**Category:** Assets — Fabric cloth  
**Title:** Geometrie v1 — Stiff plane  
**Description:** **Steife** rechteckige Bahn — keine Simulation in v1.

- Basis: `PlaneGeometry` (oder dünnes Box/Plane mit Mindesttiefe nur für Schatten-Kontakt — TBD Implementierung, Ziel: saubere Contact Shadows → [`requirements-shadows.md`](./requirements-shadows.md)).
- **Lokal:** Bahn liegt in **XY** (Normal **+Z** vorne), **Breite = X**, **Höhe = Y** — konsistent mit Print-Front / bildtragenden Planes im Projekt (Inventur bei Implementierung).
- **Subdivision v1:** ausreichend für spätere Wellen/Physik vorbereiten (z. B. 1×1 Segmente ok für stiff; höhere Auflösung erst v2/v3 oder beim Wechsel des Modus) — **kein** sichtbarer Verformungsmodus in v1.
- Rebuild bei: `screenImageId`, `sizeScale`, `fabricClothParams`, Border-Params, `imageSurfaces`.

---

**Category:** Assets — Fabric cloth  
**Title:** Border (Rand) — optional  
**Description:** Optionaler **Rand** um die **gesamte** Stoffkontur (engl. UI: **Border**; textil nah: *trim*, *binding*, *piping* — hier einheitlich **Border**).

| Parameter | Bedeutung | Default (Ziel) |
|---|---|---|
| `borderEnabled` | Rand ein/aus | `false` |
| `borderWidthMm` | Breite des Randstreifens **innen** von der Außenkante (läuft um das Rechteck) | z. B. **20** mm |
| `borderThicknessMm` | **Dicke** / Erhebung des Randes (Z oder extrudiertes Band — TBD Mesh) | z. B. **2** mm |
| `borderColor` | Farbe (Colors / ColorPicker) | z. B. neutral dunkelgrau |

- Border folgt **Außenkontur** der Bahn (Rechteck); bei Bildwechsel skaliert mit `faceWidth` / `faceHeight`.
- Border ist **kein** zweites Bild — **Farbe** (v1). Material: einfaches PBR oder Solid — kein eigener Material-Preset-Pflicht in v1.
- **Kein** Stretch auf dem Hauptbild durch Border — Border additiv außen oder als Ring-Mesh um die Plane.

---

**Category:** Assets — Fabric cloth  
**Title:** Koordinaten, Pivot & Placement  
**Description:** **Pivot:** **Mittelpunkt der Bahn** in **X/Y**, **Unterkante** der Bahn bei **lokal y = 0** (Bahn steht auf dem Boden wie ein ausgelegtes Tuch) — analog bildtragende Assets mit Bodenkontakt → [`requirements-assets.md`](./requirements-assets.md). Spawn: `transform.position.y` so, dass Unterkante auf Ground (+ optional `ASSET_SPAWN_BASE_Y`).

**Transform:** Move + Rotate + **uniform** `sizeScale` (Gizmo Scale) → [`requirements-gimbals.md`](./requirements-gimbals.md).

---

**Category:** Assets — Fabric cloth  
**Title:** Material & Stoff-Look (v1 vs. später)  
**Description:** **v1:** Bilddominiert — `MeshStandard` / bestehendes **Image-Surface**-Pipeline (Matt/Glossy, Emissive). Basis-Stoff-Feel optional über Preset auf Nicht-Bild-Teilen (Border).

**Später (v2/v3, optisch):** `MeshPhysicalMaterial` mit **sheen** / **sheenRoughness** / **sheenColor** und ggf. **anisotropy** für Seidenkanten — **ergänzt** Simulation, ersetzt sie nicht. Procedural Stoff aus Materials-Bibliothek (`fabric-linen`, `silk-fine`) → [`requirements-materials.md`](./requirements-materials.md) nur wo **kein** User-Bild die Fläche füllt.

---

**Category:** Assets — Fabric cloth  
**Title:** Stufe 2 — Wavy (prozedural)  
**Description:** **Keine** Physik-Engine. Modus `deformation: 'wavy'` (Name TBD):

- Vertex-Displacement auf subdividierter Plane (Sinus / kombinierte Wellen), Parameter z. B. Amplitude, Frequenz, Richtung.
- Bild-UVs bleiben **ohne Stretch** (Displacement nur Position; UV-Update-Strategie bei Implementierung festlegen).
- Performance: GPU-freundlich, kein Continuous-Physics-Step nötig — Render on demand → [`requirements-code.md`](./requirements-code.md).

---

**Category:** Assets — Fabric cloth  
**Title:** Stufe 3 — Physical simulation  
**Description:** Echtzeit-faltbare Bahn. **Ziel-Architektur (Priorität):**

1. **WebGPU Compute + TSL (empfohlen):** Hochsubdividierte Plane; **Position-Based Dynamics** / Mass-Spring auf Vertices im Compute-Pass; Three.js-Mesh liest Positionen zurück. Skaliert für **feine** Falten bei hoher Auflösung. Passt zu **WebGPU required**, kein WebGL-Fallback → [`requirements-code.md`](./requirements-code.md).
2. **Rapier (`@dimforge/rapier3d-simd-compat`):** Softbody-ähnlich über **SpringJoints** / Constraint-Netz — für **grobe** Tücher/Flaggen ok; bei sehr dichtem Mesh CPU/WASM-Grenze. SIMD-Stack bereits Projektgrundlage — **Fallback oder grobe Vorschau**, nicht Primärweg für hochauflösende Seidenfalten.

**Viewport:** Kontinuierliches Rendering während Simulation aktiv → `ViewportRenderScheduler.setContinuousRendering` bzw. dedizierter „simulation active“-Pfad. Rapier-`step` nur wenn dieser Asset-Modus läuft und Rapier-Pfad gewählt.

**Scope v3:** Pinning (Ecken/Kanten fixieren), Kollision mit Boden/Props (Collider), Dämpfung — Details bei Freigabe Implementierung; nicht Teil von v1/v2.

**Verworfen für v1:** Blender-Pipeline, reines CPU-Vertex-Spring ohne WebGPU für High-Res.

---

**Category:** Assets — Fabric cloth  
**Title:** Schatten  
**Description:** Stoff-Mesh (und Border): **`castShadow`** und **`receiveShadow`** — Pflicht → [`requirements-shadows.md`](./requirements-shadows.md). Dünne Plane: `material.shadowSide = DoubleSide` wie andere bildtragende Planes.

---

**Category:** Assets — Fabric cloth  
**Title:** Entity-Felder & Scene-API (Ziel)  
**Description:**

```typescript
type FabricClothDeformation = 'stiff' | 'wavy' | 'physical'; // v1: nur 'stiff'

type FabricClothParams = {
  deformation: FabricClothDeformation;
  borderEnabled: boolean;
  borderWidthMm: number;
  borderThicknessMm: number;
  borderColor: string; // hex or colors-library id — align with project color model at implement time
  // v2: waveAmplitudeM?, waveFrequency?, ...
};

// AssetEntity (Auszug)
{
  assetKind: 'fabric-cloth';
  screenImageId?: string | null;
  imageSurfaces?: Partial<Record<AssetFaceId, ImageSurfaceSettings>>;
  sizeScale?: number;
  fabricClothParams?: FabricClothParams;
}
```

**API (Ziel):**

- `addAsset('fabric-cloth', spawn?)`
- `setAssetImage(entityId, imageId | null)` — Rebuild Maße + Textur
- `setAssetSizeScale(entityId, factor)`
- `setFabricClothParams(entityId, partial: Partial<FabricClothParams>)`

**Szene-Panel (Right):** **Image**; **Dimensions** (Size / Width / Height); **Border** (Enable, Width mm, Thickness mm, Color); ab v2/v3 Sektion **Deformation** (Modus + Modus-Parameter).

---

**Category:** Assets — Fabric cloth  
**Title:** Abhängigkeiten & Inventur (Implementierung)  
**Description:** Vor Code: [`requirements-assets.md`](./requirements-assets.md) (image-driven sizing, `sizeScale`), bestehende Plane-Assets in `asset-meshes.ts` / Image-Textur-Resolver, Shadow-Flags. Kein neues paralleles Entity-Modell. v3: Abstimmung mit `PhysicsWorld` und Render-Scheduler — keine Three-Imports in Rapier-Modulen → [`requirements-code.md`](./requirements-code.md).
