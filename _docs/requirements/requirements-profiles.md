# Profiles & 2D-Profil-Editor

**Lebendes Dokument:** Es beschreibt den aktuellen Stand und wird bei jeder Änderung an Profilen
oder am Editor im selben Commit nachgezogen. Die Pläne in `_docs/plans/plan-profiles-*.md` sind nur
der Verlauf.

Stand: A, B (B1 Datenmodell, B2 Verwalten, B3 Editor) und C (Profile in der Weinflasche) umgesetzt. D ist offen.

---

## 1. Überblick
- Ein **Profil** ist eine neutrale Sammlung **benannter 2D-Pfade** in mm.
- Ein Profil hat **keinen Typ** wie Lathe oder Extrusion. Ob gedreht oder extrudiert wird, und um
  welche Achse, entscheidet das **Asset**, das das Profil benutzt.
- **Offen oder geschlossen** ist eine Eigenschaft des einzelnen Pfads. Auch offene Pfade lassen
  sich später extrudieren, dann entsteht eine Hülle ohne Volumen.
- Die Pfadnamen (z. B. „Glass“, „Cork“) sollen später 1:1 in den Asset-Details unter Geometries und
  Materials erscheinen (Schritt C).

## 2. Datenmodell (`src/scene/profile-model.ts`)

| Typ | Feld | Bedeutung |
|---|---|---|
| `Profile` | `id`, `name` | Kennung und Anzeigename |
| | `source` | `builtin` (schreibgeschützt) oder `user` |
| | `paths` | Liste von `ProfilePath` |
| `ProfilePath` | `id`, `name` | Kennung, Anzeigename („Glass“) |
| | `slot` | Farb-Slot 0–9 (`path_red`, `path_green`, …), die Brücke zu den Lathe-Assets |
| | `closed` | geschlossen oder offen |
| | `nodes` | Liste von `ProfileNode` |
| `ProfileNode` | `x`, `y` | Position in mm, die y-Achse zeigt nach unten (wie im SVG) |
| | `handleIn`, `handleOut` | Bézier-Handles **relativ** zum Punkt. Fehlt eines, ist das Segment auf dieser Seite gerade. |
| | `mode` | `smooth`: Die Handles liegen gegenüber und bewegen sich gekoppelt. `corner`: Sie bewegen sich frei. |
| | `radius` | Parametrische Rundung einer Ecke in mm. Wirkt nur an einem Punkt ohne Handles zwischen zwei geraden Segmenten. |

- `profileToSvg(profile)` schreibt ein Lathe-SVG mit den Klassen `path_*`, sodass die bestehende
  SVG-Pipeline das Profil versteht.
- `profilePathToSvgData(path)` liefert die Pfaddaten (`d`) eines einzelnen Pfads, Rundungen
  inklusive.

## 3. Eingebaute Profile

| Profil | Datei (`public/profiles/lathe/`) | Asset | Pfade (Slot → Name) |
|---|---|---|---|
| Bordeaux / Alsace / Sparkling bottle | `lathe-y-bottle-*-open.svg` | Wine bottle | 0 Glass, 1 Capsule foil, 2 Capsule disc, 3 Cork |
| Can 330 ml classic / sleek | `lathe-y-can-330ml-*.svg` | Beverage can | 0 Body, 1 Top ring |
| Marker / Fountain pen | `lathe-y-pen-*.svg` | Pen | 0 Cap, 1 Ring, 2 Body |
| Car wheel | `lathe-x-wheel-car.svg` | Wheel car | 0 Tire, 1 Rim outer, 2 Rim inner, 6 Spoke |

- **Die SVGs bleiben die Quelle.** `scripts/generate-builtin-profiles.ts` wandelt sie in
  `src/data/builtin-profiles.generated.ts` um. Das läuft automatisch bei `npm run dev` und
  `npm run build`. Bögen werden dabei zu Bézier-Kurven.
- **Pfadnamen** stehen in `src/scene/builtin-profile-path-names.ts`, der Katalog (ID, Name, Datei,
  Asset) in `src/scene/builtin-profile-files.ts`.
- **Wenn sich ein SVG ändert:** `npx tsx scripts/generate-lathe-profile-metrics.ts` und
  `npx tsx scripts/generate-builtin-profiles.ts` ausführen. Die Tests prüfen, dass die generierten
  Daten zu den SVGs passen und dass der Rückweg zu SVG weniger als 0,05 mm abweicht.
- Eingebaute Profile werden in 3D aus der Original-SVG gebaut, eigene aus `profileToSvg`.

