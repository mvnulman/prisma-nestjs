import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/setup-e2e.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL: 'file:./test.db',
    },
  },
});
