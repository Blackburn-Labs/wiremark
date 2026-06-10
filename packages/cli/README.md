# @wiremark/cli

Command-line renderer for [wiremark](https://wiremark.dev) — turn a `.wiremark`
file into a hand-drawn SVG.

```sh
npx @wiremark/cli in.wiremark -o out.svg
```

With no `-o`, the SVG is written next to the input (same basename). It's a thin
wrapper over [`@wiremark/core`](https://www.npmjs.com/package/@wiremark/core) —
all parsing, layout, and rendering live there.

## Usage

```
wiremark <in.wiremark> [out.svg]      # also: -o out.svg
```

Run on demand with `npx @wiremark/cli …`, or install globally for a `wiremark`
command:

```sh
npm install -g @wiremark/cli
wiremark in.wiremark -o out.svg
```

Hard parse errors print to stderr and exit non-zero; soft diagnostics print but
still produce output.
