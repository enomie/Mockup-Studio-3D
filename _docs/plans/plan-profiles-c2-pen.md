# Plan C2: Eigene Profile in Stift, Dose und Rad

Status: **Umgesetzt (Stift, Dose, Rad).** Stand: `_docs/requirements/requirements-profiles.md` (Abschnitt 4a).
Stand der Profile: `_docs/requirements/requirements-profiles.md`.

## Ziel
In den Stift-Details lässt sich unter „Body profile“ **jedes Profil** wählen (eingebaut und eigen),
genau wie bei der Weinflasche und der Extrusion. Die Pfadnamen erscheinen unter Geometries.

## Ist-Zustand
- `penBodyProfile` ist fest `'marker' | 'fountain'` (`src/scene/asset-pen.ts`).
- Die Maße kommen aus den generierten Metriken (`penNominalFootprintM`), auch in `asset-sizing.ts`
  und `pen-body-wrap-unfold.ts`.
- Die Geometrie lädt das SVG per `fetch` (`src/engine/pen-svg-profile.ts`) mit einem Cache pro
  Profilname.
- Slots: 0 = Cap, 1 = Ring, 2 = Body. Ohne Body bricht der Bau ab
  (`pen-geometry.ts`).

## Umsetzung (wie bei der Flasche)
1. `penBodyProfile` enthält die **Profil-ID**. `marker` / `fountain` werden weiter verstanden
   (`canonicalProfileId` bekommt `pen-marker` / `pen-fountain`).
2. `resolvePenProfile(id)`: Profil aus dem Register. Fehlt es oder hat es keinen Body-Pfad
   (Slot 2), wird **Marker** verwendet, mit Hinweis.
3. Die Maße (`penNominalFootprintM` usw.) lesen über `registeredProfileMetrics`.
4. Die Geometrie holt den SVG-Text über `loadProfileSvgText`. Cache-Schlüssel ist Profil-ID plus
   Version.
5. **Neubau:** `entityProfileId` kennt den Stift, sodass der Scheduler auch Stifte nach dem
   Loslassen neu baut. „In scene“ und das Nachfragen beim Löschen zählen Stifte mit.
6. **UI:** In `PenFields` ersetzt `ProfilePickerSection` das alte Auswahlfeld. Die Labels unter
   Geometries kommen aus den Pfadnamen (`profileSlot` 0/1/2).
7. **Doku:** `requirements-profiles.md` (Abschnitt Profile in Assets) nachziehen.

## Tests
- Alte Werte `marker` / `fountain` ergeben dieselben Maße wie vorher.
- Ein Stift mit eigenem Profil wird gebaut. Ein Profil ohne Body-Pfad fällt auf Marker zurück.
- Die Labels kommen aus den Pfadnamen.

## Erweiterung: Beverage can und Wheel car (vom User freigegeben)
- **Beverage can:** `canBodyProfile` wird zur Profil-ID. `standard` und `sleek` werden weiter
  verstanden (`can-330-classic` / `can-330-sleek`).
  - Pflicht ist Slot 0 (Body). Slot 1 (Top ring) ist optional, ohne Ring reicht das Etikett bis
    oben an den Body.
  - Fallback ist **Can 330 ml classic**.
  - Die festen Werte pro Dose (Hals, Bodenwölbung, Standring) kommen bei eigenen Profilen vom
    Profil `classic`, nur `can-330-sleek` selbst behält seine Werte (auch Kopien von sleek nutzen classic). Das Etikett und die Maße
    werden aus dem Profil berechnet statt aus festen Tabellen.
- **Wheel car:** `WheelCarParams` bekommt `profileId` (Standard `wheel-car`).
  - Achse, Mitte und Radius werden aus dem gewählten Profil berechnet statt aus Konstanten.
  - Pflicht ist Slot 0 (Tire). Fallback ist **Car wheel**.
  - Die Material-Labels „Tire“ und „Rim“ kommen aus den Pfadnamen von Slot 0 bzw. 1.
  - Der Physik-Kollider nutzt die Maße des gewählten Profils.
