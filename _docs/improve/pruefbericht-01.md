# Prüfbericht 01 — Reflexionen & Spiegel (Three.js / TSL / WebGPU)

**Datum:** 2026-10-09  
**Scope:** Technische Prüfung der Reflexionspfade im aktuellen Stand — **nicht** Produkt-Requirements, **nicht** visuelle Mockup-Qualität.  
**Methode:** Code-Inventur (`src/render/`, `src/materials/`, `src/engine/`), Abgleich mit Three.js `ReflectorNode` (r186), manuelle Laufzeitprüfung im Browser (`http://localhost:4040`, Status: WebGPU).  
**Three:** `^0.186.1` · **Renderer:** `WebGPURenderer` · **Unit-Tests:** 132/132 grün (`npm test`).

---

## 1. Zwei Reflexionspfade (Soll-Trennung)

| Pfad | Implementierung | Erwartung (GPU/TSL) |
|------|-----------------|---------------------|
| **IBL / Environment** | `SkyEnvironmentMap` → `PMREMGenerator.fromScene()` → `scene.environment`; Stärke via `scene.environmentIntensity` | PBR specular/diffuse IBL auf allen Node-Materials, die `scene.environment` nutzen |
| **Planar Mirror (Boden)** | TSL `reflector({ bounces: false, generateMipmaps: false })` in `PlanarReflectionPass`; Mix in `GroundMaterial.setupOutput()` | Extra Render-Pass, gespiegelte Kamera an Ground-Plane; unabhängig von IBL |

**Ergebnis:** Beide Pfade sind klar getrennt implementiert. UI mappt korrekt: **Reflections (Eye/Intensity)** → IBL; **Mirror floor** → Planar Pass.

---

## 2. Prüfmatrix

Legende: **OK** = erfüllt / plausibel · **Hinweis** = erwartete Limitierung oder Verbesserungspotenzial · **Offen** = in dieser Session nicht exhaustiv verifiziert.

### 2.1 IBL / PMREM (`environment-map.ts`)

| Kriterium | Ergebnis | Beobachtung |
|-----------|----------|-------------|
| Quelle = Sky-Gradient (gleiches `SkyboxMaterial` wie sichtbarer Himmel) | **OK** | PMREM-Szene: Sphere + shared Material; `pmremScene.fog = null` |
| PMREM-Auflösung | **OK** | `ENV_MAP_PMREM_SIZE = 512` |
| Rebuild nicht pro Frame | **OK** | `scheduleRebuild()` debounced 100 ms; Sky-Farb-Uniforms live, PMREM nur nach Edit |
| Dispose alter Targets | **OK** | `rebuild()` disposed vorheriges `pmremTarget` |
| `reflectionEnabled` → `scene.environment = null` | **OK** | UI „Show Reflections“ (Eye aus): Intensity disabled; IBL abgeschaltet |
| `reflectionIntensity` → `scene.environmentIntensity` | **OK** | Three-Standard für globale IBL-Skala (0–2 im UI laut Docs) |
| Sky-Pass getrennt von Main | **OK** | `viewport-render-pipeline.ts`: Sky-Scene, dann `clearDepth()`, Main-Scene → SMAA |
| Fog auf Environment Map | **Hinweis** | Bewusst **kein** Fog in PMREM-Szene — IBL zeigt unvernebelten Gradient (physikalisch üblich für distant env) |
| `mainScene.background = null` | **OK** | Himmel nur über Sky-Pass, nicht als Background der Main-Scene |

**Laufzeit (IBL):** Mit **Reflections Eye aus** bleiben **planare Bodenspiegelungen** sichtbar (Dose/Flasche im Boden); Highlights auf Metall/Glas der Assets wirken schwächer bzw. weniger „Himmel“ — **IBL und Planar sind entkoppelt** (Soll).

### 2.2 Material / TSL (PBR + IBL)

