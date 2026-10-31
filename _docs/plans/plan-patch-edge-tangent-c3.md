# Plan: Schritt C3 – Smooth / Corner für die pinken Handles innerhalb eines Patches

Status: **Abgestimmt – wartet auf Start**
Vorgänger: `plan-patch-smooth-corner.md` (C1/C2: Gelenke zwischen verbundenen Patches)

---

## Ziel

Ein **Kantenpunkt** (Punkt auf einer Patch-Kante, keine Ecke) hat zwei pinke Handles: einen nach vorne, einen nach hinten entlang der Kante. Heute sind sie unabhängig → die Kante kann an diesem Punkt unbeabsichtigt knicken.

Wie in Illustrator:
- **Smooth:** beide pinken Handles liegen auf einer Linie, gegenüber. Ziehst/drehst du einen, dreht der andere mit. **Längen bleiben frei.** → Kante läuft glatt durch den Punkt.
- **Corner:** beide unabhängig → bewusster Knick in der Kante.

## Wo es gilt – und wo nicht

| Punkt | C3 gilt? | Warum |
|---|---|---|
| Kantenpunkt | **ja** | beide pinken Handles gehören zur selben Kante |
| Ecke | **nein** | die zwei pinken Handles gehören zu zwei verschiedenen Kanten; eine Ecke ist eine Ecke (sonst würde der Patch dort flachgedrückt) |

## Abgrenzung zu C2 (Gelenk mit dem Partner-Patch)

Zwei getrennte Einstellungen, die sich nicht in die Quere kommen:

| Einstellung | betrifft | an Kantenpunkten | an Ecken |
|---|---|---|---|
| **Joint** (C2) | Übergang zum **anderen Patch** | gelber Handle | pinker Handle der Nachbarkante |
| **Edge Tangent** (C3, neu) | Verlauf der **eigenen Kante** | beide pinken Handles | – |

**Shift + Ziehen** bricht genau das auf, was zum gezogenen Handle gehört:
- gelber Handle an einem Kantenpunkt → Joint wird Corner (wie heute),
- pinker Handle an einem Kantenpunkt → Edge Tangent wird Corner (neu),
- pinker Handle der Nachbarkante an einer Ecke → Joint wird Corner (wie heute).

*(Änderung gegenüber C2: Heute bricht Shift den Joint bei jedem Handle. Das wird präzisiert.)*

## Regel

- Ziehen/Ändern von `handleNext` → `handlePrev` wird auf die Gegenrichtung gedreht, Länge von `handlePrev` bleibt (und umgekehrt).
- Gilt überall, wo Handles geändert werden: Viewport-Gizmo, Inspector-Felder (X/Y/Z, Length), Punkt-Paste.
- Rotation des ganzen Punkts (Rot X/Y/Z) und Verschieben des Ankers ändern die Kolinearität nicht → nichts zu tun.
- **Verbundene Kanten:** Die pinken Handles eines gemeinsamen Kantenpunkts werden ohnehin auf den Partner übertragen (Schritt A); der Edge-Tangent-Zustand wird ebenfalls übertragen (wie der Joint).

## Datenmodell

- `PatchPoint.edgeTangent?: 'smooth' | 'corner'` – nur an Kantenpunkten relevant.
- Undo/Redo automatisch (Teil der Patch-Daten).

## Bedienung

- **Inspector**, Detailbereich des gewählten Punkts (nur Kantenpunkte): Toggle **Edge Tangent: Smooth / Corner**. Beim Wechsel auf Smooth gibt der aktuell gewählte pinke Handle die Richtung vor (sonst „Forward“), der andere springt gegenüber und behält seine Länge.
- **Shift + Ziehen** am pinken Handle → Corner.
- **Viewport:** Smooth → pinke Handles wie heute (Rauten); Corner → pinke Handles als **kleine Würfel** (passend zum Corner-Würfel bei Gelenken).

## Standardwerte

- **Neu eingefügte Kantenpunkte:** Smooth (die Teilung per de Casteljau liefert ohnehin gegenüberliegende Handles → keine sichtbare Änderung).
- **Bestehende Kantenpunkte:** siehe offene Frage 1.

## Tests

1. Smooth: `handleNext` ändern → `handlePrev` exakt gegenüber, Länge unverändert (und umgekehrt), über Gizmo-Logik und Inspector-Logik.
2. Corner: Handles unabhängig.
3. Ecken: Regel greift nie.
4. Neu eingefügter Punkt: Smooth, Kante unverändert.
5. Shift: pinker Handle → nur Edge Tangent wird Corner; gelber Handle → nur Joint wird Corner.
6. Verbundene Kante: Zustand und Handles landen beim Partner; idempotent.
7. Undo = ein Schritt.

## Umsetzungsschritte

- **C3a – Regel + Daten + Tests** (gemeinsamer Helfer für Gizmo und Inspector, Übertragung an Partner, Shift-Präzisierung).
- **C3b – Bedienung:** Toggle im Inspector, Würfel-Handles im Viewport.

## Entscheidungen

1. Bestehende Kantenpunkte: **(b)** automatisch Smooth, wenn die pinken Handles schon (fast) auf einer Linie liegen (< 1°), sonst Corner.
2. Corner-Darstellung der pinken Handles als **Würfel**. → ja
3. Shift bricht nur, was zum gezogenen Handle gehört. → ja

## Offen

- Gelbe Handles: Die beiden gelben Handles eines Punkts (`handleCrossIn` / `handleCrossOut`) sind heute fest gegenüber gekoppelt („Wippe“, schon vor C vorhanden). `handleCrossOut` hat keine Wirkung auf die Fläche. Wie damit umgehen → mit dem Nutzer klären.
