# Plan: Leinen mit Bindungsmuster + neues Material Carbon

Status: **Umgesetzt** – Leinen grob wie Jute freigegeben. Visuelle Abnahme lokal offen.
Datum: 2026-11-02

## 1. Leinen (`fabric-linen`) – echtes Leinwand-/Jutemuster

### Problem
Der aktuelle Shader (adaptiert von „crumpled fabric“) erzeugt nur verzerrtes Rauschen → wirkt fleckig, keine Fäden.

### Ziel
Typische grobe Leinwandbindung wie Jute/Kartoffelsack: sichtbare Kett- und Schussfäden, abwechselnd oben/unten, dicke unregelmäßige Fäden mit Lücken dazwischen.

### Umsetzung (`src/materials/procedural/fabric-linen.ts`, neu geschrieben)
- **Bindung** wie bei Silk (Leinwandbindung, Zelle = Kreuzungspunkt), aber grob:
  - Fadenprofil je Richtung: abgerundeter Querschnitt (`1 - (2·frac-1)²`), Faden läuft im „oben“-Feld über die volle Zelle, im „unten“-Feld abgesenkt.
  - **Lücken** zwischen den Fäden (Fadenbreite ~75 % der Zelle) → dunkle Zwischenräume, typisch für Sackleinen.
- **Unregelmäßigkeit** (macht den Jute-Look):
  - Fadendicke pro Faden variiert (Rauschen über Fadenindex).
  - Fäden leicht gewellt (Koordinate entlang des Fadens mit niederfrequentem Rauschen versetzt).
  - Faserstruktur entlang des Fadens (fein gestrecktes Rauschen → Relief und Helligkeit).
  - Einzelne dickere „Noppen“ (Slubs).
- **Farbe**: Faden-Krone heller, Flanken und Lücken dunkler (Ambient-Occlusion-Anmutung), leichte Farbvariation pro Faden.
- **Rauheit** hoch, in Lücken etwas höher.
- **Antialiasing**: wie Silk/Grid – Muster blendet bei Fäden < ~2 px auf Mittelwert aus (kein Moiré).
- **Projektion**: wie bisher (meter-3d → triplanar mit `triplanarScalar`, Rahmen/UV-Pfad).
- **Parameter** (Spec): Color, Roughness, Normal scale (Relief-Tiefe), Tile scale (= Fäden-Dichte; Default so, dass ~2–3 mm Fadenabstand wie Jute), Seed, Sheen leicht (Default 0 → aus, optional).
- Builtin „Fabric“ (`material-fabric`) bekommt neue Defaults (Farbe Jute-beige, Tile scale passend).

## 2. Neues Material Carbon (`carbon-weave`)

### Ziel
Klassisches Sichtcarbon: 2×2-Köperbindung (Twill), Faserbündel mit seidigem, richtungsabhängigem Glanz unter Klarlack.

### Umsetzung (neue Datei `src/materials/procedural/carbon-weave.ts`)
- **Twill 2×2**: Zellraster; welche Richtung oben liegt ergibt sich aus `(x + y) mod 4 < 2` → diagonales Treppenmuster.
- **Faserbündel**: pro Zelle abgerundetes Bündelprofil, darin feine Einzelfasern (hochfrequente Streifen entlang der Bündelrichtung).
- **Richtungsabhängiger Glanz** (das Wichtigste bei Carbon): Bündel quer zueinander reflektieren unterschiedlich.
  - Rauheit je Bündelrichtung leicht verschieden.
  - Anisotropie: Richtung pro Zelle wechselt um 90° (`anisotropyNode`/Tangentenrotation pro Bündelrichtung) – falls die three.js-Version das per Node nicht sauber kann, Fallback: Helligkeits-/Rauheitsunterschied pro Richtung.
- **Klarlack** standardmäßig an (Clearcoat 1, Clearcoat roughness ~0.05) → typischer Tiefenglanz; Regler vorhanden.
- **Farbe**: sehr dunkles Grau/Schwarz; Color-Regler erlaubt auch farbiges Carbon (z. B. rot/blau).
- **Antialiasing** wie oben.
- **Parameter** (Spec): Color, Roughness, Clearcoat, Clearcoat roughness, Normal scale, Tile scale (Bündelbreite; Default ~3 mm), Anisotropy, Seed (nur leichte Unregelmäßigkeit), Metalness aus.
- **Integration**: `ProceduralProfileId` + Registry + Sampling-Profil (wie Metall: Rahmen = UV, sonst triplanar/meter-3d) + Spec + Panel-Label + neues Builtin-Preset „Carbon“ (`material-carbon`).

## 3. Tests
- Spec: Carbon/Leinen-Specs vorhanden, Defaults im Bereich.
- Resolver: Carbon-Preset erzeugt Physical-Material mit Clearcoat; Leinen-Preset baut ohne Fehler.
- Live-Update (Phase 6) funktioniert automatisch für Farbe/Rauheit/Clearcoat.
- Tests, Lint, Build vor Push. Visuelle Abnahme lokal (kein WebGPU im Container).

## Umsetzung – Notizen
- Leinen: 50 Fäden pro Tile-Einheit → Tile scale 6 ≈ 3,3 mm Fadenabstand (Jute), ~15 ≈ feines Leinen. Builtin „Fabric Linen“ jutebeige.
- Carbon: Anisotropie-Richtung per `anisotropyNode` pro Bündel (funktioniert in der aktuellen three.js-Version); Stärke als Uniform → live regelbar. Builtin „Carbon“ (`material-carbon`).
- Clearcoat-Regler bei Leinen entfernt (für Stoff sinnlos).
