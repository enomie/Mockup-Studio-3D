# Plan B: Profile – Datenmodell mit benannten Pfaden, Duplizieren, 2D-Editor (v1)

Status: **Entwurf – wartet auf Freigabe.** Teil von `plan-profiles-2d-editor.md` (Schritt B).
Baut auf A (`plan-profiles-tab.md`) auf.

## Ist-Zustand (recherchiert)
- Profile sind SVGs in `public/profiles/lathe/`. Die Assets laden sie zur Laufzeit per `fetch` und
  holen die Pfade **über die Farbe** (Slot-Index 0–9: red, green, blue, magenta …), siehe
  `src/engine/lathe-svg-path-slots.ts`.
- Was ein Slot bedeutet, ist pro Asset fest im Code verdrahtet:
  - Wine bottle: 0 Glass, 1 Capsule foil, 2 Capsule disc, 3 Cork
  - Beverage can: 0 Body, 1 Top ring
  - Pen: 0 Cap, 1 Ring, 2 Body
  - Wheel car: 0 Tire, 1 Rim outer, 2 Rim inner, 6 Spoke
- Eigene Daten (Arrangements, Colors …) werden über `project-snapshot.ts` in IndexedDB gespeichert.

## Kernidee
Ein Profil wird ein **eigenes Datenobjekt** mit benannten Pfaden. Für die Assets erzeugen wir daraus
wieder ein SVG mit denselben Farb-Slots. So bleibt die ganze bestehende Geometrie-Pipeline
**unverändert**, und die Assets merken keinen Unterschied. Später (C) können die Assets das Profil
direkt lesen.

## B1 – Datenmodell + Namen
```ts
interface Profile {
  id: string;
  name: string;
  source: 'builtin' | 'user';
  paths: ProfilePath[];
}

interface ProfilePath {
  id: string;
  name: string;         // "Glass", "Cork" … erscheint später in den Asset-Details
  slot: number;         // Farb-Slot 0–9, Brücke zu den bestehenden Assets
  closed: boolean;      // Eigenschaft des Pfads, nicht des Profils
  nodes: ProfileNode[];
}

interface ProfileNode {
  x: number; y: number;                 // mm
  handleIn?: { x: number; y: number };  // relativ zum Punkt; fehlt = gerade Linie
  handleOut?: { x: number; y: number };
  mode: 'corner' | 'smooth';            // smooth = gegenüberliegende Handles gekoppelt
  radius?: number;                      // parametrische Rundung einer Ecke (mm), Fusion-Prinzip
}
```
- Geraden: Punkte ohne Handles. Kurven: Bézier-Handles. Rundungen: `radius` an einer Ecke.
  Damit decken wir Flaschenglas und Dose ab.
- **Eingebaute Profile:** Ein Skript (wie bei den Metriken) wandelt die 8 SVGs einmalig in
  `src/data/builtin-profiles.generated.ts` um und vergibt die Namen aus der Tabelle oben.
- **`profileToSvg(profile)`** erzeugt wieder ein SVG mit `path_*`-Klassen. Ein Test stellt sicher,
  dass Bounds und Metriken für alle 8 Profile gleich bleiben.
- Die Profiles-Liste zeigt die **Namen der Pfade** statt der Farbpunkte.

## B2 – Duplizieren, Umbenennen, Löschen
- Eingebaute Profile sind schreibgeschützt (wie bei Arrangements). Mit „Duplicate“ entsteht
  ein eigenes Profil „… copy“.
- Eigene Profile: Name ändern, „Remove“, und Pfade umbenennen.
- „Add new“ legt ein leeres Profil mit einem Pfad an.
- Gespeichert wird im Projekt (`project-snapshot.ts`, IndexedDB), wie die Arrangements.
- Undo/Redo über die bestehende History.

## B3 – 2D-Editor, erste Version (nur das Nötigste)
- **Wo:** „Edit“ an einem eigenen Profil öffnet den Editor **anstelle des 3D-Viewports** in der
  Mitte. Die Panels bleiben, „Done“ bzw. Esc schließt ihn wieder.
- **Darstellung:** SVG-Zeichenfläche mit mm-Raster, Zoom (Mausrad) und Pan (Leertaste oder
  mittlere Maustaste). Die Pfade erscheinen in ihrer Slot-Farbe, der aktive Pfad hervorgehoben.
- **Bearbeiten:**
  - Punkte und Handles ziehen. Die **Handles sind groß** (ca. 12 px Trefferfläche) und keine
    Minipunkte.
  - `smooth`: Die gegenüberliegenden Handles bewegen sich gekoppelt. **Shift beim Ziehen
    entkoppelt** sie und macht daraus eine Ecke, wie bei der PATCH-Geometrie.
  - Klick auf ein Segment fügt einen Punkt ein, Entf/Backspace löscht den ausgewählten Punkt.
  - Doppelklick auf einen Punkt schaltet zwischen Ecke und glatt um.
- **Parametrisch:** Rechts stehen Zahlenfelder für den ausgewählten Punkt: X, Y, Radius und die
  Handles (Länge und Winkel). Dazu „Closed“ an/aus für den Pfad.
- Die Änderungen wirken live, die 3D-Vorschau folgt erst mit C.
- **Bewusst noch nicht drin:** Pfad aufbrechen, neue Pfade zeichnen (Stift-Werkzeug), Snapping,
  Constraints, SVG-Import/-Export.

## Reihenfolge und Commits
B1 → B2 → B3, jeweils als eigener Commit mit Tests. Nach B1 und nach B2 kurz anschauen.

## Fragen an dich
1. Ist der Editor **anstelle des Viewports** in der Mitte ok, oder lieber als eigenes, großes
   Overlay-Fenster?
2. Sollen eingebaute Profile **schreibgeschützt** sein, also nur über Duplizieren änderbar?
   Das ist meine Empfehlung.
3. Passen die Pfadnamen in der Tabelle oben? Was ist z. B. „Spoke“ beim Rad, und braucht
   „Rim outer/inner“ bessere Namen?
