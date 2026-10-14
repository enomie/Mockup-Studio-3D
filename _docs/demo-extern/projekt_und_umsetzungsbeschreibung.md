# Minimalistisches Dreiecks-Patch CAD-Studio: Projekt- & Umsetzungsbeschreibung

---

## 1. Projektübersicht & Vision

Das Projekt realisiert ein leichtgewichtiges, browserbasiertes 3D-CAD-Studio zur Freiformflächen-Modellierung (*Class-A Surfacing*), das zwei Welten zusammenführt:
1. **Die intuitive Vektorbearbeitung aus 2D-Grafikprogrammen (Adobe Illustrator):** Keine unübersichtlichen Zahlenkolonnen oder starren Menüs, sondern direktes Verformen von Kanten und Flächen über Ankerpunkte und Hebel.
2. **Die geometrische Strenge industrieller CAD-Systeme:** Mathematisch exakte Flächenauswertung, formtreue Kurvenunterteilung, Echtzeit-Symmetrie und Packaging-Referenzen (Fahrwerk, Achsen, Spurweite).

Der fundamentale Paradigmenwechsel gegenüber traditionellen Systemen: Anstelle von starren, viereckigen NURBS-Gittern ($u \times v$-Grids), die an Karosserieübergängen zu Knitterpolen und Schnittkantenproblemen führen, basiert jede Fläche auf einem **Dreieckspatch**, dessen Kanten als freie Bézier-Pfade im Raum verlaufen.

---

## 2. Kernkonzept: Das Dreieckspatch als universelle Grundform

* **Warum Dreiecke?** Drei Punkte spannen im 3D-Raum immer eine vollkommen eindeutige, unverwundene Ebene auf. Dreiecke können sich in beliebige Richtungen verzweigen, ohne dass Kanten zusammengedrückt werden müssen.
* **Baryzentrische Triangulierung:** Jedes Bauteil wird intern in ein Netz gleichmäßiger, krümmungsangepasster Dreiecke zerlegt.
* **Pfad-basierte Begrenzung:** Die drei Kanten des Dreiecks sind keine simplen Geraden, sondern zusammengesetzte kubische Bézier-Pfade, die beliebig geschwungen sein können.

---

## 3. Das 4-Hebel-System pro Kontrollpunkt

Jeder Ankerpunkt eines Bauteils verfügt über exakt **vier Hebel**, die für eine vollständige Kontrolle über Kantenverlauf, Wölbung und Verrundung sorgen:

| Hebel | Farbe / Geometrie | Funktion & Auswirkung |
| :--- | :--- | :--- |
| **Kantenhebel Vorwärts (`handleNext`)** | Pink (Oktaeder) | Bestimmt Richtung und Krümmungsstärke des Kantenpfads zum nachfolgenden Punkt. |
| **Kantenhebel Rückwärts (`handlePrev`)** | Pink (Oktaeder) | Bestimmt Richtung und Krümmungsstärke des Kantenpfads zum vorherigen Punkt. |
| **Quertangente Innen (`handleCrossIn`)** | Amber (Oktaeder) | Spannt das Blech im Inneren des Bauteils bauchig auf (Wölbung / Volumen). |
| **Quertangente Außen (`handleCrossOut`)** | Gelb (Oktaeder) | Steuert den Abfallwinkel der Außenflanke und die Kantenverrundung. |

### Die Wippen-Kopplung (Illustrator-Prinzip)
Die Quertangenten Innen und Außen bilden eine durchgehende Achse durch den Ankerpunkt:
* Wird einer der beiden Hebel im Raum geneigt oder geschwenkt, **schwenkt der gegenüberliegende Hebel im selben Winkel mit**.
* Dadurch bleibt der Krümmungsübergang über die Kante hinweg mathematisch glatt ($G^1$-stetig), ohne dass ungewollte Falten oder Dellen entstehen.

---

## 4. Funktionsumfang im aktuellen Stand

### A) Neues Bauteil anlegen (`+ Neues Bauteil`)
* Erzeugt auf Knopfdruck ein neues, eigenständiges Dreiecks-Patch im Raum.
* Das neue Bauteil besitzt seine eigenen 3 Eckpunkte, Kantenpfade und Hilfslinien.
* Beliebig viele Bauteile können im selben Modellierbereich nebeneinander existieren.
* Ein Zähler in der Kopfleiste informiert über die Gesamtanzahl der Bauteile.

