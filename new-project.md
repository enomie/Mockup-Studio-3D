Setup für **Mockup Studio 3D** — React UI-Chrome, Vanilla WebGPU-Engine, Skybox, Beleuchtung.

## 1. Ordnerstruktur

```text
mockup-studio/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── _docs/requirements/
└── src/
    ├── main.tsx              ← React bootstrap
    ├── ui/                   ← React UI-Chrome
    ├── engine/mockup-engine.ts
    ├── scene/scene-api.ts    ← UI ↔ Engine (kein Three in UI)
    ├── render/skybox.ts
    ├── physics/world.ts
    └── materials/skyboxMaterial.ts
```

```bash
npm install
npm run dev   # → http://localhost:4040 (User startet Server)
```

---

## 2. `package.json`

Siehe [`README.md`](./README.md) für aktuelle Versionen.

---

## 3. `vite.config.ts`

Port **4040**. Dev-Watcher ignoriert Workspace-Ordner (Backups, Scripts, …):

```typescript
import { defineConfig } from 'vite';

const ignoredWorkspaceDirs = [
  '.backup',
  '.backups',
  '_anfänge',
  '_deleted',
  '_scripts',
] as const;

export default defineConfig({
  server: {
    port: 4040,
    watch: {
      ignored: ignoredWorkspaceDirs.map((dir) => `**/${dir}/**`),
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
```

---

## 4. `src/constants.ts`

```typescript
export const SKYBOX_RADIUS = 900;

export const SKY_COLOR_RGB = { r: 0.008, g: 0.01, b: 0.028 };
```

---

## 5. Skybox — runde Kugel, Einfarbig

**`skyboxMaterial.ts`** — Uniform-Farbe (später einstellbar via `setSkyColor`):

```typescript
import { BackSide, MeshBasicNodeMaterial } from 'three/webgpu';
import { uniform, vec3 } from 'three/tsl';
import type { Rgb } from '../colors/rgb';
import { rgbToColor } from '../colors/rgb';
import { SKY_COLOR_RGB } from '../constants';

function rgbToVec3(c: Rgb) {
  return vec3(c.r, c.g, c.b);
}

export class SkyboxMaterial extends MeshBasicNodeMaterial {
  readonly uSkyColor = uniform(rgbToVec3(SKY_COLOR_RGB));

  constructor() {
    super({ side: BackSide, depthWrite: false });
    this.colorNode = this.uSkyColor;
  }

  setSkyColor(rgb: Rgb): void {
    const c = rgbToColor(rgb);
    this.uSkyColor.value.set(c.r, c.g, c.b);
  }
}
```

**`skybox.ts`** — `SphereGeometry`, folgt der Kamera:

```typescript
import { Mesh, Scene, SphereGeometry, type Camera } from 'three/webgpu';
import type { Rgb } from '../colors/rgb';
import { SKYBOX_RADIUS } from '../constants';
import { createSkyboxMaterial, type SkyboxMaterial } from '../materials/skyboxMaterial';

export class Skybox {
  private readonly skyScene = new Scene();
  private readonly mesh: Mesh;
  private readonly material: SkyboxMaterial;

  constructor() {
    const geometry = new SphereGeometry(SKYBOX_RADIUS, 48, 32);
    this.material = createSkyboxMaterial();
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.skyScene.add(this.mesh);
  }

  getScene(): Scene {
    return this.skyScene;
  }

  setSkyColor(rgb: Rgb): void {
    this.material.setSkyColor(rgb);
  }

  update(camera: Camera): void {
    this.mesh.position.copy(camera.position);
  }
}
```

---

## 6. Beleuchtung & Szene

Mindestens **AmbientLight** + **DirectionalLight** für `MeshStandardMaterial`:

```typescript
scene.add(new AmbientLight(0xffffff, 0.35));

const sun = new DirectionalLight(0xffffff, 1.4);
sun.position.set(5, 10, 7);
scene.add(sun);
```

---

## 7. Render-Pattern

Zweiphasig: Sky-Szene → `clearDepth` → Hauptszene:

```typescript
renderer.autoClear = true;
renderer.render(skybox.getScene(), camera);
renderer.clearDepth();
renderer.render(scene, camera);
```

---

## Kurzüberblick

| Was | Wo |
|---|---|
| WebGPU-only | `three/webgpu`, `WebGPURenderer` |
| Runde Skybox | `SphereGeometry` + `BackSide` Material |
| Sky-Farbe | `SKY_COLOR_RGB` / `skybox.setSkyColor()` |
| Beleuchtung | `AmbientLight` + `DirectionalLight` |
| Ortho-Kamera | `OrthographicCamera` |
| Physik | `physics/world.ts` (Rapier SIMD) |
| Dev-Server | Port **4040** — User startet, Agent nicht |

**Wichtig:** WebGPU Hard Requirement — `navigator.gpu` muss vorhanden sein.
