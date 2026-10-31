# Plan: Shadow Softness Range (Lighting Panel)

## Problem
- Softness slider max = 30 (PCF `shadow.radius` in texels @ 4096) → Schatten nicht weich genug.
- Bug: Export rendert mit 8192er Shadow-Map, Radius bleibt in Texeln gleich → Export-Schatten halb so weich wie Preview.

## Umsetzung
- `SHADOW_SOFTNESS_MAX` 30 → 100.
- Softness wird in Preview-Texeln (SHADOW_MAP_SIZE) definiert; `shadowRadiusForMapSize()` skaliert auf die aktuelle Map-Größe → Export = Preview.
- Hinweis: PCF (Vogel-Disk) wird bei sehr großen Radien körniger; echte Flächenlicht-Weichheit wäre ein eigenes Feature.
