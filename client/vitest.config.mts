import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],
    testTimeout: 10000,
    setupFiles: ['tests/setup.ts'],
    env: {
      NEXT_PUBLIC_SERVER_URL: 'http://localhost:4000',
      SERVER_URL: 'http://localhost:4000',
    },
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
