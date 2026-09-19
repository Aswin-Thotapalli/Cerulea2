import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * The coverage run.
 *
 * The run carries every suite in Studio and measures line coverage with the
 * v8 provider. The gate script reads the JSON summary the run writes.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    pool: 'threads',
    poolOptions: { threads: { minThreads: 1, maxThreads: 2 } },
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      enabled: true,
      all: true,
      reporter: ['text-summary', 'json-summary', 'json'],
      reportsDirectory: 'coverage',
      reportOnFailure: true,
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        // A module holding type declarations alone compiles to nothing.
        'src/**/types.ts',
        'src/**/answers.ts',
      ],
    },
  },
});
