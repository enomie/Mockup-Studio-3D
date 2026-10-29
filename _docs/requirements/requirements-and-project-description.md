# Mockup Studio 3D — Projekt & Anforderungen

**Version:** 0.0.1 (npm `mockup-studio-3d`)

Zentrale Projektbeschreibung. Detail-Requirements in den verlinkten Kategorie-Dateien.

## Weitere Requirement-Dateien

| Datei | Inhalt |
|---|---|
| [`requirements-app-layout.md`](./requirements-app-layout.md) | Shell: Top/Left/Right/Status, Main + Sub; Sub-Collapse; List\|Detail-Split in Sub |
| [`requirements-lighting.md`](./requirements-lighting.md) | Studio-Rig v1 (Ambient/Key/Fill), Right Panel; Multi-Light v2 |
| [`requirements-lighting-presets.md`](./requirements-lighting-presets.md) | Light rigs (Left): Lighting-Presets, User-Save — v1 live |
| [`requirements-shadows.md`](./requirements-shadows.md) | Szene-Schatten: Qualität, mm-Kontakt, Cast/Receive, Engine |
| [`requirements-antialiasing.md`](./requirements-antialiasing.md) | Viewport MSAA + SMAA, Mirror-Samples |
| [`requirements-physics.md`](./requirements-physics.md) | Rapier: Start/Freeze; Block Fixed/Dynamic + Dichte; Stoff **SoftBody**-Cloth (festes Subdivision-Grid); Drape aus Material; Collider-Margin 5 mm; Gravity scale 0,01–2 |
| [`requirements-physics-test.md`](./requirements-physics-test.md) | Physics-Panel: rigid Fall-Test (0,1 m Würfel, Start/Stop) |
| [`requirements-scene-placement.md`](./requirements-scene-placement.md) | Entities, Select, Move, Rotate, Scale, Viewport-Input |
| [`requirements-gimbals.md`](./requirements-gimbals.md) | Transform-Gizmo: Translate, Rotate, Scale (uniform), Input |
| [`requirements-camera.md`](./requirements-camera.md) | Kamera: Quick Bar, Sub-Panel, Presets, Navigation |
| [`requirements-export.md`](./requirements-export.md) | **Bild-Export** (normativ): PNG/JPG, transparent Sky, Contact shadows, Stoff WYSIWYG (kein Bake v1), Pipeline, UI, Store |
| [`requirements-environment.md`](./requirements-environment.md) | Sky, Fog, Reflections, Ground (ein Panel) |
| [`requirements-environments.md`](./requirements-environments.md) | Environments-Bibliothek (Left): Atmosphäre-Presets, User-Save — v1 live |
| [`requirements-reflections.md`](./requirements-reflections.md) | IBL, Reflection Intensity, Planar Mirror |
| [`requirements-ground.md`](./requirements-ground.md) | Ground Panel: Materials Library, Schatten, Mirror; procedural tiling; Bild/Mapping später |
| [`requirements-scenes.md`](./requirements-scenes.md) | Scene-Presets: Built-ins, User-Save, Load |
| [`requirements-images.md`](./requirements-images.md) | Images-Bibliothek, Upload, Starter, min. 10 |
| [`requirements-planar-editor.md`](./requirements-planar-editor.md) | **Profiles** (Left): Built-in/User, Duplicate; **Planar Editor** im Viewport; Lathe/Extrude-Pfade |
| [`requirements-history.md`](./requirements-history.md) | Undo/Redo (kontextuell); Workspace-Persistenz (IndexedDB), Browser-Neustart |
| [`requirements-image-surfaces.md`](./requirements-image-surfaces.md) | Bild-Flächen: Finish, Emissive, Passepartout (Zwei-Mesh-Engine) |
| [`requirements-colors.md`](./requirements-colors.md) | Colors-Bibliothek, benannte RGB-Swatches, ColorPicker-Integration |
| [`requirements-materials.md`](./requirements-materials.md) | Materials-Bibliothek, PBR-Presets, Built-ins, Zuweisung |
| [`requirements-assets.md`](./requirements-assets.md) | Bausteine-Katalog, Drop, Screen-Bild, image-driven sizing; **Bake → User Assets** (Selektion, Registry) |
| [`requirements-assets-lathe.md`](./requirements-assets-lathe.md) | Lathe-SVG: Pfad-mm, uniform scale, Szene-Panel Dimensions/Position |
| [`requirements-assets-book.md`](./requirements-assets-book.md) | Book Softcover & Book Hardcover, Papierblock, Deckel, Rücken, Spine-Bild |
| [`requirements-assets-picture-framed.md`](./requirements-assets-picture-framed.md) | Picture Frame: Rahmen, Z-Stack, Glas, Geometries-Panel |
| [`requirements-assets-wall.md`](./requirements-assets-wall.md) | Wall & Wall Doorway: Maße, Tapetenmuster, Tür-CSG |
| [`requirements-assets-block.md`](./requirements-assets-block.md) | Object Block (`block`): Quader, ein Material, Corner radius, Fixed/Dynamic |
| [`requirements-assets-cylinder.md`](./requirements-assets-cylinder.md) | Object Cylinder (`cylinder`): Radius/Höhe, Fillet an 2 Kreiskanten |
| [`requirements-assets-sphere.md`](./requirements-assets-sphere.md) | Object Sphere (`sphere`): Radius, Rigid Fixed/Dynamic |
| [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md) | Fabric cloth: Flatlay, Bild oben+unten, Border, Rapier-Simulation |
| [`requirements-assets-beverage-can.md`](./requirements-assets-beverage-can.md) | Can Beverage (330 ml): SVG-Lathe Alu-Körper + Label-UV auf Mantel (`public/profiles/lathe/lathe-y-can-330ml-*.svg`), Endring |
| [`requirements-assets-tin-can.md`](./requirements-assets-tin-can.md) | Can Tin (Blechdose): Radius + Höhe parametrisch, Beads mittlere 80 % Mantel, Label folgt Wellung |
| [`requirements-assets-wine-bottle.md`](./requirements-assets-wine-bottle.md) | Bottle Wine (`wine-bottle`): offene Außen-SVG (`profiles/lathe`), Glas + Stirnringe, Korken, Kapsel, Etikett |
| [`requirements-assets-pen.md`](./requirements-assets-pen.md) | Pen: Marker & fountain pen — SVG-Lathe Cap/Ring/Body, Bild-Wrap auf Schaft (`public/profiles/lathe/lathe-y-pen-*.svg`) |
| [`requirements-assets-wheel-car.md`](./requirements-assets-wheel-car.md) | Wheel Car (`wheel-car`): SVG-Lathe (255/30 R20), Felgen-Stirn + 5 Speichen |
| [`requirements-assets-devices-handheld.md`](./requirements-assets-devices-handheld.md) | Device Smartphone & Device Tablet: Screen, Bezel, Glas, Backplate, Seitentasten (CSG) |
| [`requirements-assets-devices-monitor.md`](./requirements-assets-devices-monitor.md) | Device Desktop (`monitor`): Display, Stand, Neigung, Montagehöhe |
| [`requirements-color-picker.md`](./requirements-color-picker.md) | Wiederverwendbarer Figma-like Color Picker |
| [`requirements-range-slider.md`](./requirements-range-slider.md) | RangeSlider / DualRangeSlider (Fog, Intensity, …) |
| [`requirements-look-and-feel.md`](./requirements-look-and-feel.md) | UI, UX, Lucide Icons, Scrollbars |
| [`requirements-development-workflow.md`](./requirements-development-workflow.md) | Docs first, gemeinsame Nenner, Inventur, sauberer Code |
| [`requirements-builtin-and-user-content.md`](./requirements-builtin-and-user-content.md) | Werk vs. User: nur User-Inhalt löschbar; Domänen-Matrix |
| [`requirements-architecture.md`](./requirements-architecture.md) | Querschnitt: Scene-API, Entity, Store, Save |
| [`requirements-asset-kind-registry.md`](./requirements-asset-kind-registry.md) | Asset-Kind-Registry v1: Metadaten & Hooks pro `AssetKind` (ohne Entity-Schema-Break) |
| [`requirements-code.md`](./requirements-code.md) | Strict TS/JS, Three.js (WebGPU/TSL), Rapier |
| [`requirements-tips-and-tricks.md`](./requirements-tips-and-tricks.md) | Tips & Tricks — Sammelbecken (Workarounds, Praxis); später in Kategorie-Dateien promoten |

