# Plan: Gekoppelte Kanten – zwei Handle-Paare pro Punkt (Orange & Rosa)

Status: **umgesetzt**
Ersetzt die Bedienung aus `plan-patch-simplify-coupling.md` (ein Schalter „Coupled / Independent“), baut auf C1 (Kopplung) und D (Kanten-Korrektur) auf.

---

## Was der Nutzer will

> Orange Handles gekoppelt gegenüber, und ob rosa Handles gekoppelt gegenüber. Bevor wir 2 Kanten koppeln, sind die im Raum irgendwo – also default müssen rosa und orange gegenüber liegen. Außer ich verschiebe sie mit Shift. Und wenn ich das mit Shift gelöst habe, brauche ich etwas, um sie wieder gegenüberliegend (Mittelwert) zu machen.

---

## Geltungsbereich

Nur **Punkte auf gekoppelten Kanten**: beide Endpunkte und jeder später eingefügte Punkt. Alle anderen Punkte: Handles frei wie bisher.

## Zwei Paare pro Punkt

| Paar | an einem **Endpunkt** | an einem **eingefügten Punkt** |
|---|---|---|
| **Orange** | mein gelber Handle ↔ gelber Handle des Partners | genauso |
| **Rosa** | mein rosa Handle der **Nachbarkante** ↔ rosa Handle der Nachbarkante des Partners | die beiden rosa Handles **entlang** der gemeinsamen Kante (vorne ↔ hinten; beide Patches teilen sie) |

- Die rosa Handles **entlang der gemeinsamen Kante an Endpunkten** gehören zur gemeinsamen Linie und sind immer gemeinsam (wie bisher).
- **Gekoppelt** = gegenüber: Ziehst/drehst du einen Handle, dreht der andere gegenüber mit. **Längen bleiben frei.**
- **Gelöst** = beide frei.

## Standard

- Beim **Koppeln zweier Kanten** (Link Edge) werden an beiden Endpunkten **beide Paare per Mittelwert gegenüber gestellt** und gekoppelt (beide Patches lagen vorher irgendwo im Raum; keine Seite „gewinnt“).
- **Neu eingefügter Punkt** auf gekoppelter Kante: beide Paare gekoppelt, per Mittelwert gegenüber.
- Bestehende gekoppelte Kanten (vor diesem Schritt): werden beim ersten Laden **nicht** verändert; Zustand „gelöst“, bis der Nutzer zusammenführt.

## Lösen und Zusammenführen

- **Shift + Ziehen** löst **nur das Paar, an dem gezogen wird** (Orange oder Rosa).
- **„Gegenüber (Mittelwert)“** – je ein Knopf pro Paar:
  - nimmt die **mittlere Richtung** beider Handles (der eine Handle und die Gegenrichtung des anderen werden gemittelt),
  - dreht **beide** auf diese Achse, gegenüber,
  - **Längen bleiben**,
  - danach ist das Paar wieder **gekoppelt**.

## Mathematik (wie „gegenüber“ genau gemeint ist)

- **Orange-Paar:** wie in C1 – gegenüber bezogen auf die Richtung **quer zur gemeinsamen Kante** (der Anteil entlang der Kante bleibt je Seite). Das ist die Bedingung für einen knickfreien Übergang; die Kanten-Korrektur (D) bleibt unverändert.
- **Rosa-Paar an Endpunkten:** ebenfalls quer zur gemeinsamen Kante gegenüber → die beiden Nachbarkanten liegen mit der gemeinsamen Kante in einer Ebene → glatter Übergang auch an den Endpunkten (gemessen in C1: Knick ≈ 0°).
- **Rosa-Paar an eingefügten Punkten:** die zwei rosa Handles exakt auf einer Linie gegenüber → die gemeinsame Kante läuft rund durch den Punkt.
- **Mittelwert:** Richtung a des einen Handles, Richtung −b des anderen (jeweils normiert, bei Orange/Rosa-Endpunkt nur der Queranteil) → Achse = normiert(a + (−b)); beide werden auf diese Achse gedreht (einer +, einer −), Längen unverändert. Sonderfall a ≈ b (Achse unbestimmt): Richtung des zuletzt gewählten Handles verwenden.

## Bedienung

**Inspector** – Punktzeile bzw. Detailbereich an Punkten gekoppelter Kanten:
- **Orange: 🔗 gekoppelt / gelöst** + Knopf **„Gegenüber (Mittelwert)“** (nur sichtbar, wenn gelöst)
- **Rosa: 🔗 gekoppelt / gelöst** + Knopf **„Gegenüber (Mittelwert)“** (nur sichtbar, wenn gelöst)
- Beschriftung in der App englisch: „Yellow pair: Coupled / Free“, „Pink pair: Coupled / Free“, Knopf „Align opposite (average)“.

