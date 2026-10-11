# Scenes — Vorlagen & User-Szenen

**Scene-Presets** zum schnellen Start und zum Speichern des aktuellen Arbeitsstands. Eine Scene ist ein **Snapshot** der relevanten Projekt-Zustände: platzierte Entities, Bild-Zuweisungen, Environment, Ground, Lighting, Kamera-Framing. UI: **Left Main → Scenes** + **Left Sub** (Liste + Aktionen). Bezüge: [`requirements-app-layout.md`](./requirements-app-layout.md), [`requirements-architecture.md`](./requirements-architecture.md), [`requirements-scene-placement.md`](./requirements-scene-placement.md), [`requirements-assets.md`](./requirements-assets.md), [`requirements-images.md`](./requirements-images.md), [`requirements-environment.md`](./requirements-environment.md), [`requirements-ground.md`](./requirements-ground.md), [`requirements-lighting.md`](./requirements-lighting.md), [`requirements-camera.md`](./requirements-camera.md).

**Bestand (Inventur):** `DEFAULT_SCENE_ASSETS` + `DEFAULT_SCENE_NAME` in `src/config/default-scene-assets.ts`; Engine `seedDefaultScene()` in `asset-system.ts`; Breadcrumb `Scene › Default` in `TopSubBar`. Kein Scenes-Panel, kein User-Save, kein Scene-Load — erweitern, nicht parallel neu bauen.

**Status:** Requirements — Default-Layout im Code; Scenes-Bibliothek und User-Save offen.

---

**Category:** Scenes  
**Title:** Rolle — Startpunkt & Wiederherstellung  
**Description:** **Scenes** sind **gespeicherte Szenen-Zustände** — werkseitige Vorlagen (Built-ins) und vom User angelegte Snapshots. Ziel: mit einem Klick eine komplette Arbeitsumgebung laden (Layout + Einstellungen) oder den aktuellen Stand als neue Scene sichern. Scenes ersetzen **nicht** die Images-/Colors-/Materials-Bibliotheken — sie **referenzieren** deren Einträge per ID (`screenImageId`, `groundImageId`, `materialId`, …). Fehlende User-Bilder beim Load: Fallback oder Hinweis (TBD Implementierung).

---

**Category:** Scenes  
**Title:** Panel-Platzierung (UI)  
**Description:** **Left Main** Nav: **Scenes** (Lucide z. B. `layout-template`, `layers-2` oder `clapperboard`) — **erster** Eintrag in der Left-Main-Reihenfolge (vor Assets, Images, Colors, Materials). **Left Sub:** scrollbare **Liste** aller Scenes + Footer **„Save as scene"** (+). Klick auf Eintrag = **Scene laden** (nach Bestätigung wenn ungespeicherte Änderungen — TBD). Selection/Highlight des **aktiven** Scene-Eintrags. Kompakte Dichte → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md). Breadcrumb Top Sub (`Scene › …`) spiegelt den **aktiven Scene-Namen**.

---

**Category:** Scenes  
**Title:** Listeneintrag — Anzeige  
**Description:** Pro Scene eine Zeile: **Name**, optional **Mini-Vorschau** (Thumbnail der Viewport-Szene oder Icon-Platzhalter v1). Built-ins: Badge **Built-in** oder visuell als nicht löschbar erkennbar. User-Scenes: Rename, Delete, Duplicate (Kontextmenü oder Inline — gleiches Muster wie Images/Colors). **Aktive** Scene hervorgehoben. Sortierung: Built-ins **oben** (feste Reihenfolge), darunter User-Scenes **nach Erstellungszeit** (neueste oben) oder alphabetisch — TBD; Built-in-Reihenfolge ist Pflicht (s. Built-in Scenes).

---

**Category:** Scenes  
**Title:** Built-in Scenes (Werkseitig)  
**Description:** Drei **nicht löschbare** Vorlagen beim App-Start verfügbar. Reihenfolge in der Liste **von oben nach unten**:

