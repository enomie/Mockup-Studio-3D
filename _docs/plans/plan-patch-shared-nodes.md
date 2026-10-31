# Plan: Gemeinsame Punkte wirklich EINMAL – „Knoten“, die mehrere Patches benutzen

Status: **N1 erledigt** – N2 (Bedienung) offen
Ersetzt das bisherige Modell „jeder Patch hat eigene Punkte, Kopien werden synchron gehalten“ (Schritt A Link, C1/C2/C3, Coupled Pairs, Shared-Point-Plan). Die Flächen-Mathematik (Classic + Kanten-Korrektur D) bleibt.

---

## Was der Nutzer will

> Wenn man 2 Kanten (also 4 Punkte) zusammenlegt, nicht 4 Punkte, sondern nur 2. Es gibt keinen Punkt des anderen Patches, sondern einen GEMEINSAMEN Punkt, nur einen, an jeder Seite.

## Warum das bisherige Modell falsch ist

Heute besitzt jeder Patch seine eigenen Punkte; „verbinden“ hält zwei Kopien synchron. Dadurch existiert ein gemeinsamer Punkt zweimal (zwei Namen, zwei Zeilen, zwei Auswahlen, „Partner“-Handles). Mit mehr Synchronisation wird das nie *ein* Punkt.

---

## Neues Modell

### Knoten (gemeinsame Punkte)

- Ein **Knoten** ist ein Punkt, der **einmal** in der Szene gespeichert ist und von **mehreren Patches benutzt** wird.
- Ein Patch-Punkt ist entweder **eigen** (wie heute, gehört nur diesem Patch) oder ein **Verweis auf einen Knoten**.
- Eine **gemeinsame Kante** ist einfach: zwei aufeinanderfolgende Punkte, die in beiden Patches auf **dieselben Knoten** verweisen. Kein Link-Datensatz, keine Synchronisation mehr.

### Was ein Knoten enthält

- **Name**, **Position**.
- Seine **Handles** – jeder Handle genau einmal:
  - rosa Handles **entlang der gemeinsamen Kante** (von beiden Patches benutzt),
  - pro angeschlossenem Patch dessen **gelber** Handle und – an Kanten-Enden – dessen **rosa Handle der Nachbarkante**.
- **Paare**, die sich gegenüberliegen (gelb↔gelb, rosa Nachbarkante↔rosa Nachbarkante, an inneren Punkten rosa vorne↔hinten): je **gekoppelt** (Standard) oder durch **Shift** gelöst.

Der Nutzer sieht davon nur: **ein Punkt mit seinen Handles**. Welcher Handle intern zu welchem Patch gehört, ist nirgends sichtbar (keine Sonderfarben, keine Patch-Namen).

### Raum

Knoten liegen in **Weltkoordinaten** (sie gehören keinem Patch). Die Patches lesen ihre Knoten in ihren eigenen Raum um.

---

## Bedienung

**Zusammenlegen (heute „Link Edge“)**
- Kante kopieren, auf Kante des anderen Patches „Link“ → aus **4 Punkten werden 2 Knoten**.
- Position und Handles jedes Knotens = **Mittelwert** der beiden ursprünglichen Punkte; alle Paare **gegenüber und gekoppelt**.
- Richtung (welches Ende zu welchem) automatisch nach Nähe, wie heute.

**Punkt einfügen** auf einer gemeinsamen Kante → **ein** neuer Knoten, von beiden Patches benutzt (Kurve bleibt, Paare gegenüber).

**Punkt löschen** auf einer gemeinsamen Kante → der Knoten verschwindet aus beiden Patches.

**Anklicken**
- Ein Knoten wird angeklickt, egal welcher Patch gerade gewählt ist – **eine** Auswahl.
- Im Viewport: **ein** Anker mit **allen** Handles des Knotens, immer vollständig.
- Im Inspector: Abschnitt **„Shared Point“** mit Name, Position, **einer** Handle-Liste (neutral: Pink 1…, Yellow 1/2) und dem Knopf **„Align handles opposite“** (setzt gelöste Paare per Mittelwert zurück, ein Undo-Schritt).
- In der Punktliste jedes beteiligten Patches erscheint der Knoten mit **demselben** Namen; Auswahl dort wählt den Knoten.

**Shift + Ziehen** löst genau das Paar des gezogenen Handles.

**Trennen (Unlink)** → jeder Patch bekommt wieder einen **eigenen** Punkt (Kopie des Knotens an derselben Stelle); danach unabhängig.

