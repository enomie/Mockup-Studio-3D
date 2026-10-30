# Plan: Patch – Punkte hinzufügen („Add Point“)

Status: **Schritt 1–5 erledigt** (Schritt 6: vorläufiger „Add Point“-Button ist schon drin).
Scope: **nur** neue Punkte auf den Patch-Kanten setzen, umbenennen, löschen – inkl. Wölbung durch jeden Punkt.
Nicht im Scope: Snap/Copy-Paste von Tangenten, Symmetrie, Hebel-Kontinuitäts-Modi (glatt/spitz-Kopplung), Mitte-der-Kante-Shortcut (Idee gemerkt, später).

---

## 1. Was der User will

- Rechtes Settings-Panel des Patches: Punkte **untereinander als Liste** (statt Tabs A/B/C), Reihenfolge = **einmal außen herum** um den Patch.
- Jeder Listeneintrag: **Name inline editierbar**, Klick wählt den Punkt (Viewport + Panel synchron, wie bisher).
- Default-Namen: **„Point 1“, „Point 2“, …** – keine Namen wie „Front/Back“. Auch die drei Ecken heißen so.
- Unter der Liste: Button **„Add Point“** → startet einen **Modus im Viewport**: Maus über eine Kante → Vorschau-Kugel auf der Kante → Klick setzt dort den Punkt.
- **Trash-Icon** am Listeneintrag löscht den Punkt. Die 3 Eckpunkte haben kein Trash-Icon (das Dreieck braucht sie).
- **Jeder Punkt kann alles**: Anker + 2 Kantenhebel (pink) + 2 Quertangenten (gelb). Die gelben Quertangenten jedes Punkts bestimmen die **Wölbung** mit – nicht nur an den Ecken (Prototyp-Schwäche wird behoben).
- Bestehende Szenen: keine – das Datenmodell darf frei umgebaut werden, keine Migration.

---

## 2. Was einen Punkt ausmacht

```ts
interface PatchPoint {
  id: string;            // stabil, z. B. 'pt-3' – Selektion hängt an der id, nicht am Index
  name: string;          // 'Point 1', editierbar
  pos: Vec3;             // Anker
  handleNext: Vec3;      // pink, Kantenverlauf zum nächsten Punkt im Umlauf
  handlePrev: Vec3;      // pink, Kantenverlauf zum vorherigen Punkt
  handleCrossIn: Vec3;   // gelb, Wölbung ins Patch-Innere
  handleCrossOut: Vec3;  // gelb, Gegenseite der Wippe (Außenflanke)
}
```

Eckpunkt vs. Kantenpunkt ist **keine Eigenschaft des Punkts**, sondern nur seine Lage im Umlauf (siehe 3). Gizmo-Verhalten ist für alle Punkte identisch (Anker verschieben/drehen nimmt Hebel mit, gelbe Wippe gekoppelt). Optisch: Ecken blau, Kantenpunkte lila und etwas kleiner (wie Prototyp) – reine Darstellung.

---

## 3. Datenmodell

```ts
interface TrianglePatchParams {
  divisions: number;
  points: PatchPoint[];                  // geschlossener Umlauf, Reihenfolge = Listenreihenfolge
  cornerIds: [string, string, string];   // welche 3 Punkte die Dreiecksecken sind
  edgeParams: Record<string, number>;    // nur Kantenpunkte: Position t ∈ (0,1) auf ihrer Kante
}
```

- Kante 0 = Ecke 0 → Ecke 1, Kante 1 = Ecke 1 → Ecke 2, Kante 2 = Ecke 2 → Ecke 0; dazwischen liegen die Kantenpunkte in Umlaufreihenfolge.
- **`edgeParams`** (Parameter je Kantenpunkt) löst die zweite Prototyp-Schwäche: Dort bekommt jedes Kurvensegment gleich viel Parameterbereich, darum springt die Fläche beim Einfügen. Mit gespeichertem t wird beim Einfügen exakt an der Klickstelle geteilt, und die Fläche bleibt (bis auf die Wölbung, s. 4) unverändert.
- Ersetzt das bisherige `nodes: [A, B, C]` komplett. Default-Patch = 3 Punkte „Point 1–3“, keine Kantenpunkte.