1. **Default** — aktuelles Portfolio-Layout (oberster Eintrag). Entities: **Picture framed**, **Print (A5)**, **Smartphone**, **Tablet** — Positionen wie heute in `DEFAULT_SCENE_ASSETS` (`picture` x −0,45 · `print` x −0,05 · `smartphone` x 0,15 · `tablet` x 0,55; z = 0). Environment, Ground, Lighting, Kamera = `SCENE_DEFAULTS`. Entspricht dem heutigen Startzustand.

2. **Phone only** — nur **ein Smartphone** in der Szene, zentriert vor der Kamera (z. B. x 0, z 0). Keine weiteren Assets. Übrige Einstellungen = `SCENE_DEFAULTS` (Environment, Ground, Lighting, Kamera-Default-View).

3. **Phone in front of tablet** — **Smartphone** leicht **vor** dem **Tablet** (näher zur Kamera, +Z), leicht **versetzt** in X für überlappende Geräte-Mockup-Optik. Richtwerte (Scene-Einheit m, final bei Implementierung feinjustieren): `tablet` z. B. x 0,35 · z 0; `smartphone` z. B. x 0,28 · z 0,06 (vor dem Tablet). Kein Picture, kein Print. Übrige Einstellungen = `SCENE_DEFAULTS`.

Built-ins sind **ladbar** (Apply), **nicht überschreibbar** durch den User. „Save as scene" erzeugt immer eine **neue User-Scene**, nie ein Built-in-Update.

---

