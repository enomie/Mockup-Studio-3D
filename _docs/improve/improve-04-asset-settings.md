# Szene-Panel — Asset-Einstellungen strukturieren

**Status:** **Runde 1 erledigt (2026-10-14).** Alle Katalog-`assetKind`s: typ-spezifische Sektionen oben, Footer **Dimensions** + **Position**, kein Panel-Block **Transform**. Code: [`asset-scene-panel.ts`](../../src/scene/asset-scene-panel.ts), [`EntityPropertyFields.tsx`](../../src/ui/panels/EntityPropertyFields.tsx). Kurzfassung → [`requirements-assets.md`](../requirements/requirements-assets.md) (*Szene-Panel — Footer*).

**Nicht Runde 1:** Advanced-Dose-mm im Panel, Drag Image → Viewport, Katalog-Polish, vereinzelte Doc-TBDs in Einzel-Assets.

---

## Footer-Regel

Am **Ende** jedes Asset-Blocks im Right Sub **Szene** (unter typ-spezifischen Sektionen):

1. **Dimensions** — alles zu **Maß / Scale** (`sizeScale`, Width/Height in m, parametrische Abmessungen wie Block `widthM`/`heightM`/…).
2. **Position** — **nur** Position (X/Y/Z) und Rotation (X/Y/Z). **Kein** „Transform“-Titel mehr für migrierte Kinds.

Asset-spezifische Sektionen (Image, Material, Physics, Geometries, …) stehen **darüber** in fester Reihenfolge pro `assetKind`.

## Umgesetzt: Rigid primitives (Object Block / Object Cylinder / Object Sphere, `wheel-car`)

| Reihenfolge | Sektion |
|-------------|---------|
| 1 | Material |
| 2 | Physics |
| 3 | Dimensions |
| 4 | Position |

Code: jeweilige `*Fields.tsx`, [`EntityPositionSection.tsx`](../../src/ui/panels/entity-fields/EntityPositionSection.tsx), [`EntityPropertyFields.tsx`](../../src/ui/panels/EntityPropertyFields.tsx) (`isRigidPrimitiveAssetKind` → kein `EntityTransformSection`).

## Umgesetzt: `fabric-cloth`

| Reihenfolge | Sektion |
|-------------|---------|
| 1 | Image |
| 2 | Material |
| 3 | Border |
| 4 | Dimensions (Width, Height — gekoppelt, kein Size) |
| 5 | Position |

Code: [`FabricClothFields.tsx`](../../src/ui/panels/entity-fields/FabricClothFields.tsx), [`EntityDimensionsSection.tsx`](../../src/ui/panels/entity-fields/EntityDimensionsSection.tsx).

## Umgesetzt: `wall`, `wall-door`

| Reihenfolge | Sektion |
|-------------|---------|
| 1 | Material |
| 2 | Wallpaper / Image |
| 3 | Dimensions (Width, Height, Thickness) |
| 4 | Position |

Code: [`WallFields.tsx`](../../src/ui/panels/entity-fields/WallFields.tsx), `usesDimensionsPositionFooter` in [`EntityPropertyFields.tsx`](../../src/ui/panels/EntityPropertyFields.tsx).

## Umgesetzt: Device Smartphone / Device Tablet (`smartphone`, `tablet`)

| Reihenfolge | Sektion |
|-------------|---------|
| 1 | Screen / Image |
| 2 | Geometries |
| 3 | Dimensions (Width, Height; Corner radius, Bezel width, Edge roundness — gekoppelte Screen-Maße, kein Size) |
| 4 | Position |

Code: [`HandheldFields.tsx`](../../src/ui/panels/entity-fields/HandheldFields.tsx); `sizeScaleFromFaceWidth(..., aspect)` für Height-Reference-Kinds.

## Umgesetzt: Device Desktop (`monitor`)

| Reihenfolge | Sektion |
|-------------|---------|
| 1 | Screen / Image |
| 2 | Geometries |
| 3 | Dimensions (Width, Height; Corner/Bezel/Edge; Display tilt; Mount height) |
| 4 | Position |

