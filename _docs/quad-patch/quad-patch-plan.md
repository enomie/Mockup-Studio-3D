# Plan: Quad Patch (Viereck-Patch)

Stand: 2026-10-30 · Status: **Plan, noch nicht umgesetzt.**
Basis: Triangle Patch inkl. Add Point (`_docs/triangle-patch/patch-add-point-plan.md`) und Mirror (`_docs/triangle-patch/patch-mirror-plan.md`).

---

## 1. Was der User will

- Ein **zweiter Patch-Typ aus 4 Eckpunkten**, der auf einem Viereck basiert. Er kommt **neben** den Triangle Patch, und der Triangle Patch bleibt unverändert.
- **Gleiches Handling wie der Triangle Patch:** Punktliste, Umbenennen, Add Point, Löschen, Hebel (pink/gelb), Gizmo, Länge ±10 %, Mirror X/Y/Z.
- Anders ist **nur die Mathematik der Fläche** (Viereck statt Dreieck).
- **Minimal anfangen**, ausbauen erst, wenn es funktioniert.

**Nicht im Scope (bewusst):**
- Kein Kanten-Sharing zwischen Patches (weder Quad↔Quad noch Quad↔Dreieck), kein G1-Abgleich. Das wird später besprochen.
- **Keine neuen Materialien.** Der Quad nutzt dieselben Material-Defaults wie der Triangle Patch.
- Kein Trimmen, kein Zebra-/Highlight-Shader, keine N-Ecke (5+).
- Keine Migration (es gibt keine bestehenden Quad-Szenen).

---

## 2. Kernidee: Wiederverwenden statt neu bauen

Fast alles am Triangle Patch hängt **nicht** an der Zahl 3:
- Punkte bilden einen geschlossenen Umlauf (`points`).
- Ecken sind nur markierte Punkte (`cornerIds`).
- Kante e läuft von Ecke e zu Ecke e+1, mit Kantenpunkten dazwischen (`edgeParams`).
- Gizmo, Add-Point-Tool, Mirror und Panel arbeiten auf Punkten und Kanten.

Deshalb wird das Datenmodell auf **3 oder 4 Ecken** verallgemeinert. Der Quad bekommt nur eine **eigene Flächenformel** und einen **eigenen Default**. Alles andere läuft über dieselben Bausteine.

---

## 3. Datenmodell

```ts
interface PatchParams {               // heute TrianglePatchParams, wird verallgemeinert
  divisions: number;
  points: PatchPoint[];               // unverändert
  cornerIds: string[];                // Triangle: 3, Quad: 4 (Umlaufreihenfolge)
  edgeParams: Record<string, number>; // unverändert
  mirror?: PatchMirror;               // unverändert
}
```

- `TrianglePatchParams` wird zu `PatchParams` umbenannt. Ein Alias `TrianglePatchParams = PatchParams` bleibt, damit der Diff klein bleibt.
- Kantenzahl = `cornerIds.length`. Kante e: Ecke e → Ecke (e+1) mod n.
- Helfer, die heute fix 3 annehmen (`getPatchCorners`, Kantenschleifen in `getPatchEdgePoints` / `locatePatchEdgeSegment`, Add-Point-Hit-Test, Gizmo), werden auf **n Ecken** umgestellt.
- Neues Asset-Kind **`quad-patch`** mit eigenem Entity-Feld `quadPatchParams: PatchParams`. Der Triangle Patch behält `trianglePatchParams`.
- `defaultQuadPatchParams()`: 4 Ecken „Point 1–4“, ca. 1 × 1 groß, leicht gewölbt, Hebel auf ~1/3 der Kanten, gelbe Quertangenten zeigen leicht nach oben und innen.

---

## 4. Flächenformel (die eigentliche Neuerung)

Der Quad wird über **(s, t) ∈ [0,1]²** ausgewertet statt über baryzentrische (u, v, w). Kanten im Umlauf:

| Kante | Von → Nach | Lage im (s, t)-Quadrat |
| :--- | :--- | :--- |
| 0 | Ecke 0 → 1 | unten, t = 0, s läuft 0 → 1 |
| 1 | Ecke 1 → 2 | rechts, s = 1, t läuft 0 → 1 |
| 2 | Ecke 2 → 3 | oben, t = 1, s läuft 1 → 0 |
| 3 | Ecke 3 → 0 | links, s = 0, t läuft 1 → 0 |

**1. Rand: bilinearer Coons-Patch** (Standard für Vierecke, genau das „U × V“ aus dem Gemini-Gespräch):

```
S(s,t) = Loft in s   (unten/oben interpoliert mit t)
       + Loft in t   (links/rechts interpoliert mit s)
       − bilineare Fläche der 4 Ecken
```

Die Kanten werden über das vorhandene `evalEdge(params, e, …)` ausgewertet. Kantenpunkte wirken damit automatisch mit. Der Rand der Fläche ist **exakt** die Kantenkurve, wie beim Dreieck.

**2. Wölbung: dasselbe Prinzip wie beim Dreieck**

