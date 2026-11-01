# Werkseitig vs. User-Inhalt

**Querschnitt:** Was die App **mitliefert** (Built-ins, Starter, Katalog) vs. was der **User anlegt** (Upload, Save-as, Duplicate → User-Kopie). Detail-UI pro Domäne in den verlinkten Kategorie-Dateien.

**Regel (Projekt):** Alles, was der User **selbst erzeugt**, kann er **wieder entfernen** (Löschen / Remove). Werkseitige Einträge sind **nicht löschbar** — optional **duplizierbar** als User-Kopie zum Bearbeiten.

---

**Category:** Project  
**Title:** Mitgeliefert vs. vom User angelegt  
**Description:** Mockup Studio liefert **fertige Bausteine** mit: Asset-Katalog (platzierte Baustein-Typen), Starter-/Sample-**Images**, Built-in-**Colors** und **Materials**, Werk-**Environments**, **Light rigs**, **Arrangements**, **Scenes** und weitere Presets. Der User kann parallel **eigene** Einträge anlegen (Upload, „Save as …“, „Add …“, Duplicate einer Built-in-Kopie). **Ownership** ist maschinenlesbar über `source` (oder äquivalent, z. B. `starter` | `user` bei Images). **Nur** Einträge mit User-Ownership sind **löschbar**. Built-ins bleiben in jeder Session und in jedem neuen Projekt verfügbar; der User kann sie **laden/zuweisen**, aber nicht aus der App entfernen oder überschreiben.

---

**Category:** Project  
**Title:** Löschen — Pflicht für User-Inhalt  
**Description:** Für **jeden** Bereich, in dem der User neue Einträge erstellen kann, muss es eine **Remove-/Delete-Aktion** geben, die **nur** User-Inhalt betrifft (`source: 'user'`, `source: 'starter'` ausgenommen, Katalog-Built-ins ausgenommen). **Kein** verstecktes „User-Asset ohne Löschen“. UI: gleiches Muster wie Colors / Environments / Light rigs — **Remove** im Editor bei selektiertem User-Eintrag; Built-in-Zeilen ohne Remove (Badge **Built-in** oder disabled). **Szene:** vom User platzierte **Entities** sind User-Arbeit — **Remove** aus der Szene (`removeEntity`) ist Pflicht (bereits Placement); das ist **kein** Katalog-Löschen. **Katalog-Baustein-Typen** (z. B. `wine-bottle`, `block`) sind Werk — der User **löscht** sie nicht aus dem Katalog, er **entfernt** nur Instanzen aus der Szene.

---

**Category:** Project  
**Title:** Löschen bei Referenzen (Integrität)  
**Description:** User-Inhalt darf gelöscht werden, auch wenn er **referenziert** wird — mit **definiertem Fallback**, nicht mit blockierendem „in use“. Konkret pro Domäne in den Kategorie-Dateien (Beispiele): **Material** gelöscht → betroffene Slots fallen auf Default-Preset oder leerer Slot + UI-Hinweis; **Image** gelöscht → Face/Ground ohne Bild oder Placeholder; **Scene/Environment** gelöscht, während aktiv → Apply auf Werk-**Default**; **Color** gelöscht → kein harter Crash in gespeicherten Werten (Picker zeigt letzten RGB oder Fallback). **Confirm-Dialog** bei Löschen mit aktiver Referenz: empfohlen v1, wo Datenverlust sichtbar ist (TBD pro Panel). Löschen eines **User-Scene-Presets** entfernt **nicht** Images/Materials aus den Bibliotheken (nur die Scene-Zeile).

---

**Category:** Project  
**Title:** Domänen-Matrix (Ownership & Löschen)  
**Description:** Normative Zuordnung — Implementierung und UI müssen dazu passen; Details in der jeweiligen Datei.

