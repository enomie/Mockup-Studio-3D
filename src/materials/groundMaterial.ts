import {
  MeshPhysicalNodeMaterial,
  type Mesh,
  type MeshStandardNodeMaterial,
  type Node,
} from 'three/webgpu';
import { float, max, min, mix, vec3, vec4 } from 'three/tsl';
import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import { createGroundSurfaceMaterial } from '@/engine/material-resolver';
import type { PlanarReflectionPass } from '@/render/planar-reflection';
import type { GroundSettings } from '@/scene/scene-api';
import type { MaterialPreset } from '@/scene/material-types';
import { createFloatUniform, setUniformFloat } from './uniform-float';

/** WebGPU ground — library preset surface + optional planar mirror (TSL). */
export class GroundMaterial extends MeshPhysicalNodeMaterial {
  readonly uMirrorRoughness = createFloatUniform(0.92);
  readonly uMirrorOpacity = createFloatUniform(SCENE_DEFAULTS.ground.mirrorOpacity);

  private readonly planarReflection: PlanarReflectionPass;
  private mirrorEnabledDesired = false;
  private mirrorWired = false;
  private groundMesh: Mesh | null = null;
  private exportShadowCatcherActive = false;
  private savedTransparent = false;
  private savedDepthWrite = true;

  constructor(
    planarReflection: PlanarReflectionPass,
    initial: GroundSettings = SCENE_DEFAULTS.ground,
  ) {
    super({ roughness: 0.92, metalness: 0 });
    this.planarReflection = planarReflection;
    this.transparent = false;
    this.opacity = 1;
    this.depthWrite = true;
    this.setMirrorOpacity(initial.mirrorOpacity);
    this.setMirrorEnabled(initial.mirrorEnabled);
  }

  bindGroundMesh(mesh: Mesh): void {
    this.groundMesh = mesh;
    this.applyMirrorWiring();
  }

  isMirrorEnabled(): boolean {
    return this.mirrorEnabledDesired;
  }

  getPlanarReflection(): PlanarReflectionPass {
    return this.planarReflection;
  }

  applySettings(settings: GroundSettings): void {
    this.setMirrorOpacity(settings.mirrorOpacity);
    this.setMirrorEnabled(settings.mirrorEnabled);
  }

  applyMaterialPreset(preset: MaterialPreset): void {
    const source = createGroundSurfaceMaterial(preset);
    this.copySurfaceFrom(source);
    setUniformFloat(this.uMirrorRoughness, preset.roughness ?? 0.5);
    source.dispose();
    this.needsUpdate = true;
  }

  setMirrorOpacity(value: number): void {
    setUniformFloat(this.uMirrorOpacity, value);
  }

  setMirrorEnabled(enabled: boolean): void {
    this.mirrorEnabledDesired = enabled;
    this.applyMirrorWiring();
  }

  /** PNG export only — same lighting/shadows as live ground, no visible albedo/mirror. */
  setExportShadowCatcherActive(active: boolean): void {
    if (this.exportShadowCatcherActive === active) {return;}
    this.exportShadowCatcherActive = active;
    if (active) {
      this.savedTransparent = this.transparent;
      this.savedDepthWrite = this.depthWrite;
      this.transparent = true;
      this.depthWrite = false;
    } else {
      this.transparent = this.savedTransparent;
      this.depthWrite = this.savedDepthWrite;
    }
    this.needsUpdate = true;
  }

  disposeMirror(): void {
    this.unwireMirror();
    this.planarReflection.dispose();
  }

  setupOutput(
    builder: Parameters<MeshPhysicalNodeMaterial['setupOutput']>[0],
    outputNode: Parameters<MeshPhysicalNodeMaterial['setupOutput']>[1],
  ) {
    const colorOutput = outputNode as Node<'vec4'>;

    if (this.exportShadowCatcherActive) {
      const shaded = colorOutput.rgb;
      const albedo: Node<'vec3'> =
        this.colorNode !== null
          ? (this.colorNode as Node<'vec3'>)
          : vec3(float(this.color.r), float(this.color.g), float(this.color.b));
      const epsilon = float(0.001);
      const light = shaded.div(max(albedo, vec3(epsilon))).clamp(0, 1);
      const lightMin = min(min(light.r, light.g), light.b);
      const alpha = float(1).sub(lightMin);
      const catcher = vec4(float(0), float(0), float(0), alpha);
      return super.setupOutput(builder, catcher);
    }

    if (!this.mirrorWired) {
      return super.setupOutput(builder, outputNode);
    }

    const mirrorColor = this.planarReflection.node as Node<'vec4'>;
    const roughnessInverse = float(1).sub(this.uMirrorRoughness);
    const blend = this.uMirrorOpacity.mul(roughnessInverse);
    const mixed = vec4(mix(colorOutput.rgb, mirrorColor.rgb, blend), colorOutput.a);
    return super.setupOutput(builder, mixed);
  }

  private copySurfaceFrom(
    source: MeshStandardNodeMaterial | MeshPhysicalNodeMaterial,
  ): void {
    if (source.colorNode) {
      this.colorNode = source.colorNode;
    } else {
      this.colorNode = null;
      this.color.copy(source.color);
    }
    if (source.roughnessNode) {
      this.roughnessNode = source.roughnessNode;
    } else {
      this.roughnessNode = null;
      this.roughness = source.roughness;
    }
    if (source.metalnessNode) {
      this.metalnessNode = source.metalnessNode;
    } else {
      this.metalnessNode = null;
      this.metalness = source.metalness;
    }
    this.normalNode = source.normalNode ?? null;
    this.emissiveNode = source.emissiveNode ?? null;
    this.opacityNode = null;

    this.transparent = false;
    this.opacity = 1;
    this.depthWrite = true;

    if (source instanceof MeshPhysicalNodeMaterial) {
      this.clearcoat = source.clearcoat;
      this.clearcoatRoughness = source.clearcoatRoughness;
      this.anisotropy = source.anisotropy;
      this.anisotropyRotation = source.anisotropyRotation;
      this.ior = source.ior;
      this.specularIntensity = source.specularIntensity;
      this.envMapIntensity = source.envMapIntensity;
    } else {
      this.clearcoat = 0;
      this.clearcoatRoughness = 0;
      this.anisotropy = 0;
      this.anisotropyRotation = 0;
    }
  }

  private applyMirrorWiring(): void {
    if (!this.groundMesh) {return;}

    if (this.mirrorEnabledDesired) {
      this.wireMirror();
    } else {
      this.unwireMirror();
    }
  }

  private wireMirror(): void {
    if (!this.groundMesh || this.mirrorWired) {return;}

    this.groundMesh.add(this.planarReflection.target);
    this.mirrorWired = true;
    this.needsUpdate = true;
  }

  private unwireMirror(): void {
    if (!this.groundMesh || !this.mirrorWired) {return;}

    this.groundMesh.remove(this.planarReflection.target);
    this.mirrorWired = false;
    this.needsUpdate = true;
  }
}

export function createGroundMaterial(
  planarReflection: PlanarReflectionPass,
  initial?: GroundSettings,
): GroundMaterial {
  return new GroundMaterial(planarReflection, initial ?? SCENE_DEFAULTS.ground);
}
