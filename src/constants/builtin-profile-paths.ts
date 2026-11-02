/** Runtime URLs for built-in SVG profiles under `public/profiles/`. */
export type BuiltinProfileDir = 'lathe' | 'extrude';

export function builtinProfileUrl(dir: BuiltinProfileDir, filename: string): string {
  return `/profiles/${dir}/${filename}`;
}

export function builtinLatheProfileUrl(filename: string): string {
  return builtinProfileUrl('lathe', filename);
}
