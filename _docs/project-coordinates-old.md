# Plan-Koordinaten & Himmelsrichtungen

**Code (einzige Wahrheit):** [`src/viewport/planCoordinates.ts`](../src/viewport/planCoordinates.ts)  
**Start-Kamera:** [`src/viewport/planViewCamera.ts`](../src/viewport/planViewCamera.ts)  
**Beschriftungen:** [`planScreenOverlay.ts`](../src/viewport/planScreenOverlay.ts) · **Kompass (flach):** [`compassFloor.ts`](../src/viewport/compassFloor.ts)  
**Automatischer Check:** `npm run verify:plan` ([`scripts/verify-plan-orientation.mjs`](../scripts/verify-plan-orientation.mjs))

Y = **Hoch** (Three.js-Welt). Der **Plan** liegt in der Ebene **X / Z** (Boden **Y = −0.4**).

---

## Himmelsrichtungen (Weltachsen)

| Richtung | Achse | Am Raster (Kante) |
|----------|--------|-------------------|
| **Norden** | **+Z** | Oben auf dem Plan (z = +4 m) |
| **Süden** | **−Z** | Unten (z = −4 m) |
| **Osten** | **+X** | **Rechts** auf dem Plan (x = +4 m) |
| **Westen** | **−X** | **Links** auf dem Plan (x = −4 m) |

---

## Plan von oben (Vogelperspektive, Y nach unten weggedacht)

So liegt der Boden **in der Welt** — unabhängig von der Kameradrehung:

```
                    +Z  NORDEN
                         ↑
                         │
         delta           │           alpha
      (−X , +Z)          │        (+X , +Z)
      Nordwesten         │        Nordosten
                         │
  −X  WESTEN ────────────┼─────────────── +X  OSTEN
                         │
         gamma           │           beta
      (−X , −Z)          │        (+X , −Z)
      Südwesten          │        Südosten
                         │
                         ↓
                    −Z  SÜDEN
```

- **Osten** ist immer dort, wo **x positiv** wird (rechte Planhälfte).
- **Westen** ist immer dort, wo **x negativ** wird (linke Planhälfte).
- **Norden** ist immer **+Z** (oben in der Skizze).
- **alpha** = **Nordosten** = Ecke **+X und +Z** (rechts oben in der Skizze).

Quadranten **im Uhrzeigersinn** auf dem Plan, beginnend bei **alpha**:  
alpha → beta → gamma → delta.

---

## Quadranten (Gitter-Farben)

| Name | Himmelsrichtung | Mittelpunkt (x , z) | Unterzeile im Viewport |
|------|-----------------|---------------------|-------------------------|
| **alpha** | Nordosten | (+2 , +2) | `+X  +Z` |
| **beta** | Südosten | (+2 , −2) | `+X  −Z` |
| **gamma** | Südwesten | (−2 , −2) | `−X  −Z` |
| **delta** | Nordwesten | (−2 , +2) | `−X  +Z` |

---

## Symmetrie (Fahrzeug / Patch)

| Element | Bedeutung |
|---------|-----------|
| **Rote Linie** auf dem Boden | Ebene **X = 0** (Symmetrie, wie Prototyp) |
| **Graue Linie** auf dem Boden | Achse **Z = 0** |
| **AxesHelper** am Ursprung | X rot · Y grün · Z blau |

Symmetrie ≠ Himmelsrichtung: **X = 0** ist die Spiegelebene, **Osten** bleibt **+X**.

---

## Referenz-Lösung (Three.js WebGPU + Plan)

Diese Sektion ist die **übertragbare Lösung** für andere Projekte mit gleicher Konvention (N→+Z, E→+X, Start von Süden). Nicht raten, nicht Achsen tauschen, nicht nur UV am Kompass drehen, wenn die **Kamera** oder die **Darstellung** falsch ist.

### 1. Welt & Asset

| Punkt | Vorgabe |
|-------|---------|
| Hochachse | **Y up** |
| Plan-Ebene | **X / Z**, Boden **`FLOOR_Y`** (hier **0**) |
| Kompass-PNG | **N** oben im Bild, **E** rechts im Bild → in Welt **N→+Z**, **E→+X** |
| Quadrant **alpha** | Mittelpunkt **(+FLOOR_HALF/2 , +FLOOR_HALF/2)** |

Konstanten zentral in **einer** Datei (hier `planCoordinates.ts`), Doku verweist nur darauf.

### 2. Start-Kamera (Süden, Blick Norden)

| Parameter | Wert (dieses Projekt) |
|-----------|------------------------|
| Position | **`(0, 10, −10)`** |
| Ziel | Plan-Mitte **`(0, FLOOR_Y + 0.15, 0)`** |
| `camera.up` | **`(0, 1, 0)`** |
| Bedeutung | Von **Süden** schauen, Blickrichtung hat Anteil **+Z** (= Norden) |

Implementierung: `applyDefaultPlanView()` in [`planViewCamera.ts`](../src/viewport/planViewCamera.ts).

### 3. Pflicht: Projektion in X spiegeln (Osten rechts am Screen)

**Problem:** Bei `lookAt` von Süden mit `up = +Y` ist `camera.right` in Welt **−X**. Dann erscheint **+X (Osten) links** am Monitor — **alpha** wirkt in der falschen Ecke, Kompass **E/W** vertauscht, Text wirkt gespiegelt.

**Lösung (nach jedem `updateProjectionMatrix()`, auch beim Resize):**

```typescript
camera.updateProjectionMatrix()
camera.projectionMatrix.elements[0] *= -1
camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
```