Neue Kategorie → `requirements-{kebab-case}.md` anlegen und hier verlinken.

## Planung / Übergang (noch keine normativen Requirements)

| Datei | Inhalt |
|---|---|
| [`../planning/transition-material-profile-and-entity-albedo.md`](../planning/transition-material-profile-and-entity-albedo.md) | Material = PBR-Profil ohne Produktfarbe; Albedo am Asset; Migration; Fabric cloth als erster Schritt |

Wenn das Zielbild freigegeben ist: Inhalt in `requirements-architecture.md` / `requirements-materials.md` überführen, Übergangsdoc archivieren oder auf „erledigt“ setzen.

## Entwicklungsablauf

1. **Alles aufschreiben** — Requirements pro System, keine vorzeitige Implementierung.
2. **Gemeinsame Nenner** — Querschnitt in `requirements-architecture.md` klären.
3. **Inventur** — bestehenden Code prüfen, erweitern statt duplizieren.
4. **Umsetzen** — sauber, minimal, lint/build grün.

Details → [`requirements-development-workflow.md`](./requirements-development-workflow.md).

**Entscheidungs-Historie:** [`../diaries/diary-code-decisions.md`](../diaries/diary-code-decisions.md) — knappes Diary (Warum/Wie), ergänzt Requirements.

