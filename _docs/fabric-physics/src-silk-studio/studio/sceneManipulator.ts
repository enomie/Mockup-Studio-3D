import { Matrix4, Object3D, type Camera, type Scene } from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { StudioLayersState } from '../config/studioLayers.ts';
import type { ClothSystem } from '../cloth/ClothSystem.ts';
import type { PinSystem } from '../pins/PinSystem.ts';
import type { ScenePropsSystem } from '../scene/ScenePropsSystem.ts';

export interface SceneManipulatorContext {
  layers: StudioLayersState;
  pinnedCornersCount: number;
  activeCornerGizmo: number;
  clothManipulator: Object3D;
  cloth: ClothSystem | null;
  pins: PinSystem;
  sceneProps: ScenePropsSystem;
}

export interface SceneManipulatorDragHandlers {
  onSilkDragStart: () => void;
  onSilkDragEnd: () => void;
  onSilkTransform: (delta: Matrix4) => void;
  onCornerTransform: (cornerIndex: number, pin: Object3D) => void;
  onPropTransform: (kind: 'cube' | 'sphere') => void;
  wake: () => void;
  wakeSimulation: () => void;
}

export class SceneManipulator {
  readonly controls: TransformControls;
  private dragging = false;
  private readonly clothManipulatorPrevWorld = new Matrix4();
  private readonly clothManipulatorDelta = new Matrix4();
  private readonly clothManipulatorPrevInverse = new Matrix4();
  private readonly getContext: () => SceneManipulatorContext | null;
  private readonly handlers: SceneManipulatorDragHandlers;

  constructor(
    camera: Camera,
    domElement: HTMLElement,
    scene: Scene,
    orbitControls: OrbitControls,
    getContext: () => SceneManipulatorContext | null,
    handlers: SceneManipulatorDragHandlers,
  ) {
    this.getContext = getContext;
    this.handlers = handlers;
    this.controls = new TransformControls(camera, domElement);
    this.controls.size = 0.65;
    this.controls.setSpace('world');
    scene.add(this.controls.getHelper());

    this.controls.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value;
      this.dragging = event.value === true;
      if (this.dragging) {
        this.handlers.onSilkDragStart();
        const ctx = this.getContext();
        if (ctx?.layers.selected === 'silk') {
          ctx.clothManipulator.updateMatrixWorld(true);
          this.clothManipulatorPrevWorld.copy(ctx.clothManipulator.matrixWorld);
        }
        this.handlers.wakeSimulation();
        this.handlers.wake();
      } else {
        this.handlers.onSilkDragEnd();
      }
    });

    this.controls.addEventListener('change', () => {
      if (!this.dragging) return;
      const ctx = this.getContext();
      if (!ctx) return;
      const selected = ctx.layers.selected;

      if (selected === 'silk') {
        ctx.clothManipulator.updateMatrixWorld(true);
        this.clothManipulatorPrevInverse.copy(this.clothManipulatorPrevWorld).invert();
        this.clothManipulatorDelta
          .copy(ctx.clothManipulator.matrixWorld)
          .multiply(this.clothManipulatorPrevInverse);
        this.handlers.onSilkTransform(this.clothManipulatorDelta);
        this.clothManipulatorPrevWorld.copy(ctx.clothManipulator.matrixWorld);
      } else if (selected === 'silkCorners') {
        const corner = Math.min(ctx.activeCornerGizmo, ctx.pinnedCornersCount - 1);
        const pin = ctx.pins.getPinMesh(corner);
        if (pin) {
          this.handlers.onCornerTransform(corner, pin);
        }
      } else if (selected === 'cube' || selected === 'sphere') {
        const kind = ctx.sceneProps.getAttachedPropKind(this.controls.object);
        if (kind) {
          this.handlers.onPropTransform(kind);
        }
      }

      this.handlers.wakeSimulation();
      this.handlers.wake();
    });
  }

  isDragging(): boolean {
    return this.dragging;
  }

  setMode(mode: 'translate' | 'rotate'): void {
    this.controls.setMode(mode);
    this.handlers.wake();
  }

  syncAttachment(ctx: SceneManipulatorContext): void {
    const { layers } = ctx;
    const selected = layers.selected;

    const showHelper = selected !== null;
    ctx.pins.setGizmoHelperVisible(showHelper);

    if (selected === null || !layers.visibility[selected]) {
      this.controls.detach();
      return;
    }

    switch (selected) {
      case 'silk':
        this.controls.attach(ctx.clothManipulator);
        break;
      case 'silkCorners':
        if (ctx.pinnedCornersCount > 0) {
          const corner = Math.min(ctx.activeCornerGizmo, ctx.pinnedCornersCount - 1);
          const pin = ctx.pins.getPinMesh(corner);
          if (pin) {
            this.controls.attach(pin);
          } else {
            this.controls.detach();
          }
        } else {
          this.controls.detach();
        }
        break;
      case 'cube':
        this.controls.attach(ctx.sceneProps.cubeMesh);
        break;
      case 'sphere':
        this.controls.attach(ctx.sceneProps.sphereMesh);
        break;
      default:
        this.controls.detach();
    }
  }

  dispose(): void {
    this.controls.dispose();
  }
}
