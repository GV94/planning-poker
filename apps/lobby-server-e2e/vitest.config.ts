import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const workspaceRoot = resolve(__dirname, '../..');

export default defineConfig({
  root: workspaceRoot,
  test: {
    name: 'lobby-server-e2e',
    globals: true,
    include: ['apps/lobby-server-e2e/src/**/*.spec.ts'],
    fileParallelism: false,
    testTimeout: 10000,
    hookTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: resolve(workspaceRoot, 'coverage/lobby-server-e2e'),
      include: ['apps/lobby-server/src/**/*.ts'],
      exclude: ['apps/lobby-server/src/main.ts'],
    },
  },
  resolve: {
    alias: {
      'shared-types': resolve(workspaceRoot, 'libs/shared-types/src/index.ts'),
    },
  },
});
