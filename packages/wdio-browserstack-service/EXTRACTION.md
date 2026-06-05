# Extracting `@wdio/browserstack-service` from the WebdriverIO monorepo

This document records the changes made to turn `packages/wdio-browserstack-service`
into a **self-contained, independently-releasable package** and the remaining steps
to actually move it into its own repository and cut over publishing.

**Goal:** BrowserStack releases this service on its own cadence (the WebdriverIO TSC
currently controls all releases via a lockstep Lerna publish), while **users change
nothing** — same `npm i @wdio/browserstack-service`, same `services: ['browserstack']`.

This is the same model WebdriverIO already uses for [`@wdio/visual-service`](https://github.com/webdriverio/visual-testing)
and [`@wdio/electron-service`](https://github.com/webdriverio/desktop-mobile):
separate repo, independent release tooling (Changesets), **same `@wdio` npm scope**.

---

## Why the package name must stay `@wdio/browserstack-service`

`services: ['browserstack']` is resolved by `initializePlugin()` in `@wdio/utils`. It
tries, in order: a literal `@scoped`/absolute string → `@wdio/browserstack-service`
→ `wdio-browserstack-service`. It only imports what is already installed (no runtime
auto-install). So zero-config-change for users **requires** the package to keep being
published under the exact name `@wdio/browserstack-service`. An npm scope cannot be
transferred to a different scope, so "keep the name" means "keep the `@wdio` scope" —
which means the WebdriverIO TSC must delegate publish rights (see Phase 0).

---

## What this branch changed (Phase 1 — self-contain in place)

All changes are confined to `packages/wdio-browserstack-service/`; the other monorepo
packages are untouched.

| File | Change |
|------|--------|
| `package.json` | Moved `webdriverio`, `@wdio/types`, `@wdio/reporter`, `@wdio/logger` out of `dependencies` (they were `workspace:*`, pinned to exact versions at publish) and into **`peerDependencies` (`^9.0.0`)** + `devDependencies`. This prevents a duplicate copy of `webdriverio` in the user's tree. Added standalone `scripts` (build/test/version/release) and build/test toolchain devDeps (`esbuild`, `typescript`, `rimraf`, `vitest`, `@changesets/cli`). Repointed `repository`/`homepage`/`bugs`. |
| `tsconfig.json` | Made self-contained — inlined the options previously inherited from `../../tsconfig` and dropped the `../../@types` include. |
| `tsconfig.prod.json` | New — declaration-only emit (`build/*.d.ts`), excludes tests. |
| `scripts/build.mjs` | New — replicates the monorepo's central esbuild `@wdio/compiler` for this one package: one ESM bundle per `exports` entry (`.` → `build/index.js`, `./cleanup` → `build/cleanup.js`), all deps/peers external. |
| `vitest.config.ts` | New — standalone test config (the monorepo's root config used to drive tests). |
| `__mocks__/` | New — copied the manual mocks these tests resolve by convention from the monorepo root (`@wdio/logger`, `@wdio/reporter`, `browserstack-local`, `fs`, `chalk`, `fetch`). The `@wdio/reporter` mock was adapted to import stats classes + `getBrowserName` from the **published** `@wdio/reporter` instead of monorepo source paths. |
| `.changeset/` | New — Changesets config for independent versioning (same tool `@wdio/visual-service` uses). |
| `.github/workflows/` | New — `ci.yml` and `release.yml` **templates**. Inert here (Actions only reads `.github/workflows` at a repo root); move to the new repo's root. `release.yml` uses npm OIDC Trusted Publishing (no long-lived token). |
| `.npmignore` | Expanded so only `build/`, `README`, `LICENSE` and the root ambient types ship. |

### Build / test locally (from this package directory)

```sh
pnpm install          # resolves peer/devDeps from the npm registry
pnpm build            # esbuild bundles + tsc emits .d.ts -> ./build
pnpm test             # vitest, using ./__mocks__
```

> Build was smoke-validated with esbuild bundling (`--packages=external`) without a
> full install. **Full `pnpm build` + `pnpm test` still need to be run after
> `pnpm install`** — see the open item below.

---

## Decisions baked in (revisit if needed)

- **Peer ranges are `^9.0.0`** for `webdriverio` / `@wdio/types` / `@wdio/reporter` /
  `@wdio/logger`. The published `9.27.2` pinned these to exact `9.x`, so `^9` is more
  lenient and honest. (`@wdio/cli` keeps its historical wide `^5 || … || ^9` peer.)
- **Versioning leaves lockstep.** The service no longer tracks the core WebdriverIO
  version. Continue the semver line from the current `9.27.2` via Changesets; the
  peer range — not version parity — guarantees compatibility.
- `@browserstack/*` SDKs and Percy SDKs are already external/BrowserStack-controlled
  and were left as regular `dependencies`.

---

## Remaining cutover steps

### Phase 0 — Governance (the real blocker; do first)
- [ ] Open a proposal/Discussion in `webdriverio/webdriverio`, framed as following the
      `@wdio/visual-service` / `@wdio/electron-service` precedent.
- [ ] Get the TSC to **delegate npm publish rights** for `@wdio/browserstack-service`,
      ideally by configuring **Trusted Publishing (OIDC)** on the package pointing at
      the new BrowserStack repo + `release.yml` (cleanest, no shared token). Alternative:
      add a BrowserStack npm account to the `@wdio` org with per-package write access
      (`npm access grant read-write wdio:<team> @wdio/browserstack-service`).
- [ ] Confirm whether the `@wdio` org enforces 2FA-on-publish (affects OIDC vs token).

### Phase 2 — New repository
- [ ] Create the public repo (provenance does not work from private repos).
- [ ] Copy `packages/wdio-browserstack-service/**` to the repo root; move
      `.github/workflows/*` to the repo root; `.changeset/` is already at the right level.
- [ ] Update `repository.url` / `homepage` / `bugs` to the new repo. **For provenance,
      `repository.url` must match the building repo EXACTLY** (case-sensitive, `.git`
      normalization).
- [ ] Run `pnpm install` and commit the lockfile; verify `pnpm build` and `pnpm test`.

### Phase 3 — Validate zero user impact
- [ ] In a scratch project: `npm i @wdio/browserstack-service@<new>` + `services: ['browserstack']` resolves and runs unchanged.
- [ ] Confirm no duplicate `webdriverio` in `node_modules` (the peerDep fix).

### Phase 4 — Remove from the monorepo (separate PR to official `webdriverio/webdriverio`)
- [ ] Delete `packages/wdio-browserstack-service` and stop the Lerna publish from
      shipping it; the npm trusted publisher now points at the new repo.
- [ ] Update docs: `webdriver.io/docs/browserstack-service` and, if moving to the
      third-party model, add an entry to `scripts/docs-generation/3rd-party/services.json`.

---

## Open items / risks
- **Tests not yet run green standalone.** Needs `pnpm install`; the adapted
  `@wdio/reporter` mock assumes `HookStats`/`RunnerStats`/`SuiteStats`/`TestStats`/
  `getBrowserName` are public exports of `@wdio/reporter` (they are in v9) — verify.
- **`repository` currently points at the fork** (`AakashHotchandani/webdriverio`) — must
  change to the final repo before the first provenance-signed publish.
- **Do not unpublish / rename** the `@wdio` package — keep it published from the new repo.
