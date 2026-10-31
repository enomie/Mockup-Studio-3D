# Plan: Schritt C – Smooth / Corner an gemeinsamen Punkten

Status: **Entwurf – wartet auf Freigabe**
Vorgänger: Schritt A (Kanten verbinden), Schritt B (`plan-patch-surface-tangent.md`, Smooth Edges)

---

## Ziel

Zwei verbundene Patches sollen **automatisch** glatt ineinander übergehen, ohne dass man Handles von Hand gegenüberstellen muss. Und wie in Illustrator soll man die Glätte an einem Punkt **bewusst aufbrechen** können (Knick), und auch wieder zurück.

---

## Grundlage aus Schritt B (warum das so funktioniert)

Mit **Smooth Edges** gilt: Die Fläche verlässt die Kante in Richtung der **Querableitung**. Für einen knickfreien Übergang zählt nur der Anteil **quer zur gemeinsamen Kante**, der muss auf beiden Seiten **gegenüber** liegen. Längen dürfen verschieden sein.

Welcher Handle die Querrichtung an einem gemeinsamen Punkt bestimmt („**Quer-Handle**“):

| Punkt-Art (im jeweiligen Patch) | Quer-Handle |
|---|---|
| Kantenpunkt (keine Ecke) | gelber Handle („Edge Slope“) |
| Ecke | der **pinke** Handle der **anderen** Kante (die nicht die gemeinsame ist) |

Deshalb lässt sich mit **einer** Regel alles abdecken – Kantenpunkte und Ecken.

---

## Die Regel: Smooth-Gelenk

An einem gemeinsamen Punkt (P in Patch A ↔ Q in Patch B) mit Gelenk **Smooth**:

- Achse = Richtung der gemeinsamen Kante an diesem Punkt.
- Die Quer-Handles von P und Q werden um diese Achse **gekoppelt**: ihr Anteil quer zur Achse zeigt **genau gegenüber**.
- Erhalten bleiben auf der Partnerseite: die **Länge** des Queranteils und der Anteil **entlang** der Achse. Es dreht sich also nur die Richtung – wie bei Illustrator „Smooth“ (Längen frei).
- **Wer bearbeitet, gibt vor:** Ziehst du in A, dreht B mit – und umgekehrt.

Beispiel Ecke: Kippst du in A die Nachbarkante nach oben, kippt die Nachbarkante von B an dieser Ecke entsprechend nach unten weg – die beiden Flächen bleiben an der Ecke in einer Ebene. Der Winkel *in* der Ebene bleibt frei (die Kanten müssen **nicht** eine gerade Linie bilden).

**Corner-Gelenk:** keine Kopplung, Quer-Handles unabhängig → bewusster Knick (deine untere Skizze).

---

## Bedienung

**Standard**
- Neu verbundene Kanten (Link Edge) bekommen an beiden Enden **Smooth**; die Partnerseite wird dabei einmal ausgerichtet (die kopierte Seite gibt vor).
- Ein auf einer verbundenen Kante eingefügter Punkt wird ebenfalls **Smooth** und ausgerichtet.
- **Bereits bestehende Links** (vor Schritt C angelegt) bleiben **Corner**, damit sich nichts von selbst verändert. Umschalten per Toggle.

**Aufbrechen / Zusammenfügen**
- **Shift + Ziehen** am Quer-Handle im Viewport → Gelenk wird **Corner** (bleibt so, wie in Illustrator). Shift ist im Viewport bisher nicht belegt (geprüft) und kollidiert nicht mit Fenstermanagern wie Alt.
- Inspector: an gemeinsamen Punkten 🔗 und ein Toggle **Joint: Smooth / Corner**. Beim Wechsel auf Smooth gibt der **ausgewählte** Patch die Richtung vor, der Partner springt gegenüber und behält seine Länge.

**Anzeige**
- Gemeinsame Punkte bekommen im Viewport eine eigene Markierung; Corner-Gelenke sichtbar anders als Smooth (z. B. andere Farbe/Form des Ankers).
- Im Inspector werden die beiden Quer-Handles eines Smooth-Gelenks benannt („Edge Slope – linked with Patch 2 · Point 4“).

