import {
  type DirectionalLight,
  DoubleSide,
  type LightShadow,
  type Material,
  Mesh,
  type Object3D,
  PCFShadowMap,
  type SpotLight,
  Vector3,
  type WebGPURenderer,
} from 'three/webgpu';
import {
  SHADOW_CAMERA_FAR_MARGIN,
  SHADOW_CAMERA_HALF_EXTENT,
  SHADOW_CAMERA_NEAR,
  SHADOW_COVERAGE_RADIUS,
  SHADOW_DEPTH_BIAS,
  SHADOW_MAP_SIZE,
  SHADOW_NORMAL_BIAS,
  SHADOW_SOFTNESS_DEFAULT,
} from '@/constants';

const _lightWorldPos = new Vector3();
const _targetWorldPos = new Vector3();

/** Every scene mesh receives shadows (skybox / editor helpers excluded at creation). */
export function applyReceiveShadowFlags(object: Object3D): void {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      child.receiveShadow = true;
    }
  });
}

/** Every scene object casts onto and receives from every other (except sky/background). */
export function applyFullShadowFlags(object: Object3D): void {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function applyDoubleSidedShadowCast(material: Material): void {
  material.shadowSide = DoubleSide;
}

/**
 * Asset groups: all meshes receive shadows; thin glazing receives but does not cast.
 * Casting meshes use double-sided shadow pass so thin planes (screen, print) shadow from both sides.
 * Call once after every asset mesh build (print, picture, future device kinds).
 */
export function applyAssetShadowFlags(group: Object3D): void {
  group.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.receiveShadow = true;
    const role = child.userData.assetMeshRole;
    const casts = role !== 'glazing';
    child.castShadow = casts;
    if (!casts) return;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      applyDoubleSidedShadowCast(material);
    }
  });
}

export function applyShadowMapQuality(
  shadow: LightShadow,
  radius = SHADOW_SOFTNESS_DEFAULT,
): void {
  shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  shadow.radius = radius;
  shadow.bias = SHADOW_DEPTH_BIAS;
  shadow.normalBias = SHADOW_NORMAL_BIAS;
}

export function configureShadowRenderer(renderer: WebGPURenderer): void {
  renderer.highPrecision = true;
  renderer.shadowMap.enabled = true;
  // r186 WebGPU: PCFShadowMap uses Vogel-disk + IGN (PCFSoft removed). No VSM — receivers cast in VSM → floor banding.
  renderer.shadowMap.type = PCFShadowMap;
}

export function configureDirectionalShadowLight(
  light: DirectionalLight,
  target: Object3D,
  scene: Object3D,
): void {
  light.castShadow = false;
  applyShadowMapQuality(light.shadow);
  light.shadow.camera.near = SHADOW_CAMERA_NEAR;
  light.shadow.camera.far = SHADOW_CAMERA_HALF_EXTENT * 2 + SHADOW_CAMERA_FAR_MARGIN;
  light.shadow.camera.left = -SHADOW_CAMERA_HALF_EXTENT;
  light.shadow.camera.right = SHADOW_CAMERA_HALF_EXTENT;
  light.shadow.camera.top = SHADOW_CAMERA_HALF_EXTENT;
  light.shadow.camera.bottom = -SHADOW_CAMERA_HALF_EXTENT;

  target.position.set(0, 0, 0);
  scene.add(target);
  light.target = target;
}

export function configureSpotShadowLight(
  light: SpotLight,
  target: Object3D,
  scene: Object3D,
): void {
  applyShadowMapQuality(light.shadow);

  target.position.set(0, 0, 0);
  scene.add(target);
  light.target = target;
}

/**
 * Maps logical cast-shadow (UI / presets) onto Three spot lights without toggling
 * `castShadow` off while enabled — r186 WebGPU disposes ShadowNode and can crash
 * on the next frame (stale updateBeforeNodes). Use `shadow.intensity` 0/1 instead.
 */
export function applySpotShadowCast(
  light: SpotLight,
  enabled: boolean,
  shouldCast: boolean,
): void {
  const effectiveCast = enabled && shouldCast;
  if (enabled) {
    light.castShadow = true;
    light.shadow.intensity = effectiveCast ? 1 : 0;
    return;
  }
  light.castShadow = false;
  light.shadow.intensity = 0;
}

/**
 * Tighten spot shadow frustum via shadow.focus (updateMatrices overwrites camera.fov).
 * Call after pose changes and once per render frame.
 */
export function updateSpotShadowCamera(light: SpotLight): void {
  light.updateMatrixWorld(true);
  light.target.updateMatrixWorld(true);

  light.getWorldPosition(_lightWorldPos);
  light.target.getWorldPosition(_targetWorldPos);
  const targetDistance = Math.max(_lightWorldPos.distanceTo(_targetWorldPos), 0.01);

  const coverageHalfAngle = Math.atan(SHADOW_COVERAGE_RADIUS / targetDistance);
  light.shadow.focus = Math.min(1, coverageHalfAngle / light.angle);
  light.shadow.camera.near = SHADOW_CAMERA_NEAR;
  light.shadow.camera.far = targetDistance + SHADOW_CAMERA_FAR_MARGIN;

  light.shadow.updateMatrices(light);
}
