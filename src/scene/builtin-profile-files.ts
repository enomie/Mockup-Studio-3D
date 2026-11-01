/**
 * Built-in profile catalogue (no generated data here, so build scripts can import it).
 * A profile is a neutral set of 2D paths. The asset that uses it decides whether it is
 * revolved or extruded (and around which axis), so profiles carry no kind.
 */
export interface BuiltinProfileFile {
  id: string;
  name: string;
  /** SVG file name under `public/profiles/lathe/` (1 unit = 1 mm). */
  file: string;
  /** Asset type that ships with this profile. */
  usedBy: string;
}

export const BUILTIN_PROFILE_FILES = [
  { id: 'bottle-bordeaux', name: 'Bordeaux bottle', file: 'lathe-y-bottle-bordeaux-open.svg', usedBy: 'Wine bottle' },
  { id: 'bottle-alsace', name: 'Alsace bottle', file: 'lathe-y-bottle-alsace-open.svg', usedBy: 'Wine bottle' },
  { id: 'bottle-sparkling', name: 'Sparkling bottle', file: 'lathe-y-bottle-sparkling-open.svg', usedBy: 'Wine bottle' },
  { id: 'can-330-classic', name: 'Can 330 ml classic', file: 'lathe-y-can-330ml-classic.svg', usedBy: 'Beverage can' },
  { id: 'can-330-sleek', name: 'Can 330 ml sleek', file: 'lathe-y-can-330ml-sleek.svg', usedBy: 'Beverage can' },
  { id: 'pen-marker', name: 'Marker pen', file: 'lathe-y-pen-marker.svg', usedBy: 'Pen' },
  { id: 'pen-fountain', name: 'Fountain pen', file: 'lathe-y-pen-fountain.svg', usedBy: 'Pen' },
  { id: 'wheel-car', name: 'Car wheel', file: 'lathe-x-wheel-car.svg', usedBy: 'Wheel car' },
] as const satisfies readonly BuiltinProfileFile[];

export type BuiltinProfileId = (typeof BUILTIN_PROFILE_FILES)[number]['id'];

/** SVG file name of a built-in profile. */
export function builtinProfileFile(id: BuiltinProfileId): string {
  const entry = BUILTIN_PROFILE_FILES.find((profile) => profile.id === id);
  if (!entry) {
    throw new Error(`Unknown built-in profile: ${id}`);
  }
  return entry.file;
}
