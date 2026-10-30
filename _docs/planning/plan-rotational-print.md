# Plan: Druck auf gedrehten Objekten (Dose, Konserve, Flasche, Stift)

Status: Entwurf, noch nicht umgesetzt (2026-10-30)

## Ziel

Alle gedrehten Objekte bedrucken nach **einem** Prinzip, so wie in echt:

- **Papier-Etikett**: Der Druck ist ein eigenes Material und verdeckt das Objekt.
- **Direktdruck**: Die Farbe liegt auf dem Objektmaterial, tönt es und behält dessen Eigenschaften (Metall, Glas, Kunststoff).

Ein stufenloser Regler blendet zwischen beiden. Kein flaches „Underlay-Grau“ mehr.

Nicht im Umfang: Zylinder, Kugel (brauchen noch keine Bilder) und Papierdicke als Geometrie (eventuell später).

## Ist-Zustand (Probleme)

| Objekt | Geometrie | Material | Transparenz im PNG |
|---|---|---|---|
| Getränkedose | eigener Etikett-Mantel, koplanar zum Körper | `createCanLabelMaterial` (flach, metalness 0) | wird zur festen Farbe des Alu-Presets, kein Metall sichtbar |
| Konservendose | Mantel mit 0,08 mm Abstand + polygonOffset | `createCanLabelMaterial` | wie Dose |
| Weinflasche | Etikett-Mesh mit 1 mm Abstand | `createImagePbrMaterial` (generisch) | Alpha-Blending, das Glas scheint durch |
| Stift | Körpermaterial wird komplett ersetzt | `createPenBodyWrapMaterial` (Kopie der Dosen-Funktion) | wird zur flachen Farbe des Body-Presets, Rauheit und Struktur gehen verloren |

- Drei Implementierungen mit drei Verhaltensweisen.
- Das Mapping ist doppelt kopiert: `fitHeightLabelColorNode` und `fitPenBodyWrapColorNode`, die Flasche rechnet separat.
- Der Druck kennt das Material darunter nicht.
- Positiv: Es gibt schon die gemeinsame UV-Funktion `cylindricalLabelUv` (Dose, Konserve, Stift).

## Zielmodell

Pro Pixel im Druckbereich:

```
mask      = imInBand(uv) × pngAlpha × inkOpacity      // 0 = kein Druck → reines Objektmaterial
substrate = Regler 0..1                               // 0 = Papier, 1 = Direktdruck (Multiply)

paper  = { color: png.rgb, metalness: 0, roughness: finish, transmission: 0 }
direct = { color: base.color × png.rgb,               // Multiply wie Photoshop
           metalness/roughness/Struktur: vom Basismaterial,
           transmission: vom Basismaterial (Glas → getöntes Glas) }

print  = mix(paper, direct, substrate)
result = mix(baseMaterial, print, mask)
finish (matt/glossy) = Klarlack über der bedruckten Fläche
```

Die Einstellungen pro Bildfläche (`ImageSurfaceSettings`, Fläche `label`):

| Feld | Bereich | Bedeutung |
|---|---|---|
| `finish` | matt / glossy | bleibt, wirkt als Lack über dem Druck |
| `substrate` (neu) | 0..1 | 0 Papier, 1 Direktdruck/Multiply |
| `inkOpacity` (neu) | 0..1 | skaliert das PNG-Alpha |
| emissive | – | bleibt |

Defaults: Getränkedose 1, Konserve 0, Flasche 0, Stift 1 (zu prüfen).

## Entscheidung: Druck im Körpermaterial, kein separater Mantel

- Der Regler mischt **eine** Oberfläche pro Pixel. Ein Mantel müsste das Basismaterial nachbauen, bei Glas hieße das Glas über Glas (Sortierung, doppelte Brechung).
- Kein Z-Fighting und kein polygonOffset mehr.
- Der Preis: Der Builder muss in alle Preset-Arten eingreifen können (siehe Schritt 3).

