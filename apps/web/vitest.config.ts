import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', '.next', 'tests/e2e/**'],
    env: {
      DATABASE_URL: 'postgresql://rikkei@127.0.0.1:5432/rikkei_docs',
      AUTH_SECRET: 'dev_secret_change_in_production_min_32_chars_long',
      NEXTAUTH_URL: 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});