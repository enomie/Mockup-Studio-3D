# Plan C: Eigene Profile in der Weinflasche („Bottle“)

Status: **Entwurf – wartet auf Freigabe.** Teil von `plan-profiles-2d-editor.md` (Schritt C).
Aktueller Stand der Profile: `_docs/requirements/requirements-profiles.md`.

## Ziel
- In den Details einer Weinflasche lässt sich unter „Body profile“ **jedes Profil** wählen, also
  auch eigene und die von Dose, Stift oder Rad (ein „weirdes“ Ergebnis ist erlaubt).
- Die **Pfadnamen des Profils** erscheinen unter **Geometries**, z. B. „Bottle glass“ statt „Glass“.
- Wird ein eigenes Profil im Editor geändert, baut sich die Flasche in der Szene neu.

## Ist-Zustand (recherchiert)
- Der Parameter `wineBottleBodyProfile` ist ein fester Typ `'bordeaux' | 'alsace' | 'sparkling'`
  (`src/scene/asset-wine-bottle.ts`).
- **Maße** (Höhe, Fuß, Durchmesser, Label-Größe, Footprint) kommen synchron aus
  `LATHE_PROFILE_METRICS_MM[datei]`, auch in `asset-sizing.ts`.
- **Geometrie:** `src/engine/wine-bottle-svg-profile.ts` lädt die SVG-Datei per `fetch` und cacht sie
  pro Profil. Slot 0 ist die Glaswand (offener Pfad), 1 Capsule foil, 2 Capsule disc, 3 Cork.
- Die **Geometries-Liste** hat feste Labels (`GEOMETRY_PARTS_WINE_BOTTLE` in
  `geometry-parts-catalog.ts`).
- Eigene Profile liegen nur im UI-Store (`userProfiles`). Szene und Engine kennen sie nicht.

## Umsetzung

### C1 – Profil-Register für Szene und Engine
- Neues Modul `src/scene/profile-registry.ts`: Es hält eingebaute und eigene Profile und ist von
  Szene, Engine und UI aus lesbar.
  - `resolveProfile(id)`, `profileSvgText(id)` (eingebaut: Original-SVG per `fetch`, eigen:
    `profileToSvg`), `profileMetricsMm(id)` (synchron, für eigene Profile gemessen und gecacht)
  - `subscribeProfiles(listener)`: meldet, welche Profil-IDs sich geändert haben
- Der Store schiebt bei jeder Änderung von `userProfiles` die neue Liste ins Register.

### C2 – Parameter umstellen und alte Stände übernehmen
- `wineBottleBodyProfile` wird zu **`profileId: string`**, z. B. `bottle-bordeaux` oder
  `user-profile-…`.
- **Migration:** Beim Laden von Szenen, Arrangements und Projekten wird
  `'bordeaux' | 'alsace' | 'sparkling'` zu `bottle-…`. Alte Stände sehen danach genau gleich aus.
- **Fehlt das Profil** (gelöscht oder unbekannt), wird `bottle-bordeaux` verwendet. In den Details
  steht dann der Hinweis „Profile missing – using Bordeaux“.
- Alle Maßfunktionen in `asset-wine-bottle.ts` und `asset-sizing.ts` lesen über
  `profileMetricsMm(id)` statt über den Dateinamen.

### C3 – Geometrie aus dem Register
- `wine-bottle-svg-profile.ts` holt den SVG-Text über `profileSvgText(id)`. Der Cache-Schlüssel ist
  Profil-ID plus Version, damit eine Änderung den Cache ungültig macht.
- **Robust bei fremden Profilen:**
  - Fehlt ein Teil (Slot 1–3), wird es einfach nicht gebaut.
  - Fehlt die Glaswand (Slot 0) oder ist sie unbrauchbar, wird die Flasche mit Bordeaux gebaut
    und zeigt einen Hinweis. Die Szene stürzt also nicht ab.
- **Live-Update:** Das Register meldet geänderte Profile. Die Engine baut alle Flaschen mit diesem
  Profil neu, und zwar **erst nach dem Loslassen** einer Ziehbewegung (bzw. 150 ms nach der letzten
  Änderung), nicht bei jedem Mauspixel. Undo baut ebenfalls neu.

### C4 – UI
- **„Body profile“:** Ein Auswahlfeld mit allen Profilen, eingebaute zuerst (Name · Asset), dann
  die eigenen. Dazu eine kleine Vorschau und der Button **„Edit profile“**, der den Reiter
  Profiles mit diesem Profil öffnet. Bei eingebauten Profilen gibt es stattdessen
  **„Duplicate & edit“**.
- **Geometries:** Das Label eines Teils kommt aus dem Pfadnamen des Profils für seinen Slot
  (Glass → 0, Capsule foil → 1, Capsule disc → 2, Cork → 3). Dafür bekommt der Deskriptor ein
  optionales `profileSlot`. „Label“ ist kein Pfad, bleibt fix und steht ganz unten.
- **Profiles-Reiter:** In der Info steht zusätzlich „In scene: 2 assets“. **Remove** fragt nach,
  wenn das Profil in der Szene benutzt wird. Diese Flaschen fallen dann auf Bordeaux zurück.

## Tests
- Migration alt → neu für Szene, Arrangement und Projekt-Snapshot
- Die Maße sind für die 3 eingebauten Flaschen vorher und nachher identisch.
- Eine Flasche mit eigenem Profil: Geometrie wird gebaut, Labels kommen aus den Pfadnamen.
- Eine Flasche mit Dosen- oder Radprofil: kein Absturz, fehlende Teile fehlen einfach.
- Gelöschtes Profil → Rückfall auf Bordeaux mit Hinweis.
- Profiländerung → Neubau nach dem Loslassen, Undo funktioniert.

## Nicht in C
- Beverage can, Pen und Wheel car mit eigenen Profilen. Das geht später nach demselben Muster,
  das Register ist dafür schon vorbereitet.
- Die Drehachse wählen (X oder Y).
- Extrusion (D)

## Fragen an dich
1. **Nur Weinflasche** in C, und Dose, Stift und Rad danach nach gleichem Muster? Das ist meine
   Empfehlung.
2. **Live-Update erst nach dem Loslassen** (empfohlen, flüssiger), oder wirklich während des Ziehens?
3. **Profil löschen, das benutzt wird:** nachfragen und auf Bordeaux zurückfallen (empfohlen),
   oder das Löschen ganz sperren?
