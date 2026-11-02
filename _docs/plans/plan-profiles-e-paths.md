# Plan E: Pfade aufbrechen, neue Pfade zeichnen, Meter statt mm, rechtes Panel im 2D-Editor

Status: **Umgesetzt (E1–E4).** Abweichung E4: Jeder Pen-Punkt ist ein eigener Undo-Schritt (statt der ganze Pfad), damit Undo beim Zeichnen den letzten Punkt entfernt. Stand: `_docs/requirements/requirements-profiles.md`.

## 1. Meter statt mm (überall in der Oberfläche)
- **Ist:** Der Editor zeigt X, Y, Radius und Handle-Länge in mm. Die Extrusion zeigt Depth in mm,
  die Profil-Liste „38 × 293 mm“.
- **Neu:** Alle Längen erscheinen wie im Rest der App in **Metern mit 4 Nachkommastellen** und
  der Einheit **m** rechts vom Feld (`formatMmAsMeters` / `parseMmFromMetersInput` bzw.
  `formatLengthMeters` aus `src/units/length.ts`). Winkel bleiben in °.
  - Profil-Liste/Info: „0.0382 × 0.2929 m“
  - Editor: X, Y, Radius, Handle-Länge in m
  - Extrusion: Depth in m
  - Editor-Raster: Die Abstände bleiben (1/5/10/50/100 mm …). Der Hinweis unten nennt die
    Rasterweite in m, z. B. „Grid 0.01 m“.
- **Intern bleibt mm** (die Profil-SVGs sind 1 Einheit = 1 mm, das Datenmodell auch). Umgerechnet
  wird nur in der Anzeige und Eingabe. So gibt es keine Migration und kein Risiko für die
  bestehenden Assets.

## 2. Rechtes Panel im 2D-Editor (deine Frage)
**Ist:** Während der Editor offen ist, zeigt das rechte Panel weiter die 3D-Themen (Scene,
Environment, Camera, Lighting, Physics, Export). Für 2D sind die nutzlos. Die Punkt-Felder stehen
links im Profiles-Panel, unter der Liste, und das wird schnell lang.

**Vorschlag: Rechts wird im 2D-Modus zum 2D-Inspector, nach demselben Muster wie in 3D**
(links Bibliothek, rechts Eigenschaften):
- Die rechte **Icon-Leiste (Right main panel)** wird ausgeblendet, solange der Editor offen ist.
  Ihre Reiter sind 3D-Themen. Der Platz geht an die Zeichenfläche.
- Rechts erscheint stattdessen ein Panel **„Profile editor“** mit drei Bereichen:
  1. **Tools:** Select (V), Pen (P), Scissors (C). Mehr dazu unten.
  2. **Paths:** Liste aller Pfade mit Farbe, Name (umbenennbar), Offen/Geschlossen,
     Punktanzahl, **Slot** (Auswahl 1–10, siehe unten) sowie Sichtbar/Auge, Löschen und
     „Add path“. Ein Klick wählt den Pfad.
  3. **Point:** X, Y, Typ (Ecke/Glatt), Radius, Handles (Länge in m, Winkel in °) und
     **Break here**. Das sind die Felder, die heute links stehen.
- **Links** bleibt nur die Profil-Liste mit Name, Info und Edit/Duplicate/Remove. Die Punkt-Felder
  ziehen nach rechts um.
- Nach **Done** bzw. Esc ist rechts wieder alles wie vorher.

## 3. Pfade aufbrechen (Scissors)
- Werkzeug **Scissors (C)**, oder **Break here** im Point-Bereich für den ausgewählten Punkt.
- **Klick auf einen Punkt:**
  - **Geschlossener Pfad:** Er wird an dieser Stelle **geöffnet**. Der Punkt wird verdoppelt und
    ist danach Anfang und Ende. Die Form bleibt gleich.
  - **Offener Pfad:** Er wird in **zwei Pfade** geteilt. Der zweite bekommt den nächsten freien Slot
    und den Namen „‹Name› 2“.
