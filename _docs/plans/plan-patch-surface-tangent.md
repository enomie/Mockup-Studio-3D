# Plan: Schritt B – Patch-Fläche mit echter Rand-Neigung

Status: **Entwurf – wartet auf Freigabe**
Vorgänger: `plan-patch-point-copy-and-shared-edges.md` (Schritt A erledigt: Kanten verbinden, nur Linie)

---

## Ziel

Die Fläche soll an jeder Kante **genau so steil weggehen, wie es die gelben Handles vorgeben**, unabhängig von Form und Größe des Patches. Dann gilt:

> Zwei verbundene Patches, deren gelbe Handles an der gemeinsamen Kante gegenüberliegen, gehen **garantiert ohne Knick** ineinander über (auch bei ungleichen Patches).

Heute ist das nicht so (Messung: ≈ 10° Knick bei ungleichen Patches, Handle 45° → Fläche nur 17–30°).

---

## Mathematischer Ansatz

### Heute („Classic“)
Coons-Rand (Kanten exakt) + eine „Wölbung“ `27·u·v·w·Σcross`, die an der Kante ausläuft. Die Neigung an der Kante ist dadurch ein Nebenprodukt aller Kanten und der Patch-Größe.

### Neu („Tangent“): Rand-Bänder + Transfinite-Interpolation
Bewährtes Verfahren aus dem CAD-Bereich (Kato / Várady-Salvi, „transfinite surface interpolation“):

1. **Pro Kante ein „Band“ (Ribbon):** `R_i(s, d) = C_i(s) + d · D_i(s)`
   - `C_i(s)`: die Kanten-Kurve (wie heute, aus Punkten + pinken Handles)
   - `D_i(s)`: die **Querableitung** = wie die Fläche von der Kante ins Innere geht
2. **Fläche = gewichtete Mischung der Bänder**, Gewicht jedes Bandes wird an „seiner“ Kante 1 und an den anderen 0 (`w_i = Π_{j≠i} d_j²`).
   → Auf der Kante liegt die Fläche **exakt** auf der Kurve **und** hat **exakt** die Querableitung `D_i`.
3. **Ein Code für Dreieck und Viereck** (das Verfahren funktioniert für n Seiten). Parameter: Dreieck über baryzentrische Koordinaten (wie heute), Viereck über (s, t).

### Woher kommt `D_i(s)` (die Neigung entlang der Kante)?
- **Kantenpunkte (zwischen den Ecken):** gelber Handle `handleCrossIn − pos` = Richtung **und** Stärke der Neigung.
- **Zwischen zwei Punkten:** Richtung wird **sphärisch** interpoliert (normierte Richtung), Länge linear.
  Wichtig: Dadurch gilt bei gegenüberliegenden Handles auf beiden Seiten `D_B(s) = −λ(s)·D_A(s)` → Tangentialebenen stimmen **überall** auf der Kante überein, auch wenn die Handle-**Längen** verschieden sind (Längen bleiben frei, wie bei Illustrator „Smooth“).
- **An den Ecken:** Hier ist die Neigung **mathematisch festgelegt**. An einer Ecke ist die Querrichtung der einen Kante zwingend die Richtung der **Nachbarkante** (sonst reißt/verdreht die Fläche an der Ecke). Die Querableitung an der Ecke wird daher aus dem **pinken Handle der Nachbarkante** abgeleitet.

### Konsequenzen für die Bedienung (wichtig)
- **Gelbe Handles an Kantenpunkten:** steuern direkt die Rand-Neigung → das ist der „Fließend“-Hebel.
- **Gelbe Handles an Ecken:** haben im Tangent-Modus keine Wirkung auf die Rand-Neigung (die Ecke wird von den Nachbarkanten bestimmt). Vorschlag: Sie steuern stattdessen eine **Mittel-Wölbung** (siehe unten), damit die Wölbung wie bisher bedienbar bleibt. Im Panel entsprechend beschriftet („Center bulge“).
- **Mittel-Wölbung:** Zusatzterm, der am Rand **Wert und Neigung 0** hat (Gewicht `Π d_i²`), stört also den glatten Übergang nicht.
- **Glatte gemeinsame Ecke:** Für einen knickfreien Übergang auch direkt an den Ecken der gemeinsamen Kante müssen die **Nachbarkanten** beider Patches dort in einer Ebene liegen (pinke Handles gegenüber). Das automatisiert Schritt C (Smooth/Corner). In Schritt B ist es von Hand einstellbar.

