# Images — Bibliothek & Panel

Zentrale **Bildliste** im Projekt — Upload, Starter-Assets, Metadaten. Alles was ein Bild braucht (Ground, später Decals, Texturen, …) **referenziert hierher**. UI: **Left Main → Images** + **Left Sub** (Liste). Bezüge: [`requirements-ground.md`](./requirements-ground.md), [`requirements-app-layout.md`](./requirements-app-layout.md), [`requirements-and-project-description.md`](./requirements-and-project-description.md) (min. 10 Bilder).

**Bestand (Inventur):** Demo `ImagesPanel.tsx`, `image-assets.ts` (`STARTER_IMAGES` ← `builtin-images.generated.ts`), **6** Builtin-PNGs in **`public/images/`** (Naming `name--format--pixelsize`) — Generator `scripts/generate-builtin-images.ts`; erweitern per Datei-Drop, nicht parallel neu bauen.

**Status:** Requirements — Demo-UI vorhanden; Persistenz, Engine-Anbindung, Löschen TBD bei Implementierung. **Löschen:** nur User-Uploads — Projektregel → [`requirements-builtin-and-user-content.md`](./requirements-builtin-and-user-content.md).

---

**Category:** Images  
**Title:** Rolle — Single Source of Truth  
**Description:** **Images** ist die **einzige Bild-Bibliothek** pro Projekt. Ground, später Entities/Decals und Export lesen Bilder per **`imageId`**. Upload — egal ob aus Images-Panel, Ground **+ New image** oder anderem Feature — **immer** zuerst Eintrag in Images. Kein versteckter Upload-Pfad ohne Listeneintrag.

---

**Category:** Images  
**Title:** Panel-Platzierung (UI)  
**Description:** **Left Main** Nav: **Images** (`image`-Icon). **Left Sub:** scrollbare **Liste** aller Bilder + **Footer „Add image"** (+). Liste und Image-Dropdowns **alphabetisch A–Z** nach `name` → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md). Kompakte Dichte → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md). Kein separates Upload-Panel in Main-Nav.

---

**Category:** Images  
**Title:** Listeneintrag — Anzeige  
**Description:** Pro Bild eine Zeile: **Thumbnail** (~32px), **Dateiname** (ellipsis), **Orientation** (Landscape / Portrait / Square — engl. Labels). **Starter:** optional dezente zweite Info **`logicalFormat` · `sizeToken`** (Tooltip oder Subline). Klick = **Selection** (highlight); Doppelklick optional später (Preview). Kontextmenü später: Rename, Delete, Duplicate TBD.

---

**Category:** Images  
**Title:** Add image (+)  
**Description:** Button unten im Sub-Panel: **Add image** — öffnet **File-Picker** (`accept: image/*`, **multiple** erlaubt). Jedes gültige Bild → neuer Listeneintrag. Metadaten beim Import: **width**, **height**, **orientation** (aus Pixelmaßen), **name** (Originaldateiname), **mimeType**. Fehlerhafte Dateien überspringen + kurzer UI-Hinweis (später Toast).

---

**Category:** Images  
**Title:** Starter-Bilder (App)  
**Description:** Werkseitige Builtin-Bilder **nur** unter **`public/images/`** (Runtime-URL `/images/{basename}.{ext}`). **Naming:** `{name}--{format}--{pixelsize}.{ext}` — Feldtrenner **`--`** (doppelter Bindestrich); innerhalb von `name` und `format` sind einfache `-` erlaubt. **`pixelsize`:** `square` oder `{width}x{height}` (positive Ganzzahlen). **`format`:** z. B. `portrait`, `landscape`, `silk`, `blue-transparent` (freier Deskriptor). Start-Set (6): `sample--landscape--2560x1440`, `sample--landscape--1439x960`, `sample--portrait--440x955`, `sample--portrait--772x1031`, `label-F--blue-transparent--square`, `fabric--silk--square`. **Nicht löschbar**, immer in neuer Projekt-Liste. **id** = Basename ohne Extension. Liste kommt aus **Build-Zeit-Scan** → `src/data/builtin-images.generated.ts`; `STARTER_IMAGES` in `image-assets.ts` re-exportiert — keine manuelle Duplikat-Pflege in UI.

---

