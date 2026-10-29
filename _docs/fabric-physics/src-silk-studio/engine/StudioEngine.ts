import { MOUSE, Object3D, PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ClothSystem } from '../cloth/ClothSystem.ts';
import { createDefaultClothConfig } from '../config/clothConfig.ts';
import {
  FABRIC_PRESETS,
  createDefaultFabricPhysics,
  type FabricPresetKey,
} from '../config/fabricPresets.ts';
import { createDefaultStudioLighting } from '../config/studioLighting.ts';
import { createDefaultSceneProps, type ScenePropsState } from '../config/scenePropsConfig.ts';
import {
  createDefaultStudioLayers,
  type StudioLayersState,
} from '../config/studioLayers.ts';
import { createDefaultSilkOptics } from '../config/silkOptics.ts';
import { PinSystem } from '../pins/PinSystem.ts';
import { ScenePropsSystem } from '../scene/ScenePropsSystem.ts';
import { createStudioScene } from '../scene/studioScene.ts';
import { FabricCanvasTexture } from '../textures/canvasTexture.ts';
import type { FabricImagePayload } from '../textures/fabricImageLoad.ts';
import { createWeaveNormalTexture } from '../textures/weaveNormal.ts';
import type { StudioState } from '../state/studioStore.ts';
import { useStudioStore } from '../state/studioStore.ts';
import { StudioAnimationLoop } from './StudioAnimationLoop.ts';
import { applyStudioLighting } from './applyStudioLighting.ts';
import {
  applyOrbitFocus,
  getObjectWorldFocus,
  pickFocusPointFromPointer,
} from './orbitFocus.ts';
import { createRenderer, type RenderBackend, type StudioRenderer } from './createRenderer.ts';
import { SceneManipulator } from '../studio/sceneManipulator.ts';
import { handleViewportPointerDown } from '../studio/viewportInteraction.ts';

const CAMERA_EPSILON_SQ = 1e-10;

export class StudioEngine {
  private container: HTMLElement | null = null;
  private renderer: StudioRenderer | null = null;
  private camera: PerspectiveCamera | null = null;
  private orbitControls: OrbitControls | null = null;
  private manipulator: SceneManipulator | null = null;
  private animationLoop: StudioAnimationLoop | null = null;
  private cloth: ClothSystem | null = null;
  private pins: PinSystem | null = null;
  private fabricTexture: FabricCanvasTexture | null = null;
  private weaveNormal: ReturnType<typeof createWeaveNormalTexture> | null = null;
  private sceneBundle: ReturnType<typeof createStudioScene> | null = null;
  private sceneProps: ScenePropsSystem | null = null;

  private clothConfig = createDefaultClothConfig();
  private fabricPhysics = createDefaultFabricPhysics();
  private silkOptics = createDefaultSilkOptics();
  private scenePropsState: ScenePropsState = createDefaultSceneProps();
  private studioLayersState: StudioLayersState = createDefaultStudioLayers();

  private readonly clothManipulator = new Object3D();

  private pinnedCornersCount = 0;
  private activeCornerGizmo = 0;
  private simulationFrozen = false;
  private resizeObserver: ResizeObserver | null = null;

  private pendingRender = true;
  private readonly cameraPositionBefore = new Vector3();
  private readonly controlsTargetBefore = new Vector3();

  renderBackend: RenderBackend = 'webgl';

