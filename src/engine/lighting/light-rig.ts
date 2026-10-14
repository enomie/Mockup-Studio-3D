import {
  Group,
  type LineBasicNodeMaterial,
  Mesh,
  MeshBasicNodeMaterial,
  type Object3D,
  SphereGeometry,
  SpotLight,
  SpotLightHelper,
} from 'three/webgpu';
import { rgbToColor, type Rgb } from '@/colors/rgb';
import {
  FIXTURE_DISC_LAYER,
  VIEWPORT_HELPER_LINE_OPACITY,
  VIEWPORT_HELPER_RENDER_ORDER,
} from '@/constants';
import { upgradeGizmoMaterialsToWebGPU } from '@/engine/gizmo-material-upgrade';
import { applyViewportHelperXRay } from '@/engine/viewport-helpers/viewport-helper-material';
import { configureSpotShadowLight } from '@/render/shadow-setup';
import { createFixtureDisc, disposeFixtureDisc } from './light-fixture-disc';

const PICK_RADIUS = 0.18;
const SPOT_ANGLE = Math.PI / 3;
const SPOT_PENUMBRA = 0.9;

export interface SpotLightRig {
  id: string;
  /** Pick + gizmo handle — position synced with the light each frame. */
  helper: Group;
  /** Direct scene child — not nested under helper (cleaner shadow matrices). */
  light: SpotLight;
  target: Group;
  pickMesh: Mesh;
  spotBeam: SpotLightHelper;
  /** Emissive softbox disc — studio key/fill only; null for pooled extra spots. */
  fixtureDisc: Mesh | null;
}

function createPickMaterial(color: Rgb): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  const rgb = rgbToColor(color);
  material.color.setRGB(rgb.r, rgb.g, rgb.b);
  return material;
}

function createPickMesh(id: string, pickColor: Rgb): Mesh {
  const pickGeometry = new SphereGeometry(PICK_RADIUS, 12, 12);
  const pickMesh = new Mesh(pickGeometry, createPickMaterial(pickColor));
  pickMesh.userData.entityId = id;
  pickMesh.castShadow = false;
  pickMesh.receiveShadow = false;
  pickMesh.visible = false;
  return pickMesh;
}

function createSpotBeamHelper(light: SpotLight, scene: Object3D): SpotLightHelper {
  const spotBeam = new SpotLightHelper(light);
  spotBeam.visible = false;
  upgradeGizmoMaterialsToWebGPU(spotBeam);
  const material = spotBeam.cone.material as LineBasicNodeMaterial;
  applyViewportHelperXRay(material);
  material.opacity = VIEWPORT_HELPER_LINE_OPACITY;
  material.transparent = true;
  spotBeam.cone.renderOrder = VIEWPORT_HELPER_RENDER_ORDER;
  spotBeam.cone.castShadow = false;
  spotBeam.cone.receiveShadow = false;
  scene.add(spotBeam);
  return spotBeam;
}

export function createSpotLightRig(
  id: string,
  scene: Object3D,
  pickColor: Rgb,
  decay: number,
  fixtureDiscRadius?: number,
): SpotLightRig {
  const helper = new Group();
  helper.userData.entityId = id;

  const light = new SpotLight(0xffffff, 1, 0, SPOT_ANGLE, SPOT_PENUMBRA, decay);
  // SpotLight ctor sets position to (0,1,0) — must reset for rig math.
  light.position.set(0, 0, 0);

  const target = new Group();
  configureSpotShadowLight(light, target, scene);

  const pickMesh = createPickMesh(id, pickColor);
  const spotBeam = createSpotBeamHelper(light, scene);
  const fixtureDisc =
    fixtureDiscRadius !== undefined && fixtureDiscRadius > 0
      ? createFixtureDisc(fixtureDiscRadius)
      : null;
  helper.add(pickMesh);
  if (fixtureDisc) {
    fixtureDisc.layers.set(FIXTURE_DISC_LAYER);
    helper.add(fixtureDisc);
  }
  scene.add(helper);
  scene.add(light);

  return { id, helper, light, target, pickMesh, spotBeam, fixtureDisc };
}

export function disposeSpotLightRig(rig: SpotLightRig, scene: Object3D): void {
  scene.remove(rig.helper);
  scene.remove(rig.light);
  scene.remove(rig.target);
  scene.remove(rig.spotBeam);
  rig.spotBeam.dispose();
  rig.pickMesh.geometry.dispose();
  (rig.pickMesh.material as MeshBasicNodeMaterial).dispose();
  if (rig.fixtureDisc) {
    disposeFixtureDisc(rig.fixtureDisc);
  }
  rig.light.dispose();
}
