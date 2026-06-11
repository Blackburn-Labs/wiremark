# @wiremark/cli

Command-line renderer for [wiremark](https://wiremark.dev) — turn a `.wiremark`
file into a hand-drawn SVG.

```sh
npx @wiremark/cli in.wiremark -o out.svg
```

With no `-o`, each SVG is written next to its input (same basename). Multiple
inputs (e.g. a shell glob like `*.wiremark`) each render to their own SVG —
pass `-d`/`--out-dir` to collect them in one directory. It's a thin wrapper
over [`@wiremark/core`](https://www.npmjs.com/package/@wiremark/core) — all
parsing, layout, and rendering live there.

## Usage

```
wiremark <input.wiremark...> [-o out.svg | -d out-dir] [--icons icon-dir]

  -o, --out <file>     output path (exactly one input)
  -d, --out-dir <dir>  write each <input>.svg into <dir>, created if missing
  --icons <dir>        register every <name>.svg in <dir> as a custom icon "name"
```

Custom icon files are resolved by the CLI: `--icons <dir>` injects a directory
of SVGs, and `Icons`-block `src=./logo.svg` entries load relative to their
input file. Built-in Material icon names need nothing.

Run on demand with `npx @wiremark/cli …`, or install globally for a `wiremark`
command:

```sh
npm install -g @wiremark/cli
wiremark in.wiremark -o out.svg
```

Hard parse errors print to stderr and exit non-zero; soft diagnostics print but
still produce output. With several inputs, every file is processed even when
some fail — the exit code is non-zero if any input failed.
