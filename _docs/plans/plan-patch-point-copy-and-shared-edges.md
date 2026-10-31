# Plan: Punkt-Copy/Paste, Kanten-Copy/Paste & gemeinsame Kanten (Patches)

Status: **Entwurf – wartet auf Freigabe**
Betrifft: Triangle-/Quad-Patches (`asset-triangle-patch`)

---

## Ziel

1. **A – Punkt kopieren/einfügen:** Position + Handles eines Punkts auf einen Punkt eines anderen (oder desselben) Patches übertragen.
2. **B – Kante kopieren/einfügen bzw. verbinden:** Eine Kante (Segment zwischen zwei benachbarten Punkten) auf eine Kante eines anderen Patches übertragen – einmalig oder dauerhaft gekoppelt.
3. **Smooth/Corner wie in Illustrator:** An gemeinsamen Punkten bilden die gelben Cross-Handles beider Patches ein Handle-Paar. Standard = gegenüberliegend gekoppelt (fließender Übergang), Alt-Ziehen bricht die Kopplung (Knick).

---

## Begriffe

- **Punkt:** `PatchPoint` – Anker `pos` + 4 Handles: pink `handleNext`/`handlePrev` (entlang der Kante), gelb `handleCrossIn`/`handleCrossOut` (quer zur Kante).
- **Kante:** immer das **Segment zwischen zwei benachbarten Punkten** einer Patch-Seite (entspricht `PatchEdgeSegment` / `locatePatchEdgeSegment`). Nicht die ganze Seite. Es werden nie Punkte gelöscht oder ergänzt.
- **Smooth-Paar:** zwei Handles, die durch denselben Anker in entgegengesetzte Richtung zeigen. Richtung gekoppelt, Länge je Seite frei.
- **Corner:** Paar aufgebrochen, beide Handles unabhängig.

---

## A) Punkt kopieren / einfügen

**Verhalten**
- Copy speichert in einer app-internen Zwischenablage (nicht System-Clipboard): `pos` + alle 4 Handles, Handles **relativ zum Anker** (Offset), damit sie nach dem Einfügen identisch aussehen.
- Paste setzt beim Zielpunkt `pos` und Handles (Anker + Offsets). Einmalige Übernahme, keine Kopplung.
- Paste-Varianten (Dropdown am Paste-Button): *Alles* (Standard), *Nur Position*, *Nur Handles*.
- Patch-Transformation (Position/Rotation/Skalierung der Entity) wird berücksichtigt: intern in Weltkoordinaten kopieren, beim Einfügen in Lokalkoordinaten des Ziel-Patches umrechnen.
- Ein Undo-Schritt pro Paste.

**UI**
- Point & Handle Inspector: pro Punktzeile Icon-Buttons **Copy** / **Paste** (neben „Remove“). Paste nur aktiv, wenn etwas kopiert ist.
- Statuszeile unter der Liste: „Copied: Patch 1 · P3“ + ✕ zum Leeren.
- Tastatur: **Ctrl/Cmd+C / Ctrl/Cmd+V**, wenn ein Patch-Punkt im Viewport ausgewählt ist (nicht, wenn ein Textfeld Fokus hat).

---

## B) Kante kopieren / einfügen / verbinden

**Kante auswählen**
- Neuer Modus **„Select Edge“** (Button im Panel, Esc beendet) – nutzt die bestehende Hover-Logik aus `triangle-patch-add-point-tool.ts` (`findClosestEdgeHit`, Hover-Radius ~14 px), trifft aber das **Segment** zwischen zwei Punkten statt einer Position t.
- Hover hebt das Segment hervor, Klick wählt es (bleibt markiert).

**Ablauf**
1. Segment an Patch 1 wählen → **Copy Edge**
2. Segment an Patch 2 wählen → **Paste Edge** als:
   - **Paste** – einmalig: beide Endpunkte (`pos`) + pinke Handles entlang des Segments übernehmen. Gelbe Handles bleiben wie sie sind.
   - **Link** – wie Paste, plus dauerhafte Kopplung (siehe unten). Gelbe Handles an beiden Enden starten als **Smooth-Paar** (Zielseite wird gegenüber der Quellseite ausgerichtet, behält ihre Länge).
- **Die kopierte Kante gibt die Form vor.**
- **Richtung:** Zuordnung der Enden automatisch nach Nähe (Start ↔ nächstgelegenes Ende). Button **„Flip“** dreht die Zuordnung um (bei Link auch nachträglich).
- **Nachbarkanten:** Die Endpunkte gehören auch zu den Nachbarsegmenten im selben Patch – diese verformen sich mit. Gewollt.

**Kopplung (Link) – Datenmodell**
- Neue Szenen-Liste von Links, z. B.
  ```
  PatchEdgeLink {
    id
    a: { entityId, startPointId, endPointId }
    b: { entityId, startPointId, endPointId }   // Reihenfolge = Zuordnung (Flip tauscht)
    cornerAt: { start: boolean, end: boolean }  // Corner-Status pro gemeinsamem Endpunkt
  }
  ```
