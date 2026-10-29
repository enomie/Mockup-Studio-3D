# History & Browser-Persistenz

Querschnitt für **Undo/Redo** und **Daten über Browser-Neustart** (Tab schließen, Reload, neuer Tag). Gilt für die App insgesamt; **Planar Editor** ist erster intensiver Nutzer (jeder Hebel-Drag = History-Eintrag). Editor-spezifische UI → [`requirements-planar-editor.md`](./requirements-planar-editor.md).

---

**Category:** Architecture  
**Title:** Zwei getrennte Probleme  
**Description:** (1) **Session-History** — Undo/Redo innerhalb einer laufenden App (Stack, transient). (2) **Workspace-Persistenz** — welche Daten nach Reload noch da sind (durabel im Browser). Beides zusammen planen, aber **nicht** einen Mechanismus für beides: Undo-Stack wird **nicht** als vollständiger JSON-Dump jedes Schritts in IndexedDB geschrieben; persistiert wird der **aktuelle** Stand (+ ggf. letzter Scene-Snapshot). Nach Reload: **kein** Undo in alte Session (v1 akzeptiert) — nur wiederhergestellter Stand.

---

**Category:** History  
**Title:** Undo / Redo — Scope v1  
**Description:** **Global** oder **kontextuell:** v1 **kontextuell** — im **Planar Editor** eigener Stack (nur Kurven-/Knoten-Ops); in **3D-Viewport** später separater Stack (Transform, Place, …). **Nicht** v1: ein gemeinsamer Stack über 2D+3D ohne klare UX. Shortcuts: **Ctrl/Cmd+Z**, **Ctrl/Cmd+Shift+Z** (oder Cmd+Y) — nur wenn Fokus/Modus passt. UI: Top Sub oder Status — **Undo** / **Redo** disabled wenn Stack leer; optional Tooltip mit letzter Aktion. Granularität Planar Editor: mindestens **Ende eines Drags** (Gizmo/Hebel), **Punkt einfügen**, **Punkt löschen** (wenn vorhanden), Paste — **nicht** jedes `mousemove`. Max. Tiefe TBD (Richtwert 50–100 Schritte).

---

**Category:** History  
**Title:** History-Datenmodell (Konzept)  
**Description:** Command-Pattern: `{ undo(), redo(), label? }` oder immutable Patches auf `ProfileDocument` / `SceneSnapshot`. Store hält `past[]`, `future[]`; neuer Commit leert `future`. **Serialisierung** für Persistenz nur vom **resultierenden** State, nicht vom Stack. Große Binaries (User-Images) nicht in jedem History-Step duplizieren — Images by `id` referenzieren.

---

**Category:** Persistenz  
**Title:** Was nach Browser-Neustart erhalten bleibt (Ziel)  
**Description:** **Mindestumfang v1:** User-**Profiles** (Planar Editor), User-**Images**, User-**Colors** / **Materials**, User-**Scenes** / **Environments** / **Light rigs**, **letzte Szene** (Entities, Atmosphäre, Kamera-Framing) — ein **Workspace**- oder **Project**-Bundle. Built-ins immer wieder aus App-Code/`public/`; User-Arrays aus Speicher laden und mit Built-ins **mergen** → [`requirements-builtin-and-user-content.md`](./requirements-builtin-and-user-content.md). **Technik:** Richtung **IndexedDB** (bereits in [`requirements-images.md`](./requirements-images.md), [`requirements-architecture.md`](./requirements-architecture.md) angedeutet) — ein Store-Key oder versioniertes Schema `workspace-v1`; JSON für Metadaten + Blobs für Uploads. **Kein** Backend Pflicht.

---

**Category:** Persistenz  
**Title:** Wann schreiben (Auto-Save Workspace)  
**Description:** Analog Planar Editor Auto-Save: debounced Flush nach Store-Änderungen (Profiles, Scene, Libraries). **Zusätzlich:** `beforeunload` / `visibilitychange` Best-Effort-Flush. **Kein** „Save project“-Zwang für Alltagsnutzung v1 — optional später **Export project file** (JSON+Assets) → [`requirements-export.md`](./requirements-export.md) / Scenes. Fehler (QuotaExceeded): UI-Warnung, keine stille Datenverlust-UI.

---

**Category:** Persistenz  
**Title:** Load-Reihenfolge & Migration  
**Description:** App-Start: Built-ins initialisieren → IndexedDB lesen → User-Daten in Store → Szene aus „last session“ oder Default-Scene. Schema-**Version** im Bundle; `migrateWorkspaceVn→Vm` bei Bedarf (ein Shot, keine `@deprecated`-APIs im Code). Kaputte Einträge: skip + Log, nicht ganze App blockieren.

---

**Category:** History  
**Title:** Status & Abhängigkeiten  
**Description:** **Status:** Spezifikation — Implementierung nach Planar-Editor-Datenmodell (`ProfileDocument`) und klarem Workspace-Schema in [`requirements-architecture.md`](./requirements-architecture.md). Right Sub „History“ als Panel **nicht** v1 — nur Shortcuts + ggf. Statuszeile; volle History-Liste optional später.
