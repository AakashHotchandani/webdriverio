# Changesets

This package uses [Changesets](https://github.com/changesets/changesets) for
independent versioning and publishing — decoupled from the WebdriverIO monorepo's
lockstep Lerna release.

To record a change, run:

```sh
npx changeset
```

Pick a bump (patch / minor / major) and write a short summary. A markdown file is
added to this folder and committed with your PR. On merge, the release workflow
opens a "Version Packages" PR that consumes the changesets, bumps the version, and
updates the changelog. Merging that PR publishes to npm as `@wdio/browserstack-service`.

See `EXTRACTION.md` for the full extraction/cutover context.
