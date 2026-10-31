import type { Rgb } from '@/colors/rgb';
import type { AppMode } from '@/scene/scene-api';
import * as store from './app-store-internals';

export function setMode(mode: AppMode): void {
  store.setAppState({ ...store.state, mode });
  store.sceneApi?.setMode(mode);
  store.emit();
}

export function setShowLightFixtures(showFixtures: boolean): void {
  store.patchLighting({ showFixtures });
}

export function setFixturesReflectInMirror(fixturesReflectInMirror: boolean): void {
  store.patchLighting({ fixturesReflectInMirror });
}


export function setAmbientColor(rgb: Rgb): void {
  store.patchLighting({ ambient: { color: rgb } });
}


export function setAmbientIntensity(intensity: number): void {
  store.patchLighting({ ambient: { intensity } });
}


export function setAmbientEnabled(enabled: boolean): void {
  store.patchLighting({ ambient: { enabled } });
}


export function setKeyAzimuth(azimuthDeg: number): void {
  store.patchLighting({ key: { azimuthDeg } });
}


export function setKeyElevation(elevationDeg: number): void {
  store.patchLighting({ key: { elevationDeg } });
}


export function setFillAzimuth(azimuthDeg: number): void {
  store.patchLighting({ fill: { azimuthDeg } });
}


export function setFillElevation(elevationDeg: number): void {
  store.patchLighting({ fill: { elevationDeg } });
}


export function setKeyColor(rgb: Rgb): void {
  store.patchLighting({ key: { color: rgb } });
}


export function setKeyIntensity(intensity: number): void {
  store.patchLighting({ key: { intensity } });
}


export function setKeyCastShadow(castShadow: boolean): void {
  store.patchLighting({ key: { castShadow } });
}


export function setKeyEnabled(enabled: boolean): void {
  store.patchLighting({ key: { enabled } });
  if (!enabled && store.state.selectedEntityId === 'light-key') {
    store.sceneApi?.selectEntity(null);
    store.setAppState({ ...store.state, selectedEntityId: null });
    store.emit();
  }
}


export function setKeyShadowSoftness(shadowSoftness: number): void {
  store.patchLighting({ key: { shadowSoftness } });
}


export function setFillShadowSoftness(shadowSoftness: number): void {
  store.patchLighting({ fill: { shadowSoftness } });
}


export function setFillColor(rgb: Rgb): void {
  store.patchLighting({ fill: { color: rgb } });
}


export function setFillIntensity(intensity: number): void {
  store.patchLighting({ fill: { intensity } });
}


export function setFillDistance(distance: number): void {
  store.patchLighting({ fill: { distance } });
}


export function setFillCastShadow(castShadow: boolean): void {
  store.patchLighting({ fill: { castShadow } });
}


export function setFillEnabled(enabled: boolean): void {
  store.patchLighting({ fill: { enabled } });
  if (!enabled && store.state.selectedEntityId === 'light-fill') {
    store.sceneApi?.selectEntity(null);
    store.setAppState({ ...store.state, selectedEntityId: null });
    store.emit();
  }
}

