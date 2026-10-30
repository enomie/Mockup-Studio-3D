# Plan: Patch – Spiegeln („Mirror“)

Stand: 2026-10-30 · Status: umgesetzt (V1: X/Y/Z live, Checkboxen im Panel). Gizmo-Ziehen läuft über `setKindParams` → voller Rebuild, Kopien sind dadurch automatisch aktuell.

## 1. Was der User will

- Im rechten Panel des Patches Spiegelungen aktivieren: **X**, **Z**, oder **beide gleichzeitig**.
- Frage: geht auch **Y**?
- Ziel: symmetrische Formen bauen, ohne jede Hälfte/jedes Viertel doppelt zu modellieren.

## 2. Begriffe – was heißt „über Achse X spiegeln“?

Gemeint ist die Spiegelung an der Ebene **senkrecht** zur Achse, durch den Entity-Ursprung (Pivot):

| Schalter | Ebene | Wirkung auf Punkte |
| :--- | :--- | :--- |
| Mirror X | YZ-Ebene (x = 0) | x → −x |
| Mirror Y | XZ-Ebene (y = 0) | y → −y |
| Mirror Z | XY-Ebene (z = 0) | z → −z |

So arbeiten auch Blender (Mirror-Modifier) und Rhino. Im UI-Label daher „Mirror X“ usw., Tooltip „Mirror across the YZ plane (flips X)“.

**Raum: lokal (Entity), nicht Welt.** Die Patch-Punkte liegen im Entity-Raum (`PatchPoint.pos` ist lokal). Spiegeln im lokalen Raum heißt: Position/Rotation/Scale der Entity bewegen Original und Spiegelungen gemeinsam – die Symmetrie bleibt erhalten. Spiegelzentrum = Pivot der Entity.

## 3. Kombinationen

Die Schalter sind unabhängig; jede Kombination ergibt alle Vorzeichen-Varianten:

| Aktiv | Kopien gesamt (inkl. Original) | Spiegel-Varianten |
| :--- | :--- | :--- |
| X | 2 | (−x) |
| Z | 2 | (−z) |
| X + Z | 4 | (−x), (−z), (−x −z) |
| + Y | ×2 | jeweils zusätzlich mit −y |
| X + Y + Z | 8 | alle Oktanten |

Wichtig: „X+Z“ braucht die **diagonale** Kopie (−x −z), sonst fehlt ein Viertel. Das fällt automatisch heraus, wenn man über alle Vorzeichenkombinationen iteriert.

## 4. Y-Spiegelung – meine Einschätzung

**Technisch: ja, problemlos.** Für die Geometrie ist Y nur eine weitere Achse.

Praktisch zu beachten:
- Der Pivot sitzt typischerweise auf/nahe dem Boden. Die Y-Kopie landet dann **unter dem Ground**. Bei ausgeblendetem Ground (Settings) sieht man sie, sonst nicht – das ist korrekt, nur ggf. überraschend.
- Sinnvoll wird Y, wenn die Entity angehoben ist (Position Y > 0) oder für geschlossene Körper (z. B. Linse, Kissen: oben + unten).
- Ground-Spiegelreflexion (`groundMaterial` Mirror) ist etwas anderes und bleibt unberührt.
- Physik: Falls der Patch je einen Collider bekommt, liegt die Y-Kopie im Boden. Aktuell kein Thema.

**Empfehlung:** Y mit anbieten (gleicher Aufwand), Tooltip-Hinweis „Mirrored copy may sit below the ground“.

## 5. Ansatz: live (nicht-destruktiv) statt „Apply“

**Empfehlung: Live-Spiegelung** wie ein Modifier.
- Spiegelungen sind reine Anzeige-Kopien des einen Patches; bearbeitet wird nur das Original.
- Jede Änderung am Original (Punkt ziehen, Add Point, Hebel) erscheint sofort in allen Kopien.
- Abschalten = Kopien weg, nichts geht verloren.

„Apply Mirror“ (Kopien als eigene, unabhängige Patches/Entities erzeugen) wäre ein späterer Zusatz (siehe §11).

## 6. Datenmodell

In `TrianglePatchParams` (`src/scene/asset-triangle-patch.ts`):

```ts
export interface PatchMirror {
  x: boolean;
  y: boolean;
  z: boolean;
}

export interface TrianglePatchParams {
  // ...bestehend
  /** Live mirror copies across the local YZ / XZ / XY planes through the pivot. */
  mirror?: PatchMirror;
}
```

- Optional → alte Szenen/Presets laden ohne Migration (`undefined` = alles aus).
- `cloneTrianglePatchParams` kopiert `mirror` mit.
- Helfer: `getPatchMirrorSigns(mirror): Vec3[]` → Liste der Vorzeichen-Vektoren **ohne** (1,1,1), z. B. X+Z → `[(-1,1,1), (1,1,-1), (-1,1,-1)]`. Rein, testbar.
- Zugriff über bestehendes `setKindParams` → Undo/History wie alle anderen Patch-Änderungen.

## 7. Rendering

In `src/engine/asset-meshes/populate-triangle-patch.ts`:

