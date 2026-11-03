# Plan: Rahmen-Auswahl (Marquee) im 2D-Editor

Status: Entwurf – wartet auf Freigabe. Nur 2D-Profil-Editor; 3D bewusst nicht.

## Ziel
Mit der Maus ein Rechteck aufziehen und alle Punkte darin auswählen – schneller als
viele Shift-Klicks, z. B. für einen Flaschenhals oder ein Gewinde. Danach greifen die
bestehenden Werkzeuge: gemeinsam ziehen, Pfeiltasten, Dreh-/Skalier-Box, Entf.

## Bedienung (nur Werkzeug „Select“, V)
| Aktion | Wirkung |
|---|---|
| Linke Maus im Leeren ziehen | Rahmen aufziehen; beim Loslassen = genau die Punkte im Rahmen |
| Shift + ziehen | Punkte im Rahmen zur bestehenden Auswahl **hinzufügen** |
| Alt + ziehen (optional) | Punkte im Rahmen aus der Auswahl **entfernen** |
| Klick ins Leere ohne Ziehen | Auswahl leeren (wie heute) |
| Leertaste + ziehen / mittlere Maustaste | Ansicht verschieben (wie heute) |

**Änderung gegenüber heute:** Linksziehen im Leeren verschiebt aktuell die Ansicht.
Das entfällt im Select-Werkzeug; Pan bleibt über Leertaste und mittlere Maustaste.
Pen und Schere bleiben unverändert (dort pannt Linksziehen im Leeren weiter).

## Regeln
- Erfasst werden nur **Knoten** (keine Bezier-Griffe) auf **sichtbaren** Pfaden.
- Ein Punkt zählt, wenn seine Position im Rahmen liegt (kein „berühren reicht").
- Rahmen beginnt erst nach kleiner Mindestbewegung (bestehendes `CLICK_SLOP_PX`),
  sonst ist es ein Klick.
- Aktiver Punkt (Inspector) = zuletzt erfasster Punkt in Pfad-/Index-Reihenfolge;
  bei Shift bleibt der bisher aktive Punkt aktiv, falls vorhanden.
- Leerer Rahmen ohne Shift → Auswahl leeren.
- Rahmen wird live gezeichnet (gestrichelt, halbtransparente Füllung, Akzentfarbe);
  Punkte im Rahmen werden schon während des Ziehens hervorgehoben.
- Kein eigener Undo-Schritt (Auswahl ist nicht Teil der Historie).

## Umsetzung
1. **Reine Funktion** `nodesInRect(paths, hiddenIds, rect): PathPoint[]` in
   `src/scene/profile-node-group.ts` + `mergeSelection(current, hits, mode)` für
   ersetzen / hinzufügen / entfernen – mit Vitest-Tests.
2. **Drag-Typ** `{ kind: 'marquee'; start; current; mode }` in `ProfileEditor.tsx`;
   im Select-Werkzeug ersetzt er `startPan(true)` bei Linksklick ins Leere.
3. **Pointer-Up:** Treffer berechnen → `selectProfileNodes` (bestehend) bzw.
   Merge; kein Ziehen → `selectProfileNode(null)` wie heute.
4. **Darstellung:** `<rect class="profile-editor__marquee">` + CSS.
5. **Shortcuts-Liste** und Hinweistext ergänzen („Drag empty area: Box select“).
6. Tests, Lint, Build → Commit + Push auf `main`.

## Offene Fragen
- Alt + ziehen zum Entfernen mit rein, oder erst mal nur Ersetzen + Shift-Hinzufügen?
  (Alt schaltet beim Punkt-Ziehen heute das Einrasten ab – beim Rahmen gäbe es keinen Konflikt.)
