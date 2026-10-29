import {
  AmbientLight,
  Color,
  DirectionalLight,
  GridHelper,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
} from 'three';
import { createDefaultStudioLighting } from '../config/studioLighting.ts';
import type { StudioRenderer } from '../engine/createRenderer.ts';
import {
  applyEnvironmentToScene,
  createEmptyEnvironmentHandle,
  type EnvironmentHandle,
} from './studioEnvironment.ts';

export interface StudioSceneObjects {
  scene: Scene;
  ambientLight: AmbientLight;
  mainLight: DirectionalLight;
  fillLight: DirectionalLight;
  topLight: DirectionalLight;
  groundMesh: Mesh;
  floorGrid: GridHelper;
  environmentHandle: EnvironmentHandle;
}

function setupDirectionalShadow(light: DirectionalLight, mapSize: number, blur: number): void {
  light.castShadow = true;
  light.shadow.mapSize.width = mapSize;
  light.shadow.mapSize.height = mapSize;
  light.shadow.bias = -0.0003;
  light.shadow.radius = blur;
  light.shadow.blurSamples = 16;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 10;
  light.shadow.camera.left = -1.5;
  light.shadow.camera.right = 1.5;
  light.shadow.camera.top = 1.5;
  light.shadow.camera.bottom = -1.5;
}

export function createStudioScene(renderer: StudioRenderer): StudioSceneObjects {
  const defaults = createDefaultStudioLighting();
  const scene = new Scene();
  scene.background = new Color(defaults.environment.backgroundColor);

  const ambientLight = new AmbientLight(
    defaults.ambient.color,
    defaults.ambient.intensity,
  );
  scene.add(ambientLight);

  const mainLight = new DirectionalLight(defaults.key.color, defaults.key.intensity);
  setupDirectionalShadow(mainLight, 2048, defaults.key.shadowBlur);
  scene.add(mainLight);
  scene.add(mainLight.target);

  const fillLight = new DirectionalLight(defaults.fill.color, defaults.fill.intensity);
  setupDirectionalShadow(fillLight, 1024, defaults.fill.shadowBlur);
  scene.add(fillLight);
  scene.add(fillLight.target);

  const topLight = new DirectionalLight(defaults.top.color, defaults.top.intensity);
  topLight.castShadow = false;
  scene.add(topLight);
  scene.add(topLight.target);

  const environmentHandle = createEmptyEnvironmentHandle();
  applyEnvironmentToScene(scene, renderer, defaults.environment, environmentHandle);

  const groundGeo = new PlaneGeometry(80, 80);
  const groundMat = new MeshStandardMaterial({
    color: 0xfcfdfd,
    roughness: 0.65,
    metalness: 0.05,
  });
  const groundMesh = new Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  const floorGrid = new GridHelper(20, 40, 0xdfe6ee, 0xf1f5f9);
  floorGrid.position.y = 0.001;
  scene.add(floorGrid);

  const bundle: StudioSceneObjects = {
    scene,
    ambientLight,
    mainLight,
    fillLight,
    topLight,
    groundMesh,
    floorGrid,
    environmentHandle,
  };

  return bundle;
}
