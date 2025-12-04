import type { Config } from '@react-router/dev/config';

export default {
  ssr: false,
  appDirectory: './src/app',
  buildDirectory: '../../dist/apps/web',
  future: {
    unstable_optimizeDeps: true,
  },
} satisfies Config;
