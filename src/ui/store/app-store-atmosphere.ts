import type { Rgb } from '@/colors/rgb';
import { migrateMaterialId } from '@/scene/material-ids';
import * as store from './app-store-internals';

export function setSkyEnabled(enabled: boolean): void {
  store.setAppState({ ...store.state, skyEnabled: enabled });
  store.sceneApi?.setSkyEnabled(enabled);
  store.emit();
}


export function setSkyHorizonColor(rgb: Rgb): void {
  store.setAppState({ ...store.state, skyHorizonColor: { ...rgb } });
  store.sceneApi?.setSkyHorizonColor(rgb);
  store.emit();
}


export function setSkyZenithColor(rgb: Rgb): void {
  store.setAppState({ ...store.state, skyZenithColor: { ...rgb } });
  store.sceneApi?.setSkyZenithColor(rgb);
  store.emit();
}


export function setSkyGradientFade(fade: number): void {
  store.setAppState({ ...store.state, skyGradientFade: fade });
  store.sceneApi?.setSkyGradientFade(fade);
  store.emit();
}


export function setGroundMaterialId(materialId: string): void {
  store.patchGround({ materialId: migrateMaterialId(materialId) });
}


export function setGroundVisible(visible: boolean): void {
  store.patchGround({ visible });
}


export function setGroundReceiveShadow(receiveShadow: boolean): void {
  store.patchGround({ receiveShadow });
}


export function setGroundMirrorEnabled(mirrorEnabled: boolean): void {
  store.patchGround({ mirrorEnabled });
}


export function setGroundMirrorOpacity(mirrorOpacity: number): void {
  store.patchGround({ mirrorOpacity });
}


export function setFogEnabled(enabled: boolean): void {
  store.setAppState({ ...store.state, fogEnabled: enabled });
  store.sceneApi?.setFogEnabled(enabled);
  store.emit();
}


export function setFogColor(rgb: Rgb): void {
  store.setAppState({ ...store.state, fogColor: { ...rgb } });
  store.sceneApi?.setFogColor(rgb);
  store.emit();
}


export function setFogDistances(near: number, far: number): void {
  store.setAppState({ ...store.state, fogNear: near, fogFar: far });
  store.sceneApi?.setFogDistances(near, far);
  store.emit();
}


export function setReflectionEnabled(enabled: boolean): void {
  store.setAppState({ ...store.state, reflectionEnabled: enabled });
  store.sceneApi?.setReflectionEnabled(enabled);
  store.emit();
}


export function setReflectionIntensity(intensity: number): void {
  store.setAppState({ ...store.state, reflectionIntensity: intensity });
  store.sceneApi?.setReflectionIntensity(intensity);
  store.emit();
}

