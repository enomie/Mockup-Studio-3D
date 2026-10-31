# Plan: Environments und Light Rigs trennen

Status: umgesetzt (2026-10-30). Defaults wie in Schritt 3; Viewport helpers wandern ins Panel „Scene“ (Funktion bleibt).

## Ziel

- **Environments** steuern nur die Umgebung: Himmel, Reflexionen, Nebel, Boden.
- **Light Rigs** steuern nur die Lichter: Ambient, Key, Fill und die Licht-Optionen.
- Beide lassen sich frei kombinieren. Ein Environment zu laden ändert nie die Lichter und umgekehrt.

## Ist-Zustand (Befund)

### Der Mischmasch
- Ein Environment-Preset speichert einen `AtmosphereSnapshot` = `environment` + `ground` + **`lighting`** (`src/scene/environment-preset-types.ts`).
- `loadEnvironment` → `applyAtmosphereToStateAndScene` setzt dabei auch `state.lighting` und ruft `api.applyLighting` (`src/scene/atmosphere-snapshot.ts`). **Ein Environment zu laden überschreibt also das gewählte Light Rig.**
- „Save as environment“ speichert die aktuellen Lichter mit (`captureAtmosphereFromState`).
- Die Licht-Werte sind doppelt gepflegt: `builtin-environments.ts` (Softbox, Dark Stage) und `builtin-light-rigs.ts` (Softbox, Dramatic) enthalten dieselben Zahlen, mit Kommentaren „Keep lighting branch in sync with …“.

### Bugs
1. **Falsche Markierung im Light-Rigs-Panel:** Nach dem Laden eines Environments sind andere Lichter aktiv, aber `activeLightingPresetId` bleibt beim alten Rig. Das Panel zeigt ein Rig als aktiv, das gar nicht mehr gilt.
2. **Light Rig geht verloren:** Wer zuerst „Dramatic“ wählt und dann das Environment „Default“, hat wieder die Default-Lichter, ohne es zu merken.
3. **Eigene Environments speichern Lichter mit:** Ein eigenes Environment setzt später beim Laden auch die damals aktiven Lichter zurück.
4. **Doppelte Pflege:** Ändert man die Softbox-Lichter nur in einer der beiden Dateien, laufen Environment und Rig auseinander.

### Nebenbefund (nicht Teil der Trennung, zur Entscheidung)
- Im rechten Panel „Environment“ liegt auch der Block „Viewport helpers“ (Floor grid, Kompass, Light handles). Das sind Hilfsanzeigen, keine Umgebung. Vorschlag: eigener Block im Panel „Scene“ oder so lassen.
- `fixturesReflectInMirror` (Lampen im Bodenspiegel) steckt in den Licht-Einstellungen, wirkt aber nur mit dem Boden-Spiegel. Bleibt beim Light Rig, weil es um die Lampen geht.

## Zielmodell

| | Environment | Light Rig |
|---|---|---|
| Inhalt | Himmel, Reflexionen (Quelle, Intensität), Nebel, Boden | Ambient, Key, Fill, Bezugsmodus, Lampen sichtbar, Lampen im Spiegel |
| Typ | `EnvironmentSnapshot = { environment, ground }` | `LightingSettings` (unverändert) |
| Laden | setzt nur Umgebung, `activeEnvironmentId` | setzt nur Lichter, `activeLightingPresetId` |

`AtmosphereSnapshot` wird ersetzt durch `EnvironmentSnapshot` ohne `lighting`.

## Schritte

### 1. Typen und Daten
- `environment-preset-types.ts`: `AtmosphereSnapshot` → `EnvironmentSnapshot { environment; ground }`, `cloneLighting` dort entfernen.
- `atmosphere-snapshot.ts` → `environment-snapshot.ts`: `applyEnvironmentSnapshot` ruft nur `applyEnvironment` und `applyGround`.
- `builtin-environments.ts`: alle `lighting`-Zweige entfernen.
- `builtin-light-rigs.ts`: die „Keep in sync“-Kommentare entfernen, die Rigs sind die einzige Quelle für Licht-Werte.

### 2. Store und Engine
- `app-store-internals.ts`: `captureAtmosphereFromState` / `applyAtmosphereToStateAndScene` → `captureEnvironmentFromState` / `applyEnvironmentToStateAndScene`, ohne `lighting`.
- `mockup-engine.ts`: `applyAtmosphereSnapshot` → `applyEnvironmentSnapshot`.
- Aufrufer anpassen (`app-store-environment-presets.ts`, `app-store.ts`, Swatch im `EnvironmentsPanel`).

### 3. Logische Defaults (Vorschlag, bitte prüfen)

Environments (nur Umgebung):

| Preset | Himmel | Nebel | Reflexionen | Boden |
|---|---|---|---|---|
| **Default** | hellgrau neutral (wie heute Softbox: `#D8DCE0` → `#A8B0B8`) | aus | Studio 0,5 | Print Matt |
| **Blue Sky** (heute „Default“) | blaugrau (`#A8C7DB` → blau) | an, 25–100 m | Studio 0,5 | Print Matt |
| **Dark Stage** | dunkel (`#2A3038` → `#0A0E14`) | an, 30–120 m | Studio 0,35 | Plastic Matte |

Begründung:
- Für Produkt-Mockups ist ein neutraler, heller Hintergrund der übliche Start. Der blaue Himmel färbt Glas und Metall bläulich.
- Nebel bei 25–100 m wirkt bei Objekten in 1 m Abstand kaum, kostet aber eine Farbe, die Kanten am Horizont verändert. Im neutralen Default aus.
- „Softbox“ ist ein Licht-Begriff. Der Name bleibt den Light Rigs vorbehalten, das bisherige Environment „Softbox“ wird zum neuen „Default“.
- Dark Stage: 0,25 Reflexion wurde für die alte Himmel-Quelle gewählt; mit Studio-Quelle sind 0,35 ein Startwert, beim Check festlegen.

Light Rigs (nur Licht): Default, Softbox, Dramatic bleiben mit ihren heutigen Werten. `SCENE_DEFAULTS.lighting` = Rig „Default“ (unverändert).

`SCENE_DEFAULTS.environment` und `SCENE_DEFAULTS.ground` = Environment „Default“ (neu: neutral).

### 4. Prüfen
- `npx vitest run`, `npm run lint`, `npm run build`.
- Tests:
  - Environment laden ändert `state.lighting` und `activeLightingPresetId` nicht.
  - Light Rig laden ändert Umgebung und `activeEnvironmentId` nicht.
  - Builtin-Environments haben kein `lighting`.
  - App-Start = Environment „Default“ + Rig „Default“.
- Visuell: jedes Environment mit jedem Rig (3 × 3) einmal rendern, F-Label-Flasche und Dose.

## Offene Punkte
- Defaults wie in Schritt 3 vorgeschlagen? Insbesondere: neutral grau statt blau als Start.
- Viewport helpers aus dem Environment-Panel herausnehmen? (Nebenbefund, sonst getrennter Plan.)
- Es gibt keine gespeicherten Szenen, daher keine Migration für eigene Environments mit Licht-Anteil.
