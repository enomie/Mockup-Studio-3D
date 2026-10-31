import { type LineBasicNodeMaterial, Mesh, type Object3D } from 'three/webgpu';
import {
  SELECTION_MASK_LAYER,
  LIGHT_WIREFRAME_IDLE_OPACITY,
  LIGHT_WIREFRAME_SELECTED_OPACITY,
} from '@/constants';
import type { EntityRegistry } from './entity-registry';
import type { LightingSystem } from './lighting/lighting-system';
import { LIGHT_FILL_ID, LIGHT_KEY_ID, type StudioLightId } from '@/scene/light-ids';

/**
 * Marks meshes of the selected asset on {@link SELECTION_MASK_LAYER}; the viewport
 * render pipeline draws a screen-space outline from that layer.
 */
export class SelectionHighlight {
  private readonly registry: EntityRegistry;
  private readonly lighting: LightingSystem;
  private markedMeshes: Object3D[] = [];

  constructor(registry: EntityRegistry, lighting: LightingSystem) {
    this.registry = registry;
    this.lighting = lighting;

    registry.subscribeSelection((entityId) => {
      this.updateAssetMask(entityId);
    });

    registry.subscribeEntities(() => {
      this.updateAssetMask(registry.getSelectedEntityId());
    });

    lighting.subscribeSelection((lightId) => {
      this.updateLightWireframes(lightId);
    });

    this.updateLightWireframes(lighting.getSelectedLightId());
  }

  /** True when an asset is selected and has at least one mesh marked for the outline. */
  hasAssetSelection(): boolean {
    return this.markedMeshes.length > 0;
  }

  dispose(): void {
    this.clearAssetMask();
    this.updateLightWireframes(null);
  }

  private updateAssetMask(entityId: string | null): void {
    this.clearAssetMask();
    if (!entityId) {return;}

    const runtime = this.registry.getRuntime(entityId);
    if (!runtime) {return;}

    runtime.object.traverse((child) => {
      if (!(child instanceof Mesh) || !child.geometry) {return;}
      child.layers.enable(SELECTION_MASK_LAYER);
      this.markedMeshes.push(child);
    });
  }

  private clearAssetMask(): void {
    for (const mesh of this.markedMeshes) {
      mesh.layers.disable(SELECTION_MASK_LAYER);
    }
    this.markedMeshes = [];
  }

  private updateLightWireframes(selectedLightId: StudioLightId | null): void {
    this.applyLightWireframeState(
      LIGHT_KEY_ID,
      selectedLightId === LIGHT_KEY_ID && this.lighting.isLightEnabled(LIGHT_KEY_ID),
    );
    this.applyLightWireframeState(
      LIGHT_FILL_ID,
      selectedLightId === LIGHT_FILL_ID && this.lighting.isLightEnabled(LIGHT_FILL_ID),
    );
  }

  private applyLightWireframeState(lightId: StudioLightId, selected: boolean): void {
    if (!this.lighting.isLightHandlesVisible()) {return;}
    const spotBeam = this.lighting.getSpotBeamHelper(lightId);
    if (!spotBeam?.visible) {return;}

    const material = spotBeam.cone.material as LineBasicNodeMaterial;
    material.opacity = selected
      ? LIGHT_WIREFRAME_SELECTED_OPACITY
      : LIGHT_WIREFRAME_IDLE_OPACITY;
    material.transparent = true;
  }
}
