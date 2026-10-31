import {
  AmbientLight,
  type Group,
  type Light,
  type MeshBasicNodeMaterial,
  type Scene,
  Vector3,
} from 'three/webgpu';
import { computeSceneShadowCoverageRadius } from '@/render/scene-shadow-coverage';
import {
  applyShadowMapSize,
  shadowRadiusForMapSize,
  applySpotShadowCast,
  updateSpotShadowCamera,
} from '@/render/shadow-setup';
import {
  SHADOW_COVERAGE_RADIUS,
  SHADOW_MAP_SIZE,
  SHADOW_MAP_SIZE_EXPORT,
} from '@/constants';
import { rgbToColor, type Rgb } from '@/colors/rgb';
import { cloneTransform, type Vec3 } from '@/scene/entity-types';
import { LIGHT_FILL_ID, LIGHT_KEY_ID, type StudioLightId } from '@/scene/light-ids';
import { mergeLightingSettings } from '@/scene/lighting-merge';
import type { DeepPartial, LightingSettings } from '@/scene/scene-api';
import {
  readTransformFromObject,
  type EntityRegistry,
} from '@/engine/entity-registry';
import type { PlanarReflectionPass } from '@/render/planar-reflection';
import { applySpotBeamDisplayScale } from './spot-beam-display';
import { FILL_DECAY, KEY_DECAY, LightPool } from './light-pool';
import type { SpotLightRig } from './light-rig';
import { orientFixtureDiscToward, setFixtureDiscColor } from './light-fixture-disc';
import {
  applyTransformOffset,
  computeOrbitPose,
  computeOffsetFromWorld,
  type StudioPose,
} from './studio-pose';

type SelectionListener = (lightId: StudioLightId | null) => void;

const KEY_PICK_COLOR: Rgb = { r: 1, g: 0.85, b: 0.6 };
const FILL_PICK_COLOR: Rgb = { r: 0.75, g: 0.85, b: 1 };
const _targetPosition = new Vector3();
/** Fixed world point the studio light rig orbits around. */
const STUDIO_ANCHOR: Vec3 = { x: 0, y: 0, z: 0 };

function cloneLightingSettings(settings: LightingSettings): LightingSettings {
  return {
    showFixtures: settings.showFixtures,
    fixturesReflectInMirror: settings.fixturesReflectInMirror,
    ambient: {
      enabled: settings.ambient.enabled,
      color: { ...settings.ambient.color },
      intensity: settings.ambient.intensity,
    },
    key: {
      enabled: settings.key.enabled,
      azimuthDeg: settings.key.azimuthDeg,
      elevationDeg: settings.key.elevationDeg,
      color: { ...settings.key.color },
      intensity: settings.key.intensity,
      castShadow: settings.key.castShadow,
      shadowSoftness: settings.key.shadowSoftness,
      transformOffset: cloneTransform(settings.key.transformOffset),
    },
    fill: {
      enabled: settings.fill.enabled,
      color: { ...settings.fill.color },
      azimuthDeg: settings.fill.azimuthDeg,
      elevationDeg: settings.fill.elevationDeg,
      intensity: settings.fill.intensity,
      distance: settings.fill.distance,
      castShadow: settings.fill.castShadow,
      shadowSoftness: settings.fill.shadowSoftness,
      transformOffset: cloneTransform(settings.fill.transformOffset),
    },
  };
}

function applyPoseToRig(
  rig: SpotLightRig,
  pose: StudioPose,
  targetPosition: Vector3,
  updateShadowCamera: boolean,
  shadowCoverageRadius: number,
): void {
  rig.helper.position.set(pose.position.x, pose.position.y, pose.position.z);
  rig.helper.rotation.set(0, 0, 0);

  rig.light.position.set(pose.position.x, pose.position.y, pose.position.z);
  rig.target.position.copy(targetPosition);

  rig.helper.updateMatrixWorld(true);
  rig.light.updateMatrixWorld(true);
  rig.target.updateMatrixWorld(true);
  if (rig.fixtureDisc) {
    orientFixtureDiscToward(rig.fixtureDisc, targetPosition);
  }

  if (updateShadowCamera) {
    updateSpotShadowCamera(rig.light, shadowCoverageRadius);
  }
}

