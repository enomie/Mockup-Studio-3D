import {
  Group,
  IcosahedronGeometry,
  LineBasicNodeMaterial,
  LineSegments,
  Mesh,
  MeshBasicNodeMaterial,
  type Object3D,
  SphereGeometry,
  SpotLight,
  WireframeGeometry,
} from 'three/webgpu';
import { rgbToColor, type Rgb } from '@/colors/rgb';
import { configureSpotShadowLight } from '@/render/shadow-setup';
import { createFixtureDisc, disposeFixtureDisc } from './light-fixture-disc';
const PICK_RADIUS = 0.18;
const SPOT_ANGLE = Math.PI / 3;
const SPOT_PENUMBRA = 0.9;

export type SpotLightRig = {
  id: string;
  /** Pick + gizmo handle — position synced with the light each frame. */
  helper: Group;
  /** Direct scene child — not nested under helper (cleaner shadow matrices). */
  light: SpotLight;
  target: Group;
  pickMesh: Mesh;
  wireframe: LineSegments;
  /** Emissive softbox disc — studio key/fill only; null for pooled extra spots. */
  fixtureDisc: Mesh | null;
};

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

function createWireframeHelper(pickColor: Rgb): LineSegments {
  const geometry = new WireframeGeometry(new IcosahedronGeometry(PICK_RADIUS, 1));
  const rgb = rgbToColor(pickColor);
  const material = new LineBasicNodeMaterial({
    transparent: true,
    opacity: 0.3,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  });
  material.color.setRGB(rgb.r, rgb.g, rgb.b);
  const wireframe = new LineSegments(geometry, material);
  wireframe.castShadow = false;
  wireframe.receiveShadow = false;
  return wireframe;
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
  const wireframe = createWireframeHelper(pickColor);
  const fixtureDisc =
    fixtureDiscRadius !== undefined && fixtureDiscRadius > 0
      ? createFixtureDisc(fixtureDiscRadius)
      : null;
  helper.add(pickMesh);
  helper.add(wireframe);
  if (fixtureDisc) {
    helper.add(fixtureDisc);
  }
  scene.add(helper);
  scene.add(light);

  return { id, helper, light, target, pickMesh, wireframe, fixtureDisc };
}

export function disposeSpotLightRig(rig: SpotLightRig, scene: Object3D): void {
  scene.remove(rig.helper);
  scene.remove(rig.light);
  scene.remove(rig.target);
  rig.pickMesh.geometry.dispose();
  (rig.pickMesh.material as MeshBasicNodeMaterial).dispose();
  rig.wireframe.geometry.dispose();
  (rig.wireframe.material as LineBasicNodeMaterial).dispose();
  if (rig.fixtureDisc) {
    disposeFixtureDisc(rig.fixtureDisc);
  }
  rig.light.dispose();
}
