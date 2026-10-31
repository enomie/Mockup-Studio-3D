# Plan: Paint Metallic, Zebra Analysis, Wireframe als Materialien

Quelle: `_docs/demo-extern/minimalistisches_dreiecks_patch_studio (10).html` (Shading-Modi "Lack", "Zebra", "Dreiecksnetz").

## Entscheidungen (mit User geklärt)
- Alle drei werden **normale Built-in-Materialien** in der Bibliothek (keine Anzeige-Modi).
- **Für alle Assets verfügbar**, keine Filterung im `MaterialSelect`.
- Werden gespeichert und im finalen Render/Export sichtbar – ok.
- Zebra/Wireframe ignorieren Szenenlicht (unlit) – ok.

## Materialien

| UI-Name | ID | Kind | Umsetzung |
|---|---|---|---|
| Paint Metallic | `material-paint-metallic` | `solid-pbr` | Preset: color `0x0284c7`, roughness 0.18, metalness 0.75 (Werte aus Demo). Läuft über bestehende PBR-Pipeline. |
| Zebra Analysis | `material-zebra-analysis` | `analysis` (neu) | `MeshBasicNodeMaterial`, TSL-Port: `r = reflect(-viewDir, normalView)`, `s = step(0, sin(r.y * stripeScale))`, `color = mix(0.05, 0.95, s)`. DoubleSide. |
| Wireframe | `material-wireframe` | `analysis` (neu) | `MeshBasicNodeMaterial({ wireframe: true })`, color `0x38bdf8`, DoubleSide. |

## Schritte
1. `src/scene/material-types.ts`
   - `MaterialKind` um `'analysis'` erweitern.
   - Neuer Typ `AnalysisMode = 'zebra' | 'wireframe'`, Feld `analysisMode?: AnalysisMode` und `stripeScale?: number` (Zebra, Default 16) in `MaterialPreset`.
2. `src/scene/material-ids.ts`: drei neue ID-Konstanten.
3. `src/data/material-presets.ts`: drei Presets hinzufügen (Paint Metallic bei den Metallen einsortieren, die zwei Analysis-Materialien ans Ende).
4. Neu `src/materials/analysis/` mit `zebra-material.ts` und `wireframe-material.ts` (TSL, je eine Factory-Funktion).
5. `src/engine/material-resolver.ts`
   - In `createMaterialFromPreset` Zweig für `kind === 'analysis'` → Analysis-Factory.
   - Rückgabetyp erweitern (`MeshBasicNodeMaterial`) bzw. auf `NodeMaterial` verallgemeinern; Aufrufer prüfen, die PBR-spezifische Properties setzen (tint, envMap, side o. ä.) → für Analysis überspringen.
   - `createGroundSurfaceMaterial`: Analysis darf auch auf Boden (für alle verfügbar), keine Sonderbehandlung außer Typ.
6. `src/ui/panels/MaterialsPanel.tsx`: Für `analysis` nur sinnvolle Felder anzeigen (Zebra: Stripe Scale, Wireframe: Color); PBR-Regler ausblenden.
7. `src/ui/store/app-store-materials.ts` / Load-Migration: sicherstellen, dass unbekannte Kinds nicht verworfen werden und `analysis` beim Laden/Speichern erhalten bleibt.
8. Prüfen, wo `excludeKinds` bei `MaterialSelect` genutzt wird – `analysis` dort **nicht** ausschließen.

## Risiken
- Wireframe in WebGPU: `wireframe: true` wird vom WebGPURenderer unterstützt, Linienbreite immer 1 px.
- Physik/Cloth (`fabricClothMaterialId`) und Glas-Logik dürfen `analysis` nicht als Glas/Stoff fehlinterpretieren.
- Thumbnails/Previews in der Materialliste: Analysis-Materialien müssen dort ebenfalls rendern.

## Tests
- `material-presets` Test: neue IDs vorhanden, Kinds korrekt.
- Resolver-Test: `analysis`-Presets liefern `MeshBasicNodeMaterial`, Wireframe hat `wireframe === true`.
- Save/Load-Roundtrip mit Analysis-Material.
- `npx vitest run`, `npm run lint`, `npm run build`.
