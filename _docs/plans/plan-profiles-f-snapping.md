# Plan F: Fangen (Snapping) im 2D-Profil-Editor

Status: **Umgesetzt.** Entscheidungen: Kürzel G / N / Alt, Achsen gehören zu Points. Ergänzung: Die Schalter sind optionale Projekteinstellungen, damit ältere Projektstände weiter laden. Stand: `_docs/requirements/requirements-profiles.md`.

## Ziel
Beim Zeichnen und Verschieben rasten Punkte auf das **Raster** und auf **vorhandene Punkte** ein.
Beides lässt sich **einzeln an- und ausschalten**.

## Bedienung
- **Rechts im Inspector** kommt ein neuer Bereich **„Snapping“** mit zwei Schaltern (Toggle-Gruppe wie
  „Mirror X | Y | Z“ beim Patch):
  - **Grid:** auf das sichtbare Raster
  - **Points:** auf Punkte aller sichtbaren Pfade und auf die beiden Achsen (x = 0 ist die
    Drehachse der Lathe-Profile, y = 0)
- **Tastenkürzel:** **G** schaltet Grid um, **N** schaltet Points um.
- **Alt (Option) halten** setzt das Fangen vorübergehend aus. Das Loslassen von Alt stellt es
  wieder her. So geht man in Illustrator und Fusion für einen einzelnen freien Zug vor.
- **Standard:** beides an. Die Einstellung wird mit dem Projekt gespeichert (wie Licht, Nebel usw.).

## Wirkung
- **Gilt für:**
  - Punkte ziehen (Select)
  - Punkte setzen und Handles ziehen (Pen)
  - Handle-Spitzen ziehen (Select)
- **Gilt nicht für:**
  - Zahlenfelder rechts (dort gilt genau der eingegebene Wert)
  - Scissors (geschnitten wird auf dem Pfad, wo man klickt)
  - Einfügen per Klick auf ein Segment (der neue Punkt liegt auf der Kurve, erst das anschließende
    Ziehen rastet)
- **Rasterweite = die sichtbare Rasterweite**, die sich mit dem Zoom ändert und unten als
  „Grid 0.001 m“ steht. Reinzoomen ergibt also feineres Fangen.
- **Punkte:**
  - Fangradius 10 px auf dem Bildschirm, unabhängig vom Zoom.
  - Ziele sind alle Punkte sichtbarer Pfade außer dem gezogenen selbst.
  - Ein Punkt hat Vorrang vor Achse und Raster. Die Achse hat Vorrang vor dem Raster.
  - Auf den Achsen rastet jede Richtung für sich: In der Nähe von x = 0 wird nur x festgelegt.
- **Rückmeldung:** Am Fangziel erscheint ein kleiner Ring (Punkt) bzw. eine kurze Hilfslinie
  (Achse). So sieht man, worauf gerade gerastet wird.

## Umsetzung
1. **Reine Funktion** `snapPoint(point, options)` in `src/scene/profile-snap.ts`.
   - Eingaben: Rasterweite, Fangradius in mm, Zielpunkte, Schalter.
   - Ergebnis: der gefangene Punkt und die Art (`point` / `axis` / `grid` / `none`).
   - Dazu Tests für Raster, Punkt-Vorrang, Achse je Richtung, beides aus und Alt.
2. **Store:** `profileSnapGrid`, `profileSnapPoints` (Standard true), gespeichert in den
   Projekteinstellungen. Ältere Projektstände ohne diese Werte laden mit „an“.
3. **Editor** (`ProfileEditor.tsx`): Ziehen und Pen laufen über `snapPoint`. Alt wird über
   `event.altKey` erkannt. Der Ring bzw. die Hilfslinie am Ziel wird angezeigt. Dazu die Tasten
   G und N.
4. **Inspector:** neuer Bereich „Snapping“ mit Grid | Points.
5. **Doku:** `requirements-profiles.md` (Bedientabelle, Inspector, Store) nachziehen.

## Nicht in F
- Fangen auf Segmente (irgendwo auf einer Linie), auf Mittelpunkte und Schnittpunkte
- Fangen auf Winkel (Shift für 45°)
- Eine eigene, feste Rasterweite (unabhängig vom Zoom)

## Fragen an dich
1. Passen die **Kürzel G / N** und **Alt** zum vorübergehenden Ausschalten?
2. Sollen die **Achsen** zu „Points“ gehören (so geplant), oder lieber ein **dritter Schalter
   „Axis“**?