- **Klick auf ein Segment:** Dort wird zuerst ein Punkt eingefügt (de Casteljau, die Form bleibt),
  dann wird wie oben geschnitten.
- **Grenze:** Ein Profil hat höchstens **10 Pfade** (10 Farb-Slots). Sind alle belegt, ist das
  Teilen eines offenen Pfads gesperrt und es erscheint ein Hinweis. Öffnen geht immer.
- **Gegenstück „Join“:** Zwei Endpunkte offener Pfade auswählen (Shift-Klick auf den zweiten)
  → **Join** verbindet sie zu einem Pfad. Sind es Anfang und Ende desselben Pfads, wird er
  geschlossen. Das gehört als Gegenstück dazu.

## 4. Neue Pfade zeichnen (Pen)
- Werkzeug **Pen (P)**, wie in Illustrator:
  - **Klick** setzt einen Eckpunkt (Gerade zum vorigen).
  - **Klicken und ziehen** setzt einen glatten Punkt und zieht seine Handles (gegenüberliegend,
    Shift entkoppelt, wie überall).
  - **Klick auf den ersten Punkt** schließt den Pfad.
  - **Enter** oder **Esc** beendet den Pfad offen. Ein Pfad mit nur einem Punkt wird verworfen.
  - **Klick auf einen Endpunkt** eines vorhandenen offenen Pfads **zeichnet dort weiter**.
- Ein neuer Pfad bekommt den nächsten freien Slot und den Namen „Path ‹n›“. Er ist sofort
  aktiv, damit man ihn rechts umbenennen kann.
- Bis zum Abschluss zeigt eine **Vorschau-Linie** vom letzten Punkt zur Maus, wo das nächste
  Segment entsteht.
- Ein ganzer Pen-Pfad ist **ein Undo-Schritt**. Undo während des Zeichnens entfernt den letzten
  Punkt.

## 5. Slot eines Pfads (wichtig für die Assets)
Die Assets lesen Pfade über den **Slot** (Flasche: 0 Glass, 3 Cork, Stift: 2 Body …). Damit neue
oder geteilte Pfade eine Rolle bekommen können, lässt sich der Slot in der Pfadliste wählen
(1–10, mit Farbe). Ist der Slot schon belegt, **tauschen** die beiden Pfade ihre Slots. Ein kurzer
Hinweis neben der Auswahl zeigt die Rolle für das zugehörige Asset, falls bekannt,
z. B. „Slot 1 · Glass (Wine bottle)“.

## Umsetzung (Reihenfolge, je ein Commit)
1. **E1 Meter:** Anzeige und Eingabe in m überall in Profiles, Editor und Extrusion. Tests für
   Format und Parsen.
2. **E2 Rechtes Panel:** 2D-Inspector rechts, Icon-Leiste ausgeblendet, Punkt-Felder ziehen um,
   Pfadliste mit Slot, Sichtbarkeit, Löschen, Add path.
3. **E3 Scissors und Join:** reine Funktionen in `src/scene/profile-edit.ts` (`breakAtNode`,
   `breakAtSegment`, `joinEndpoints`) mit Tests, dann Werkzeug und Buttons.
4. **E4 Pen:** Zeichen-Zustand im Editor (`ProfileEditor.tsx`), `addPath` / `appendNode` /
   `prependNode` als reine Funktionen mit Tests.
5. **Doku:** `requirements-profiles.md` (Bedientabelle, Dateien, „nicht drin“) bei jedem Schritt
   nachziehen.

## Nicht in E
- Fangen (Snapping) an Raster und Punkten, Bemaßungen, Constraints
- Boolesche Operationen (Vereinen, Abziehen), Löcher
- SVG-Import und -Export

## Fragen an dich
1. **Rechtes Panel:** Passt der Vorschlag, im 2D-Modus rechts einen 2D-Inspector zu zeigen und
   die rechte Icon-Leiste auszublenden? Oder sollen die Punkt-Felder links bleiben und rechts
   einfach alles ausgeblendet werden (mehr Zeichenfläche)?
2. **Join** gleich mit in E3, oder erst später?
3. **Tastenkürzel** V / P / C wie in Illustrator, ok?
