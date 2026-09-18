import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Cerulea keeps the test run to two worker threads.
// The machine also builds the chain, so a wider run starves that build.
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
  },
});
