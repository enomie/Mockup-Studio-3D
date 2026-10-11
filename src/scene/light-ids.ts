export const LIGHT_AMBIENT_ID = 'light-ambient';
export const LIGHT_KEY_ID = 'light-key';
export const LIGHT_FILL_ID = 'light-fill';

const LIGHT_IDS = [LIGHT_KEY_ID, LIGHT_FILL_ID] as const;

export type StudioLightId = (typeof LIGHT_IDS)[number];

export function isStudioLightId(id: string): id is StudioLightId {
  return (LIGHT_IDS as readonly string[]).includes(id);
}