- Original-Mesh wie bisher.
- Pro Vorzeichen-Vektor ein weiteres `Mesh`, das **dieselbe Geometrie und dasselbe Material teilt** und nur `scale.set(sx, sy, sz)` bekommt.
  - Kein Geometrie-Neuaufbau, kaum Speicherkosten.
  - Negative Skalierung dreht die Dreiecks-Wicklung; three.js erkennt die negative Determinante und kehrt Front/Back automatisch um. Material ist ohnehin `DoubleSide`. Normalen/Licht stimmen.
- `userData.assetMeshRole = 'trianglePatchMirror'`, `userData.isAssetScreen = true`, `castShadow`/`receiveShadow` wie Original.
- Dispose: geteilte Geometrie nur einmal freigeben (prüfen, wie `asset-system-rebuild.ts` beim Rebuild disposed – ggf. Kopien vor dem Dispose aus der Gruppe nehmen bzw. nur Original disposen).

Rebuild-Pfad: `mirror` steckt in `trianglePatchParams` → `setKindParams` triggert ohnehin den Rebuild über `asset-system-rebuild.ts`. Prüfen, ob das Gizmo-Live-Ziehen (`commitParams` im Gizmo-Controller) nur die Geometrie des Original-Mesh austauscht – dann teilen die Kopien die neue Geometrie **nicht** automatisch. Lösung: beim Geometrie-Tausch alle Meshes mit Rolle `trianglePatch`/`trianglePatchMirror` der Gruppe aktualisieren (ein Helfer `setPatchGeometry(group, geometry)`).

## 8. Interaktion im Viewport

- **Klick auf eine Spiegel-Kopie** wählt die Entity (wie Klick aufs Original). Das sollte über `isAssetScreen` / Gruppen-Zugehörigkeit schon funktionieren – verifizieren.
- **Gizmo/Handles nur am Original.** Keine Helfer an Kopien (sonst Verwirrung, welches editiert wird).
- **Add-Point-Modus:** Kanten-Hit-Test nur am Original (`triangle-patch-add-point-tool.ts` arbeitet auf den Params, nicht auf Kopien – passt).
- Optional, klein: Spiegelebene beim Aktivieren kurz als halbtransparente Fläche/Linie andeuten. Nicht für V1.

## 9. Nähte – wichtiger Hinweis

Eine Spiegelung schließt nur dann **nahtlos** an, wenn die Kante des Originals **auf der Spiegelebene** liegt (z. B. alle Punkte einer Kante mit x = 0 bei Mirror X). Sonst: Lücke oder Überlappung. Für G1-glatten Übergang müssen zusätzlich die Quertangenten an der Ebene senkrecht zu ihr stehen.

V1: keine Automatik, User positioniert selbst (XYZ-Felder im Inspector reichen dafür).
Später (§11): „Snap edge to mirror plane“.

## 10. Panel (rechts) – im bestehenden UI-Design

Neue `SubPanelSection title="Mirror"` in `TrianglePatchFields.tsx`, zwischen „Material“ und „Point & Handle Inspector“:

```
Mirror
  Mirror X   [ ]
  Mirror Y   [ ]
  Mirror Z   [ ]
```

- Bestehende Komponente `PanelCheckbox` (wie in Book/Fabric-Feldern) – kein neues UI-Element nötig.
- Labels englisch (AGENTS.md), Tooltips: „Mirror across the YZ plane (flips X)“ usw.; bei Y zusätzlich „May sit below the ground“.
- Alternative (kompakter, falls gewünscht): drei Toggle-Buttons X / Y / Z in einer Zeile. Empfehlung: erst Checkboxen, konsistent mit dem Rest.

## 11. Umsetzungsschritte

1. **Datenmodell + Helfer**: `PatchMirror`, `mirror?` in Params, Clone, `getPatchMirrorSigns`. Tests (Kombinationen 0/2/4/8, Diagonale bei X+Z).
2. **Rendering**: Kopien in `populate-triangle-patch.ts`, geteilte Geometrie, Dispose korrekt. Test: Anzahl Meshes je Kombination, Skalierungsvorzeichen.
3. **Live-Edit**: Geometrie-Tausch beim Gizmo-Ziehen auf alle Patch-Meshes der Gruppe anwenden.
4. **Panel**: Section „Mirror“ mit drei `PanelCheckbox` → `setKindParams`.
5. **Prüfen**: Auswahl per Klick auf Kopie, Schatten, Export (Kopien sind in der Gruppe → sollten mit exportiert werden), Undo/Redo, Speichern/Laden alter Szenen.
6. `npx vitest run`, `npm run lint`, `npm run build`.

## 12. Offene Punkte / spätere Ideen

- Spiegelzentrum: Pivot (Empfehlung) – oder frei wählbarer Offset pro Achse? Erst bei Bedarf.
- „Snap edge to mirror plane“ (Kante + Quertangenten an Ebene ausrichten → nahtlos, G1).
- „Apply Mirror“: Kopien als eigene, editierbare Patches erzeugen.
- Bounding-Box / Dimensions-Anzeige: Soll sie die Kopien einschließen? (vermutlich ja, automatisch über Gruppe – prüfen).