**Category:** Images  
**Title:** Datenmodell — ImageAsset  
**Description:** `ImageAsset { id, name, source: 'starter' | 'user', url, width, height, orientation, mimeType?, createdAt?, logicalName?, logicalFormat?, sizeToken? }`. **Starter:** `url` = Public-Pfad; `logicalName` / `logicalFormat` / `sizeToken` aus Dateiname (`--`-Grammar). **User:** `url` = Blob-URL oder persistierte URL (IndexedDB). **id** stabil über Save/Load. **orientation:** `landscape` | `portrait` | `square` (width vs height, square wenn gleich).

---

**Category:** Images  
**Title:** Mindestens 10 Bilder gleichzeitig  
**Description:** Hard Requirement aus Projektbeschreibung: User muss **≥ 10 Bilder** gleichzeitig in der Liste halten und **verwenden** können (z. B. Ground, Decals). UI und Speicher müssen **10+ Einträge** flüssig listen (Scroll), ohne Crash. Performance: Thumbnails lazy, keine Vollauflösung in Liste. Test-Szenario: 10 User-Uploads + 4 Starter = 14 Einträge stabil.

---

**Category:** Images  
**Title:** Speicher-Strategie (Browser)  
**Description:** **Starter:** statische URLs. **User-Uploads:** clientseitig — Ziel **IndexedDB** (oder File System Access API optional später) für Projekt-Persistenz; Demo nutzt `objectUrl` (Session only). Beim **Scene Save:** User-Bilder eingebettet oder als Blob-Refs im Projekt-JSON — kein Backend-Zwang. Beim Load: Blob-URLs neu erzeugen. Größenlimit pro Bild TBD (Richtwert: warnen ab ~10 MB).

---

**Category:** Images  
**Title:** Selection & Store  
**Description:** UI-Store: `images: ImageAsset[]`, `selectedImageId: string | null`. Aktionen: `addImages(files)`, `removeImage(id)` (nur user, nicht starter), `selectImage(id)`. Keine Engine-Logik im Store — Scene-API nur wenn Bild **aktiv auf Szene** angewendet wird (z. B. Ground). React only in `src/ui/`.

---

**Category:** Images  
**Title:** Integration — Ground  
**Description:** Ground hält **`groundImageId`** → verweist auf Images-Eintrag. Ground-Panel: Picker/Dropdown aus **derselben** `images`-Liste. **+ New image** in Ground ruft **`addImages`** auf → Eintrag erscheint links in Images **und** kann sofort als Ground-Textur gesetzt werden. Details → [`requirements-ground.md`](./requirements-ground.md).

---

**Category:** Images  
**Title:** Integration — später  
**Description:** Vorbereitet für: **Decals** auf Meshes, **Produkt-Texturen**, **Referenz-Overlays** im Viewport, **Export** (embedded assets). Gleiches `imageId`-Pattern. Keine zweite Galerie.

---

**Category:** Images  
**Title:** Scene-API (Vorbereitung)  
**Description:** Engine braucht Bilder als **Texture** — UI liefert `imageId`; Engine/Asset-Loader resolved URL → `Texture`, `dispose` bei Remove. **`ImageResolver`** liefert `ImageMeta` (`url`, `width`, `height`, optional **`name`** für Alpha-Heuristik). **`ImageTextureLoader`** setzt `texture.userData.imageName` aus `name`. API-Entwurf: `resolveImageTexture(imageId): Promise<TextureHandle>` intern; UI ruft `setGround({ imageId })` etc. Kein `File` in Engine. Loader-Cache: eine Texture pro `imageId` während Session.

---

**Category:** Images  
**Title:** Serialisierung  
**Description:** **Scene Save** enthält: `images[]` (Metadaten + Ref auf Blob/Starter-ID) und Feature-Refs (`groundImageId`, …). Starter nur by ID. User-Bilder: Binary in Projekt-Bundle oder IndexedDB-Key im JSON. Beim Export-Bild Mockup: verwendete Texturen müssen auflösbar sein.

---

