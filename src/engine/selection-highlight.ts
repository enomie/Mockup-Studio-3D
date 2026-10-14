import {
  BackSide,
  type BufferGeometry,
  type LineBasicNodeMaterial,
  type Material,
  Mesh,
  MeshBasicNodeMaterial,
} from 'three/webgpu';
import {
  SELECTION_OUTLINE_COLOR,
  SELECTION_OUTLINE_RENDER_ORDER,
  SELECTION_OUTLINE_SCALE,
  LIGHT_WIREFRAME_IDLE_OPACITY,
  LIGHT_WIREFRAME_SELECTED_OPACITY,
} from '@/constants';
import type { EntityRegistry } from './entity-registry';
import type { LightingSystem } from './lighting/lighting-system';
import { LIGHT_FILL_ID, LIGHT_KEY_ID, type StudioLightId } from '@/scene/light-ids';

export class SelectionHighlight {
  private readonly registry: EntityRegistry;
  private readonly lighting: LightingSystem;
  private outlineMeshes: Mesh<BufferGeometry, Material>[] = [];
  private outlineMaterial: MeshBasicNodeMaterial | null = null;

  constructor(registry: EntityRegistry, lighting: LightingSystem) {
    this.registry = registry;
    this.lighting = lighting;

    registry.subscribeSelection((entityId) => {
      this.updateAssetOutline(entityId);
    });

    registry.subscribeEntities(() => {
      const selectedId = registry.getSelectedEntityId();
      if (selectedId) {
        this.updateAssetOutline(selectedId);
      }
    });

    lighting.subscribeSelection((lightId) => {
      this.updateLightWireframes(lightId);
    });

    this.updateLightWireframes(lighting.getSelectedLightId());
  }

  dispose(): void {
    this.clearAssetOutline();
    this.updateLightWireframes(null);
  }

  private updateAssetOutline(entityId: string | null): void {
    this.clearAssetOutline();
    if (!entityId) {return;}

    const runtime = this.registry.getRuntime(entityId);
    if (!runtime) {return;}

    const outlineMaterial = new MeshBasicNodeMaterial({
      color: SELECTION_OUTLINE_COLOR,
      side: BackSide,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.outlineMaterial = outlineMaterial;

    runtime.object.traverse((child) => {
      if (!(child instanceof Mesh) || !child.geometry) {return;}
      if (child.userData.selectionOutline) {return;}

      const outlineMesh = new Mesh(child.geometry, outlineMaterial);
      outlineMesh.userData.selectionOutline = true;
      outlineMesh.position.copy(child.position);
      outlineMesh.rotation.copy(child.rotation);
      outlineMesh.scale.copy(child.scale).multiplyScalar(SELECTION_OUTLINE_SCALE);
      outlineMesh.renderOrder = SELECTION_OUTLINE_RENDER_ORDER;
      outlineMesh.castShadow = false;
      outlineMesh.receiveShadow = false;

      runtime.object.add(outlineMesh);
      this.outlineMeshes.push(outlineMesh as Mesh<BufferGeometry, Material>);
    });
  }

  private clearAssetOutline(): void {
    for (const mesh of this.outlineMeshes) {
      mesh.parent?.remove(mesh);
    }
    this.outlineMeshes = [];
    this.outlineMaterial?.dispose();
    this.outlineMaterial = null;
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
