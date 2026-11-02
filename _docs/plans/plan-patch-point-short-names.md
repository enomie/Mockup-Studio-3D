# Plan: Kurze Punktnamen bei Patches (P1 / S1)

## Ziel
Patch-Punkte heißen aktuell `Point 1`, `Point 2` … und geteilte Punkte `Shared 1`, `Shared 2` … – zu lang.
Neu: `P1`, `P2` … bzw. `S1`, `S2` …

## Änderungen (`src/**`)
1. `src/scene/asset-triangle-patch.ts` – Default-Punkte (Zeilen ~258/267/276 und `Point ${index + 1}` ~307) → `P1`…`P4`.
2. `src/scene/triangle-patch-point-edit.ts:64` – eingefügter Punkt `Point ${number}` → `P${number}`.
3. `src/scene/patch-nodes.ts:577` – `nextSharedNodeName` erzeugt `S${i}` statt `Shared ${i}`; Doc-Kommentar anpassen.
4. Tests anpassen: `asset-triangle-patch.test.ts`, `triangle-patch-point-edit.test.ts`, `patch-nodes.test.ts`.

## Nicht betroffen
- `ProfileNodeFields.tsx` („Point N · Pfad“) gehört zum Profil-Editor, nicht zu Patches – bleibt.
- Punkt-IDs (`pt-1` …) bleiben unverändert.

## Bestehende Szenen
Gespeicherte Szenen behalten ihre alten Namen (Namen sind frei editierbar). Optional: Migration beim Laden,
die genau `Point N` → `PN` und `Shared N` → `SN` umbenennt. Vorschlag: **keine Migration** (einfacher, kein Risiko für vom User vergebene Namen).

## Prüfung
`npx vitest run`, `npm run lint`, `npm run build`, dann Commit auf `main` und Push.
