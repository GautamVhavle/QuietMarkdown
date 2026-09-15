import { defineConfig } from 'vitest/config'

// Unit tests for pure logic only (reducer, filenames, placeholders,
// settings normalization, storage). Browser e2e stays in Playwright.
export default defineConfig({
  test: {
    include: ['src/unit-tests/**/*.test.ts'],
    environment: 'jsdom',
  },
})
