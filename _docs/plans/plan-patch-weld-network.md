# Plan: Patch-Schweißnetz (beliebig viele Kanten, Ecken und T-Stöße)

## Problem

Beispiel Auto: Fenster an Dach verschweißt, danach Fenster an Tür → die Dachnaht bricht auf.

Ursache im Code:

1. `pastePatchEdge` (`src/ui/store/patch-edge-store.ts`) ruft zuerst `applyEdgeShape` auf und
   verschiebt damit die Zielpunkte – auch den Eckpunkt, der schon ein Node (Dachnaht) ist.
2. `joinSharedEdge` (`src/scene/patch-nodes.ts`) bricht ab, sobald ein Endpunkt schon ein Node
   ist (`ap.nodeId || bp.nodeId → null`). Ergebnis: Ecke verschoben, Tür nicht verschweißt.
3. `createEndNode` baut Nodes fest für **zwei** Nutzer („alle Handles gegenüber“). Ecken mit
   3+ Patches und T-Stöße (3+ Patches an einer Kante) sind nicht abbildbar.
4. `PatchEdgeLink` ist ein gespiegeltes Paar (je ein Eintrag in beiden Patches) – nur 1:1.

## Ziel

So viel koppeln wie möglich, ohne dass bestehende Nähte aufgehen:

- Beliebig viele Patches an einem **Node** (Ecke).
- Beliebig viele Patches an einer **Kante** (T-Stoß, z. B. Trennwand an einer Fläche).
- Schweißen verschiebt nie etwas, das schon verschweißt ist.
- Unlink/Löschen löst nur genau die betroffene Verbindung.

## Neues Datenmodell

### Node (erweitert, bleibt in `patch-nodes.ts`)

Der bestehende `PatchNode` hat schon `uses[]`, Handle-Slots und `pairs` – das wird verallgemeinert:

- `uses: PatchNodeUse[]` – beliebig viele (Patch, Punkt).
- Slots pro **Kantenrichtung** statt pro Nutzer: jede am Node ankommende geteilte Kante hat
  genau einen Slot (Tangente entlang der Kante). Alle Patches, die diese Kante benutzen, lesen
  denselben Slot → die Kante ist automatisch deckungsgleich.
- `pairs` bleiben für Glätte: zwei Slots, die durch den Node durchlaufen („line“, gekoppelt =
  glattes Gelenk), oder Querhandles („across“). An Sternpunkten (3+ Kantenrichtungen) wird nur
  gekoppelt, was der Nutzer als durchlaufend markiert (Default: geradeste Fortsetzung).

### Shared Edge (neu)

```ts
interface PatchSharedEdge {
  id: string;
  startNodeId: string;
  endNodeId: string;
  /** Slot ids der beiden Tangenten-Handles (liegen in den Nodes). */
  startSlot: string;
  endSlot: string;
  /** Alle Patches, die diese Kante als Randsegment benutzen (2 = Naht, 3+ = T-Stoß). */
  uses: { entityId: string; startPointId: string; endPointId: string }[];
}
```

- Ersetzt `PatchEdgeLink` als Quelle der Wahrheit. Gespeichert wie die Nodes (Szene-Ebene,
  Persistenz/Snapshot/History/Arrangement-Remap).
- `patchParams.edgeLinks` fällt weg; die Flächenkorrektur bekommt eine abgeleitete Ansicht
  „Segment → Nachbarpatches“ (Helper `edgeNeighborsOf(entityId)`).

## Schweiß-Algorithmus (neu, `joinSharedEdge` → `weldEdge`)

Eingabe: Quellseite (Patch + Segment), Zielseite (Patch + Segment), Richtung wie bisher.

1. **Endpunkte zusammenführen**, pro Ende:
   - keiner ist Node → neuer Node (Mittelwert wie bisher).
   - einer ist Node → anderer Punkt tritt dem Node bei, **Node-Position gewinnt**.
   - beide sind Nodes (verschiedene) → Nodes verschmelzen (Position: der mit mehr Nutzern
     gewinnt; bei Gleichstand Quelle). Uses, Slots, Pairs werden zusammengeführt.
   - beide im selben Node → nichts zu tun.
2. **Kante finden/erzeugen**: gibt es schon eine Shared Edge zwischen den beiden Nodes mit
   passender Form, tritt das Segment ihr bei (→ T-Stoß). Sonst neue Shared Edge; die Form
   kommt von der Seite, die schon verschweißt ist, sonst von der Quelle.
3. Nur **freie** Punkte/Handles werden bewegt. `applyEdgeShape` läuft nicht mehr vor dem
   Join auf Node-Punkten.
4. Einmal eine History-Transaktion für alles.

Damit entfällt auch `detachPartners` vor dem Join.

## Lösen / Bearbeiten

- **Unlink einer Kante für einen Patch**: Patch verlässt die Shared Edge. Bleiben ≥2 Nutzer,
  lebt sie weiter (T-Stoß → Naht). Bei 1 Nutzer wird sie aufgelöst. Endpunkte lösen sich für
  diesen Patch nur, wenn er dort keine andere geteilte Kante mehr hat.
