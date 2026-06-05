# Style & best practices

The grammar is permissive — order is mostly free, detail is optional, defaults
fill the gaps. These conventions keep your wireframes readable and make the most
of the format. None of them are enforced by the parser; they are habits worth
forming.

## Lean on defaults

The fastest wireframe is the one you barely write. Start with bare component
names and add detail only where it changes the meaning of the sketch.

```wireframe
// Enough to communicate the layout:
Card
  Typography h3
  Img
  Typography ~2
```

Reserve real text for the words that matter — a screen title, a primary button,
a key label — and let filler stand in for the rest.

## Pick a token order and keep it

Because keyless properties are order-free, a team can drift into writing the same
component three different ways. Choose one convention and apply it everywhere.
A common, readable choice is **variant/flags first, the text literal last**:

```wireframe
Typography h6 "Acme"
Button primary "Save"
TextField outlined "Email"
```

The rule matters less than the consistency. Pick one; stick to it.

## Use filler amounts to show hierarchy

Filler is not just a placeholder — its *length* communicates. A short heading and
a long paragraph read as exactly that, even with no real words:

```wireframe
Stack col gap=1
  Typography h4 ~3w      // a short title
  Typography ~4          // a substantial body block
  Typography caption ~6w // a one-line caption
```

Match the filler to the real content's shape and the wireframe tells the story.

## Name frames, and link with intent

Give every frame a meaningful `#id`, and add `to=#id` wherever a real user would
navigate. The payoff is the inferred flow graph (see
[Frames, anchors & flow](06-frames-and-flow.md)): a few `to=` links turn a pile
of screens into a navigable map for free.

```wireframe
Button "Continue" primary to=#checkout
ListItem "Order history" to=#orders
```

## Factor shared chrome once

If two or more screens repeat an app bar, nav rail, or footer, lift it into a
`visible=false` frame and pull it in with `background=#id`. One edit updates
every screen, and each screen's source shows only what is unique to it.

## Keep the indentation clean

Indentation is the whole structure, so treat it with care:

- **Spaces only, never tabs.**
- **Two spaces per level**, consistently.
- Let the indentation mirror the visual nesting — if it is hard to read as text,
  it will be hard to read as a screen.

## Writing for (and as) an agent

wiremark is designed to be easy for LLMs, and the same habits help humans:

- **Use the obvious MUI name.** If you would use `Card` in MUI, use `Card` here.
  Do not invent components; check the [reference](../reference/components.md) if
  unsure.
- **Do not over-specify.** Every extra prop is a token and a decision. Omit
  anything the default already handles.
- **Prefer precise filler** (`~Nw`, `~Nl`) when length carries meaning, so the
  intent survives a re-render.

## Common mistakes

| Mistake                                   | Fix                                                            |
|-------------------------------------------|----------------------------------------------------------------|
| `TextField Email` (bare text)             | Quote text literals: `TextField "Email"`.                      |
| A quoted string on its own line           | Wrap it in an owner: `Typography "..."`. No bare text nodes.   |
| Indenting with tabs                       | Use spaces only; two per level.                                |
| `to=#dashboard.settings` (deep link)      | Target frames only: `to=#settings`.                            |
| Reaching for `style=` / `sx=` / colors    | Out of scope — hand-drawn is the only render model.            |
| Restating a layout for phone vs. desktop  | No breakpoints; one frame is one screen at one size.           |
| Reading sizing as height-then-width       | Sizing is always `width height`: `Box 240px *`.                |

## What is out of scope

So you do not go looking for them:

- **Theming** — no `style=`, `sx=`, colors, or elevation. Hand-drawn is the
  render model, not one theme among many.
- **Responsive / breakpoints** — a frame is a single screen at a single size.
- **Deep links** — `to=` reaches frames, not elements within them.