Funktion: **`applyPlanProjectionMirrorX(camera)`** — in [`planViewCamera.ts`](../src/viewport/planViewCamera.ts).  
**Orbit:** **`applyPlanOrbitMirrorX(controls)`** (dort) — sonst fühlt sich **horizontales** Drehen mit der Maus **gespiegelt** an.  
**Nicht** Ost/West-Labels tauschen, **nicht** `map.rotation = π` am Kompass als Hack (tauscht E/W).

**Check:** `npm run verify:plan` — u. a. Norden über Süden am Screen, **alpha oben rechts**, **Osten (+X) rechts**.

### 4. Beschriftungen (Text) — 2D-Overlay

**Problem:** **SpriteMaterial** am Boden ist unter WebGPU oft unsichtbar.

**Lösung:** Canvas 2D über dem Renderer, **nur Text** (N/S/E/W, alpha, …) via **`Vector3.project(camera)`** — [`planScreenOverlay.ts`](../src/viewport/planScreenOverlay.ts).

### 5. Kompass **flach auf dem Plan** — WebGPU-Plane (kein Canvas-Quad)

**Falsch:**

- Screen-aligned `drawImage` → Billboard, steht „senkrecht“.
- Perspektiv-Quad aus **zwei Canvas-Dreiecken** → wirkt **verzerrt** (affin pro Dreieck, keine echte GPU-Textur).

**Richtig:** [`compassFloor.ts`](../src/viewport/compassFloor.ts) — **`PlaneGeometry`**, **`rotation.x = −π/2`** (XZ, Oberseite **+Y**), **`flipY: false`**, **`material.side = DoubleSide`**, **`compileAsync`**.

**Warum `DoubleSide`:** Zusammen mit **`applyPlanProjectionMirrorX`** reicht **`FrontSide`** / **`BackSide`** oft nicht — die Textur wirkt dann **nur von unter dem Plan** sichtbar. **`+π/2` + `BackSide`** ist falsch (Normal **−Y** → genau dieses Symptom). **Kein** Canvas-Kompass, **kein** Extra-WebGL-Layer.

### 6. Was du in anderen Projekten **vermeiden** solltest

| Fehler | Warum |
|--------|--------|
| Nur Kompass-UV/`flipY` drehen | Kamera spiegelt X — Symptom bleibt |
| `map.rotation = π` am Kompass | Tauscht **Ost/West** |
| Sprites für Plan-Text | WebGPU oft unsichtbar |
| Kompass als Canvas-Quad / WebGL-Extra-Layer | unnötig — eine Plane reicht |
| Kompass ohne **`compileAsync`** | TSL-Plane oft unsichtbar |
| **`+π/2` + `BackSide`** oder nur **`FrontSide`** am Kompass | Textur oft **nur von unten** (Normal/Culling + Projektions-Spiegel) |
| Himmelsrichtungen in UI tauschen statt Kamera/Projektion fixen | Weltachsen und Code divergieren |

### 7. Dateien in diesem Repo (Vorlage)

| Rolle | Datei |
|-------|--------|
| Konstanten Nord/Ost/alpha/Kamera | [`planCoordinates.ts`](../src/viewport/planCoordinates.ts) |
| Kamera + **`applyPlanProjectionMirrorX`** | [`planViewCamera.ts`](../src/viewport/planViewCamera.ts) |
| Overlay nur Text | [`planScreenOverlay.ts`](../src/viewport/planScreenOverlay.ts) |
| Kompass flach (WebGPU) | [`compassFloor.ts`](../src/viewport/compassFloor.ts) |
| Raster (Linien) | [`quadrantFloor.ts`](../src/viewport/quadrantFloor.ts) |
| Viewport-Start + **`compileAsync`** | [`startViewport.ts`](../src/viewport/startViewport.ts) |
| PNG | [`src/images/compass.png`](../src/images/compass.png) |

### 8. Kurz-Checkliste (neues Projekt)

1. **Eine** Plan-Konstanten-Datei: +Z Nord, +X Ost, alpha = (+x,+z).
2. Startkamera von Süden, Blick +Z; danach **`applyPlanProjectionMirrorX`** (auch Resize) + **`applyPlanOrbitMirrorX`** an OrbitControls.
3. **`npm run verify:plan`** oder gleichen Test portieren (NDC: Norden über Süden, alpha oben rechts, +X rechts).
4. **Text** über 2D-Overlay mit **`project()`**.
5. **Kompass:** **`PlaneGeometry`**, **`rotation.x = −π/2`**, **`flipY: false`**, **`DoubleSide`**, **`compileAsync`** — **kein** Canvas-Warp.
6. Asset: **N** oben, **E** rechts im PNG.

---

## Viewport vs. Plan

| Was | Wo |
|-----|-----|
| **Kompass-PNG** | WebGPU-Plane XZ, [`compassFloor.ts`](../src/viewport/compassFloor.ts) |
| **Text N/S/E/W, alpha…** | Overlay [`planScreenOverlay.ts`](../src/viewport/planScreenOverlay.ts) |
| **Startblick** | **`(0, 10, −10)`** → **+Z**; mit Projektions-Spiegel: **Osten rechts** am Screen |

Nach **Orbit-Drehung** folgen Overlay und Kompass der Kamera; **+Z bleibt Norden** in der Welt.

---

## Kurz-Check

- **Nordosten = alpha** → **+X** und **+Z**
- **Osten** → **+X** · **Westen** → **−X** · **Norden** → **+Z**
- **Startkamera** `(0, 10, −10)` → Blick **+Z** · **`applyPlanProjectionMirrorX`**
- **Kompass** → **`compassFloor.ts`** (Plane **−π/2**, **`DoubleSide`**, **`flipY: false`**) · **Text** → Overlay
