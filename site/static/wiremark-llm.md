# wiremark: instructions for LLM agents

You are reading or writing **wiremark**, a plain-text wireframe format. A wireframe
is an indented outline of component names; a renderer turns it into a
hand-drawn (Balsamiq-style) SVG sketch of a screen. In markdown, wireframe source
lives inside a fenced code block tagged `wireframe`; as a standalone file it uses
the `.wiremark` extension (same content, no fence).

This is the full guide: rules, examples, and a condensed component list. A shorter
version without the component list is at
<https://docs.wiremark.dev/wiremark-llm-compact.md>. Human-oriented docs:
<https://docs.wiremark.dev>.

```wireframe
Wireframe #login mobile
  Stack column gap=2
    Typography h4 "Sign in"
    TextField "Email" type=email
    TextField "Password" type=password
    Button "Sign in" contained to=#dashboard
```

That block is a complete, renderable phone-sized sign-in screen: a heading, two
fields, and a primary button that links to a `#dashboard` frame.

## Rules

1. **One line shape, applied recursively.** Every line is
   `Component [keyless-value | key=value]*` -- a PascalCase component name
   (`Stack`, `Card`, `TextField`, ...) followed by properties in any order.
   Many names will feel familiar from UI libraries, but the vocabulary is
   wiremark's own -- use only names from the component list below; do not
   guess or invent.

2. **Indentation is containment.** A line indented under another is its child.
   Two spaces per level, spaces only -- a tab is a hard error. There are no
   braces, fences, or closing tags inside a wireframe.

3. **The quoting rule.** A quoted string is always free-form text that will be
   drawn (a label, a value); quoting it is mandatory. A bare token is never
   drawn text -- it is an enum value (`outlined`), a boolean flag (`checked`),
   a sizing token (`240px`), a number, or an icon name. So `TextField Email`
   is an error; write `TextField "Email"`. The converse holds too: never quote
   an enum or number value -- `variant="outlined"` and `gap="2"` are hard
   errors; write `variant=outlined`, `gap=2`.

4. **No bare text nodes.** A quoted string cannot stand alone on its own line.
   Wrap it in the component that draws it: `Typography "Up 12% this week"`.

5. **Keyless = keyed minus the key.** A keyless value resolves to a property by
   its type or value alone, so these are identical:

   ```
   TextField "Email" outlined
   TextField label="Email" variant=outlined
   ```

   Per component there is at most one keyless text slot (the label), keyless
   enums with disjoint values, plus sizing -- so nothing collides and order is
   free. In the component list below, `*` marks keyless-capable props.

6. **Sizing is `width height`, in that order -- always.** The only
   order-sensitive tokens. Forms: `240px` (pixels), `30%` (percent of available
   space), `*` (fill available space), bare number (flex weight -- proportional
   share, like CSS `fr`). One token sets width only; no tokens means natural
   content size. Only components marked `[w h]` in the list below take sizing
   (`Box`, `Stack`, `Grid`, `Spacer`, `Anchor`, `Card`, `Skeleton`), and only
   as bare tokens -- there is no keyed `width=`/`height=` form.

   ```
   Stack row 100% *      // fill width, take remaining height
     Box 240px *         // fixed 240px-wide rail, full height
     Box * *             // content area fills what is left
   ```

7. **Defaults do the work.** A bare component renders something sensible:
   `Img` a placeholder image, `Card` an empty card, `Button` a button reading
   "Button", `Typography` a placeholder word. Start sparse; add a property
   only when it changes the meaning of the sketch.

8. **Filler: placeholder text on demand.** Components marked `[~]` in the list
   below (`Typography`, `TextField`, `Link`, `ListItem`, `Chip`, `Alert`,
   `Tab`, `TableCell`) draw placeholder filler when you give an **amount
   token** instead of text: `~N` (about N sentences/lines), `~Nw` (N words),
   `~Nl` (N lines), or underscores (`_` short, `__` medium, `___` long).
   `Typography h4 ~3w` is a short heading, `Typography ~2` two sentences of
   body. The style is set with `filler=squiggle|lorem|blocks` on the
   `Wireframe` root for the whole frame, or on elements that list `filler=`
   below.

9. **Comments are `//`** to end of line. `#` is reserved for ids and links.

10. **Frames.** Every top-level line is a `Wireframe` root (the optional
    `Icons` block of rule 13 and the `Flow` directive of rule 11 are the only
    other top-level forms): `Wireframe #id preset key=value...`

    - `#id` names the frame (optional, but needed to link to it).
    - Preset: `mobile`, `landscape`, or `portrait`; or explicit `w=` **and**
      `h=` pixel numbers (give both -- one alone is silently ignored).
    - `filler=squiggle|lorem|blocks` sets the frame-wide filler style.
    - `visible=false` hides a frame that exists only as a shared background.
    - `background=#id`, `anchor=#id` (alias `at=`): see rule 12.
    - The frame lays out its children like a `Stack`: `row` / `column` (keyless,
      default `column`; `direction=` is the keyed form), `gap=`/`spacing=` for the
      inter-child gap, and `padding=`/`pad=` for the edge inset -- both in spacing
      units (x8px) and both **0 by default**, so content is flush unless you ask.

