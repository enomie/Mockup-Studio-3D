# Plan: Gemeinsamer Punkt = EIN Punkt

Status: **Entwurf – wartet auf Freigabe**
Ersetzt die Bedienung aus `plan-patch-coupled-pairs.md` (Schalter „Yellow pair / Pink pair: Coupled / Free“). Mathematik (Kopplung C1, Kanten-Korrektur D, Mittelwert) bleibt.

---

## Was der Nutzer will

> Gemeinsame Punkte sollen nur EIN Punkt sein, und bei dem will ich sagen, ob sich die Handles gegenüberliegen, oder ich sie mit Shift unabhängig mache.

Heute existiert ein gemeinsamer Punkt zweimal (je Patch, eigener Name, eigene Schalter); je nach angeklicktem Patch sieht man nur „seine Hälfte“.

---

## Verhalten

**Ein gemeinsamer Punkt** (Punkt auf einer gekoppelten Kante: Endpunkte und eingefügte Punkte) ist für den Nutzer **eine Sache**:

- **Gleiche Anzeige, egal von welchem Patch aus angeklickt.** Alle Handles des Punkts sind sichtbar und ziehbar:
  - rosa **entlang** der gemeinsamen Kante (gehören beiden Patches),
  - **quer** zur Kante: gelb von Patch A und gelb von Patch B,
  - an **Endpunkten** zusätzlich: rosa der Nachbarkante von A und rosa der Nachbarkante von B.
- **Sichtbar auch, wenn nur einer der beiden Patches ausgewählt ist** (Entscheidung 2) – nie nur „die Hälfte“.
- **Grundzustand: gegenüber.** Ziehst du einen Handle, dreht sein Gegenüber mit (Längen frei):
  - gelb A ↔ gelb B,
  - an Endpunkten: rosa Nachbarkante A ↔ rosa Nachbarkante B,
  - an eingefügten Punkten: rosa vorne ↔ rosa hinten.
- **Shift + Ziehen** macht genau diesen Handle unabhängig von seinem Gegenüber.
- **Ein Knopf am Punkt: „Handles gegenüber“** (in der App: *Align handles opposite*) – stellt **alle** gelösten Paare dieses Punkts per **Mittelwert** wieder gegenüber und koppelt sie (Entscheidung 1).
- **Keine Schalter** mehr (kein „Yellow pair / Pink pair / Coupled / Free“). Der Zustand ergibt sich aus Ziehen, Shift und dem Knopf.
- Ankerposition verschieben: bewegt den Punkt (beide Patches) – wie heute.
- Standard beim Koppeln von Kanten und beim Einfügen eines Punkts: alles gegenüber (Mittelwert) – wie heute.

---

## Bedienung im Detail

**Inspector**
- Punktliste: ein gemeinsamer Punkt erscheint **einmal mit einem Namen** (kein „⇄ Patch 2“, kein Hinweis auf einen zweiten Patch).
- Wird er gewählt (egal von wo), zeigt der Detailbereich **eine** Handle-Liste des Punkts, neutral benannt – z. B.:
  - Anchor Point
  - Pink 1, Pink 2 (entlang der Kante)
  - Yellow 1, Yellow 2 (das gegenüberliegende Paar quer zur Kante)
  - an Endpunkten zusätzlich Pink 3, Pink 4 (das gegenüberliegende Paar der Nachbarkanten)
- Darunter ein Hinweis, ob alles gegenüber ist („All handles opposite“) oder welche Handles gelöst sind, und der Knopf **„Align handles opposite“** (nur aktiv, wenn etwas gelöst ist).
- X/Y/Z bzw. Length jedes Handles direkt änderbar – welcher Patch intern betroffen ist, sieht man nicht.

**Viewport**
- **Ein Anker** für den gemeinsamen Punkt, mit allen Handles beider Patches drumherum.
- **Alle Handles in den normalen Farben** (rosa = rosa, gelb = gelb). Keine Sonderfarbe, kein „Partner“ – das heutige orange Gegenüber wird ein normaler gelber Handle.
- Gekoppeltes Paar: Linie durchgehend durch den Anker; gelöstes Paar: zwei getrennte Linien.

---

## Umsetzung

1. **Auswahl vereinheitlichen:** Die Auswahl eines Handles kennt zusätzlich den Patch, zu dem der Handle gehört (heute nur der aktive Patch). Klick auf einen Partner-Handle bleibt im aktiven Patch, bearbeitet aber den Partner.
2. **Gizmo:** Für gemeinsame Punkte zusätzlich die Partner-Handles (gelb, Nachbarkanten-Rosa) einblenden und ziehbar machen; Partner-Anker nicht doppelt zeichnen. Kopplung beim Ziehen: Gegenüber dreht mit (vorhandene Regeln), Shift löst das gezogene Paar (vorhanden).
3. **Inspector:** Punktliste mit „⇄ Partner“; Detailbereich mit vereinter Handle-Liste und dem einen Knopf; die Paar-Schalter entfallen.
4. **Knopf „Align handles opposite“:** ruft für den Punkt beide vorhandenen Mittelwert-Funktionen (gelb, rosa) auf – ein Undo-Schritt.
5. **Daten:** unverändert (`joint`, `pinkPair` je Patch-Punkt, vom Sync gleich gehalten). Kein Datenumbau, keine Migration.

## Tests

- Partner-Handle über den aktiven Patch ziehen → Partner-Patch geändert, Gegenüber dreht mit.
- Shift am Partner-Handle → nur dieses Paar gelöst (beide Patches).
- „Align handles opposite“ → alle gelösten Paare des Punkts gegenüber, ein Undo-Schritt.
- Gleicher gemeinsamer Punkt von Patch A und Patch B aus gewählt → gleiche Handle-Liste, gleiche Werte.
- Bestehende Kopplungs-/Korrektur-Tests bleiben grün (Knick < 0,1°).

## Grundsatz (Nutzer)

> Es gibt keinen „Partner“. Ein gemeinsamer Punkt ist ein Punkt mit seinen Handles. Dass intern zwei Patches dahinterstehen, ist in der Bedienung nirgends sichtbar (keine Sonderfarben, keine Patch-Namen an Handles).

## Entscheidungen

1. Ein Knopf, der **alle** gelösten Handles am Punkt zurücksetzt. → ja
2. Alle Handles des Punkts immer sichtbar, auch wenn nur einer der Patches gewählt ist. → ja
3. Keine Sonderfarbe, keine Patch-Namen an Handles – kein „Partner“ in der Bedienung. → ja
