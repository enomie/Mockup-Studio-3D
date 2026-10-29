# Light rigs — Studio-Lighting-Presets (Bibliothek)

**Werk- und User-Vorlagen** nur für **`LightingSettings`** (Ambient, Key, Fill, `referenceMode`, Rig-Offsets) — **ohne** Sky, Ground, Fog, Reflections, Assets oder Kamera zu ändern. UI: **Left Main → Light rigs** + **Left Sub** (Liste + Aktionen). Feintuning bleibt **Right Main → Lighting** (`LightingSubPanel`).

Bezüge: [`requirements-lighting.md`](./requirements-lighting.md), [`requirements-environments.md`](./requirements-environments.md), [`requirements-shadows.md`](./requirements-shadows.md), [`requirements-scenes.md`](./requirements-scenes.md), [`requirements-app-layout.md`](./requirements-app-layout.md), [`requirements-architecture.md`](./requirements-architecture.md).

**Bestand (Inventur):** `LightRigsPanel.tsx`, `shell-nav.ts` (`light-rigs` nach `environments`, Icon **`LampFloor`**), `builtin-light-rigs.ts` (`LIGHTING_PRESETS`, `lightingFromSceneDefaults()`), `lighting-preset-types.ts` (`cloneLightingSettings`), Store (`lightingPresets`, `activeLightingPresetId`, `loadLightingPreset`, `saveCurrentAsLightingPreset`, …). Right: `LightingSubPanel.tsx` unverändert. Apply via bestehendes `applyLighting`.

**Status:** v1 **implementiert** — drei Built-ins, Apply, Save/Rename/Duplicate/Remove (User). **Offen:** Confirm dirty, Projekt-Save.

**Namens-Trennung (UI):** **Light rigs** (links) = Preset-Bibliothek. Right **Lighting** = Live-Panel (`Lightbulb`-Icon).

---

**Category:** Light rigs  
**Title:** Rolle — Rig schnell wechseln  
**Description:** Ein **Light-rig-Preset** ist ein Snapshot von **`LightingSettings`** (v1 Studio-Rig: Ambient + Key + Fill inkl. `transformOffset`, `shadowSoftness`, `castShadow`, Farben, Intensities, `referenceMode`). Ziel: nur die Beleuchtung tauschen (z. B. weichere Schatten), während Sky/Boden/Assets gleich bleiben. Apply synchronisiert Store + `applyLighting` → Engine.

---

**Category:** Light rigs  
**Title:** Abgrenzung — Light rigs vs. Environments vs. Right Lighting  
**Description:**

| | **Light rigs (Left)** | **Environments (Left)** | **Lighting (Right)** |
|---|---|---|---|
| **Inhalt** | nur `LightingSettings` | `environment` + `ground` + `lighting` | Einzelwerte live |
| **Sky / Ground / Fog / IBL** | unverändert | ersetzt | unverändert |
| **Assets / Kamera** | unverändert | unverändert | unverändert |
| **User-Save** | Save as light rig | Save as environment | — |

**Overlap:** Built-in **Softbox** kann in beiden Bibliotheken existieren — Environment-Softbox ändert **auch** Sky/Ground/IBL; Light-rig-Softbox **nur** Lichter. User wählt je nach Bedarf.

**Active-State v1:** `activeLightingPresetId` und `activeEnvironmentId` sind **unabhängig**. Apply Environment (enthält Lighting) **aktualisiert nicht** automatisch `activeLightingPresetId` — Highlight kann vom tatsächlichen Rig abweichen (gleiche Klasse wie manuelle Edits rechts). Optional später: Preset-Highlight zurücksetzen wenn Lighting von anderer Quelle geändert wird.

---

**Category:** Light rigs  
**Title:** Panel-Platzierung (UI)  
**Description:** **Left Main** Nav: **Light rigs** (Lucide **`LampFloor`**). **Aktuell:** Environments → **Light rigs** → Assets → Images → Colors → Materials (Scenes-Nav folgt). **Left Sub:** Liste, Klick = Apply; Footer **Save as light rig**. Swatch: Key/Fill-Farb-Gradient. Kompakte Dichte → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md).

---

**Category:** Light rigs  
**Title:** Listeneintrag — Anzeige  
**Description:** Pro Preset: **Name**, **Swatch** v1 — z. B. Gradient aus Key- + Fill-Farbe (`LightingSettings.key.color` / `fill.color`) oder neutrales Icon. Built-in: **Built-in** (`material-tile__kind`). User: **Editor** wenn aktives Preset `source: 'user'` — Name, Duplicate, Remove (wie [`requirements-environments.md`](./requirements-environments.md)). Tooltip: optionale `description` bei Built-ins.

---