| Kriterium | Ergebnis | Beobachtung |
|-----------|----------|-------------|
| Ground: `MeshStandardNodeMaterial` + Roughness/Metalness als TSL-Uniforms | **OK** | `colorNode`, `roughnessNode`, `metalnessNode` |
| Assets: Standard/Physical Node Materials | **OK** | Resolver; Glas mit explizitem `envMapIntensity` (0.55–1) |
| IBL ohne eigenes `material.envMap` | **OK** | Nutzung von `scene.environment` (Three Node-PBR-Default) |
| Roughness hoch → schwache IBL-Specular | **OK** | Default Ground `roughness: 0.92` — matt, IBL am Boden kaum sichtbar |
| Transmission vs. IBL | **Offen** | Flasche (Glas) in Szene — keine isolierte A/B-Messung; Code-Pfad `MeshPhysicalNodeMaterial` + `transmission` vorhanden |

### 2.3 Planar Mirror (`planar-reflection.ts`, `groundMaterial.ts`)

| Kriterium | Ergebnis | Beobachtung |
|-----------|----------|-------------|
| Three TSL `reflector()` | **OK** | Entspricht `ReflectorNode` (WebGPU, HalfFloat RT laut Three) |
| `bounces: false` | **OK** | Keine verschachtelten Reflector-Pässe (`_inReflector`-Guard in Three); `updateBeforeType = FRAME` |
| `generateMipmaps: false` | **Hinweis** | Keine Mips auf Mirror-RT — bei schrägen Blickwinkeln / Distanz eher Aliasing/Moire möglich |
| Auflösung skaliert mit Viewport, Cap | **OK** | `resolutionScale = min(1, 1024 / max(w,h))`; `updateResolution` bei Init + Resize |
| Target an Ground gehängt | **OK** | `groundMesh.add(planarReflection.target)` — Plane-Normal/Transform korrekt (Ground `rotation.x = -π/2`) |
| Mix-Formel | **OK** | `blend = mirrorOpacity × (1 − roughness)`; `mix(pbrRgb, mirrorRgb, blend)` in `setupOutput` **nach** PBR |
| Kein Fresnel im Mirror-Mix | **Hinweis** | Bewusst einfaches Linearmix — kein grazing-Fresnel auf dem Spiegelanteil (Three-/Shader-Thema, nicht Bug) |
| Sky im Spiegelpass | **Hinweis** | Main-Scene ohne Sky-Mesh; Spiegel-RT zeigt **keinen** Gradient-Himmel — nur Szene-Objekte (+ Fog/Licht). Entspricht Doc „Sky nicht im Spiegelpass“ |
| Ground self-reflection | **Offen** | Clip-Plane in Three `ReflectorNode` — visuell kein offensichtliches „Boden frisst sich selbst“ bei Test |
| Schatten im Spiegel | **OK** | Gespiegelte Objekte inkl. Schatten sichtbar (Laufzeit: weiche Schatten im Spiegelbild) |
| Symmetrie zur Ebene y=0 | **OK** | Flasche/Dose vertikal gespiegelt, plausibel zur Ground-Plane |

**Laufzeit (Mirror):** **Mirror floor** an, Roughness **0.92** → bei `mirrorOpacity = 1` effektiver Mix **~8 %** — Spiegelung noch erkennbar, dominiert nicht (konsistent mit Formel). Scharfe Objektspiegelung trotz hoher Roughness kommt vom **Planar-Anteil**, nicht von IBL-Schärfe.

### 2.4 Render-Pipeline / WebGPU

| Kriterium | Ergebnis | Beobachtung |
|-----------|----------|-------------|
| WebGPU required | **OK** | `navigator.gpu` Check in Engine |
| MSAA Haupt-Framebuffer | **OK** | `VIEWPORT_MSAA_SAMPLES` auf Canvas, Compositor-RT und Mirror-`reflector({ samples })`; SMAA via `RenderPipeline` |
| Zwei-Pass-Sky + Main | **OK** | Depth-Clear zwischen Passes |
| Tone mapping / color space | **Offen** | Kein expliziter Custom-Pfad im Projekt-Code; Default Three WebGPU — keine Abweichung in Inventur gesehen |
| Resize | **OK** | `handleResize` → `planarReflection.updateResolution` |

### 2.5 Steuerung & Zustand

