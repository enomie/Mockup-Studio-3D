# Rotational Print — Druck auf gedrehten Objekten

Ein Prinzip für alle Lathe-Objekte mit Bild: **Getränkedose, Blechdose, Weinflasche, Stift**. Der Druck liegt **im Körpermaterial**, es gibt **kein** separates Etikett-Mesh mehr.

Bezüge: [`requirements-images.md`](./requirements-images.md), [`requirements-assets-beverage-can.md`](./requirements-assets-beverage-can.md), [`requirements-assets-tin-can.md`](./requirements-assets-tin-can.md), [`requirements-assets-wine-bottle.md`](./requirements-assets-wine-bottle.md), [`requirements-assets-pen.md`](./requirements-assets-pen.md)..

**Status:** implementiert (2026-10-30).

**Code:**
- Mapping (reine Mathematik): [`rotational-print-mapping.ts`](../../src/engine/rotational-print-mapping.ts) — `rotationalPrintUv`, `applyRotationalPrintUv`, `applyOutsidePrintUv`, `rotationalPrintFit`, `sampleRotationalPrint`.
- TSL-Gegenstück: [`rotational-print-nodes.ts`](../../src/engine/rotational-print-nodes.ts) — `{ sampleUv, inBandMask }`.
- Material-Builder: [`rotational-print-material.ts`](../../src/engine/rotational-print-material.ts) — `createRotationalPrintMaterial`, `updateRotationalPrintMaterial`.
- Populate-Helfer: [`rotational-print-populate.ts`](../../src/engine/asset-meshes/rotational-print-populate.ts) — `resolveRotationalPrintBodyMaterial`.
- Einstellungen und Defaults: [`rotational-print.ts`](../../src/scene/rotational-print.ts).

---

**Category:** Rotational Print  
**Title:** Zielmodell pro Pixel  
**Description:**

```
mask      = inBand × pngAlpha × inkOpacity
paper     = { png.rgb (Rückseite: blankes Papier), metalness 0, Papier-Rauheit, keine Transmission, flache Normale }
direct    = { base.color × png.rgb (Multiply), Metall/Rauheit/Normale/Transmission vom Körper }
print     = mix(paper, direct, substrate)
result    = mix(base, print, mask); Gloss = Klarlack über der bedruckten Fläche
```

- **Substrate 0** = deckendes Papier-Etikett. **Substrate 1** = Direktdruck: Weiß wird zum Material (Alu, Glas, Kunststoff), Bürstung/Maserung bleiben sichtbar.
- **Glas:** Papier stoppt die Transmission und ist deckend; Direktdruck tönt das Glas. Rückseiten (durch Glas gesehen) zeigen blankes Papier, Direktdruck bleibt beidseitig sichtbar.
- Der Builder **wrappt** die Nodes des Basismaterials (solid, prozedural, Transmission), statt sie zu ersetzen. Standard-Materialien werden zu Physical umgebaut (für Klarlack). Render-Zustand (`transparent`, `depthWrite`, `side`) bleibt wie vom Basismaterial gesetzt.

---

**Category:** Rotational Print  
**Title:** Einstellungen (Label-Fläche)  
**Description:** Felder in `ImageSurfaceSettings` (Fläche `label`), nur für die vier Objekte:

| Feld | Bereich | UI | Ohne gespeicherten Wert |
|---|---|---|---|
| `substrate` | 0..1 | „Substrate (Paper ↔ Direct)“ | Dose **1**, Blechdose **0**, Flasche **0**, Stift **1** |
| `inkOpacity` | 0..1 | „Ink opacity“ | 1 |
| `gloss` | 0..1 | „Finish (Matt ↔ Glossy)“ (ersetzt die Finish-Auswahl) | aus `finish`: matt 0, glossy 1 |

Gloss mischt die Papier-Rauheit von **Print Matt** (0,92) zu **Print Glossy** (0,15) und den Klarlack von 0 auf 1.

**Live-Update:** Die drei Werte sind TSL-Uniforms. Ändert sich nur einer davon, setzt `AssetSystem.setImageSurface` die Uniforms direkt (`updateRotationalPrintMaterial`) und fordert ein neues Bild an — **kein** Rebuild. Alles andere (Bild, Emissive an/aus, Körpermaterial) baut neu auf.

---

**Category:** Rotational Print  
**Title:** Druck-UV (`printUv`)  
**Description:**

- Eigenes Geometrie-Attribut **`printUv`**; Kanal 0 (`uv`) bleibt frei für prozedurale Maserung und Tangenten.
- **U = 0,5** an **+Z** (Front), Naht an **−Z**, U steigt Richtung +X (Motiv von vorne nicht gespiegelt). Teilbogen (Flasche, `labelWrap: partial`) über `phiStart`/`phiLength`.
- **V ungeklemmt** — Punkte außerhalb des Bands (Deckel, Ringe, Schulter) haben V < 0 oder > 1 und bekommen Maske 0.
- Teile, die nie bedruckt werden (Deckel, Endringe, Innenmantel, Stirnringe), bekommen **(−1, −1)** (`applyOutsidePrintUv`). Pflicht für jedes Mesh mit Druckmaterial: Ein fehlendes Attribut liest (0, 0) und zählt als „im Band“.
- **Naht:** Bei vollem Umlauf korrigiert `applyRotationalPrintUv` die doppelten Naht-Vertices pro Dreieck, damit das erste Segment nicht das ganze Motiv zusammenquetscht.

---

**Category:** Rotational Print  
**Title:** Fit (Bild ins Band)  
**Description:** `rotationalPrintFit(layout, planeW, planeH, imageW, imageH)`:

- **`wrap-width`** (Dosen, Flasche): Bildbreite um den Umfang, Bildhöhe entlang der Achse. Höhe passt; schmale Bilder lassen die Seiten unbedruckt, breite werden beschnitten.
- **`wrap-height`** (Stift): Bildhöhe um den Umfang, Bildbreite entlang des Schafts, 180° gedreht (Kappe links im Motiv).
- Flasche: Etikett-Rechteck hat das Bild-Seitenverhältnis → Spans 1.

---

**Category:** Rotational Print  
**Title:** Objekte  
**Description:**

| Objekt | Körper mit Druck | Band | Nicht bedruckt |
|---|---|---|---|
| Getränkedose | Lathe-Hülle (`metalMaterialId`) | `labelY0..labelY1`, voller Umlauf | Top-Ring (eigenes Mesh), Vertices abseits des Mantel-Profils |
| Blechdose | Seitenmantel der Hülle | `labelY0..labelY1`, voller Umlauf | Endringe, Deckel/Boden |
| Weinflasche | Außenmantel des Glases | `labelBottomOffsetM` + Etiketthöhe, Bogen aus `labelWrap` | Innenmantel, Stirnringe, Korken, Kapsel |
| Stift | Body-Lathe (`bodyMaterialId`) | Body-Y-Spanne, voller Umlauf | Kappe, Ring |

`geometryVisibility.label` blendet nur den **Druck** aus (Körper ohne Druckmaterial); die Geometrie bleibt vollständig.
