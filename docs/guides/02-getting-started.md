# Getting started

This guide walks you from an empty code block to a small two-screen flow,
explaining each piece as it appears.

## The block

A wireframe lives inside a fenced code block tagged `wireframe`. In your markdown
document you write:

````markdown
```wireframe
Wireframe #home mobile
  Typography h4 "Hello"
```
````

The host adapter (Obsidian, markdown-it, the editor, ...) spots that block and
hands its contents to the wiremark core, which draws it. No host handy? The
[command-line renderer](../tools/cli.md) turns a file of wireframe source
straight into an SVG. From here on we show just the wireframe source — the
part *inside* the fence — and assume the fence around it.

> **One frame per block.** In v0.1 each block holds exactly one `Wireframe`.
> That keeps every block independently renderable. To draw several screens, use
> several blocks and link them by `#id` (covered below).

## Your first frame

Every wireframe begins with a `Wireframe` root line, optionally named and sized:

```wireframe
Wireframe #home mobile
  Typography h4 "Hello"
  Typography "Welcome back"
```

- `Wireframe` is the frame root. Everything indented under it is on the screen.
- `#home` names this frame so other frames can link to it. The name is optional
  but cheap, and you will usually want it.
- `mobile` is a size preset (others: `landscape`, `portrait`; or set `w=`/`h=`
  explicitly).
- The two `Typography` lines are children of the frame, because they are
  indented one level under it. The first is an `h4` heading reading "Hello"; the
  second is body text reading "Welcome back".

## Anatomy of a line

Every line follows the same shape:

```
<indentation> Component [ property ]*
```

Take this line:

```wireframe
TextField "Email" type=email required
```

- `TextField` — the **component name** (always PascalCase, like in MUI).
- `"Email"` — a **keyless property**: a quoted text literal. wiremark resolves
  it to the field's `label`, so this is the field labelled "Email".
- `type=email` — a **keyed property**, written `key=value`.
- `required` — a **boolean flag**, a bare word that switches a property on.

The indentation in front of the component name is what makes it a child of the
line above. That is the entire structural grammar; the next guide,
[Syntax & structure](03-syntax-and-structure.md), covers it precisely.

## Let defaults do the work

You rarely need to spell everything out. A bare component name renders a
sensible default:

```wireframe
Wireframe #card-demo
  Card
    Typography h3 "Title"
    Img
    Typography
```

- `Img` with no properties draws a placeholder image box.
- The final bare `Typography` draws a line of placeholder **filler** text — handy
  when the exact words do not matter yet. (See [Text & filler](05-text-and-filler.md).)
- `Card` with no explicit `CardContent`/`CardMedia`/`CardActions` children simply
  treats everything inside it as its body.

Start sparse. Add detail only where it communicates something.

## Add a second screen and link it

Wireframes become flows when one screen points at another. Name each frame, then
point at it with `to=#id`:

````markdown
```wireframe
Wireframe #login mobile
  Stack col gap=2
    Typography h4 "Sign in"
    TextField "Email" type=email
    TextField "Password" type=password
    Button "Sign in" primary to=#dashboard
```
````

````markdown
```wireframe
Wireframe #dashboard landscape
  AppBar
    Toolbar
      Typography h6 "Acme"
  Typography h4 "Welcome"
```
````

The `Button` on the login screen carries `to=#dashboard`, so it links to the
dashboard frame. **Any** element can carry `to=` — a button, a list item, even a
whole region — and the renderer reconstructs the screen-to-screen navigation
graph from those links automatically. No separate flowchart to maintain.

## What you now know

- A wireframe is one `Wireframe` per ` ```wireframe ` block.
- Lines are `Component` plus optional properties; indentation nests them.
- Bare components render useful defaults.
- `#id` names a frame and `to=#id` links to it.

Next: [Syntax & structure](03-syntax-and-structure.md) for the precise rules
behind quoting, keyed vs. keyless properties, and indentation.
