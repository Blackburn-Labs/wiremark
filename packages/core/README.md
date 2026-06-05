# wiremark (core)

The pure-JS core of [wiremark](../../README.md): it turns wiremark **source**
(the text inside a ` ```wireframe ` block) into a hand-drawn SVG, plus the parsed
document and the navigation graph inferred from `to=#id` links.

Core knows nothing about markdown -- finding the fenced block is a host
adapter's job. It has no host dependencies.

## Pipeline

```
source --lex--> tokens --tree--> raw tree --resolve--> Document
       --layout--> boxes --render--> SVG
                       \--flow--> navigation graph
```

| Stage | File | Status |
|-------|------|--------|
| (1) lex      | `src/lexer.js`    | stub |
| (2) tree     | `src/tree.js`     | stub |
| (3) resolve  | `src/resolve.js`     | stub |
| registry     | `src/elements/*`     | v0.1 set authored |
| (4) layout   | `src/layout.js`      | stub |
| (5) render   | `src/render.js`      | stub |
| flow         | `src/flow.js`        | stub |

Each component is defined in its own file under `src/elements/`
(`Button.js`, `Card.js`, ...) so everything about an element -- its schema now,
its measure/render functions later -- lives in one place. `src/registry.js`
indexes them by name. Full MUI coverage is tracked in
[`meta/mui-support-matrix.json`](../../meta/mui-support-matrix.json).

## API (intended)

```js
import { parse, render, toMermaid } from 'wiremark';

const { svg } = render(source);     // wiremark source -> SVG
const doc = parse(source);          // -> { frames, diagnostics }
const mermaid = toMermaid(doc);     // -> inferred flow as a Mermaid flowchart
```

## Test

```sh
node --test test/
```

Uses Node's built-in test runner -- no dependencies.