## Schritte

### 1. Bestandsaufnahme (nur lesen)
- UVs der Körper-Meshes im Druckbereich: Dose (Lathe-Körper), Konserve, Flasche, Stift. Haben die **Körper** schon `cylindricalLabelUv`, oder nur die Mäntel?
- Preset-Arten und ihre Node-Struktur: solid PBR, `createTexturedMaterial` (prozedural, z. B. gebürstetes Alu), Glas (`MeshPhysicalNodeMaterial` + Transmission), Clearcoat.
- Alle Aufrufer von `createCanLabelMaterial`, `createPenBodyWrapMaterial` und `createImagePbrMaterial` für die Flasche.
- Ergebnis: kurze Notiz, welche Körper neue UVs brauchen.

### 2. Gemeinsames Mapping-Modul
- `rotational-print-mapping.ts`: Band-Grenzen (y0/y1) bzw. Schaftbereich, Fit-Logik (Höhe passt, Breite wird beschnitten oder wiederholt), Naht.
- Liefert `{ sampleUv, inBandMask }` als TSL-Nodes.
- Ersetzt `fitHeightLabelColorNode`, `fitPenBodyWrapColorNode` und die Flaschen-Etikettfläche.
- Unit-Tests für die Fit-Mathematik (vorhandene Tests zu `labelImageUSpan` übernehmen).

### 3. Gemeinsamer Druck-Material-Builder
- `createRotationalPrintMaterial(basePreset, presetOptions, texture, mapping, surface)`.
- Baut das Basismaterial wie bisher über den Resolver und hängt sich danach in dessen Nodes ein: `colorNode`, `roughnessNode`, `metalnessNode`, bei Glas `transmissionNode`/`opacity`.
- Fall prozedural: Die Basis-Nodes existieren schon. Wrappen statt ersetzen.
- Fall solid: Konstanten zu Nodes machen.
- Fall Glas: Transmission bei Papier → 0, bei Direktdruck → Basis-Transmission, Farbe × Druck als Tönung.
- Ein Ort für den Klarlack (Finish).

### 4. Objekte umstellen
- Dose + Konserve: Etikett-Mantel und polygonOffset entfernen, Körper bekommt den Builder. Achtung: Deckel und Ring bleiben eigenes Material.
- Flasche: Etikett-Mesh entfernen, Glaskörper bekommt den Builder.
- Stift: Builder statt `createPenBodyWrapMaterial`.
- Alte Funktionen und `underlayRgb` löschen.
- `geometry-visibility` prüfen: Es gibt Teile wie „label“, die dann wegfallen.

### 5. UI + Datenmigration
- `ImageSurfaceFields`: Regler „Substrate“ (Labels: Paper ↔ Direct) und „Ink opacity“, nur für gedrehte Objekte.
- `resolveImageSurfaceSettings`: Defaults pro Asset-Typ. Alte gespeicherte Szenen ohne Felder bekommen die Defaults.
- UI-Strings auf Englisch (AGENTS.md).

### 6. Prüfen
- `npx vitest run`, `npm run lint`, `npm run build`.
- Visuell pro Objekt mit einem Test-PNG (Logo mit Transparenz + weiße und farbige Flächen):
  - Substrate 0 / 0,5 / 1, Ink opacity 1 / 0,5, Finish matt / glossy.
  - Dose: Alu-Maserung bei 1 sichtbar? Flasche: getöntes Glas bei 1?
- Export-Rendering kurz prüfen.

## Risiken / offene Punkte
- Prozedurale Presets: Wie leicht lassen sich deren Nodes nachträglich wrappen? Entscheidet über den Aufwand von Schritt 3.
- Glas mit teilweiser Transmission pro Pixel: Prüfen, ob WebGPU/TSL das sauber rendert.
- Papierkante/Papierdicke: bewusst verschoben, eventuell später als dünner Rand-Ring.
- Defaults für Stift und Flasche mit Johann abstimmen.
