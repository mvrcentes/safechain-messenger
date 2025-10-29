import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        // vitest buscará tests aquí (ajusta si usas otra carpeta)
        include: ['test/**/*.{test,spec}.{js,ts}', 'src/**/*.{test,spec}.{js,ts}'],

        coverage: {
            provider: 'v8',                // <-- explícito
            enabled: true,
            all: true,                     // <-- incluye archivos aunque no se ejecuten
            include: ['src/**/*.{js,ts}'], // <-- qué archivos medir
            exclude: [
                '**/node_modules/**',
                '**/dist/**',
                '**/coverage/**',
                '**/*.d.ts',
                '**/migrations/**'
            ],
            reportsDirectory: './coverage',
            reporter: ['text', 'lcov', 'html'] // genera lcov.info y html
        },
    },
})