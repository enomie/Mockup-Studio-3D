# Plan D: Neues Asset „Extrusion“

Status: **Entwurf – wartet auf Freigabe.** Teil von `plan-profiles-2d-editor.md` (Schritt D).
Aktueller Stand der Profile: `_docs/requirements/requirements-profiles.md`.

## Ziel
Ein neues Asset **Extrusion**: Profil wählen, Tiefe einstellen, Material, fertig.
- **Jedes Profil** ist wählbar, eingebaute und eigene. Ein Flaschenprofil ergibt eben eine „weirde“
  Extrusion.
- **Geschlossene Pfade** werden zu Körpern mit Deckel vorne und hinten. **Offene Pfade** werden
  zu einer Hülle ohne Volumen (doppelseitig).
- **Jeder Pfad ist ein eigenes Teil** mit seinem Namen unter Geometries und eigenem Material,
  z. B. „Bottle glass“ → Glass, „Cork“ → Wood.

## Ist-Zustand (recherchiert)
- Ein neues Asset braucht Einträge in: `asset-kind.ts` (Typ), `asset-kind-registry.ts`
  (Defaults, Clamp, Teile), `data/asset-catalog.ts` (Eintrag in der Assets-Liste),
  `data/material-presets.ts` (Standard-Materialien), `asset-sizing.ts` (Maße/Footprint),
  `engine/asset-system-rebuild.ts` + `engine/asset-meshes/` (Geometrie) sowie ein
  `entity-fields/*Fields.tsx` (Details). Vorlage: **Wheel car** (wird ebenfalls aus einem Profil
  gebaut).
- Material-Slots (`MaterialEntitySlot`) und Geometrie-Teile (`AssetGeometryPart`) sind feste Namen,
  nicht dynamisch.
- Profile kommen aus `src/scene/profile-registry.ts`. Neubau nach Profiländerungen macht
  `src/engine/profile-rebuild-scheduler.ts` (bisher nur für die Weinflasche).
- `public/profiles/extrude/` ist leer.

## Umsetzung

### D1 – Datenmodell
- `AssetKind` bekommt `'extrusion'`, das Modul `src/scene/asset-extrusion.ts` liefert:
  ```ts
  interface ExtrusionParams {
    profileId: string;   // jedes Profil
    depthM: number;      // Tiefe, Standard 20 mm, Bereich 0,5 mm … 2 m
  }
  ```
- **Teile und Materialien pro Pfad:** Es gibt 10 feste Slots, passend zu den 10 Farb-Slots der
  Profile: Teile `path0` … `path9`, Material-Slots `pathMaterial0Id` … `pathMaterial9Id`.
  - Unter Geometries erscheinen nur die Slots, die das Profil wirklich hat, beschriftet mit dem
    Pfadnamen (`profileSlot` wie in C).
  - Standardmaterial für alle Slots ist „Plastic Matte“.
- **Fehlt das Profil**, wird ein eingebautes Standardprofil verwendet, mit Hinweis (wie in C).

### D2 – Eingebautes Standardprofil
- Neu: `public/profiles/extrude/extrude-rounded-rect.svg`, ein abgerundetes Rechteck
  100 × 60 mm (Pfad „Body“). Damit sieht eine neue Extrusion sofort sinnvoll aus.
- Der Generator (`generate-builtin-profiles.ts`) und die Metriken lesen auch `extrude/`, und die
  Profiles-Liste zeigt es.

### D3 – Geometrie (`src/engine/extrusion-geometry.ts`)
- Profilpfade in mm werden zu Metern. x → X, y (nach unten) → −Y (nach oben). Die Tiefe geht
  entlang Z, zentriert.
- **Geschlossene Pfade:** `ExtrudeGeometry` von three.js mit Deckeln, ohne Fase, mit
  Kurvenauflösung wie bei den Lathe-Assets. Mehrere geschlossene Pfade sind getrennte Körper,
  **Löcher gibt es noch nicht**.
- **Offene Pfade:** ein Streifen aus Vierecken entlang der Tiefe, doppelseitig.
- **Pivot:** Unterkante auf dem Boden (y = 0), horizontal zentriert. So steht die Extrusion wie die
  anderen Assets auf dem Boden.
- **Größe:** Breite und Höhe kommen aus dem Profil, die Tiefe aus dem Parameter. Die globale
  Größenskalierung (`sizeScale`) wirkt wie bei anderen Assets.
- **Neubau:** Der Scheduler aus C baut auch Extrusionen nach dem Loslassen neu, wenn sich ihr
  Profil ändert.

### D4 – UI
- **Assets-Liste:** „Extrusion“ in der Kategorie Objects, Icon `Spline`.
- **Details:**
  - **Profile:** Auswahl aller Profile mit Vorschau, dazu „Edit profile“ bzw. „Duplicate & edit“.
    Das ist dieselbe Komponente wie bei der Flasche, ausgelagert und wiederverwendet.
  - **Depth:** ein Zahlenfeld in mm.
  - **Geometries:** ein Eintrag pro Pfad mit Name, Sichtbarkeit und Material.
- **Profiles-Reiter:** „In scene“ zählt auch Extrusionen. Das Nachfragen beim Löschen gilt
  ebenso.

## Tests
- Geschlossener Pfad → Körper mit Deckeln. Die Bounding-Box entspricht Profil plus Tiefe.
- Offener Pfad → Hülle, keine NaN-Werte.
- Gemischtes Profil (z. B. Bordeaux) → ein Teil pro Pfad, Labels aus den Pfadnamen.
- Fehlendes Profil → Standardprofil mit Hinweis.
- Profiländerung → Neubau, Tiefe geändert → Neubau.
- Assets-Katalog und Kind-Registry sind vollständig (die bestehenden exhaustiven Tests).

## Nicht in D
- Löcher (ein Pfad in einem anderen), Fasen und Abrundung der Kanten
- Extrudieren entlang eines Pfads (Sweep), Verjüngung (Taper)
- Physik-Kollider in exakter Form. Für den Anfang gilt eine Box aus der Bounding-Box, falls das
  Rigid-System das einfach hergibt, sonst ohne Physik.
- Label/Bild auf der Extrusion

## Fragen an dich
1. **Material pro Pfad** (jeder Pfad eigenes Teil und Material, empfohlen), oder ein einziges
   Material für alles?
2. **Standardprofil:** Ist ein abgerundetes Rechteck 100 × 60 mm als eingebautes Startprofil ok,
   oder lieber etwas anderes, z. B. ein Stern oder Pfeil?
3. **Name in der Assets-Liste:** „Extrusion“, oder z. B. „Object Extrusion“ passend zu „Object
   Block / Cylinder / Sphere“?