**Category:** Images  
**Title:** Aspect Ratio — nie verzerren (global)  
**Description:** **Projektweite Pflicht:** Bilder werden **nirgends verzerrt** — UI-Thumbnails, Ground-Texturen, Decals, Viewport-Overlays, Export. Immer **originales Seitenverhältnis** einhalten. Erlaubt: **Crop** (Cover), **Letterbox** (Contain), **Tile/Repeat** — alles ohne Stretch. **Assets:** `width`/`height` aus `ImageAsset` bestimmen die zweite Kante der bildtragenden Fläche; User-`sizeScale` multipliziert nur **uniform** die Referenzkante — kein UV-Stretch. **Einzige Ausnahme:** User setzt explizit **Override aspect ratio** (Checkbox) — dann bewusst Stretch/Verzerrung erlaubt (z. B. Ground „Stretch"-Modus). Default: Override **aus**. Cursor-Rule: `image-aspect-ratio.mdc`.

---

**Category:** Images  
**Title:** Thumbnails & UI-Vorschau  
**Description:** Listen-Thumbnails (~32px): **`object-fit: cover`** (zentrierter Crop) oder **`contain`** — **nie** `fill` / unabhängige width-height ohne Override. Größere Previews: gleiche Regel. Orientation-Label (Landscape/Portrait/Square) aus Metadaten — nicht aus verzerrter Darstellung ableiten.

---

**Category:** Images  
**Title:** Override aspect ratio (Checkbox)  
**Description:** Optionales Control (pro Kontext wo Stretch möglich sein soll, z. B. Ground-Panel): Checkbox **„Allow distortion"** / **„Override aspect ratio"**. **Off (Default):** nur ratio-treue Modi. **On:** Stretch-Modus und fill-artige Platzierung freigeschaltet; UI warnt dezent (z. B. Label „Distorted"). Override pro Feature speichern (Ground), nicht global hidden default.

---

**Category:** Images  
**Title:** Demo → Produkt  
**Description:** Demo implementiert: Liste, **6** Starter aus `public/images/` (Auto-Manifest), Add (+), Thumbnails, Orientation-Label / Starter-Subline (`logicalFormat` · `sizeToken`), Session-Upload. **Store:** `images[]`, `selectedImageId`, `selectImage`, `removeImage` (nur `user`), Scene-Detach + `releaseImageTexture`, UI Editor + Remove — v1 live. **Fehlt noch:** IndexedDB, Ground-Kopplung (`groundImageId`), 10+ Stress-Test. `STARTER_IMAGES` ← `builtin-images.generated.ts`.

---

**Category:** Images  
**Title:** Image Surfaces — Albedo + Emissive  
**Description:** Bilder auf Asset-Flächen liefern **Albedo** (Cover-Texture über Print Matt/Glossy). Optional **Emissive** pro Fläche: Checkbox + Intensity — Emissive-Farbe = Bild-Texture (kein separater ColorPicker). Details → [`requirements-image-surfaces.md`](./requirements-image-surfaces.md).

---

**Category:** Images  
**Title:** Erlaubte Dateiformate (Upload + Starter)  
**Description:** Gültige Bildformate: **JPEG** (`.jpg`, `.jpeg`, `image/jpeg`), **PNG** (`.png`, `image/png` — inkl. Transparenz/RGBA), **WebP** (`.webp`, `image/webp` — inkl. Transparenz), **GIF** (`.gif`, `image/gif` — statisch und animiert; als 3D-Textur nur erstes Frame), **AVIF** (`.avif`, `image/avif` — inkl. Transparenz). Upload-Validierung: MIME-Type-Allowlist + Extension-Fallback (falls Browser `file.type` leer lässt). File-Picker `accept`: `.jpg,.jpeg,.png,.webp,.gif,.avif` (zusätzlich `image/*`). Andere Formate (SVG, BMP, HEIC, …) werden abgelehnt.

---

**Category:** Images  
**Title:** Alpha / Transparenz (Viewport)  
**Description:** Formate mit Alpha (Heuristik an **Dateiname**: `.png`, `.webp`, `.gif`, `.avif`) nutzen den **Alpha-Kanal** in der Engine — **kein** schwarzes RGB in transparenten Pixeln (typisch RGB=0 in PNG-Löchern). **JPEG** bleibt opaque. Erkennung: `ImageMeta.name` im Resolver + `texture.userData.imageName` nach `ImageTextureLoader.load`. Viewport-Canvas bleibt opaque (`WebGPURenderer alpha: false`); Transparenz nur auf **Mesh-Materialien**.

| Kontext | Verhalten | Engine |
|---|---|---|
| **Ebene Bild-Flächen** (Picture, Smartphone/Tablet/Monitor-Screen, Print Front/Back, Tapete) | `transparent`, `opacityNode` = Textur-Alpha, `depthWrite: false` — dahinter Passepartout, Device-Innenfläche, Wandkörper, … | `createImagePbrMaterial`, `createWallpaperImageMaterial` |
| **Weinflasche — Etikett** | Wie ebene Fläche auf Mantel-Mesh: Alpha → **Glas** dahinter (kein weißes/deckendes Underlay) | `createImagePbrMaterial` (nicht Dosen-Label-Shader) |
| **Getränkedose + Blechdose — Label** | Material **deckend** (kein Transparent-Pass); Alpha-Löcher → **Metall-Underlay** im Shader (`mix` mit gebürstetem Alu); **Körper-Geometrie** unverändert | `createCanLabelMaterial` + `fitHeightLabelColorNode` |
| **Pen — Body-Wrap** | Wie Dosen-Label **deckend**; Alpha-Löcher → **`bodyMaterialId`-Farbe** (Plastik-Underlay); Bildachsen **90°** zur Dose (Höhe = Umfang) | `createPenBodyWrapMaterial` + `fitPenBodyWrapColorNode` → [`requirements-assets-pen.md`](./requirements-assets-pen.md) |

Zentral: `src/engine/image-surface-alpha.ts`. Emissive (wenn Intensity > 0): mit gleicher Alpha-Maske multiplizieren (Pen-Body: Emissive auf Shader-`colorNode`).

---

**Category:** Images  
**Title:** Builtin-Ordner & Auto-Discovery  
**Description:** Alle werkseitigen Bilder der Images-Bibliothek liegen unter **`public/images/`** (rekursiv erlaubt). **SVG-Geometrie-Profile** (Lathe/Extrude) liegen unter **`public/profiles/`** — siehe unten; **nicht** in `images/` und **kein** Images-Manifest. Beim **dev** (`predev`) und **build** (`prebuild`) scannt `scripts/generate-builtin-images.ts` nur `public/images/` und schreibt **`src/data/builtin-images.generated.ts`**. Ungültige Dateinamen (nicht exakt zwei `--`-Feldtrenner) oder doppelte Basenames → **Build-Fehler**. Kein Runtime-Directory-Listing im Browser.

---

**Category:** Images  
**Title:** Builtin-Dateiname — Grammar  
**Description:** Pflichtschema: **`{name}--{format}--{pixelsize}.{ext}`**. `name` und `format` dürfen einfache Bindestriche enthalten; Trennung nur über **`--`**. `pixelsize` = `square` oder `{width}x{height}`. Wenn `pixelsize` numerisch ist, werden `width`/`height` aus dem Token; `orientation` daraus berechnet. Wenn `format` ∈ `{portrait, landscape, square}` muss es zur berechneten `orientation` passen (Build-Fehler bei Konflikt). Bei `pixelsize` = `square` lesen Build-Skript und Generator die echten Pixelmaße aus der Datei. Parser: `src/data/builtin-image-filename.ts`.

---

**Category:** Images  
**Title:** Abgrenzung — `public/profiles/` (keine Images-Bibliothek)  
**Description:** Werkseitige **SVG-Authoring** für 3D-Geometrie (nicht User-Upload, nicht löschbar über Images-UI).

| Ordner | Zweck | URL-Präfix |
|---|---|---|
| **`profiles/lathe/`** | Halbprofil → Drehung um **Y** (Pen, Dose, Weinflasche, …); **Pfadkoordinaten in mm** → [`requirements-assets-lathe.md`](./requirements-assets-lathe.md) | `/profiles/lathe/lathe-{y\|x\|z}-{name}.svg` |
| **`profiles/extrude/`** | Reserviert für **Extrude**-Pfade (v1 leer) | `/profiles/extrude/…` |

**Code:** URLs zentral über `builtinLatheProfileUrl()` in [`builtin-profile-paths.ts`](../../src/constants/builtin-profile-paths.ts); Asset-Helfer `penSvgUrl`, `beverageCanSvgUrl`, `wineBottleSvgUrl`. Kurzbeschreibung: [`public/profiles/README.md`](../../public/profiles/README.md).

