import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Mesh,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  type RenderTarget,
  type WebGPURenderer,
} from 'three/webgpu';
import { ENV_MAP_PMREM_SIZE, ENV_MAP_REBUILD_DEBOUNCE_MS } from '@/constants';
import type { SkyboxMaterial } from '@/materials/skyboxMaterial';
import type { ReflectionSource } from '@/scene/scene-api';

/** Slight blur so softbox edges stay crisp but not aliased (same as three.js examples). */
const STUDIO_BLUR_SIGMA = 0.04;

/**
 * Builds scene.environment (IBL reflections) from one of two sources:
 * - `sky`: the shared sky gradient material; rebuild is debounced on sky edits.
 * - `studio`: three.js RoomEnvironment (softbox room), baked once on first use.
 * The visible background is not affected.
 */
export class EnvironmentReflectionMap {
  private readonly mainScene: Scene;
  private readonly pmremScene = new Scene();
  private readonly pmremGenerator: PMREMGenerator;
  private readonly pmremMesh: Mesh;
  private pmremTarget: RenderTarget | null = null;
  private rebuildTimer: ReturnType<typeof setTimeout> | null = null;
  private studioTarget: RenderTarget | null = null;
  private source: ReflectionSource = 'sky';
  private reflectionEnabled = true;
  private onRebuildComplete: (() => void) | null = null;

  constructor(renderer: WebGPURenderer, mainScene: Scene, skyMaterial: SkyboxMaterial) {
    this.mainScene = mainScene;
    this.pmremGenerator = new PMREMGenerator(renderer);

    const geometry = new SphereGeometry(1, 48, 32);
    this.pmremMesh = new Mesh(geometry, skyMaterial);
    this.pmremMesh.frustumCulled = false;
    this.pmremScene.add(this.pmremMesh);
    this.pmremScene.background = null;
    this.pmremScene.fog = null;
  }

  setReflectionEnabled(enabled: boolean): void {
    this.reflectionEnabled = enabled;
    this.applyEnvironmentAssignment();
  }

  setSource(source: ReflectionSource): void {
    if (this.source === source) {return;}
    this.source = source;
    this.applyEnvironmentAssignment();
    this.onRebuildComplete?.();
  }

  setReflectionIntensity(intensity: number): void {
    this.mainScene.environmentIntensity = intensity;
  }

  setOnRebuildComplete(listener: (() => void) | null): void {
    this.onRebuildComplete = listener;
  }

  scheduleRebuild(): void {
    if (this.rebuildTimer !== null) {
      clearTimeout(this.rebuildTimer);
    }

    this.rebuildTimer = setTimeout(() => {
      this.rebuildTimer = null;
      this.rebuild();
    }, ENV_MAP_REBUILD_DEBOUNCE_MS);
  }

  rebuild(): void {
    const previous = this.pmremTarget;
    this.pmremTarget = this.pmremGenerator.fromScene(this.pmremScene, 0, 0.1, 100, {
      size: ENV_MAP_PMREM_SIZE,
    });
    this.applyEnvironmentAssignment();

    if (previous) {
      previous.dispose();
    }

    this.onRebuildComplete?.();
  }

  dispose(): void {
    if (this.rebuildTimer !== null) {
      clearTimeout(this.rebuildTimer);
      this.rebuildTimer = null;
    }

    this.mainScene.environment = null;

    if (this.studioTarget) {
      this.studioTarget.dispose();
      this.studioTarget = null;
    }

    if (this.pmremTarget) {
      this.pmremTarget.dispose();
      this.pmremTarget = null;
    }

    this.pmremMesh.geometry.dispose();
    this.pmremGenerator.dispose();
  }

  private applyEnvironmentAssignment(): void {
    const target = this.source === 'studio' ? this.ensureStudioTarget() : this.pmremTarget;
    if (!this.reflectionEnabled || !target) {
      this.mainScene.environment = null;
      return;
    }

    this.mainScene.environment = target.texture;
  }

  private ensureStudioTarget(): RenderTarget {
    if (!this.studioTarget) {
      const room = new RoomEnvironment();
      this.studioTarget = this.pmremGenerator.fromScene(room, STUDIO_BLUR_SIGMA, 0.1, 100, {
        size: ENV_MAP_PMREM_SIZE,
      });
      room.dispose();
    }
    return this.studioTarget;
  }
}