**Patch löschen** → seine Verweise verschwinden; ein Knoten, den nur noch ein Patch benutzt, wird wieder ein eigener Punkt dieses Patches.

---

## Entscheidungen

- Frage 1 → **(b)**: Knoten wandern mit dem verschobenen Patch mit; der andere Patch verformt sich.
- Frage 2 → **ja**: Mirror-Kopien nehmen an Knoten nicht teil.

## Ursprüngliche Fragen

1. **Ganzen Patch verschieben/drehen** (nur einer gewählt): Bisher verformte sich der Partner mit. Im neuen Modell gibt es zwei saubere Möglichkeiten:
   - **(a) Knoten bleiben, wo sie sind** → die gemeinsame Kante bleibt stehen, der verschobene Patch verformt sich zu ihr hin (der andere Patch bleibt ganz unverändert).
   - **(b) Knoten wandern mit** → wie bisher: die gemeinsame Kante geht mit, der andere Patch verformt sich.
   Vorschlag: **(b)**, das entspricht dem bisherigen Verhalten.
2. **Mirror-Kopien** eines Patches nehmen an Knoten nicht teil (wie bisher) – ok?

---

## Umsetzung (Phasen)

**N1 – Datenmodell + Kern (ohne Bedienung)**
- Szenen-Liste `patchNodes` (im Entity-Registry), Patch-Punkt mit optionalem `nodeId` + Rollen der Handles.
- Auflösen: Patch-Punkte aus Knoten (Welt → Patch-Raum) für Flächenaufbau, Kanten-Korrektur, Gizmo.
- Undo/Redo: Knoten sind Teil des Verlaufs-Schnappschusses.
- Neu bauen aller Patches, die einen geänderten Knoten benutzen.
- Tests: Zusammenlegen 4 → 2, Mittelwert, Einfügen/Löschen, Trennen, Patch löschen, Knick < 0,1° (wie bisher gemessen).

**N2 – Bedienung**
- Zusammenlegen/Trennen, Einfügen/Löschen über Knoten.
- Auswahl eines Knotens (Viewport + Inspector), ein Anker mit allen Handles, Shift löst Paar, „Align handles opposite“.

**N3 – Aufräumen**
- Altes Link-/Sync-Modell entfernen (Edge-Links, Partner-Abgleich, Coupled-Pairs-Schalter, oranges Gegenüber). Bestehende Szenen werden nicht gespeichert → keine Umwandlung alter Daten nötig.

## Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Großer Umbau an Patch-Daten, Gizmo, Inspector | in Phasen, N1 rein getestet bevor UI angefasst wird |
| Undo muss Knoten mitnehmen | Knoten in den bestehenden Schnappschuss aufnehmen; Test „Zusammenlegen → Undo → Redo“ |
| Patch-Bewegung (Frage 1) | Verhalten festlegen und testen |

## Umsetzung N1

- `src/scene/patch-nodes.ts`: Knoten (Weltkoordinaten, Handles je einmal in „Slots“, Paare `across`/`line`, Nutzer = Patch-Punkte), `joinSharedEdge` (4 Punkte → 2 Knoten, Mittelwert, alles gegenüber + gekoppelt), `createInnerNode` (für eingefügte Punkte), `applyPointEditToNode` (Bearbeitung → Knoten, gekoppelte Paare drehen mit, Shift löst), `alignNodeOpposite`, `moveNodeWithPatch` (Entscheidung b), `removeNodeUse`, `resolvePatchPoints`, `reconcilePatchNodes` (Abgleich nach jeder Änderung).
- `PatchPoint.nodeId`: Punkt ist Sicht auf einen Knoten.
- Engine: Knoten im Entity-Registry, Undo/Redo-Schnappschuss enthält Knoten, `PatchNodeSync` gleicht nach jeder Änderung ab. Alte Kanten-Synchronisation überspringt Kanten, deren Enden Knoten sind.
- Tests: `patch-nodes.test.ts` (11) – 4 → 2, ein Name, gemeinsamer Kanten-Handle, Paare gegenüber, Bearbeiten über Patch A erreicht Patch B, Shift/Align, Verschieben nimmt Knoten mit, Patch löschen löst Knoten auf, Idempotenz; `patch-nodes-crease.test.ts` – Knick < 0,1° zwischen zwei unterschiedlich gedrehten Patches.
- Bedienung noch unverändert (N2): „Link“ im Panel erzeugt noch das alte Modell.
