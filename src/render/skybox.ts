import { Mesh, Scene, SphereGeometry, type Camera } from 'three/webgpu';
import { SKYBOX_RADIUS } from '@/constants';
import {
  createSkyboxMaterial,
  type SkyboxMaterial,
  type SkyState,
} from '@/materials/skyboxMaterial';

export class Skybox {
  private readonly skyScene = new Scene();
  private readonly mesh: Mesh;
  private readonly material: SkyboxMaterial;

  constructor() {
    this.skyScene.background = null;
    this.skyScene.fog = null;

    const geometry = new SphereGeometry(SKYBOX_RADIUS, 48, 32);
    this.material = createSkyboxMaterial();
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.skyScene.add(this.mesh);
  }

  getScene(): Scene {
    return this.skyScene;
  }

  setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  getVisible(): boolean {
    return this.mesh.visible;
  }

  getMaterial(): SkyboxMaterial {
    return this.material;
  }

  setSkyState(state: SkyState): void {
    this.material.setSkyState(state);
  }

  setHorizonColor(rgb: SkyState['horizonColor']): void {
    this.material.setHorizonColor(rgb);
  }

  setZenithColor(rgb: SkyState['zenithColor']): void {
    this.material.setZenithColor(rgb);
  }

  setGradientFade(fade: number): void {
    this.material.setGradientFade(fade);
  }

  update(camera: Camera): void {
    this.mesh.position.copy(camera.position);
  }
}
