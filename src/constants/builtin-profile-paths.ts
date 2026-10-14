/** Runtime URLs for built-in SVG profiles under `public/profiles/`. */
export const BUILTIN_PROFILE_LATHE_URL_PREFIX = '/profiles/lathe';

export const BUILTIN_PROFILE_EXTRUDE_URL_PREFIX = '/profiles/extrude';

export function builtinLatheProfileUrl(filename: string): string {
  return `${BUILTIN_PROFILE_LATHE_URL_PREFIX}/${filename}`;
}

/** `public/profiles/lathe/{filename}` for Node tests and scripts. */
export function publicLatheProfileFilePath(filename: string): string {
  return `profiles/lathe/${filename}`;
}