function setLightColor(light: Light, color: Rgb): void {
  const rgb = rgbToColor(color);
  light.color.setRGB(rgb.r, rgb.g, rgb.b);
}

export class LightingSystem {
  private readonly scene: Scene;
  private readonly registry: EntityRegistry;
  private readonly lightPool: LightPool;
  private readonly ambient: AmbientLight;

  private settings: LightingSettings;
  private selectedLightId: StudioLightId | null = null;
  private readonly selectionListeners = new Set<SelectionListener>();
  private lightHandlesVisible = false;
  private planarReflection: PlanarReflectionPass | null = null;
  private shadowCoverageRadius = SHADOW_COVERAGE_RADIUS;
  private exportShadowQualityDepth = 0;

  constructor(scene: Scene, registry: EntityRegistry, initial: LightingSettings) {
    this.scene = scene;
    this.registry = registry;
    this.settings = cloneLightingSettings(initial);

    this.lightPool = new LightPool(scene);
    this.ambient = new AmbientLight(0xffffff, initial.ambient.intensity);
    scene.add(this.ambient);

    this.apply(initial);
  }

  setPlanarReflection(pass: PlanarReflectionPass): void {
    this.planarReflection = pass;
    this.syncFixtureMirrorReflection();
  }

  setLightHandlesVisible(visible: boolean): void {
    if (this.lightHandlesVisible === visible) {return;}
    this.lightHandlesVisible = visible;
    this.applyKey();
    this.applyFill();
    this.selectionListeners.forEach((listener) => { listener(this.selectedLightId); });
  }

  isLightHandlesVisible(): boolean {
    return this.lightHandlesVisible;
  }

  getRigWorldPosition(lightId: StudioLightId): Vec3 | null {
    if (!this.isLightEnabled(lightId)) {return null;}
    const rig = this.getRig(lightId);
    if (!rig) {return null;}
    return {
      x: rig.helper.position.x,
      y: rig.helper.position.y,
      z: rig.helper.position.z,
    };
  }

  apply(settings: LightingSettings): void {
    this.settings = cloneLightingSettings(settings);
    this.updateRigTransforms();
    this.applyAmbient();
    this.applyKey();
    this.applyFill();
    this.syncFixtureMirrorReflection();
  }

  setLighting(partial: DeepPartial<LightingSettings>): void {
    this.settings = mergeLightingSettings(this.settings, partial);

    this.updateRigTransforms();
    this.applyAmbient();
    this.applyKey();
    this.applyFill();
    this.syncFixtureMirrorReflection();
  }

  getLighting(): LightingSettings {
    return cloneLightingSettings(this.settings);
  }

  pushExportShadowQuality(): void {
    this.exportShadowQualityDepth += 1;
    if (this.exportShadowQualityDepth === 1) {
      this.applyShadowMapSizeToCasters(SHADOW_MAP_SIZE_EXPORT);
    }
  }

  popExportShadowQuality(): void {
    if (this.exportShadowQualityDepth <= 0) {
      return;
    }
    this.exportShadowQualityDepth -= 1;
    if (this.exportShadowQualityDepth === 0) {
      this.applyShadowMapSizeToCasters(SHADOW_MAP_SIZE);
    }
  }

  /** Keep shadow matrices current — call once per frame from the render loop. */
  updateFrame(): void {
    this.refreshShadowCoverageRadius();

    const rigs: SpotLightRig[] = [];
    if (this.settings.key.enabled) {rigs.push(this.getKeyRig());}
    if (this.settings.fill.enabled) {rigs.push(this.getFillRig());}

    for (const rig of rigs) {
      rig.light.position.copy(rig.helper.position);
      rig.helper.updateMatrixWorld(true);
      rig.light.updateMatrixWorld(true);
      rig.target.updateMatrixWorld(true);
      if (rig.fixtureDisc) {
        orientFixtureDiscToward(rig.fixtureDisc, rig.target.position);
      }
      const castsShadow =
        rig.id === LIGHT_KEY_ID
          ? this.settings.key.enabled && this.settings.key.castShadow
          : this.settings.fill.enabled && this.settings.fill.castShadow;
      if (castsShadow) {
        updateSpotShadowCamera(rig.light, this.shadowCoverageRadius);
      }
      this.refreshSpotBeam(rig);
    }
  }

