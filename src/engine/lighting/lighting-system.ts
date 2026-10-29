import {
  AmbientLight,
  Group,
  type Light,
  type MeshBasicNodeMaterial,
  type Scene,
  Vector3,
} from 'three/webgpu';
import { computeSceneShadowCoverageRadius } from '@/render/scene-shadow-coverage';
import {
  applyShadowMapSize,
  applySpotShadowCast,
  updateSpotShadowCamera,
} from '@/render/shadow-setup';
import {
  SHADOW_COVERAGE_RADIUS,
  SHADOW_MAP_SIZE,
  SHADOW_MAP_SIZE_EXPORT,
} from '@/constants';
import { rgbToColor, type Rgb } from '@/colors/rgb';
import { cloneTransform, defaultTransform, type Vec3 } from '@/scene/entity-types';
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
  computeFillPose,
  computeKeyPose,
  computeOffsetFromWorld,
  computeSceneCenter,
  type StudioPose,
} from './studio-pose';

type SelectionListener = (lightId: StudioLightId | null) => void;

const KEY_PICK_COLOR: Rgb = { r: 1, g: 0.85, b: 0.6 };
const FILL_PICK_COLOR: Rgb = { r: 0.75, g: 0.85, b: 1 };
const _targetPosition = new Vector3();

