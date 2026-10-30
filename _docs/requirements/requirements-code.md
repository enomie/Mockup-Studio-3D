# Code

Architektur, Patterns und technische Vorgaben für Mockup Studio 3D.

---

**Category:** Code  
**Title:** English only in code  
**Description:** **All source code and code comments in English** — identifiers, strings in code, commit messages optional, but `src/**` strictly English. `_docs/**` and Requirements may be German (or any language). No German variable names, no German inline comments, no German error messages in engine/UI code.

---

**Category:** Code  
**Title:** Strict TypeScript & Modern JavaScript  
**Description:** TypeScript, **strict**. ESM only (`import`/`export`), kein `require`, kein CommonJS. Kein `var`. `const` bevorzugen; `let` nur wenn Mutation nötig. Kein `any` (Ausnahme: explizit kommentierter Escape Hatch an der Stelle). Kein `==` — immer `===`. Keine impliziten Casts; lieber schmal typisieren als `as unknown as`. Public APIs (exportierte Funktionen, Klassen, Module) explizit typisieren. `async`/`await` statt `.then()`-Ketten. Fehler an Systemgrenzen werfen (`throw new Error(...)`), nicht verschlucken. Kein globales mutable State — Abhängigkeiten injizieren oder in Klassen kapseln. Keine Side Effects beim Import (kein Auto-Init in Modul-Top-Level). Kein `eval`, kein `new Function`. ESLint + `tsc --noEmit` müssen grün sein vor Merge/Commit.

---

**Category:** Code  
**Title:** Strict ESLint (type-checked)  
**Description:** Unter `src/**/*.{ts,tsx}` gilt **strenges** ESLint auf Basis von `typescript-eslint` **`strictTypeChecked`** + **`stylisticTypeChecked`** (`eslint.config.js`). Diese Regeln sind **`error`** (explizit im Projekt, nicht nur implizit aus Presets): `@typescript-eslint/no-unnecessary-condition`, `no-non-null-assertion`, `prefer-nullish-coalescing`, `prefer-optional-chain`, `no-empty-function`, `no-unused-vars` (mit `^_`-Ignore), `no-unsafe-argument`, `require-await`, `no-deprecated`, `no-floating-promises`, `no-unsafe-assignment`, `no-redundant-type-constituents` — plus u. a. `no-explicit-any`, `eqeqeq`, `no-restricted-imports` für `@/`. **Ausnahmen:** `src/materials/procedural/**` (TSL-Grenzen, `no-unsafe-*`/`any` gelockert); `*.test.ts(x)` / `*.integration.test.ts(x)` (u. a. `no-non-null-assertion`, `no-floating-promises`, `no-unnecessary-condition`, `no-empty-function` aus). Keine `eslint-disable` in Produktionscode ohne User-Freigabe. Repo-Policy „kein deprecated Code“ zusätzlich: `.cursor/rules/no-deprecated.mdc`. Cursor-Agent: `.cursor/rules/eslint.mdc`.

---

**Category:** Code  
**Title:** Module, Naming & Constants  
**Description:** Ein Verantwortungsbereich pro Datei/Modul. Named exports bevorzugen. Dateinamen: `kebab-case.ts` oder bestehende Ordner-Konvention (`src/render/`, `src/physics/`). Magic Numbers verboten in Logik — Werte nach `src/constants.ts` oder domänenspezifische `constants.ts`. Wiederverwendbare Typen nahe bei der Domäne (`src/colors/rgb.ts`), nicht duplizieren. Keine zirkulären Imports. Keine toten Dateien — entfernte Dateien nach `/_deleted/` verschieben, nicht löschen. Dependencies minimal halten; keine „just in case"-Libraries.

---

**Category:** Code  
**Title:** Path alias (`@/`)  
**Description:** Unter `src/**`: Imports, die ein anderes Top-Level-Modul ansprechen (`scene`, `engine`, `ui`, `data`, `colors`, `units`, `materials`, `render`, `physics`, `config`, …), nutzen den Alias **`@/`** → `src/` (siehe `tsconfig.json` / `vite.config.ts`). Imports **innerhalb desselben Feature-Ordners** dürfen `./` oder `./submodule` bleiben. Keine tiefen Parent-Pfade (`../../..`) — ESLint `no-restricted-imports` (Patterns `../**/../*`) erzwingt das in `src/**/*.{ts,tsx}`.