  async mount(container: HTMLElement): Promise<void> {
    this.container = container;
    container.replaceChildren();
    this.renderer = await createRenderer(container);
    this.renderBackend = this.renderer.backend;

    this.sceneBundle = createStudioScene(this.renderer);
    applyStudioLighting(this.sceneBundle, this.renderer, createDefaultStudioLighting());
    const { scene } = this.sceneBundle;

    this.camera = new PerspectiveCamera(
      38,
      container.clientWidth / container.clientHeight,
      0.1,
      50,
    );
    this.camera.position.set(1.4, 0.9, 1.6);

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = false;
    this.orbitControls.mouseButtons = {
      LEFT: MOUSE.ROTATE,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.PAN,
    };
    this.orbitControls.target.set(0, 0.25, 0);
    this.orbitControls.cursor.set(0, 0.25, 0);
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.orbitControls.zoomToCursor = true;

    this.orbitControls.addEventListener('start', () => {
      this.wake();
    });
    this.orbitControls.addEventListener('change', () => {
      this.wake();
    });

    this.manipulator = new SceneManipulator(
      this.camera,
      this.renderer.domElement,
      scene,
      this.orbitControls,
      () => this.getManipulatorContext(),
      {
        onSilkDragStart: () => {
          if (this.studioLayersState.selected === 'silk') {
            this.alignClothManipulatorToSimulation();
          }
        },
        onSilkDragEnd: () => {
          if (this.studioLayersState.selected === 'silk') {
            this.alignClothManipulatorToSimulation();
          }
        },
        onSilkTransform: (delta) => {
          if (!this.cloth) return;
          this.cloth.applyWorldMatrixDelta(delta);
          this.pins?.syncPositionsFromCloth(this.cloth.cornerIndexMap, this.cloth.pos);
        },
        onCornerTransform: (corner, pin) => {
          this.cloth?.setCornerWorldPosition(
            corner,
            pin.position.x,
            pin.position.y,
            pin.position.z,
          );
        },
        onPropTransform: (kind) => {
          if (!this.sceneProps) return;
          const transform = this.sceneProps.readTransformFromMesh(kind);
          useStudioStore.getState().patchScenePropsFromEngine(kind, transform);
        },
        wake: () => {
          this.wake();
        },
        wakeSimulation: () => {
          this.wakeSimulation();
        },
      },
    );

    this.fabricTexture = new FabricCanvasTexture();
    this.weaveNormal = createWeaveNormalTexture();
    this.cloth = new ClothSystem(scene, this.fabricTexture, this.weaveNormal);
    this.sceneProps = new ScenePropsSystem(scene);
    scene.add(this.clothManipulator);
    this.sceneProps.applyFromState(this.scenePropsState, this.studioLayersState);
    this.pins = new PinSystem(scene, this.manipulator.controls.getHelper());

    this.rebuildCloth();
    this.syncOrbitFocusToCloth(false);
    this.pins.initialPositions(this.cloth.cornerIndexMap, this.cloth.pos);
    this.pins.applyPinnedSelection(
      this.pinnedCornersCount,
      this.studioLayersState.visibility.silkCorners,
    );
    this.syncSelectionGizmo();

    this.resizeObserver = new ResizeObserver(() => {
      this.onResize();
    });
    this.resizeObserver.observe(container);
    this.onResize();
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('dblclick', this.onDoubleClick);
    this.renderer.domElement.addEventListener('contextmenu', this.onContextMenu);

    this.cloth.wakeSimulation();
    this.pendingRender = true;
    this.animationLoop = new StudioAnimationLoop(() => this.onAnimationFrame());
    this.animationLoop.wake();
  }

  private getManipulatorContext() {
    if (!this.sceneProps || !this.pins) return null;
    return {
      layers: this.studioLayersState,
      pinnedCornersCount: this.pinnedCornersCount,
      activeCornerGizmo: this.activeCornerGizmo,
      clothManipulator: this.clothManipulator,
      cloth: this.cloth,
      pins: this.pins,
      sceneProps: this.sceneProps,
    };
  }

  private wake(): void {
    this.pendingRender = true;
    this.animationLoop?.wake();
  }

  private wakeSimulation(): void {
    this.cloth?.wakeSimulation();
    this.wake();
  }

