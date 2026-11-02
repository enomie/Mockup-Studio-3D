# Built-in geometry profiles (SVG)

Authoring SVGs for engine geometry — **not** the Images library (`public/images/`).

| Folder | Use |
|---|---|
| **`lathe/`** | Half-profile → revolve around **Y** (default) or **X** (wheel); filenames **`lathe-y-*.svg`** / **`lathe-x-*.svg`** |
| **`extrude/`** | Outlines for the **Object Extrusion** asset (e.g. `extrude-rounded-rect.svg`, the default profile) |

Runtime URLs: `/profiles/lathe/{filename}.svg`, `/profiles/extrude/{filename}.svg`

**Geometry paths:** `path_red` / `path_green` / `path_blue` / … (ten colour slots) with strokes `#ff0000` / `#00ff00` / `#0000ff` / … (strict — see [`requirements-assets-lathe.md`](../../_docs/requirements/requirements-assets-lathe.md)).

**In the app** every file here is also a **built-in profile** (Profiles tab): read-only, named paths, can be duplicated and edited in the 2D profile editor. After changing or adding a file, register it in `src/scene/builtin-profile-files.ts` (path names in `builtin-profile-path-names.ts`) and run
`npx tsx scripts/generate-lathe-profile-metrics.ts` and `npx tsx scripts/generate-builtin-profiles.ts` (both also run on `npm run dev` / `npm run build`).
Details: [`requirements-profiles.md`](../../_docs/requirements/requirements-profiles.md).
