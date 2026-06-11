# Patterns & recipes

A gallery of common screens, each a complete wireframe you can copy and adapt.
They combine everything from the earlier guides — containers, sizing, text,
filler, anchors, and flow.

## Sign-in screen

A heavily-defaulted login: a column of fields, a "remember me" row, a primary
action that navigates, and some filler below.

```wireframe
Wireframe #login mobile
  Stack column gap=2
    Typography h4 "Sign in"
    TextField "Email" type=email
    TextField "Password" type=password
    Stack row
      Checkbox
      Typography body "Remember me"
      Spacer
      Link "Forgot?" to=#reset
    Button "Sign in" primary to=#dashboard
    Divider
    Typography ~2
```

Techniques: a `Stack column` for the form; a nested `Stack row` with a `Spacer` to
push the link to the right; `to=#…` links that seed the navigation graph; a
bare `Typography ~2` for two lines of placeholder fine print.

## Dashboard: header, nav rail, card grid

The canonical app layout — an `AppBar` across the top, a fixed-width nav rail,
and a three-up card grid filling the rest.

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
          Typography h3 "Card 1"
          Img
          Typography
        Card
          Typography h3 "Card 2"
          Img
          Typography
        Card
          Typography h3 "Card 3"
          Img
          Typography
```

Techniques: sizing apportions the screen (`240px` rail, `*` content); each
`ListItem` links to a frame; each `Card` flattens its children into an implicit
body (no need for explicit `CardContent`).

## Shared chrome with `background=`

When several screens share the same shell, author it once and compose it under
each screen. Put both frames in the document (here, two blocks):

````markdown
```wireframe
Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Typography h6 "Acme"
  Box 240px *
    List
      ListItem "Home" to=#home
      ListItem "Reports" to=#reports
      ListItem "Settings" to=#settings
```
````

````markdown
```wireframe
Wireframe #reports landscape background=#shell
  Stack column gap=2
    Typography h4 "Reports"
    Grid cols=2 gap=2
      Card
      Card
```
````

`#shell` is `visible=false`, so it never draws on its own — but `#reports` pulls
it in as a background and renders its own content on top. See
[Frames, anchors & flow](06-frames-and-flow.md) for the full rules.

## Product card with explicit sub-parts

When you want control over a card's regions, use explicit `CardMedia`,
`CardContent`, and `CardActions` children instead of relying on flattening.

```wireframe
Wireframe #product
  Card
    CardMedia
      Img ratio=16:9
    CardContent
      Typography h5 "Product name"
      Typography ~2
    CardActions
      Button "Buy" primary
      Button "Details" variant=outlined to=#detail
```

Techniques: `Img ratio=16:9` sets the media aspect ratio; `~2` fills the body
with two sentences; the actions row mixes a primary and an outlined button, the
latter linking onward.

## A form

Forms are just a `Stack column` of inputs. Use `value=` to show a filled-in field,
`required` to flag required ones, and `multiline` for text areas.

```wireframe
Wireframe #new-account mobile
  Stack column gap=2
    Typography h4 "Create account"
    TextField "Full name" required
    TextField "Email" type=email required value="you@example.com"
    TextField "Password" type=password required
    TextField "Bio" multiline filler=blocks
    Stack row
      Checkbox checked
      Typography body "I agree to the terms"
    Button "Create account" primary to=#welcome
```

## A settings list

`List` of `ListItem`s makes a navigable menu; each item can link to its own
screen.

```wireframe
Wireframe #settings mobile
  Stack column
    AppBar
      Toolbar
        Typography h6 "Settings"
    List
      ListItem "Profile" to=#profile
      ListItem "Notifications" to=#notifications
      ListItem "Privacy" to=#privacy
      ListItem "About" to=#about
```

## Where to go next

- Tighten your style with the [style guide](08-style-guide.md).
- Look up any component in the [reference](../reference/components.md).