---

**Category:** Code  
**Title:** Scene-API vs scene domain modules  
**Description:** [`scene-api.ts`](../../src/scene/scene-api.ts) = **`SceneApi`**-Interface + App-Shell-State (Kamera, Licht, Environment, Ground, `AppMode`, `DeepPartial`). **Mutationen** nur über `SceneApi` / Store. **Read-only Domäne** für Entity-Panels: direkt aus `scene/asset-{kind}.ts`, [`asset-ui-helpers.ts`](../../src/scene/asset-ui-helpers.ts), `entity-types`, `material-ids`, `geometry-visibility`, `image-surface` — **keine** Asset-Defaults/Material-IDs/Sizing-Re-exports im `scene-api`-Barrel. Neue Asset-Kinds: Registry + Domänenmodul, nicht 20 Zeilen in `scene-api`.

---

**Category:** Code  
**Title:** Lifecycle, Loops & Performance  
**Description:** Keine Allokationen im Hot Path (Render-Loop, Physics-Step). Geometrien, Materialien, Collider einmal erstellen — nicht pro Frame. Event-Listener registrieren **und** bei Teardown entfernen (`removeEventListener`, `dispose`). `performance.now()` oder Engine-Zeit für Delta — nie `Date.now()` für Simulation. Delta clampen bei Tab-Wechsel (optional, max ~0.1s), um Physics-Explosionen zu vermeiden. Build muss durchlaufen (`npm run build`); Bundle nicht unnötig aufblähen.

---

**Category:** Code  
**Title:** Three.js — WebGPU only  
**Description:** **Nur** `three/webgpu` — kein `three`, kein `WebGLRenderer`, **kein WebGL-Fallback**. Hard Requirement: `navigator.gpu` prüfen — bei fehlendem WebGPU klare Meldung in der UI, kein stiller Fallback. `WebGPURenderer` erst nach `await renderer.init()` nutzen. Animation über `renderer.setAnimationLoop()` — kein manuelles `requestAnimationFrame` für den Haupt-Render-Loop. `setPixelRatio(Math.min(devicePixelRatio, 2))` — nicht blind `window.devicePixelRatio`. Resize: Kamera **und** Renderer aktualisieren. Imports addons aus `three/addons/…` nur wenn nötig.

**Typische Fehler vermeiden:**
- Renderer vor `init()` rendern → schwarzer Screen / Fehler
- WebGL-Beispiele 1:1 kopieren → falsche Imports, falsche Materialien
- Jedes Frame neue `Vector3`/`Color`/`Mesh` → GC-Stutter
- Vergessen `geometry.dispose()` / `material.dispose()` beim Entfernen
- Skybox/Infinite-Objekte mit `frustumCulled: true` → verschwinden
- Kamera-Aspect bei Ortho **und** Perspective korrekt neu berechnen

---

**Category:** Code  
**Title:** Three.js — Szenen, Materialien & TSL  
**Description:** Custom Shader **nur** via TSL (`three/tsl`) und Node-Materialien (`MeshBasicNodeMaterial`, `MeshStandardNodeMaterial`, …) — keine rohen GLSL/WGSL-Strings. TSL-`Fn`: `( [ arg ]: [Node<'vec3'>], _builder ) =>` + `.setLayout({ … })` für korrekte TypeScript-Typen. Uniforms für später einstellbare Werte (`uniform()`), nicht hardcoded im Shader-Graph. Skybox: eigene `Scene`, `SphereGeometry` + `BackSide`, `depthWrite: false`, `frustumCulled: false`, Kamera-Position folgen. Mehrpass-Rendering: Sky → `clearDepth()` → Hauptszene. Standard-Materialien (`MeshStandardMaterial`) brauchen **mindestens** ein Licht — sonst schwarz. Beleuchtung bewusst setzen (Ambient + Directional als Basis).

**Typische Fehler vermeiden:**
- `MeshBasicMaterial` für beleuchtete Objekte erwarten → flach/falsch
- TSL `Fn(([x]) => …)` ohne `_builder` → TS overload-Fehler
- `atan2` in TSL — nutze `atan(y, x)` (2-Argument-Form)
- Node-Material-Uniform `.value` vergessen zu updaten bei Runtime-Änderungen
- Render-Reihenfolge: Skybox rendert Depth weg ohne `clearDepth`

