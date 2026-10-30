import { Color, Fog, type Camera, type Mesh, type Scene, type WebGPURenderer } from 'three/webgpu';
import { rgbToColor, type Rgb } from '@/colors/rgb';
import type { EnvironmentDefaults } from '@/config/scene-defaults';
import type { MaterialResolver } from './material-resolver';
import type { GroundMaterial } from '@/materials/groundMaterial';
import { EnvironmentReflectionMap } from '@/render/environment-map';
import type { Skybox } from '@/render/skybox';
import { normalizeGroundSettings } from '@/scene/ground-settings';
import type { ExportGroundSurface } from '@/scene/export-image';
import type { EnvironmentState, GroundSettings } from '@/scene/scene-api';
import type { ViewportInvalidation } from './viewport-invalidation';

export class EnvironmentSystem {
  private readonly fog: Fog;
  private readonly reflectionMap: EnvironmentReflectionMap;
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

    this.reflectionMap = new EnvironmentReflectionMap(
      renderer,
      this.mainScene,
      skybox.getMaterial(),
    );
    this.reflectionMap.setReflectionIntensity(defaults.reflectionIntensity);
    this.reflectionMap.setReflectionEnabled(defaults.reflectionEnabled);
    this.reflectionMap.setSource(defaults.reflectionSource);
    this.reflectionMap.rebuild();

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
    this.reflectionMap.setOnRebuildComplete(() => {
      invalidation.invalidate();
    });
  }

  apply(state: EnvironmentState): void {
    this.setEnvironment(state);
  }

  setEnvironment(partial: Partial<EnvironmentState>): void {
    if (partial.skyEnabled !== undefined) {this.setSkyEnabled(partial.skyEnabled);}
    if (partial.skyHorizonColor) {this.setSkyHorizonColor(partial.skyHorizonColor);}
    if (partial.skyZenithColor) {this.setSkyZenithColor(partial.skyZenithColor);}
    if (partial.skyGradientFade !== undefined) {this.setSkyGradientFade(partial.skyGradientFade);}
    if (partial.fogEnabled !== undefined) {this.setFogEnabled(partial.fogEnabled);}
    if (partial.fogColor) {this.setFogColor(partial.fogColor);}
    if (partial.fogNear !== undefined) {this.fog.near = partial.fogNear;}
    if (partial.fogFar !== undefined) {this.fog.far = partial.fogFar;}
    if (partial.reflectionEnabled !== undefined) {
      this.reflectionMap.setReflectionEnabled(partial.reflectionEnabled);
    }
    if (partial.reflectionIntensity !== undefined) {
      this.reflectionMap.setReflectionIntensity(partial.reflectionIntensity);
    }
    if (partial.reflectionSource !== undefined) {
      this.reflectionMap.setSource(partial.reflectionSource);
    }
  }

  getSkyEnabled(): boolean {
    return this.skyEnabled;
  }

  getFogEnabled(): boolean {
    return this.fogEnabled;
  }

  private setSkyEnabled(enabled: boolean): void {
    this.skyEnabled = enabled;
    this.skybox.setVisible(enabled);
  }

  private setFogEnabled(enabled: boolean): void {
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

  private setSkyHorizonColor(rgb: Rgb): void {
    this.skybox.setHorizonColor(rgb);
    this.reflectionMap.scheduleRebuild();
  }

  private setSkyZenithColor(rgb: Rgb): void {
    this.skybox.setZenithColor(rgb);
    this.reflectionMap.scheduleRebuild();
  }

  private setSkyGradientFade(fade: number): void {
    this.skybox.setGradientFade(fade);
    this.reflectionMap.scheduleRebuild();
  }



  private setFogColor(rgb: Rgb): void {
    const color = rgbToColor(rgb);
    this.fog.color.setRGB(color.r, color.g, color.b);
  }


  updateFrame(camera: Camera): void {
    this.skybox.update(camera);
  }

  dispose(): void {
    this.reflectionMap.dispose();
  }
}
