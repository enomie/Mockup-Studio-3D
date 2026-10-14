# improve — Builtin Images (Auto-Discovery)

**Normativ:** [`requirements-images.md`](../requirements/requirements-images.md) (Builtin-Ordner, `--`-Grammar, Auto-Manifest).

## Ziel

Neue Sample-Bilder **ohne** manuelles Editieren von `STARTER_IMAGES`: Datei nach `public/images/` legen (korrekter Name) → `npm run dev` / `npm run build` regeneriert Manifest → Bild erscheint in der Images-Liste (`source: starter`).

## Workflow (Entwickler)

1. PNG/WebP/… nach `public/images/{name}--{format}--{pixelsize}.ext` kopieren.
2. Generator laufen lassen (automatisch via `predev` / `prebuild`, oder `npx vite-node scripts/generate-builtin-images.ts`).
3. `builtin-images.generated.ts` committen.

## Offen / später

- IndexedDB + Scene-Save für User-Bilder (separat in requirements-images).
- Migration alter `imageId`s in gespeicherten User-Projekten (nicht im Repo).
