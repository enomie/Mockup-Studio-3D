# Plan: Handle-Länge von 0 wieder aufziehen

## Problem
Im Handle-Panel (`src/ui/panels/entity-fields/TrianglePatchFields.tsx`) skaliert das Feld **Length** den Vektor Handle − Anchor mit `neu / alt`. Bei Länge 0 gibt es keinen Vektor und damit keine Richtung mehr. Die Guard `handleLen > 0.0001` verwirft deshalb jede Eingabe, und das Feld springt auf 0 zurück.

## Ziel
Wenn eine Länge > 0 auf ein Handle mit Länge ≈ 0 eingegeben wird, entsteht ein Handle mit genau dieser Länge in einer sinnvollen Richtung.

## Lösung: Länge setzen statt skalieren, mit Richtungs-Fallback-Kette
Neu: `setHandleLength(target, length)`. Die Funktion bestimmt eine Einheitsrichtung `dir` und setzt `handle = anchor + dir * length`.

Reihenfolge, nach der `dir` bestimmt wird:
1. **Aktueller Vektor**, falls Länge > EPS (wie bisher).
2. **Gemerkte letzte Richtung** (Option 1): ein `useRef<Map<string, Vec3>>` im Panel, Key = `nodeId + target` (inkl. Extra-Slots). Die Richtung wird bei jedem Render bzw. Commit aktualisiert, solange die Länge > EPS ist. Nur Session-/UI-Zustand, nichts kommt ins Dokument.
3. **Hergeleitete Richtung** (Option 2), für frisch geladene Patches ohne gemerkte Richtung:
   a. Gegenüberliegendes Handle (Next ↔ Prev, CrossIn ↔ CrossOut), **gespiegelt**, falls dessen Länge > EPS.
   b. Sonst die Kantenrichtung zum Nachbar-Node in Handle-Richtung (Next → nächster Node, Prev → vorheriger, Cross analog).
4. Letzter Notnagel: keine Richtung ermittelbar (isolierter Node) → Eingabe wird ignoriert, wie heute.

Eingabe 0 setzt weiterhin auf den Anchor. Vorher wird die Richtung gemerkt (Schritt 2 deckt das ab, weil die Richtung vor dem Commit gespeichert wird).

## Betroffene Stellen
- `TrianglePatchFields.tsx`: `scaleHandleLength` wird durch `setHandleLength` ersetzt. Extras (`writeExtra`) und Standard-Handles laufen über denselben Weg. `sharedPink` bleibt unverändert (hat keine Länge).
- Die Richtungs-Herleitung (3a/3b) kommt als reine Funktion in ein Utility-Modul neben den bestehenden Patch-Helpern, damit sie testbar ist.

## Tests
- Unit-Tests der Herleitung: gespiegeltes Gegen-Handle, Kanten-Fallback, isolierter Node → `null`.
- Panel-/Logik-Test: Länge 0 → 0.2 stellt die vorherige Richtung wieder her; frisch geladener Node mit Länge 0 nutzt den Fallback.
- Vor dem Push: `npx vitest run`, `npm run lint`, `npm run build`.

## Offene Fragen
- Soll die gemerkte Richtung Undo/Redo überleben? Vorschlag: ja, weil sie im Ref liegt und nicht an die History gebunden ist.
