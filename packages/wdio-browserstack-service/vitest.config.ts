import { defineConfig } from 'vitest/config'

/**
 * Standalone Vitest config for @wdio/browserstack-service (v8 line).
 *
 * In the monorepo, tests were driven by the repo-root vitest config + root `__mocks__/`.
 * Standalone, the manual mocks this suite relies on must be copied into `./__mocks__`
 * (mirroring what was done on the v9 branch: @wdio/logger, @wdio/reporter, browserstack-local,
 * fs, chalk, plus the `fetch` setup). See EXTRACTION-V8.md — that copy is the remaining
 * test-wiring follow-up; the build + release plumbing in this PR does not depend on it.
 */
export default defineConfig({
    test: {
        dangerouslyIgnoreUnhandledErrors: true,
        include: ['tests/**/*.test.ts'],
        exclude: ['dist', 'build', '.idea', '.git', '.cache', '**/node_modules/**'],
        env: { WDIO_SKIP_DRIVER_SETUP: '1' },
        pool: 'forks',
        setupFiles: ['./__mocks__/fetch.ts'],
        testTimeout: 30000
    }
})
