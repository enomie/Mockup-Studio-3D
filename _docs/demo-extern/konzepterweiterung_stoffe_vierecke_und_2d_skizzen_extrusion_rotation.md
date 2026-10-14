# Konzepterweiterung: Stoffe, Vierecke & parametrische 2D-Skizzen

Dieses Dokument erklärt zwei zentrale Fragestellungen zur Weiterentwicklung des minimalistischen CAD-Studios:
1. **Können mit der Dreiecks-Architektur auch organisch fließende Formen (wie ein Seidentuch) modelliert werden, oder braucht man dafür Vierecke?**
2. **Können dieselben Bézier-Pfade in 2D als Konstruktionsskizze genutzt werden, um daraus Drehteile (Rotation) oder Profile (Extrusion) zu erzeugen?**

---

## 1. Weiche Formen & Textilien: Dreiecke vs. Vierecksraster

### Die Fragestellung
> *„Wir haben aktuell eine Dreiecks-Architektur. Was ist, wenn ich z. B. ein weich fallendes Seidentuch modellieren möchte – brauche ich dafür zwingend ein klassisches Vierecksraster?“*

### Die Antwort: Nein, Dreiecke sind dafür sogar der weltweite Standard

* **Wie die Industrie arbeitet:**  
  Professionelle Tuch- und Modeprogramme (z. B. *Marvelous Designer*) sowie Echtzeit-Physik-Engines in Animationsfilmen und Videospielen zerlegen Stoffe **immer in Dreiecksnetze**. 
* **Warum Dreiecke ideal für Tuch sind:**  
  Stoff dehnt sich, staucht sich und bildet unregelmäßige Falten, wenn er über Hindernisse fällt. Ein Dreiecksnetz kann sich in jede beliebige Richtung verwinden, ohne dass Geometrie einknickt oder künstlich gedehnt werden muss.

### Warum Vierecke (Quads) bei Stoffen trotzdem oft genannt werden
Vierecksgitter haben bei Textilien vor allem einen visuellen Grund: das Webmuster.
* Stoff besteht aus **Kette und Schuss** (zwei Fadenrichtungen, die im $90^\circ$-Winkel aufeinanderliegen).
* Hauptfalten folgen oft genau diesen Fadenrichtungen.
* Designer empfinden es manchmal als aufgeräumter, entlang dieser Faserachsen zu modellieren.

### Die Lösung in unserer Architektur: Zwei Dreiecke ergeben jedes Viereck
Im aktuellen Studio muss dafür kein neues System gebaut werden:
* **Zwei Dreiecke teilen sich eine Kante:**  
  Steckt man zwei Dreieckspatches an einer gemeinsamen Kante zusammen (Snap-Funktion), entsteht geometrisch ein **vollwertiges Viereck**.
* **Kein Nachteil gegenüber Vierecksnetzen:**  
  Da alle Kanten über Bézier-Hebel gesteuert werden und das Innere über Wölbungstangenten verfügt, lassen sich sowohl quadratische Stoffbahnen als auch fließende, runde Faltenwürfe ohne Einschränkung formen.

---

## 2. 2D-Skizzen mit Extrusion und Rotation (Drehteile)

### Die Fragestellung
> *„Ich werde später auch Bauteile brauchen, bei denen ich eine 2D-Kontur zeichne und diese extrudiere (in die Länge ziehe) oder rotiere (um eine Achse drehe), um einen Körper zu erzeugen. Funktionieren dieselben Pfadpunkte und Anker exakt gleich in 2D? Kann das fertige 3D-Bauteil im Raum bewegt, skaliert und bei Bedarf wieder in der Skizze bearbeitet werden?“*

### Die Antwort: Ja, das ist das klassische „Sketch & Feature“-Prinzip moderner CAD-Systeme

Genau so arbeiten führende CAD-Werkzeuge (z. B. Fusion 360, Siemens NX, CATIA): Eine zweidimensionale Vektorskizze dient als Bauplan, der durch eine mathematische Operation in ein dreidimensionales Volumen verwandelt wird.

```
[ 2D-Bézier-Skizze ] ──── (Extrusion / Rotation) ────► [ 3D-Bauteil-Container ]
         ▲                                                       │
         └───────────── „Skizze bearbeiten“ ◄────────────────────┘
```

### So funktioniert das im Detail:

#### A) Dieselben Pfade und Hebel – nur auf eine Ebene fixiert
* Ein Pfadpunkt in 2D verhält sich **zu 100 % identisch** wie im bisherigen 3D-Studio:
  * Er hat einen Ankerpunkt.
  * Er hat Vorwärts- und Rückwärts-Hebel für die Kantenkrümmung.
  * Er besitzt die Wippen-Kopplung für glatte Übergänge ($G^1$) oder Knicke ($G^0$).
* **Der einzige Unterschied:** Die Punkte bewegen sich nicht frei im Raum, sondern liegen fest auf einer Arbeitsebene (z. B. flach auf dem Boden oder senkrecht an einer Wand).

#### B) Die beiden Kernoperationen

1. **Extrusion (Lineares Ziehen):**
   * Man zeichnet eine geschlossene Kontur (z. B. ein Karosserieprofil, eine Scheibenleiste oder einen Träger).
   * Das System zieht dieses Profil entlang einer Achse in die Tiefe.
   * Es entsteht ein massiver Körper oder ein hohles Profil mit exakt derselben Querschnittsform.

2. **Rotation / Drehteil (Lathe / Revolve):**
   * Man zeichnet eine Kontur (z. B. den halben Querschnitt einer Autofelge, einer Radnabe oder einer Auspuffblende).
   * Man definiert einen Mittelpunkt bzw. eine Drehachse.
   * Das System schwenkt die Kontur um $360^\circ$ im Kreis.
   * Es entsteht ein perfekt rotationssymmetrisches 3D-Objekt.

#### C) Der Bauteil-Container: Bewegen, Skalieren & Zurück zur Skizze
Das erzeugte 3D-Volumen wird wie ein fertiges Objekt in der Szene abgelegt:
* **Freie Manipulation:**  
  Das Bauteil erhält ein eigenes 3D-Gizmo. Man kann es greifen, im Raum verschieben, schräg einbauen oder in der Größe skalieren.
* **Parametrische Rückkopplung („History / Feature Tree“):**  
  Das Bauteil verliert seine Herkunft nicht. Klickt man auf **„Skizze bearbeiten“**, wechselt die Kamera zurück auf die 2D-Ebene.
* **Automatische Live-Aktualisierung:**  
  Verschiebt man in der Skizze einen Bézier-Hebel, berechnet der Computer das 3D-Objekt im selben Moment neu. Das Bauteil passt seine Form an, behält aber seine aktuelle Position und Drehung im Raum bei.

---

## 3. Fazit

Beide Anforderungen fügen sich nahtlos in die bestehende Philosophie ein:

1. **Stoffe & Flächen:** Das System benötigt keinen Bruch in der Mathematik – ein Viereck ist schlicht der Verbund aus zwei Dreiecken mit gemeinsamer Bézier-Kante.
2. **Skizzen & Volumen:** Das Anker- und Hebel-Prinzip aus Adobe Illustrator ist universell. Es steuert Freiformflächen im 3D-Raum genauso präzise wie 2D-Profile, aus denen Drehteile oder Schwellerextrusionen entstehen.