function cloneLightingSettings(settings: LightingSettings): LightingSettings {
  return {
    referenceMode: settings.referenceMode,
    showFixtures: settings.showFixtures,
    fixturesReflectInMirror: settings.fixturesReflectInMirror,
    ambient: {
      enabled: settings.ambient.enabled,
      color: { ...settings.ambient.color },
      intensity: settings.ambient.intensity,
    },
    key: {
      enabled: settings.key.enabled,
      side: settings.key.side,
      color: { ...settings.key.color },
      intensity: settings.key.intensity,
      castShadow: settings.key.castShadow,
      shadowSoftness: settings.key.shadowSoftness,
      transformOffset: cloneTransform(settings.key.transformOffset),
    },
    fill: {
      enabled: settings.fill.enabled,
      color: { ...settings.fill.color },
      intensityRatio: settings.fill.intensityRatio,
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
  private readonly worldFixedPoses = new Map<StudioLightId, StudioPose>();

  private settings: LightingSettings;
  private selectedLightId: StudioLightId | null = null;
  private readonly selectionListeners = new Set<SelectionListener>();
  private lightHandlesVisible = false;
  private planarReflection: PlanarReflectionPass | null = null;
  private readonly referenceCenter: Vec3 = { x: 0, y: 0, z: 0 };
  private shadowCoverageRadius = SHADOW_COVERAGE_RADIUS;
  private exportShadowQualityDepth = 0;

  constructor(scene: Scene, registry: EntityRegistry, initial: LightingSettings) {
    this.scene = scene;
    this.registry = registry;
    this.settings = cloneLightingSettings(initial);

    this.lightPool = new LightPool(scene);
    this.ambient = new AmbientLight(0xffffff, initial.ambient.intensity);
    scene.add(this.ambient);

    registry.subscribeEntities(() => {
      if (this.settings.referenceMode === 'scene-center') {
        this.updateRigTransforms();
      }
    });

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

  getReferenceCenter(): Vec3 {
    return { ...this.referenceCenter };
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
    const wasSceneCenter = this.settings.referenceMode === 'scene-center';
    this.settings = mergeLightingSettings(this.settings, partial);

    if (wasSceneCenter && this.settings.referenceMode === 'world-fixed') {
      this.captureWorldFixedPoses();
    }
    if (partial.referenceMode === 'scene-center') {
      this.worldFixedPoses.clear();
    }

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
    this.syncReferenceCenterFromEntities();
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

    const center = this.refreshReferenceCenter();
    const base = this.getBasePose(lightId, center);
    const world = readTransformFromObject(rig.helper);
    const offset = computeOffsetFromWorld(base, world);

    if (lightId === LIGHT_KEY_ID) {
      this.settings.key.transformOffset = offset;
      if (this.settings.referenceMode === 'world-fixed') {
        this.worldFixedPoses.set(LIGHT_KEY_ID, {
          position: { ...world.position },
          rotation: { ...world.rotation },
        });
      }
    } else {
      this.settings.fill.transformOffset = offset;
      if (this.settings.referenceMode === 'world-fixed') {
        this.worldFixedPoses.set(LIGHT_FILL_ID, {
          position: { ...world.position },
          rotation: { ...world.rotation },
        });
      }
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

  private refreshReferenceCenter(): Group {
    const center = computeSceneCenter(
      this.registry.getEntities().map((entity) => entity.transform.position),
    );
    this.referenceCenter.x = center.x;
    this.referenceCenter.y = center.y;
    this.referenceCenter.z = center.z;
    const anchor = new Group();
    anchor.position.set(center.x, center.y, center.z);
    return anchor;
  }

  private getBasePose(lightId: StudioLightId, centerAnchor: Group): StudioPose {
    const center = {
      x: centerAnchor.position.x,
      y: centerAnchor.position.y,
      z: centerAnchor.position.z,
    };

    if (this.settings.referenceMode === 'world-fixed') {
      const stored = this.worldFixedPoses.get(lightId);
      if (stored) {return stored;}
    }

    if (lightId === LIGHT_KEY_ID) {
      return computeKeyPose(center, this.settings.key.side);
    }
    return computeFillPose(center, this.settings.key.side, this.settings.fill.distance);
  }

  private getWorldPose(lightId: StudioLightId, centerAnchor: Group): StudioPose {
    const base = this.getBasePose(lightId, centerAnchor);
    const offset =
      lightId === LIGHT_KEY_ID
        ? this.settings.key.transformOffset
        : this.settings.fill.transformOffset;
    return applyTransformOffset(base, offset);
  }

  private updateRigTransforms(): void {
    const centerAnchor = this.refreshReferenceCenter();
    _targetPosition.copy(centerAnchor.position);
    this.refreshShadowCoverageRadius();

    const keyPose = this.getWorldPose(LIGHT_KEY_ID, centerAnchor);
    applyPoseToRig(
      this.getKeyRig(),
      keyPose,
      _targetPosition,
      this.settings.key.enabled && this.settings.key.castShadow,
      this.shadowCoverageRadius,
    );

    const fillPose = this.getWorldPose(LIGHT_FILL_ID, centerAnchor);
    applyPoseToRig(
      this.getFillRig(),
      fillPose,
      _targetPosition,
      this.settings.fill.enabled && this.settings.fill.castShadow,
      this.shadowCoverageRadius,
    );
  }

  private captureWorldFixedPoses(): void {
    for (const lightId of [LIGHT_KEY_ID, LIGHT_FILL_ID] as const) {
      const rig = this.getRig(lightId);
      if (!rig) {continue;}
      const world = readTransformFromObject(rig.helper);
      this.worldFixedPoses.set(lightId, {
        position: { ...world.position },
        rotation: { ...world.rotation },
      });
      if (lightId === LIGHT_KEY_ID) {
        this.settings.key.transformOffset = defaultTransform();
      } else {
        this.settings.fill.transformOffset = defaultTransform();
      }
    }
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
    rig.light.shadow.radius = key.shadowSoftness;
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
    const { key, fill } = this.settings;
    const rig = this.getFillRig();
    const fillCastsShadow = fill.enabled && fill.castShadow;

    setLightColor(rig.light, fill.color);
    rig.light.intensity = key.intensity * fill.intensityRatio;
    // Shadow darkness scales with light contribution — decay 1.5 at studio distance (~8 m)
    // makes Fill shadows invisible even when castShadow is on. Use key-like falloff while casting.
    rig.light.decay = fillCastsShadow ? KEY_DECAY : FILL_DECAY;
    rig.light.visible = fill.enabled;
    applySpotShadowCast(rig.light, fill.enabled, fill.castShadow);
    rig.light.shadow.radius = fill.shadowSoftness;
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

  private syncReferenceCenterFromEntities(): void {
    const center = computeSceneCenter(
      this.registry.getEntities().map((entity) => entity.transform.position),
    );
    this.referenceCenter.x = center.x;
    this.referenceCenter.y = center.y;
    this.referenceCenter.z = center.z;
  }

  private refreshShadowCoverageRadius(): void {
    this.shadowCoverageRadius = computeSceneShadowCoverageRadius(
      this.registry.getVisibleEntityRoots(),
      this.referenceCenter,
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