- **Punkt einfügen** in eine Shared Edge (`splitLinkOnInsert` verallgemeinert): alle Nutzer
  werden am selben Parameter geteilt, neuer Node in der Mitte, zwei Shared Edges.
- **Punkt löschen**: nur erlaubt/automatisch für alle Nutzer, wenn es ein Kanten-Innenpunkt
  ist; sonst Patch verlässt den Node.
- **Gizmo**: Ziehen an einem Node-Punkt bewegt den Node (alle Patches), wie heute.

## Flächenkorrektur (`src/engine/patch-edge-correction.ts`)

- Arbeitet weiter pro Segment, holt die Querhandles aber über die Shared Edge.
- **Naht (2 Nutzer)**: wie heute, glatter Übergang.
- **T-Stoß (3+)**: Glätte nur zwischen dem Paar, das der Nutzer als durchlaufend markiert
  (Default: die zwei Patches mit dem kleinsten Knick). Die übrigen hängen positionsgleich,
  aber ohne Tangentenzwang (Knick ist bei T-Stößen gewollt).

## UI (`PatchEdgesSection.tsx`)

- Status pro Segment: „frei“, „Naht mit X“, „T-Stoß mit X, Y“.
- Link-Button bleibt; funktioniert jetzt auch auf schon verschweißten Ecken/Kanten.
- Bei 3+ Nutzern: Auswahl, welcher Partner glatt anschließt.
- Unlink löst nur diesen Patch.

## Migration

Alte Szenen mit `edgeLinks`-Paaren + 2er-Nodes werden beim Laden automatisch umgebaut
(`project-persistence.ts`): jedes gültige Paar → Shared Edge, Nodes → neues Slot-Schema.
Kaputte Links werden verworfen. Tests mit einem alten Snapshot als Fixture.

## Schritte

1. Datenmodell + reine Funktionen in `src/scene/` (Node-Merge, `weldEdge`, Unlink, Split) mit
   Vitest – inkl. Fall „Fenster/Dach/Tür“ und T-Stoß.
2. Persistenz, Snapshot, History, Arrangement-Remap, Migration.
3. Store/UI auf `weldEdge` umstellen, `edgeLinks` entfernen.
4. Flächenkorrektur auf Shared Edges + T-Stoß-Regel.
5. Gizmo/Linked-Edit nachziehen, manuell im Browser testen.

Vor jedem Push: `npx vitest run`, `npm run lint`, `npm run build`.

## Risiken

- Größerer Umbau quer durch Scene/Engine/UI – in Schritten committen, jeder grün.
- Sternpunkt-Glätte (welche Kanten laufen durch) ist heuristisch → manuell überschreibbar.

## Umsetzung (Stand 2026-11-03)

Umgesetzt wurde zuerst der Kern ohne neues Szenen-Objekt `PatchSharedEdge`: Das bestehende
Modell (`PatchNode.uses[]` + `edgeLinks` pro Patch) trägt bereits N Nutzer, wenn der Join
nicht mehr abbricht. Dadurch keine Migration nötig, alte Szenen laden unverändert.

- `joinSharedEdge` (`src/scene/patch-nodes.ts`) schweißt in vorhandene Nodes ein:
  freier Punkt tritt dem Node bei, zwei Nodes verschmelzen (`mergeNodes`, mehr Nutzer
  gewinnt Position). Die in die Kante laufenden Handles werden ein Slot, Richtung von der
  schon verschweißten Seite → bestehende Nähte bewegen sich nicht.
- `PatchNode.mergedIds`: Punkte, die noch die alte Node-Id tragen, zählen weiter als
  Nutzer (`isNodeIdOf`) und lesen beim nächsten Abgleich die neue Id.
- Paste/Link löst keine vorhandenen Links mehr (`detachPartners` entfernt) → T-Stoß =
  mehrere Links auf einem Segment.
- Unlink löst genau einen Link; geteilte Endpunkte bleiben, solange ein Patch dort noch
  eine andere gekoppelte Kante hat.
- Flächenkorrektur zählt gekoppelte Segmente statt Links (T-Stoß ≠ Sternpunkt).
- Panel zeigt alle Partner einer Kante, Unlink pro Partner.
- Tests: Fenster/Dach/Tür, T-Stoß, Node-Merge (`src/scene/patch-nodes.test.ts`).

Nachgezogen (zweiter Schritt):
- Punkt einfügen auf einer T-Stoß-Kante teilt alle Partner (`splitLinkOnInsert` liefert
  `partners[]`); auf verschweißten Kanten wird der neue Punkt ein Node aller Patches
  (`addInnerNodeUse`).
- Neue Nutzer eines bestehenden Nodes werden quer zur neuen Naht gekoppelt (glatt); nur
  die neu dazukommende Seite dreht sich. Paare haben jetzt eine eigene Achse (`axis`), damit
  Ecken mit mehreren Kanten richtig ausgerichtet werden.
- T-Stoß: die erste Naht bleibt glatt; im Edges-Panel kann pro Partner gewählt werden,
  welche Naht glatt ist (`setSmoothSeam`, Spline-Button). Die anderen behalten ihre
  Position und dürfen knicken.