  private onAnimationFrame(): boolean {
    if (
      !this.renderer ||
      !this.camera ||
      !this.cloth ||
      !this.pins ||
      !this.sceneBundle ||
      !this.sceneProps
    ) {
      return false;
    }

    const transformDragging = this.manipulator?.isDragging() ?? false;
    const simActive =
      !this.simulationFrozen &&
      (transformDragging || !this.cloth.isSimulationAtRest());
    if (simActive) {
      const colliders = this.sceneProps.buildColliderSnapshot(
        this.scenePropsState,
        this.studioLayersState,
      );
      this.cloth.simulate(
        this.fabricPhysics,
        colliders,
        this.pinnedCornersCount,
        this.pins.getPinPositions(),
        this.renderBackend === 'webgpu' ? 'webgpu' : 'cpu',
      );
    }

    this.cameraPositionBefore.copy(this.camera.position);
    if (this.orbitControls) {
      this.controlsTargetBefore.copy(this.orbitControls.target);
    }
    this.orbitControls?.update();
    const controlsMoving =
      this.cameraPositionBefore.distanceToSquared(this.camera.position) > CAMERA_EPSILON_SQ ||
      (this.orbitControls !== null &&
        this.controlsTargetBefore.distanceToSquared(this.orbitControls.target) >
          CAMERA_EPSILON_SQ);

    const shouldRender =
      this.pendingRender || simActive || controlsMoving || transformDragging;

    if (shouldRender) {
      this.renderer.render(this.sceneBundle.scene, this.camera);
      this.pendingRender = false;
    }

    return (
      transformDragging ||
      !this.cloth.isSimulationAtRest() ||
      controlsMoving ||
      this.pendingRender
    );
  }

  private rebuildCloth(): void {
    if (!this.cloth || !this.pins) return;
    const cloth = this.cloth;
    const pins = this.pins;
    const activeCount = this.pinnedCornersCount;
    const savedPins = pins.getPinPositions();
    cloth.rebuild(this.clothConfig, this.silkOptics, this.pinnedCornersCount, () => {
      cloth.applyPinnedSelection(this.pinnedCornersCount);
      if (activeCount > 0) {
        pins.restoreActivePinPositions(
          savedPins,
          activeCount,
          cloth.cornerIndexMap,
          cloth.pos,
          cloth.oldPos,
        );
      } else {
        pins.initialPositions(cloth.cornerIndexMap, cloth.pos);
      }
      pins.applyPinnedSelection(
        this.pinnedCornersCount,
        this.studioLayersState.visibility.silkCorners,
      );
      this.syncSelectionGizmo();
      this.syncOrbitFocusToCloth(true);
    });
    this.wakeSimulation();
  }