---

## Einführung ohne Risiko

- Neues Feld `PatchParams.surface?: 'classic' | 'tangent'`. **Fehlt das Feld → Classic** → alle bestehenden Patches/Szenen sehen exakt aus wie bisher.
- Panel (Patch, neue Zeile oben): **Surface: Classic / Smooth Edges**. Umschalten jederzeit, Undo-fähig (Teil der Patch-Daten).
- Neue Patches: vorerst **Classic**; nach deinem Praxistest entscheiden wir, ob „Smooth Edges“ Standard wird.
- Spiegelkopien (Mirror) funktionieren in beiden Modi unverändert (gleiche Geometrie, gespiegelt).

---

## Schattierung an der Naht

Auch bei mathematisch knickfreier Fläche kann eine sichtbare Naht entstehen, wenn die Normalen pro Mesh aus den Dreiecken gemittelt werden (am Rand nur einseitig). Darum im Tangent-Modus **Normalen analytisch** aus der Fläche berechnen (Ableitungen statt Dreiecks-Mittel). Am Rand sind sie dann auf beiden Seiten identisch → keine Lichtkante.

---

## Nachweis (bevor UI gebaut wird)

Reiner Mathe-Baustein mit Tests, Messwerte kommen in den Plan zurück:

1. **Rand exakt:** Flächenpunkte auf jeder Kante = Kanten-Kurve (Abweichung < 1e-9).
2. **Neigung exakt:** Querableitung an der Kante (finite Differenzen) = `D_i(s)` in Richtung (< 0,1°).
3. **Knick-Test** wie bei der ursprünglichen Messung: zwei **ungleiche** Patches, gemeinsame Kante, gegenüberliegende gelbe Handles mit **verschiedenen Längen** → Knick < 0,1° an allen Messstellen (Classic zum Vergleich: ≈ 10°).
4. **Ecken:** keine NaN/Ausreißer an und nahe den Ecken, stetig.
5. **Classic unverändert:** Geometrie bestehender Patches bitgleich zu vorher (Regressionstest).
6. Dreieck **und** Viereck, mit und ohne Kantenpunkte.

---

## Umsetzungsschritte

- **B1 – Mathe-Kern + Tests** (`patch-surface-transfinite.ts`): Bänder, Querableitungen (sphärische Interpolation, Ecken aus Nachbarkanten), Kato-Mischung, Mittel-Wölbung, analytische Normalen. Messbericht an dich.
- **B2 – Einbau:** `surface`-Feld, Mesh-Aufbau für Dreieck/Viereck im Tangent-Modus, Panel-Umschalter, Beschriftung der Ecken-Handles, Gizmo unverändert.
- **B3 – Praxistest durch dich** mit zwei verbundenen Patches; danach Entscheidung „Standard für neue Patches?“ und Start von Schritt C.

---

## Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Gewichte werden an den Ecken singulär (0/0) | Ecken exakt behandeln, Grenzwert; Tests 4 |
| Stark verzerrte/sehr spitze Patches → Beulen | Parameter-Glättung; im Zweifel Classic behalten |
| Ecken-Handles „verlieren“ ihre gewohnte Wirkung | Umwidmung zur Mittel-Wölbung, klare Beschriftung, Classic bleibt verfügbar |
| Rechenaufwand | ≈ 300–2000 Flächenpunkte pro Patch, unkritisch; nur bei Änderung neu |
| Bestehende Szenen ändern sich | Unmöglich: Feld fehlt → Classic |

---

## Offene Fragen an dich

1. ~~Ecken-Handles als Mittel-Wölbung?~~ → **Ja.**
2. ~~Name im Panel?~~ → **„Smooth Edges“.**
3. Neue Patches erst nach deinem Test auf den neuen Modus umstellen – ok?
