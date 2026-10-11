import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

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

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, 'src'),
    },
  },
  plugins: [react()],
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
