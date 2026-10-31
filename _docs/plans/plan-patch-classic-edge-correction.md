# Plan: Classic-Fläche mit Kanten-Korrektur (ersetzt „Smooth Edges“)

Status: **Abgestimmt – wartet auf Start (D1)**
Vorgänger: `plan-patch-surface-tangent.md` (Schritt B, Smooth Edges), `plan-patch-smooth-corner.md` (Schritt C, Gelenke)

---

## Ausgangslage

- **Classic** sieht gut aus (weiche Kuppel), knickt aber an verbundenen Kanten, weil die Neigung an der Kante ein Nebenprodukt ist.
- **Smooth Edges** (Schritt B) ist an verbundenen Kanten exakt glatt, sieht aber schlechter aus:
  - Ränder ohne Kantenpunkt gehen fast flach weg (Neigung nur aus den Nachbarkanten an den Ecken),
  - die Mittel-Wölbung muss am Rand flach auslaufen → Beule statt Kuppel,
  - das Mischverfahren erzeugt bei unregelmäßigen Patches ungleichmäßige Flächen.

## Ziel

> **Classic-Form behalten** und **nur in einem schmalen Streifen an verbundenen Kanten** die Neigung so korrigieren, dass beide Patches ohne Knick ineinander übergehen.

- Unverbundene Patches: **exakt Classic** (bitgleich).
- Verbundene Kanten mit Smooth-Gelenken: **kein Knick** (Ziel < 0,1°), Form sonst wie Classic.
- Smooth/Corner (Schritt C) funktioniert unverändert weiter.
- Kein Umschalter „Surface“ mehr nötig.

---

## Mathematischer Ansatz

Bezeichnungen pro Kante *i*: Parameter entlang der Kante `t`, Abstand von der Kante `d` (wie in Schritt B: Dreieck baryzentrisch, Viereck (s,t)).

1. **Classic-Fläche** `S_c` wie heute.
2. **Natürliche Neigung** der Classic-Fläche an der Kante: `K_i(t) = ∂S_c/∂d` bei `d = 0` (numerisch bestimmt).
3. **Ziel-Neigung** `D_i(t)`: `K_i(t)` wird **nur um die Kantenachse gedreht**, bis ihr Queranteil in die **Zielrichtung** zeigt. Länge und Anteil entlang der Kante bleiben → die Form bleibt Classic-ähnlich, nur die Richtung stimmt.
   - **Zielrichtung** = Queranteil des **Quer-Handles** aus Schritt C (gelb an Kantenpunkten, pinker Handle der Nachbarkante an Ecken), zwischen den Punkten sphärisch interpoliert (bewährt aus B1).
   - Weil Schritt C die Quer-Handles beider Patches an Smooth-Gelenken **gegenüber** koppelt, zeigen die Zielrichtungen beider Seiten überall gegenüber → **Tangentialebenen gleich → kein Knick**.
   - An Ecken entspricht die Zielrichtung ohnehin ungefähr der Classic-Neigung (dort bestimmt die Nachbarkante beides) → Korrektur ≈ 0, keine Spannungen in den Ecken.
4. **Korrektur-Term** (nur für verbundene Kanten-Segmente):
   `S = S_c + Σ_i W_i · d_i · f(d_i) · σ_i(t) · (D_i(t) − K_i(t))`
   - `d_i`: Faktor sorgt dafür, dass die **Kante selbst unverändert** bleibt (Position exakt).
   - `f(d)`: weicher Abfall von 1 (an der Kante, flach) auf 0 bei Streifenbreite δ → **innen bleibt Classic unverändert**.
   - `W_i`: Gewichte (wie in Schritt B), die an der eigenen Kante 1 und an allen anderen Kanten 0 sind, jeweils mit Steigung 0 → andere Kanten werden **weder verschoben noch in der Neigung verändert**.
   - `σ_i(t)`: Stärke entlang des Segments aus den Gelenken: Smooth = 1, Corner = 0, dazwischen weich interpoliert. Corner-Gelenke → keine Korrektur am Punkt (bewusster Knick möglich).
   - Ergebnis an der Kante: Neigung = exakt `D_i` (bei Smooth).
