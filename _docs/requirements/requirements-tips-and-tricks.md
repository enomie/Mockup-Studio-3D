# Tips & Tricks

Sammelbecken für Workarounds und Praxis-Wissen aus dem Alltag mit Mockup Studio 3D. **Kein Feature-Scope** — hier landen Tipps, die später in offizielle Kategorie-Requirements promotet werden (`requirements-shadows.md`, `requirements-ground.md`, …).

## Format (pro Tipp)

```markdown
**Category:** …
**Title:** …
**Symptom:** …
**Ursache:** …
**Fix (UI):** …
**Später promoten nach:** … (optional)

---
```

Neue Tipps **ans Dateiende** anfügen. Bestehende nicht überschreiben.

---

**Category:** Shadows / Environment / Lighting  
**Title:** White Studio — Schatten auf weißem Boden sichtbar machen  
**Symptom:** Sky Horizon + Zenith `#FFFFFF`, Ground Color `#FFFFFF` → keine sichtbaren Schatten auf dem Boden. `Receive shadows` ist an, Schatten wirken „weg".  
**Ursache:** Kein Bug — Shadow Maps und `receiveShadow` funktionieren. Auf hellem Albedo fehlt Kontrast: Key + Fill (beide Cast shadows), Ambient und **IBL** (Reflections aus Sky-PMREM via `scene.environment`) überstrahlen Schattenbereiche. Weißer Sky verstärkt das: PMREM liefert helle indirekte Beleuchtung auch in Schatten. Siehe Engine: `src/render/environment-map.ts`, `src/render/shadow-setup.ts`.  
**Fix (UI):**
1. **Left → Environments → Softbox** (moderates IBL + hellgrauer Studio-Boden) — schnellster Preset-Weg; sonst **Environment → Reflections → Intensity** stark senken (oder Eye aus) — größter Effekt bei weißem Sky
2. **Lighting → Key → Intensity** erhöhen — mehr direktes Licht = dunklere Schatten relativ zum Weiß
3. Optional: **Fill → Cast shadows** deaktivieren
4. Optional: **Fill ratio** senken, **Ambient intensity** senken
5. Optional: Off-White statt Reinweiß für Sky/Ground (z. B. `#F5F5F5`)

**Später promoten nach:** [`requirements-shadows.md`](./requirements-shadows.md), [`requirements-reflections.md`](./requirements-reflections.md), [`requirements-ground.md`](./requirements-ground.md); White-Studio-Look als Built-in in [`requirements-environments.md`](./requirements-environments.md) oder Scene in [`requirements-scenes.md`](./requirements-scenes.md).

---

**Category:** Wartung / Dependencies / Shadows  
**Title:** Wöchentliche Wartung — Three.js ShadowNode-Shim (`applySpotShadowCast`)  
**Symptom:** — (proaktiv, kein akuter Bug solange Shim aktiv)  
**Ursache:** Workaround für Three r186 WebGPU: Runtime-Toggle von `light.castShadow` kann `depthTexture`-Crash beim Light-Rig-Umschalten auslösen. Shim hält `castShadow` an und nutzt `shadow.intensity` 0/1.  
**Fix (wöchentlich prüfen):**
1. **Three.js Release / `dev`:** Ist [PR #34353](https://github.com/mrdoob/three.js/pull/34353) (oder gleichwertiger null-Guard in `ShadowNode.updateBefore`) in einer veröffentlichten Version?
2. **Wenn ja:** `package.json` → `three` upgraden, Shim entfernen (`applySpotShadowCast`, Diary-Eintrag 2026-10-09 Spot castShadow), wieder direktes `light.castShadow` in `LightingSystem`.
3. **Regression:** Szene mit ≥2 Assets; Light rigs Default → Dramatic → Softbox; Fill **Cast shadows** an/aus — keine Console-Errors, Schatten wie erwartet.
4. **Wenn nein:** Eintrag im Diary unverändert lassen; nächste Woche erneut.

**Später promoten nach:** — (entfällt nach Shim-Entfernung); Entscheidung → [`diary-code-decisions.md`](../diaries/diary-code-decisions.md) (2026-10-09 Spot castShadow).

---

**Category:** Images / Viewport  
**Title:** PNG mit Transparenz — schwarzer oder weißer „Hintergrund“  
**Symptom:** Transparentes PNG auf Asset wirkt wie schwarzes Rechteck, oder (Flasche) wie weiße Fläche statt Glas; Dosen-Label liest spiegelverkehrt.  
**Ursache:** Engine ignorierte Textur-Alpha / falscher Materialpfad (Dosen-Underlay vs. Glas-Blend) / zylindrisches **U** nicht auf Front **+Z** zentriert.  
**Fix (Engine, 2026-10-10):** [`requirements-images.md`](./requirements-images.md) (Alpha / Transparenz), Asset-Docs Beverage can / Tin can / Wine bottle; Code `image-surface-alpha.ts`, `cylindrical-label-uv.ts`.  
**Später promoten nach:** — (bereits in Requirements).

---

**Category:** Environment / Viewport helpers  
**Title:** Forward arrow — Richtung +Z  
**Symptom:** Unklar, wohin der Boden-Pfeil zeigt oder was „Forward“ in der Szene bedeutet.  
**Ursache:** Pfeil ist kein Kamera-Forward und zeigt nicht zum Key Light — feste Studio-Weltorientierung.  
**Fix (UI):** **Environment → Viewport helpers → Forward arrow** aktivieren. Der Pfeil liegt auf der Bodenebene und zeigt in **Welt +Z** — dieselbe Richtung wie die **blaue** Achse bei **World origin**. Anker folgt dem Scene center (wie andere Helpers). Details → [`requirements-environment.md`](./requirements-environment.md) (*Forward arrow (+Z)*).  
**Später promoten nach:** — (Norm in Requirements; Tipp nur für Lesbarkeit im Panel).

---

**Category:** Environment / Viewport helpers / Lighting  
**Title:** Spot beams — Kegel an Key/Fill  
**Symptom:** Man sieht Fixture-Discs, aber nicht Richtung oder Öffnungswinkel der Spots.  
**Ursache:** Fixtures sind Mockup-Look; Richtung/Kegel sind ein separates Overlay.  
**Fix (UI):** **Environment → Viewport helpers → Spot beams** (nicht **Lighting → Show fixtures**). Zeigt pro aktivem Key/Fill einen **SpotLightHelper** — Richtung und harter Kegel, Anzeigelänge **8 m**. Export WYSIWYG wenn Toggle an. Details → [`requirements-environment.md`](./requirements-environment.md) (*Spot beams*).  
**Später promoten nach:** — (Norm in Requirements).

---
