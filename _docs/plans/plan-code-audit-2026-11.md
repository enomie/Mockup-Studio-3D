# Code-Audit 2026-11 – Befund & Aufräumplan

Stand: 2026-11-01. Nur Analyse, noch keine Änderungen an `src/**`.

## Gesamtbild
| Check | Ergebnis |
|---|---|
| `npx vitest run` | ✅ 129 Dateien / 611 Tests grün |
| `npm run build` | ✅ baut, aber **ein einziges JS-Chunk mit 6,5 MB (2,2 MB gzip)** |
| `npm run lint` | ❌ **1 Fehler**: `src/scene/arrangement-remap.test.ts:105` unnötige Type-Assertion |
| `tsc` | ⚠ `baseUrl` in `tsconfig.json` ist in TS 6 deprecated (fällt mit TS 7 weg) |
| Sprachregel (nur Englisch in `src`) | ✅ keine deutschen Reste gefunden |
| `@ts-ignore` / `eslint-disable` / TODO / `console.log` | ✅ keine |

Fazit: Der Code ist in deutlich besserem Zustand als befürchtet. Es gibt keine kritischen Fehler, nur Altlasten und Kleinkram.

## Befunde (nach Priorität)

### P1 – direkt beheben
1. **Lint-Fehler** in `arrangement-remap.test.ts:105` → mit `eslint --fix` beheben. Laut AGENTS.md ist Lint vor jedem Push Pflicht, er ist aktuell also rot.
2. **Bild-Upload schluckt Fehler stillschweigend** (`src/ui/store/app-store-images.ts:88`). Kaputte oder nicht ladbare Dateien verschwinden ohne jede Rückmeldung. Vorschlag: eine Meldung „X Datei(en) konnten nicht geladen werden“.

### P2 – toter Code (laut knip)
3. Ungenutzte Dateien in `src`:
   - `src/render/export-ground-mask.ts`
   - `src/render/export-shadow-matte.ts`, dazu die zugehörigen Konstanten `EXPORT_SHADOW_CATCHER_*` in `src/constants.ts`
   - `src/materials/procedural/silk-fine.ts` (Legacy-Wrapper; die Registry ruft direkt `buildMetalBrushedNodes` auf)
   - `scripts/bake-pen-lathe-svgs.ts` und `scripts/generate-wine-bottle-wall-svgs.ts`: prüfen, ob die Skripte noch gebraucht werden (eventuell als npm-Script eintragen)
4. Ungenutzte Dependency: `simplex-noise`.
5. **172 ungenutzte Exports und 88 ungenutzte exportierte Typen.** Ein Teil davon ist nur „unnötig exportiert“ (z. B. die `rebuild*`-Funktionen in `asset-system-rebuild.ts`), ein anderer Teil ist echt tot (z. B. `fabricClothPhysicsFromPresetKey`, `computeLabelUnfold*`, `lightingFromSceneDefaults`, `COLOR_*_ID`). Vorgehen: jede Datei einzeln durchgehen; Code, der wirklich tot ist, löschen, bei den anderen nur das `export` entfernen.
6. Doppelter Export: `BUILTIN_ARRANGEMENT_CLOTHING_ID` und `BUILTIN_ARRANGEMENT_DEFAULT_ID` sind derselbe Wert.

### P3 – Robustheit / Qualität
7. **Globale Window-Listener** auf Modulebene in `triangle-patch-gizmo-controller.ts:74-81` (Shift-Tracking) werden nie entfernt. Im Betrieb ist das harmlos, bei HMR stapeln sie sich aber. Besser: im Controller registrieren und in `dispose()` wieder abmelden.
8. **17× `any`** in den TSL-Shader-Helfern (`src/materials/procedural/{concrete-porous,wood-porous,wood-soft,grid-paper,paper-grain}.ts`). Dafür einen gemeinsamen Typ-Alias für TSL-Nodes einführen (z. B. `type TslNode = ShaderNodeObject<Node>`).
9. `tsconfig.json`: `baseUrl` entfernen und die `paths` relativ setzen.

### P4 – Performance / Struktur (eigene Pläne)
10. **Bundle 6,5 MB in einem Chunk**: Rapier/WASM, Three-WebGPU und Panels per `import()` oder `manualChunks` aufteilen. Das verbessert die Ladezeit spürbar.
11. **Große Dateien**: `mockup-engine.ts` (1362 Zeilen), `asset-system.ts` (966), `asset-kind-registry.ts` (789), `material-resolver.ts` (772). Keine akute Gefahr, aber sie sind Kandidaten für künftige Aufteilungen, wenn wir dort ohnehin arbeiten.
12. `_docs/fabric-physics/src-silk-studio/` ist eine komplette Fremd-Codebasis in den Docs. Sie verfälscht knip/Suchen. Entweder in `knip`-Ignore aufnehmen oder archivieren.

## Vorgeschlagene Umsetzung
- **Schritt 1** (klein, risikoarm): P1 und P2 Punkte 3, 4 und 6, außerdem Punkt 9 und ein knip-Ignore für `_docs`. Danach Tests, Lint und Build ausführen und auf `main` committen.
- **Schritt 2**: P2 Punkt 5 (ungenutzte Exports) in kleinen Commits, jeweils pro Bereich (data, engine, scene, ui).
- **Schritt 3**: P3 Punkte 7 und 8.
- **Schritt 4**: Bundle-Splitting (P4 Punkt 10) als eigener Plan.
