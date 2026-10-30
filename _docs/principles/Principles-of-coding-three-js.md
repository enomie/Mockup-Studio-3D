# Principles of Coding — Three.js (Das Bühnenbild & die Physik des Lichts)

3D-Programmierung im Web folgt völlig anderen Gesetzen als normale DOM-Entwicklung: Du verlässt die CPU-Ebene und teilst Ressourcen mit der GPU.

* **Der Render-Loop ist heilig:** 60 bis 120 Mal pro Sekunde läuft der Loop. Innerhalb des Loops gilt: **Keine Allokationen** (`new Vector3()`, neue Objekte, Array-Operationen). Das erzeugt Garbage Collection Spikes und Ruckler.
* **Ressourcen-Lifecycle & Dispose-Disziplin:** Three.js räumt im WebGL-Kontext nicht automatisch auf. Geometrien, Materialien und Texturen müssen explizit mit `.dispose()` freigegeben werden, sonst läuft der GPU-Speicher voll.
* **Batching & Draw Calls minimieren:** Jedes Mesh kostet einen Draw Call. Nutze `InstancedMesh`, Textur-Atlanten und zusammengeführte Geometrien, wo immer möglich.
* **Szenengraph-Hierarchie:** Transformationen (Position, Rotation, Scale) logisch im Graphen verschachteln, statt Koordinaten im World-Space manuell nachzurechnen.