**Category:** Scenes  
**Title:** Save as scene (+)  
**Description:** Footer-Button **Save as scene** im Left Sub: erfasst den **aktuellen** Projekt-Zustand als neue **User-Scene**. Dialog: **Name** (Pflicht, Default z. B. „My scene" + fortlaufende Nummer). Gespeichert wird mindestens:

- **Entities** — vollständige Registry: `type`, `assetKind`, `name`, `transform`, `sizeScale`, Material-Slots, `geometryVisibility`, `imageSurfaces`, `screenImageId`, …
- **Bild-Zuweisungen** — alle `screenImageId` / Face-`imageId` auf Entities, `groundImageId` am Ground (Refs auf Images-Bibliothek; User-Bilder müssen im Projekt persistiert sein → [`requirements-images.md`](./requirements-images.md))
- **Environment** — Sky, Fog, Reflection (Store-Slice / `SCENE_DEFAULTS`-Shape)
- **Ground** — Farbe, Material-Parameter, Sichtbarkeit, Mirror, `groundImageId`
- **Lighting** — Rig v1 (Ambient, Key, Fill, `referenceMode`, Intensities, Colors, …)
- **Camera** — aktives **Framing** (target, spherical, fov/orthoZoom für die gewählte Projection); **nicht** zwingend User-Slot-Inhalte (Slots bleiben projektweit — vgl. [`requirements-camera.md`](./requirements-camera.md))

Optional v1: Thumbnail (Viewport-Screenshot klein) für Listen-Vorschau. Kein Export-Format — internes JSON / Store-Objekt.

---

**Category:** Scenes  
**Title:** Scene laden (Apply)  
**Description:** Klick auf Scene-Eintrag → **ersetzt** den aktuellen Szenen-Zustand durch den Snapshot:

1. Entities leeren und aus Snapshot neu aufbauen (stabile neue Entity-IDs; Snapshot speichert keine Engine-Runtime-IDs).
2. Environment, Ground, Lighting über Scene-API anwenden (`applyEnvironment`, `applyGround`, `applyLighting` o. ä.).
3. Kamera auf gespeichertes Framing setzen (Built-in Default-View bzw. gespeicherte Werte).
4. Store synchronisieren; Selection deselect oder erstes Asset wählen (TBD).
5. Breadcrumb + aktiver Listeneintrag aktualisieren.

**Warnung** bei ungespeicherten User-Änderungen (Confirm-Dialog) — TBD v1. Built-in **Default** = Reset auf Werk-Startlayout (wie heutiger Fresh-Load).

---

**Category:** Scenes  
**Title:** Datenmodell — ScenePreset  
**Description:** `ScenePreset { id, name, source: 'builtin' | 'user', thumbnailUrl?, createdAt?, snapshot: SceneSnapshot }`. **Built-in:** feste `id` (z. B. `builtin-default`, `builtin-phone-only`, `builtin-phone-tablet`). **User:** generierte `id` (UUID). `SceneSnapshot` — ein JSON-Objekt, kompatibel mit dem **projektweiten Save-Schema** in [`requirements-architecture.md`](./requirements-architecture.md):

```ts
// Shape — verbindlich bei Implementierung in scene-types o. ä.
type SceneSnapshot = {
  entities: SerializedEntity[];
  environment: EnvironmentSettings;
  ground: GroundSettings;
  lighting: LightingSettings;
  camera: { framing: CameraFraming; projection?: 'perspective' | 'orthographic' };
};
```

Entity-Serialisierung teilt Typen mit Scene Placement + Assets. Bild-Refs nur als **IDs** — Binary bleibt in Images-Store/IndexedDB.

---

**Category:** Scenes  
**Title:** Store & Scene-API  
**Description:** Store: `scenes: ScenePreset[]`, `activeSceneId: string | null`. Aktionen: `loadScene(id)`, `saveCurrentAsScene(name)`, `renameScene(id, name)`, `deleteScene(id)` (nur `source: 'user'`), `duplicateScene(id)`. Built-ins in `src/data/builtin-scenes.ts` (oder erweitertes `default-scene-assets.ts`) — nicht im User-Store mutierbar. Scene-API: `applySceneSnapshot(snapshot)`, `captureSceneSnapshot()` → `SceneSnapshot`; UI ruft nur Store + Scene-API, kein Three in Components.

---

**Category:** Scenes  
**Title:** Abgrenzung — Scene vs. Environments vs. Projekt-Save vs. Right „Scene"  
**Description:** **Scenes (Left)** = **Presets/Vorlagen** innerhalb einer Session bzw. eines Projekts — schnell zwischen **kompletten** Layouts wechseln (Entities + Atmosphäre + Kamera-Framing). **Environments (Left)** = Atmosphäre inkl. Lighting — Assets bleiben → [`requirements-environments.md`](./requirements-environments.md). **Light rigs (Left)** = nur Lighting → [`requirements-lighting-presets.md`](./requirements-lighting-presets.md). **Projekt-Save** (später, global) = gesamtes Projekt inkl. Images-Blobs, User-Scenes, User-Environments, Camera-Slots — ein Format, Scene-Snapshots als Teilbaum. **Right Main → Scene** (Entity-Liste / Properties) = **aktuelle** Szene bearbeiten, nicht die Preset-Bibliothek — Namen bewusst getrennt: Left = **Scenes** / **Environments** (Bibliotheken), Right = **Scene** (Inhalt). Kein Doppel-Panel für dieselbe Funktion.

---

**Category:** Scenes  
**Title:** Images & fehlende Referenzen  
**Description:** Snapshot referenziert `imageId` aus der Images-Bibliothek. Beim **Save**: nur IDs der **aktuell zugewiesenen** Bilder — nicht die ganze Images-Liste. Beim **Load**: wenn `imageId` fehlt (gelöschtes User-Bild), Entity-Face **ohne Bild** oder Placeholder + UI-Hinweis (TBD). Starter-Bilder (`source: 'starter'`) sind immer auflösbar. User-Scene löschen entfernt **nicht** Bilder aus Images.

---

**Category:** Scenes  
**Title:** Implementierungs-Reihenfolge (Vorschlag)  
**Description:** 1) `SceneSnapshot` Typ + `capture`/`apply` in Scene-API. 2) Built-in-Daten für drei Vorlagen (Migration aus `DEFAULT_SCENE_ASSETS`). 3) Left Scenes Panel (Liste, Load, Active-State, Breadcrumb). 4) Save as scene (+ Dialog). 5) Rename/Delete/Duplicate User-Scenes. 6) Confirm bei Load mit dirty state. 7) Thumbnail optional.
