import { create } from 'zustand';
import { createDefaultClothConfig, type ClothConfig } from '../config/clothConfig.ts';
import {
  FABRIC_PRESETS,
  createDefaultFabricPhysics,
  type FabricPhysics,
  type FabricPresetKey,
} from '../config/fabricPresets.ts';
import { createDefaultSilkOptics, type SilkOptics } from '../config/silkOptics.ts';
import type { StudioEngine } from '../engine/StudioEngine.ts';
import type { RenderBackend } from '../engine/createRenderer.ts';
import { clampClothSizeMeters } from '../config/clothSizeLimits.ts';
import { loadFabricImageFromFile } from '../textures/fabricImageLoad.ts';
import {
  createDefaultStudioLighting,
  type StudioLightingState,
} from '../config/studioLighting.ts';
import {
  DEFAULT_VIEWPORT_ASPECT_PRESET,
  type ViewportAspectPresetId,
} from '../config/viewportAspect.ts';
import {
  clampCubeCornerRadius,
  createDefaultSceneProps,
  type ScenePropsState,
} from '../config/scenePropsConfig.ts';
import {
  createDefaultStudioLayers,
  type StudioLayerId,
  type StudioLayersState,
} from '../config/studioLayers.ts';

export interface StudioState {
  viewportAspectPreset: ViewportAspectPresetId;
  clothConfig: ClothConfig;
  fabricImageAspect: number | null;
  fabricPhysics: FabricPhysics;
  silkOptics: SilkOptics;
  pinnedCornersCount: number;
  activeCornerGizmo: number;
  showGrid: boolean;
  studioLayers: StudioLayersState;
  sceneProps: ScenePropsState;
  studioLighting: StudioLightingState;
  renderBackend: RenderBackend | 'pending';
  textureLoading: boolean;
  textureError: string | null;
  simulationFrozen: boolean;
}

interface StudioActions {
  bindEngine: (engine: StudioEngine) => void;
  unbindEngine: (engine: StudioEngine) => void;
  syncToEngine: () => void;
  setPinnedCornersCount: (count: number) => void;
  setActiveCorner: (index: number) => void;
  setShowGrid: (show: boolean) => void;
  toggleLayerVisibility: (id: StudioLayerId) => void;
  selectLayer: (id: StudioLayerId) => void;
  clearSelection: () => void;
  patchScenePropsFromEngine: (
    kind: 'cube' | 'sphere',
    transform: {
      position: { x: number; y: number; z: number };
      rotationEulerDeg: { x: number; y: number; z: number };
    },
  ) => void;
  setCubeSize: (size: number) => void;
  setCubeCornerRadius: (radius: number) => void;
  setSphereRadius: (radius: number) => void;
  patchCubeProp: (patch: Partial<ScenePropsState['cube']>) => void;
  patchSphereProp: (patch: Partial<ScenePropsState['sphere']>) => void;
  setBorderMm: (mm: number) => void;
  setBorderColor: (color: string) => void;
  setClothWidthMeters: (width: number) => void;
  setClothHeightMeters: (height: number) => void;
  setFabricBending: (v: number) => void;
  setFabricGravity: (v: number) => void;
  setFabricDamping: (v: number) => void;
  setFabricFriction: (v: number) => void;
  setAnisotropy: (v: number) => void;
  setAnisotropyRotationDeg: (deg: number) => void;
  setSheen: (v: number) => void;
  setIridescence: (v: number) => void;
  setWeaveDepth: (v: number) => void;
  patchStudioLighting: (patch: StudioLightingPatch) => void;
  applyPreset: (key: FabricPresetKey) => void;
  startSimulation: () => void;
  setSimulationFrozen: (frozen: boolean) => void;
  resetSimulation: () => void;
  resetPins: () => void;
  resetScene: () => void;
  uploadTexture: (file: File) => void;
  clearTextureError: () => void;
  setTransformMode: (mode: 'translate' | 'rotate') => void;
  setRenderBackend: (backend: RenderBackend) => void;
  setViewportAspectPreset: (id: ViewportAspectPresetId) => void;
}

let engineRef: StudioEngine | null = null;