  getPickables(): Group[] {
    const pickables: Group[] = [];
    if (this.settings.key.enabled) {
      pickables.push(this.getKeyRig().helper);
    }
    if (this.settings.fill.enabled) {
      pickables.push(this.getFillRig().helper);
    }
    return pickables;
  }

  isLightEnabled(lightId: StudioLightId): boolean {
    return lightId === LIGHT_KEY_ID
      ? this.settings.key.enabled
      : this.settings.fill.enabled;
  }

  getHelperObject(lightId: StudioLightId): Group | null {
    const rig = this.getRig(lightId);
    return rig?.helper ?? null;
  }

  getSelectedLightId(): StudioLightId | null {
    return this.selectedLightId;
  }

  setSelectedLightId(lightId: StudioLightId | null): void {
    if (this.selectedLightId === lightId) {return;}
    this.selectedLightId = lightId;
    this.selectionListeners.forEach((listener) => { listener(lightId); });
  }

  getSpotBeamHelper(lightId: StudioLightId): SpotLightRig['spotBeam'] | null {
    const rig = this.getRig(lightId);
    return rig?.spotBeam ?? null;
  }

  subscribeSelection(listener: SelectionListener): () => void {
    this.selectionListeners.add(listener);
    return () => this.selectionListeners.delete(listener);
  }

  syncOffsetFromHelper(lightId: StudioLightId): void {
    const rig = this.getRig(lightId);
    if (!rig) {return;}

    const base = this.getBasePose(lightId);
    const offset = computeOffsetFromWorld(base, readTransformFromObject(rig.helper));
    if (lightId === LIGHT_KEY_ID) {
      this.settings.key.transformOffset = offset;
    } else {
      this.settings.fill.transformOffset = offset;
    }
  }

  dispose(): void {
    sceneRemove(this.scene, this.ambient);
    this.lightPool.dispose(this.scene);
  }

  getLightPool(): LightPool {
    return this.lightPool;
  }

  private getKeyRig(): SpotLightRig {
    return this.lightPool.getKeyRig();
  }

  private getFillRig(): SpotLightRig {
    return this.lightPool.getFillRig();
  }

  private getRig(lightId: StudioLightId): SpotLightRig | null {
    return this.lightPool.getSpotRigById(lightId);
  }

  /** Lights orbit the fixed studio anchor — never the (moving) scene contents. */
  private getBasePose(lightId: StudioLightId): StudioPose {
    const center = STUDIO_ANCHOR;
    if (lightId === LIGHT_KEY_ID) {
      const { key } = this.settings;
      return computeOrbitPose(center, key.azimuthDeg, key.elevationDeg);
    }
    const { fill } = this.settings;
    return computeOrbitPose(center, fill.azimuthDeg, fill.elevationDeg, fill.distance);
  }

  private getWorldPose(lightId: StudioLightId): StudioPose {
    const base = this.getBasePose(lightId);
    const offset =
      lightId === LIGHT_KEY_ID
        ? this.settings.key.transformOffset
        : this.settings.fill.transformOffset;
    return applyTransformOffset(base, offset);
  }

  private updateRigTransforms(): void {
    _targetPosition.set(STUDIO_ANCHOR.x, STUDIO_ANCHOR.y, STUDIO_ANCHOR.z);
    this.refreshShadowCoverageRadius();

    const keyPose = this.getWorldPose(LIGHT_KEY_ID);
    applyPoseToRig(
      this.getKeyRig(),
      keyPose,
      _targetPosition,
      this.settings.key.enabled && this.settings.key.castShadow,
      this.shadowCoverageRadius,
    );

    const fillPose = this.getWorldPose(LIGHT_FILL_ID);
    applyPoseToRig(
      this.getFillRig(),
      fillPose,
      _targetPosition,
      this.settings.fill.enabled && this.settings.fill.castShadow,
      this.shadowCoverageRadius,
    );
  }

  private applyAmbient(): void {
    const { ambient } = this.settings;
    setLightColor(this.ambient, ambient.color);
    this.ambient.intensity = ambient.intensity;
    this.ambient.visible = ambient.enabled;
  }