### B) Das Pfadpunkt-Hinzufügen-Werkzeug (Illustrator-Workflow)
* **Aktivierung:** Über den Button **„+ Pfadpunkt hinzufügen“** oder den Tastaturbefehl <kbd>P</kbd>.
* **Kanten-Erkennung:** Fährt der Anwender mit der Maus über eine Kante des aktiven Bauteils, folgt ein violetter Vorschau-Marker exakt der 3D-Kurve.
* **Formtreue Teilung nach de Casteljau:** Ein Klick auf die Kante fügt einen neuen Ankerpunkt an genau dieser Position ein. Durch die de-Casteljau-Unterteilung bleibt die bisherige Kurvenform zu **100 % identisch** – kein Verziehen, kein Springen der Blechhaut.
* **Vollwertige Ausstattung:** Der neue Punkt erhält automatisch alle vier Hebel und kann sofort frei verformt werden.

### C) Punkt-Parameter-Speicher (Copy / Paste & Snap)
* **📋 Kopieren (<kbd>Ctrl+C</kbd> / <kbd>Cmd+C</kbd>):** Speichert Position, Kantenhebel und Quertangenten des ausgewählten Punkts in die Zwischenablage.
* **📥 Einfügen (<kbd>Ctrl+V</kbd> / <kbd>Cmd+V</kbd>):** Überträgt die Hebel-Ausrichtung und Wölbungsparameter auf einen beliebigen anderen Punkt.
* **🧲 Auf Position andocken (Snap):** Setzt den gewählten Punkt exakt auf die 3D-Koordinaten des kopierten Punkts. Dies erlaubt das nahtlose Zusammenstecken zweier getrennter Bauteile an gemeinsamen Knotenpunkten.

### D) Echtzeit-Symmetrie & Mittenachsen-Koppelung
* Symmetrische Spiegelung aller Bauteile an der Fahrzeug-Mittelachse ($X = 0$).
* Die Spiegelflächen besitzen invertierte Normalen und Index-Reihenfolgen für fehlerfreie Lichtreflexe.
* Die beiden Mittelpunkte des ersten Bauteils sind an $X = 0$ verankert, um Spalten in der Karosseriemitte auszuschließen.
* Die Symmetrie lässt sich per Schalter im Header jederzeit an- und ausschalten.

### E) Orientierung & Packaging (Fahrwerk & Fahrtrichtung)
* **Fahrtrichtungs-Indikator:** Ein blau leuchtender Richtungspfeil sowie ein CAD-Boden-Badge (**„▲ VORNE / FRONT“**) auf dem Bodengitter zeigen unmissverständlich in Fahrtrichtung ($+Z$).
* **Maßstabsgetreues Fahrwerk:** Vier Räder im gängigen Format **225/45 R17** (Reifendurchmesser $634\,\text{mm}$, Reifenbreite $225\,\text{mm}$) mit Profilschultern, 17-Zoll-Alufelgen, Bremsscheiben und roten Bremssätteln.
* **Fahrzeug-Geometrie:** Feste Spurweite ($1.54\,\text{m}$) und fester Radstand ($2.65\,\text{m}$).
* **Fahrwerk-Toggle:** Über den Button **„Räder: An / Aus“** kann das Fahrwerk jederzeit ausgeblendet werden.

### F) Reines Blech & Kamera-Navigation
* **Linksklick im Leeren + Ziehen:** Kamera drehen (Orbit).
* **Rechtsklick + Ziehen:** Kamera im Raum verschieben (Pan).
* **Mausrad:** Stufenloser Zoom.
* **Klick in den leeren Raum:** Alle Hilfslinien, Hebel, Punkte und das Gizmo verschwinden vollständig. Es bleibt nur das makellose Karosserieblech sichtbar.
* **Klick auf das Blech:** Das entsprechende Bauteil wird aktiv, alle Hilfen werden eingeblendet und das Verschiebe-Werkzeug dockt an.

---

## 5. Technische Umsetzungsbeschreibung (Code-Architektur)

### A) Datenstruktur: `CADNode` & `CADPart`

