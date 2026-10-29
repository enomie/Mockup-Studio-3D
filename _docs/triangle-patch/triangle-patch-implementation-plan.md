# Schlanker Implementierungsplan: Triangle Patch Asset (Fokus: Patch & Punkt-Gizmos)

## 1. Minimaler & Exakter Scope

**NUR das Patch und NUR die Punkt-Gizmos.**

Kein unnötiger Ballast:
- Keine Extra-Features wie Fahrwerk, Shading-Umschalter (Zebra etc.), Symmetrie-Mirroring oder sonstige CAD-Zusatzmenüs.
- **Nur der Dreiecks-Patch als platzierbares Asset.**
- **Nur die Punkt-Gizmos für die 3 Ecken (Ankerpunkte & Tangentenhebel) im Viewport und im Inspector.**

---

## 2. Die zwei Kern-Bestandteile

### 1. Das Asset "Patch"
- **Asset-Panel (links):** Ein neues Icon "Patch". Beim Anklicken platziert es ein Default-Dreiecks-Patch in der Szene. (Status: **Erledigt**)
- **Szenen-Panel (rechts):** Erscheint als `Patch 1` (wie gewohnt in der Szene-Liste). (Status: **Erledigt**)
- **Fläche im Viewport:** Ein Bézier-Dreiecks-Patch (Dreiecksfläche mit 3 Eckpunkten A, B, C und Wölbung aus dem Prototyp-Kernel). (Status: **Erledigt**)

### 2. Die Punkt-Gizmos & Interaktion (Herzstück)
Das gesamte Patch wird über seine Kontrollpunkte geformt:

1. **Visuelle Punkt-Elemente im Viewport:**
   - **Anker-Punkte (3 Ecken A, B, C):** Sichtbare Kugeln an den Ecken. (Status: **Erledigt**)
   - **Tangenten-Hebel:**
     - Pinke Hebel: Kantenverlauf vorwärts / rückwärts (`handleNext`, `handlePrev`). (Status: **Erledigt**)
     - Gelbe Hebel: Quertangenten für die Flächenaufwölbung (`handleCrossIn`, `handleCrossOut`). (Status: **Erledigt**)
   - Verbindungslinien vom Anker zu den jeweiligen Hebeln. (Status: **Erledigt**)

2. **Gizmo-Verhalten beim Verschieben & Drehen:**
   - **Klick auf Ankerpunkt:**
     - Translation (Verschieben): Bewegt den Ankerpunkt. Alle zugehörigen Hebel wandern starr mit. (Status: **Erledigt**)
     - Rotation (Drehen): Rotiert alle Hebel um den Ankerpunkt. (Status: **Erledigt**)
   - **Klick auf Tangentenhebel:**
     - Translation: Zieht den Hebel in Position. (Status: **Erledigt**)
     - Quertangenten (`CrossIn` / `CrossOut`): Automatische Wippen-Gegenkopplung (verändert man eine Seite, passt sich der Winkel der Gegenseite kontinuierlich an, wie im Prototyp). (Status: **Erledigt**)
   - **Ganzes Patch verschieben/rotieren:** Über die normale Objekt-Transformation, wenn die Fläche selbst ausgewählt ist. (Status: **Erledigt**)

3. **Rechtes Panel (Einstellungen zu den Punkten):**
   - Auswahl des Punkts (Ecke A, B, C) und des aktiven Hebels per Tabs und Dropdown. (Status: **Erledigt**)
   - Numerische XYZ-Felder für exakte Koordinaten. (Status: **Erledigt**)
   - Hebel-Länge (Stärke in mm) mit `-10%` / `+10%` Buttons. (Status: **Erledigt**)

---

## 3. Fortschritt der Umsetzungsschritte

- [x] **Schritt 1: Typ & Datenmodell**
  - `AssetKind = 'triangle-patch'`
  - 3 Punkte mit je: `pos`, `handleNext`, `handlePrev`, `handleCrossIn`, `handleCrossOut` in `src/scene/asset-triangle-patch.ts`.
- [x] **Schritt 2: Geometrie-Berechnung (Bézier-Patch)**
  - Reines Rechenmodul (`evalPatchSurfacePoint`, `buildTrianglePatchGeometry`) in `src/engine/triangle-patch-geometry.ts`.
  - Mesh-Populator `src/engine/asset-meshes/populate-triangle-patch.ts` mit DoubleSide PBR-Material.
  - Rebuild-Pipeline in `asset-system.ts` und `asset-system-rebuild.ts`.
- [x] **Schritt 3: Punkt-Gizmos & Interaktion im Viewport**
  - "Patch" Button im linken Asset-Katalog (`src/data/asset-catalog.ts`) mit Triangle-Icon hinzugefügt.
  - `TrianglePatchGizmoController` (`src/engine/triangle-patch-gizmo-controller.ts`):
    - Sichtbare Kugeln für Anker A, B, C; Octaeder für Pinke Kantenhebel & Gelbe Wölbungshebel; Verbindungslinien.
    - Anbindung an `SelectionController` & `ViewportInputController`: Klick auf einen Griff selektiert diesen direkt.
    - Transform-Events im `MockupEngine`:
      - Anker bewegen $\to$ alle 4 Hebel wandern starr mit.
      - Anker rotieren $\to$ alle 4 Hebel rotieren um den Anker.
      - Quertangenten bewegen $\to$ automatische Wippen-Gegenkopplung auf der Gegenseite.
      - Rebuild der Patch-Geometrie in Echtzeit bei Bewegung.
- [x] **Schritt 4: Right-Panel Settings**
  - Inspector-Komponente [`src/ui/panels/entity-fields/TrianglePatchFields.tsx`](file:///Users/johann/MyBrew/mockup-studio/src/ui/panels/entity-fields/TrianglePatchFields.tsx) erstellt und in `EntityPropertyFields.tsx` eingebunden.
  - Tabs für Ecke A, B, C; Dropdown für die Hebel (`pos`, `handleNext`, `handlePrev`, `handleCrossIn`, `handleCrossOut`).
  - XYZ-Felder synchronisiert mit der 3D-Geometrie und Store-Actions (`setTrianglePatchParams`).
  - Hebel-Längen-Anzeige in Millimetern mit `-10%` / `+10%` Skalier-Buttons.
