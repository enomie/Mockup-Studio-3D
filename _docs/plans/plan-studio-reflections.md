# Plan: Studio-Reflexionen (Variante 1)

Status: umgesetzt (2026-10-30). Default `studio`; Intensität im Default-Environment 0,5 (siehe plan-environments-vs-light-rigs).

## Ziel

Glas, Metall und glänzende Drucke sollen in der App so klare Spiegelungen zeigen wie im Test-Render: helle Softbox-Streifen statt eines gleichmäßigen Schimmers.

Der sichtbare Hintergrund (Skybox, Hintergrundfarbe) bleibt unverändert. Es ändert sich nur, was sich in den Oberflächen spiegelt (`scene.environment`).

Nicht im Umfang: ein eigener, einstellbarer Studio-Aufbau mit verschiebbaren Leuchtflächen (Variante 2, eventuell später).

## Ist-Zustand

- `src/render/environment-map.ts` (`SkyEnvironmentMap`) rendert die Skybox-Kugel per `PMREMGenerator.fromScene` in eine Environment-Map (512 px) und setzt sie als `mainScene.environment`.
- Die Skybox ist ein weicher Farbverlauf (Horizont → Zenit). Ein Verlauf spiegelt sich als gleichmäßiger Schimmer, deshalb wirken Glas und Metall flach.
- Steuerung: Block „Reflections“ im Environment-Panel (`EnvironmentSubPanel.tsx`) mit An/Aus (`reflectionEnabled`) und „Reflection intensity“ (`reflectionIntensity`, setzt `scene.environmentIntensity`).
- Bei Änderungen am Himmel baut `EnvironmentSystem` die Map verzögert neu (`scheduleRebuild`).
- Die Bodenspiegelung (`planar-reflection`) ist ein eigener Pass und davon nicht betroffen.

## Zielmodell

Neues Feld im Environment-Zustand:

| Feld | Werte | Default |
|---|---|---|
| `reflectionSource` | `'sky'` \\| `'studio'` | `'studio'` (entschieden) |

- `sky`: wie heute, die Map kommt aus der Skybox.
- `studio`: Die Map kommt aus `RoomEnvironment` (three.js, `three/examples/jsm/environments/RoomEnvironment.js`). Das ist ein virtueller Raum mit hellen Leuchtkästen, derselbe wie im Test-Render.
- An/Aus und Intensität gelten für beide Quellen wie bisher.

## Schritte

### 1. Environment-Map um die Studio-Quelle erweitern
- `SkyEnvironmentMap` → `EnvironmentReflectionMap` umbenennen (oder Datei behalten, Klasse erweitern).
- Zweite PMREM-Quelle: `RoomEnvironment` einmal per `fromScene` vorberechnen (Größe `ENV_MAP_PMREM_SIZE`), lazy beim ersten Umschalten auf `studio`.
- `setSource('sky' | 'studio')` wählt, welche Textur als `mainScene.environment` gesetzt wird.
- Himmel-Änderungen bauen nur die Sky-Map neu. Bei `studio` ist kein Neuaufbau nötig.
- `dispose()` räumt beide Targets und die `RoomEnvironment`-Szene ab.

### 2. Zustand und Datenfluss
- `EnvironmentState` (`scene-api.ts`) und `EnvironmentDefaults` (`config/scene-defaults.ts`) bekommen `reflectionSource`.
- `EnvironmentSystem.setEnvironment` reicht das Feld weiter.
- Store: `app-store-internals.ts`, `app-store-atmosphere.ts`, Klonen in `environment-preset-types.ts`.
- Builtin-Presets (`data/builtin-environments.ts`): Quelle pro Preset festlegen. Vorschlag: Studio-Presets → `studio`, Outdoor-artige → `sky`.
- Es gibt keine gespeicherten Szenen, also keine Migration. Fehlt das Feld (z. B. in eigenen Presets), gilt der Default.

### 3. UI
- Im Block „Reflections“ eine Auswahl „Source“ mit `Sky` / `Studio` über der Intensität (`PanelSelect`).
- UI-Strings auf Englisch (AGENTS.md).

### 4. Prüfen
- `npx vitest run`, `npm run lint`, `npm run build`.
- Tests: Klonen/Defaults mit `reflectionSource`, Umschalten setzt die richtige Textur (Unit-Test auf `EnvironmentReflectionMap` mit Stub-Renderer, falls machbar, sonst nur der Zustand).
- Visuell: Flasche, Dose, Stift mit F-Label; `sky` vs. `studio`, Intensität 0,5 / 1 / 2.
- Export-Rendering kurz prüfen (nutzt dieselbe Szene).

## Risiken / offene Punkte
- **Default:** `studio` macht alle Szenen sofort glänzender, auch matte Objekte bekommen etwas mehr Licht von oben. Alternative: Default `sky`, Studio nur per Auswahl oder in einzelnen Presets.
- **Helligkeit:** `RoomEnvironment` ist heller als der Himmel-Verlauf. Eventuell muss die Default-Intensität für `studio` niedriger sein (z. B. 0,5 statt 0,85).
- **Farbe:** Die Studio-Spiegelungen sind neutral weiß und passen sich nicht dem Himmel an. Für Mockups ist das meist gewollt.
- **Kosten:** eine zusätzliche PMREM-Map (512 px), einmal berechnet. Vernachlässigbar.
