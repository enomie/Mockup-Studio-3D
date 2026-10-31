# Plan: Bessere Auswahl-Markierung im Viewport

## Ist-Zustand / Ursache
`src/engine/selection-highlight.ts` nutzt einen „Inverted Hull“: Jedes Mesh des Assets wird geklont
(BackSide, blau `0x4d9fff`) und um `SELECTION_OUTLINE_SCALE = 1.03` skaliert.

Probleme:
- **Die Skalierung geht vom lokalen Ursprung jedes Teil-Meshes aus, nicht von seiner Oberfläche.** Sitzt der
  Pivot eines Teils nicht in dessen Mitte (Speichen und Felge beim Wheel, Standfuß/Panel beim Monitor), wird
  der Klon nach außen *verschoben* → blaue Flächen schweben neben dem Objekt.
- Die Breite hängt von der Größe ab (3 % von einem großen Objekt sind dick, von einem kleinen kaum sichtbar).
- Bei flachen oder offenen Meshes (Display, Ebenen, Stoff) gibt es keine saubere Rückseite → blaue Flächen
  statt einer Kontur.
- Für jedes Teil-Mesh kommt ein zusätzlicher Draw-Call dazu, und bei jedem Entity-Update wird alles neu gebaut.

## Vorschlag: Screen-Space-Outline (Maske + Kantenerkennung)
Standard in Editoren (Blender, Unity, Figma 3D):
1. **Masken-Pass:** Nur die Meshes des ausgewählten Objekts werden mit einem flachen Override-Material in ein
   kleines Render-Target gezeichnet (R8, ohne Lichtberechnung). Die Auswahl läuft über `Layers`
   (z. B. Layer 2 wird auf den ausgewählten Meshes gesetzt), deshalb werden keine Meshes geklont.
2. **Composite:** Im bestehenden TSL-Output von `ViewportRenderPipeline` (vor SMAA) wird die Maske an
   4–8 Nachbarpixeln abgetastet: `edge = dilate(mask) − mask` → eine Kontur mit **konstanter Pixelbreite**
   (ca. 2 px, DPR-skaliert) in Akzentfarbe.
3. Optional werden verdeckte Teile gedimmt bzw. gestrichelt dargestellt: Die Maske enthält einen Depth-Vergleich,
   und verdeckte Kanten erscheinen mit 35 % Deckkraft.
4. **Beim Export (`compositeSceneToTarget` für Capture) wird die Kontur nie gerendert.**

Performance: Ein zusätzlicher, sehr günstiger Pass nur für das ausgewählte Objekt, dazu ein paar
Texture-Fetches pro Pixel im Fullscreen-Pass. Ohne Auswahl wird der Pass komplett übersprungen.
Das ist günstiger und stabiler als die jetzige Lösung.

Alternativen (verworfen):
- `OutlineNode` aus three/addons: braucht `pass(scene)` als Scene-Pass, passt nicht zu unserem
  Sky-plus-Main-MSAA-Composite und ist schwerer (Blur-Passes).
- Hull entlang der Normalen statt Skalierung: behebt das Verschieben, aber nicht flache Meshes oder harte
  Kanten (Risse an Ecken).
- Emissive-Tint auf dem Material: verfälscht Materialfarben, und genau die will man im Mockup sehen.

## Umsetzung
- `src/render/selection-outline-pass.ts` (neu): Masken-RT, Override-Material, TSL-Edge-Node.
- `viewport-render-pipeline.ts`: Outline-Node vor SMAA einhängen und ein Flag für Export ohne Outline.
- `selection-highlight.ts`: Hull-Code wird entfernt, stattdessen werden Layers auf dem ausgewählten Objekt
  gesetzt bzw. gelöscht. Die Licht-Wireframe-Logik bleibt.
- `constants.ts`: `SELECTION_OUTLINE_SCALE` entfällt, neu sind `SELECTION_OUTLINE_WIDTH_PX` und
  `SELECTION_OUTLINE_OCCLUDED_OPACITY`.
- Tests: Layer-Zuweisung beim Wechsel der Auswahl und Cleanup. Danach `npx vitest run`, Lint und Build.
