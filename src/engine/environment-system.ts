import { Color, Fog, type Camera, type Mesh, type Scene, type WebGPURenderer } from 'three/webgpu';
import { rgbToColor, type Rgb } from '@/colors/rgb';
import type { EnvironmentDefaults } from '@/config/scene-defaults';
import type { MaterialResolver } from './material-resolver';
import type { GroundMaterial } from '@/materials/groundMaterial';
import { SkyEnvironmentMap } from '@/render/environment-map';
import type { Skybox } from '@/render/skybox';
import { normalizeGroundSettings } from '@/scene/ground-settings';
import type { ExportGroundSurface } from '@/scene/export-image';
import type { EnvironmentState, GroundSettings } from '@/scene/scene-api';
import type { ViewportInvalidation } from './viewport-invalidation';

export class EnvironmentSystem {
  private readonly fog: Fog;
  private readonly skyEnvironmentMap: SkyEnvironmentMap;
  private skyEnabled = true;
  private fogEnabled = true;
  private groundSettings: GroundSettings;
  private materialResolver: MaterialResolver | null = null;
  private exportCaptureDepth = 0;

  constructor(
    private readonly mainScene: Scene,
    renderer: WebGPURenderer,
    private readonly skybox: Skybox,
    private readonly groundMesh: Mesh,
    private readonly groundMaterial: GroundMaterial,
    defaults: EnvironmentDefaults,
    initialGround: GroundSettings,
  ) {
    this.groundSettings = normalizeGroundSettings(initialGround);

    const fogColor = rgbToColor(defaults.fogColor);
    this.fog = new Fog(
      new Color(fogColor.r, fogColor.g, fogColor.b),
      defaults.fogNear,
      defaults.fogFar,
    );
    this.mainScene.fog = this.fog;
    this.mainScene.background = null;

    this.skyEnvironmentMap = new SkyEnvironmentMap(
      renderer,
      this.mainScene,
      skybox.getMaterial(),
    );
    this.skyEnvironmentMap.setReflectionIntensity(defaults.reflectionIntensity);
    this.skyEnvironmentMap.setReflectionEnabled(defaults.reflectionEnabled);
    this.skyEnvironmentMap.rebuild();

    this.apply(defaults);
  }

  canUseGroundShadowCatcherExport(): boolean {
    return this.groundSettings.visible && this.groundSettings.receiveShadow;
  }

  pushGroundExportCaptureMode(mode: ExportGroundSurface): void {
    if (mode !== 'contact-shadows-only') {return;}
    if (!this.canUseGroundShadowCatcherExport()) {return;}
    if (this.exportCaptureDepth > 0) {return;}

    this.exportCaptureDepth += 1;
    this.groundMaterial.setMirrorEnabled(false);
    this.groundMaterial.setExportShadowCatcherActive(true);
  }

  popGroundExportCaptureMode(): void {
    if (this.exportCaptureDepth === 0) {return;}

    this.exportCaptureDepth -= 1;
    this.groundMaterial.setExportShadowCatcherActive(false);
    this.groundMaterial.applySettings(this.groundSettings);
  }

  setMaterialResolver(resolver: MaterialResolver): void {
    this.materialResolver = resolver;
  }

  setViewportInvalidation(invalidation: ViewportInvalidation): void {
    this.skyEnvironmentMap.setOnRebuildComplete(() => {
      invalidation.invalidate();
    });
  }

  apply(state: EnvironmentState): void {
    this.setSkyEnabled(state.skyEnabled);
    this.setSkyHorizonColor(state.skyHorizonColor);
    this.setSkyZenithColor(state.skyZenithColor);
    this.setSkyGradientFade(state.skyGradientFade);
    this.setFogEnabled(state.fogEnabled);
    this.setFogColor(state.fogColor);
    this.setFogDistances(state.fogNear, state.fogFar);
    this.setReflectionEnabled(state.reflectionEnabled);
    this.setReflectionIntensity(state.reflectionIntensity);
  }

  getSkyEnabled(): boolean {
    return this.skyEnabled;
  }

  getFogEnabled(): boolean {
    return this.fogEnabled;
  }

  setSkyEnabled(enabled: boolean): void {
    this.skyEnabled = enabled;
    this.skybox.setVisible(enabled);
  }

  setFogEnabled(enabled: boolean): void {
    this.fogEnabled = enabled;
    this.mainScene.fog = enabled ? this.fog : null;
  }

  applyGround(state: GroundSettings): void {
    this.groundSettings = normalizeGroundSettings(state);
    this.applyGroundMaterialFromId(this.groundSettings.materialId);
    this.groundMaterial.applySettings(this.groundSettings);
    this.groundMesh.visible = this.groundSettings.visible;
    this.groundMesh.receiveShadow = this.groundSettings.receiveShadow;
  }

  setGround(partial: Partial<GroundSettings>): void {
    this.groundSettings = normalizeGroundSettings({
      ...this.groundSettings,
      ...partial,
    });

    if (partial.materialId !== undefined) {
      this.applyGroundMaterialFromId(partial.materialId);
    }
    if (
      partial.mirrorEnabled !== undefined ||
      partial.mirrorOpacity !== undefined
    ) {
      this.groundMaterial.applySettings(this.groundSettings);
    }
    if (partial.visible !== undefined) {
      this.groundMesh.visible = partial.visible;
    }
    if (partial.receiveShadow !== undefined) {
      this.groundMesh.receiveShadow = partial.receiveShadow;
    }
  }

  refreshGroundMaterialIfMatches(materialId: string): void {
    if (this.groundSettings.materialId !== materialId) {return;}
    this.applyGroundMaterialFromId(materialId);
  }

  reapplyGroundSurface(): void {
    this.applyGroundMaterialFromId(this.groundSettings.materialId);
  }

  private applyGroundMaterialFromId(materialId: string): void {
    const preset = this.materialResolver?.resolvePreset(materialId);
    if (!preset) {return;}
    this.groundMaterial.applyMaterialPreset(preset);
  }

  setSkyHorizonColor(rgb: Rgb): void {
    this.skybox.setHorizonColor(rgb);
    this.skyEnvironmentMap.scheduleRebuild();
  }

  setSkyZenithColor(rgb: Rgb): void {
    this.skybox.setZenithColor(rgb);
    this.skyEnvironmentMap.scheduleRebuild();
  }

  setSkyGradientFade(fade: number): void {
    this.skybox.setGradientFade(fade);
    this.skyEnvironmentMap.scheduleRebuild();
  }

  setReflectionEnabled(enabled: boolean): void {
    this.skyEnvironmentMap.setReflectionEnabled(enabled);
  }

  setReflectionIntensity(intensity: number): void {
    this.skyEnvironmentMap.setReflectionIntensity(intensity);
  }

  setFogColor(rgb: Rgb): void {
    const color = rgbToColor(rgb);
    this.fog.color.setRGB(color.r, color.g, color.b);
  }

  setFogDistances(near: number, far: number): void {
    this.fog.near = near;
    this.fog.far = far;
  }

  updateFrame(camera: Camera): void {
    this.skybox.update(camera);
  }

  dispose(): void {
    this.skyEnvironmentMap.dispose();
  }
}