| Kriterium | Ergebnis | Beobachtung |
|-----------|----------|-------------|
| Default: IBL an, Mirror aus | **OK** | `SCENE_DEFAULTS` |
| Mirror Toggle → Pass nur wenn wired | **OK** | `setMirrorEnabled` add/remove `target` |
| Serialisierung (keine RT-Persistenz) | **OK** | Runtime-Rebuild PMREM; Mirror zur Laufzeit — Docs-konform |

---

## 3. Durchgeführte Laufzeit-Szenen

| Schritt | Einstellung | Ergebnis |
|---------|-------------|----------|
| Basis | Reflections **an**, Mirror **aus**, Assets: Dose + Flasche | Szene stabil, WebGPU, Schatten + diffuse/specular von Licht + IBL |
| Planar | Mirror floor **an**, Roughness 0.92 | Klare gespiegelte Silhouetten unter Objekten; kein Himmel im Spiegel |
| IBL aus | Reflections Eye **aus**, Mirror weiter **an** | Planar-Spiegel bleibt; IBL-Panel disabled — Entkopplung bestätigt |

*Nicht in dieser Runde:* Intensity-Sweep 0→2, Sky-Farbwechsel → PMREM nach 100 ms, Resize-Stresstest, Metalness-Sweep, Mirror aus A/B, Low-Roughness-Mirror (z. B. 0.1), Glas-Transmission isoliert, Export-Framebuffer.

---

## 4. Abweichungen / Risiken (technisch)

1. **Mirror ohne Mipmaps** — **behoben (2026-10-09):** `PLANAR_REFLECTION_GENERATE_MIPMAPS` + `reflector({ generateMipmaps: true })` in `planar-reflection.ts`.  
2. **Post-PBR Linearmix** für Mirror — energie-neutral und Fresnel-frei; für Studio-Boden ok, nicht „physikalisch exakter Spiegel“.  
3. **IBL vs. sichtbarer Sky** — gleiche Farben, aber PMREM ist gefilterte Cubemap; extrem scharfe Zenith-Bänder können in IBL weicher wirken als im Sky-Pass (PMREM-Natur).  
4. **Fog** — nur Main-Scene; IBL unvernebelt; Spiegelpass rendert Main-Scene → Fog auf gespiegelten Objekten plausibel.  
5. **Requirements-Doc Drift** — `requirements-reflections.md` Inventur-Zeile „Reflexionen fehlen vollständig“ ist veraltet (Status-Zeile sagt A+B+C implementiert); für Prüfung irrelevant, aber verwirrend bei nächster Inventur.

---

## 5. Gesamtfazit

| Bereich | Bewertung |
|---------|-----------|
| **IBL (PMREM + scene.environment)** | **Bestanden** — Architektur sauber, Toggle/Intensity korrekt, Debounce/Dispose ok |
| **Planar (TSL reflector)** | **Bestanden** — funktional, entkoppelt von IBL, Parameter `bounces`/`resolutionScale` sinnvoll |
| **GPU/TSL-Randthemen** | **Mit Hinweisen** — keine Mips auf Mirror, kein Fresnel-Mix, Sky nicht im Spiegel (Soll) |

**Empfehlung nächste Prüfrunde (optional):** feste Referenzszene (Kugel + Block + Glas), systematisch Roughness 0 / 0.5 / 1, Reflection Intensity 0 / 1 / 2, Viewport-Resize, RT-Inspect (Mirror-Texture fullscreen linear), Zenith-Farb-Edit → Wartezeit > 100 ms → IBL-Farbmatch.

---

## 6. Relevante Code-Stellen (Kurzreferenz)

- IBL: `src/render/environment-map.ts`, Konstanten `src/constants.ts` (`ENV_MAP_PMREM_SIZE`, `PLANAR_REFLECTION_MAX_SIZE`)
- Planar: `src/render/planar-reflection.ts`, Mix: `src/materials/groundMaterial.ts` (`setupOutput`)
- Pipeline: `src/engine/render-pipeline.ts`, Frame: `src/engine/mockup-engine.ts`
- Three: `ReflectorNode` / `reflector()` — `bounces`, `resolutionScale`, HalfFloat RT, Clip-Plane
