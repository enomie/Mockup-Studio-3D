/** Runtime URLs for built-in SVG profiles under `public/profiles/`. */
const BUILTIN_PROFILE_LATHE_URL_PREFIX = '/profiles/lathe';

export function builtinLatheProfileUrl(filename: string): string {
  return `${BUILTIN_PROFILE_LATHE_URL_PREFIX}/${filename}`;
}