## 4. Reiter „Profiles“ (`src/ui/panels/ProfilesPanel.tsx`)
- Er steht im linken Hauptpanel nach „Assets“, mit dem Icon `Spline`.
- **Liste:** Eingebaute Profile stehen zuerst, dann die eigenen, jeweils nach Name sortiert. Jede
  Kachel zeigt eine Vorschau, den Namen und darunter „Built-in · Asset · B × H mm“. Die Breite ist
  die des halben Profils.
- **Eingebautes Profil gewählt:** Info (Größe, Asset, Datei) und die Pfade mit Name, Offen/Geschlossen
  und Punktanzahl. Dazu der Hinweis „read-only“ und **Duplicate**.
- **Eigenes Profil gewählt:** Bereich „Editor“ mit Name, umbenennbaren Pfaden, **Edit** (öffnet den
  2D-Editor), **Duplicate** und **Remove**.
- **Add new:** legt „New profile“ an, mit einem geschlossenen Quadrat von 50 × 50 mm.
- **Speichern:** Eigene Profile liegen im Projekt-Snapshot (`libraries.profiles`, IndexedDB). Ältere
  Projektstände ohne Profile laden weiterhin.
- **Undo/Redo:** Die History-Gruppe `profiles` deckt `userProfiles` ab.
- **In scene:** Die Info zeigt, wie viele Assets der Szene das Profil benutzen. **Remove** fragt
  nach, wenn es benutzt wird. Diese Assets fallen dann auf Bordeaux zurück.

## 4a. Profile in Assets (C): Weinflasche
- **Nur die Weinflasche** benutzt bisher Profile. Dose, Stift und Rad folgen nach demselben Muster.
- **Parameter:** `wineBottleParams.wineBottleBodyProfile` enthält die **Profil-ID** (z. B.
  `bottle-bordeaux`, `user-profile-…`). Der Feldname blieb aus Kompatibilitätsgründen.
  Alte Werte `bordeaux` / `alsace` / `sparkling` werden über `canonicalProfileId` weiter verstanden
  und beim nächsten Ändern umgeschrieben.
- **Slots der Flasche:** 0 = Glaswand (Pflicht), 1 = Capsule foil, 2 = Capsule disc, 3 = Cork.
  Fehlende Teile werden nicht gebaut. Fehlt die Glaswand oder das Profil, wird **Bordeaux**
  verwendet, und die Details zeigen „Profile missing … – using Bordeaux“.
- **Jedes Profil ist wählbar**, auch Dose, Stift oder Rad (das Ergebnis darf „weird“ aussehen).
- **Die Glaswand** wird beim Bauen auf den aufsteigenden Außenmantel reduziert
  (`trimLatheProfileToAscendingOuterMantle`). Manche Ausbuchtungen nach außen wirken sich deshalb
  nicht oder nur teilweise aus. Die Kapselteile und der Korken folgen dem Profil direkt.
- **Details der Flasche, „Body profile“:**
  - Auswahl aller Profile (eingebaute zuerst) mit Vorschau
  - **Edit profile** bei eigenen Profilen, **Duplicate & edit** bei eingebauten (die Kopie wird
    zugewiesen). Beide öffnen den Reiter Profiles und den Editor.
- **Geometries:** Die Labels von Glass, Capsule foil, Capsule disc und Cork kommen aus den
  Pfadnamen des Profils (`profileSlot` im Deskriptor). „Label“ bleibt fix und steht unten.
- **Neubau:** `src/scene/profile-registry.ts` meldet geänderte Profile.
  `src/engine/profile-rebuild-scheduler.ts` baut die betroffenen Flaschen **nach dem Loslassen**
  neu, wenn 150 ms lang nichts mehr geändert wurde. Undo, Laden und Löschen lösen das ebenso aus.
  Die Höhe der Flasche kommt beim Bauen immer frisch aus dem Profil.

## 5. 2D-Editor (B3)
Mit **Edit** an einem eigenen Profil öffnet sich der Editor **anstelle des 3D-Viewports** in der Mitte.
Die Seitenpanels bleiben sichtbar. **Done** oder **Esc** schließt ihn wieder.

### Bedienung