---

**Category:** Project  
**Title:** Photorealistische Mockups  
**Description:** Mockup Studio 3D erzeugt photorealistische Mockups für Webshops, Flyer, Mobilgeräte, Tapeten, Böden, Arrangements, Stilleben und ähnliche Präsentationsszenen. Fokus: überzeugende Darstellungsbilder — kein Game, kein CAD, kein generischer 3D-Editor. Workflow: Szene aufbauen → Assets platzieren → Export/Render. **Hochqualitative Schatten** sind Pflicht (mm-Kontakt, Viewport **4096²**, Export-Capture **8192²**, adaptives Frustum) — Assets casten + empfangen; Ausnahmen Ground/Glazing → [`requirements-shadows.md`](./requirements-shadows.md).

---

**Category:** Project  
**Title:** Browser-only  
**Description:** Die Anwendung läuft **ausschließlich im Browser** — Desktop **und** Mobile, keine Desktop-App, kein Backend-Zwang für den Kern-Workflow, kein Node/Electron-Wrapper. Alles clientseitig (Upload, Vorschau, Szene, Export). Keine Architektur-Entscheidung die „später mal nativ" voraussetzt.

---

**Category:** Project  
**Title:** WebGPU required — kein WebGL-Fallback  
**Description:** Rendering nur über **WebGPU**. Kein WebGL-Fallback — weder auf Desktop noch Mobile. Geräte ohne WebGPU: klare UI-Meldung, App startet nicht in den 3D-Modus. UI-Chrome (React) darf laden; Viewport bleibt gesperrt bis WebGPU verfügbar.

---

**Category:** Project  
**Title:** React UI-Chrome  
**Description:** Bedienoberfläche (Toolbar, Panels, Slider, Inputs, Asset-Galerie) wird mit **React** gebaut. 3D-Engine (Three WebGPU, Rapier) bleibt Vanilla TS — Details in `requirements-code.md`. UI: responsive & touch-ready → `requirements-look-and-feel.md`.

---

**Category:** Project  
**Title:** Mindestens 10 Bilder pro User  
**Description:** Der User muss **mindestens 10 Bilder** gleichzeitig hochladen und in der App **verwenden** können (z. B. Ground-Textur, Decals, Mockup-Layer). Umsetzung über **Images-Bibliothek** → [`requirements-images.md`](./requirements-images.md). Limit gilt als harte Mindest-Anforderung für UI, Store und Browser-Speicher. Performance und UX müssen bei 10+ Assets stabil bleiben.

---

**Category:** Project  
**Title:** User-Inhalt löschbar, Werk-Inhalt nicht  
**Description:** Alles **Werkseitige** (Starter-Images, Built-in Colors/Materials, Environments, Light rigs, Scenes, Asset-Katalog-Typen) bleibt in der App und ist **nicht löschbar**. Alles, was der User **selbst anlegt** (Upload, Save-as, Add, Duplicate→User), muss er **wieder entfernen** können. Referenzen beim Löschen: Fallback statt hartem Block. Vollständige Matrix und UI-/Store-Konvention → [`requirements-builtin-and-user-content.md`](./requirements-builtin-and-user-content.md).

---
