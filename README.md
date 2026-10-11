# Mockup Studio 3D

**Version 0.0.1**

Photorealistische Mockups im Browser — WebGPU, React UI, Vanilla Engine (2026).

---

## Tech Stack

Stand: **Oktober 2026**

### Runtime

| Technologie | Version | Rolle |
|---|---|---|
| [Three.js](https://threejs.org/) | **0.186.1** | 3D-Engine — ausschließlich `WebGPURenderer` |
| [TSL](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language) | *(in Three.js)* | Node-basierte Shader & Materialien |
| [@dimforge/rapier3d-simd-compat](https://rapier.rs/) | **0.21.0** | 3D-Physik (SIMD, Vite-compat) |
| [simplex-noise](https://github.com/jwagner/simplex-noise.js) | **4.0.3** | Prozedurales Rauschen |
| [React](https://react.dev/) | **19.3.0** | UI-Chrome only (Panels, Toolbar, Controls) |

### Tooling

| Technologie | Version | Rolle |
|---|---|---|
| [TypeScript](https://www.typescriptlang.org/) | **5.9.3** | Strict mode, ESM |
| [Vite](https://vite.dev/) | **8.3.3** | Dev-Server & Bundler |
| [ESLint](https://eslint.org/) | **10.12.0** | Linting (flat config) |

---

## Architektur

```
┌─────────────────────────────────────┐
│  src/ui/          React UI-Chrome   │  Toolbar, Panels, Slider, Modes
│         ↕ SceneApi / Store          │
├─────────────────────────────────────┤
│  src/engine/      Vanilla TS        │  WebGPU, TSL, Rapier, Render-Loop
└─────────────────────────────────────┘
```

- **React** nur für UI — kein R3F, kein Three in UI-Komponenten
- **WebGPU required** — kein WebGL-Fallback (Desktop & Mobile)
- **UI:** Figma-like, responsive, touch-ready
- Requirements: [`_docs/requirements/`](./_docs/requirements/)

### Ordner

| Pfad | Inhalt |
|---|---|
| `src/ui/` | React App, Store, Styles |
| `src/engine/` | `MockupEngine` — Three + Rapier |
| `src/scene/` | `SceneApi` Types (UI ↔ Engine) |
| `src/render/` | Skybox, … |
| `src/physics/` | Rapier World |
| `src/materials/` | TSL Materialien |

---

## Quick Start

```bash
npm install
npm run dev      # → http://localhost:4040 (User startet Server)
npm run build
npm run lint
```

---

## Browser-Anforderungen

| Feature | Hinweis |
|---|---|
| WebGPU | Required — ohne WebGPU: UI-Meldung, kein 3D-Viewport |
| WASM SIMD128 | Für Rapier SIMD |
| Desktop & Mobile | Responsive UI, touch-ready Controls |
