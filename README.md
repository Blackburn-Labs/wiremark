# wiremark

A text-based, markdown-embeddable wireframing format. Inspired by **YAML's
simplicity** and **[MUI](https://mui.com/)'s readability**: a hierarchy of
familiar Material UI component names, indented to show containment, rendered
in a hand-drawn (Balsamiq-like) style.

wiremark is **agent-first** — designed to be trivial for an LLM to read, write,
and reason about — while embedding cleanly in markdown the way Mermaid does.

## Example

A wireframe lives inside a fenced ` ```wireframe ` block:

````markdown
```wireframe
Wireframe mobile
  Stack col gap=2
    Typography h4 "Sign in"
    TextField "Email"
    TextField "Password"
    Button "Sign in" primary to=#dashboard
```
````

## Key ideas

- **Borrowed semantics.** Component names mirror Material UI (`Stack`, `Box`,
  `Card`, `Button`, `TextField`, ...) — if you know MUI, you know the vocabulary.
- **Hierarchy over coordinates.** Indentation is the only structural mechanism;
  no manual x/y positioning.
- **Aggressive defaulting.** A bare component name produces something sensible —
  detail is opt-in, so wireframing stays fast.
- **Hand-drawn by default.** Output is a sketch, not a polished mockup.
- **Markdown-native.** Lives in a fenced code block and renders via thin host
  adapters (Obsidian, markdown-it, remark, ...) over one pure core.
- **Flow for free.** Frames are named with `#id` and linked with `to=#id`, so an
  embedded navigation graph falls out of the document automatically.

## Repository layout

This repo is a lightweight [npm-workspaces](https://docs.npmjs.com/cli/using-npm/workspaces)
monorepo holding the **core** library and its official **host adapters**. The
visual editor lives in its own repository.

```
packages/
  core/         # @wiremark/core -- parser, layout engine, hand-drawn SVG renderer (pure JS, no host deps)
  cli/          # @wiremark/cli  -- thin command-line renderer (npx @wiremark/cli in.wiremark -o out.svg)
  adapter-*/    # thin per-host adapters (Obsidian, markdown-it, remark, ...) -- added as built
meta/           # element-specs.json -- component coverage matrix (hand-maintained)
```

- **core** turns wiremark source — the text inside a ` ```wireframe ` block —
  into SVG; it knows nothing about markdown.
- **adapters** find the fenced block in a host document and hand its contents to
  core.
- the **editor** (a PWA WYSIWYG authoring tool) is a separate repo that consumes
  `core` as a dependency.

## Pipeline

`source → lex → indent tree → resolve (keyless/sizing/filler) → layout →
hand-drawn SVG`, with the navigation graph inferred from `to=#id` links.

## Status

The format is specified at v0.1. The workspace and core skeleton are scaffolded;
the parser, layout engine, and renderer are in progress. Run the core test suite
with `npm test`.

## Releasing

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

> **First publish is manual.** OIDC trusted publishing requires the package to
> already exist on npm with a Trusted Publisher configured, so the very first
> publish of each package is done by hand (`npm publish --access public` from the
> package dir); CI takes over from the second release on.