```javascript
// Datenmodell eines Kontrollpunkts
class CADNode {
    pos: THREE.Vector3             // 3D-Position des Ankerpunkts
    handleNext: THREE.Vector3      // Vorwärts-Kantenhebel
    handlePrev: THREE.Vector3      // Rückwärts-Kantenhebel
    handleCrossIn: THREE.Vector3   // Innen-Quertangente (Wölbung)
    handleCrossOut: THREE.Vector3  // Außen-Quertangente (Flanke)
    meshAnchor, meshHandleNext...  // 3D-Repräsentationen im Szenengraph
}
```

Ein `CADPart` verwaltet:
* `corners`: Die 3 Haupt-Eckpunkte des Dreiecks.
* `edges`: Array mit 3 Kantenobjekten. Jede Kante enthält ein Array aus mindestens zwei `CADNode`-Instanzen (bei hinzugefügten Pfadpunkten entsprechend mehr).
* Vorallozierte `Float32Array`-Puffer für Vertices, Normalen und Spiegelgeometrien.

### B) Mathematische Flächenauswertung (`evalPatchSurface`)

Die Berechnung eines Oberflächenpunkts $P(u, v, w)$ erfolgt über baryzentrische Koordinaten ($u + v + w = 1$):
1. **Basisebene:**
   $$P_{\text{base}} = u \cdot A + v \cdot B + w \cdot C$$
2. **Kantenabweichungen (Bézier-Pfad-Einfluss):**
   Für jede Kante wird anhand der Kantenparameter der Versatz zwischen der linearen Kantenverbindung und der tatsächlichen kubischen Bézier-Kurve berechnet und gewichtet addiert.
3. **Wölbungseinfluss (Quertangenten):**
   Die inneren Quertangentenvektoren werden über die Wölbungsfunktion:
   $$W(u, v, w) = 27 \cdot u \cdot v \cdot w \cdot 0.65$$
   in das Flächeninnere eingerechnet. Dadurch erzeugt ein Anheben der inneren Hebel ein sanftes, gleichmäßiges Karosserievolumen in der Flächenmitte.

### C) Formtreue Pfadteilung (`addPointOnEdge` / de Casteljau)

Wird ein neuer Punkt bei Kurvenparameter $t \in [0, 1]$ auf ein Segment zwischen $P_0$ und $P_3$ gesetzt, berechnet der de-Casteljau-Algorithmus:
* $P_{01} = \text{lerp}(P_0, P_1, u)$
* $P_{12} = \text{lerp}(P_1, P_2, u)$
* $P_{23} = \text{lerp}(P_2, P_3, u)$
* $P_{012} = \text{lerp}(P_{01}, P_{12}, u)$
* $P_{123} = \text{lerp}(P_{12}, P_{23}, u)$
* $P_{\text{split}} = \text{lerp}(P_{012}, P_{123}, u)$

Der neue Punkt wird an $P_{\text{split}}$ platziert. Die Hebel des Vorgängers werden auf $P_{01}$, die des Nachfolgers auf $P_{23}$ angepasst. Dadurch bleibt die Kurve exakt erhalten, während ein vollwertiger neuer Steuerpunkt entsteht.

### D) Raycasting- und Interaktions-Hierarchie

Um Fehlklicks und blockierende Gizmos zu verhindern, arbeitet der Klick-Handler mit einer strikten Prioritätskette:
1. **Pfadpunkt-Werkzeug:** Klick auf erkannte Kante erzeugt sofort einen neuen Punkt.
2. **Aktive Griffe:** Klick auf Anker oder Hebel des aktiven Bauteils bindet das Transform-Gizmo.
3. **Gizmo-Interaktion:** Ziehen an den Achsen blockiert Kamera-Events.
4. **Blechklick:** Klick auf ein Bauteil aktiviert dieses und wählt den nächstgelegenen Ankerpunkt.
5. **Freier Raum:** Hebt alle Auswahlen auf und schaltet in den Clean-View-Modus.

---

## 6. Zusammenfassung

Das Studio demonstriert, dass anstelle überladener Parametermenüs eine kleine, durchdachte Anzahl geometrischer Werkzeuge genügt, um Karosserieflächen mit hoher Präzision zu formen. Durch die Kombination von Dreieckspatches, 4-Hebel-Steuerung, de-Casteljau-Kurventeilung und echter Fahrwerks-Referenz steht ein stabiles und intuitives Fundament für die automobile Freiformflächen-Modellierung bereit.