---

## 4. Flächenformel – „smart“ statt Sonderfall

Heute: Rand = 3 Bézier-Kanten (Coons-Blend), Innenwölbung = nur aus `handleCrossIn` der 3 Ecken.

Neu, ein einziger Mechanismus für alle Punkte:

1. **Rand**: `evalEdge(e, t)` wertet die zusammengesetzte Kante aus (Segment über `edgeParams` finden, kubischer Bézier im Segment). Der Coons-Blend bleibt wie er ist – er arbeitet ja schon nur mit `evalEdge`.
2. **Quertangenten-Feld je Kante**: `evalCross(e, t)` = Quertangente (`handleCrossIn − pos`) interpoliert zwischen den beiden Punkten des Segments (später ggf. Hermite statt linear). Ecken liefern ihren Wert an beiden anliegenden Kanten.
3. **Wölbung** = Summe über die 3 Kanten: `evalCross(e, t_e) · Gewicht_e(u, v, w)`. Das Gewicht ist 0 auf allen drei Rändern (Rand bleibt exakt die Kantenkurve), wächst von der eigenen Kante ins Innere und klingt zur Gegenecke hin ab.

Damit ist ein Kantenpunkt kein Sonderfall mehr: Jeder Punkt speist seinen Kantenabschnitt, Ecken speisen zwei. Mit nur 3 Ecken soll die Form etwa wie heute aussehen. Die genaue Gewichtsfunktion wird in Schritt 2 mit Tests festgelegt:
- Rand-Test: Flächenpunkte mit u, v oder w = 0 liegen exakt auf `evalEdge`.
- Einfüge-Test: Punkt einfügen ändert den Rand nicht (Toleranz).
- Wirkungs-Test: `handleCrossIn` eines Kantenpunkts verschieben ändert das Innere nahe diesem Punkt.

`handleCrossOut` bleibt formneutral (Gegenseite der Wippe), wie besprochen.

---

## 5. Einfügen und Löschen

**Einfügen** (Klick auf Kante e bei Parameter t):
- Segment finden, lokales u berechnen, **de Casteljau** teilen → neuer Anker, neue pinke Hebel; Nachbarhebel werden gekürzt → Kante bleibt formgleich.
- Gelbe Quertangenten des neuen Punkts = Interpolation der Nachbarn bei u (damit die Wölbung möglichst wenig springt).
- `edgeParams[newId] = t`, Name = nächste freie Nummer „Point N“.
- Danach: neuer Punkt ist selektiert (Anker), Modus endet.

**Löschen** (Trash, nur Kantenpunkte):
- Punkt aus `points` und `edgeParams` entfernen; die zwei Nachbarsegmente werden ein Segment. Die Kante ändert sich dabei (kein exaktes Zusammenführen möglich) – akzeptiert, Undo bleibt der Weg zurück.
- War der gelöschte Punkt selektiert → Selektion auf den vorherigen Punkt.

---

## 6. Add-Point-Modus im Viewport

- Button „Add Point“ im Panel schaltet den Modus ein (Button aktiv dargestellt); erneuter Klick oder **Esc** bricht ab.
- Im Modus: Hebel-Gizmo aus, Hover sucht den nächsten Punkt auf den 3 Kanten (Kante abtasten, Abstand zum Mausstrahl, Schwelle in Bildschirm-Pixeln statt fester Weltlänge wie im Prototyp), lila Vorschau-Kugel dort.
- Klick → Einfügen (5). Klick daneben → nichts passiert, Modus bleibt.
- Die Kanten werden im Modus als Linien hervorgehoben, damit klar ist, wo man klicken kann.

---

## 7. Panel (rechts)

- Liste der Punkte in Umlaufreihenfolge, eine Zeile je Punkt: Farbpunkt (blau Ecke / lila Kantenpunkt), Name als Inline-Input, Trash-Icon (nicht bei Ecken).
- Darunter Button „Add Point“.
- Darunter wie bisher: Hebel-Auswahl (Dropdown), XYZ, Rot (Anker), Länge ±10 % – jetzt für den gewählten Punkt.
- Im bestehenden Panel-Look (vorhandene Panel-Komponenten, keine Prototyp-Optik).

