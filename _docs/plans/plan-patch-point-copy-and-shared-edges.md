# Plan: Patch-Punkte & gemeinsame Kanten

Status:
- **Phase 1 (Punkt Copy/Paste): erledigt**
- **Schritt A (Kanten Copy/Paste + Link, nur Linie): erledigt** (inkl. Nachtrag Punkte auf verbundenen Kanten)
- Schritt B (neue Flächen-Mathematik) und C (Smooth/Corner): offen, eigener Plan vor Start

---

## Befund (Prüfung vor Phase 2)

Messung mit zwei Dreiecks-Patches, gemeinsame Kante, gelbe Handles exakt gegenüberliegend gekoppelt:

| Fall | Steigung Blau | Steigung Rot | Knick |
|---|---|---|---|
| symmetrisch | 29,6° | −29,6° | 0° |
| unterschiedliche Form/Größe | 29,6° | −18,9° | ≈ 10° |

- Die gelben Handles (`handleCrossIn`) steuern **nicht** die Neigung an der Kante, sondern eine Wölbung (`27·u·v·w`), die an der Kante ausläuft. Die Neigung an der Kante hängt zusätzlich von den anderen Kanten und der Patch-Größe ab.
- `handleCrossOut` fließt nicht in die Fläche ein.
- Ecken haben nur **einen** gelben Handle für beide angrenzenden Kanten.
- **Die Kanten-Kurven selbst sind exakt** (Coons-Rand): Punkte + pinke Handles bestimmen die Kante vollständig.

**Folgerung:** Eine gemeinsame *Linie* ist sicher machbar. Ein garantiert *fließender* Übergang ist mit der heutigen Flächen-Mathematik nicht möglich – dafür braucht es Schritt B.

---

## Phase 1 – Punkt kopieren / einfügen (erledigt)

Copy/Paste pro Punktzeile im Inspector + Ctrl/Cmd+C/V; Modi: Position & Handles / nur Position / nur Handles; Welt↔Lokal-Umrechnung.

---

## Schritt A – Kanten kopieren / einfügen / verbinden (nur Linie)

**Begriff Kante:** Segment zwischen zwei **benachbarten** Punkten einer Patch-Seite. Es werden nie Punkte gelöscht oder ergänzt.

**Was zu einer Kante gehört:** Position beider Endpunkte + die beiden pinken Handles, die ins Segment zeigen. Gelbe Handles gehören **nicht** dazu (bleiben je Patch frei).

**Bedienung**
- Patch-Panel, neue Sektion **„Edges“**: Liste aller Segmente („P1 – P2“, …). Pro Zeile: **Copy Edge**, **Paste Edge**, **Link Edge**; bei verbundenen Kanten: Partner-Anzeige („🔗 Patch 2 · P4 – P5“), **Flip**, **Unlink**.
- **Pick Edge** (Button): Klick auf eine Kante im Viewport wählt das Segment (gleiche Hover-Logik wie „Add Point“). Gewähltes Segment wird im Viewport hervorgehoben und in der Liste markiert.
- **Paste Edge:** einmalige Übernahme (Endpunkte + Segment-Handles).
- **Link Edge:** wie Paste + dauerhafte Kopplung. Die kopierte Kante gibt die Form vor.
- **Richtung:** automatisch nach Nähe der Endpunkte (Welt-Koordinaten); **Flip** dreht die Zuordnung (beim Link: die Seite, an der man Flip drückt, gibt vor).
- Beim Verschieben eines Endpunkts gehen seine übrigen Handles mit (wie beim normalen Verschieben).

**Datenmodell**
- `PatchParams.edgeLinks?: PatchEdgeLink[]`, in **beiden** Patches gespeichert:
  ```
  PatchEdgeLink { startPointId, endPointId, partnerEntityId, partnerStartPointId, partnerEndPointId }
  ```
  (`start ↔ partnerStart`, `end ↔ partnerEnd`).
- Keine zentrale Liste → Undo/Redo deckt Links automatisch ab (sie sind Teil der Patch-Daten).
- **Gültigkeit** wird beim Lesen geprüft: Partner existiert, beide Segmente sind (noch) benachbart. Ungültige Links (Partner gelöscht, Punkt eingefügt/entfernt) werden ignoriert und im Panel als „broken“ mit Unlink angezeigt – nichts geht kaputt.
- Punkt entfernen, der zu einem Link gehört → Link wird in diesem Patch entfernt.

**Synchronisation (Engine)**
- Ein Sync-Baustein beobachtet Patch-Änderungen (Parameter **und** Transform). Der geänderte Patch ist die Quelle; Partner werden in Welt-Koordinaten nachgezogen (inkl. Ketten über mehrere Patches, jeder Patch höchstens einmal pro Durchlauf).
- Schreibt nur, wenn sich Werte wirklich unterscheiden (> 1e-9) → kein Ping-Pong.
- Während Undo/Redo-Wiederherstellung inaktiv (Stand ist bereits konsistent).
- Verschieben eines Patches allein → Partner-Kante verformt sich mit (Entscheid 1a). Gemeinsames Verschieben kommt mit Mehrfachauswahl.
- Spiegelkopien (Mirror) nehmen nicht teil.

