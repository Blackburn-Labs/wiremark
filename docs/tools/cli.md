# Rendering to SVG with the CLI

The guides describe what happens inside a ` ```wireframe ` block, with a host
(Obsidian, markdown-it, the editor, ...) doing the rendering. The simplest host
of all is the command line: `@wiremark/cli` turns a `.wiremark` file into a
standalone SVG. Use it to check a wireframe without opening an editor, to
commit rendered images next to their source, or to wire wiremark into a build
script.

## The `.wiremark` file

A `.wiremark` file holds exactly what you would put *inside* the fence — bare
wireframe source, no markdown and no fence:

```wireframe
Wireframe #login mobile
  Stack column gap=2
    Typography h4 "Sign in"
    TextField "Email" type=email
    TextField "Password" type=password
    Button "Sign in" contained to=#dashboard
```

Save that as `login.wiremark`. Each input file renders to one SVG — a file
holding several frames renders them together as a single flow-chart SVG.

## One-off rendering with npx

With Node.js 18 or newer, no install is needed:

```sh
npx @wiremark/cli login.wiremark
```

This writes `login.svg` next to the input (same name, `.svg` extension) and
prints the path it wrote. To choose the output path yourself, pass `-o`:

```sh
npx @wiremark/cli login.wiremark -o assets/login.svg
```

## Rendering many files

Every positional argument is an input, so the shell's glob expansion renders
a whole directory in one go:

```sh
npx @wiremark/cli screens/*.wiremark
```

Each input writes its own `<name>.svg` next to its source. To collect the
SVGs somewhere else, pass `-d`/`--out-dir`, which is created if missing:

```sh
npx @wiremark/cli screens/*.wiremark -d build/wireframes
```

(`-o` names a single output file, so it works with a single input only — use
`-d` for many.) A failing input doesn't stop the others: every file is
processed, failures are reported per file, and the exit code is non-zero if
any input failed. If two inputs would write to the same output — say
`a/login.wiremark` and `b/login.wiremark` with one `--out-dir` — the CLI
refuses up front, before writing anything.

One caveat for Windows users: `cmd.exe` and PowerShell don't expand `*`
wildcards for programs, and wiremark deliberately doesn't either — globs are
the shell's job. Use Git Bash (or another POSIX shell), or list the files
explicitly.

## Installing the CLI

For regular use, install the package globally; it provides a `wiremark`
command (`wiremark --help` prints usage):

```sh
npm install -g @wiremark/cli
wiremark login.wiremark -o login.svg
```

Or add it to a project as a dev dependency and call it from an npm script —
handy when wireframes are part of a docs build:

```sh
npm install --save-dev @wiremark/cli
```

```json
{
  "scripts": {
    "wireframes": "wiremark docs/wireframes/*.wiremark -d docs/img"
  }
}
```

## Errors and warnings

The CLI follows the language's two failure modes:

- **Hard errors** — structural problems you must fix, such as tabs in
  indentation, an unquoted text literal, or an unknown component — print to
  stderr and exit non-zero. No SVG is written.
- **Soft warnings** — recoverable issues, such as a `background=#id` that
  points at a frame that doesn't exist — also print to stderr, but the SVG is
  still written, rendered with a graceful fallback.

With several inputs, every file is processed even when one fails, and each
error or warning line is prefixed with the file it came from. So an exit code
of 0 means "every input produced an SVG", even if warnings were printed along
the way.

## Output is deterministic

The hand-drawn wobble is seeded from the geometry itself, so rendering the
same source always produces byte-identical SVG. Re-render freely: a committed
`.svg` only changes in version control when its `.wiremark` source (or
wiremark itself) actually changed.
