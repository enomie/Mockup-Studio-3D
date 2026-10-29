export type StudioLayerId = 'silk' | 'silkCorners' | 'cube' | 'sphere';

export const STUDIO_LAYER_IDS: StudioLayerId[] = [
  'silk',
  'silkCorners',
  'cube',
  'sphere',
];

export const STUDIO_LAYER_LABELS: Record<StudioLayerId, string> = {
  silk: 'Silk',
  silkCorners: 'Silk Corners',
  cube: 'Cube',
  sphere: 'Sphere',
};

export interface StudioLayersState {
  visibility: Record<StudioLayerId, boolean>;
  selected: StudioLayerId | null;
}

export function createDefaultStudioLayers(): StudioLayersState {
  return {
    visibility: {
      silk: true,
      silkCorners: true,
      cube: true,
      sphere: false,
    },
    selected: null,
  };
}