- Gekoppelt sind: `pos` der Endpunkte und die pinken Handles des Segments (die anderen pinken Handles der Punkte bleiben frei, falls sie zu Nachbarsegmenten gehören – Zuordnung je nach Laufrichtung prüfen).
- Gelbe Handles: gekoppelt nach Smooth/Corner (siehe nächster Abschnitt).
- Bearbeitung an einer Seite → Propagation auf die andere (in Weltkoordinaten, mit Umrechnung in die jeweilige Entity-Transformation).
- Wird eine Patch-Entity verschoben/gedreht: Link bleibt bestehen, die **verschobene** Seite gibt vor, die andere folgt (zu bestätigen in der Umsetzung, Alternative: Link bei Entity-Transform auflösen).
- Löschen eines Patches oder eines Endpunkts → betroffene Links werden entfernt.
- Spiegelkopien (Mirror) nehmen an Links nicht teil (nur das Original).

**UI**
- Neue Sektion **„Shared Edges“** im Patch-Panel (zwischen Mirror und Inspector): Liste der Links dieses Patches, z. B. „P2–P3 ↔ Patch 2 · P1–P4“, pro Eintrag **Flip** und **Unlink**. Unlink lässt alles, wo es gerade ist.
- Viewport: gelinkte Segmente in eigener Farbe (z. B. grün).
- Inspector: Punkte auf gelinkten Segmenten mit 🔗 und Hinweis „linked with Patch 2 · P1“.

---

## C) Smooth / Corner (Illustrator-Prinzip)

**Gemeinsame Punkte (Link)**
- Am gemeinsamen Endpunkt bilden der gelbe Handle von Patch A (quer zur Kante, in A hinein) und der gelbe Handle von Patch B (in B hinein) ein Paar.
- **Smooth (Standard):** Drehen des einen dreht den anderen gegenüber mit; Längen unabhängig → fließender Übergang (obere Skizze).
- **Corner:** per **Alt-Ziehen** am Handle aufgebrochen → Handles unabhängig → Knick an der gemeinsamen Linie (untere Skizze). Status bleibt bestehen (wie in Illustrator).
- Pro Endpunkt einzeln: eine Kante kann an einem Ende fließen, am anderen knicken.
- Rückweg: Toggle **Smooth / Corner** im Inspector. Beim Zurück auf Smooth gibt der **ausgewählte** Handle die Richtung vor, der andere springt gegenüber und behält seine Länge.
- Darstellung: Smooth-Paar als durchgehende Linie; Corner-Punkt mit anderer Ankerform (Quadrat statt Kreis).

**Innerhalb eines Patches (pinke Handles) – optional, Phase 3**
- Dasselbe Prinzip für `handleNext`/`handlePrev` an Kantenpunkten (Nicht-Ecken). Aktuell sind sie unabhängig (keine Kopplung im Gizmo-Controller gefunden). Neues Feld pro Punkt `smooth?: boolean`; Standard für **bestehende** Szenen: Corner (= heutiges Verhalten, nichts ändert sich beim Laden).

**Modifier-Taste**
- Alt wie in Illustrator. Prüfen, ob Alt im Viewport (Browser/OS, z. B. Linux-Fenstermanager) kollidiert; Fallback: Toggle im Inspector reicht immer.

---

## Phasen

1. **Phase 1 – A:** Punkt-Copy/Paste (Zwischenablage, Inspector-Buttons, Shortcuts, Welt↔Lokal-Umrechnung, Undo).
2. **Phase 2 – B + C (Links):** Segment-Auswahlmodus, Copy/Paste Edge, `PatchEdgeLink`-Modell inkl. Speichern/Laden, Propagation, Shared-Edges-Sektion, Smooth/Corner an gemeinsamen Punkten mit Alt-Ziehen.
3. **Phase 3 – optional:** Smooth/Corner auch für pinke Handles innerhalb eines Patches.

Jede Phase einzeln committen und mit dir testen.

---

## Tests (Vitest)

- Punkt-Copy/Paste: Handles relativ korrekt, Welt↔Lokal bei gedrehtem/skaliertem Ziel-Patch, Teil-Paste.
- Segment-Hit-Test: richtiges Segment bei Kanten mit Zwischenpunkten.
- Paste Edge: Zuordnung nach Nähe, Flip.
- Link-Propagation: Anker/pinke Handles synchron; Smooth-Paar dreht gegenüber, Längen bleiben; Corner unabhängig; Re-Smooth richtet nach ausgewähltem Handle aus.
- Unlink / Löschen von Patch oder Punkt räumt Links auf.
- Laden alter Szenen ohne Links/`smooth` unverändert.

---

## Offene Punkte

- Verhalten beim Verschieben einer ganzen gelinkten Entity (folgt der Partner oder wird der Link gelöst?).
- Welcher der beiden gelben Handles (`handleCrossIn`/`handleCrossOut`) am Endpunkt jeweils zum Segment gehört – in Umsetzung anhand der Laufrichtung festlegen.
- Alt-Taste: Kollisionen prüfen.
