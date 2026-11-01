# Plan: Beverage Can — Top Ring aus SVG (`path_green`)

**Status:** Entwurf — wartet auf Freigabe
**Datum:** 2026-11-01

## Ziel

Der obere Ring (`topRing`) der Beverage Can wird — wie beim Pen — als **Lathe aus einem grünen Pfad im Profil-SVG** gebaut statt parametrisch aus `topRingCenterRadiusMm` / `topRingThicknessM` / `topRingHeightM`. Ring und Körper passen damit pro Profil (classic, sleek) exakt zusammen; neue Dosenformen brauchen nur ein SVG.

Tin Can bleibt unverändert (voll parametrisch).

## Authoring (User)

- `public/profiles/lathe/lathe-y-can-330ml-classic.svg` und `…-sleek.svg`: zusätzlicher Pfad `class="path_green"`, `stroke="#00ff00"` mit dem Ring-Halbprofil (geschlossene Kontur, x = Radius, im **gleichen Koordinatensystem** wie `path_red`).
- Ring = **geschlossene Kontur (Pillenform)**, berührt die Achse **nicht** (x > 0) → Lathe ergibt einen **Torus-artigen Ring** mit Loch, keine Scheibe bis zur Mitte (anders als heute beim Pen, dessen Profile offen bis x = 0 laufen).
- Überlappung Ring ↔ `path_red` ist ok (getrennte Meshes).
- `path_red` (Körper) bleibt unverändert.
- Konvention wie Pen → `lathe-svg-path-slots.ts`: Slot 0 = rot = Körper, Slot 1 = grün = Ring.

## Umsetzung (Code)

0. **Geschlossene Konturen im Lathe** (gemeinsam für Can + Pen, z. B. Helper in `lathe-svg-path-slots.ts` oder neues `lathe-closed-contour.ts`)
   - **Erkennen:** Kontur geschlossen, wenn `Z` im Pfad oder letzter Punkt ≈ erster Punkt (Toleranz), bzw. kein Punkt auf x ≈ 0.
   - **Schließen:** fehlt der Schlusspunkt → ersten Punkt anhängen (keine offene Naht).
   - **Wicklung normieren:** Vorzeichen der Fläche (Shoelace) prüfen; bei falscher Richtung Punkte umkehren, damit Normalen nach außen zeigen. Authoring-Richtung egal.
   - Offene Profile (bis zur Achse) bleiben unverändert → bestehendes Verhalten bricht nicht.
   - Normalen: an Konturknicken ggf. harte Kanten / `computeVertexNormals` prüfen; bei Pillenform weich ok.

1. **`src/engine/beverage-can-svg-profile.ts`**
   - Beide Slots lesen (`slots[0]` Körper, `slots[1]` Ring); Cache auf `{ body, ring }` umstellen.
   - **Wichtig:** Normalisierung (Skalierung X/Y, Y-Spiegelung) heute aus den Bounds des roten Pfads. Ring muss **dieselbe Transformation** (Body-Bounds) bekommen, sonst sitzt er falsch → Normalisierung in „Bounds berechnen“ + „Punkte transformieren“ aufteilen.
   - Neue Funktion liefert Ring-Punkte (Meter, Y oben, Fuß bei y = 0) oder `null`, wenn kein grüner Pfad.

2. **`src/engine/beverage-can-geometry.ts`**
   - `buildTopRingGeometry` → `LatheGeometry` aus Ring-Punkten (Segmente wie Körper).
   - `topRingMesh.position.y` entfällt (Punkte sind bereits absolut).
   - Mesh-Name, Rolle `topRing`, `topRingMetalMaterial`, Sichtbarkeit bleiben gleich.
   - **Fallback:** kein grüner Pfad → bisherige parametrische Geometrie (bis beide SVGs geliefert sind; danach optional entfernen).

3. **Label-Band** (`labelBandYBounds`, `beverage-can-label-unfold.ts`)
   - Obergrenze aus **Ring-Y-Minimum** (SVG) statt `heightM - topRingHeightM/2`.
   - Fixe `topRingHeightMm: 2.5` in `BEVERAGE_CAN_LABEL_METAL_ZONES_MM` prüfen/ablösen.
   - Da Unfold/Label-Fit teils synchron ohne SVG rechnet: prüfen, ob Ring-Bounds dort verfügbar sind (Cache) oder als Parameter durchgereicht werden müssen.

4. **Parameter aufräumen** (`src/scene/asset-beverage-can.ts`) — erst wenn Fallback entfällt
   - `topRingHeightM`, `topRingCenterRadiusMm`, `topRingThicknessM` + Legacy-Migration `topRingOuterRadiusMm`, Defaults `BEVERAGE_CAN_DEFAULT_TOP_RING_CENTER_RADIUS_MM`, Clamps, `sizeScale`-Skalierung entfernen.
   - Alte gespeicherte Szenen: unbekannte Felder ignorieren (kein Fehler).

5. **Tests**
   - `beverage-can-geometry.test.ts`, `beverage-can-label-*.test.ts` anpassen.
   - Neu: SVG mit rot + grün → Ring-Bounds korrekt transformiert (gleiche Skalierung wie Körper); SVG ohne grün → Fallback.

6. **Doku**
   - `_docs/requirements/requirements-assets-lathe.md` / Beverage-Can-Requirements: Slot 1 = Ring.
   - Nebenbei: `requirements-assets-pen.md` Z. 121 (Ring-Y-Lage veraltet) korrigieren.

## Pen (Folgeschritt)

- User zeichnet den Pen-Ring (`path_green` in `lathe-y-pen-marker.svg` / `lathe-y-pen-fountain.svg`) neu als geschlossene Pillenform um den Schaft.
- Code: Schritt 0 reicht — `pen-svg-profile.ts` / `pen-geometry.ts` nutzen dieselbe Normierung für den Ring-Slot; kein weiterer Umbau erwartet. Test analog (geschlossene Kontur → Ring mit Loch).
- Doku `requirements-assets-pen.md` (Ring = geschlossene Kontur, Z. 121 Y-Lage) aktualisieren.

## Reihenfolge

1. User liefert beide SVGs mit `path_green`.
2. Schritt 0 (geschlossene Konturen) + Schritte 1–3 + Tests (mit Fallback), Check: `npx vitest run`, `npm run lint`, `npm run build`, visuell im Viewport.
3. Schritt 4 (Parameter entfernen) + Doku.
4. Pen: neue SVGs vom User → Test + visueller Check.

## Offene Fragen

- Fallback dauerhaft behalten oder nach Lieferung beider SVGs entfernen? (Vorschlag: entfernen.)
- Soll das Label exakt an der Ring-Unterkante enden oder (wie heute) bis zur Ring-Mitte laufen?
