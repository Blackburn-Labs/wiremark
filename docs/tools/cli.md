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
  Stack col gap=2
    Typography h4 "Sign in"
    TextField "Email" type=email
    TextField "Password" type=password
    Button "Sign in" primary to=#dashboard
```

Save that as `login.wiremark`. As everywhere in v0.1, one file holds one
`Wireframe` frame, so one file renders to one SVG.

## One-off rendering with npx

With Node.js 18 or newer, no install is needed:

```sh
npx @wiremark/cli login.wiremark
```

This writes `login.svg` next to the input (same name, `.svg` extension) and
prints the path it wrote. To choose the output path yourself, pass it as a
second argument or with `-o`:

```sh
npx @wiremark/cli login.wiremark -o assets/login.svg
```

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
    "wireframes": "wiremark docs/login.wiremark -o docs/img/login.svg"
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

So an exit code of 0 means "an SVG was produced", even if warnings were
printed along the way.

## Output is deterministic

The hand-drawn wobble is seeded from the geometry itself, so rendering the
same source always produces byte-identical SVG. Re-render freely: a committed
`.svg` only changes in version control when its `.wiremark` source (or
wiremark itself) actually changed.
