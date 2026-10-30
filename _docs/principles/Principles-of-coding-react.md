# Principles of Coding — React (Die Mechanik & Montage)

React ist kein Programmierparadigma, sondern eine Zustandsmaschine mit Rendering-Pipeline. Hier geht es um reaktive Mechanik.

* **UI als reine Funktion des Zustands:** $UI = f(State)$. Keine DOM-Manipulationen von Hand, keine doppelten Buchführungen.
* **State-Hierarchie:**
* Lokaler UI-State gehört in die Komponente.
* Getriebener State gehört nach oben (*Lift State Up*).
* Berechenbarer State wird **niemals** in `useState` dupliziert, sondern direkt abgeleitet (`useMemo` nur bei teurer Berechnung).


* **Der Render-Zyklus als physikalische Realität:** Verstehe, wann und warum re-gerendert wird. Renderings sind unvermeidbar, aber Seiteneffekte gehören isoliert.
* **Trennung von Logik und Darstellung:** Custom Hooks kapseln das Verhalten; Komponenten rendern nur Markup und binden Events an.
