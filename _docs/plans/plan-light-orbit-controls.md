# Plan: Key/Fill Light – Orbit-Steuerung & unabhängige Intensität

## Entfernt
- Key „Side (Left/Right)“, Fill „Opposite of key“, Fill „Ratio to key“.

## Neu (Key & Fill gleich aufgebaut)
- **Angle** 0–360° (Azimut um Szenenmitte, 0 = vorne/+Z, 90 = +X).
- **Height** −10…90° (Elevation über Horizont).
- **Intensity** 0–5, unabhängig je Licht (Fill nicht mehr an Key gekoppelt).
- **Softness** 0–100 je Licht (bereits unabhängig).
- Fill behält **Distance**.
- Defaults: Key 315°/45°, Fill 45°/35°, Fill-Intensität 0.5 (= bisheriges Aussehen).

## Migration
- Alte Szenen/Presets: `key.side` → Azimut (left = 315/45, right = 45/315), `fill.intensityRatio` → `fill.intensity = key.intensity × ratio`.
- Winkeländerung setzt den Gizmo-Offset des Lichts zurück (wie früher beim Seitenwechsel).