---

## 8. Umsetzungsschritte

1. **Datenmodell**: `PatchPoint`, neue `TrianglePatchParams`, Default, Clone; Helfer `getEdgePoints(params, e)`. Selektion (`PatchHandleSelection`) auf `pointId` statt `nodeIndex`. Alle Stellen auf `points` umstellen (Engine, Gizmo, Panel, Store).
2. **Geometrie**: `evalEdge` / `evalCross` für zusammengesetzte Kanten, neue Wölbung; Tests aus 4.
3. **Einfügen/Löschen** als reine Funktionen in `src/scene/` (de Casteljau, Nummerierung) mit Tests.
4. **Gizmo-Controller**: Helfer dynamisch je Punkt erzeugen/entfernen statt fix 3.
5. **Add-Point-Modus**: Hover, Vorschau, Klick, Esc – in Selection/Viewport-Input eingehängt.
6. **Panel**: Liste, Umbenennen, Trash, Button.
7. Tests, Lint, Build → `main`.

## 9. Offene Punkte (beim Umsetzen klären)

- Exakte Gewichtsfunktion der Wölbung (Schritt 2, per Tests + Augenschein).
- Ob Undo für Einfügen/Löschen/Umbenennen schon greift, hängt am History-Stand (`requirements-history.md`) – sonst später nachziehen.

---

## 10. Detailplan Schritt 2 – Geometrie

**`evalEdge(params, e, t, out)`** (exportiert, später auch für Hover im Add-Point-Modus):
- Punkte der Kante via `getPatchEdgePoints`, Knoten `t_0 = 0`, `edgeParams` der Kantenpunkte, `t_n = 1`.
- Segment k mit `t_k ≤ t ≤ t_k+1` suchen, lokal `s = (t − t_k) / (t_k+1 − t_k)`, kubischer Bézier aus `P_k.pos, P_k.handleNext, P_k+1.handlePrev, P_k+1.pos`.
- Ohne Kantenpunkte = genau eine Kurve = identisch zu heute. Nicht-monotone Parameter werden defensiv geklemmt.

**`evalCross(params, e, t, out)`**: Quertangente `handleCrossIn − pos` der beiden Segmentpunkte, mit demselben `s` linear interpoliert.

**Wölbung – die Formel von heute ist schon ein Spezialfall:**
Heute: `bulge = 27·u·v·w·0.65 · (u·c_A + v·c_B + w·c_C)` (c = Quertangente einer Ecke).
Neu: `bulge = 27·u·v·w·0.65 · Σ_Kanten ((Summe der zwei Baryzentrik-Werte der Kante) / 2) · evalCross(e, t_e)`.
Für eine Kante AB mit nur zwei Ecken ist `evalCross = (u·c_A + v·c_B)/(u+v)`; mit dem Gewicht `(u+v)/2` summiert über alle 3 Kanten ergibt das exakt `u·c_A + v·c_B + w·c_C`. Ohne Kantenpunkte sieht der Patch also **bit-gleich** aus wie heute, und ein Kantenpunkt wirkt automatisch über seine Kante ins Innere. Kein Sonderfall im Code.
Der Faktor `u·v·w` hält den Rand exakt auf der Kantenkurve.

**Umbau:** `evalPatchSurfacePoint(params, u, v, w, out)` nimmt die ganzen Params statt 3 Ecken; der Coons-Blend ruft `evalEdge` statt `evalCubicBezierEdge`.

**Tests:**
1. Regression: ohne Kantenpunkte = alte Formel (Vergleich gegen die bisherige Implementierung an Stichproben).
2. Rand: Punkte mit u, v oder w = 0 liegen auf `evalEdge`.
3. Segmente: `evalEdge` trifft bei `t = edgeParams[id]` genau den Anker des Kantenpunkts.
4. Wirkung: `handleCrossIn` eines Kantenpunkts verschieben ändert das Innere, den Rand nicht.
