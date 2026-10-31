# Plan: Vereinfachung – gemeinsame Punkte „Gekoppelt / Unabhängig“

Status: **Entwurf – wartet auf Freigabe**
Vereinfacht die Bedienung aus `plan-patch-smooth-corner.md` (C2) und `plan-patch-edge-tangent-c3.md` (C3).

---

## Was der Nutzer will

> Wir haben eine gemeinsame Kante. An den Endpunkten will ich alles einstellen können. Zwei Modi: unabhängige Handles oder gekoppelte. Wenn ich auf dieser Kante einen neuen Punkt mache – bei dem dann auch.

Keine „Ecken“, kein „Smooth/Corner“: **alle Punkte sind gleich.**

---

## Regel

Jeder Punkt auf einer **gemeinsamen Kante** (beide Endpunkte und jeder später eingefügte Punkt) hat **einen** Modus:

| Modus | Bedeutung |
|---|---|
| **Coupled** (Gekoppelt) | Was an diesem Punkt in Patch A eingestellt wird, macht der Punkt in Patch B gespiegelt mit → glatter Übergang. |
| **Independent** (Unabhängig) | Jeder Patch wird an diesem Punkt frei für sich eingestellt. |

**Welche Handles betroffen sind:**
- Die rosa Handles **entlang der gemeinsamen Kante** sind immer gemeinsam (das ist die gemeinsame Linie, wie bisher).
- Alle **anderen** Handles des Punkts folgen dem Modus:
  - an einem Endpunkt: der gelbe Handle und der rosa Handle der Nachbarkante,
  - an einem eingefügten Punkt: der gelbe Handle.
- „Gekoppelt“ heißt mathematisch wie bisher (C1): der Partner-Handle zeigt quer zur Kante gegenüber, Längen bleiben frei. Die Kanten-Korrektur (D) sorgt für die glatte Fläche.

**Standards:**
- Neue gemeinsame Kante (Link Edge): beide Endpunkte **Coupled**.
- Neu eingefügter Punkt auf einer gemeinsamen Kante: **Coupled**.
- Bestehende Links ohne gespeicherten Modus: **Independent** (nichts ändert sich von selbst).

**Shift + Ziehen** an einem gekoppelten Handle → Punkt wird **Independent** (beide Patches).

---

## Bedienung

- **Punktzeile im Inspector:** an gemeinsamen Punkten ein Schalter **🔗 Coupled / Independent** (Klick schaltet um; beim Wechsel auf Coupled gibt der gerade bearbeitete Patch vor). Sonst nichts.
- **Viewport:** gemeinsamer Punkt gekoppelt = **Ring** um den Anker; unabhängig = kein Ring.
- **Oranges Gegenüber** (gelber Handle des Partners) an gemeinsamen Punkten bleibt, ziehbar. An anderen Punkten nicht sichtbar.

## Was wegfällt

- Schalter **„Edge: Smooth/Corner“** (rosa Handles) → rosa Handles sind überall **einfach frei**, wie früher.
- **„Retract handles“** und der Hinweis zu Patch-Ecken.
- Detail-Schalter **„Surface“** (doppelt zur Punktzeile).
- Alle **Würfel**-Darstellungen (Anker, rosa, gelb).
- Die Begriffe **Smooth / Corner** in der Bedienung.

## Was bleibt (unverändert)

- Gemeinsame Kanten (Copy/Paste/Link), Punkte einfügen/entfernen auf gemeinsamen Kanten (beide Patches).
- Kopplung und Kanten-Korrektur (Mathe aus C1 und D, gemessen: Knick ≈ 0°), Regler **Edge Blend**.
- Gelbe Handles eines Punkts nicht mehr aneinander gekoppelt (keine Wippe).
- Undo/Redo für alles.

## Daten

- Intern bleibt `joint: 'smooth' | 'corner'` (= Coupled / Independent) → keine Migration.
- `edgeTangent` wird nicht mehr verwendet; gespeicherte Werte werden ignoriert.

## Tests

- Bestehende Kopplungs- und Korrektur-Tests bleiben grün.
- Neu: rosa Handles werden nirgends mehr automatisch gekoppelt (auch nicht bei alten Daten mit `edgeTangent`).
- Shift am gelben Handle → Independent; Shift am rosa Handle → keine Änderung des Modus.
- Eingefügter Punkt auf gemeinsamer Kante → Coupled auf beiden Seiten.
