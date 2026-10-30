# Bestandsaufnahme zu plan-rotational-print (Schritt 1)

Stand: 2026-10-30, nur gelesen, kein Code geändert. Bezug: `plan-rotational-print.md`.

## Ergebnis in Kürze

- **Kein Körper hat heute brauchbare Druck-UVs auf einem eigenen Kanal.** Alle vier Körper brauchen ein neues Attribut (Vorschlag `printUv`, als `uv1` gesetzt). Kanal 0 (`uv`) bleibt unverändert.
- **Dose und Konserve haben im Druckband gar keine Körpergeometrie**, solange ein Bild gesetzt ist (`omitLabelBand`). Der Mantel ersetzt das Stück. Wird der Mantel gelöscht, muss das Band im Körper bleiben.
- **Die Flasche ist der schwierige Fall:** Das Etikett ist ein Teilbogen, der Glaskörper ist doppelseitig, hat einen inneren Mantel und schreibt keine Tiefe. Paper (0) direkt im Glas wird heikel (siehe unten).
- **Prozedurale Presets lassen sich gut wrappen.** Die Nodes sind einfache Properties am Material.

## Körper und UVs

| Objekt | Körper-Geometrie | `uv` heute | Druck-UV heute | Brauchen |
|---|---|---|---|---|
| Getränkedose | `buildCanHullLatheGeometry` (`beverage-can-geometry.ts:163`), LatheGeometry | Lathe-Standard (u = Winkel, v = Profilindex) | nur Mantel (`:195`, `cylindricalLabelUv`). Körper ohne Band bei Bild (`omitLabelBand`) | Band im Körper behalten + `printUv` |
| Konserve | `buildTinCanBodyGeometry` (`tin-can-geometry.ts:194`), Merge aus Mantel, Ringen, Deckeln | `buildOpenMantleGeometry`-Standard, ohne `uvAt` | nur Mantel (`:241`), 0,08 mm Abstand + polygonOffset (`cylindrical-can-populate.ts:69`). Körper ohne Band bei Bild | Band behalten + `printUv` nur auf dem Seitenmantel. Ringe und Deckel: `printUv` außerhalb des Bands → Maske 0 |
| Weinflasche | `buildWineBottleGlassMeshFromLatheProfile` (`wine-bottle-glass.ts:244`), Merge aus Außen-, Innenmantel und Stirnring | Lathe-Standard | eigenes Teilbogen-Mesh (`wine-bottle-geometry.ts:153–183`), Standard-UVs, `phiLength` < 2π | `printUv` nur Außenmantel. Maske braucht zusätzlich die Winkelgrenzen (Teilbogen) |
| Stift | `buildPenLatheGeometry` (`pen-geometry.ts:26`) | **wird bei Bild durch `cylindricalLabelUv` überschrieben** (`:97`) | Kanal 0 | auf `printUv` umziehen, `uv` wieder Lathe-Standard |

Weitere Befunde:

- `cylindricalLabelUv` klemmt v auf 0..1. Außerhalb des Bands kommt also 0 oder 1 heraus, nicht „außerhalb“. Das Mapping-Modul braucht die Maske aus der ungeklemmten Höhe (oder ein Flag im Attribut).
- `ensureGeometryTangents` rechnet Tangenten aus `uv`. Ein weiterer Grund, Kanal 0 nicht anzutasten (Anisotropie bei gebürstetem Alu, Normal-Maps).

## Preset-Arten (`createMaterialFromPreset`, `material-resolver.ts:~198`)

| Art | Material | Nodes | Wrappen |
|---|---|---|---|
| `solid-pbr` | `MeshStandardNodeMaterial`, Farbe, Rauheit und Metall als Konstanten | keine | Konstanten in Nodes umwandeln, einfach |
| `textured` (prozedural) | `createTexturedMaterial` (`procedural/create-textured-material.ts`), Standard oder Physical | `colorNode`, `roughnessNode`, `metalnessNode` (immer `float(...)`), optional `normalNode`, `opacityNode` | Nodes lesen und mit `mix()` umhüllen, einfach |
| `transmission` | `createTransmissionMaterial`: Physical, `transmission: 1`, `transparent`. Weinflaschen-Glas: `DoubleSide`, `depthWrite: false`, Attenuation | `normalNode` aus `applyGlassSurfaceToPhysicalMaterial` | `transmissionNode` + `opacityNode` möglich, aber Render-Zustand gilt pro Material (siehe Risiken) |
| `transmission` als Glazing | `createDisplayGlazingMaterial` | – | für dieses Vorhaben nicht relevant |

