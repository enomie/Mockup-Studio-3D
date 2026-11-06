# Plan: Alt+Move-Duplizieren – die Kopie wandert, das Original bleibt

Status: Entwurf, wartet auf Freigabe.

## Problem

Alt+Ziehen im Move-Modus (besonders bei Patches mit verschweißten Kanten): Das **Original** wandert,
das Duplikat bleibt zurück. Verschweißte Nachbarn werden mitgezogen/verformt – das alte Werk ist kaputt.

Soll laut `plan-clipboard-copy-paste.md` (Etappe 1, Punkt 5): **Kopie bewegt sich, Original bleibt stehen.**

## Ursache (Code)

`duplicateInPlaceForDrag` (`src/engine/mockup-engine.ts`) legt die Kopie an Ort und Stelle an und
**tauscht die Namen**, damit die zurückbleibende Kopie wie das Original heißt. Das Gizmo hängt aber
weiter am Original-Runtime-Objekt, also wandert das Original (mit seiner ID, seinen Schweißnähten
und Patch-Nodes). `copyEntities` (`src/scene/entity-copy.ts`) entfernt bei der Kopie `nodeId` und
Links zu Partnern außerhalb der Kopiermenge: Die zurückbleibende Kopie ist also unverschweißt,
das bewegte Original reißt die Naht auf.

## Zielverhalten

- Die Kopie ist **völlig eigenständig**: neue ID, eigene Punkte, **keine** Nodes, **keine** Edge-Links
  zu Nachbarn (außerhalb einer gemeinsam kopierten Auswahl; innerhalb bleiben Links untereinander
  erhalten und werden auf die neuen IDs umgebogen – so macht es `copyEntities` schon).
- Das Original bleibt an Position, Form und Schweißung **unverändert**.
- Der laufende Drag bewegt die **Kopie**. Auswahl und Gizmo gehen auf die Kopie.
- Ein Undo-Schritt für „duplizieren + verschieben“. Esc während des Drags entfernt die Kopie wieder.

## Umsetzung

1. `maybeDuplicateForAltDrag` / `duplicateForAltDrag`: Kopie **synchron** registrieren (Entity und
   Runtime-Root existieren sofort, Geometrie baut asynchron nach – siehe `asset-system.insertEntities`).
2. Namenstausch entfernen; die Kopie bekommt den abgeleiteten Namen („Ding 2“), das Original behält seinen.
3. Nach dem Anlegen: Selektion auf die Kopie setzen und das Gizmo **mitten im Drag** auf das
   Runtime-Objekt der Kopie umhängen (Drag-Startzustand auf Kopie umsetzen; bei Gruppen das
   `groupPivot` auf die Kopien umbauen). Prüfen, ob `TransformControls` das Umhängen im Drag verträgt;
   sonst Fallback: Drag beim ersten Pointer-Move mit Alt-Flag neu starten.
4. Patch-spezifisch: Kopie ohne `nodeId`/Partner-Links (bereits so); `reconcilePatchNodes` /
   `PatchNodeSync` dürfen die Kopie nicht wieder mit dem Original verschweißen.
5. Esc/Abbruch und History: Duplikat + Move als ein Eintrag.

## Tests

- Alt-Drag eines verschweißten Patches: Original-Transform, Punkte, `nodeId`s, `edgeLinks` und
  Nachbarpatches bleiben unverändert; die Kopie hat neue ID, keine Nodes/Links und die neue Position.
- Multiselect: alle Originale bleiben, alle Kopien wandern; Links innerhalb der Auswahl zeigen auf Kopien.
- Esc entfernt die Kopie; Undo nimmt Duplikat und Move in einem Schritt zurück.

## Offene Frage

Soll eine Kopie, die an einer fremden Kante losgelassen wird, automatisch verschweißen? Vorschlag:
**nein** – manuell über den bestehenden Weld-Weg (sauber getrennt, vorhersehbar).