- Jede Kante liefert ihr Quertangenten-Feld `evalCross(params, e, …)` (gelbe Hebel aller Punkte auf der Kante).
- Gewicht je Kante: Nähe zur Kante (z. B. unten `1 − t`, oben `t`, links `1 − s`, rechts `s`), normiert, sodass die Summe 1 ist.
- Faktor `16 · s(1−s) · t(1−t)`: 0 auf dem ganzen Rand (Rand bleibt exakt), maximal in der Mitte. Gegenstück zu `27·u·v·w` beim Dreieck.
- Stärke-Faktor wie beim Dreieck (0.65), Feinabstimmung per Augenschein.

Damit verhalten sich die gelben Hebel beim Quad **genauso** wie beim Dreieck: Jeder Punkt wölbt seinen Kantenabschnitt ins Innere.

**3. Gitter:** `divisions × divisions` Quads, je 2 Dreiecke. UVs = (s, t). Das ist ein Bonus: Texturen und Materialien liegen auf dem Quad sauber als Raster, ohne Verzerrung am Pol.

**Bewusst einfach gehalten (Ausbau später):** Eine „echte“ bikubische Hermite-Coons-Fläche, bei der die gelben Hebel exakt die Ableitung über die Kante festlegen, wäre der Weg zu G1 zwischen Patches. Das gehört zum späteren Kanten-Sharing.

---

## 5. Was gleich bleibt (nur auf n Ecken verallgemeinert)

| Bereich | Datei | Änderung |
| :--- | :--- | :--- |
| Punkte einfügen/löschen | `src/scene/triangle-patch-point-edit.ts` | keine Logik-Änderung (arbeitet auf Kanten/Segmenten), Ecken weiter geschützt |
| Anker drehen/schieben | `src/scene/triangle-patch-node-edit.ts` | keine |
| Gizmo | `src/engine/triangle-patch-gizmo-controller.ts` | Params-Feld je Kind lesen/schreiben, Kantenschleife n statt 3 |
| Add-Point-Modus | `src/engine/triangle-patch-add-point-tool.ts` | Kanten-Highlight/Hit-Test über n Kanten |
| Mirror | Build/Populate | unverändert, gilt für beide Kinds |
| Panel | `src/ui/panels/entity-fields/TrianglePatchFields.tsx` | wird für beide Kinds genutzt (Params-Feld als Parameter) |
| Store | `app-store-internals.ts`, `app-store-asset-params.ts` | Patch-Selektion / Add-Point-Modus auch für `quad-patch` |
| Materialien | `src/data/material-presets.ts` | `quad-patch` → dieselben Defaults wie `triangle-patch` |

## 6. Was neu ist

| Bereich | Datei | Inhalt |
| :--- | :--- | :--- |
| Default & Kind | `src/scene/asset-quad-patch.ts` | `defaultQuadPatchParams`, `isQuadPatchAssetKind` |
| Geometrie | `src/engine/quad-patch-geometry.ts` | `evalQuadPatchSurfacePoint(params, s, t)`, `buildQuadPatchGeometry` |
| Mesh | `src/engine/asset-meshes/populate-quad-patch.ts` | analog Triangle (inkl. Mirror-Kopien) |
| Registry/Katalog | `asset-kind.ts`, `asset-kind-registry.ts`, `asset-catalog.ts` | Kind `quad-patch`, Asset-Icon **„Quad Patch“** (Icon `Square`) |

---

## 7. Umsetzungsschritte

1. **Verallgemeinern:** `PatchParams` mit `cornerIds: string[]`, Helfer auf n Ecken. Triangle-Tests müssen unverändert grün bleiben (Regression).
2. **Quad-Geometrie** + Tests (siehe 8).
3. **Kind `quad-patch`:** Default, Registry, Katalog, Populate, Materialien.
4. **Gizmo / Add-Point / Store / Panel** für beide Kinds freischalten.
5. Augenschein im Viewport: Wölbung abstimmen.
6. `npx vitest run`, `npm run lint`, `npm run build` → `main`.

## 8. Tests

1. **Rand:** Flächenpunkte mit s ∈ {0,1} oder t ∈ {0,1} liegen exakt auf `evalEdge` der jeweiligen Kante.
2. **Ecken:** S(0,0), S(1,0), S(1,1), S(0,1) = Anker der 4 Ecken.
3. **Flach:** 4 Ecken in einer Ebene, gerade Kanten, Quertangenten 0 → Fläche ist eben (bilinear).
4. **Einfügen:** Add Point auf einer Quad-Kante ändert den Rand nicht.
5. **Wirkung:** `handleCrossIn` eines Kantenpunkts verschieben ändert das Innere, nicht den Rand.
6. **Regression Triangle:** bestehende Triangle-Tests unverändert grün.

## 9. Offene Punkte (beim Umsetzen klären)

- **Name im Asset-Panel:** neuer Eintrag „Quad Patch“. Soll der bestehende „Patch“ zur Unterscheidung in „Triangle Patch“ umbenannt werden? (Vorschlag: ja.)
- Exakte Gewichtung und Stärke der Wölbung: per Tests und Augenschein.

## 10. Später (nicht beauftragt)

- Kanten-Sharing / Snap zwischen Patches, G1 über gemeinsame Kanten (dann Hermite-Coons, siehe 4).
- Zebra-/Highlight-Ansicht zur Kontrolle der Lichtlinien.
- Umwandeln Triangle ↔ Quad.