Prozedurale Sampling-Räume (`procedural-sample-uv.ts`):

- `uv` (`buildGrainSampleUv`): gebürstetes Alu und Maserungen, hängt an Kanal 0. Dosen nutzen das mit `grainAlongU: true`.
- `planar-meters` (`positionLocal`) und triplanar (z. B. `concrete-porous.ts`): UV-unabhängig.

Clearcoat wird schon gesetzt: bei Holz fest (`0.08 / 0.35`), sonst aus `preset.clearcoat`. Der Finish-Lack muss das mischen, nicht überschreiben.

Bei Paper sollte auch der `normalNode` ausgeblendet werden (`mix(normalBase, normalFlat, mask × (1 − substrate))`), sonst scheint die Maserung durchs Papier.

## Aufrufer der alten Funktionen

| Funktion | Aufrufer | Fällt weg in Schritt 4 |
|---|---|---|
| `createCanLabelMaterial` (`material-resolver.ts:555`) | `cylindrical-can-populate.ts:55` (Dose + Konserve) | ja |
| `fitHeightLabelColorNode` (`:430`) | nur `createCanLabelMaterial` | ja |
| `createPenBodyWrapMaterial` (`:511`) | `populate-packaging.ts:234` | ja |
| `fitPenBodyWrapColorNode` (`:473`, exportiert) | `createPenBodyWrapMaterial` + Tests | ja |
| `createImagePbrMaterial` (`:596`) | Flasche `populate-packaging.ts:164`, **außerdem** `passepartout-meshes.ts:122, :179` | **nein**, nur der Flaschen-Aufruf fällt weg |
| `underlayRgb` | `populate-packaging.ts:225` (Stift), Default in beiden Label-Funktionen | ja |

Mesh-Rollen „label“: `beverage-can-label`, `tin-can-label`, `wine-bottle-label` (`assetMeshRole = 'label'`). Die Sichtbarkeit „label“ steuert heute zusätzlich, ob das Band aus dem Körper geschnitten wird. Nach dem Umbau sollte „label“ nur noch den Druck ein- und ausblenden (Maske = 0), nicht mehr Geometrie.

## Risiken, neu oder präzisiert

1. **Flasche, Paper im Glas.** Das Glasmaterial ist `transparent`, `depthWrite: false`, `DoubleSide` und gilt auch für den Innenmantel.
   - Ein deckendes Etikett im selben Material schreibt keine Tiefe. Sortierung gegen Korken und Kapsel kann kippen.
   - Ohne `printUv`-Maske nur außen würde der Druck auch innen erscheinen (doppelt durchs Glas sichtbar).
   - Vorschlag: Außenmantel als eigene Geometrie-Gruppe mit eigenem Material (Multi-Material-Mesh), Innenmantel bleibt reines Glas. Früh prototypen (Schritt 3, nicht erst 6).
   - Ausweg, falls das nicht sauber wird: Bei der Flasche bleibt ein dünnes Etikett-Mesh für Substrate < 1. Das wäre eine Abweichung von der Grundentscheidung und müsste mit Johann besprochen werden.
2. **Teilbogen-Maske der Flasche:** Die Mapping-Funktion braucht neben y0/y1 auch phiStart/phiLength. Bei Dose, Konserve und Stift ist das der volle Umfang.
3. **Konserve:** Ohne Abstand liegt der Druck direkt auf den Rillen (`tinCanOuterRadiusAtY`, Sicken). Bei Paper sieht man die Sicken dann durchs Papier. Real ist das eher falsch (Papier überspannt die Sicken), im visuellen Check bewerten.
4. **Stift:** Wenn `uv` wieder Lathe-Standard ist, ändert sich ein vorhandenes prozedurales Body-Preset leicht im Aussehen gegenüber heute (heute läuft es mit Druck-UVs). Gilt nur bei gesetztem Bild, ist also vernachlässigbar.

## Folgen für die Schritte 2 und 3

- Schritt 2: Das Modul liest `attribute('printUv')` bzw. `uv(1)` und liefert `{ sampleUv, inBandMask }`. Die Maske kommt aus der ungeklemmten Höhe und dem Winkelbereich. Die Geometrie-Seite bekommt eine gemeinsame Funktion `applyPrintUv(geometry, band)`, die den Stift-Helfer `applyCylindricalUvToGeometry` ersetzt.
- Schritt 3: Aufwand für solid und prozedural eher klein. Glas (Flasche) ist der eigentliche Aufwand und sollte zuerst als Prototyp laufen.