  private applyKey(): void {
    const { key } = this.settings;
    const rig = this.getKeyRig();
    setLightColor(rig.light, key.color);
    rig.light.intensity = key.intensity;
    rig.light.visible = key.enabled;
    applySpotShadowCast(rig.light, key.enabled, key.castShadow);
    rig.light.shadow.radius = shadowRadiusForMapSize(
      key.shadowSoftness,
      rig.light.shadow.mapSize.x,
    );
    rig.helper.visible = key.enabled;
    this.applySpotBeamVisibility(rig, key.enabled);
    if (rig.fixtureDisc) {
      setFixtureDiscColor(rig.fixtureDisc, key.color);
      rig.fixtureDisc.visible = key.enabled && this.settings.showFixtures;
    }
    this.updatePickColor(rig, KEY_PICK_COLOR);
    if (key.enabled && key.castShadow) {
      updateSpotShadowCamera(rig.light, this.shadowCoverageRadius);
    }
  }

  private applyFill(): void {
    const { fill } = this.settings;
    const rig = this.getFillRig();
    const fillCastsShadow = fill.enabled && fill.castShadow;

    setLightColor(rig.light, fill.color);
    rig.light.intensity = fill.intensity;
    // Shadow darkness scales with light contribution — decay 1.5 at studio distance (~8 m)
    // makes Fill shadows invisible even when castShadow is on. Use key-like falloff while casting.
    rig.light.decay = fillCastsShadow ? KEY_DECAY : FILL_DECAY;
    rig.light.visible = fill.enabled;
    applySpotShadowCast(rig.light, fill.enabled, fill.castShadow);
    rig.light.shadow.radius = shadowRadiusForMapSize(
      fill.shadowSoftness,
      rig.light.shadow.mapSize.x,
    );
    rig.helper.visible = fill.enabled;
    this.applySpotBeamVisibility(rig, fill.enabled);
    if (rig.fixtureDisc) {
      setFixtureDiscColor(rig.fixtureDisc, fill.color);
      rig.fixtureDisc.visible = fill.enabled && this.settings.showFixtures;
    }
    this.updatePickColor(rig, FILL_PICK_COLOR);
    if (fillCastsShadow) {
      updateSpotShadowCamera(rig.light, this.shadowCoverageRadius);
    }
  }

  private refreshShadowCoverageRadius(): void {
    this.shadowCoverageRadius = computeSceneShadowCoverageRadius(
      this.registry.getVisibleEntityRoots(),
      STUDIO_ANCHOR,
    );
  }

  private applyShadowMapSizeToCasters(mapSize: number): void {
    applyShadowMapSize(
      this.getKeyRig().light.shadow,
      mapSize,
      this.settings.key.shadowSoftness,
    );
    applyShadowMapSize(
      this.getFillRig().light.shadow,
      mapSize,
      this.settings.fill.shadowSoftness,
    );
    this.refreshShadowCoverageRadius();
    this.updateCasterShadowCameras();
  }

  private updateCasterShadowCameras(): void {
    if (this.settings.key.enabled && this.settings.key.castShadow) {
      updateSpotShadowCamera(
        this.getKeyRig().light,
        this.shadowCoverageRadius,
      );
    }
    if (this.settings.fill.enabled && this.settings.fill.castShadow) {
      updateSpotShadowCamera(
        this.getFillRig().light,
        this.shadowCoverageRadius,
      );
    }
  }

  private updatePickColor(rig: SpotLightRig, color: Rgb): void {
    const rgb = rgbToColor(color);
    const material = rig.pickMesh.material as MeshBasicNodeMaterial;
    material.color.setRGB(rgb.r, rgb.g, rgb.b);
  }

  private applySpotBeamVisibility(rig: SpotLightRig, roleEnabled: boolean): void {
    rig.spotBeam.visible = roleEnabled && this.lightHandlesVisible;
  }

  private refreshSpotBeam(rig: SpotLightRig): void {
    if (!rig.spotBeam.visible) {return;}
    rig.spotBeam.update();
    applySpotBeamDisplayScale(rig.spotBeam.cone, rig.light);
  }

  syncFixtureMirrorReflection(): void {
    this.planarReflection?.setFixturesVisibleInReflection(
      this.settings.fixturesReflectInMirror,
    );
  }

}

function sceneRemove(scene: Scene, object: AmbientLight): void {
  scene.remove(object);
  object.dispose();
}