  applyState(state: StudioState): void {
    const prevPinnedCornersCount = this.pinnedCornersCount;
    const prevFabricPhysics = this.fabricPhysics;
    const prevSceneProps = this.scenePropsState;
    const prevLayers = this.studioLayersState;
    const transformDragging = this.manipulator?.isDragging() ?? false;

    this.pinnedCornersCount = state.pinnedCornersCount;
    this.activeCornerGizmo = state.activeCornerGizmo;
    this.fabricPhysics = { ...state.fabricPhysics };
    this.silkOptics = { ...state.silkOptics };
    this.scenePropsState = state.sceneProps;
    this.studioLayersState = state.studioLayers;

    const borderChanged =
      this.clothConfig.borderThicknessMm !== state.clothConfig.borderThicknessMm ||
      this.clothConfig.borderColor !== state.clothConfig.borderColor;
    const sizeChanged =
      this.clothConfig.width !== state.clothConfig.width ||
      this.clothConfig.height !== state.clothConfig.height;

    this.clothConfig = { ...state.clothConfig };

    if (this.cloth?.mesh) {
      this.cloth.mesh.visible = state.studioLayers.visibility.silk;
    }

    this.sceneProps?.applyFromState(state.sceneProps, state.studioLayers);

    if (this.sceneBundle) {
      this.sceneBundle.floorGrid.visible = state.showGrid;
      if (this.renderer) {
        applyStudioLighting(this.sceneBundle, this.renderer, state.studioLighting);
      }
    }

    this.cloth?.applyPinnedSelection(this.pinnedCornersCount);

    if (
      this.cloth &&
      this.pins &&
      this.pinnedCornersCount > prevPinnedCornersCount
    ) {
      this.pins.snapPinsToClothCorners(
        this.cloth.cornerIndexMap,
        this.cloth.pos,
        this.pinnedCornersCount,
        prevPinnedCornersCount,
        this.cloth.oldPos,
      );
      this.cloth.flushGeometryFromSimulation();
      this.wakeSimulation();
    }

    this.pins?.applyPinnedSelection(
      this.pinnedCornersCount,
      state.studioLayers.visibility.silkCorners,
    );

    if (!transformDragging) {
      this.syncSelectionGizmo();
      if (state.studioLayers.selected === 'silk') {
        this.alignClothManipulatorToSimulation();
      }
    }

    this.cloth?.applySilkOptics(this.silkOptics);

    if (borderChanged && this.fabricTexture) {
      this.fabricTexture.redraw(this.clothConfig);
      this.refreshClothMap();
    }
    if (sizeChanged) {
      this.rebuildCloth();
      this.refreshClothMap();
    } else if (borderChanged && this.cloth?.material) {
      this.cloth.material.needsUpdate = true;
    }

    const pinnedChanged = prevPinnedCornersCount !== this.pinnedCornersCount;
    const scenePropsChanged =
      JSON.stringify(prevSceneProps) !== JSON.stringify(state.sceneProps);
    const layersChanged =
      JSON.stringify(prevLayers) !== JSON.stringify(state.studioLayers);

    const physicsChanged =
      pinnedChanged ||
      sizeChanged ||
      scenePropsChanged ||
      layersChanged ||
      prevFabricPhysics.gravityMagnitude !== state.fabricPhysics.gravityMagnitude ||
      prevFabricPhysics.damping !== state.fabricPhysics.damping ||
      prevFabricPhysics.bendingStiffness !== state.fabricPhysics.bendingStiffness ||
      prevFabricPhysics.friction !== state.fabricPhysics.friction ||
      prevFabricPhysics.solverIterations !== state.fabricPhysics.solverIterations;

    if (physicsChanged) {
      this.wakeSimulation();
    } else {
      this.wake();
    }
  }

  applyPreset(key: FabricPresetKey): void {
    const p = FABRIC_PRESETS[key];
    this.fabricPhysics = {
      ...this.fabricPhysics,
      activePreset: key,
      gravityMagnitude: p.gravity,
      damping: p.damping,
      bendingStiffness: p.bending,
      friction: p.friction,
    };
    this.cloth?.applyPresetMaterial(
      p.roughness,
      p.sheen,
      p.sheenColor,
      p.anisotropy,
      p.iridescence,
    );
    if (p.anisotropy !== undefined) {
      this.silkOptics.anisotropy = p.anisotropy;
    }
    if (p.iridescence !== undefined) {
      this.silkOptics.iridescence = p.iridescence;
    }
    this.cloth?.applySilkOptics(this.silkOptics);
    this.wakeSimulation();
  }

  isSimulationFrozen(): boolean {
    return this.simulationFrozen;
  }

  setSimulationFrozen(frozen: boolean): void {
    this.simulationFrozen = frozen;
    this.wake();
  }

  startSimulation(): void {
    this.simulationFrozen = false;
    this.wakeSimulation();
  }

  resetSimulation(): void {
    if (!this.cloth || !this.pins) return;
    this.simulationFrozen = false;
    this.cloth.resetSimulationPreservePins(
      this.pinnedCornersCount,
      this.pins.getPinPositions(),
    );
    this.wakeSimulation();
  }

  resetPins(): void {
    if (!this.cloth || !this.pins) return;
    this.pins.resetPinPositionsOnly(
      this.cloth.cornerIndexMap,
      this.cloth.originalLocal,
      this.cloth.pos,
      this.cloth.oldPos,
    );
    this.pins.applyPinnedSelection(
      this.pinnedCornersCount,
      this.studioLayersState.visibility.silkCorners,
    );
    this.syncSelectionGizmo();
    this.cloth.flushGeometryFromSimulation();
    this.wakeSimulation();
  }