---

## Datenmodell

- `PatchPoint.joint?: 'smooth' | 'corner'` – nur relevant an Punkten auf verbundenen Kanten; fehlt = Corner (Altbestand).
- Wird in **beiden** Patches gespeichert und vom Link-Sync gleich gehalten.
- Undo/Redo: automatisch (Teil der Patch-Daten).

## Umsetzung (Engine)

- Erweiterung des bestehenden Link-Syncs (`propagateEdgeLinks`): nach dem Angleichen der Kante zusätzlich für jeden gemeinsamen Endpunkt mit `joint = 'smooth'` den Quer-Handle des Partners nach der Regel setzen. Weiterhin idempotent (schreibt nur bei Abweichung), Ketten-sicher.
- Damit greift die Kopplung bei **jeder** Änderung: Gizmo, Inspector, Paste, Undo-freie Aktionen.
- Shift-Erkennung im Patch-Gizmo beim Drag-Start → `joint = 'corner'` für diesen Punkt (beide Seiten).

## Grenzen (bewusst)

- **Punkte, an denen zwei verschiedene gemeinsame Kanten zusammenlaufen** (z. B. drei Patches an einer Ecke, oder eine Ecke, die mit zwei verschiedenen Partnern geteilt ist): hier widersprechen sich die Achsen. Solche Punkte bleiben **Corner** und werden im Inspector als „mehrfach geteilt“ markiert. (Echte Glätte an solchen Sternpunkten ist ein eigenes, deutlich schwierigeres Thema.)
- **Classic-Fläche:** Die Kopplung funktioniert auch dort (Handles werden gekoppelt), ein garantiert glatter Übergang entsteht aber nur mit **Smooth Edges** (Befund aus Schritt B).
- Quer-Handle fast parallel zur Kante (Queranteil ≈ 0): keine Kopplung möglich, wird übersprungen.

---

## Nachweis (Tests)

1. **Kantenpunkt, Smooth:** A's gelben Handle drehen → B's gelber Queranteil exakt gegenüber, B's Länge unverändert.
2. **Ecke, Smooth:** A's Nachbarkante aus der Ebene kippen → B's Nachbarkante folgt; Knick-Messung des Falls „Nachbarkanten nicht in einer Ebene“ aus B1 (dort bis ≈ 31° an den Ecken) → **< 0,1° entlang der ganzen Kante**.
3. **Ende-zu-Ende:** zwei ungleiche Smooth-Edges-Patches, Link + Punkt einfügen + beliebige Handle-Änderung → Knick überall < 0,1°.
4. **Corner:** keine Kopplung; Shift-Drag setzt Corner auf beiden Seiten.
5. Idempotenz (zweiter Durchlauf ändert nichts), Undo = ein Schritt, Altbestand (ohne `joint`) unverändert.
6. Mehrfach geteilte Punkte werden nicht gekoppelt.

---

## Umsetzungsschritte

- **C1 – Kern:** Regel + Erweiterung des Link-Syncs + Tests 1–6 + Messbericht.
- **C2 – Bedienung:** Smooth beim Link/Einfügen, Toggle im Inspector, Shift-Drag, Markierung im Viewport.
- **C3 – optional:** dasselbe Smooth/Corner-Prinzip für die beiden **pinken** Handles an Kantenpunkten **innerhalb** eines Patches (Kante läuft glatt durch den Punkt). Heute sind sie unabhängig.

---

## Offene Fragen an dich

1. **Shift + Ziehen** zum Aufbrechen – ok?
2. Bestehende Links bleiben Corner, neue Links starten Smooth – ok?
3. Markierung im Viewport: Vorschlag **Smooth = runder Anker mit Ring**, **Corner = quadratischer Anker** – ok oder anderer Wunsch?
4. C3 (pinke Handles innerhalb eines Patches) gleich mitmachen oder später?
