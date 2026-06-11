# Text & filler

Wireframing should be fast, so in wiremark **text is opt-in**. You can write the
real words when they matter, or let the renderer generate placeholder **filler**
when they do not — and control how much filler and in what style.

## Real text

To draw specific text, give a quoted literal. On a text-bearing component it
resolves to the label/content:

```wireframe
Typography h4 "Sign in"
Button "Save" primary
ListItem "Settings" to=#settings
```

Quoting is mandatory for text (see [the quoting rule](03-syntax-and-structure.md#the-quoting-rule)).

Text that would overflow its box is trimmed with a trailing `…` — give the
element (or its container) more width to show the full string.

## Filler: when the words do not matter yet

Omit the text and a text-bearing component draws placeholder filler at the
variant's size. This is the fastest way to block out a screen:

```wireframe
Typography h3        // a heading-sized line of filler
Typography           // one body-sized line of filler
```

| Written                  | Result                                            |
|--------------------------|---------------------------------------------------|
| `Typography`             | One line of filler at the variant's default size. |
| `Typography "Real text"` | Exactly that text.                                |
| `Typography ~3`          | About 3 lines/sentences of filler.                |
| `Typography ~5w`         | About 5 words of filler (good for headings).      |
| `Typography ~2l`         | About 2 lines of filler (explicit line unit).     |
| `Typography ___`         | Coarse visual hint: `_` short, `__` medium, `___` long. |

## Filler amount: `~N[unit]`

The precise control is `~N` with an optional unit suffix:

- `~N` — N units (sentences/lines, scaled to the variant).
- `~Nw` — N words.
- `~Nl` — N lines.

```wireframe
Stack column
  Typography h4 ~4w        // a ~4-word heading
  Typography ~2            // ~2 sentences of body
  Typography ~3l           // ~3 lines
```

When a specific length matters, prefer `~Nw` / `~Nl`.

## Underscore shorthand

A run of underscores is a lazy, *visual* length hint — the source roughly "looks
like" the length it produces:

```wireframe
Stack column
  Typography h5 __         // medium-length heading
  Typography ___           // long line of body filler
```

It maps to coarse buckets (`_` short, `__` medium, `___` long). Use `~N` when you
need precision.

## Filler style: `filler=`

`filler=` sets the *visual style* of generated filler. It comes in three styles:

- `squiggle` — faux-handwritten lines (the Balsamiq look).
- `lorem` — lorem-ipsum-style real-ish words.
- `blocks` — grey bars.

You can set it at two levels.

**Frame-level** — the default for the whole frame, on the `Wireframe` root:

```wireframe
Wireframe #screen filler=squiggle
  Typography h3
  Typography
```

**Per-element** — overrides the frame default for one element. Any
text-displaying component (`Typography`, a `TextField` value, `Link`, `Chip`,
`ListItem`, ...) may carry its own `filler=`:

```wireframe
Wireframe #screen filler=squiggle
  Typography h3                 // squiggle (inherits the frame default)
  Typography body1 filler=lorem // lorem (local override)
  TextField "Notes" filler=blocks
```

**Precedence:** an element's own `filler=` wins over the frame default; if
neither is set, the renderer's own default applies.

> `filler=` controls *style only*. The *amount* of filler is still the `~N` /
> underscore mechanism above. The two are independent: `Typography ~3 filler=lorem`
> is three sentences, drawn in the lorem style.
>
> Note also that `filler=` is **not** theming — it shapes placeholder content,
> not the look of the wireframe. wiremark has no `style=`/`sx=`; hand-drawn is
> the one render model.

## Which components take filler

Any text-bearing element: `Typography`, `Button` (its label), `TextField` (label
and value), `Link`, `Chip`, `ListItem`, and similar. Non-text elements (`Box`,
`Divider`, `Img`, `Checkbox`, ...) do not. The
[component reference](../reference/components.md) notes filler behavior per
component.

Next: [Frames, anchors & flow](06-frames-and-flow.md).