11. **Links and flow.** Every element accepts `to=#frame-id` (alias `href=`),
    which makes that element a clickable link to a frame: `Button "Buy"
    to=#checkout`, `ListItem "Settings" to=#settings`, or a whole region
    (`Card to=#detail`). The navigation graph is inferred entirely from these
    links -- there is no `from`, and `to=` targets whole frames only (never
    elements inside one). Several visible frames in one document arrange
    themselves into a flow chart automatically, with connectors drawn from the
    `to=` links. A `to=` naming a frame that does not exist is accepted
    *silently* -- no connector, no warning -- so double-check frame ids. A
    top-level `Flow LR` directive (its own line, like an `Icons` block; `Flow TD`
    is the default) orients the whole chart left-to-right instead of top-down.

12. **Shared chrome (backgrounds and anchors).** Author a repeated shell (app
    bar, nav rail) once as its own frame with `visible=false`; pull it under
    another frame with `background=#shell`. To place the foreground content
    inside a region of the shell instead of at the top-left, declare an
    invisible region in the shell (`Anchor #content`) and target it from the
    foreground frame (`anchor=#content`). A frame sized by `anchor=` must not
    also carry a preset or `w=`/`h=` (the anchor wins, with a warning). See
    the multi-frame example below.

13. **Icons.** Props typed `I` in the list below take a Material icon name:
    `Icon Search`, `Button "Save" startIcon=Check`, `Fab Add`. About 400
    built-ins ship (the filled Material set, same names as
    `@mui/icons-material`); spelling is forgiving (`ArrowBack` ==
    `arrow_back`). An unknown name renders a placeholder glyph plus a soft
    warning -- never an error. Custom icons: a top-level `Icons` block, each
    entry a name plus quoted SVG path data:

    ```
    Icons
      logo "M12 2 2 22h20z"
    ```

14. **Three failure modes.** *Hard errors* stop the render and must be fixed:
    tabs in indentation, unquoted text, an unknown component or property, an
    invalid or quoted enum value, the same prop set twice (e.g. via both
    `gap=` and `spacing=`). *Soft warnings* still render: a missing
    `background=`/`anchor=` target, an unknown icon. *Silently accepted* --
    no error, no warning, content just missing -- so check these yourself: a
    `to=` link to a nonexistent frame, and children indented under a leaf
    component (anything without `[c]` in the list below drops its subtree).

15. **Out of scope -- do not reach for these.** No styling (`style=`, `sx=`,
    colors, themes -- hand-drawn is the only render model), no responsive
    breakpoints (one frame is one screen at one size), no x/y coordinates
    (nest and size instead), no deep links.

## Common mistakes

| Wrong | Right |
|---|---|
| `TextField Email` | `TextField "Email"` -- drawn text must be quoted |
| `"Some text"` alone on a line | `Typography "Some text"` -- no bare text nodes |
| `variant="outlined"`, `gap="2"` | `variant=outlined`, `gap=2` -- only drawn text takes quotes |
| `Button "Save" primary` | `Button "Save" contained` -- variants are `text\|outlined\|contained` |
| `Typography body "Hi"` | `Typography body1 "Hi"` (or `body2`) |
| `Checkbox` / `Switch` | `Control checkbox` / `Control switch` (add `checked` as needed) |
| `DialogTitle` / `IconButton` / `Container` / `Menu` / `ListItemText` | Only listed components exist: nest content directly under `Dialog`, use a bare `Icon`, `Box`/`Menubar`/a quoted `ListItem` label |
| `TableCell` with `Typography "Name"` nested under it | `TableCell "Name"` -- TableCell is a leaf; its text is the keyless literal |
| `to=#home.section` | `to=#home` -- links target frames only (a deep link is accepted silently and just produces a dead link) |
| `Box * 240px` for a 240px-wide rail | `Box 240px *` -- width first, height second |
| Indenting with tabs | Two spaces per level |

## Worked examples

A form screen -- column layout, input states, a link row built with `Spacer`:

```wireframe
Wireframe #signup mobile
  Stack column gap=2
    Typography h4 "Create account"
    TextField "Full name" required
    TextField "Email" type=email value="you@example.com"
    TextField "Bio" multiline rows=3
    Select "Country"
      Option "United States" selected
      Option "Canada"
    Stack row
      Control checkbox checked
      Typography body2 "I agree to the terms"
      Spacer
      Link "Terms" to=#terms
    Button "Create account" contained to=#welcome
```

