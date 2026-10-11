import {
  CircleGeometry,
  Mesh,
  MeshStandardNodeMaterial,
  type Vector3,
} from 'three/webgpu';
import { rgbToColor, type Rgb } from '@/colors/rgb';
import {
  LIGHT_FIXTURE_DISC_EMISSIVE_INTENSITY,
  LIGHT_FIXTURE_DISC_ROUGHNESS,
} from '@/constants';

const DISC_SEGMENTS = 48;

export function createFixtureDisc(radius: number): Mesh {
  const geometry = new CircleGeometry(radius, DISC_SEGMENTS);
  const material = new MeshStandardNodeMaterial({
    color: 0x000000,
    roughness: LIGHT_FIXTURE_DISC_ROUGHNESS,
    metalness: 0,
    toneMapped: false,
  });
  material.emissive.setHex(0xffffff);
  material.emissiveIntensity = LIGHT_FIXTURE_DISC_EMISSIVE_INTENSITY;

  const mesh = new Mesh(geometry, material);
  mesh.name = 'light-fixture-disc';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

export function setFixtureDiscColor(disc: Mesh, color: Rgb): void {
  const rgb = rgbToColor(color);
  const material = disc.material as MeshStandardNodeMaterial;
  material.emissive.setRGB(rgb.r, rgb.g, rgb.b);
}

/** Align disc +Z (CircleGeometry normal) toward `worldTarget` from the rig origin. */
export function orientFixtureDiscToward(disc: Mesh, worldTarget: Vector3): void {
  disc.position.set(0, 0, 0);
  disc.lookAt(worldTarget);
}

export function disposeFixtureDisc(disc: Mesh): void {
  disc.geometry.dispose();
  (disc.material as MeshStandardNodeMaterial).dispose();
}
