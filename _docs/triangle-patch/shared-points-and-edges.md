# Patches: Punkte kopieren, gemeinsame Kanten & gemeinsame Punkte

Stand: **umgesetzt und vom Nutzer getestet** (2026-10-31).
Gilt für Dreiecks- und Viereck-Patches. Hintergrund und verworfene Wege: `_docs/diaries/diary-code-decisions.md` (Eintrag „Gemeinsame Punkte statt synchronisierter Kopien“).

---

## 1. Punkt kopieren / einfügen

- Punktzeile im Inspector: **Copy** / **Paste**; im Viewport **Ctrl/Cmd+C / V** auf dem gewählten Punkt.
- Kopiert werden Position + Handles in **Weltkoordinaten** (Handles als Abstand zum Anker) → stimmt auch zwischen verschobenen/gedrehten Patches.
- Einfügen: **Position & Handles**, **Position Only** (eigene Handles wandern mit) oder **Handles Only**.
- Code: `src/scene/triangle-patch-point-clipboard.ts`, Store `patch-point-clipboard-store.ts`.

## 2. Kanten

Eine **Kante** ist immer das Stück zwischen zwei benachbarten Punkten. Panel-Sektion **„Edges“**:

- **Copy Edge** / **Paste Edge**: überträgt die Form einmalig (beide Endpunkte + die Handles ins Segment), Richtung automatisch nach Nähe.
- **Link Edge**: legt zwei Kanten **zusammen** → siehe 3. **Unlink** trennt wieder.
- **Pick Edge**: Kante im Viewport anklicken (orange hervorgehoben).

## 3. Gemeinsame Punkte (Knoten)

**Grundsatz (Nutzer):** Legt man zwei Kanten zusammen, gibt es danach an jedem Ende **einen** Punkt – aus 4 Punkten werden **2**. Es gibt keinen „Punkt des anderen Patches“ und keinen „Partner“ in der Bedienung.

- Ein gemeinsamer Punkt (**Knoten**) ist **einmal** in der Szene gespeichert (Weltkoordinaten) und wird von beiden Patches **benutzt** (`PatchPoint.nodeId`).
- Name eindeutig: **„Shared 1“, „Shared 2“, …**
- Beim Zusammenlegen: Position und Handles = **Mittelwert** beider ursprünglicher Punkte; alle Handle-Paare **gegenüber und gekoppelt**.
- Jeder Handle existiert im Knoten **einmal**:
  - rosa **entlang** der gemeinsamen Kante (von beiden Patches benutzt),
  - je Patch ein **gelber** Handle,
  - an Endpunkten je Patch ein **rosa Handle der Nachbarkante**.
- **Paare** (liegen sich gegenüber): gelb ↔ gelb; an Endpunkten rosa Nachbarkante ↔ rosa Nachbarkante; an inneren Punkten rosa vorne ↔ hinten.

### Bedienung eines gemeinsamen Punkts

- **Ein** Anker mit **allen** Handles, egal welcher Patch gewählt ist, in normalen Farben.
- **Gekoppelt (Standard):** Ziehst du einen Handle, dreht sein Gegenüber mit; **Längen bleiben frei**.
- **Shift + Ziehen:** löst genau das Paar des gezogenen Handles (der rosa Handle entlang der gemeinsamen Kante gehört zu keinem Paar).
- **Align handles opposite:** stellt gelöste Paare per **Mittelwert** wieder gegenüber und koppelt sie (ein Undo-Schritt).
- Inspector: Handle-Liste **Anchor Point, Pink 1–3, Yellow 1–2** (neutral nummeriert), Status „All handles opposite“ / „Some handles are free (Shift)“.

### Weitere Regeln

