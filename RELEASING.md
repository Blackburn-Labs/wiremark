# Releasing

The scoped packages **`@wiremark/core`** (`packages/core`, the library) and
**`@wiremark/cli`** (`packages/cli`, the command-line renderer) are published to
npm by the **Publish to npm** workflow (`.github/workflows/release.yml`), which
authenticates via OIDC trusted publishing — no tokens or secrets required. The
workflow publishes core first, then cli (cli depends on core).

To cut a release:

1. Bump `version` in **both** `packages/core/package.json` and
   `packages/cli/package.json` — and the `@wiremark/core` dependency pin in
   `packages/cli/package.json` — to the same new semver (one not already on npm).
2. Commit and push to `main`.
3. Draft and publish a new **GitHub Release** with a tag matching the version
   (e.g. `v0.2.0`).

Publishing the Release runs the workflow — test suite, then `npm publish
--provenance --access public` for each package — and the new versions (with
provenance attestations) appear on npm a few minutes later. The workflow can also
be run on demand from the **Actions** tab.
