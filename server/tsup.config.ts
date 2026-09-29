import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/scripts/migrate.ts', 'src/scripts/seed.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Shared workspace code is bundled; npm dependencies stay external.
  noExternal: [/^@shared\//],
});
