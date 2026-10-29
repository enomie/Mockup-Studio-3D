# Planar Editor

2D-Editor zum Zeichnen und Bearbeiten von **Profil-Pfaden** (Bézier-Knoten, Pfadpunkt-Werkzeug) für spätere **Lathe (Revolve)** und **Extrude**. UI-Name: **Planar Editor**. Nicht verwechseln mit dem 3D-Dreieckspatch-Studio (eigenes Asset/Thema, gleiche Pfad-Mathematik langfristig).

Querschnitt Ownership → [`requirements-builtin-and-user-content.md`](./requirements-builtin-and-user-content.md). Undo, Redo, Browser-Neustart → [`requirements-history.md`](./requirements-history.md).

---

**Category:** UI / Libraries  
**Title:** Left Main — Reiter **Profiles**  
**Description:** **Left Main** Nav erhält einen Eintrag **Profiles** (Icon/Label wie andere Bibliotheken → [`requirements-look-and-feel.md`](./requirements-look-and-feel.md)). Inhalt: Liste aller **Profil-Dokumente** — Werkseitige (read-only) + User-Kopien. Pattern wie Materials/Colors: **Primary** in Sub = Liste; Zeilenaktionen konsistent mit List\|Detail → [`requirements-app-layout.md`](./requirements-app-layout.md). Built-ins: Badge **Built-in**, **kein** Löschen, **kein** Edit — nur **Ansehen** optional (Preview) oder direkt **Duplicate**. User-Einträge (`source: 'user'`): **Edit**, **Delete** (mit Referenz-Fallback TBD wenn Profil an Entity hängt).

---

**Category:** Profiles library  
**Title:** Duplicate, Edit, Delete  
**Description:** **Duplicate** (pro Zeile, auch bei Built-in): erzeugt `source: 'user'`, neuer stabiler `id`, Name z. B. `pen-marker (copy)` — editierbar. **Edit** nur bei `user`: öffnet **Planar Editor** (siehe unten). **Delete** nur bei `user`: Confirm wenn Profil von Szene-Entity referenziert; Fallback → Default-Built-in oder „Profil fehlt“-Hinweis am Asset (Detail in Asset-Requirements, wenn Lathe/Extrude-Entities existieren). Werk-Pfade unter `public/profiles/` bleiben Dateien; Built-in-Liste = Katalog + Import/Normalisierung (heute Lathe-SVGs) — **kein** Überschreiben der Werkdatei durch User.

---

**Category:** Planar Editor  
**Title:** Wo der Editor läuft (Viewport-Modus)  
**Description:** **Entscheidung:** Planar Editor **belegt den Viewport** (mittlere Spalte) — analog Fusion **Edit Sketch** (Grafikfenster = Skizze, nicht Side-Panel). 3D-Szene währenddessen **nicht** interaktiv (pausiert / ausgeblendet); Shell (Top, Left, Right) bleibt sichtbar. **Einstieg:** Profiles-Liste → **Edit** auf User-Profil **oder** „Ansehen“ bei Built-in (read-only, gleiche UI ohne Schreiben). **Ausstieg:** Top Main oder Sub-Header **Done** / **Finish** (Label TBD) — zurück zur normalen 3D-Viewport-Ansicht. **Nicht** v1: Editor nur in Left Sub (zu schmal für P-Werkzeug, Hebel, Zoom/Pan). Optional später: Mini-Preview in Sub, während Viewport 2D ist.

---

**Category:** Planar Editor  
**Title:** Speichern — Auto-Save, kein „Save“-Dialog  
**Description:** **Kein** separates Speichern im Editor. Jede gültige Änderung am Profil-Dokument wird **sofort** in den Store geschrieben (debounced, z. B. 300–500 ms nach letztem Drag). **Schließen** (Done) = nur Modus wechseln; Daten liegen bereits in `profiles[]` (Name TBD im Store). **Persistenz über Browser-Neustart:** nicht Session-only — über Projekt-/Workspace-Persistenz in [`requirements-history.md`](./requirements-history.md) (Profiles-Array + Blob/JSON der Kurven). Built-in-Duplicate: beim Duplicate einmal User-Eintrag anlegen; weiteres Auto-Save wie oben.

---

**Category:** Planar Editor  
**Title:** Pfad-Bearbeitung (Funktions-Minimum)  
**Description:** Gleiche Interaktionslogik wie Dreieckspatch-Demo (`_docs/demo-extern/`): kubische Segmente, Anker + Kantenhebel, **Pfadpunkt hinzufügen** (Werkzeug **P** / Toolbar) mit **de Casteljau** (formtreu). 2D: Punkte auf **Arbeitsebene** (v1: eine Ebene pro Profil, z. B. Lathe-Profil in X–Y, Achse **X = 0** — konsistent mit [`requirements-assets-pen.md`](./requirements-assets-pen.md)). **Keine** Cross-Hebel (nur Patch-3D). Lathe vs. Extrude: Metadaten am Profil (`profileKind: 'lathe-open' | 'extrude-closed'` o. ä.) — Editor-Verhalten gleich, Validierung (geschlossen/offen) beim Feature, nicht beim Zeichnen blockieren (TBD). Copy/Paste/Snap von Knotenparametern: **Ziel** v1, Priorität nach P-Werkzeug.

---

**Category:** Planar Editor  
**Title:** Abgrenzung & Status  
**Description:** **Status:** Spezifikation — **keine** Implementierung ohne User-Freigabe. Ersetzt nicht sofort SVG-Authoring in Illustrator; langfristig **Source of Truth** = serialisiertes Profil-Dokument, Export/Import SVG optional später. 3D-Revolve/Extrude-Engine-Anbindung → eigene Asset-/Feature-Requirements (nach stabilem Planar Editor + History). Lab/Sandbox (`labs/…`) out of scope für dieses Dokument, darf Vorbild liefern.
