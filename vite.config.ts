import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** Not part of the app bundle — keep dev watcher quiet. */
const ignoredWorkspaceDirs = [
  '.backup',
  '.backups',
  '_anfänge',
  '_deleted',
  '_scripts',
] as const;

const ignoredGlobPatterns = ignoredWorkspaceDirs.map((dir) => `**/${dir}/**`);

/**
 * Engine-side modules hold module-level state (live material registry, caches) that a
 * running engine instance depends on. A hot update would give new code an empty copy of
 * that state, so edits there always reload the whole page.
 */
const fullReloadDirs = ['engine', 'materials', 'physics', 'render', 'scene'].map(
  (dir) => path.join(projectRoot, 'src', dir) + path.sep,
);

function engineFullReloadPlugin(): Plugin {
  return {
    name: 'engine-full-reload',
    handleHotUpdate({ file, server }) {
      if (!fullReloadDirs.some((dir) => path.normalize(file).startsWith(dir))) {return undefined;}
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, 'src'),
    },
  },
  plugins: [react(), engineFullReloadPlugin()],
  server: {
    port: 4040,
    watch: {
      ignored: ignoredGlobPatterns,
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', ...ignoredGlobPatterns],
    setupFiles: ['src/test/vitest-dom.ts'],
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
