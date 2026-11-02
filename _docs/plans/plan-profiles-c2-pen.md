# Plan C2: Eigene Profile im Stift (Pen)

Status: **Entwurf – wartet auf Freigabe.** Folgt dem Muster von C (`plan-profiles-c-bottle.md`).
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

## Nicht in C2
- Beverage can und Wheel car (gleiches Muster, eigener Schritt)
