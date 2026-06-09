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
| `package.json` | Moved `webdriverio 8.46.0` / `@wdio/types 8.41.0` / `@wdio/reporter 8.43.0` / `@wdio/logger 8.38.0` from `dependencies` → **`peerDependencies` (`^8.0.0`)** + `devDependencies`. Added build/test/release `scripts` and toolchain devDeps (`typescript`, `rimraf`, `vitest`, `@changesets/cli`, **`@types/uuid`**, **`@types/yauzl`**). **Added `publishConfig.tag: "v8"`** and a **`files` allowlist** (`build` + the root types). Kept engines `^16.13 || >=18`, the `^5–^8` `@wdio/cli` peer, and the single `.` export. Repointed repository/homepage/bugs. |
| `tsconfig.json` | Self-contained (inlined the options previously from `../../tsconfig.prod`; dropped `../../@types`). |
| `tsconfig.prod.json` | **Emits JS + `.d.ts`** to `build/`, preserving the module structure (this IS the build — see below). |
| build | **`tsc` (NOT esbuild)** — `npm run build` = `tsc -p tsconfig.prod.json`. The v8 monorepo builds with `tsc -b`, and v8 has a top-level-`await` inside a circular module graph that a single esbuild bundle can't express. Structure-preserving `tsc` output (matching published 8.48.0) is required. *(This is the biggest v8≠v9 difference: v9 builds via an esbuild single-file bundle; v8 must use `tsc`.)* |
| `src/request-handler.ts` | `.unref()` the batch-polling `setInterval` (same lifecycle fix as v9). |
| `.changeset/` | Independent versioning, `baseBranch: v8`. |
| `.github/workflows/` | `ci.yml` (Node 16/18/20) + `release.yml` (on `v8`, OIDC, publishes the `v8` tag). |
| `vitest.config.ts` | Standalone test config (mocks are the same follow-up as v9). |

## Key differences from the v9 extraction

- **Build tool: `tsc`, not esbuild.** v8's TLA-in-a-circular-graph breaks single-file bundling; the monorepo uses `tsc -b`, so the standalone v8 build does too. Output preserves the `src` tree under `build/`.
- **Packaging via `files` allowlist, not `.npmignore`.** With a structure-preserving `tsc` build, `build/scripts/`, `build/cli/`, etc. exist — and an `.npmignore` `scripts` rule would (wrongly) drop `build/scripts/` because npmignore matches at any depth. A `files: ["build", …]` allowlist avoids that class of bug.
- **Extra type deps** — `@types/uuid` (`uuid@10` has no bundled types; v9's `uuid@11` does) and `@types/yauzl`; the monorepo provided these via workspace hoisting.
- **Node 16 still supported** (`engines: ^16.13 || >=18`).
- **Single entrypoint** — v8 exports only `.` (no `./cleanup`); `src/cleanup.ts` exists but isn't a published export.
- **Different ext deps** — `got`/`formdata-node`/`glob ^10`/`tar ^6`/`uuid ^10` (vs v9's `undici`/`glob ^11`/`tar ^7`/`uuid ^11`); all external, unchanged by the extraction.
- **Peer ranges are `^8`** (and `@wdio/cli` stays `^5–^8`, no `^9`).
- **Publishes to the `v8` dist-tag**, not `latest`.

## Validated (PoC, 2026-06-09)
Built the standalone v8 package off the registry (no monorepo) → `npm run build` (`tsc`) → `npm pack` → installed the tarball into a sample **as `@wdio/browserstack-service`** → resolved to the v8 build, **version 8.48.0**, `webdriverio` deduped to a single copy, and `import('@wdio/browserstack-service')` loaded cleanly (`default, launcher, log4jsAppender, PercySDK, BStackTestOpsLogger`). The three fixes above were found and applied during this rehearsal.

## Test wiring (done — parity with v9)
The mocks the suite resolves by convention are copied into `__mocks__/`: `@wdio/logger`,
`@wdio/reporter` (stats imported from the published package), `browserstack-local`, `fs`,
`got`, `chalk`. v8 uses `got` (not a global `fetch`), so `vitest.config.ts` has no fetch
setup file. Validated: a single file runs green standalone (`tests/bstackLogger.test.ts`,
6/6). The **all-at-once** suite has the same teardown caveat as v9 (open handles in the
service's lifecycle code) — a documented follow-up for the team, not a release blocker.

## Remaining follow-ups
- Set `repository.url` to the final repo before the first provenance-signed publish.
- The fork's `v8` is at `3e62544`; sync with upstream `v8` (`cdbd52e` / 8.48.0) before a real cutover.

## Cutover ordering (unchanged principle)
Don't remove the v8 package from the monorepo's `v8` branch until the new repo's `v8` branch is the
live publisher of the `v8` dist-tag and has shipped at least one green release.
