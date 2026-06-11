# Wiremark Core

[![npm version](https://img.shields.io/npm/v/@wiremark/core)](https://www.npmjs.com/package/@wiremark/core)
[![license](https://img.shields.io/npm/l/@wiremark/core)](https://github.com/Blackburn-Labs/wiremark/blob/main/packages/core/LICENSE)
[![node](https://img.shields.io/node/v/@wiremark/core)](https://www.npmjs.com/package/@wiremark/core)

![wiremark](https://wiremark.dev/wiremark-icon.svg)

**wiremark** is a text-based, markdown-embeddable wireframing format — think
"YAML-flavored, [MUI](https://mui.com/)-inspired": a hierarchy of familiar
component names, indented to show containment, rendered as a hand-drawn
(Balsamiq-style) SVG. A wireframe lives inside a fenced ` ```wireframe ` block:

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

`@wiremark/core` is the engine behind that block: the parser, layout solver,
and SVG renderer, in pure JavaScript.

Full language documentation — guides, the component reference, and the icon
gallery — lives at **[docs.wiremark.dev](https://docs.wiremark.dev/)**.

## Do you need this package?

wiremark is normally used through a host tool that finds the ` ```wireframe `
block for you. The first of these is
[`@wiremark/cli`](https://www.npmjs.com/package/@wiremark/cli), which renders
`.wiremark` files to SVG from the command line; adapters for specific tools
(markdown renderers, editors, and more) are forthcoming, and we'll keep adding
them as best we can.

Use `@wiremark/core` directly when you want to add wiremark to your **own**
markdown renderer, editor, or pipeline. Core knows nothing about markdown:
your adapter finds the fenced block, hands the text inside it to core, and
gets back an SVG. The CLI is a worked example of exactly that — its
[source](https://github.com/Blackburn-Labs/wiremark/tree/main/packages/cli)
is a thin wrapper over this package.

## Install

```sh
npm install @wiremark/core
```

## Usage

```js
import { render } from '@wiremark/core';

const { svg, diagnostics } = render(source); // source = the text inside the fence
```

`render` takes wiremark source and returns the SVG as a string. Structural
problems the author must fix (tabs in indentation, unknown components,
unquoted text) throw a `WiremarkError`; anything softer (an unknown icon name,
a missing link target) degrades gracefully and is reported in `diagnostics`.

The other entry points:

```js
import { parse, toFlowGraph, toMermaid } from '@wiremark/core';

const doc = parse(source);      // validated document: frames + diagnostics
const graph = toFlowGraph(doc); // navigation graph inferred from to=#id links
const mermaid = toMermaid(doc); // the same graph, as a Mermaid flowchart
```

`render` also accepts an already-`parse`d document, and a file with several
frames renders as a flow chart with frame-to-frame connectors.

Icon props accept [built-in Material icon names](https://docs.wiremark.dev/reference/icons)
out of the box. To add your own, pass `icons` (a flat name-to-SVG map or
Iconify icon packs) or a `loadIcon` callback in the options to `render`/`parse`
— see the [icons guide](https://docs.wiremark.dev/guides/icons).

## Browser bundle

The package also ships a self-contained, dependency-free IIFE build for
script-tag and webview embedders (IDE preview panels, browser extensions),
exposing the same API as a `wiremark` global:

```html
<script src="wiremark.browser.js"></script>
<script>
  const { svg, diagnostics } = wiremark.render(source);
</script>
```

From Node tooling, resolve its path with
`require.resolve('@wiremark/core/browser')` (it lives at
`dist/wiremark.browser.js` inside the package). It needs no DOM — rendering is
pure string-in, string-out.

## Good to know

- Pure ESM, Node >= 18.
- One runtime dependency ([roughjs](https://roughjs.com/), for the hand-drawn look).
- Deterministic output: the same source always renders the same SVG, so it's
  diff- and cache-friendly.

## Links

- [Documentation](https://docs.wiremark.dev/)
- [Component reference](https://docs.wiremark.dev/reference/components)
- [GitHub](https://github.com/Blackburn-Labs/wiremark)
- [`@wiremark/cli`](https://www.npmjs.com/package/@wiremark/cli)