---

**Category:** Code  
**Title:** Procedural materials — TSL reference & sampling  
**Description:** **Vorlagen / Patterns** für neue TSL-Procedural-Profile (nicht Copy-Paste blind): **[TSL Textures](https://boytchev.github.io/tsl-textures/)** (Prof. Slavina Boytchev) — Sammlung von `three/webgpu` + TSL-Generatoren (`npm install tsl-textures`), dokumentierte Parameter, `Fn` + `.setLayout`, WebGPU-first. Repo: [github.com/boytchev/tsl-textures](https://github.com/boytchev/tsl-textures). **Was wir daraus übernehmen:** 3D-Positions-Sampling (`positionGeometry` / `positionLocal`) statt nur einer 2D-Ebene; wiederverwendbare `Fn`-Texturen mit Defaults; klare Trennung Generator vs. Material-Zuweisung (`colorNode = wood({…})`). **Was Mockup Studio anders macht:** eigene Presets in `src/materials/procedural/`, kein NPM-Dependency auf `tsl-textures` in v1 — Ideen portieren, Domäne (Meter, `tileScale`, Asset-Slots) beibehalten.

**Sampling-Räume** (`ProceduralSamplingSpace` in `procedural-types.ts`):

| Raum | Mechanik |
|---|---|
| `uv` | Perimeter-`UV` in m am Frame (`grainAlongU`) |
| `planar-meters` | `positionLocal.xy` × `tileScale` — Ground (Wood, Grid), Frame (`paper-grain`) |
| `triplanar-meters` | XY/XZ/YZ in m — UV-Paare in `procedural-triplanar-meters.ts`; **Wood:** gewichtetes Skalar-Blend; **Grid:** dominante Normalen-Achse wählt **eine** Maske (`grid-paper.ts`) |
| `meter-3d` | `positionLocal` × `tileScale` (+ seed) — `meterPositionLocal`; Brushed nutzt Triplanar nur für Streak-Phase |

**Profil × `surfaceRole`:** normative Matrix → [`requirements-materials.md`](./requirements-materials.md) (*Procedural — Sampling (normativ)*). Resolver: `resolveProfileSamplingSpace` (`procedural-sampling-profiles.ts`).

**Porting-Regeln (TSL Textures, MIT):** Vor Port **LICENSE** im Upstream-Repo prüfen; **Copyright-Hinweis** im portierten Modul (`tsl-noise.ts`, ggf. `wood-soft.ts` …). Parameter-Mapping: TSL `scale` → Mockup `tileScale` (repeats/m); `seed` → `preset.seed`; Fabric `pinch` → `normalScale`. Kein 1:1-API-Clone — Ausgabe immer `ProceduralMaterialNodes` für `createTexturedMaterial`. `mx_noise_float` aus `three/tsl` = Upstream `noise` in `tsl-utils.js`.

**Typischer Fehler:** Nur `positionLocal.xy` auf einem Würfel → Front/Back ok, Seiten/Deckel ohne Muster. **Fix:** `meter-3d` oder `triplanar-meters`. Details → [`requirements-materials.md`](./requirements-materials.md) (Port map).

---

**Category:** Code  
**Title:** Asset-specific TSL on surfaces (Bild + Preset)  
**Description:** Manche Assets modifizieren **nicht** die Geometrie für einen visuellen Detail-Effekt, sondern **erweitern** das Flächen-Material in TSL (Uniforms aus Entity-Params). Pattern: ein Mesh, `createTexturedMaterial` / Bild-auf-Preset-Pipeline, zusätzliche Nodes vor dem finalen `colorNode` / `normalNode`.

| Asset | Effekt | Sampling | Spec |
|---|---|---|---|
| **Fabric cloth** | Border-Inset (eingefärbter Rand) | Plane-Kanten in **Metern** (`positionLocal`) | [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md) |
| **Book** (geplant) | **Hinge groove** (Falz/Gelenk) auf Cover-Außenfläche | **Objektspace** entlang Deckelbreite (mm-Params), unabhängig von Cover-UV | [`requirements-assets-book.md`](./requirements-assets-book.md) |

**Book v1 (normativ):** Falz **nur** Shader auf Front/Back-Cover — **kein** Extra-Mesh für die Rinne. Implementierung: dedizierter Cover-Material-Builder mit Hinge-Nodes; Intensität/Breite/Offset aus `bookParams`.

---

**Category:** Code  
**Title:** Lathe assets — SVG paths in millimeters  
**Description:** Körper aus **`LatheGeometry`** + Profilen unter `public/profiles/lathe/`. **Normativ:** Pfadkoordinaten = **Millimeter** (1 Einheit = 1 mm → Meter in Engine); **viewBox-Größe ist nicht das Produktmaß**. Skalierung in der Szene nur **uniform** (`sizeScale`, gekoppeltes Width/Height im Panel) — **keine** Verzerrung von Dose, Flasche, Rad, Stift; Bilder ändern nur Textur. Anderes Produktprofil = **SVG bearbeiten**, nicht non-uniform UI-Scale. Vollständig → [`requirements-assets-lathe.md`](./requirements-assets-lathe.md).

---

**Category:** Code  
**Title:** Three.js — Ressourcen & Cleanup  
**Description:** Jede `BufferGeometry`, jedes `Material`, jede `Texture` die erzeugt wird, muss einen Owner haben der `dispose()` aufruft wenn das Objekt entfernt wird. Bei Material-Swap: altes Material disposen. Renderer-Canvas beim Unmount entfernen (`domElement.remove()`). Keine doppelten Loader-Instanzen ohne Cache. Große Assets lazy laden wo sinnvoll.

---

**Category:** Code  
**Title:** Rapier — Init, Timestep & World  
**Description:** Package: `@dimforge/rapier3d-simd-compat`. **`await RAPIER.init()` genau einmal** vor der ersten World-Erstellung. Eine `World`-Instanz pro Szene/Simulation — nicht pro Frame neu. **Fixed Timestep** (z. B. 1/60 s) mit Accumulator — `world.step()` nie mit variablem Frame-Delta direkt aufrufen. Schwerkraft und Units in `constants` oder `PhysicsWorld` zentral. Konvention: **1 Three-Einheit = 1 Meter**. Physik-Logik in `src/physics/` kapseln — nicht in `main.ts` verstreuen.

**Typische Fehler vermeiden:**
- `world.step()` ohne vorheriges `RAPIER.init()` → Crash
- Variable Delta-Time in `step(event)` → instabile Simulation, Tunneling
- Mehrere `init()`-Calls parallel → undefiniert
- World-Größe/Objekt-Skala falsch (Riesen- oder Mikro-Collider) → nichts bewegt sich sinnvoll

---

**Category:** Code  
**Title:** Rapier — Bodies, Collider & Render-Sync  
**Description:** Collider-Größen: `ColliderDesc.cuboid(hx, hy, hz)` = **Half-Extents**, nicht Full Size. Body erstellen → Collider an Body hängen → Mesh separat. **Sync-Richtung:** Physics → Graphics (nach `step`: `body.translation()` / `rotation()` → `mesh.position` / `mesh.quaternion`). Nicht umgekehrt für dynamic bodies. Static/fixed Bodies für Boden/Wände; dynamic für bewegliche Objekte; kinematic nur wenn bewusst gewählt. Boden-Collider leicht über/unter Mesh-Oberfläche positionieren, nicht „schwebend". Beim Entfernen: `world.removeRigidBody()` / Collider cleanup — Leaks vermeiden. Kräfte/Impulse nur im Physics-Step oder davor akkumulieren, nicht willkürlich im Render-Callback.

**Typische Fehler vermeiden:**
- Box 2×2×2 Mesh aber `cuboid(2,2,2)` → Collider doppelt so groß wie Mesh
- Mesh-Position setzen **vor** `physics.step()` → ein Frame Lag / Jitter
- Rotation aus Rapier ignorieren → rutschende/schräge Körper falsch dargestellt
- Dynamic Body ohne Collider → fällt durch alles
- Fixed Timestep vergessen aber Impulse pro Frame → framerate-abhängige Physik

---

**Category:** Code  
**Title:** Physics ↔ Three Trennung  
**Description:** Render-Loop ruft `physics.step(delta)` und danach Sync-Methoden auf — klare Reihenfolge. Keine Three-Objekte in Rapier-Modulen importieren. Rapier-Handles (`RigidBody`, `Collider`) in dünnen Wrapper-Klassen (`PhysicsWorld`, später `PhysicsBody`) — Main/Scene kennt keine Raw-WASM-Details. Später: Entity-ID-Map `bodyHandle → Mesh` statt ad-hoc globale Referenzen.

---

**Category:** Code  
**Title:** React für UI-Chrome (entschieden)  
**Description:** **React** nur für die App-Hülle (Toolbar, Sidebars, Panels, Slider, Inputs, Dialoge, Asset-Galerie) — **nicht** für den 3D-Viewport. Kein `@react-three/fiber`, kein R3F, kein Three in React-Komponenten. Der WebGPU-Canvas bleibt **Vanilla TypeScript** (`src/render/`, `src/main.ts` o. ä.). React-Code unter `src/ui/` (o. ä.). Kommunikation UI ↔ Engine über eine **schmale Scene-API** (Events/Store), nicht durch direkten Three-Import in UI-Komponenten.

**Typische Fehler vermeiden:**
- Three-Renderer in React `useEffect` ohne klare Lifecycle-Trennung
- React-State und Render-Loop vermischen → Re-Renders pro Frame
- R3F/WebGL-Beispiele übernehmen → widerspricht WebGPU-only

---

**Category:** Code  
**Title:** Images — aspect ratio (never distort)  
**Description:** **Never stretch/distort images** in UI or engine unless user enabled **Override aspect ratio** (checkbox). Use `object-fit: cover` or `contain` for HTML images; for textures use Cover/Contain/Tile UV logic — not full-quad stretch. Read [`requirements-images.md`](./requirements-images.md). Rule: `.cursor/rules/image-aspect-ratio.mdc`.

**Typical mistakes to avoid:**
- Thumbnail `width` + `height` with default stretch behavior
- Ground UV 0–1 stretch without override flag
- Export canvas drawImage with independent scale X/Y

---

**Category:** Code  
**Title:** UI Icons — lucide-react  
**Description:** Icons nur via **`lucide-react`** ([Lucide](https://lucide.dev/icons/)). Import pro Icon: `import { Sun, Camera } from 'lucide-react'`. Props: `size`, `strokeWidth`, `className`, `aria-hidden` (dekorativ) oder `aria-label` (icon-only Button). Optionaler Wrapper `Icon` in `src/ui/components/` für Default-Size/Stroke aus [`requirements-look-and-feel.md`](./requirements-look-and-feel.md). **Keine** anderen Icon-Libraries, **keine** eingebetteten SVG-Kopien, **keine** Icon-Fonts. Icons nur in `src/ui/**` — Engine/Three importiert keine Lucide-Icons.

**Typische Fehler vermeiden:**
- Gesamtes Lucide-Paket importieren → Bundle aufblähen (nur benötigte Icons)
- Icon-only Buttons ohne `aria-label` → Accessibility
- Feste Hex-Farben auf Icons statt `currentColor` → bricht Theme/Hover

---

**Category:** Code  
**Title:** UI-State, Modes & Scene-API  
**Description:** App-State (Mode, Selection, Assets, Panel-Zustand) lebt in der **UI-Schicht** (React + Store). `AppMode`: `select` | `translate` | `rotate` | `scale` | `place-texture` | `export` — steuern Toolbar, Cursor-Hinweis und Canvas-Input-Handler (`ViewportInputController`). Slider/Inputs sind controlled components; Änderungen gehen über Store → Scene-API → Engine. Kein globaler mutable State außerhalb des Stores. Engine importiert kein React.

---

**Category:** Code  
**Title:** Hochqualitative Schatten (Pflicht)  
**Description:** Mockups brauchen **realistische, weiche, stabile Schatten** — kein „Flat-3D". Vollständige Szene-Schatten-Requirements: [`requirements-shadows.md`](./requirements-shadows.md). Code-Bezug: **WebGPURenderer** + `PCFShadowMap` (r186, Vogel-Disk + IGN), `renderer.highPrecision = true`; Helper `src/render/shadow-setup.ts`, adaptive Spot-Coverage `src/render/scene-shadow-coverage.ts`; Konstanten u. a. `SHADOW_MAP_SIZE` (4096), `SHADOW_MAP_SIZE_EXPORT` (8192, nur Capture), `SHADOW_COVERAGE_RADIUS` / `SHADOW_COVERAGE_RADIUS_MIN`, `SHADOW_SOFTNESS_*`, `SHADOW_DEPTH_BIAS`, `SHADOW_NORMAL_BIAS` (Referenz **0** / **0** für Boden-Kontakt) in `constants.ts`. Export: `LightingSystem.pushExportShadowQuality` in `mockup-engine-capture.ts`.

**Typische Fehler vermeiden:**
- `castShadow`/`receiveShadow` vergessen → Objekte schweben optisch
- Shadow-Map 512/1024 → körnige, unprofessionelle Mockups
- Light-Shadow-Frustum zu groß → unscharfe, low-res Schatten
- Nur AmbientLight → flache Szene ohne Tiefe
- WebGL-Shadow-Beispiele 1:1 — WebGPU-Shadow-Setup prüfen

---

**Category:** Code  
**Title:** Kameras (Pflicht-Set)  
**Description:** Zwei Kameratypen decken alle Mockup-Szenarien ab — nicht mehr als nötig am Start:

1. **Perspective + Orbit** (Primary) — Standard-Arbeitskamera. Produkt in Szene, 3/4-Ansicht, Stilleben, Geräte-Mockups. Orbit um einen **Target-Punkt** (Szene-Mitte). **Mausrad-Zoom = Dolly** (`spherical.radius`, **0,350–10,000 m**). **FOV** separat per Panel-Slider — nicht per Mausrad.

2. **Orthographic** (Secondary) — Maßstabsgetreu, parallelprojektiv. Tapeten, Böden, Flyer-Layouts, Druckflächen, Top/Front ohne Perspektiv-Verzerrung. **Mausrad-Zoom = Frustum** (`orthoZoom`) — Kamera-Position ändert sich nicht; Näherfliegen vergrößert nicht.

Wechsel Perspective ↔ Orthographic behält **Target + Pan-Offset** bei. Export-Kameras = gespeicherte Viewports (Preset-Positionen), **keine** dritte Kamera-Klasse. Implementierung in `src/engine/camera-controller.ts` — Input getrennt von Render-Loop. Keine Kamera-Logik in React.

**Typische Fehler vermeiden:**
- Nur Perspective → Boden/Tapete verzerrt
- Nur Ortho → Produkt-Mockups wirken flach/falsch
- Kamera in `main`/UI statt Engine-Modul

---

**Category:** Code  
**Title:** Viewport-Navigation (Space = Pan)  
**Description:** **Space + Drag** = Pan (Hand-Tool, Figma/Blender-Konvention). Während Space gedrückt: Cursor `grab`/`grabbing`, kein Orbit/Select. Pan verschiebt **Kamera + Orbit-Target** gemeinsam entlang `camera.right` und `camera.up` — die Arbeitsfläche bewegt sich unter dem Cursor, Szene-Inhalt bleibt unverändert. Mittlere Maustaste = optional gleiches Pan. Touch: zwei Finger = Pan. Space loslassen → vorheriger Mode. **Zoom:** Mausrad / Pinch — **Perspective:** Dolly (Distance); **Orthographic:** `orthoZoom` (Frustum). Orbit: Linksklick-Drag (nur wenn Space **nicht** aktiv). Logik in Engine (`CameraController`), nicht in React. Details → [`requirements-camera.md`](./requirements-camera.md).

---

**Category:** Code  
**Title:** Längen & Abstände — Meter, 3 Nachkommastellen  
**Description:** **Engine / Three.js / Rapier:** **Meter (m)** — **1 Scene-Einheit = 1 m** (bestehend). **UI** für Längen, Abstände, Offsets (Fog Near/Far, Placement, Kamera, …): Anzeige und Eingabe in **Metern** mit **3 Nachkommastellen** — z. B. `0.080` m (= 80 mm). **Millimeter-Genauigkeit** über die dritte Dezimalstelle; kleinster Schritt **0.001 m** (`LENGTH_STEP_M` in `src/units/length.ts`). Format/Parse: `formatLengthMeters`, `parseLengthMetersInput`. **Typischer Mockup-Bereich:** ~0.001–1.000 m; größere Werte (Environment/Fog) erlaubt. Keine separate mm-Einheit in der UI — immer **m** mit 3 Dezimalen.

---

**Category:** Code  
**Title:** Render-Pipeline — Sky-Pass (Zwei-Pass, aktualisiert)  
**Description:** `src/engine/render-pipeline.ts`: Pass 1 `render(skyScene)` mit `autoClear=true`; Pass 2 `render(mainScene)` mit **`autoClear=false`**, danach nur `clearDepth()`, `autoClear` wieder `true`. Zweiter Pass darf **Farbpuffer nicht** leeren. `WebGPURenderer({ alpha: false })` — opakes Canvas. Details → [`requirements-environment.md`](./requirements-environment.md).

---

**Category:** Code  
**Title:** TSL Uniforms — RGB & Float (Runtime-Update)  
**Description:** **RGB:** `createRgbUniform()` → `uniform(new Vector3(r,g,b))`, Update via `.value.set()` — **nicht** `uniform(vec3(...))`. **Float:** `createFloatUniform()` in `uniform-float.ts`; skalare Uniforms in Shader-**Arithmetik** verwenden — `mix(const, const, uniform)` kann beim Compile eingefroren werden (Sky Horizon fade). Pattern: `float(0.9).sub(uFade.mul(float(0.85)))`.

---

**Category:** Code  
**Title:** Viewport — Render-on-demand & Tab-Pause  
**Description:** Der Haupt-Viewport rendert **nicht** dauerhaft 60 fps bei statischer Szene. **`ViewportRenderScheduler`** (Engine): `requestRender()` nach sichtbaren Änderungen (Szene, Licht, Ground, Resize, Store→Engine-Sync); **`setContinuousRendering(true)`** während Kamera-Drag/Pinch, Gizmo-Drag und vergleichbarer Interaktion — danach wieder aus. Animation nur über `renderer.setAnimationLoop()` — kein separates `requestAnimationFrame` für den Haupt-Render. **`document.hidden`:** Loop stoppen; bei Tab wieder sichtbar mindestens ein Frame. **Kein** Qualitäts-Downgrade (Schatten 4096², MSAA, SMAA unverändert) — nur weniger Frames. Rapier-`step` nur wenn dynamische Bodies existieren (oder Debug-Cube). Implementierung: `src/engine/viewport-render-scheduler.ts`, Anbindung in `mockup-engine.ts`.

---

**Category:** Code  
**Title:** Viewport — Invalidation Contract  
**Description:** **`ViewportInvalidation`** (`src/engine/viewport-invalidation.ts`) ist die einzige Engine-API für „Canvas neu zeichnen“ (`invalidate`, `setContinuous`, optional `invalidateAfter`). **`MockupEngine`:** `invalidateViewport()` vs. `notifySceneApiListeners()` — Store-Sync **≠** Render. Registry-`subscribeEntities`/`subscribeSelection` → nur Store; sichtbare Änderungen enden mit `invalidateViewport()` oder `commitVisualState(fn)` (Selection + Gizmo, `setMode`, `applyAtmosphereSnapshot`). **Jede** SceneApi-Mutation mit Three-Auswirkung invalidiert (Lighting, Environment, Ground, Kamera, Assets). **Async:** `AssetSystem` nach `rebuildEntity`; `SkyEnvironmentMap` nach PMREM-`rebuild`. Neue Features: Invalidation anbinden, nicht ad-hoc `requestRender` verstreuen.

---

**Category:** Code — Fabric cloth  
**Title:** Rapier cloth — Engine-Grenzen  
**Description:** Physik in **`src/physics/`** + Session in **`src/engine/`** — ein Rapier-`step` pro Frame. Stoff: `FabricClothPhysicsColliders` (Rapier **SoftBody** + Vertex-Sync). → [`requirements-physics.md`](./requirements-physics.md).

---

**Category:** Code  
**Title:** No deprecated APIs  
**Description:** In **`src/**`**: kein `@deprecated`, keine Kommentare die APIs als „deprecated“ markieren, keine exportierten Kompatibilitäts-Aliase (alte Funktions-/Typ-/Konstantennamen parallel zum neuen Namen). Umbenennungen: alle Referenzen umstellen, alte Oberfläche löschen — nicht als deprecated stehen lassen. **Erlaubt:** einmalige **Load-Migration** (private Legacy-IDs in `migrate*` / `normalize*`, in Requirements dokumentiert). Cursor-Regel: `.cursor/rules/no-deprecated.mdc`. Entscheidung: Diary *2026-10-10 — Datenmodell — kein deprecated*.

---
