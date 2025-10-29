import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        coverage: {
            enabled: true,
            reporter: ['lcov', 'text-summary'],
            reportsDirectory: './coverage',
            include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
            exclude: ['**/migrations/**', '**/dist/**']
        }
    }
})