- **Punkt einfügen** auf einer gemeinsamen Kante → **ein** neuer gemeinsamer Punkt (Kurve wird in beiden Patches an derselben Stelle geteilt).
- **Punkt löschen** auf gemeinsamer Kante → verschwindet in beiden Patches.
- **Unlink** → die Endpunkte werden wieder getrennte Punkte (außer sie gehören noch zu einem anderen gemeinsamen Segment).
- **Patch verschieben/drehen** (nur einer gewählt) → seine Knoten wandern mit, der andere Patch verformt sich an der gemeinsamen Kante.
- **Patch löschen** → Knoten mit nur noch einem Nutzer werden wieder normale Punkte.
- **Mirror-Kopien** nehmen an Knoten nicht teil.
- **Undo/Redo** umfasst die Knoten.

## 4. Glatter Übergang (Kanten-Korrektur)

Die Fläche bleibt **Classic** (Coons-Rand + Mittel-Wölbung). Nur in einem Streifen an gemeinsamen Kanten wird die Neigung quer zur Kante korrigiert:

- `K(t)`: Neigung der Classic-Fläche quer zur Kante (numerisch, Ableitung 2. Ordnung).
- `D(t)`: `K` **nur um die Kantenachse gedreht**, bis ihr Queranteil in die Richtung der gekoppelten Handles zeigt (gelb an Kantenpunkten, rosa Nachbarkante an Ecken; dazwischen sphärisch interpoliert). Länge und Anteil entlang der Kante bleiben → Form bleibt Classic-ähnlich.
- `S = S_classic + Σ W_i · d_i · f(d_i) · σ_i · (D_i − K_i)` – `d_i` hält die Kante fest, `f` läuft über die Streifenbreite weich aus, `W_i` ist 1 an der eigenen und 0 (mit Steigung 0) an allen anderen Kanten, `σ` = 1 bei gekoppelten, 0 bei gelösten Paaren.
- Weil die gekoppelten Handles beider Patches gegenüber liegen, liegen beide Tangentialebenen gleich → **kein Knick**.
- Normalen an korrigierten Randpunkten **exakt** (Kantentangente × Neigung) → keine Lichtkante.
- Regler **Edge Blend** (Sektion „Linked Edges“): Streifenbreite 10–60 %, Standard 30 %.
- Unverbundene Patches: exakt Classic.

**Gemessen** (Tests): Knick entlang der ganzen gemeinsamen Kante < 0,1° (Classic ohne Korrektur: 10–55°), auch zwischen unterschiedlich gedrehten, ungleichen Patches; außerhalb des Streifens identisch zu Classic.

## 5. Daten & Code

| Was | Wo |
|---|---|
| Knoten (Erzeugen, Bearbeiten, Mittelwert, Abgleich) | `src/scene/patch-nodes.ts` |
| Knoten-Abgleich in der Engine | `src/engine/patch-node-sync.ts`, Speicherung im `EntityRegistry` |
| Kanten-Segmente, Formen kopieren, Gültigkeit | `src/scene/triangle-patch-edge-link.ts` (`edgeLinks` = Aufzeichnung gemeinsamer Segmente) |
| Einfügen/Löschen auf gemeinsamer Kante | `src/scene/triangle-patch-linked-edit.ts`, `triangle-patch-point-edit.ts` |
| Kanten-Korrektur | `src/engine/patch-edge-correction.ts` |
| Gizmo / Inspector / Edges-Panel | `triangle-patch-gizmo-controller.ts`, `TrianglePatchFields.tsx`, `PatchEdgesSection.tsx` |

Punkt-Felder: `nodeId` (gemeinsamer Punkt), `joint` / `pinkPair` (Sicht des Patches: gelbes / rosa Paar gekoppelt), `edgeLinks` (gemeinsame Segmente), `edgeBlend` (Streifenbreite).

## 6. Offen / später

- Ein gelber Handle **pro Kante** an Patch-Ecken (heute einer für beide Kanten).
- „**Make patch corner**“: selbst wählen, welche Punkte die 3/4 Ecken sind.
- Punkte, an denen mehr als zwei Patches zusammenkommen (Sternpunkte).