A dashboard -- app bar, fixed nav rail, card grid, icons:

```wireframe
Wireframe #dashboard landscape
  AppBar
    Toolbar
      Icon Menu
      Typography h6 "Acme"
      Spacer
      Icon Search
  Stack row 100% *
    Box 240px *
      List
        ListItem "Home" to=#home
        ListItem "Reports" to=#reports
        ListItem "Settings" to=#settings
    Box * *
      Grid cols=3 gap=2
        Card
          Typography h5 ~3w
          Img
          Typography ~2
        Card
        Card
```

A multi-frame flow with shared chrome -- the shell is authored once
(`visible=false`), both screens compose into its `#content` region, and the
`to=` links make the document render as a flow chart:

```wireframe
Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Typography h6 "Acme"
  Stack row 100% *
    Box 240px *
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Typography h4 "Dashboard"
  Grid cols=2 gap=2
    Card to=#detail
    Card to=#detail

Wireframe #detail background=#shell anchor=#content
  Link "Back" to=#home
  Typography h3 "Item details"
  Typography ~3
```

## Checking your work

To validate a wireframe, render it: save the block's contents as `x.wiremark`
and run `npx @wiremark/cli x.wiremark -o x.svg` (Node 18+). Hard errors exit
non-zero with a line number; warnings print to stderr while the SVG is still
written. Remember rule 14: dead `to=` links and children under leaf components
are silent -- inspect those by eye.

## Component list

This list is generated from the renderer's own component registry, so it is
exactly what renders today. Legend:

- `Name [c]` -- accepts children (indent them under it). **Anything without
  `[c]` is a leaf: children indented under it are silently dropped.**
- `[w h]` -- takes bare sizing tokens, width then height (rule 6).
- `[~]` -- accepts filler amount tokens `~N`/`~Nw`/`~Nl`/`_` (rule 8).
- Each property is `name|alias:TYPE=default`, with `*` appended when the value
  may be given keyless (bare, no `key=`). Enums show their values inline:
  `(a|b|c)`. A prop marked `(keyless only)` has no `key=` form at all.
- Types: `T` quoted text, `N` number, `B` boolean flag (bare name means true),
  `I` icon name, `R` `#frame-id` reference, `A` aspect ratio (like `16:9`).
- Universal: every component also accepts `to=#frame-id` (alias `href=`) and a
  bare `#id` token (names the element, e.g. as an `anchor=` target). The
  `Wireframe` root is described in rule 10.

