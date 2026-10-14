import {
  DirectionalLight,
  Group,
  type Object3D,
  PointLight,
  type Scene,
} from 'three/webgpu';
import {
  LIGHT_POOL_DIRECTIONAL_COUNT,
  LIGHT_POOL_FILL_SPOT_INDEX,
  LIGHT_POOL_KEY_SPOT_INDEX,
  LIGHT_POOL_MAX_SHADOW_CASTERS,
  LIGHT_POOL_POINT_COUNT,
  LIGHT_POOL_SPOT_COUNT,
  LIGHT_FIXTURE_DISC_FILL_RADIUS,
  LIGHT_FIXTURE_DISC_KEY_RADIUS,
} from '@/constants';
import type { Rgb } from '@/colors/rgb';
import { applyShadowMapQuality, configureDirectionalShadowLight } from '@/render/shadow-setup';
import { LIGHT_FILL_ID, LIGHT_KEY_ID } from '@/scene/light-ids';
import {
  createSpotLightRig,
  disposeSpotLightRig,
  type SpotLightRig,
} from './light-rig';

export const KEY_DECAY = 0;
export const FILL_DECAY = 1.5;
const EXTRA_SPOT_DECAY = 1.5;

const KEY_PICK_COLOR: Rgb = { r: 1, g: 0.85, b: 0.6 };
const FILL_PICK_COLOR: Rgb = { r: 0.75, g: 0.85, b: 1 };
const EXTRA_PICK_COLOR: Rgb = { r: 0.85, g: 0.85, b: 0.85 };

export interface PooledDirectionalSlot {
  index: number;
  light: DirectionalLight;
  target: Group;
}

export interface PooledPointSlot {
  index: number;
  light: PointLight;
}

function spotSlotId(index: number): string {
  if (index === LIGHT_POOL_KEY_SPOT_INDEX) {return LIGHT_KEY_ID;}
  if (index === LIGHT_POOL_FILL_SPOT_INDEX) {return LIGHT_FILL_ID;}
  return `light-spot-${index}`;
}

function spotDecay(index: number): number {
  if (index === LIGHT_POOL_KEY_SPOT_INDEX) {return KEY_DECAY;}
  if (index === LIGHT_POOL_FILL_SPOT_INDEX) {return FILL_DECAY;}
  return EXTRA_SPOT_DECAY;
}

function spotPickColor(index: number): Rgb {
  if (index === LIGHT_POOL_KEY_SPOT_INDEX) {return KEY_PICK_COLOR;}
  if (index === LIGHT_POOL_FILL_SPOT_INDEX) {return FILL_PICK_COLOR;}
  return EXTRA_PICK_COLOR;
}

function spotFixtureDiscRadius(index: number): number | undefined {
  if (index === LIGHT_POOL_KEY_SPOT_INDEX) {return LIGHT_FIXTURE_DISC_KEY_RADIUS;}
  if (index === LIGHT_POOL_FILL_SPOT_INDEX) {return LIGHT_FIXTURE_DISC_FILL_RADIUS;}
  return undefined;
}

function deactivateSpotRig(rig: SpotLightRig): void {
  rig.light.intensity = 0;
  rig.light.castShadow = false;
  rig.helper.visible = false;
  rig.pickMesh.visible = false;
  rig.spotBeam.visible = false;
}

function deactivateDirectionalSlot(slot: PooledDirectionalSlot, ownerIds: string[]): void {
  slot.light.intensity = 0;
  slot.light.castShadow = false;
  slot.light.visible = false;
  ownerIds[slot.index] = '';
}

function deactivatePointSlot(slot: PooledPointSlot, ownerIds: string[]): void {
  slot.light.intensity = 0;
  slot.light.castShadow = false;
  slot.light.visible = false;
  ownerIds[slot.index] = '';
}

/**
 * Pre-allocated Three.js lights — slots are enabled/disabled, never disposed at runtime.
 * Studio rig reserves spot slots 0 (key) and 1 (fill).
 */
export class LightPool {
  readonly spotRigs: readonly SpotLightRig[];
  readonly directionalSlots: readonly PooledDirectionalSlot[];
  readonly pointSlots: readonly PooledPointSlot[];

  private readonly spotSlotOwners: string[];
  private readonly directionalSlotOwners: string[];
  private readonly pointSlotOwners: string[];

