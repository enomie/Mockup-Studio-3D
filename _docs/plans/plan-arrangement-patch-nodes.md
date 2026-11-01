# Plan: Gemeinsame Patch-Punkte in Arrangements

Status: **Entwurf – wartet auf Freigabe**

## Problem

User-Arrangements speichern nur die Entities. Gemeinsame Patch-Punkte (`PatchNode`, verbundene Kanten zwischen Triangle-/Quad-Patches) liegen szenenweit in `registry.patchNodes` und gehen beim Speichern verloren. Nach dem Laden zeigen die Punkte (`PatchPoint.nodeId`) auf Nodes, die es nicht gibt, und die Kanten sind nicht mehr verbunden.

## Lösung

1. **Speichern:** `ArrangementContent` vom Typ `entities` bekommt zusätzlich `patchNodes: PatchNode[]`. Gespeichert werden alle Nodes, deren `uses` nur gespeicherte Entities betreffen. Das ist immer der Fall, weil die ganze Szene gespeichert wird.
2. **Laden (neue IDs):** Eine reine Funktion `remapArrangementIds(entities, nodes)` in `src/scene/arrangement-remap.ts`:
   - vergibt jeder Entity eine neue ID und jedem Node eine neue ID
   - ersetzt `node.uses[].entityId` und `PatchPoint.nodeId` durch die neuen IDs
   - entfernt `nodeId` von Punkten, deren Node fehlt (alte Speicherstände). Der Punkt wird damit zu einem normalen Punkt mit seiner zuletzt gespeicherten Position, es geht nichts kaputt.
3. **Engine:** `replaceWithEntities(entities, nodes)` setzt die Patch-Nodes und die Entities zusammen. Das Undo enthält die Nodes bereits (der History-Snapshot hat `nodes`), es bleibt also ein Schritt.
4. **Duplicate eines User-Arrangements** kopiert die Nodes mit.
5. **Persistenz:** Arrangements stecken schon im Snapshot. Das Feld ist optional, alte Datensätze bleiben also gültig (kein `schemaVersion`-Sprung).

## Tests

- Remap: zwei Patches mit einer gemeinsamen Kante → nach dem Remap sind alle IDs neu, `uses` und `nodeId` passen zusammen, und es zeigt keine Referenz mehr auf eine alte ID.
- Fehlender Node → `nodeId` wird entfernt.
- Zweimal dasselbe Arrangement laden → keine ID-Kollision.
- Browser: zwei Patches verbinden, „Add new“, anderes Arrangement laden, wieder zurück → Kante ist weiter verbunden; Undo stellt alles wieder her.
