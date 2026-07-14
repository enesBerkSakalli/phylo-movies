import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^wgsl_reflect$/,
        replacement: resolve('node_modules/wgsl_reflect/wgsl_reflect.module.js'),
      },
    ],
  },
  test: {
    server: {
      deps: {
        inline: [/^@deck\.gl\//, /^@luma\.gl\//, 'wgsl_reflect'],
      },
    },
    environment: 'node',
    include: ['test/vitest/domain/**/*.test.{js,ts}', 'test/vitest/integration/**/*.test.{js,ts}'],
  },
});