| Aktion | Eingabe | Wie bei PATCH? |
|---|---|---|
| Punkt auswählen und verschieben | Punkt anklicken und ziehen | ja |
| Handle ziehen | Handle ziehen. Bei `smooth` bewegt sich das gegenüberliegende Handle spiegelbildlich mit, seine Länge bleibt. | ja |
| Handles entkoppeln | **Shift** halten beim Ziehen eines Handles. Der Punkt wird zur Ecke (`corner`). | ja |
| Punkt einfügen | auf ein Segment klicken. Die Form bleibt erhalten, die Kurve wird dort geteilt. | ähnlich |
| Punkt löschen | **Entf** oder **Backspace**. Ein Pfad hat mindestens 2 Punkte. | – |
| Ecke ↔ glatt | **Doppelklick** auf den Punkt (Erkennung beim Drücken, weil das Pointer-Capture den nativen dblclick umlenkt). Glatt → Ecke entfernt die Handles. Ecke → glatt legt Handles entlang der Nachbarn an. | – |
| Auswahl aufheben | Klick ins Leere | ja |
| Zoomen | Mausrad (um den Mauszeiger) | – |
| Verschieben | mittlere Maustaste oder **Leertaste** + Ziehen | – |
| Schließen | **Esc** oder **Done** | – |
| Rückgängig | Strg/Cmd + Z, eine Ziehbewegung ist ein Schritt | ja |

- **Darstellung:** Raster in mm (fein alle 10 mm, kräftiger alle 50 mm). Der Ursprung (0/0) ist
  markiert, die x = 0-Linie ist die Drehachse der Lathe-Profile. Pfade erscheinen in ihrer
  Slot-Farbe, der aktive Pfad kräftiger.
- **Punktform:** Ecken sind Quadrate, glatte Punkte Kreise. Der ausgewählte Punkt ist gefüllt.
- **Handles sind groß:** Punkte und Handles haben eine Trefferfläche von etwa 12 px Radius, egal wie
  weit gezoomt ist. Es gibt keine Minipunkte. Handles erscheinen am ausgewählten Punkt.
- **Zahlenfelder im Profiles-Panel**, solange der Editor offen ist:
  - für den ausgewählten Punkt: X, Y, Radius (mm), Modus Ecke/Glatt, Länge und Winkel jedes Handles
  - für den Pfad: Closed an/aus
- Während der Editor offen ist, wirken Entf, Esc und die Viewport-Kürzel nicht auf die 3D-Szene.

## 6. Dateien

| Bereich | Datei |
|---|---|
| Datenmodell, SVG-Ausgabe, Rundungen | `src/scene/profile-model.ts` |
| Bearbeitungsfunktionen (Punkt einfügen, löschen, Handles) | `src/scene/profile-edit.ts` |
| Bibliothek (eingebaut und eigene, Vorschau, Maße) | `src/scene/profile-library.ts` |
| Katalog der eingebauten Profile und Pfadnamen | `src/scene/builtin-profile-files.ts`, `src/scene/builtin-profile-path-names.ts` |
| SVG-Import | `src/engine/profile-svg-import.ts` |
| Generator und generierte Daten | `scripts/generate-builtin-profiles.ts`, `src/data/builtin-profiles.generated.ts` |
| Store | `src/ui/store/app-store-profiles.ts` (`userProfiles`, `selectedProfileId`, `editingProfileId`, `profileNodeSelection`) |
| Speichern | `src/ui/persistence/project-snapshot.ts`, `project-persistence.ts` |
| Panel | `src/ui/panels/ProfilesPanel.tsx` |
| Register für Szene und Engine (eigene Profile, Versionen, alte IDs) | `src/scene/profile-registry.ts` |
| Nutzung in der Szene | `src/scene/profile-usage.ts` |
| Weinflasche: Profil auflösen, Maße | `src/scene/asset-wine-bottle.ts` |
| Weinflasche: Geometrie aus Profil | `src/engine/wine-bottle-svg-profile.ts`, `wine-bottle-geometry.ts` |
| Neubau bei Profiländerung | `src/engine/profile-rebuild-scheduler.ts` |
| Body profile in den Flaschen-Details | `src/ui/panels/entity-fields/WineBottleFields.tsx` |
| Editor (Zeichenfläche, Ansicht, Zahlenfelder) | `src/ui/profile-editor/ProfileEditor.tsx`, `profile-editor-view.ts`, `ProfileNodeFields.tsx`, Styles in `src/ui/styles/features/profile-editor.css` |

## 7. Bewusst noch nicht drin
- Einen Pfad an einem Punkt aufbrechen, neue Pfade zeichnen (Stift-Werkzeug), Pfade hinzufügen oder
  löschen
- Fangen (Snapping), Constraints, Bemaßungen
- SVG-Import und -Export für Nutzer
- Eigene Profile in Dose, Stift und Rad, Extrusion-Asset (D)
- Live-3D-Vorschau **während** des Ziehens (Neubau erst nach dem Loslassen)