Code: [`MonitorFields.tsx`](../../src/ui/panels/entity-fields/MonitorFields.tsx).

## Umgesetzt: `print`

| Reihenfolge | Sektion |
|-------------|---------|
| 1 | Faces (Front/Back, Side material, Tints) |
| 2 | Dimensions (Width, Height — gekoppelt, kein Size; Corner radius; Depth) |
| 3 | Position |

Code: [`PrintFields.tsx`](../../src/ui/panels/entity-fields/PrintFields.tsx).

## Umgesetzt: `picture` (Picture framed)

| Reihenfolge | Sektion |
|-------------|---------|
| 1 | Screen / Image |
| 2 | Geometries |
| 3 | Dimensions (Width, Height — gekoppelt, kein Size) |
| 4 | Position |

Code: [`PictureFields.tsx`](../../src/ui/panels/entity-fields/PictureFields.tsx).

## Umgesetzt: `book-softcover`, `book-hardcover`

| Reihenfolge | Sektion |
|-------------|---------|
| 1 | Front cover / Back cover / Spine (Images) |
| 2 | Pages (color, material) |
| 3 | Cover (color, material) |
| 4 | Dimensions (Width, Height — gekoppelt, kein Size; pages/cover/spine thickness, Hardcover-Überhang, Falz) |
| 5 | Position |

Code: [`BookFields.tsx`](../../src/ui/panels/entity-fields/BookFields.tsx).

## Umgesetzt: Packaging / Lathe (`beverage-can`, `wine-bottle`, `pen`)

Normativ → [`requirements-assets-lathe.md`](../requirements/requirements-assets-lathe.md).

| Reihenfolge | Sektion |
|-------------|---------|
| 1 | Label / Image, Geometries, Profil, Material, … |
| 2 | **Dimensions** — **Size** + gekoppeltes **Width** / **Height** (`EntityPropertyFields` + `sizeScaleAndFace`) |
| 3 | **Position** |

Code: [`EntityPropertyFields.tsx`](../../src/ui/panels/EntityPropertyFields.tsx) (`usesPackagingDimensionsPositionFooter`), [`asset-scene-panel.ts`](../../src/scene/asset-scene-panel.ts). Pen: SVG-mm-Import, kein `maxRadiusM` — [`pen-svg-profile.ts`](../../src/engine/pen-svg-profile.ts), [`asset-pen.ts`](../../src/scene/asset-pen.ts).

## Umgesetzt: `tin-can` (Can Tin) — parametrisch, kein Lathe-Footer

| Reihenfolge | Sektion |
|-------------|---------|
| 1 | Label / Image |
| 2 | **Geometries** — Waves (`beadCount`), Sichtbarkeit |
| 3 | Materials |
| 4 | **Dimensions** — **Size** (`sizeScale`), **Radius**, **Height** (m → `tinCanParams`) — **kein** gekoppeltes W/H |
| 5 | **Position** |

Code: [`TinCanFields.tsx`](../../src/ui/panels/entity-fields/TinCanFields.tsx); **nicht** in `usesPackagingDimensionsPositionFooter`.

## Umgesetzt: `wheel-car`

| Reihenfolge | Sektion |
|-------------|---------|
| 1 | Materials, Physics |
| 2 | **Dimensions** — Size + gekoppeltes W/H (Footprint), Tire width, Rim/Hub |
| 3 | **Position** |

Code: [`WheelCarFields.tsx`](../../src/ui/panels/entity-fields/WheelCarFields.tsx), Position-Footer in [`EntityPropertyFields.tsx`](../../src/ui/panels/EntityPropertyFields.tsx).

## Packaging — `wine-bottle` (Bottle Wine)

Gleicher Footer wie Can/Pen: **Size** + gekoppeltes W/H (Footprint = Bauch-Durchmesser × `wineBottleParams.heightM` × `sizeScale`). Code: [`WineBottleFields.tsx`](../../src/ui/panels/entity-fields/WineBottleFields.tsx), [`asset-sizing.ts`](../../src/scene/asset-sizing.ts) (`computeFaceSize` für `wine-bottle`).
