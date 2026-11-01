import { Group, Mesh, type Material, type Scene } from 'three/webgpu';
import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import type { ViewportHelpersState } from '@/scene/scene-api';
import { createFloorGridHelper, createFloorGridMajorHelper } from './floor-grid';
import { createCompassArrowsHelper } from './compass-arrows';
import { createQuadrantGridHelper } from './quadrant-grid';
import { createWorldOriginHelper } from './world-origin';

export class ViewportHelpersSystem {
  private readonly root = new Group();
  private readonly floorGrid = createFloorGridHelper();
  private readonly floorGridMajor = createFloorGridMajorHelper();
  private readonly quadrantGrid = createQuadrantGridHelper();
  private readonly worldOrigin = createWorldOriginHelper();
  private readonly compassArrows = createCompassArrowsHelper();

  private state: ViewportHelpersState = { ...SCENE_DEFAULTS.viewportHelpers };

  constructor(scene: Scene) {
    this.root.name = 'viewport-helpers';
    this.root.add(this.floorGrid);
    this.root.add(this.floorGridMajor);
    this.root.add(this.quadrantGrid);
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

  dispose(): void {
    this.root.removeFromParent();
    this.root.traverse((object) => {
      if (!(object instanceof Mesh) && !('isLine' in object)) {return;}
      const { geometry, material } = object as Mesh;
      geometry.dispose();
      for (const m of ([] as Material[]).concat(material)) {m.dispose();}
    });
  }

  private applyVisibility(): void {
    this.floorGrid.visible = this.state.floorGrid;
    this.floorGridMajor.visible = this.state.floorGrid;
    this.worldOrigin.visible = this.state.worldOrigin;
    this.quadrantGrid.visible = this.state.quadrantGrid;
    this.compassArrows.visible = this.state.compassArrows;
  }
}
