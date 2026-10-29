import type { EnvironmentState } from '@/scene/scene-api';
import { migrateMaterialId } from '@/scene/material-ids';
import * as store from './app-store-internals';

export function setEnvironment(partial: Partial<EnvironmentState>): void {
  const cloned = Object.fromEntries(
    Object.entries(partial).map(([key, value]) => [
      key,
      typeof value === 'object' ? { ...value } : value,
    ]),
  ) as Partial<EnvironmentState>;
  store.setAppState({ ...store.state, ...cloned });
  store.sceneApi?.setEnvironment(partial);
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


