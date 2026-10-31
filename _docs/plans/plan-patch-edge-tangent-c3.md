# Plan: Schritt C3 – Zwei Schalter pro Punkt: Kante und Fläche

Status: **C3a erledigt** – C3b (Bedienung) offen
Vorgänger: `plan-patch-smooth-corner.md` (C1/C2: Gelenke zwischen verbundenen Patches), `plan-patch-classic-edge-correction.md` (D: Classic + Kanten-Korrektur)

---

## Grundsatz

> **Jeder sichtbare Handle bewirkt etwas. Kopplungen gibt es nur, wo sie helfen – und jede lässt sich mit Shift lösen.**

Volle Gestaltungsfreiheit. Was bisher „vorher schon so war“, wird daran gemessen und ggf. geändert.

## Das Prinzip (Skizze des Nutzers)

An jedem Punkt läuft eine Linie im Profil entweder **durch** (Smooth) oder **knickt** (Corner). Das gibt es in **zwei Richtungen**:

| Schalter | Handles | Richtung | Smooth | Corner |
|---|---|---|---|---|
| **Kante** (neu) | die zwei **rosa** Handles des Punkts | **entlang** der Kante | Randlinie läuft rund durch den Punkt | Randlinie knickt am Punkt |
| **Fläche** (= Joint aus C2) | **mein gelber** Handle + **gelber Handle des Nachbar-Patches** | **quer** zur Kante | Fläche geht glatt in den Nachbarn über | Grat zwischen den Flächen |

Die zwei Schalter sind **unabhängig**. Damit ist auch der allererste Wunsch abgedeckt: *gemeinsame Linie, aber die Flächen wölben sich anders weg* = Kante **Smooth**, Fläche **Corner**.

- **Länge** der Handles = wie rund/voll (Länge 0 = Knick ohne Rundung, Sonderform von Corner). Unabhängig von Smooth/Corner.

---

## Punkte: kein Unterschied mehr in der Bedienung

- Intern bleiben die 3/4 **Patch-Ecken** das Gerüst der Fläche (nicht löschbar, kleine Markierung „Patch corner“).
- In der Bedienung ist **jeder Punkt gleich**: gleiche Handles, gleiche zwei Schalter.
- Unterschied nur im **Standardwert** des Schalters „Kante“: Patch-Ecken starten **Corner** (der Umriss biegt dort ab), Kantenpunkte **Smooth**.
- Kante **Smooth an einer Patch-Ecke** ist erlaubt, aber mit Hinweis („flattens the patch at this corner“), weil die Fläche dort flach zusammengedrückt wird.

---

## Die gelben Handles neu geordnet

- **Wippe entfällt:** `handleCrossIn` und `handleCrossOut` sind nicht mehr gegenseitig gekoppelt. Der gelbe Handle ist frei.
- **Cross Out bekommt seine eigentliche Bedeutung: das Gegenüber beim Nachbarn.**
  - **Verbundener Punkt:** Als „Cross Out“ wird der **gelbe Handle des Partner-Patches** angezeigt (an derselben Stelle im Raum). Ziehen daran bewegt den Handle des Partners. Bei Fläche = Smooth bilden beide ein Paar wie in Illustrator.
  - **Unverbundener Punkt:** kein Nachbar → **kein Gegenüber** → Cross Out wird **ausgeblendet** und ist nicht anklickbar.
  - Die gespeicherten `handleCrossOut`-Daten bleiben unangetastet (keine Wirkung auf die Form, nur Ladekompatibilität).
- An **Patch-Ecken** gilt der eine gelbe Handle weiterhin für beide angrenzenden Kanten (Classic-Fläche). „Ein gelber Handle pro Kante an Ecken“ ist ein **eigener späterer Schritt** (Eingriff in die Classic-Berechnung).

---

## Regeln

**Kante = Smooth** (rosa Paar):
- Ändern von `handleNext` → `handlePrev` wird auf die Gegenrichtung gedreht, **Länge bleibt** (und umgekehrt).
- Gilt überall, wo Handles geändert werden: Viewport-Gizmo, Inspector (X/Y/Z, Length), Punkt-Paste.
- Rotation des ganzen Punkts (Rot X/Y/Z) und Verschieben des Ankers ändern die Kolinearität nicht.

**Fläche = Smooth** (gelbes Paar mit dem Partner): unverändert aus C1/C2 (Queranteil gegenüber, Längen frei; an Ecken über den rosa Handle der Nachbarkante).

**Shift + Ziehen** bricht immer das Paar, an dem gezogen wird:
- **rosa** Handle → Schalter **Kante** wird Corner,
- **gelber** Handle (eigener oder das angezeigte Gegenüber) → Schalter **Fläche** wird Corner (auf beiden Patches).
- *(Änderung gegenüber C2: Shift bricht nicht mehr bei jedem Handle die Fläche.)*

**Handles einziehen:** Knopf im Inspector setzt die Länge der rosa Handles auf 0 (spitzer Punkt ohne Rundung); wieder herausziehen über „Length“.

