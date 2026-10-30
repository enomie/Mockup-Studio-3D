import { Group, type Scene } from 'three/webgpu';
import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import type { LightingSystem } from '@/engine/lighting/lighting-system';
import type { ViewportHelpersState } from '@/scene/scene-api';
import { createFloorGridHelper, createFloorGridMajorHelper } from './floor-grid';
import { createCompassArrowsHelper } from './compass-arrows';
import { createWorldOriginHelper } from './world-origin';

export class ViewportHelpersSystem {
  private readonly root = new Group();
  private readonly floorGrid = createFloorGridHelper();
  private readonly floorGridMajor = createFloorGridMajorHelper();
  private readonly worldOrigin = createWorldOriginHelper();
  private readonly compassArrows = createCompassArrowsHelper();

  private state: ViewportHelpersState = { ...SCENE_DEFAULTS.viewportHelpers };

  constructor(scene: Scene) {
    this.root.name = 'viewport-helpers';
    this.root.add(this.floorGrid);
    this.root.add(this.floorGridMajor);
    this.root.add(this.worldOrigin);
    this.root.add(this.compassArrows);
    scene.add(this.root);
    this.applyVisibility();
  }

  apply(state: ViewportHelpersState): void {
    this.state = { ...state };
    this.applyVisibility();
  }

  setPartial(partial: Partial<ViewportHelpersState>): void {
    this.state = { ...this.state, ...partial };
    this.applyVisibility();
  }

  getState(): ViewportHelpersState {
    return { ...this.state };
  }

  updateFrame(lighting: LightingSystem): void {
    const center = lighting.getReferenceCenter();
    this.worldOrigin.position.set(center.x, 0, center.z);

    if (!this.state.compassArrows) {
      this.compassArrows.visible = false;
      return;
    }

    // Fixed world directions — see world-compass.ts (North = -Z, East = +X).
    this.compassArrows.visible = true;
    this.compassArrows.position.set(center.x, 0, center.z);
    this.compassArrows.rotation.set(0, 0, 0);
  }

  dispose(): void {
    this.root.removeFromParent();
  }

  private applyVisibility(): void {
    this.floorGrid.visible = this.state.floorGrid;
    this.floorGridMajor.visible = this.state.floorGrid;
    this.worldOrigin.visible = this.state.worldOrigin;
    if (!this.state.compassArrows) {
      this.compassArrows.visible = false;
    }
  }
}
