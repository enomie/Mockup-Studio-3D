import type {
  BuiltinCameraViewId,
  CameraProjection,
  CameraReadout,
  CameraSlotIndex,
} from '@/scene/scene-api';
import type { Vec3 } from '@/scene/entity-types';
import * as store from './app-store-internals';

export function loadBuiltinView(id: BuiltinCameraViewId): void {
  store.sceneApi?.loadBuiltinView(id);
  store.refreshCameraState();
}


export function captureSlot(index: CameraSlotIndex): void {
  store.sceneApi?.captureSlot(index);
  store.refreshCameraState();
}


export function loadSlot(index: CameraSlotIndex): void {
  store.sceneApi?.loadSlot(index);
  store.refreshCameraState();
}


export function clearSlot(index: CameraSlotIndex): void {
  store.sceneApi?.clearSlot(index);
  store.refreshCameraState();
}


export function renameSlot(index: CameraSlotIndex, name: string): void {
  store.sceneApi?.renameSlot(index, name);
  store.refreshCameraState();
}


export function setCameraProjection(projection: CameraProjection): void {
  store.sceneApi?.setCameraProjection(projection);
  store.refreshCameraState();
}


export function setCameraFov(fov: number): void {
  store.sceneApi?.setCameraFov(fov);
  store.refreshCameraState();
}


export function setCameraOrthoZoom(zoom: number): void {
  store.sceneApi?.setCameraOrthoZoom(zoom);
  store.refreshCameraState();
}


export function getCameraReadoutSnapshot(): CameraReadout | null {
  return store.sceneApi?.getCameraReadout() ?? null;
}


export function setCameraPosition(partial: Partial<Vec3>): void {
  store.sceneApi?.setCameraPosition(partial);
}


export function setCameraTarget(partial: Partial<Vec3>): void {
  store.sceneApi?.setCameraTarget(partial);
}


export function setCameraDistance(distanceM: number): void {
  store.sceneApi?.setCameraDistance(distanceM);
}


export function setCameraAzimuthDeg(degrees: number): void {
  store.sceneApi?.setCameraAzimuthDeg(degrees);
}


export function setCameraElevationDeg(degrees: number): void {
  store.sceneApi?.setCameraElevationDeg(degrees);
}


export function resetCameraAzimuth(): void {
  store.sceneApi?.resetCameraAzimuth();
}


export function resetCameraElevation(): void {
  store.sceneApi?.resetCameraElevation();
}