**Category:** Light rigs  
**Title:** Built-in Light rigs (Werk) — drei Stück  
**Description:** Drei **nicht löschbare** Vorlagen. **Built-ins** in fester **Seed-Reihenfolge** (oben → unten); **User**-Rigs **darunter**, unter sich alphabetisch nach `name` → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md). Built-in-Reihenfolge:

1. **Default** — **`SCENE_DEFAULTS.lighting`** (Referenz-Helper `lightingFromSceneDefaults()` in `src/data/builtin-light-rigs.ts`, keine duplizierten Zahlen).

2. **Softbox** — weiches Studio-Rig: Key/Fill **Shadow softness** erhöht (z. B. 10), Fill **intensity ratio** / **distance** für gleichmäßige Aufhellung, leicht reduziertes **Ambient** — **ohne** Sky/Ground zu ändern. Werte neben Environment-Softbox in `builtin-light-rigs.ts` dokumentieren.

3. **Dramatic** — stärkerer **Key** (Intensity), schwächerer **Fill** (ratio / optional Cast shadows off), niedrigeres **Ambient** — harte Schatten, Produkt-Highlight; für dunkle Environments oder kontrastreiche Mockups.

Built-ins: Apply ja, Überschreiben nein. Save erzeugt immer `source: 'user'`.

---

**Category:** Light rigs  
**Title:** Save as light rig (+)  
**Description:** Footer im Left Sub: erfasst **aktuellen** `LightingSettings` aus dem Store (nach Gizmo: Werte über bestehendes Engine→Store-Sync konsistent halten; vor Save optional `getLighting()` mergen — falls nötig). **v1:** Auto-Name **My light rig** / **My light rig 2** …; Rename im User-Editor. Kein Modal. Keine Kamera/Environment-Daten.

---

**Category:** Light rigs  
**Title:** Apply (Preset laden)  
**Description:** Klick auf Eintrag:

1. Store: `lighting` aus Preset setzen.
2. Scene-API: `applyLighting(snapshot)`.
3. Right **Lighting**-Panel aktualisiert; Gizmo-Posen neu aus Rig.
4. Sky, Ground, Entities, Kamera **unberührt**.

Confirm bei „dirty“ Lighting — TBD v1 (wie Environments).

---

**Category:** Light rigs  
**Title:** Datenmodell — LightingPreset  
**Description:**

```ts
type LightingPresetSource = 'builtin' | 'user';

type LightingPreset = {
  id: string;
  name: string;
  source: LightingPresetSource;
  description?: string;
  createdAt?: string;
  snapshot: LightingSettings;
};
```

Built-in-IDs z. B. `builtin-light-default`, `builtin-light-softbox`, `builtin-light-dramatic`. User: `user-light-${uuid}`. Typen: `src/scene/lighting-preset-types.ts`. Daten: `src/data/builtin-light-rigs.ts`. Clone-Helper: `cloneLightingSettings` / `cloneLightingPreset` (bestehende Store-Clone-Logik zentralisieren oder in preset-types).

---

**Category:** Light rigs  
**Title:** Store & Scene-API  
**Description:** Store: `lightingPresets: LightingPreset[]`, `activeLightingPresetId: string` (Start: `builtin-light-default`). Aktionen: `loadLightingPreset(id)`, `saveCurrentAsLightingPreset()`, `updateLightingPreset(id, { name })`, `duplicateLightingPreset(id)`, `removeLightingPreset(id)` (nur user; Löschen des aktiven → Apply **Default**). Scene-API: v1 nur bestehendes **`applyLighting`** — optional später `applyLightingSnapshot` Alias. UI kein Three.

**Querschnitt Scenes:** `SceneSnapshot.lighting` bleibt `LightingSettings`; Scene-Load kann dieselbe Apply-Logik wie Light rigs nutzen.

---

**Category:** Light rigs  
**Title:** Serialisierung & Projekt-Save  
**Description:** User Light rigs im späteren Projekt-Save (eigenes Array). Scene-Snapshots speichern **Werte**, nicht Light-rig-IDs. Optional später: Metadaten `appliedLightingPresetId` nur für UI.

---

**Category:** Light rigs  
**Title:** v1 — Umsetzungsstand (2026-10-08)  
**Description:** Erledigt: `lighting-preset-types`, `builtin-light-rigs`, Store-Actions, `LightRigsPanel`, Nav `LampFloor`. Save nutzt `getLighting()` aus Engine wenn API verbunden. **Nicht in v1:** Confirm beim Apply; Sync von `activeLightingPresetId` nach `loadEnvironment`.

---

**Category:** Light rigs  
**Title:** v2 — Multi-Light  
**Description:** Wenn [`requirements-lighting.md`](./requirements-lighting.md) v2 (freie Lichtliste) kommt: Preset-Shape und Built-ins **erweitern** oder Version-Feld im Snapshot — nicht in v1 vorwegnahmen. Light-rigs-Bibliothek bleibt; Preset speichert dann ggf. `LightingSettingsV2`.
