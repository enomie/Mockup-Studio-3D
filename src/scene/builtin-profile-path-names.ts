/** Display names of the slot paths per asset type (slot index → name). */
export const BUILTIN_PROFILE_PATH_NAMES: Partial<Record<string, Partial<Record<number, string>>>> = {
  'Wine bottle': { 0: 'Glass', 1: 'Capsule foil', 2: 'Capsule disc', 3: 'Cork' },
  'Beverage can': { 0: 'Body', 1: 'Top ring' },
  Pen: { 0: 'Cap', 1: 'Ring', 2: 'Body' },
  'Wheel car': { 0: 'Tire', 1: 'Rim outer', 2: 'Rim inner', 6: 'Spoke' },
  'Object Extrusion': { 0: 'Body' },
};

export function builtinPathName(usedBy: string, slot: number): string {
  return BUILTIN_PROFILE_PATH_NAMES[usedBy]?.[slot] ?? `Path ${slot + 1}`;
}
