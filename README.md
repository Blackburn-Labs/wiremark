# wiremark

A text-based, markdown-embeddable wireframing format. Inspired by **YAML's
simplicity** and **[MUI](https://mui.com/)'s readability**: a hierarchy of
familiar Material UI component names, indented to show containment, rendered
in a hand-drawn (Balsamiq-like) style.

wiremark is **agent-first** — designed to be trivial for an LLM to read, write,
and reason about — while embedding cleanly in markdown the way Mermaid does.

**Site:** [wiremark.dev](https://wiremark.dev/) ·
**Docs:** [docs.wiremark.dev](https://docs.wiremark.dev/)

## Example

A wireframe lives inside a fenced ` ```wireframe ` block:

````markdown
```wireframe
Wireframe mobile
  Stack column gap=2
    Typography h4 "Sign in"
    TextField "Email"
    TextField "Password"
    Button "Sign in" contained to=#dashboard
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
docs/           # portable Markdown language docs (guides + generated reference)
site/           # Docusaurus app that serves docs/ at https://docs.wiremark.dev/
meta/           # element-specs.json -- component coverage matrix (hand-maintained)
RELEASING.md    # how @wiremark/core and @wiremark/cli get published to npm
```

- **core** turns wiremark source — the text inside a ` ```wireframe ` block —
  into SVG; it knows nothing about markdown.
- **adapters** find the fenced block in a host document and hand its contents to
  core.
- the **editor** (a PWA WYSIWYG authoring tool) is a separate repo that consumes
  `core` as a dependency.

## Docs

[![Netlify Status](https://api.netlify.com/api/v1/badges/8a2a5f41-bd79-4cbe-840f-4d25ea8278d9/deploy-status)](https://app.netlify.com/projects/wiremark-docs/deploys)

The language documentation is portable Markdown in `docs/`, served by the
Docusaurus app in `site/` and published at
[docs.wiremark.dev](https://docs.wiremark.dev/).

- **Guides** (`docs/guides/`) are written by hand.
- The **component reference** (`docs/reference/components.md`) is **generated**
  from `meta/element-specs.json` by `npm run docs:reference` — never edit it by
  hand; change the JSON and regenerate. The site's `prestart`/`prebuild` hooks
  run the generator automatically, so the published reference always matches the
  source of truth.
- **Publishing** is handled by Netlify (`netlify.toml`): every push to `main`
  triggers a build of `site/`, but the deploy is skipped unless something the
  site actually consumes changed (`site/`, `docs/`, `meta/`, the generator
  script, or the Netlify config). Commits touching only `packages/*` never
  redeploy the docs.
