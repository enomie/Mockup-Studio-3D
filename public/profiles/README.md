# Built-in geometry profiles (SVG)

Authoring SVGs for engine geometry — **not** the Images library (`public/images/`).

| Folder | Use |
|---|---|
| **`lathe/`** | Half-profile → revolve around **Y** (default) or **X** (wheel); filenames **`lathe-y-*.svg`** / **`lathe-x-*.svg`** |
| **`extrude/`** | Reserved for future **extrude** paths (empty until first asset) |

Runtime URLs: `/profiles/lathe/{filename}.svg`, `/profiles/extrude/…`

**Lathe geometry paths:** `path_red` / `path_green` / `path_blue` with strokes `#ff0000` / `#00ff00` / `#0000ff` (strict — see [`requirements-assets-lathe.md`](../../_docs/requirements/requirements-assets-lathe.md)).
