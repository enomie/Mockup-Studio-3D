# Development Workflow

Wie wir Mockup Studio 3D bauen: **zuerst verstehen und aufschreiben**, dann **Gemeinsamkeiten finden**, dann **mit Inventur implementieren** — sauberer Code statt ständigem Umbau.

Siehe auch: [`requirements-code.md`](./requirements-code.md) (technische Regeln), [`requirements-and-project-description.md`](./requirements-and-project-description.md) (Projektkontext).

---

**Category:** Workflow  
**Title:** Docs first — kein vorzeitiger Code  
**Description:** Jedes Feature, jedes System und jede größere Entscheidung wird **zuerst in Requirements dokumentiert**, bevor Code geschrieben wird. Ziel: kein Code, der später „100× adaptiert" werden muss, weil Anforderungen und Querschnitt unklar waren. Der Agent implementiert **nicht proaktiv**, solange der User in der **Dokumentationsphase** ist. Pro Domäne eine Kategorie-Datei (`requirements-lighting.md`, `requirements-camera.md`, …). Index in `requirements-and-project-description.md` pflegen.

---

**Category:** Workflow  
**Title:** Phase 1 — Alles aufschreiben  
**Description:** User und Agent klären **vollständig**, was das System können soll: UI, Engine, Datenmodell, Grenzfälle, Serialisierung. Offene Punkte als Requirement mit „TBD" markieren oder explizit klären — nicht im Code „ausprobieren". Neue Requirements ans **Ende** der Datei, bestehende Blöcke nicht überschreiben. Format: `_docs/templates/template-requirement.md`.

---

**Category:** Workflow  
**Title:** Phase 2 — Gemeinsame Nenner finden  
**Description:** Wenn mehrere Systeme parallel entstehen (z. B. Lighting, Scene Placement, Camera, Assets, Export): **erst** die **Querschnitt-Themen** identifizieren und dokumentieren — typischerweise in [`requirements-architecture.md`](./requirements-architecture.md). Beispiele: ein **Entity-/Placement-Modell** für Lichter und Meshes; eine **Scene-API** als einzige UI↔Engine-Grenze; **Store-Shape** für Panels; **Preset-/Save-Format** für Kamera und Szene. Regel: **ein Muster, viele Features** — nicht pro Feature eine eigene Ad-hoc-Lösung. Abstraktionen werden in Docs benannt, **bevor** die erste Zeile Implementierung steht.

---

**Category:** Workflow  
**Title:** Phase 3 — Inventur vor Implementierung  
**Description:** Bevor Code geändert wird, **Bestand aufnehmen**: Welche Module existieren bereits? (`src/scene/scene-api.ts`, `src/engine/`, Store, Controller, Render, Physics.) Passt das neue Feature in bestehende Strukturen? **Erweitern** statt parallel neu bauen. **Refactoring** nur im direkt betroffenen Scope, wenn es die Integration vereinfacht. Keine zweite API-Schicht, keine duplizierten Typen, keine Engine-Logik in React. Entfernte Dateien direkt löschen — die Git-History bewahrt sie.

---

**Category:** Workflow  
**Title:** Phase 4 — Sauberer, klarer Code  
**Description:** Code soll **lesbar, minimal und konsistent** sein: ein Verantwortungsbereich pro Modul, klare Benennung, Constants statt Magic Numbers, Strict TypeScript, Englisch in `src/**`. UI = React-Chrome; Engine = Vanilla TS (Three WebGPU, Rapier). Bei jeder Umsetzung: **bestehenden Code mit optimieren**, wenn er das Feature berührt (z. B. Scene-API vereinheitlichen, tote Pfade entfernen) — ohne unrelated Drive-by-Refactors. Vor Abschluss: `npm run lint`, `npm run build` grün.

---

**Category:** Workflow  
**Title:** Wann implementieren?  
**Description:** Implementierung startet, wenn (1) die betroffenen Requirements **geschrieben** sind, (2) Querschnitt / gemeinsame Nenner **geklärt** sind (oder bewusst als „später" markiert), und (3) der User **explizit** zur Umsetzung auffordert — oder die Projektphase von „nur Docs" zu „Docs + Code" wechselt. Im Zweifel: **weiter dokumentieren** oder **nachfragen**, nicht raten.

---

**Category:** Workflow  
**Title:** Übergangsdocs (`_docs/plans/`)  
**Description:** Größere Modell- oder Architekturwechsel **zuerst** in einem **Übergangsdoc** planen (Ist/Soll, Phasen, offene Punkte, Checkliste welche Requirement-Dateien folgen) — **ohne** sofort die normativen Kategorie-Dateien zu überschreiben. Beispiel: [`../planning/transition-material-profile-and-entity-albedo.md`](../planning/transition-material-profile-and-entity-albedo.md). Nach Freigabe: Inhalt in `requirements-architecture.md` und betroffene Kategorien **überführen**; Übergangsdoc als erledigt markieren oder archivieren. Index-Verweis in `requirements-and-project-description.md`.

---

**Category:** Workflow  
**Title:** Git — nur `main`  
**Description:** Es gibt **nur den Branch `main`** — dort ist immer der aktuelle Stand, den der User lokal testet (`git checkout main` → `git pull` → `npm run dev`). Der Agent darf technisch auf einem Arbeitsbranch entwickeln, **merged aber am Ende jeder Aufgabe** nach `npm run lint`, `npm test`, `npm run build` (und Browser-Check bei UI) **direkt in `main`**, pusht und nennt dem User den Commit. **Keine** liegengebliebenen Seiten-Branches; parallele Sessions arbeiten nie auf eigenen Langläufer-Branches. Vor Beginn einer Aufgabe: `git pull` auf `main`, damit nicht auf einem veralteten Stand gebaut wird.

---
