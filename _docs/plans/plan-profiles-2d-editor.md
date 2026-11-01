# Plan (Notiz): Profiles-Reiter, 2D-Profil-Editor, Extrusion-Asset

Status: **Nur besprochen – noch nicht freigegeben.** Kein Code bis zur Freigabe.

## Vision
Mockup Studio = „AutoCAD für Kinder (und Werbeagenturen)“. Langfristig soll man alles
modellieren können – aber nicht auf dem gewohnten CAD-Weg, sondern einfach und zugänglich.

## Nächste Schritte

**A) Neuer Reiter „Profiles“ im Main Left Panel**
- Listet alle vorhandenen Profile (z. B. Bottle-/Can-Profile, Lathe-SVGs).

**B) Profile duplizierbar & editierbar**
- Duplizieren aus der Liste; Bearbeiten in einem eigenen 2D-Editor.

**C) Profile in Bottle auswählbar**
- Beim Anlegen einer neuen Bottle kann ein (eigenes) Profil gewählt werden.

**D) Neues Asset „Extrusion“ (Name offen)**
- Profil auswählen + Tiefe + Material → fertig.

**E) 2D-Editor: Mischung aus Illustrator und Fusion 360**
- Parametrisch (Fusion-Prinzip), dazu Zeichenkomfort à la Illustrator.
- Pfadsegmente: Geraden, Radien/Bögen, Kurven.
- Punkte hinzufügen, entfernen, Pfad an einem Punkt aufbrechen.
- Klein anfangen: nur das Nötigste.

**F) UI des 2D-Editors**
- An bestehende UI angelehnt: simpel, minimalistisch.
- Große, gut greifbare Handles (keine Minipunkte).
- Gegenüberliegende (gespiegelte) Tangenten-Handles; Aufbrechen per Shift – wie bei der PATCH-Geometrie.

## Entscheidungen (Besprechung 2026-11-01)

1. **Speicherformat:** das, was einfacher geht – eigene parametrische Struktur ist ok, muss
   nicht SVG sein. SVG-Import/-Export später andenken.
   - **Benannte Pfade/Teile:** Pfade im Profil bekommen Namen, die 1:1 in den Asset-Details
     erscheinen (Geometries / Materials), z. B. Wheel Car: „Tire“, „Rim“; Wine bottle: „Glass“,
     „Cork“, „Capsule foil“, „Capsule disc“, „Label“.
2. **Parametrisch (MVP):** was es für Flasche/Dose braucht – Positionen, Radien, Tangenten;
   Segmenttypen: Gerade, Bogen (Radius), Kurve/Spline. Keine allgemeinen Constraints im MVP.
3. **Offen vs. geschlossen ist kein Kriterium (korrigiert):** Auch offene Pfade lassen sich
   extrudieren, dann entsteht kein Volumen, nur eine Hülle. Ein Profil ist einfach eine Sammlung
   benannter Pfade. Ob ein Pfad offen oder geschlossen ist, ist eine Eigenschaft des Pfads.
   Ob gedreht (Lathe) oder extrudiert wird, entscheidet das Asset, das das Profil nutzt.
   Jedes Profil ist in Bottle und in Extrusion wählbar (das Ergebnis darf auch „weird“ aussehen).
4. **Reihenfolge:** A (Profiles-Reiter) zuerst.

## Nebenbei erledigt
- Wine bottle: „Label“ steht in der Geometries-Liste jetzt ganz unten
  (siehe `plan-wine-bottle-label-order.md`).
