import {
  Object3D,
  Raycaster,
  Vector2,
  type Camera,
  type Intersection,
} from 'three';
import type { StudioLayerId, StudioLayersState } from '../config/studioLayers.ts';
import type { ClothSystem } from '../cloth/ClothSystem.ts';
import type { PinSystem } from '../pins/PinSystem.ts';
import type { ScenePropsSystem } from '../scene/ScenePropsSystem.ts';

export interface LayerPickResult {
  layer: StudioLayerId;
  cornerIndex?: number;
}

export interface LayerPickInput {
  event: PointerEvent;
  camera: Camera;
  pointerTarget: HTMLElement;
  layers: StudioLayersState;
  cloth: ClothSystem | null;
  pins: PinSystem;
  sceneProps: ScenePropsSystem;
  pinnedCornersCount: number;
}

export function pickLayerFromPointer(input: LayerPickInput): LayerPickResult | null {
  const { layers } = input;
  const targets: Object3D[] = [];

  if (layers.visibility.silk && input.cloth?.mesh?.visible) {
    targets.push(input.cloth.mesh);
  }
  if (layers.visibility.silkCorners && input.pinnedCornersCount > 0) {
    targets.push(...input.pins.getVisiblePinMeshes(input.pinnedCornersCount));
  }
  if (layers.visibility.cube) {
    targets.push(input.sceneProps.cubeMesh);
  }
  if (layers.visibility.sphere) {
    targets.push(input.sceneProps.sphereMesh);
  }

  if (targets.length === 0) return null;

  const rect = input.pointerTarget.getBoundingClientRect();
  const mouse = new Vector2(
    ((input.event.clientX - rect.left) / rect.width) * 2 - 1,
    -((input.event.clientY - rect.top) / rect.height) * 2 + 1,
  );

  const raycaster = new Raycaster();
  raycaster.setFromCamera(mouse, input.camera);
  const hits = raycaster.intersectObjects(targets, false);
  const first = hits[0];
  if (!first) return null;

  return layerFromIntersection(first, input.cloth, input.pinnedCornersCount);
}

function layerFromIntersection(
  hit: Intersection,
  cloth: ClothSystem | null,
  pinnedCornersCount: number,
): LayerPickResult | null {
  const obj = hit.object;
  if (cloth?.mesh && obj === cloth.mesh) {
    return { layer: 'silk' };
  }

  const cornerIndex = (obj.userData as { cornerIndex?: number }).cornerIndex;
  if (typeof cornerIndex === 'number' && cornerIndex < pinnedCornersCount) {
    return { layer: 'silkCorners', cornerIndex };
  }

  const propKind = (obj.userData as { propKind?: string }).propKind;
  if (propKind === 'cube') return { layer: 'cube' };
  if (propKind === 'sphere') return { layer: 'sphere' };

  return null;
}