  applyFabricImage(payload: FabricImagePayload): void {
    if (!this.fabricTexture || !this.cloth) {
      throw new Error('3D studio is not ready. Please wait and try again.');
    }

    this.clothConfig.aspectRatio = payload.aspect;
    this.clothConfig.width = payload.width;
    this.clothConfig.height = payload.height;

    this.fabricTexture.setLoadedUserImage(payload.image);
    this.rebuildCloth();
    this.refreshClothMap();
  }

  private refreshClothMap(): void {
    if (!this.cloth || !this.fabricTexture) return;
    this.cloth.refreshMaterialMap(this.fabricTexture.texture);
    this.fabricTexture.markGpuDirty(this.renderer?.instance ?? null);
    this.wake();
  }

  setActiveCorner(index: number): void {
    this.activeCornerGizmo = index;
    this.syncSelectionGizmo();
    this.wake();
  }

  setTransformMode(mode: 'translate' | 'rotate'): void {
    this.manipulator?.setMode(mode);
  }

  private alignClothManipulatorToSimulation(): void {
    if (!this.cloth) return;
    const center = this.cloth.getSimulationCenter();
    this.clothManipulator.position.copy(center);
    this.clothManipulator.rotation.set(0, 0, 0);
    this.clothManipulator.updateMatrixWorld(true);
  }

  private syncSelectionGizmo(): void {
    const ctx = this.getManipulatorContext();
    if (!ctx || !this.manipulator) return;
    this.manipulator.syncAttachment(ctx);
  }

  private onResize = (): void => {
    if (!this.container || !this.camera || !this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.wake();
  };

  private onContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  private syncOrbitFocusToCloth(preserveView: boolean): void {
    if (!this.orbitControls || !this.camera || !this.cloth?.mesh) return;
    const focus = getObjectWorldFocus(this.cloth.mesh);
    applyOrbitFocus(this.camera, this.orbitControls, focus, preserveView);
  }

  private orbitFocusPickables(): Object3D[] {
    const pickables: Object3D[] = [];
    if (this.cloth?.mesh) pickables.push(this.cloth.mesh);
    if (this.sceneBundle) {
      pickables.push(this.sceneBundle.groundMesh);
    }
    if (this.sceneProps) {
      pickables.push(...this.sceneProps.getPickableMeshes(this.studioLayersState));
    }
    return pickables;
  }

  private onDoubleClick = (event: MouseEvent): void => {
    if (!this.orbitControls?.enabled || !this.camera || !this.renderer) return;
    const focus = pickFocusPointFromPointer(
      event,
      this.camera,
      this.renderer.domElement,
      this.orbitFocusPickables(),
      this.orbitControls.target.y,
    );
    if (focus) {
      applyOrbitFocus(this.camera, this.orbitControls, focus, true);
      this.wake();
    }
  };

  private onPointerDown = (event: PointerEvent): void => {
    this.wake();
    if (
      !this.camera ||
      !this.renderer ||
      !this.pins ||
      !this.sceneProps ||
      !this.cloth ||
      !this.manipulator
    ) {
      return;
    }

    handleViewportPointerDown({
      event,
      camera: this.camera,
      pointerTarget: this.renderer.domElement,
      layers: this.studioLayersState,
      cloth: this.cloth,
      pins: this.pins,
      sceneProps: this.sceneProps,
      pinnedCornersCount: this.pinnedCornersCount,
      transformControls: this.manipulator.controls,
      store: useStudioStore.getState(),
    });
  };

  dispose(): void {
    this.animationLoop?.dispose();
    this.animationLoop = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.renderer?.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer?.domElement.removeEventListener('dblclick', this.onDoubleClick);
    this.renderer?.domElement.removeEventListener('contextmenu', this.onContextMenu);
    this.cloth?.dispose();
    this.pins?.dispose();
    this.sceneProps?.dispose();
    this.clothManipulator.removeFromParent();
    this.weaveNormal?.dispose();
    this.renderer?.domElement.remove();
    this.renderer?.dispose();
    this.orbitControls?.dispose();
    this.manipulator?.dispose();
    this.manipulator = null;
    this.container = null;
  }
}