  constructor(scene: Scene) {
    this.spotRigs = Array.from({ length: LIGHT_POOL_SPOT_COUNT }, (_, index) => {
      const rig = createSpotLightRig(
        spotSlotId(index),
        scene,
        spotPickColor(index),
        spotDecay(index),
        spotFixtureDiscRadius(index),
      );
      if (index >= 2) {
        deactivateSpotRig(rig);
      }
      return rig;
    });

    this.spotSlotOwners = Array.from({ length: LIGHT_POOL_SPOT_COUNT }, () => '');
    this.spotSlotOwners[LIGHT_POOL_KEY_SPOT_INDEX] = LIGHT_KEY_ID;
    this.spotSlotOwners[LIGHT_POOL_FILL_SPOT_INDEX] = LIGHT_FILL_ID;

    this.directionalSlots = Array.from({ length: LIGHT_POOL_DIRECTIONAL_COUNT }, (_, index) => {
      const light = new DirectionalLight(0xffffff, 0);
      const target = new Group();
      configureDirectionalShadowLight(light, target, scene);
      light.visible = false;
      scene.add(light);
      return { index, light, target };
    });
    this.directionalSlotOwners = Array.from({ length: LIGHT_POOL_DIRECTIONAL_COUNT }, () => '');

    this.pointSlots = Array.from({ length: LIGHT_POOL_POINT_COUNT }, (_, index) => {
      const light = new PointLight(0xffffff, 0, 0, 2);
      applyShadowMapQuality(light.shadow);
      light.visible = false;
      scene.add(light);
      return { index, light };
    });
    this.pointSlotOwners = Array.from({ length: LIGHT_POOL_POINT_COUNT }, () => '');
  }

  getKeyRig(): SpotLightRig {
    return this.spotRigs[LIGHT_POOL_KEY_SPOT_INDEX];
  }

  getFillRig(): SpotLightRig {
    return this.spotRigs[LIGHT_POOL_FILL_SPOT_INDEX];
  }

  getSpotRigById(id: string): SpotLightRig | null {
    const index = this.spotSlotOwners.indexOf(id);
    if (index < 0) {return null;}
    return this.spotRigs[index];
  }

  /** Allocate a free spot slot for v2 extra lights. Returns null when pool is full. */
  allocateSpot(id: string): SpotLightRig | null {
    const existing = this.getSpotRigById(id);
    if (existing) {return existing;}

    for (let index = 2; index < LIGHT_POOL_SPOT_COUNT; index += 1) {
      if (this.spotSlotOwners[index] !== '') {continue;}
      this.spotSlotOwners[index] = id;
      const rig = this.spotRigs[index];
      rig.helper.userData.entityId = id;
      rig.pickMesh.userData.entityId = id;
      rig.helper.visible = true;
      return rig;
    }
    return null;
  }

  releaseSpot(id: string): void {
    const index = this.spotSlotOwners.indexOf(id);
    if (index < 2 || index < 0) {return;}
    deactivateSpotRig(this.spotRigs[index]);
    this.spotSlotOwners[index] = '';
  }

  allocateDirectional(id: string): PooledDirectionalSlot | null {
    const existingIndex = this.directionalSlotOwners.indexOf(id);
    if (existingIndex >= 0) {return this.directionalSlots[existingIndex];}

    const index = this.directionalSlotOwners.findIndex((owner) => owner === '');
    if (index < 0) {return null;}
    this.directionalSlotOwners[index] = id;
    const slot = this.directionalSlots[index];
    slot.light.visible = true;
    slot.light.castShadow = true;
    return slot;
  }

  releaseDirectional(id: string): void {
    const index = this.directionalSlotOwners.indexOf(id);
    if (index < 0) {return;}
    deactivateDirectionalSlot(this.directionalSlots[index], this.directionalSlotOwners);
  }

  allocatePoint(id: string): PooledPointSlot | null {
    const existingIndex = this.pointSlotOwners.indexOf(id);
    if (existingIndex >= 0) {return this.pointSlots[existingIndex];}

    const index = this.pointSlotOwners.findIndex((owner) => owner === '');
    if (index < 0) {return null;}
    this.pointSlotOwners[index] = id;
    const slot = this.pointSlots[index];
    slot.light.visible = true;
    return slot;
  }

  releasePoint(id: string): void {
    const index = this.pointSlotOwners.indexOf(id);
    if (index < 0) {return;}
    deactivatePointSlot(this.pointSlots[index], this.pointSlotOwners);
  }

  countActiveShadowCasters(): number {
    let count = 0;
    for (const rig of this.spotRigs) {
      if (rig.light.castShadow && rig.light.intensity > 0) {count += 1;}
    }
    for (let index = 0; index < this.directionalSlots.length; index += 1) {
      if (this.directionalSlotOwners[index] === '') {continue;}
      const slot = this.directionalSlots[index];
      if (slot.light.castShadow && slot.light.intensity > 0) {count += 1;}
    }
    for (let index = 0; index < this.pointSlots.length; index += 1) {
      if (this.pointSlotOwners[index] === '') {continue;}
      const slot = this.pointSlots[index];
      if (slot.light.castShadow && slot.light.intensity > 0) {count += 1;}
    }
    return count;
  }

  canEnableShadow(): boolean {
    return this.countActiveShadowCasters() < LIGHT_POOL_MAX_SHADOW_CASTERS;
  }

  dispose(scene: Object3D): void {
    for (const rig of this.spotRigs) {
      disposeSpotLightRig(rig, scene);
    }
    for (const slot of this.directionalSlots) {
      scene.remove(slot.light);
      scene.remove(slot.target);
      slot.light.dispose();
    }
    for (const slot of this.pointSlots) {
      scene.remove(slot.light);
      slot.light.dispose();
    }
  }
}