export interface StudioLightingPatch {
  ambient?: Partial<StudioLightingState['ambient']>;
  key?: Partial<StudioLightingState['key']>;
  fill?: Partial<StudioLightingState['fill']>;
  top?: Partial<StudioLightingState['top']>;
  environment?: Partial<StudioLightingState['environment']>;
}

function mergeStudioLighting(
  prev: StudioLightingState,
  patch: StudioLightingPatch,
): StudioLightingState {
  return {
    ambient: { ...prev.ambient, ...patch.ambient },
    key: {
      ...prev.key,
      ...patch.key,
      position: { ...prev.key.position, ...patch.key?.position },
    },
    fill: {
      ...prev.fill,
      ...patch.fill,
      position: { ...prev.fill.position, ...patch.fill?.position },
    },
    top: {
      ...prev.top,
      ...patch.top,
      position: { ...prev.top.position, ...patch.top?.position },
    },
    environment: { ...prev.environment, ...patch.environment },
  };
}

export const useStudioStore = create<StudioState & StudioActions>((set, get) => ({
  viewportAspectPreset: DEFAULT_VIEWPORT_ASPECT_PRESET,
  clothConfig: createDefaultClothConfig(),
  fabricImageAspect: null,
  fabricPhysics: createDefaultFabricPhysics(),
  silkOptics: createDefaultSilkOptics(),
  pinnedCornersCount: 0,
  activeCornerGizmo: 0,
  showGrid: true,
  studioLayers: createDefaultStudioLayers(),
  sceneProps: createDefaultSceneProps(),
  studioLighting: createDefaultStudioLighting(),
  renderBackend: 'pending',
  textureLoading: false,
  textureError: null,
  simulationFrozen: false,

  bindEngine: (engine) => {
    engineRef = engine;
    set({
      renderBackend: engine.renderBackend,
      textureError: null,
      simulationFrozen: engine.isSimulationFrozen(),
    });
    get().syncToEngine();
  },

  unbindEngine: (engine) => {
    if (engineRef === engine) {
      engineRef = null;
    }
  },

  syncToEngine: () => {
    engineRef?.applyState(get());
  },

  setPinnedCornersCount: (count) => {
    set({ pinnedCornersCount: count });
    get().syncToEngine();
  },

  setActiveCorner: (index) => {
    set((s) => ({
      activeCornerGizmo: index,
      studioLayers: {
        ...s.studioLayers,
        selected: 'silkCorners',
        visibility: { ...s.studioLayers.visibility, silkCorners: true },
      },
    }));
    engineRef?.setActiveCorner(index);
    get().syncToEngine();
  },

  setShowGrid: (show) => {
    set({ showGrid: show });
    get().syncToEngine();
  },

  toggleLayerVisibility: (id) => {
    set((s) => {
      const nextVisible = !s.studioLayers.visibility[id];
      const selected =
        s.studioLayers.selected === id && !nextVisible ? null : s.studioLayers.selected;
      return {
        studioLayers: {
          ...s.studioLayers,
          visibility: { ...s.studioLayers.visibility, [id]: nextVisible },
          selected,
        },
      };
    });
    get().syncToEngine();
  },

  selectLayer: (id) => {
    set((s) => ({
      studioLayers: {
        ...s.studioLayers,
        visibility: { ...s.studioLayers.visibility, [id]: true },
        selected: id,
      },
    }));
    get().syncToEngine();
  },

  clearSelection: () => {
    set((s) => ({
      studioLayers: { ...s.studioLayers, selected: null },
    }));
    get().syncToEngine();
  },

  patchScenePropsFromEngine: (kind, transform) => {
    set((s) => {
      if (kind === 'cube') {
        return {
          sceneProps: {
            ...s.sceneProps,
            cube: {
              ...s.sceneProps.cube,
              position: transform.position,
              rotationEulerDeg: transform.rotationEulerDeg,
            },
          },
        };
      }
      return {
        sceneProps: {
          ...s.sceneProps,
          sphere: {
            ...s.sceneProps.sphere,
            position: transform.position,
            rotationEulerDeg: transform.rotationEulerDeg,
          },
        },
      };
    });
  },

  setCubeSize: (size) => {
    const clamped = Math.max(0.05, Math.min(2, size));
    set((s) => ({
      sceneProps: {
        ...s.sceneProps,
        cube: {
          ...s.sceneProps.cube,
          size: clamped,
          cornerRadius: clampCubeCornerRadius(clamped, s.sceneProps.cube.cornerRadius),
        },
      },
    }));
    get().syncToEngine();
  },

  setCubeCornerRadius: (radius) => {
    set((s) => ({
      sceneProps: {
        ...s.sceneProps,
        cube: {
          ...s.sceneProps.cube,
          cornerRadius: clampCubeCornerRadius(s.sceneProps.cube.size, radius),
        },
      },
    }));
    get().syncToEngine();
  },

  setSphereRadius: (radius) => {
    const clamped = Math.max(0.03, Math.min(1.5, radius));
    set((s) => ({
      sceneProps: {
        ...s.sceneProps,
        sphere: { ...s.sceneProps.sphere, radius: clamped },
      },
    }));
    get().syncToEngine();
  },

  patchCubeProp: (patch) => {
    set((s) => ({
      sceneProps: {
        ...s.sceneProps,
        cube: { ...s.sceneProps.cube, ...patch },
      },
    }));
    get().syncToEngine();
  },

  patchSphereProp: (patch) => {
    set((s) => ({
      sceneProps: {
        ...s.sceneProps,
        sphere: { ...s.sceneProps.sphere, ...patch },
      },
    }));
    get().syncToEngine();
  },

  setBorderMm: (mm) => {
    set((s) => ({ clothConfig: { ...s.clothConfig, borderThicknessMm: mm } }));
    get().syncToEngine();
  },

  setBorderColor: (color) => {
    set((s) => ({ clothConfig: { ...s.clothConfig, borderColor: color } }));
    get().syncToEngine();
  },

  setClothWidthMeters: (width) => {
    const w = clampClothSizeMeters(width);
    set((s) => {
      const aspect = s.fabricImageAspect;
      if (aspect !== null) {
        const height = clampClothSizeMeters(w / aspect);
        return {
          clothConfig: {
            ...s.clothConfig,
            width: w,
            height,
            aspectRatio: aspect,
          },
        };
      }
      const height = s.clothConfig.height;
      return {
        clothConfig: {
          ...s.clothConfig,
          width: w,
          aspectRatio: w / height,
        },
      };
    });
    get().syncToEngine();
  },

  setClothHeightMeters: (height) => {
    const h = clampClothSizeMeters(height);
    set((s) => {
      const aspect = s.fabricImageAspect;
      if (aspect !== null) {
        const width = clampClothSizeMeters(h * aspect);
        return {
          clothConfig: {
            ...s.clothConfig,
            width,
            height: h,
            aspectRatio: aspect,
          },
        };
      }
      const width = s.clothConfig.width;
      return {
        clothConfig: {
          ...s.clothConfig,
          height: h,
          aspectRatio: width / h,
        },
      };
    });
    get().syncToEngine();
  },

  setFabricBending: (v) => {
    set((s) => ({
      fabricPhysics: { ...s.fabricPhysics, bendingStiffness: v, activePreset: 'custom' },
    }));
    get().syncToEngine();
  },

  setFabricGravity: (v) => {
    set((s) => ({
      fabricPhysics: { ...s.fabricPhysics, gravityMagnitude: v, activePreset: 'custom' },
    }));
    get().syncToEngine();
  },

  setFabricDamping: (v) => {
    set((s) => ({
      fabricPhysics: { ...s.fabricPhysics, damping: v, activePreset: 'custom' },
    }));
    get().syncToEngine();
  },

  setFabricFriction: (v) => {
    set((s) => ({
      fabricPhysics: { ...s.fabricPhysics, friction: v, activePreset: 'custom' },
    }));
    get().syncToEngine();
  },

  setAnisotropy: (v) => {
    set((s) => ({ silkOptics: { ...s.silkOptics, anisotropy: v } }));
    get().syncToEngine();
  },

  setAnisotropyRotationDeg: (deg) => {
    set((s) => ({
      silkOptics: { ...s.silkOptics, anisotropyRotation: (deg * Math.PI) / 180 },
    }));
    get().syncToEngine();
  },

  setSheen: (v) => {
    set((s) => ({ silkOptics: { ...s.silkOptics, sheen: v } }));
    get().syncToEngine();
  },

  setIridescence: (v) => {
    set((s) => ({ silkOptics: { ...s.silkOptics, iridescence: v } }));
    get().syncToEngine();
  },

  setWeaveDepth: (v) => {
    set((s) => ({ silkOptics: { ...s.silkOptics, weaveDepth: v } }));
    get().syncToEngine();
  },

  patchStudioLighting: (patch) => {
    set((s) => ({
      studioLighting: mergeStudioLighting(s.studioLighting, patch),
    }));
    get().syncToEngine();
  },

  applyPreset: (key) => {
    const p = FABRIC_PRESETS[key];
    set((s) => ({
      fabricPhysics: {
        ...s.fabricPhysics,
        activePreset: key,
        gravityMagnitude: p.gravity,
        damping: p.damping,
        bendingStiffness: p.bending,
        friction: p.friction,
      },
      silkOptics: {
        ...s.silkOptics,
        ...(p.anisotropy !== undefined ? { anisotropy: p.anisotropy } : {}),
        ...(p.iridescence !== undefined ? { iridescence: p.iridescence } : {}),
        sheen: p.sheen,
      },
    }));
    engineRef?.applyPreset(key);
    get().syncToEngine();
  },

  startSimulation: () => {
    engineRef?.startSimulation();
    set({ simulationFrozen: false });
  },

  setSimulationFrozen: (frozen) => {
    engineRef?.setSimulationFrozen(frozen);
    set({ simulationFrozen: frozen });
  },

  resetSimulation: () => {
    engineRef?.resetSimulation();
    set({ simulationFrozen: false });
  },

  resetPins: () => {
    engineRef?.resetPins();
  },

  resetScene: () => {
    const { fabricImageAspect } = get();
    const defaults = createDefaultClothConfig();
    const clothConfig =
      fabricImageAspect !== null
        ? {
            ...defaults,
            width: defaults.defaultWidth,
            height: clampClothSizeMeters(defaults.defaultWidth / fabricImageAspect),
            aspectRatio: fabricImageAspect,
          }
        : { ...defaults };

    set({
      viewportAspectPreset: DEFAULT_VIEWPORT_ASPECT_PRESET,
      clothConfig,
      fabricPhysics: createDefaultFabricPhysics(),
      silkOptics: createDefaultSilkOptics(),
      pinnedCornersCount: 0,
      activeCornerGizmo: 0,
      showGrid: true,
      studioLighting: createDefaultStudioLighting(),
      studioLayers: createDefaultStudioLayers(),
      sceneProps: createDefaultSceneProps(),
      simulationFrozen: false,
    });
    engineRef?.setSimulationFrozen(false);
    engineRef?.resetPins();
    engineRef?.resetSimulation();
    get().syncToEngine();
  },

  uploadTexture: (file) => {
    void (async () => {
      const engine = engineRef;
      if (!engine) {
        set({
          textureError: '3D studio is still loading. Please wait and try again.',
        });
        return;
      }

      set({ textureLoading: true, textureError: null });

      try {
        const payload = await loadFabricImageFromFile(file);
        if (engineRef !== engine) {
          throw new Error('Upload cancelled (view reloaded).');
        }
        set((s) => ({
          textureLoading: false,
          fabricImageAspect: payload.aspect,
          clothConfig: {
            ...s.clothConfig,
            width: payload.width,
            height: payload.height,
            aspectRatio: payload.aspect,
          },
        }));
        engine.applyFabricImage(payload);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Image could not be loaded.';
        set({ textureLoading: false, textureError: message });
      }
    })();
  },

  clearTextureError: () => {
    set({ textureError: null });
  },

  setTransformMode: (mode) => {
    engineRef?.setTransformMode(mode);
  },

  setRenderBackend: (backend) => {
    set({ renderBackend: backend });
  },

  setViewportAspectPreset: (id) => {
    set({ viewportAspectPreset: id });
  },
}));

export function getPresetLabel(active: FabricPhysics['activePreset']): string {
  if (active === 'custom') return 'Custom';
  return FABRIC_PRESETS[active].name;
}
