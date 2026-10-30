# Principles of Coding — Rapier.js SIMD (Das mechanische Getriebe / High Performance)

Rapier (insb. mit WebAssembly & SIMD) ist rohe, deterministische Berechnungslogik. Hier triffst du auf Shared Memory und numerische Stabilität.

* **Feste Zeitschritte (Fixed Timestep):** Physik darf niemals an variabler Render-Framerate (`requestAnimationFrame`) hängen. Berechne Physik in diskreten Schritten (z. B. strikt alle 1/60s), visualisiere via Interpolation.
* **WASM-Boundary minimieren:** Das Überqueren der Grenze zwischen JS und WebAssembly kostet Performance. Übertrage Daten in großen Batches oder arbeite direkt auf Shared Buffers / TypedArrays, statt für jeden Body einzeln JS-Methoden aufzurufen.
* **Trennung von Simulation und Darstellung:**
* Rapier besitzt die Wahrheit über Position und Orientierung.
* Three.js liest diese Werte nur aus und spiegelt sie im Szenengraph wider. Niemals umgekehrt Physik-Objekte über Three.js-Transforms steuern (außer bei explizit kinematischen Körpern).


* **Numerische Stabilität:** Vermeide extreme Massenverhältnisse (z. B. ein 10.000 kg Klotz auf einem 0.01 kg Objekt) und unbegrenzte Geschwindigkeiten (Tunneleffekt / CCD beachten).