**Verbundene Kanten:** Schalter-Zustände und rosa Handles gemeinsamer Punkte werden auf den Partner übertragen (wie heute der Joint).

---

## Datenmodell

- Neu: `PatchPoint.edgeTangent?: 'smooth' | 'corner'` (Schalter **Kante**).
- Bestehend: `PatchPoint.joint` (Schalter **Fläche**) – nur die Beschriftung ändert sich.
- **Bestehende Punkte ohne `edgeTangent`:** automatisch **Smooth**, wenn die rosa Handles schon (fast) auf einer Linie liegen (< 1°), sonst **Corner**. Formen ändern sich dadurch nicht.
- **Neu eingefügte Punkte:** Kante Smooth (de Casteljau liefert ohnehin gegenüberliegende Handles).
- Undo/Redo automatisch (Teil der Patch-Daten).

---

## Bedienung

**Inspector** (Detailbereich des gewählten Punkts):
- **Edge: Smooth / Corner** (alle Punkte)
- **Surface: Smooth / Corner** (nur Punkte auf verbundenen Kanten; Sternpunkte „Shared“, nicht schaltbar)
- Knopf **Retract handles** (rosa Längen auf 0)
- Beim Wechsel auf Smooth gibt der gewählte Handle die Richtung vor (sonst „Forward“ bzw. dieser Patch), der andere springt gegenüber und behält seine Länge.
- Die Punktliste zeigt beide Zustände kompakt an.

**Viewport:**
- Rosa Handles: Smooth = Raute (wie heute), **Corner = Würfel**.
- Gelbe Handles: eigener = Raute; Gegenüber vom Partner = Raute in Partner-Farbe; Fläche Corner = **Würfel**.
- Anker-Markierung für Gelenke aus C2 (Ring/Würfel) bleibt.

---

## Tests

1. Kante Smooth: `handleNext` ändern → `handlePrev` exakt gegenüber, Länge unverändert (Gizmo- und Inspector-Weg).
2. Kante Corner: rosa Handles unabhängig.
3. Wippe weg: `handleCrossIn` ändern verändert `handleCrossOut` nicht.
4. Bestehende Punkte: Einstufung Smooth/Corner nach < 1°-Regel, Form unverändert.
5. Neu eingefügter Punkt: Kante Smooth, Randlinie unverändert.
6. Shift: rosa → nur Kante Corner; gelb → nur Fläche Corner (beide Patches).
7. Gegenüber-Handle: zeigt Partner-Handle in Weltlage; Ziehen ändert den Partner.
8. Kante Smooth + Fläche Corner gleichzeitig möglich (erste Skizze).
9. Verbundene Kanten: Zustände/Handles beim Partner, idempotent; Undo = ein Schritt.

## Umsetzungsschritte

- **C3a – Regeln + Daten + Tests:** `edgeTangent`, Kolinearitäts-Regel (gemeinsamer Helfer für Gizmo/Inspector/Paste), Wegfall der Wippe, Einstufung Altbestand, Shift-Präzisierung, Übertragung an Partner.
- **C3b – Bedienung:** zwei Schalter + „Retract handles“ im Inspector, Würfel-Handles, Cross Out ausblenden bzw. als Partner-Gegenüber anzeigen und ziehbar machen.

## Umsetzung C3a

- `PatchPoint.edgeTangent` + `resolveEdgeTangent` (Altbestand: < 1° → Smooth) + `applyEdgeTangentRule` (gemeinsam für Gizmo und Inspector).
- Wippe zwischen den gelben Handles entfernt (Gizmo und Inspector).
- Shift: rosa → Kante Corner, gelb → Fläche Corner.
- Neu eingefügte Punkte: Kante Smooth. Punkt-Paste: Kanten-Zustand wird aus den neuen Handles neu bestimmt.
- Verbundene Kanten: Kanten-Zustand wird an den Partner übertragen.
- Tests: `src/scene/triangle-patch-edge-tangent.test.ts` (7). Shift im Gizmo ist nicht automatisch getestet (braucht echte Tastatur/Viewport).
- Sichtbar ändert sich für dich bis C3b: die gelben Handles sind frei (keine Wippe), rosa Handles an geraden Punkten drehen gemeinsam, Shift trennt sie.

## Danach (eigener Plan)

- Ecken: ein gelber Handle **pro Kante** (volle Freiheit auch an Patch-Ecken).
- Idee: „**Make patch corner**“ – selbst wählen, welche Punkte die 3/4 Patch-Ecken sind.

## Entscheidungen

1. Bestehende Punkte: automatisch Smooth bei (fast) gerader Linie (< 1°), sonst Corner. → **(b)**
2. Corner-Darstellung als **Würfel**. → ja
3. Shift bricht nur das gezogene Paar. → ja
4. **Zwei Schalter** pro Punkt (Kante / Fläche), unabhängig. → ja
5. Grundsatz „jeder sichtbare Handle wirkt“: Wippe weg, Cross Out = Gegenüber beim Nachbarn bzw. ausgeblendet. → ja
