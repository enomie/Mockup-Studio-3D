# Koordinaten & Himmelsrichtungen — Minimumstandard

**Code (einzige Wahrheit):** [`src/engine/world-compass.ts`](../src/engine/world-compass.ts)
**Automatischer Check:** [`src/engine/world-compass.test.ts`](../src/engine/world-compass.test.ts) (`npx vitest run`)
**Viewport:** Environment → Viewport helpers → **Compass arrows** · **Quadrant grid**

Three.js: **rechtshändig, Y = hoch**. Der Plan liegt in **X / Z**.

## Die Regel

| Richtung | Achse | Pfeilfarbe |
|----------|-------|------------|
| **Norden** | **−Z** | Rot (längster Pfeil = Kompassnadel) |
| **Osten**  | **+X** | Gelb |
| **Süden**  | **+Z** | Weiß |
| **Westen** | **−X** | Grün |

Startkamera steht im **Süden** (+Z) und schaut nach **Norden** (−Z) → **Osten rechts** am Bildschirm, Norden oben/hinten.

## Draufsicht (von oben, +Y zeigt zum Betrachter)

```
                 −Z  NORDEN
                      ↑
       delta          │          alpha
     (−X , −Z)        │        (+X , −Z)
     Nordwesten       │        Nordosten
                      │
 −X  WESTEN ──────────┼────────── +X  OSTEN
                      │
       gamma          │          beta
     (−X , +Z)        │        (+X , +Z)
     Südwesten        │        Südosten
                      ↓
                 +Z  SÜDEN   ← Kamera steht hier
```

Quadranten im Uhrzeigersinn ab **alpha = Nordosten** (+X, −Z): alpha → beta → gamma → delta.

| Quadrant | Richtung | Vorzeichen (x , z) | Farbe |
|----------|----------|--------------------|-------|
| **alpha** | Nordosten (NE) | (+ , −) | Orange |
| **beta**  | Südosten (SE)  | (+ , +) | Blau |
| **gamma** | Südwesten (SW) | (− , +) | Violett |
| **delta** | Nordwesten (NW) | (− , −) | Türkis |

Im Viewport ist jeder Quadrant ein **Linienraster** (2 × 2 m, Zellen 0,25 m) in seiner Farbe. Quadrantenfarben unterscheiden sich bewusst von den Pfeilfarben. Die Beschriftung liegt flach auf dem Boden und ist so ausgerichtet, dass ihre Oberkante nach Norden zeigt.

## Warum NICHT „Norden = +Z und Osten = +X“

Das ist in einem rechtshändigen System **eine gespiegelte Karte**. Von oben gesehen mit +X rechts zeigt +Z zwangsläufig nach **unten**.
Wer das trotzdem will, braucht Hacks: Projektionsmatrix spiegeln (`elements[0] *= -1`), Orbit spiegeln, `DoubleSide` am Kompass, weil die Rückseite sichtbar wird, gespiegelter Text …
Jeder dieser Hacks verbreitet sich in weitere Dateien. **Nie machen.**

Erlaubt sind nur Paare, bei denen Osten = Norden **im Uhrzeigersinn** von oben gesehen ist:
- **N = −Z, E = +X** (dieser Standard, passt zur Three.js-Kamera, die nach −Z schaut, und zu glTF, wo die Front nach +Z zeigt)
- N = +Z, E = −X (auch korrekt, aber die Startkamera muss dann im Norden stehen)

## Dateien in diesem Repo

| Rolle | Datei |
|-------|-------|
| Richtungen, Quadranten, Farben (einzige Wahrheit) | `src/engine/world-compass.ts` |
| Tests (Händigkeit, alpha = NE, Startkamera: N oben, O rechts) | `src/engine/world-compass.test.ts` |
| Kompasspfeile | `src/engine/viewport-helpers/compass-arrows.ts` |
| Quadrant grid | `src/engine/viewport-helpers/quadrant-grid.ts` |
| Größen/Längen | `src/constants.ts` (`VIEWPORT_COMPASS_*`, `VIEWPORT_QUADRANT_*`) |

## Checkliste für jedes Projekt

1. **Eine** Datei mit den Richtungen und Quadranten, alle anderen importieren daraus. Keine Literale `z: -1 // north` verstreut im Code.
2. Test 1: `cross(N, E).y < 0`, also von oben im Uhrzeigersinn → rechtshändig korrekt.
3. Test 2: Mit der echten Startkamera projizieren → `N.y > S.y`, `E.x > W.x`, alpha oben rechts.
4. Vier verschiedenfarbige Pfeile im Viewport → Blickcheck in einer Sekunde.
5. **Verboten:** Projektionsmatrix spiegeln, `scale.x = -1` auf Szene/Kamera, Labels Ost/West tauschen, Texturen drehen, „bis es passt“.
6. Rot/Grün/Blau des AxesHelpers (X/Y/Z) **nicht** mit Himmelsrichtungen verwechseln: Die rote X-Achse zeigt nach **Osten**, nicht nach Norden.