**Viewport:**
- Oranges Gegenüber (gelber Handle des Partners) bleibt sichtbar und ziehbar.
- Gekoppelte Paare: durchgehende Linie zwischen den beiden Handles; gelöste Paare: gestrichelt/getrennt dargestellt.

## Daten

- `PatchPoint.joint` (bestehend) = **Orange-Paar** (`'smooth'` = gekoppelt, `'corner'` = gelöst; intern unverändert, keine Migration).
- Neu: `PatchPoint.pinkPair?: 'coupled' | 'free'` = **Rosa-Paar** (nur an Punkten gekoppelter Kanten relevant). Fehlt = gelöst (Altbestand ändert sich nicht).
- Beide Zustände werden an den Partner übertragen (gleicher Mechanismus wie heute beim Joint).
- Undo/Redo automatisch.

## Umsetzung

1. **Rosa-Kopplung im Sync:** an Endpunkten (Nachbarkanten-Rosa beider Patches, quer gegenüber) und an eingefügten Punkten (vorne ↔ hinten auf einer Linie). Gizmo/Inspector: an eingefügten Punkten dreht der andere rosa Handle direkt mit.
2. **Orange-Kopplung:** bestehender Joint, nur getrennt vom Rosa-Paar (heute koppelt der Joint an Endpunkten das Nachbarkanten-Rosa – das wandert ins Rosa-Paar).
3. **Mittelwert-Funktion** für beide Paare (rein, getestet).
4. **Link Edge / Punkt einfügen:** beide Paare per Mittelwert ausrichten und koppeln.
5. **Shift:** löst das gezogene Paar (gelb/orange → Orange-Paar; rosa → Rosa-Paar; rosa entlang der gemeinsamen Kante an Endpunkten → nichts).
6. **Inspector + Viewport** wie oben.

## Tests

1. Orange gekoppelt: gelben Handle drehen → Partner-Handle gegenüber (Queranteil), Länge bleibt.
2. Rosa gekoppelt, Endpunkt: Nachbarkanten-Rosa drehen → Partner-Rosa gegenüber (Queranteil), Länge bleibt.
3. Rosa gekoppelt, eingefügter Punkt: vorne drehen → hinten exakt gegenüber, Länge bleibt; Partner identisch (gemeinsame Linie).
4. Shift löst nur das gezogene Paar.
5. Mittelwert: zwei beliebige Richtungen → beide gegenüber auf der Mittel-Achse, Längen unverändert; Ergebnis symmetrisch (Reihenfolge egal).
6. Link Edge: nach dem Koppeln beide Paare an beiden Endpunkten gegenüber, keine Seite bevorzugt.
7. Knick-Messung (wie C1/D): beide Paare gekoppelt → Knick entlang der ganzen Kante < 0,1°.
8. Altbestand unverändert; Undo = ein Schritt.

## Offene Fragen

– keine (alle im Gespräch geklärt) –

## Umsetzung

- Neues Modul `src/scene/triangle-patch-coupled-pairs.ts`: Mittelwert (`averageOpposite`), „Align opposite (average)“ je Paar (`alignSharedPairAverage`), Paar eines Handles für Shift (`pairOfHandle`), Mitdrehen des rosa Paars an inneren Punkten (`applyInnerPinkCoupling`).
- Link-Sync: Orange-Paar (gelb ↔ gelb, quer zur Kante gegenüber) und Rosa-Paar an Endpunkten (Nachbarkanten-Rosa ↔ Partner) getrennt; beide Zustände werden übertragen. Rosa an inneren Punkten wird über die gemeinsame Kante ohnehin geteilt.
- Kanten-Korrektur (D): an Kantenpunkten zählt das Orange-Paar, an Ecken das Rosa-Paar.
- Link Edge: an beiden Endpunkten beide Paare per Mittelwert gegenüber + gekoppelt. Punkt einfügen: beide Paare gekoppelt, Orange per Mittelwert (Rosa ist durch die Teilung schon gegenüber).
- Shift + Ziehen löst das Paar des gezogenen Handles.
- Inspector (gewählter Punkt auf gemeinsamer Kante): „Yellow pair: Coupled / Free“ und „Pink pair: Coupled / Free“, bei Free zusätzlich „Align opposite (average)“. Punktzeile: 🔗 als Kennzeichen.
- Abweichung vom Plan: Gekoppelte Paare werden im Viewport **nicht** gestrichelt/durchgehend unterschieden (nur der Ring für Orange-gekoppelt bleibt). Kann bei Bedarf nachgezogen werden.
- Tests: `triangle-patch-coupled-pairs.test.ts` (8); Korrektur- und Kopplungs-Tests auf beide Paare umgestellt (Knick-Messung weiterhin < 0,1°).
- Browser: nach Link beide Paare gekoppelt (beide Patches); Yellow → Free auf beiden Patches; „Align opposite (average)“ koppelt wieder auf beiden.
