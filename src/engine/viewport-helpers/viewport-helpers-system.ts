import { Group, type Scene } from 'three/webgpu';
import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import type { LightingSystem } from '@/engine/lighting/lighting-system';
import type { ViewportHelpersState } from '@/scene/scene-api';
import { createFloorGridHelper, createFloorGridMajorHelper } from './floor-grid';
import { createForwardArrowHelper } from './forward-arrow';
import { createWorldOriginHelper } from './world-origin';

export class ViewportHelpersSystem {
  private readonly root = new Group();
  private readonly floorGrid = createFloorGridHelper();
  private readonly floorGridMajor = createFloorGridMajorHelper();
  private readonly worldOrigin = createWorldOriginHelper();
  private readonly forwardArrow = createForwardArrowHelper();

  private state: ViewportHelpersState = { ...SCENE_DEFAULTS.viewportHelpers };

  constructor(scene: Scene) {
    this.root.name = 'viewport-helpers';
    this.root.add(this.floorGrid);
    this.root.add(this.floorGridMajor);
    this.root.add(this.worldOrigin);
    this.root.add(this.forwardArrow);
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

    if (!this.state.forwardArrow) {
      this.forwardArrow.visible = false;
      return;
    }

    // Fixed world +Z — same forward as the blue axis on World origin.
    this.forwardArrow.visible = true;
    this.forwardArrow.position.set(center.x, 0, center.z);
    this.forwardArrow.rotation.set(0, 0, 0);
  }

  dispose(): void {
    this.root.removeFromParent();
  }

  private applyVisibility(): void {
    this.floorGrid.visible = this.state.floorGrid;
    this.floorGridMajor.visible = this.state.floorGrid;
    this.worldOrigin.visible = this.state.worldOrigin;
    if (!this.state.forwardArrow) {
      this.forwardArrow.visible = false;
    }
  }
}
