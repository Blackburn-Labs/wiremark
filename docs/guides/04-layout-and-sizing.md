# Layout & sizing

Layout in wiremark is expressed two ways: **containers** that arrange their
children, and **sizing tokens** that say how much space an element takes. There
is no x/y positioning — you nest and size, and the renderer lays things out.

## Layout components

| Component   | What it does                                                        |
|-------------|---------------------------------------------------------------------|
| `Stack`     | Arranges children in a line. `Stack row` or `Stack col` (default `col`). Gap with `gap=`. |
| `Box`       | A generic sized container. Its keyless tokens are `width height`.    |
| `Grid`      | A uniform grid; children flow into cells. `cols=` sets columns, `gap=` the spacing. |
| `Container` | A centered, max-width wrapper. `max=` sets the width.                |
| `Spacer`    | A flexible gap that pushes siblings apart.                          |
| `Anchor`    | An invisible, named region a foreground frame can compose into — see [Frames & flow](06-frames-and-flow.md#anchor-points). |
| `Divider`   | A plain horizontal rule. No properties.                            |

`Stack` is the workhorse. Reach for it whenever you want things in a row or a
column:

```wireframe
Stack row gap=2
  Button "Cancel"
  Button "Save" primary
```

```wireframe
Stack col gap=2
  TextField "Email"
  TextField "Password" type=password
  Button "Sign in" primary
```

`Grid` handles repeating cells — a card gallery, a stat row:

```wireframe
Grid cols=3 gap=2
  Card
  Card
  Card
```

## Sizing tokens

Any sizable element can take sizing tokens. They are **always written
`width height`, in that order** — regardless of the parent or its direction.
This predictability is deliberate: there is no main-axis / cross-axis model to
track. Width first, height second, every time.

```wireframe
Box 240px *      // 240px wide, fill available height
Box 100% 30%     // full width, 30% of available height
Box * *          // fill both axes
Box 2            // flex weight 2 (see below)
```

### Value types

| Form     | Meaning                                                      |
|----------|--------------------------------------------------------------|
| `240px`  | Absolute pixels.                                             |
| `30%`    | Percent of the available space on that axis.                |
| `*`      | Fill the available space on that axis.                      |
| `N`      | A bare number is a **flex weight** — a proportional share.  |

> Sizing is the one place a bare number is allowed as a keyless value (as a flex
> weight). Everywhere else, numbers must be keyed.

### Sizing is the one order-sensitive exception

Everywhere else in wiremark, property order is free. Sizing is the exception:
the two tokens are positional (`width` then `height`). Other keyless properties
on the same line stay order-free relative to the sizing pair — only the two
sizing tokens are ordered among themselves.

If you give **one** sizing value, it applies to the container's main axis and the
cross axis defaults to `*`. If you give **none**, the element uses its natural
content size.

## Flex weight

A bare number distributes space proportionally among flexed siblings, like CSS
`fr` units or MUI's `flex`:

```wireframe
Stack row
  Box 1     // 1/3 of the row width
  Box 2     // 2/3 of the row width
```

## Putting it together: an app shell

Layout components nest to build real screens. Here is the classic
header + left-nav + content body, using sizing to apportion space:

```wireframe
Wireframe #dashboard landscape
  AppBar
    Toolbar
      Typography h6 "Acme"
  Stack row 100% *
    Box 240px *
      List
        ListItem "Home" to=#home
        ListItem "Reports" to=#reports
        ListItem "Settings" to=#settings
    Box * *
      Grid cols=3 gap=2
        Card
        Card
        Card
```

Reading the sizing:

- `Stack row 100% *` — the content row fills the width and takes the remaining
  height under the app bar.
- `Box 240px *` — a fixed-width nav rail, full height.
- `Box * *` — the main area fills whatever is left.
- The `Grid cols=3` flows its cards into three columns.

To reuse this shell across screens, swap the content `Box * *` for an
`Anchor #content` region and compose each screen into it with
`background=`/`anchor=` — see
[Frames & flow](06-frames-and-flow.md#anchor-points).

For the full set of patterns built this way, see
[Patterns & recipes](07-patterns.md).

Next: [Text & filler](05-text-and-filler.md).
