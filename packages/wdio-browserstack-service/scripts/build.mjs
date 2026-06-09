/**
 * Standalone build for @wdio/browserstack-service (v8 line).
 *
 * Reproduces what the monorepo's central build (scripts/build.ts on the v8 branch)
 * did for this package, so it can build on its own outside the monorepo:
 *   - the v8 package exposes a single entrypoint (`.` -> build/index.js); there is
 *     no `./cleanup` export on the v8 line, so we build only src/index.ts.
 *   - ESM, platform node, target node16 (v8 supports Node ^16.13 || >=18).
 *   - every dependency / peerDependency stays `external` (only this package's own
 *     `src` is bundled).
 *
 * TypeScript declarations (build/*.d.ts) are emitted by `tsc -p tsconfig.prod.json`.
 */
import { readFile } from 'node:fs/promises'
import { builtinModules } from 'node:module'
import path from 'node:path'
import url from 'node:url'
import { build, context } from 'esbuild'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const pkgRoot = path.resolve(__dirname, '..')
const pkg = JSON.parse(await readFile(path.resolve(pkgRoot, 'package.json'), 'utf-8'))

const watch = process.argv.includes('--watch')
const isProd = process.env.NODE_ENV === 'production'

const external = [
    'virtual:*',
    ...builtinModules,
    ...builtinModules.map((mod) => `node:${mod}`),
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    ...Object.keys(pkg.optionalDependencies || {})
]

const config = {
    entryPoints: [path.resolve(pkgRoot, 'src/index.ts')],
    outfile: path.resolve(pkgRoot, 'build/index.js'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node16',
    sourcemap: isProd ? false : 'inline',
    sourceRoot: pkgRoot,
    tsconfig: path.resolve(pkgRoot, 'tsconfig.json'),
    external,
    logLevel: 'info'
}

if (watch) {
    const ctx = await context(config)
    await ctx.watch()
    console.log('[@wdio/browserstack-service v8] watching for changes …')
} else {
    const result = await build(config)
    if (result.errors.length > 0) {
        console.error(result.errors)
        process.exit(1)
    }
    console.log('[@wdio/browserstack-service v8] esbuild bundle complete → build/index.js')
}