**Tests**
- Segmente auflisten, Segment-Handles je Laufrichtung.
- Paste mit Auto-Richtung und Flip, verdrehte/verschobene Patches.
- Propagation: Quelle → Partner exakt, idempotent, Ketten, ungültige Links ignoriert.
- Undo/Redo eines Link-Vorgangs = ein Schritt.

---

## Nachtrag zu Schritt A – Punkte auf verbundenen Kanten

Status: **erledigt**

**Problem (Praxistest):** Ein neuer Punkt auf einer verbundenen Kante teilt sie nur in *einem* Patch → der Link zeigt ins Leere („broken“).

**Grundsatz:** Ein Punkt auf einer verbundenen Kante gehört zu **beiden** Patches. Aus einer verbundenen Kante werden zwei verbundene Kanten.

### Punkt einfügen
- Patch A: Kante P1–P2 ist mit Q1–Q2 (Patch B) verbunden. Neuer Punkt P5 bei Kurvenparameter `s` (von P1 aus).
- B bekommt automatisch Q5 bei demselben Parameter von Q1 aus (Richtung aus der Link-Zuordnung, bei umgekehrter Laufrichtung `1 − s`). Da beide Kanten dieselbe Kurve sind und per de Casteljau geteilt wird, liegt Q5 exakt auf P5 und die Kurven bleiben unverändert.
- Links: `P1–P2 ↔ Q1–Q2` wird ersetzt durch `P1–P5 ↔ Q1–Q5` und `P5–P2 ↔ Q5–Q2` (in beiden Patches).
- Ein Undo-Schritt (beide Patches ändern sich in derselben Aktion).
- Gilt nur für **gültige** Links; bei ungültigem Link verhält sich Einfügen wie bisher.

### Punkt entfernen
| Fall | Verhalten |
|---|---|
| P5 liegt zwischen zwei gültigen Links zum **selben** Partner, beide zeigen dort auf denselben Partnerpunkt Q5 (kein Eckpunkt) | Q5 wird in B mit entfernt; die zwei Links werden zu einem (`P1–P2 ↔ Q1–Q2`). |
| sonst (P5 ist Endpunkt nur eines Links, oder Partnerpunkte passen nicht) | Link(s) an P5 werden gelöst (wie bisher), Partner bleibt unverändert. |

### Bereits kaputte Links
Keine automatische Reparatur (müsste raten). Lösung: Unlink, dann die Teilkanten neu verbinden.

### Umsetzung
- `scene/triangle-patch-point-edit.ts`: `insertPatchPointInSegment(params, aId, bId, s)` (Einfügen über Segment statt Kante/t); `insertPatchPoint` liefert zusätzlich Segment + tatsächlich verwendetes `s`.
- `scene/triangle-patch-edge-link.ts` (rein, testbar):
  - `splitLinkOnInsert(owner, insert, findEntity)` → neue Params für A und B oder `null`.
  - `mergeLinksOnRemove(owner, pointId, findEntity)` → neue Params für A und B oder `null`.
- Engine (`commitPatchAddPoint`) und Panel (Punkt entfernen) rufen diese Funktionen auf und schreiben beide Patches.

### Tests
- Einfügen auf verbundener Kante: Q5 entsteht, Lage = P5 (Welt), zwei gültige Links in beiden Richtungen, auch bei Flip/umgekehrter Laufrichtung.
- Entfernen des gemeinsamen Punkts: beide Punkte weg, ein gültiger Link.
- Entfernen eines Punkts mit nur einem Link: Link gelöst, Partner unverändert.

---

## Schritt B – Flächen-Mathematik mit echter Rand-Neigung (später, eigener Plan)

- Gelber Handle = tatsächliche Neigung der Fläche an der Kante (Coons/Gregory mit Hermite-Querableitungen).
- Ecken bekommen eigene gelbe Handles pro angrenzender Kante.
- Als **Option pro Patch** („Surface: Classic / Tangent“), alte Patches unverändert.
- Nachweis per Messung: Knick an gekoppelter Kante = 0° auch bei ungleichen Patches.

## Schritt C – Smooth / Corner (nach B)

- Gemeinsamer Punkt: gelbe Handles beider Patches als Paar; Standard Smooth (gegenüber, Längen frei), **Corner** per Modifier-Taste beim Ziehen (nicht Alt; freie Taste wird in B/C festgelegt) oder Toggle im Inspector.
- Optional dasselbe für pinke Handles innerhalb eines Patches.