5. **Normalen:** wie bisher aus dem Dreiecksnetz; an den Randpunkten korrigierter Kanten **exakt** `Kantentangente × D` → keine Lichtkante an der Naht. Unverbundene Patches: Normalen wie heute.

**Streifenbreite δ:** Standard 0,3 (30 % des Patches), **Regler pro Patch** im Panel („Edge Blend“, 10–60 %). Breiter = sanfterer Übergang, schmaler = mehr Classic. Der Knick bleibt unabhängig von der Breite 0 – beide Patches dürfen verschiedene Breiten haben. Neues Feld `PatchParams.edgeBlend?` (fehlt = 0,3), Undo-fähig.

**Wichtig:** Die Geometrie eines Patches hängt nur von **seinen eigenen Daten** ab (Links und Gelenke sind im Patch gespeichert, Handles werden von Schritt C gekoppelt). Kein Patch muss beim Aufbau den Partner lesen.

---

## Was mit „Smooth Edges“ passiert

- Der Umschalter **Surface** im Panel wird entfernt; die Beschriftungen der gelben Handles gehen zurück auf Classic.
- Patches mit `surface: 'smooth-edges'` werden einfach wie alle anderen gebaut (Classic + Korrektur). Kein Datenverlust, nichts bricht beim Laden.
- Der Mathe-Kern aus Schritt B (`patch-surface-transfinite.ts`) wird nicht mehr für die Darstellung verwendet. Teile davon (Interpolation der Querrichtung, Gewichte) werden wiederverwendet; der Rest wird nach erfolgreichem Test entfernt.

---

## Nachweis (Tests, bevor eingebaut wird)

1. **Unverbundener Patch:** Geometrie bitgleich zu Classic (Dreieck + Viereck).
2. **Knick:** zwei ungleiche Patches, Nachbarkanten nicht in einer Ebene, Smooth-Gelenke nach Sync → max. Knick entlang der ganzen Kante **< 0,1°** (Classic zum Vergleich: ≈ 10–55°).
3. **Kanten exakt:** Randpositionen = Classic-Kanten (< 1e-9).
4. **Form:** außerhalb des Streifens Abweichung zu Classic **= 0**; im Streifen wird die maximale Abweichung gemessen und berichtet.
5. **Corner-Gelenke:** keine Korrektur → Classic.
6. **Normalen:** an der gemeinsamen Kante beidseitig < 0,1° Abweichung.
7. Ecken: keine NaN/Sprünge.

---

## Umsetzungsschritte

- **D1 – Mathe + Tests + Messbericht** (neues Modul, Classic-Code bleibt unverändert).
- **D2 – Einbau:** Mesh-Aufbau (Dreieck/Viereck) mit Korrektur, Randnormalen, Regler „Edge Blend“, Entfernen des Surface-Umschalters.
- **D3 – Dein Praxistest** (Vergleich mit Screenshot Classic/vorher).

---

## Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Starke Abweichung zwischen Classic-Neigung und Zielrichtung → sichtbare „Welle“ im Streifen | breiterer Streifen δ; Messung im Test 4; später Regler |
| Classic-Neigung fast parallel zur Kante (Queranteil ≈ 0) | Korrektur an dieser Stelle aussetzen (wie bei C) |
| Gewichte an den Ecken singulär | Grenzwert/Abfangen wie in B1 (bereits gelöst) |
| Mirror-Kopien | Geometrie wird einmal gebaut und gespiegelt – unverändert |

---

## Entscheidungen

1. Streifenbreite: Standard **30 %**, mit **Regler** pro Patch. → ja
2. Surface-Umschalter / Smooth Edges entfernen. → ja
