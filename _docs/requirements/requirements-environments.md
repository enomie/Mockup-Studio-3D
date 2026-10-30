# Environments — Umgebungs-Presets (Bibliothek)

**Werk- und User-Vorlagen** für die **Umgebung der Szene** — Himmel, Reflexionen, Nebel, Boden — **ohne** Lichter, platzierte Assets, Kamera oder Entity-Layout zu ändern. Lichter: ausschließlich **Light rigs** → [`requirements-lighting-presets.md`](./requirements-lighting-presets.md). UI: **Left Main → Environments** + **Left Sub** (Liste + Aktionen). Detail-Edit in **Right Main → Environment** (Sky/Reflections/Fog/Ground).

Bezüge: [`requirements-environment.md`](./requirements-environment.md), [`requirements-ground.md`](./requirements-ground.md), [`requirements-lighting.md`](./requirements-lighting.md), [`requirements-reflections.md`](./requirements-reflections.md), [`requirements-scenes.md`](./requirements-scenes.md), [`requirements-app-layout.md`](./requirements-app-layout.md), [`requirements-architecture.md`](./requirements-architecture.md).

**Bestand (Inventur):** `EnvironmentsPanel.tsx`, `shell-nav.ts` (`environments` vor `assets`, Icon `CloudSun`), `builtin-environments.ts` (`ENVIRONMENT_PRESETS`, `environmentFromSceneDefaults()`), `environment-preset-types.ts` (`EnvironmentSnapshot`), `environment-snapshot.ts` (`applyEnvironmentSnapshot`), Store-Slice in `app-store.ts` (`environments`, `activeEnvironmentId`, `loadEnvironment`, `saveCurrentAsEnvironment`, `updateEnvironment`, `duplicateEnvironment`, `removeEnvironment`). Scene-API: `applyEnvironmentSnapshot` auf `MockupEngine`. Default-Built-in = `SCENE_DEFAULTS`.

**Status:** v1 **implementiert** — drei Built-ins, Apply, Save/Rename/Duplicate/Remove (User). **Offen:** Left-Nav **Scenes** (eigenes Feature), Confirm bei Apply mit manuell geändertem Look, Persistenz im Projekt-Save, `captureEnvironmentSnapshot` auf Scene-API (Capture läuft v1 nur im Store). **2026-10-30:** Lichter aus Environments entfernt → [`plan-environments-vs-light-rigs.md`](../planning/plan-environments-vs-light-rigs.md).

**Namens-Trennung (UI):** **Environments** (Plural, **links**) = Preset-Bibliothek. **Environment** (Singular, **rechts**) = Live-Panel für Sky/Reflections/Fog/Ground. Kein Umbenennen des Right-Nav nötig; Labels in der Shell klar halten.

---

**Category:** Environments  
**Title:** Rolle — Umgebung schnell wechseln  
**Description:** Ein **Environment-Preset** ist ein **Snapshot der Umgebung**: `environment` + `ground` (**keine** Lichter) (gleiche Shapes wie in [`requirements-scenes.md`](./requirements-scenes.md) `SceneSnapshot`, aber **ohne** `entities` und **ohne** `camera`). Ziel: mit einem Klick z. B. von „Default" auf „Dark Stage" wechseln, **während** Smartphone/Print an Ort und Stelle bleiben. Rechts weiterhin Feintuning; Preset-Apply setzt die Basiswerte und synchronisiert Store + Scene-API.

---

**Category:** Environments  
**Title:** Abgrenzung — Environments vs. Light rigs vs. Scenes vs. Right Panels  
**Description:**

| | **Environments (Left)** | **Light rigs (Left)** | **Scenes (Left)** | **Environment / Lighting (Right)** |
|---|---|---|---|---|
| **Inhalt** | Sky, Reflections, Fog, Ground (**keine** Lichter) | nur **LightingSettings** | voller `SceneSnapshot` | Einzelparameter live |
| **Assets** | unverändert | unverändert | ersetzt | unverändert |
| **Kamera** | unverändert | unverändert | Framing aus Snapshot | unverändert |
| **User-Save** | Save as environment | Save as light rig | Save as scene | — |

Nur **Lighting** tauschen → [`requirements-lighting-presets.md`](./requirements-lighting-presets.md). Scene-Save speichert Werte, nicht Preset-IDs. Keine Preset-Chips im Ground-Panel.

---

**Category:** Environments  
**Title:** Panel-Platzierung (UI)  
**Description:** **Left Main** Nav: **Environments** (Lucide **`CloudSun`**). **Ziel-Reihenfolge** (mit Scenes): Scenes → Environments → Assets → … — **aktuell im Code:** **Environments** → **Assets** → **Images** → **Colors** → **Materials** (Scenes-Nav folgt mit [`requirements-scenes.md`](./requirements-scenes.md)). **Left Sub:** scrollbare Liste; Klick = **Apply** (`material-tile--selected` = `activeEnvironmentId`). Footer **Save as environment**. Built-in-`description` im `title`-Tooltip. Kompakte Dichte → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md).

---

**Category:** Environments  
**Title:** Listeneintrag — Anzeige  
**Description:** Pro Preset eine Zeile: **Name**, **Swatch** = CSS-`linear-gradient` (Sky-Horizont + Ground-Farbe). Built-ins: Zeile **Built-in** (`material-tile__kind`). User-Presets: **Editor**-Section (nur wenn aktives Preset `source: 'user'`): Name (`PanelTextField`), **Duplicate**, **Remove** — analog Colors. **Aktives** Preset nach Apply markieren; manuelle Edits rechts **ändern** `activeEnvironmentId` nicht (v1).

---

