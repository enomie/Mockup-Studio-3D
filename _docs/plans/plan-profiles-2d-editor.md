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

## Offene Fragen
- Datenmodell eines Profils (SVG-Pfad vs. eigene parametrische Struktur)?
- Wie weit geht „parametrisch“ im MVP (Maße/Constraints oder nur numerische Punktwerte)?
- Offene vs. geschlossene Pfade (Lathe braucht offen/halbes Profil, Extrusion geschlossen)?
- Reihenfolge: A → B → C → D, Editor (E/F) wächst parallel ab B.
