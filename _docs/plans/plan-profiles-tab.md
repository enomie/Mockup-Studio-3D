# Plan A: Reiter „Profiles“ im Main Left Panel

Status: **Entwurf – wartet auf Freigabe.** Teil von `plan-profiles-2d-editor.md` (Schritt A).

## Ziel
Ein neuer Reiter „Profiles“ im linken Hauptpanel listet alle vorhandenen Profile.
In Schritt A wird **nur angezeigt**, nichts dupliziert oder bearbeitet (das kommt mit B).

## Ist-Zustand (recherchiert)
- Profile sind SVG-Dateien in `public/profiles/lathe/` (8 Stück: 3 Weinflaschen, 2 Dosen,
  2 Stifte, 1 Rad). `public/profiles/extrude/` ist leer.
- Jedes Asset hat seine eigene Dateizuordnung, z. B. `WINE_BOTTLE_SVG_FILE` in
  `src/scene/asset-wine-bottle.ts`, und Pen, Beverage can und Wheel car analog.
  Eine zentrale Liste der Profile gibt es nicht.
- Maße in mm stehen schon generiert in `src/data/lathe-profile-metrics.generated.ts`.
- Linkes Panel: Die Reiter sind in `src/ui/shell/shell-nav.ts` (`LEFT_SHELL_NAV`) definiert,
  das Routing passiert in `src/ui/shell/LeftSubPanel.tsx`.
  Vorlage für Listen ist `ArrangementsPanel.tsx` (`.tile-list`, eingebaute Einträge zuerst).
- Pfade in den SVGs heißen nur nach Farbe (`path_red`, `path_green`, …) und haben noch
  keine sprechenden Namen.

## Umsetzung
1. **Zentrales Profil-Register** `src/scene/profile-library.ts`
   - Typ `ProfileEntry`: `id`, `name`, `source: 'builtin'`, `file`, `usedBy`
     (Asset-Typ, z. B. „Wine bottle“). **Kein** Typ Lathe/Extrude: Profile sind neutral,
     das Asset entscheidet, ob gedreht oder extrudiert wird. Die Drehachse (X beim Rad)
     gehört zum Asset, nicht zum Profil.
   - 8 eingebaute Einträge mit lesbaren Namen, z. B. „Bordeaux bottle“,
     „Can 330 ml classic“, „Wheel (car)“.
   - Die Assets lesen ihren Dateinamen dann über dieses Register. Dadurch gibt es nur eine
     Quelle, und Schritt C wird leichter. Das Verhalten der Assets ändert sich nicht.
2. **Navigation:** In `LEFT_SHELL_NAV` kommt ein Eintrag `profiles` mit dem Label „Profiles“ und
   einem Lucide-Icon (`Spline`) dazu. Er steht nach „Assets“.
3. **`ProfilesPanel.tsx`** im Stil von Arrangements:
   - Eine flache Liste, eingebaute Profile zuerst, nach Name sortiert.
   - Jeder Eintrag ist eine Kachel mit kleinem Vorschaubild (das SVG selbst als `<img>`),
     dem Namen und darunter z. B. „Built-in · Wine bottle · 76 × 293 mm“.
   - Ein Klick wählt das Profil aus. Ein Infoblock zeigt dann Maße, Pfade
     (vorerst Farb-Slots) und welches Asset das Profil nutzt.
   - Der Button „Add new“ fehlt noch und kommt mit B.
4. **Store:** `selectedProfileId` im App-Store. Persistieren ist nicht nötig, weil es nur
   eingebaute Profile gibt.
5. **Tests:** Jeder Eintrag im Register zeigt auf eine existierende SVG-Datei und hat Metriken.
   Dazu ein Smoke-Test, dass das Panel rendert.

## Nicht in A
- Duplizieren und Bearbeiten (B), Auswahl in Bottle (C), Extrusion (D), Editor (E/F).
- Sprechende Pfadnamen in den Profilen. Die kommen mit dem Datenmodell in B.

## Fragen an dich
- Steht „Profiles“ an der richtigen Stelle nach „Assets“, oder lieber ganz unten?
- Sollen die Rad- und Stift-Profile auch in die Liste, also alle 8, oder vorerst nur
  Flaschen und Dosen?
