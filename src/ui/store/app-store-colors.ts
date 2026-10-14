import {
  cloneColorPreset,
  COLOR_NEARWHITE_ID,
  resolveBuiltinColorPreset,
} from '@/data/color-presets';
import type { ColorPreset } from '@/scene/color-types';
import * as store from './app-store-internals';

function getColorById(colorId: string): ColorPreset | undefined {
  const builtin = resolveBuiltinColorPreset(colorId);
  return (
    store.state.colors.find((entry) => entry.id === colorId) ??
    (builtin ?? undefined)
  );
}

export function selectColor(colorId: string | null): void {
  store.setAppState({ ...store.state, selectedColorId: colorId });
  store.emit();
}


export function addColor(): string {
  const nearwhite = resolveBuiltinColorPreset(COLOR_NEARWHITE_ID);
  const id = `user-${crypto.randomUUID()}`;
  const preset: ColorPreset = {
    id,
    name: 'New color',
    source: 'user',
    rgb: nearwhite ? { ...nearwhite.rgb } : { r: 0.8, g: 0.8, b: 0.8 },
  };

  store.setAppState({
    ...store.state,
    colors: [...store.state.colors, preset],
    selectedColorId: id,
  });
  store.emit();
  return id;
}


export function updateColor(colorId: string, partial: Partial<ColorPreset>): void {
  const index = store.state.colors.findIndex((color) => color.id === colorId);
  if (index < 0) {return;}

  const current = store.state.colors[index];
  const next: ColorPreset = {
    ...current,
    ...partial,
    rgb: partial.rgb ? { ...partial.rgb } : current.rgb,
  };

  const colors = [...store.state.colors];
  colors[index] = next;
  store.setAppState({ ...store.state, colors });
  store.emit();
}


export function duplicateColor(colorId: string): string | null {
  const source = getColorById(colorId) ?? resolveBuiltinColorPreset(colorId);
  if (!source) {return null;}

  const id = `user-${crypto.randomUUID()}`;
  const copy: ColorPreset = {
    ...cloneColorPreset(source),
    id,
    name: `${source.name} copy`,
    source: 'user',
  };

  store.setAppState({
    ...store.state,
    colors: [...store.state.colors, copy],
    selectedColorId: id,
  });
  store.emit();
  return id;
}


export function removeColor(colorId: string): void {
  const color = getColorById(colorId);
  if (color?.source !== 'user') {return;}

  store.setAppState({
    ...store.state,
    colors: store.state.colors.filter((entry) => entry.id !== colorId),
    selectedColorId: store.state.selectedColorId === colorId ? null : store.state.selectedColorId,
  });
  store.emit();
}

