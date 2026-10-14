import { cloneMaterialPreset } from '@/data/material-presets';
import type { MaterialPreset } from '@/scene/entity-types';
import type { MaterialKind } from '@/scene/material-types';
import * as store from './app-store-internals';

export function selectMaterial(materialId: string | null): void {
  store.setAppState({ ...store.state, selectedMaterialId: materialId });
  store.emit();
}


export function addMaterial(kind: MaterialKind = 'solid-pbr'): string {
  const id = `user-${crypto.randomUUID()}`;
  const preset: MaterialPreset = {
    id,
    name: 'New material',
    source: 'user',
    kind,
    color: { r: 0.8, g: 0.8, b: 0.8 },
    roughness: 0.5,
    metalness: 0,
    ...(kind === 'transmission'
      ? {
          glassVariant: 'pane' as const,
          ior: 1.5,
          tint: { r: 1, g: 1, b: 1 },
        }
      : {}),
  };

  store.setAppState({
    ...store.state,
    materials: [...store.state.materials, preset],
    selectedMaterialId: id,
  });
  store.emit();
  return id;
}


export function updateMaterial(
  materialId: string,
  partial: Partial<MaterialPreset>,
): void {
  const index = store.state.materials.findIndex((material) => material.id === materialId);
  if (index < 0) {return;}

  const current = store.state.materials[index];
  const next: MaterialPreset = {
    ...current,
    ...partial,
    color: partial.color ? { ...partial.color } : current.color,
    tint: partial.tint ? { ...partial.tint } : current.tint,
  };

  const materials = [...store.state.materials];
  materials[index] = next;
  store.setAppState({ ...store.state, materials });
  store.emit();
  store.scheduleMaterialInvalidation(materialId);
}


export function duplicateMaterial(materialId: string): string | null {
  const source = store.getMaterialById(materialId);
  if (!source) {return null;}

  const id = `user-${crypto.randomUUID()}`;
  const copy: MaterialPreset = {
    ...cloneMaterialPreset(source),
    id,
    name: `${source.name} copy`,
    source: 'user',
  };

  store.setAppState({
    ...store.state,
    materials: [...store.state.materials, copy],
    selectedMaterialId: id,
  });
  store.emit();
  return id;
}


export function removeMaterial(materialId: string): void {
  const material = store.getMaterialById(materialId);
  if (material?.source !== 'user') {return;}

  store.setAppState({
    ...store.state,
    materials: store.state.materials.filter((entry) => entry.id !== materialId),
    selectedMaterialId:
      store.state.selectedMaterialId === materialId ? null : store.state.selectedMaterialId,
  });
  store.emit();
}
