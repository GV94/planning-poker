import rootConfig from '../../eslint.config.mjs';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  ...rootConfig,
  {
    files: ['**/*.ts'],
    rules: {
      // E2E tests need to import server internals for setup/teardown
      '@nx/enforce-module-boundaries': 'off',
    },
  },
]);
