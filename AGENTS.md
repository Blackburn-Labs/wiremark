# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

wiremark is an **agent-first, markdown-embeddable wireframe DSL** — "YAML-flavored
[MUI](https://mui.com/)-inspired". A wireframe is a hierarchy of Material UI component names,
indented for containment, that renders to a hand-drawn (Balsamiq-like) SVG. Source
lives inside a fenced ` ```wireframe ` block.

This is an npm-workspaces monorepo:

- **`packages/core`** — the `@wiremark/core` npm package: parser, layout engine, and
  SVG renderer. Pure ESM JS, one runtime dependency (`roughjs`), knows nothing about
  markdown. This is where almost all work happens.
- **`packages/cli`** — the `@wiremark/cli` npm package: a thin command-line renderer
  (`npx @wiremark/cli in.wiremark -o out.svg`). Its bin just calls `@wiremark/core`'s
  `run()` (the `@wiremark/core/cli` export) — no logic of its own.
- **`docs/`** + **`site/`** — portable Markdown language docs (`docs/`) served by a
  Docusaurus site (`site/`, `path: '../docs'`). The visual editor and the marketing
  site are separate repos.

## Commands

```sh
npm test                            # run the whole suite (Node's built-in runner, no deps)
npm test --workspace @wiremark/core  # run only core's tests (what CI runs before publish)
node --test packages/core/test/elements/Button.test.js   # a single test file
node --test --test-name-pattern="navigation graph"        # tests matching a name

npm run render --workspace @wiremark/cli -- <in.wiremark> [out.svg]   # CLI: render a file to SVG
node packages/cli/bin/wiremark.js <in.wiremark> -o out.svg           # same, directly

npm run docs:reference              # regenerate docs/reference/components.md from meta/element-specs.json
cd site && npm start                # docs site dev server (regenerates the reference first)
cd site && npm run build            # build the docs site
```

There is **no separate build, lint, or typecheck step.** Core ships its `src/` as-is
(ESM, Node ≥18). Files use `// @ts-check` + JSDoc, so type errors surface in an
editor/IDE only — there is no `tsc` in the project.

## Architecture

Core is a five-stage pipeline plus one side output, **one file per stage**, wired
together in `packages/core/src/index.js` (the only public entrypoint):

```
source --lex(lexer.js)--> tokens --tree(tree.js)--> raw tree
       --resolve(resolve.js)--> Document --layout(layout.js)--> boxes --render(render.js)--> SVG
                                        \--flow(flow.js)--> navigation graph (toFlowGraph / toMermaid)
```

- **lex / tree / resolve** are the front-end: text → validated semantic `Document`
  (frames + resolved nodes + diagnostics). `resolve.js` is the heart — it turns
  keyless tokens into keyed props using each component's schema.
- **layout.js** is a flexbox-lite solver: a bottom-up `measure` pass then a top-down
  `place` pass, producing absolute `Box` geometry per frame.
- **render.js** walks the boxes and emits hand-drawn SVG.
- **flow.js** reconstructs a navigation graph purely from `to=#id` links.

### The element strategy contract (most important concept)

Every component is **one file** under `src/elements/<Name>.js` that default-exports a
single object which is *both its schema and its layout/render strategy*. The
`layout.js` and `render.js` facades dispatch into these objects — they contain almost
no per-component logic. An element defines exactly one of:

- `layoutSpec(node) -> {axis, pad?, gap?, cols?}` → it's a **container**
- `intrinsic(node) -> {w, h}` → it's a **leaf**

…plus optional `render(node, box) -> string`, `block`, `aspect`, `flex`, `minSize`.
The full contract (with minimal leaf/container examples) is documented at the top of
`src/elements/common.js` — **read it before adding or changing a component.**

To add a component: create `src/elements/<Name>.js`, then add it to the `ELEMENTS`
array in `src/elements/index.js`. `registry.js` indexes that array by name and merges
in the universal props.

### Two registries that are NOT the same

- **`src/elements/*` + `src/registry.js`** = what is actually *implemented* (the v0.1
  set plus a few v1.0 components used by worked examples).
- **`meta/element-specs.json`** = the hand-maintained *full* component/property
  coverage matrix (the whole intended MUI surface). It is the single source of truth
  for `docs/reference/components.md`, which `scripts/generate-reference.mjs` generates.
  **Never edit that generated markdown by hand** — change the JSON and rerun
  `npm run docs:reference`. The Docusaurus build does this automatically via its
  `prebuild` hook.

### The SPEC

Code and tests cite the language spec as `SPEC ss.3.2.2`, `CONVENTION s.7`, etc. That
canonical spec is **external and not committed to this repo** (the only spec-shaped
file here is `meta/element-specs.json`, which is the coverage matrix, not the spec).
The prose language docs live in `docs/guides/01..08`. Treat those section numbers as
authoritative intent even though you can't open the file.

## Conventions that span files

- **Universal props.** `to=` (with `href=` as an alias) is injected onto *every*
  element by `registry.js` — elements must NOT redeclare it. `flow.js` reads
  `props.to`; `render.js` wraps any `to=`-bearing node in an `<a>`, so elements never
  draw their own links.
- **Keyless resolution can't collide** (enforced by a test): at most one string
  literal, at most one enum, sizing as its own category. In `resolve.js`, a bare token
  is tried as sizing → filler → keyless enum → boolean flag, in that order.
- **Aliases** (`gap`→`spacing`, `w`→`width`, …) are declared per-prop and mapped to
  the canonical name by the resolver.
- **Leaf modules avoid import cycles.** `common.js`, `metrics.js`, and `draw.js` import
  nothing else from core, so every element can depend on them freely. All numeric
  layout/text constants live in `metrics.js`.
- **All drawing goes through `draw.js`** (`surface`, `centeredLabel`, `rrect`,
  `rcrossbox`, `rline`, …). No element touches `roughjs` directly. Seeds are derived
  from geometry so SVG output is deterministic across runs.
- **Two failure modes** (`errors.js`): hard `WiremarkError` is thrown for
  author-must-fix structural problems (tabs in indentation, unquoted text, unknown
  component); soft `Diagnostic` warnings are collected and returned alongside output,
  and rendering degrades gracefully (e.g. a missing `background=#id` target).

## Tests

Node's built-in runner, no test deps. Per-element behavior lives in
`test/elements/<Name>.test.js`; `test/smoke.test.js` exercises the whole pipeline
against `test/fixtures/*.wiremark`. Tests assert at the parse, layout, and render
levels — when changing a stage, check assertions across all three.

## Releasing

`packages/core` (`@wiremark/core`) and `packages/cli` (`@wiremark/cli`) publish to npm
via the **Publish to npm** workflow (`.github/workflows/release.yml`), which uses OIDC
trusted publishing (no tokens) and publishes core first, then cli (cli depends on
core). To release: bump `version` in **both** `packages/core/package.json` and
`packages/cli/package.json` — and the `@wiremark/core` dependency pin in
`packages/cli/package.json` — to the same value, push to `main`, then publish a GitHub
Release whose tag matches the version (e.g. `v0.2.0`). Published versions are read from
each `package.json`, so they must not already exist on npm.

The first publish of each package is manual (`npm publish --access public` from the
package dir): OIDC trusted publishing requires the package to already exist with a
Trusted Publisher configured, so CI can only take over from the second release on.