**Category:** Environments  
**Title:** Built-in Environments (Werk) — drei Stück  
**Description:** Drei **nicht löschbare** Vorlagen beim App-Start. **Built-ins** in fester **Seed-Reihenfolge** in der Liste (oben → unten); **User**-Environments **darunter**, unter sich alphabetisch nach `name` → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md). Built-in-Reihenfolge:

1. **Default** — entspricht **`SCENE_DEFAULTS`** für `environment` + `ground`: neutral hellgrauer Himmel (`#D8DCE0` → `#A8B0B8`), Fog **aus**, Reflexionen **Studio 0,5**, Boden **Print Matt**.

2. **Blue Sky** — der frühere App-Start-Look: blaugrauer Himmel (`#A8C7DB` → `#1F61B8`), Fog an (25–100 m), Reflexionen Studio 0,5, Boden Print Matt.

3. **Dark Stage** — dunkler Himmel (`#2A3038` → `#0A0E14`), Fog an (30–120 m), Reflexionen Studio 0,35, Boden **Plastic Matte**.

Werte: `src/data/builtin-environments.ts`. Lichter kommen immer aus dem gewählten **Light rig**.

Built-ins sind **ladbar** (Apply), **nicht überschreibbar**. „Save as environment" erzeugt immer **`source: 'user'`**.

---

**Category:** Environments  
**Title:** Save as environment (+)  
**Description:** Footer-Button im Left Sub: erfasst den **aktuellen** Zustand von:

- **`environment`** — `EnvironmentState` (Sky, Fog, Reflections inkl. `reflectionSource`)
- **`ground`** — `GroundSettings` (inkl. Mirror-Flags v1)

**Keine** Lichter.

**v1:** kein Modal — Auto-Name **My environment** / **My environment 2** …; Umbenennen im User-Editor. Snapshot = Store-`captureEnvironmentFromState()`. **Keine** Entity- oder Kamera-Daten. **Keine** `imageId` — Ground-Bild/Textur wenn später vorhanden: TBD in Ground-Requirements.

---

**Category:** Environments  
**Title:** Apply (Preset laden)  
**Description:** Klick auf Listeneintrag → **ersetzt nur** Atmosphäre-Teil:

1. Store: `environment`, `ground` aus Preset setzen.
2. Scene-API: **`applyEnvironmentSnapshot`** (`environment-snapshot.ts` → `applyEnvironment`, `applyGround`).
3. Right-Panels zeigen aktualisierte Werte; Viewport sofort aktualisiert.
4. **Lichter, aktives Light rig, Entities und Kamera unberührt.**

**Warnung** bei ungespeicherten User-Environment-Änderungen (Confirm) — TBD v1, gleiche UX-Idee wie Scene-Load.

---

**Category:** Environments  
**Title:** Datenmodell — EnvironmentPreset  
**Description:**

```ts
type EnvironmentSource = 'builtin' | 'user';

type EnvironmentSnapshot = {
  environment: EnvironmentState;
  ground: GroundSettings;
};

type EnvironmentPreset = {
  id: string;
  name: string;
  source: EnvironmentSource;
  description?: string; // built-ins optional
  createdAt?: string;   // user only
  snapshot: EnvironmentSnapshot;
};
```

Built-in-IDs: `builtin-env-default`, `builtin-env-blue-sky`, `builtin-env-dark-stage` (`BUILTIN_ENV_*_ID` in `builtin-environments.ts`). User: `user-env-${uuid}`. Typen: `src/scene/environment-preset-types.ts`. Daten: `src/data/builtin-environments.ts`.

---

**Category:** Environments  
**Title:** Store & Scene-API  
**Description:** Store: `environments: EnvironmentPreset[]` (Built-ins + User-Kopien im Array), `activeEnvironmentId: string` (nach Apply; Start `builtin-env-default`). Aktionen: `loadEnvironment`, `saveCurrentAsEnvironment`, `updateEnvironment` (Name, nur user), `duplicateEnvironment`, `removeEnvironment` (bei Löschen des aktiven → Apply **Default**). Capture v1: intern `captureEnvironmentFromState()` im Store. Scene-API: **`applyEnvironmentSnapshot`** — UI **kein** Three. Built-in-Definitionen in `ENVIRONMENT_PRESETS` nicht mutierbar; User-Einträge nur im Store-Array.

---

**Category:** Environments  
**Title:** Serialisierung & Projekt-Save  
**Description:** User-Environments sind Teil des **späteren Projekt-Save** (eigener Array im Top-Level-JSON). **Scene-Snapshots** speichern **Werte**, nicht Environment-Preset-IDs — ein Scene-Load stellt exakt den Stand wieder her, auch wenn das Preset später gelöscht wurde. Optional später: Scene speichert `appliedEnvironmentId` nur als Metadaten für UI-Anzeige.

---

**Category:** Environments  
**Title:** v1 — Umsetzungsstand (2026-10-08)  
**Description:** Erledigt: Typen + Clone, `applyAtmosphereSnapshot` (seit 2026-10-30 `applyEnvironmentSnapshot`, ohne Lichter), drei Built-ins, Store + Panel, User Save/Duplicate/Rename/Remove, Diary-Eintrag. **Nicht in v1:** Confirm-Dialog beim Apply; Name-Dialog beim Save; Left **Scenes**-Nav; Engine-seitiges `captureEnvironmentSnapshot` (Scenes kann Store-Capture oder spätere API-Erweiterung nutzen).

---

**Category:** Environments  
**Title:** Tips — Schatten auf hellem Boden  
**Description:** Für sichtbare Schatten auf hellem Boden: Light rig **Softbox** wählen und/oder **Environment → Reflections → Intensity** senken — [`requirements-tips-and-tricks.md`](./requirements-tips-and-tricks.md). Environment (Umgebung) und Light rig (Lichter) sind unabhängig kombinierbar.
