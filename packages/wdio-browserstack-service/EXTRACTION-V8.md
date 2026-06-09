# Extracting the **v8 line** of `@wdio/browserstack-service`

Companion to the v9 `EXTRACTION.md`. Same goal — release the package independently of the
WebdriverIO monorepo while **users change nothing** — applied to the **v8 maintenance line**
(for WebdriverIO v8 / Node 16 users). v8 and v9 are the **same npm package**, different
**dist-tags** and branches.

## The dist-tag strategy (the v8-critical part)

`@wdio/browserstack-service` carries parallel lines on npm:

| dist-tag | line | branch | peer `webdriverio` |
|---|---|---|---|
| `latest` | v9 | `main` | `^9` |
| **`v8`** | **v8** | **`v8`** | **`^8`** |
| `v7` | v7 (legacy) | — | — |

> ⚠️ **A v8 release must publish to the `v8` dist-tag, never `latest`** — otherwise v9 users
> running `npm i @wdio/browserstack-service` would suddenly get a v8 build. This is enforced
> here by **`publishConfig.tag: "v8"`** in `package.json`, so `npm publish` / `changeset publish`
> default to the `v8` tag. Changesets `baseBranch` is `v8`, and the release workflow triggers on
> the `v8` branch only.

npm **trusted-publishing (OIDC) is per-package**, so the same delegation the TSC sets up for the
v9 line automatically covers v8 — no extra grant needed.

## What changed (mirrors v9, with v8 values)

| File | Change |
|------|--------|
| `package.json` | Moved `webdriverio 8.46.0` / `@wdio/types 8.41.0` / `@wdio/reporter 8.43.0` / `@wdio/logger 8.38.0` from `dependencies` → **`peerDependencies` (`^8.0.0`)** + `devDependencies`. Added build/test/release `scripts` and toolchain devDeps (`esbuild`, `typescript`, `rimraf`, `vitest`, `@changesets/cli`). **Added `publishConfig.tag: "v8"`.** Kept engines `^16.13 || >=18`, the `^5–^8` `@wdio/cli` peer, and the single `.` export. Repointed repository/homepage/bugs. |
| `tsconfig.json` | Self-contained (inlined the options previously from `../../tsconfig.prod`; dropped `../../@types`). |
| `tsconfig.prod.json` | Declaration-only emit (was extending the monorepo root). |
| `scripts/build.mjs` | Standalone esbuild build — **single `index` entry** (v8 has no `./cleanup` export), `target: node16`, deps external. |
| `src/request-handler.ts` | `.unref()` the batch-polling `setInterval` (same lifecycle fix as v9). |
| `.changeset/` | Independent versioning, `baseBranch: v8`. |
| `.github/workflows/` | `ci.yml` (Node 16/18/20) + `release.yml` (on `v8`, OIDC, publishes the `v8` tag). |
| `.npmignore`, `vitest.config.ts` | Lean tarball; standalone test config. |

## Key differences from the v9 extraction

- **Node 16 still supported** (`engines: ^16.13 || >=18`) → build targets `node16`.
- **Single entrypoint** — v8 exports only `.` (no `./cleanup`); `src/cleanup.ts` exists but isn't a published export.
- **Different deps** — v8 uses `got`/`formdata-node`/`glob ^10`/`tar ^6`/`uuid ^10` (vs v9's `undici`/`glob ^11`/`tar ^7`/`uuid ^11`); all external, unchanged by the extraction.
- **Peer ranges are `^8`** (and `@wdio/cli` stays `^5–^8`, no `^9`).
- **Publishes to the `v8` dist-tag**, not `latest`.

## Remaining follow-ups (same as v9)
- **Test wiring:** copy the v8 root `__mocks__` the suite needs (mirroring v9) so the standalone Vitest run is green; the build/release plumbing above does not depend on it.
- Set `repository.url` to the final repo before the first provenance-signed publish.
- The fork's `v8` is at `3e62544`; sync with upstream `v8` (`cdbd52e` / 8.48.0) before a real cutover.

## Cutover ordering (unchanged principle)
Don't remove the v8 package from the monorepo's `v8` branch until the new repo's `v8` branch is the
live publisher of the `v8` dist-tag and has shipped at least one green release.