| Domäne | Werkseitig (nicht löschbar) | User kann anlegen | User kann löschen |
|---|---|---|---|
| **Images** | `source: 'starter'` in `/public/images/` (Auto-Manifest) | Upload (`source: 'user'`) | `removeImage` nur user → [`requirements-images.md`](./requirements-images.md) |
| **SVG-Profile** (Lathe/Extrude) | Dateien in `/public/profiles/` (Werk, kein User-Upload v1) | — | —; nur Engine/Katalog → [`requirements-images.md`](./requirements-images.md) (Abgrenzung `profiles/`) |
| **Colors** | `source: 'builtin'` | Add / Duplicate → `user` | `removeColor` nur user → [`requirements-colors.md`](./requirements-colors.md) |
| **Materials** | `source: 'builtin'` | Add / Duplicate → `user` | `removeMaterial` nur user → [`requirements-materials.md`](./requirements-materials.md) |
| **Environments** | Built-in Presets | Save as environment | `removeEnvironment` nur user → [`requirements-environments.md`](./requirements-environments.md) |
| **Light rigs** | Built-in Presets | Save as lighting preset | `removeLightingPreset` nur user → [`requirements-lighting-presets.md`](./requirements-lighting-presets.md) |
| **Arrangements** | Built-ins Clothing, Devices, Beverages, Car | Add new (aktuelle Szenen-Assets) / Duplicate → `user` | `removeArrangement` nur user → [`requirements-arrangements-and-persistence.md`](./requirements-arrangements-and-persistence.md) |
| **Scenes** | Built-in Scene-Presets | Save as scene | `deleteScene` nur user → [`requirements-scenes.md`](./requirements-scenes.md) |
| **Asset-Katalog** | Alle Built-in-`assetKind` (Block, Dose, …) | **Gebaktes Stoff-User-Asset** (nach Freeze + Bake) → [`requirements-assets-fabric-cloth.md`](./requirements-assets-fabric-cloth.md) | Built-in-Kinds nicht löschbar; **User-Asset-Zeile** `removeUserBakedAsset` (TBD) nur `source: 'user'`; Sim-`fabric-cloth` nur **Entity** entfernen → [`requirements-assets.md`](./requirements-assets.md) |
| **Szene-Entities** | Default-Szene = Built-in-Arrangement **Clothing**; Ersetzen per Arrangement-Load | Drop / Place aus Katalog | `removeEntity` / Trash / Delete-Key → [`requirements-scene-placement.md`](./requirements-scene-placement.md) |

**Nicht** unter diese Regel: Session-only UI (z. B. ColorPicker **Recent**), temporäre Physics-Test-Würfel, Export-Dateien auf Disk — kein Bibliotheks-Eintrag.

---

**Category:** Project  
**Title:** Store & Persistenz  
**Description:** Built-in-Definitionen leben in **`src/data/*`** (oder feste Module), werden beim Init in den Store **gemerged** oder als read-only Basis geladen — **nie** durch User-Actions mutiert oder aus Arrays **entfernt**. User-Einträge leben im **mutable** Store-Teil und später im **Projekt-Save** (JSON). Beim Load: Built-ins immer wiederherstellen; User-Arrays mergen oder ersetzen gemäß Save-Schema → [`requirements-architecture.md`](./requirements-architecture.md). IDs von Built-ins **stabil** über Versionen; User-IDs generiert (`user-${uuid}` o. ä.).

---

**Category:** Project  
**Title:** Implementierungs-Checkliste (Agent)  
**Description:** Neues „Bibliothek“- oder „Preset“-Feature: (1) `source` oder äquivalentes Ownership-Feld; (2) Remove-Action mit Guard `source !== 'builtin'` (bzw. `starter` bei Images); (3) Built-in sichtbar als nicht löschbar; (4) Referenz-Fallback dokumentiert in Kategorie-Datei; (5) Tests für „user remove ok, builtin remove no-op / hidden“. Bestehende Lücken (z. B. Images Delete noch TBD in UI) sind **Bug/Backlog** gegen dieses Projekt-Requirement.