<!-- BEGIN GENERATED: component-list (source: the live element registry, packages/core/src/elements; regenerate with `npm run docs:reference`) -->
```
UNIVERSAL (every element) -- to|href:R, scrollbar:(vertical|horizontal|both|none), scrollbarValue:N, scrollbarHandle:N, padding|pad:N

LAYOUT
Stack [c] [w h] -- direction:(row|row-reverse|column|column-reverse)=column*, spacing|gap:N=0, divider:B*, elevation:N=0, outline:(none|solid|dashed|dotted)=none*
Box [c] [w h] -- elevation:N=0, outline:(none|solid|dashed|dotted)=none*
Grid [c] [w h] -- columns|cols:N=12, spacing|gap:N=0
Spacer [w h]
Anchor [w h]
Divider -- orientation:(horizontal|vertical)=horizontal*, variant:(solid|dashed|dotted)=solid*

SURFACES
Card [c] [w h] -- elevation:N=1
CardHeader -- title|label|text:T*, subheader|subtext:T, icon:I, closeIcon:I=Close
CardContent [c]
CardActions [c]
AppBar [c] -- variant:(regular|dense)=regular*, background:(hatch|crosshatch|none)=hatch, denseBackground:B*
Toolbar [c] -- variant:(regular|dense)=regular*
AccordionHeader -- title|label|text:T*, expanded:B*, disabled:B*, icon:I, expandedIcon:I=ExpandLess, collapsedIcon:I=ExpandMore, background:(hatch|crosshatch|none), denseBackground:B*
AccordionBody [c]

NAVIGATION
Drawer [c] -- variant:(permanent|overlay|rail)=permanent*, pin:(left|right|top|bottom)=left*, divider:B=true*, background:(hatch|crosshatch|none)=hatch*, denseBackground:B*
Link [~] -- label:T*, underline:(none|hover|always)=always, variant:(h1|h2|h3|h4|h5|h6|subtitle1|subtitle2|body1|body2|caption|overline|button)*, filler:(squiggle|lorem|blocks)
MenuItem -- label:T*, selected:B*, disabled:B*
Menubar [c]
Tabs [c] -- orientation:(horizontal|vertical)=horizontal*, variant:(standard|scrollable|fullWidth)=standard*
Tab [~] -- label:T*
Breadcrumbs [c] -- separator:T*
Stepper [c] -- orientation:(horizontal|vertical)=horizontal*
Step -- label:T*, active:B*, completed:B*
Pagination -- count:N=1, page:N=1
BottomNavigation [c] -- value|v|val:T, showLabels:B*
BottomNavigationAction -- label:T*, icon:I

CONTENT
Typography [~] -- label:T*, variant:(h1|h2|h3|h4|h5|h6|subtitle1|subtitle2|body1|body2|caption|overline|button)=body1*, align:(inherit|left|center|right|justify)=inherit*, noWrap:B*, filler:(squiggle|lorem|blocks)
Button -- label:T*, variant:(text|outlined|contained)=text*, size:(small|medium|large)=medium*, disabled:B*, startIcon:I, endIcon:I, fullWidth:B*, background:(hatch|crosshatch|none)=hatch*, denseBackground:B*

INPUTS
TextField [~] -- label:T*, variant:(outlined|filled|standard)=outlined*, value|v|val:T, multiline:B*, required:B*, placeholder:T, helperText|helper:T, error:B*, disabled:B*, rows:N, defaultValue:T, size:(small|medium)=medium*, startIcon:I, endIcon:I, fullWidth:B*, select:B*, background:(hatch|crosshatch|none)=hatch, denseBackground:B*, filler:(squiggle|lorem|blocks)

CONTENT
Img [w h] -- ratio:A, alt:T, src:T
Placeholder [w h] -- label:T*, description:T
Avatar -- variant:(circular|rounded|square)=circular*, size:(small|medium|large)=medium*, src:T, label:T*, background:(hatch|crosshatch|none)=hatch*, denseBackground:B*
Chip [~] -- label:T*, variant:(filled|outlined)=filled*, size:(small|medium)=medium*, background:(hatch|crosshatch|none)=hatch, denseBackground:B*, filler:(squiggle|lorem|blocks)
Icon -- name:I*, fontSize|size:(small|medium|large|inherit)=medium
List [c] -- dense:B*, subheader:T
ListItem [~] -- label:T* (keyless only), filler:(squiggle|lorem|blocks)
Table [c] -- size:(small|medium)=medium*
TableHead [c]
TableBody [c]
TableFooter [c]
TableRow [c] -- selected:B*
TableCell [~] -- label:T* (keyless only), align:(left|center|right)=left, filler:(squiggle|lorem|blocks)
Badge -- badgeContent:T*, variant:(standard|dot)=standard*

INPUTS
Control -- variant:(radio|checkbox|switch)=checkbox*, checked:B*, disabled:B*, size:(small|medium|large)=medium*, background:(hatch|crosshatch|none)=hatch, denseBackground:B*
Select [c] -- label:T*, variant:(outlined|filled|standard)=outlined*, value|v|val:T
Option -- label|text:T*, subtext:T, selected:B*, startIcon:I, endIcon:I
Slider -- value|n|v|val:N=0*, min:N=0, max:N=100, orientation:(horizontal|vertical)=horizontal*
Rating -- value|n|v|val:N=0*, max:N=5, icon:I=Star, emptyIcon:I=StarBorder
ToggleButtonGroup [c] -- orientation:(horizontal|vertical)=horizontal*, size:(small|medium|large)=medium*
ToggleButton -- icon:I*, selected:B*, size:(small|medium|large)=medium*, background:(hatch|crosshatch|none)*, denseBackground:B*
ButtonGroup [c] -- variant:(text|outlined|contained)=outlined*, orientation:(horizontal|vertical)=horizontal*
Fab -- icon:I*, variant:(circular|extended)=circular*, size:(small|medium|large)=medium*

FEEDBACK
Alert [~] -- label:T*, severity:(error|warning|info|success)=success*, variant:(standard|filled|outlined)=standard*, filler:(squiggle|lorem|blocks)
Dialog [c] -- position:(center|top|bottom|left|right|topLeft|topRight|bottomLeft|bottomRight)=center*, size:(fullScreen|content|xs|sm|md|lg|lx)=content*
DialogHeader -- title|label|text:T*, closeIcon:I=Close
DialogContent [c]
DialogActions [c]
Snackbar -- position:(inline|topLeft|topRight|bottomLeft|bottomRight)=inline*, message|label:T*
Progress -- variant:(linear|circular)*, value|n|v|val:N=0*, min:N=0, max:N=100, thickness:(small|medium|large)=medium*
Skeleton [w h] -- variant:(text|circular|rectangular|rounded)=rectangular*
```
<!-- END GENERATED: component-list -->

Full per-component reference with notes:
<https://docs.wiremark.dev/reference/components>. Built-in icon gallery:
<https://docs.wiremark.dev/reference/icons>.
