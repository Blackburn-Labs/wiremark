<!--
  GENERATED FILE -- DO NOT EDIT BY HAND.
  Source of truth: meta/element-specs.json
  Regenerate with: npm run docs:reference
-->

# wiremark Component Library Reference

This reference is generated from [`meta/element-specs.json`](../../meta/element-specs.json) -- the single source of truth for wiremark's component and property coverage. It lists the elements wiremark supports and, for each, its properties; anything out of scope is omitted. Do not edit it by hand: change the JSON and run `npm run docs:reference`.

## Universal properties

These apply to *every* element (the registry injects them onto each component), so they are NOT repeated in the per-component tables below.

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| to | reference |  |  | no | href | Makes any element (or region) a clickable link to a frame #id (ss.7.2); flow.js reads it for the navigation graph. href= is the alias. |
| padding | numeric |  |  | no | pad | Inner padding in spacing units (padding=2 -> 16px), like gap/spacing. Overrides the element's default pad when set; unset keeps the element default; padding=0 removes it. |
| scrollbar | enum | vertical, horizontal, both, none |  | no |  | Draws a scrollbar affordance: reserves a thin gutter on the scrolled edge (right for vertical, bottom for horizontal) so the strip never covers content, clips overflow, and hugs the box edge. |
| scrollbarValue | numeric |  | 0 | no |  | Scroll position 0-100 (0 = start/top-left). Ignored unless scrollbar is set. |
| scrollbarHandle | numeric |  | 30 | no |  | Scrollbar handle length as a percent of the track. Ignored unless scrollbar is set. |

## Components

- [Layout](#layout)
- [Surfaces](#surfaces)
- [Navigation](#navigation)
- [Content](#content)
- [Inputs](#inputs)
- [Feedback](#feedback)

## Layout

### Box

A generic sized container that stacks its children in a column and is invisible by default, so a bare Box is a zero-overhead region that only carries a size and groups content. Optional chrome turns it into a visible panel: a keyless `outline` border (none/solid/dashed/dotted) and a numeric `elevation` shadow, each drawn only when set. Its width/height are positional sizing tokens interpreted by the parent's distribution, so with none given it fills naturally.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| width | size |  | content | yes | w | Footprint width (px \| % \| * \| flex), positional (first sizing token, alias w) and interpreted by the parent's distribution. A bare number is a flex weight, `*` fills; the keyed forms width=/w= are rejected. Defaults to content. |
| height | size |  | content | yes | h | Footprint height (px \| % \| * \| flex), positional (second sizing token, alias h). A bare number is a flex weight, `*` fills; the keyed forms height=/h= are rejected. Defaults to content. |
| elevation | numeric |  | 0 | no |  | Numeric drop-shadow depth, keyed only (e.g. elevation=3); a bare number is read as a sizing token instead. Any value > 0 paints a soft shadow at reduced opacity; defaults to 0 (no shadow). |
| outline | enum | none, solid, dashed, dotted | none | yes |  | Border style, one of none, solid, dashed, or dotted, written bare as a keyless enum (e.g. Box dashed). Defaults to none, which draws no border and keeps a bare Box invisible. |

**Examples**

```wireframe
Box
```

*An invisible region that carries a size and groups children; draws nothing of its own.*

```wireframe
Box solid
  Typography "Panel"
```

*A solid-bordered panel wrapping its content.*

```wireframe
Box dashed 200 120
  Typography "Placeholder"
```

*A dashed-outline box pinned to 200x120 px (width then height).*

```wireframe
Box solid elevation=3
  Typography "Card"
```

*An outlined, elevated card: a border plus a soft drop shadow.*

```wireframe
Box dotted 100%
  Typography "Full-width slot"
```

*A dotted-outline slot that fills the available width.*

### Stack

An invisible flexbox container that arranges its children along one axis. `Stack column` (the default) stacks top-to-bottom and `Stack row` runs left-to-right, with `-reverse` variants flipping the visual order along that axis; `spacing=` (alias `gap=`) sets the inter-child gap in spacing units. By default it draws nothing of its own -- its only visible effect is where it places children -- but optional chrome adds an `outline` border, a numeric `elevation` shadow, and a `divider` rule in each gap. Bare-number children become flex weights and `Spacer` flexes, distributed along the main axis.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| direction | enum | row, row-reverse, column, column-reverse | column | yes |  | Main axis and child order, keyless. One of row \| row-reverse \| column \| column-reverse; the -reverse variants flip the visual order along the axis. Defaults to column (top-to-bottom). |
| spacing | numeric |  | 0 | no | gap | Inter-child gap in spacing units (resolved as spacing * SPACING px), keyed via spacing= or its gap= alias. Defaults to 0 (children touch). |
| divider | boolean |  | false | yes |  | Keyless boolean flag; a bare `divider` draws a muted separator rule in each gap between adjacent children (only when there is more than one child). Defaults to false (no rule). |
| width | size |  | content | yes | w | Footprint width (px \| % \| * \| flex), supplied as positional sizing -- the first bare sizing token, e.g. `Stack row 300` or `Stack 100%`. Keyless-only: the keyed width=/w= forms throw "unknown property". Defaults to content width. |
| height | size |  | content | yes | h | Footprint height (px \| % \| * \| flex), supplied as positional sizing -- the second bare sizing token, e.g. `Stack row 300 100`. Keyless-only: the keyed height=/h= forms throw "unknown property". Defaults to content height. |
| elevation | numeric |  | 0 | no |  | Numeric drop-shadow depth (mirrors Box), keyed via elevation=. Any value > 0 paints a shadow surface; defaults to 0 (none). |
| outline | enum | none, solid, dashed, dotted | none | yes |  | Border style: none \| solid \| dashed \| dotted. Works both keyless (bare, e.g. `Stack column solid`) and keyed (outline=solid). Defaults to none (invisible). |

**Examples**

```wireframe
Stack row spacing=2
  Button "Save"
  Button "Cancel"
```

*A horizontal actions bar with a 2-unit gap between buttons.*

```wireframe
Stack column spacing=2
  Typography "Title"
  Typography "Subtitle"
```

*The default column: children stacked top-to-bottom.*

```wireframe
Stack row-reverse spacing=1
  Button "A"
  Button "B"
  Button "C"
```

*Reversed row -- children lay out right-to-left (C, B, A).*

```wireframe
Stack column spacing=2 divider
  Typography "Row 1"
  Typography "Row 2"
  Typography "Row 3"
```

*A divider rule drawn in each gap between list rows.*

```wireframe
Stack column spacing=2 outline=solid elevation=2
  Typography "Card body"
```

*Opt-in chrome: a solid border plus an elevation shadow turn the stack into a card.*

```wireframe
Stack row spacing=2
  Button "Left"
  Spacer
  Button "Right"
```

*A Spacer flexes to push the two buttons to opposite ends of the row.*

### Grid

An explicit grid container that flows its children into equal-width cells, row by row. `columns` (alias `cols`) sets how many columns there are, defaulting to 12, and once a row fills the next child wraps to a new row; `spacing` (alias `gap`) adds uniform gaps between rows and columns. The grid draws nothing of its own and, as a block container, fills its parent's width by default while its height follows the measured rows.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| columns | numeric |  | 12 | no | cols | Number of equal-width columns children flow into, row by row; alias `cols`. Defaults to 12. Keyed only (`columns=N` / `cols=N`); the count is floored to a positive integer (`columns=2.5` behaves as 2, and 0/negative clamp to 1). |
| spacing | numeric |  | 0 | no | gap | Uniform gap between rows and columns, multiplied by the SPACING unit; alias `gap`. Defaults to 0 (no gap). Keyed only (`spacing=N` / `gap=N`). |
| width | size |  | 100% | yes | w | Footprint width as the first positional sizing token -- a bare number (a flex weight), `Npx` (pixels), `N%`, or `*` (fill). There is no keyed form: `width=`/`w=` throw "unknown property". Defaults to filling the parent's width; the columns divide whatever width the grid takes. |
| height | size |  | content | yes | h | Footprint height as the second positional sizing token -- a bare number (a flex weight), `Npx` (pixels), `N%`, or `*` (fill). There is no keyed form: `height=`/`h=` throw "unknown property". Defaults to content -- the measured height of the rows. |

**Examples**

```wireframe
Grid columns=3
  Card
  Card
  Card
  Card
  Card
  Card
```

*Six cards in a 3-column grid: two full rows.*

```wireframe
Grid columns=2 gap=2
  Box 80 60
  Box 80 60
  Box 80 60
  Box 80 60
```

*A 2x2 grid with row/column gaps (gap is the spacing alias).*

```wireframe
Grid
  Chip
  Chip
  Chip
```

*Default 12 columns: three chips sit on one row.*

```wireframe
Grid cols=4 spacing=1
  Avatar
  Avatar
  Avatar
  Avatar
```

*Four avatars across one row (cols alias) with single-step spacing.*

```wireframe
Grid 240px columns=2
  Card
  Card
```

*Pin the grid to a 240px footprint (positional width); the two columns share it.*

### Divider

A thin separator rule that splits content along its container's cross axis. A bare Divider is a solid full-width horizontal line (placed in a column); orientation=vertical turns it into a full-height rule, the idiomatic placement between row children. The line is block-stretched to the parent's cross extent, contributing only a little breathing room on its own axis, and the variant selects a solid, dashed, or dotted stroke. Divider takes no sizing tokens of its own — its long dimension always comes from the container.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| orientation | enum | horizontal, vertical | horizontal | yes |  | Direction of the rule, an enum written bare as a keyless token: horizontal (the default) draws a full-width line in a column, vertical draws a full-height line between row children. The line block-stretches to the parent's cross axis, so its long dimension comes from the container, never from a sizing token on the Divider itself. |
| variant | enum | solid, dashed, dotted | solid | yes |  | Stroke style, an enum written bare as a keyless token: solid (the default), dashed, or dotted, reusing the shared box-outline dash arrays. Its value domain is disjoint from orientation, so tokens like `vertical dashed` parse in any order. |

**Examples**

```wireframe
Divider
```

*A plain solid horizontal rule, full-width in its column.*

```wireframe
Divider dashed
```

*A horizontal rule with a dashed stroke.*

```wireframe
Stack column
  Typography "Section A"
  Divider
  Typography "Section B"
```

*Separating two stacked sections with a horizontal rule.*

```wireframe
Stack row 240 80
  Button "Cut"
  Divider vertical
  Button "Copy"
```

*A vertical rule between row children, filling the row height (the size goes on the Stack, not the Divider).*

```wireframe
Stack row 240 80
  Button "Edit"
  Divider vertical dotted
  Button "Share"
```

*A dotted vertical divider; the two keyless enums parse in either order.*

### Spacer

A flexible or fixed gap between siblings in a Stack. Given a size token it is a fixed gap (`Spacer 16px`, `Spacer 24px 8px`); unsized it flexes, absorbing the leftover main-axis space of its Stack to push the following siblings to the far edge. A bare number is a flex weight, so `Spacer 2` pulls twice as hard as a plain `Spacer`. Sizing is positional and axis-independent: the first token is always width, the second height -- so a single-token `Spacer 16px` sizes a row's main (horizontal) axis, but in a column the gap lives on the second token (`Spacer 0 24px`). Its intrinsic size is 0x0, so an unsized Spacer in an axis with no slack collapses to nothing rather than injecting a phantom gap, and it draws nothing of its own.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| width | size |  |  | yes | w | Footprint width as the FIRST positional sizing token -- always width, regardless of stack direction (px \| % \| * \| a bare number, which is a flex weight). With a fixed value the Spacer is a fixed gap of that width; unsized it flexes to absorb leftover space. The keyed `w=`/`width=` form throws "unknown property"; the literal word `flex` is not a token (it throws "unexpected token"), and the spec's "default 1" is intentionally not realized as a fixed intrinsic (the intrinsic is 0). |
| height | size |  |  | yes | h | Footprint height as the SECOND positional sizing token (px \| % \| * \| a bare number = flex weight). Pins the cross extent for a row (`Spacer 24px 8px`) and the main axis for a column (`Spacer 0 24px`). The keyed `h=`/`height=` form throws "unknown property"; the literal word `flex` is not a token, and the spec's "default 1" is not realized as a fixed intrinsic (the intrinsic is 0). |

**Examples**

```wireframe
Stack row 100% *
  Button "Cancel"
  Spacer
  Button "Save"
```

*Unsized Spacer in a stretched row: it absorbs the slack and pushes Save to the right edge.*

```wireframe
Stack row
  Box 50px 20px
  Spacer 16px
  Box 50px 20px
```

*A fixed 16px gap between two boxes in a row (the single token is width, which is the row's main axis).*

```wireframe
Stack column
  Typography "Header"
  Spacer 0 24px
  Typography "Body"
```

*A fixed 24px vertical gap in a column: the column's main axis is height, the SECOND token -- a lone `Spacer 24px` would be 24px wide and 0 tall, adding no vertical gap.*

```wireframe
Stack row
  Box 40px 20px
  Spacer 24px 8px
  Box 40px 20px
```

*Two sizing tokens: 24px wide, 8px tall.*

```wireframe
Stack row 100% *
  Button "A"
  Spacer 2
  Button "B"
  Spacer
  Button "C"
```

*Flex weights: the weight-2 Spacer takes twice the leftover space of the plain (weight-1) one.*

### Anchor

An invisible, named layout region used for background/foreground composition: a background frame declares `Anchor #id` to mark where foreground content belongs, and another frame drops into it with `background=#bg anchor=#id` (alias `at=`). Strategy-wise it is a zero-intrinsic, flexing, block-stretching leaf -- an unsized `Anchor #id` claims its container's leftover space on both axes ("the rest of this container"), while sizing tokens pin a fixed region. It draws nothing of its own and requires an `#id` (an Anchor without one warns at parse time, since it can never be targeted).

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| width | size |  |  | yes | w | Footprint width, positional (the first sizing token, e.g. `Anchor #x 240px`). Accepts `px`, `%`, `*` (fill), or a bare number (a flex weight) -- note the literal word `flex` is not a token and throws. Unset, the region flexes to fill the container's main-axis slack. Sizing is positional only: keyed `width=`/`w=` throw "unknown property". |
| height | size |  |  | yes | h | Footprint height, positional (the second sizing token, e.g. `Anchor #x * 200px`). Accepts `px`, `%`, `*` (fill), or a bare number (a flex weight) -- the literal word `flex` is not a token and throws. Unset, the region block-stretches to fill the cross axis. Sizing is positional only: keyed `height=`/`h=` throw "unknown property". |

**Examples**

```wireframe
Anchor #content
```

*A named region that fills its container's leftover space on both axes; foreground frames compose into it.*

```wireframe
Stack row 100% *
  Box 240px *
  Anchor #main
```

*A 240px rail with a #main region filling everything to its right.*

```wireframe
Anchor #console * 200px
```

*A fixed 200px-tall strip pinned by positional sizing (full width, 200px height).*

```wireframe
Stack column
  AppBar
    Toolbar
      Typography h6 "Acme"
  Anchor #body
```

*App-bar shell where the #body region takes all the vertical slack below the bar.*

## Surfaces

### Card

A paper surface that stacks its content in a column. Loose children are auto-wrapped in an implicit CardContent, so a bare Card just works; for the classic product-card shape, supply explicit CardHeader / CardContent / CardActions sub-parts and they stack in order. A single numeric `elevation` (default 1) governs the whole look: `elevation=0` is a bordered paper with no shadow, while any `elevation>=1` lifts the paper with a drop shadow. An empty Card still draws thanks to a 160x100 minimum size.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| elevation | numeric |  | 1 | no |  | Sole look control, keyed only (numeric, default 1). A bare number is read as a sizing token, so elevation must be written `elevation=N`. 0 draws a bordered paper with no shadow; any value >= 1 lifts the paper with a drop shadow whose offset and opacity grow with the number (then saturate). The old `variant` enum was removed -- `variant=outlined` and the bare tokens `outlined`/`elevation` now throw, so use `elevation=0` for the outlined look. |

**Examples**

```wireframe
Card
  Typography h6 "Card title"
  Typography body2 "Some supporting copy."
```

*Loose children auto-wrap in an implicit CardContent; default elevation 1 draws a drop shadow.*

```wireframe
Card elevation=0
  Typography body2 "Flat, bordered paper -- no shadow."
```

*Flat, border-only paper (the look the removed variant=outlined used to select).*

```wireframe
Card elevation=8
  Typography body2 "Lifted high off the page."
```

*A higher elevation lifts the paper further off the page.*

```wireframe
Card
  CardHeader "Product" subheader="In stock"
  CardContent
    Typography body2 "Description of the product."
  CardActions
    Button "Buy"
    Button "More"
```

*Explicit sub-parts: header band, padded body, and an action row stacked in order.*

```wireframe
Card 240 160
  Typography body2 "Fixed 240x160 card."
```

*Positional sizing tokens pin the card to a fixed 240x160 footprint.*

### CardHeader

The title region of a Card: a full-width band that draws a bold title, an optional muted subheader stacked beneath it, an optional leading icon, and a trailing close icon. It is a leaf built entirely from its own props (not a container), so it spans the Card column's full width and its height grows when a subheader is present. By default it draws a real trailing Close X; pass closeIcon=none to drop it. Known icon names render as clean vector artwork; unknown ones fall back to a placeholder glyph plus a warning.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| title | string |  |  | yes | label, text | The bold primary label. Keyless (write it bare, e.g. CardHeader "Account") or keyed via title=/label=/text=; setting it both ways is a duplicate error. Defaults to a "Title" placeholder when unset. |
| subheader | string |  |  | no | subtext | A second, smaller muted line stacked under the title; keyed only (alias subtext), and its value must be quoted. Adding one increases the band's height. No default (omitted). |
| icon | icon |  |  | no |  | Optional leading icon NAME drawn at the left edge (keyed only: icon=Person; the value may be bare or quoted, PascalCase). A known name draws real artwork, an unknown one a placeholder glyph plus a warning. Defaults to null (no leading icon). |
| closeIcon | icon |  | Close | no |  | Trailing icon NAME at the right edge (keyed only). Defaults to "Close", so a plain header draws a real Close X; pass closeIcon=none to omit it, or any other name (e.g. MoreVert) to swap it. |

**Examples**

```wireframe
CardHeader "Account Settings"
```

*Plain header: bold title plus the default trailing Close X.*

```wireframe
CardHeader "Jane Doe" subheader="Administrator"
```

*Title with a muted subheader line; the band lays out taller.*

```wireframe
CardHeader "Profile" icon=Person
```

*Leading icon at the left edge, with the text shifted right.*

```wireframe
CardHeader "Notifications" closeIcon=none
```

*Suppress the trailing close icon for a clean header.*

```wireframe
CardHeader "Options" closeIcon=MoreVert
```

*Swap the trailing slot for a custom action icon.*

```wireframe
Card
  CardHeader "Account" subheader="Manage your profile" icon=Person
  CardContent
    Typography "Body text"
```

*The intended home: a header band atop a Card, over a CardContent body.*

### CardContent

The body region of a Card. CardContent stacks its children in a generously padded column (2 spacing units of inset, one unit of gap between children) and draws nothing of its own -- the surrounding Card supplies the paper, so it must live inside a Card. It takes no properties of its own; it exists purely to inset and stack a card's body content.

*Accepts children: yes*

No configurable properties.

**Examples**

```wireframe
Card
  CardContent
    Typography h5 "Card title"
    Typography body2 "Supporting body text for the card."
```

*The common case: a padded body region holding a title and body text inside a Card.*

```wireframe
Card
  CardHeader "Mountain trip"
  CardContent
    Typography body2 "Three days in the alps."
  CardActions
    Button "Share" text
```

*Body region between a CardHeader and a CardActions bar in a full card.*

```wireframe
Card
  CardContent
    Typography h6 "Settings"
    TextField "Email"
    Button "Save" contained
```

*Any controls work as children; they stack in the padded column with even spacing.*

### CardActions

The action button row of a Card -- a transparent region that lays its children (typically a couple of Buttons) in a padded left-to-right row and draws nothing of its own; the Card supplies the paper beneath. A single spacing unit of padding and gap keeps the actions tight against the card's lower edge. It has no properties of its own: behavior comes entirely from its children and its containing Card.

*Accepts children: yes*

No configurable properties.

**Examples**

```wireframe
Card
  CardContent
    Typography h6 "Trip to Tokyo"
  CardActions
    Button "Book"
    Button "Details"
```

*The conventional Card footer: a content slot above, two action buttons in the row below.*

```wireframe
Card
  CardActions
    Button "Agree"
    Button text "Disagree"
```

*A bare actions row of text-style buttons (Button's default variant is already text); the second names it explicitly.*

```wireframe
Card
  CardActions
    Button startIcon=Share
    Button startIcon=Favorite
```

*Icon-only action buttons (an icon with no label) sit side by side in the padded row.*

### AppBar

A full-width top app bar -- the surface that usually wraps a Toolbar. It lays its children out in a row inside one variant-sized unit of padding and draws a light hand-drawn hatch behind them (never a solid flood-fill, so it still reads as a wireframe). The default regular variant gives a standard header; dense halves the padding for a tighter, shorter bar. It always stretches to the container's full width and its height follows the content.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | regular, dense | regular | yes |  | Bar density: regular (default) or dense, where dense halves the inner padding so the bar sits tighter and shorter. Written keyless as a bare enum (AppBar dense) or keyed (variant=dense). |
| background | enum | hatch, crosshatch, none | hatch | no |  | Hand-drawn tint pattern for the bar: hatch (single diagonal, default), crosshatch (both diagonals), or none (an opaque, untextured solid base). Keyed only -- write background=crosshatch; a bare token throws. |
| denseBackground | boolean |  | false | yes |  | Boolean flag (default false) that packs the background tint's hatch lines closer together. Resolves both bare (denseBackground) and keyed (denseBackground=true). |

**Examples**

```wireframe
AppBar
  Toolbar
    Typography h6 "Acme"
```

*Standard full-width bar wrapping a Toolbar title.*

```wireframe
AppBar dense
  Toolbar
    Typography h6 "Acme"
    Button "Sign in"
```

*Dense (tighter, shorter) bar with a title and an action.*

```wireframe
AppBar background=none
  Toolbar
    Typography h6 "Dashboard"
```

*Opaque, untextured bar -- a solid base with no hatch lines.*

```wireframe
AppBar background=crosshatch
  Toolbar
    Icon menu
    Typography h6 "Mail"
```

*Crosshatch tint (both diagonals) behind a menu icon and title.*

```wireframe
AppBar denseBackground
  Toolbar
    Typography h6 "Settings"
```

*Default hatch packed closer together via the denseBackground flag.*

### Toolbar

An invisible horizontal content row, almost always placed inside an AppBar, that lays its children out left-to-right like a Stack or Box but paints nothing itself (the AppBar draws the bar). The keyless `variant` controls density: the default `regular` puts a full spacing unit between items, while `dense` halves it (SPACING/2) to mirror AppBar's dense metric, so an `AppBar dense` wrapping a `Toolbar dense` reads as one consistently tighter bar.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | regular, dense | regular | yes |  | Row density. One of `regular` \| `dense`, default `regular`; `dense` halves the inter-item gap (SPACING/2 instead of SPACING). Idiomatically written as a bare keyless enum (`Toolbar dense`), though the keyed form `variant=dense` is also accepted. The default is never injected: an omitted variant stays absent on the node, and the layout treats anything but `dense` as `regular`. |

**Examples**

```wireframe
AppBar
  Toolbar
    Typography h6 "Acme"
```

*The shell idiom: an AppBar draws the bar, the Toolbar flows a brand title inside it.*

```wireframe
Toolbar
  Typography h6 "Acme"
  Button "Sign in"
```

*Standalone (no AppBar): a row of items with the default regular inter-item gap.*

```wireframe
AppBar dense
  Toolbar dense
    Icon menu
    Typography h6 "Dashboard"
```

*A consistently denser bar -- dense AppBar plus dense Toolbar halve the gap between the menu icon and title.*

```wireframe
AppBar
  Toolbar
    Icon menu
    Typography h6 "Inbox"
    Avatar
```

*A typical app header row: leading menu icon, title, and a trailing avatar.*

### AccordionHeader

The clickable summary bar of an expandable panel, drawn as a full-width bordered bar with a left-aligned title and an expand/collapse chevron pinned to the right. It is an independent sibling of AccordionBody (there is no Accordion parent), so headers and bodies are simply placed one after another. The chevron reads the open/closed state from its direction -- ExpandLess (up) when expanded, ExpandMore (down) when collapsed -- and a disabled header mutes its border, title, and chevron in gray.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| title | string |  |  | yes | label, text | The summary text shown left-aligned in the bar; keyless (a bare quoted string) and also settable via title=/label=/text=. Defaults to the placeholder "Section" when unset. |
| expanded | boolean |  | false | yes |  | Keyless boolean flag selecting the chevron DIRECTION -- ExpandLess (up) when present, ExpandMore (down) otherwise -- so open/closed reads from the glyph. Defaults to false (collapsed). |
| disabled | boolean |  | false | yes |  | Keyless boolean flag that mutes the whole bar -- border, title, and chevron -- in the muted gray ink. Defaults to false. |
| icon | icon |  |  | no |  | Keyed-only (icon=) explicit chevron override that wins in BOTH states; takes an icon name, bare or quoted (e.g. icon=Check). Has no default -- when unset the per-state defaults apply; icon=none suppresses the glyph, and an unknown name falls back to the placeholder glyph with a diagnostic. |
| expandedIcon | icon |  | ExpandLess | no |  | Keyed-only (expandedIcon=) chevron drawn in the expanded state; takes an icon name, bare or quoted. Defaults to ExpandLess (pointing up). |
| collapsedIcon | icon |  | ExpandMore | no |  | Keyed-only (collapsedIcon=) chevron drawn in the collapsed state; takes an icon name, bare or quoted. Defaults to ExpandMore (pointing down). |
| background | enum | hatch, crosshatch, none |  | no |  | Optional opaque hatch tint across the header bar: hatch, crosshatch, or none (opaque, no hash lines); drawn only when set. Keyed only -- write background=hatch; a bare token throws. |
| denseBackground | boolean |  | false | yes |  | Keyless boolean flag that packs the background hatch lines closer together for a denser tint (it also triggers the tint on its own even without background= set, defaulting that tint to hatch). Defaults to false. |

**Examples**

```wireframe
AccordionHeader "Shipping & returns"
```

*A collapsed section bar with a down (ExpandMore) chevron and a left-aligned title.*

```wireframe
AccordionHeader "Order details" expanded
```

*Open state: the chevron flips to ExpandLess (pointing up).*

```wireframe
AccordionHeader "Archived" disabled
```

*Muted bar -- border, title, and chevron all drawn in gray.*

```wireframe
AccordionHeader "Payment" icon=Check
```

*Override the chevron with an explicit icon (icon= is keyed-only) that wins in both states.*

```wireframe
AccordionHeader "Filters" background=hatch
```

*Opt-in diagonal hatch tint over an opaque paper base (background= is keyed-only).*

```wireframe
Stack column
  AccordionHeader "Shipping" expanded
  AccordionHeader "Billing"
```

*Two stacked section headers, the first open and the second collapsed.*

### AccordionBody

The expanded panel that sits beneath an AccordionHeader, drawn as a bordered paper surface holding arbitrary children. There is no Accordion parent: AccordionHeader and AccordionBody are independent siblings an author stacks one after another, and they read as one unit because both span the full frame width and the body butts directly against the bar above it. It stacks its children in a padded column with one spacing unit of inset and gap. The body is always rendered regardless of the preceding header's expanded state (siblings cannot read each other through the engine), and a minSize keeps even an empty body drawing as a visible panel; omit the body entirely for a collapsed look.

*Accepts children: yes*

No configurable properties.

**Examples**

```wireframe
AccordionHeader "Shipping" expanded
AccordionBody
  Typography "Ships in 2-3 business days."
```

*The canonical pairing: an expanded header bar with its body panel stacked directly beneath as one unit.*

```wireframe
AccordionBody
  Typography "Standard delivery is free over $50."
  Button "Track order" outlined
```

*Arbitrary children stack in a padded column with one spacing unit between them.*

```wireframe
AccordionBody
```

*An empty body still draws a visible bordered panel (minSize keeps it from collapsing).*

## Navigation

### Drawer

A navigation side panel holding a column or row of children. The single `pin` knob (left/right/top/bottom, default left) picks the docked edge and implies the axis: left/right read as a tall vertical column panel, top/bottom as a wide horizontal bar. `permanent` (default) and `rail` are in-flow -- content flows beside them, and rail is a slim icon strip -- while `overlay` floats out of flow, pins to its edge at 100% of the parent's perpendicular extent, and carries an elevation shadow. In-flow drawers draw just an opaque paper fill plus the content-facing divider seam (no full box); only the overlay variant is a bordered, shadowed sheet.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| pin | enum | left, right, top, bottom | left | yes |  | Which edge the panel docks/pins against. Keyless enum (left \| right \| top \| bottom), default left. It implies the axis (left/right => a vertical column panel, top/bottom => a horizontal row bar), the docked side, the content-facing divider edge, and the 100%-fill axis; the seam always hugs the opposite (content-facing) edge. |
| variant | enum | permanent, overlay, rail | permanent | yes |  | The drawer kind. Keyless enum (permanent \| overlay \| rail), default permanent. permanent is an in-flow docked panel (seam only, no full box); overlay is an out-of-flow floating sheet that pins to the pin edge at 100% of the parent's perpendicular extent, with a border and elevation shadow; rail is a thin in-flow icon strip (~56px). |
| divider | boolean |  | true | yes |  | Draws the heavier solid seam on the content-facing edge (opposite the pin edge). Keyless boolean, default true; a bare `divider` keeps it on, `divider=false` suppresses it (leaving an untinted in-flow drawer with no visible chrome). |
| background | enum | hatch, crosshatch, none | hatch | yes |  | Opaque hatch tint for the panel, drawn only when requested (a plain Drawer is paper). Keyless enum (hatch \| crosshatch \| none); none lays an opaque base with no hash lines. Resolves to hatch when a tint is requested without naming one. |
| denseBackground | boolean |  | false | yes |  | Packs the background hatch lines closer together (and, on its own, requests the hatch tint). Keyless boolean, default false. |

**Examples**

```wireframe
Drawer
  Typography "Inbox"
  Typography "Drafts"
  Typography "Sent"
```

*Default permanent left panel: a docked vertical column of nav items.*

```wireframe
Drawer right
  Typography "Filters"
  Typography "Sort"
```

*Pinned to the right edge, so the seam now faces content on its left.*

```wireframe
Drawer rail
  Icon home
  Icon search
  Icon settings
```

*The slim rail mini-drawer: a thin (~56px) in-flow icon strip.*

```wireframe
Drawer top
  Typography "Tab A"
  Typography "Tab B"
```

*A top pin reads horizontal: a wide short bar laying its children in a row.*

```wireframe
Drawer overlay left
  List
    ListItem "Home"
    ListItem "Profile"
    ListItem "Settings"
```

*The floating overlay variant: out of flow, pinned full-height, with a border and shadow.*

```wireframe
Drawer crosshatch denseBackground divider=false
  Typography "Palette"
```

*Opaque crosshatch tint, packed dense, with the content-facing seam suppressed.*

### Link

Inline hyperlink text: a non-block leaf that sizes to its label rather than stretching, drawn on its baseline with an underline rule just beneath to read as a link. The keyless label is the visible text and a keyless `variant` scales the font off the shared Typography scale (default `inherit`, which falls back to the inherited base size); pair it with the universal `to=#id`/`href=#id` to point at a frame. The underline is drawn by default and is suppressed only by `underline=none`.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | The visible link text, resolved keyless from the bare/quoted string literal (the first keyless slot). With no label (and no filler) the leaf falls back to the placeholder text "link". |
| underline | enum | none, hover, always | always | no |  | Underline behavior: none, hover, or always (default). underline=none suppresses the rule. Keyed only -- underline=true and bare values throw. |
| variant | enum | h1, h2, h3, h4, h5, h6, subtitle1, subtitle2, body1, body2, caption, overline, button | inherit | yes |  | Typography scale that scales the rendered font, resolved keyless (the second keyless slot, order-independent with the label). One of h1-h6, subtitle1/2, body1/2, caption, overline, button; defaults to `inherit`, which is not a scale key and so falls back to the base (body) size. |
| filler | enum | squiggle, lorem, blocks |  | no |  | Greeking style for a link with no label: squiggle, lorem, or blocks (keyed, e.g. filler=lorem). With neither a label nor filler the link draws the word "link". |

**Examples**

```wireframe
Link "Forgot password?"
```

*A plain inline link with the default underline.*

```wireframe
Link "Sign up" to=#register
```

*Label plus a nav anchor to the #register frame (the facade wraps it in an &lt;a>).*

```wireframe
Link "Read the docs" h4
```

*Keyless variant bumps the font up the Typography scale to h4 size.*

```wireframe
Link "Plain text" underline=none
```

*Suppress the underline rule, leaving bare label text.*

```wireframe
Link "Terms" body2 to=#terms
```

*Smaller body2 link wired to a frame; label and variant are order-independent.*

### MenuItem

A single label in a horizontal menu bar (File / Edit / View). MenuItem is an inline leaf sized to its label rather than stretched to fill the bar, so it reads as a top-level menu word, not a full-width dropdown row. A selected item gets a light hand-drawn hatch tint across its box, and a disabled one draws its label in muted ink. With no label it falls back to the placeholder "Menu".

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | The menu label text, set keyless as a bare quoted string (the single literal slot) or keyed as label=. Unset, it falls back to the placeholder "Menu"; a second quoted string is an error. |
| selected | boolean |  | false | yes |  | Keyless boolean flag marking the highlighted item; draws a borderless hand-drawn hatch tint across the box. Defaults to false (absent when omitted). |
| disabled | boolean |  | false | yes |  | Keyless boolean flag for the inactive state; renders the label in muted ink. Defaults to false (absent when omitted). |

**Examples**

```wireframe
Stack row
  MenuItem "File"
  MenuItem "Edit"
  MenuItem "View"
```

*A row of menu-bar labels, each sized to its own text.*

```wireframe
Stack row
  MenuItem "File" selected
  MenuItem "Edit"
```

*The highlighted item, drawn with a hand-drawn hatch tint.*

```wireframe
Stack row
  MenuItem "Edit"
  MenuItem "Format" disabled
```

*A disabled item, its label in muted ink.*

```wireframe
Stack row
  MenuItem "Home" to=#next
```

*A navigating item: to= links the label to another frame.*

```wireframe
Stack row
  MenuItem label="Help"
```

*The label given keyed instead of as a bare quoted string.*

### Menubar

A horizontal application menu bar -- the classic File/Edit/View strip. It holds MenuItem children, laid out in a row, and draws its own chrome: a faint surface fill across the full bar plus a heavier bottom rule dividing it from the content below. It is an AppBar-lite -- unlike AppBar it does not hatch its region, and unlike a Toolbar it is not invisible. It declares no props; per-item selected/disabled state lives on each MenuItem, and an empty Menubar still renders its bar chrome.

*Accepts children: yes*

No configurable properties.

**Examples**

```wireframe
Menubar
  MenuItem "File"
  MenuItem "Edit"
  MenuItem "View"
```

*The classic File/Edit/View menu strip.*

```wireframe
Menubar
  MenuItem "File" selected
  MenuItem "Edit"
  MenuItem "Help" disabled
```

*Per-item state: File highlighted (hatch tint), Help muted (disabled).*

```wireframe
Menubar
```

*An empty bar still draws its fill and bottom rule.*

```wireframe
Menubar
  MenuItem "File" to=#open
  MenuItem "Edit"
  MenuItem "View"
```

*A menu item wired to a target frame via to=#id.*

### Tabs

A strip of Tab labels with a faint hand-drawn baseline indicator rule, used to switch between views. A horizontal Tabs (the default) lays its child Tabs in a row with the baseline along the bottom edge; orientation=vertical stacks them in a column with the rule on the right edge. The variant prop (standard | scrollable | fullWidth) parses but is best-effort at wireframe fidelity -- the engine can't re-flex a child or scroll a static SVG, so each Tab still sizes to its own label. Children are Tab elements, which size to their labels and carry no selected indicator (the baseline rule is the strip's own chrome).

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| orientation | enum | horizontal, vertical | horizontal | yes |  | Layout axis of the strip, written keyless or keyed (orientation=): horizontal (default) lays the tabs in a row with the baseline along the bottom edge, vertical stacks them in a column with the rule on the right edge. Defaults aren't injected, so a bare Tabs has no orientation prop and reads as horizontal. |
| variant | enum | standard, scrollable, fullWidth | standard | yes |  | Strip style, written keyless or keyed (variant=): standard (default), scrollable, or fullWidth. Best-effort only -- scrollable and fullWidth parse but a parent can't re-flex its Tabs nor scroll a static SVG, so each Tab still sizes to its own label. |

**Examples**

```wireframe
Tabs
  Tab "Overview"
  Tab "Details"
  Tab "Settings"
```

*A horizontal strip of three tabs with the baseline rule along the bottom.*

```wireframe
Tabs vertical
  Tab "Profile"
  Tab "Account"
  Tab "Billing"
```

*Vertical tabs stacked in a column; the indicator rule runs down the right edge.*

```wireframe
Tabs fullWidth
  Tab "All"
  Tab "Active"
  Tab "Archived"
```

*The fullWidth variant parses (best-effort); tabs still size to their labels.*

```wireframe
Tabs scrollable
  Tab "Jan"
  Tab "Feb"
  Tab "Mar"
  Tab "Apr"
  Tab "May"
```

*The scrollable variant parses; a static wireframe has no scroll affordance.*

```wireframe
Tabs
  Tab "Home" to=#home
  Tab "Search" to=#search
```

*Tabs as navigation: each Tab links to a frame via the universal to=#id.*

### Tab

One labeled tab within a `Tabs` strip. Keyless text is its label; an unlabeled Tab falls back to the filler default "Tab". A Tab is an intrinsic-width inline leaf (`block:false`), so it sizes to its own label rather than stretching the strip -- horizontal tabs sit side by side and vertical tabs stack, each at its own extent, with the strip's baseline chrome owned by `Tabs`. It draws no selected/underline indicator (the spec slice has no `selected` prop), and `to=#id` turns a tab into a navigation link.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | The tab's text, drawn as a centered label. Keyless (the bare quoted literal, e.g. `Tab "Overview"`) and also accepts the keyed form `label="..."`; at most one quoted literal lands here, so a second collides. Defaults to the filler "Tab" when unset. |

**Examples**

```wireframe
Tab "Overview"
```

*A single labeled tab.*

```wireframe
Tab
```

*Unlabeled: renders the filler default "Tab".*

```wireframe
Tabs
  Tab "Overview"
  Tab "Details"
  Tab "Settings"
```

*A horizontal strip of three tabs side by side.*

```wireframe
Tabs vertical
  Tab "Inbox"
  Tab "Sent"
```

*A vertical strip: tabs stack in a column.*

```wireframe
Tabs
  Tab "Home" to=#home
  Tab "Account"
```

*A tab as a navigation link via the universal to=#id.*

### Breadcrumbs

A horizontal navigation trail that lays its children (typically Link/Typography) out in a row and draws a muted separator glyph between each adjacent pair, e.g. Home / Library / Data. The separator defaults to "/" and can be any string. With 0 or 1 child there are no gaps, so no separator is drawn; per-link navigation is each child's own to=#id, not the trail's.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| separator | string |  | / | yes |  | The glyph drawn (muted, centered) in each gap between adjacent crumbs. Any string; default "/"; an empty string falls back to "/". Writable bare as a keyless literal (Breadcrumbs ">") or keyed (separator=">"). |

**Examples**

```wireframe
Breadcrumbs
  Link "Home" to=#home
  Link "Library"
  Typography "Data"
```

*Default "/" trail; the last crumb is plain Typography (current page) and earlier crumbs link.*

```wireframe
Breadcrumbs ">"
  Link "Home"
  Link "Reports"
  Typography "Q3"
```

*Custom ">" separator, written bare as a keyless literal.*

```wireframe
Breadcrumbs separator="/"
  Link "Files"
  Typography "readme.md"
```

*Same separator via the keyed form; a two-crumb trail draws one divider.*

### Stepper

A horizontal or vertical sequence of Step children with connector rules bridging the gaps between them. The keyless `orientation` enum drives the layout axis -- `vertical` stacks the Steps in a column, while horizontal (the default, and the fallback for any non-`vertical` value) lays them out in a row, exactly like Tabs. A faint connector rule is drawn in each gap between consecutive Steps, derived from their laid-out boxes; with fewer than two Steps there is no gap and nothing is drawn. Step numbering is not synthesized, so the connectors carry no numbers.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| orientation | enum | horizontal, vertical | horizontal | yes |  | Layout axis of the step sequence, one of horizontal \| vertical (default horizontal). `vertical` stacks Steps in a column with connectors running down the gaps; horizontal -- and any other non-`vertical` value -- rows them left-to-right. Keyless (a bare `vertical`/`horizontal` token) or keyed (`orientation=vertical`). |

**Examples**

```wireframe
Stepper
  Step "Cart"
  Step "Address"
  Step "Payment"
```

*A horizontal three-step strip with two connector rules between the steps.*

```wireframe
Stepper vertical
  Step "Account"
  Step "Profile"
  Step "Done"
```

*Stacked column layout; the connector runs down each gap.*

```wireframe
Stepper orientation=vertical
  Step "One"
  Step "Two"
```

*Same vertical layout via the keyed spelling of orientation.*

```wireframe
Stepper
  Step "Only"
```

*A single Step has no gap to bridge, so no connector is drawn.*

### Step

One stage in a Stepper: a state circle followed by its label. Three render states are real and distinct -- plain (light ring + centre dot), active (heavier ring + dot, bolder label), and completed (filled circle + check mark). Because the engine hands a Step only its own node, it cannot know its position, so the circle is always a dot or check, never an auto-incremented index. It is a leaf (block:false) that sizes to its circle + label and does not stretch the Stepper's cross axis; it takes no children (any nested content is dropped).

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | The stage name drawn to the right of the circle. Written bare or quoted as the keyless literal (Step "Address"), or with the keyed label= form (label="Address") -- both resolve. Defaults to "Step", filled in at render time rather than injected by the resolver (the prop stays unset on the node when omitted). |
| active | boolean |  | false | yes |  | Marks the current step: a heavier circle stroke and a bolder label. Keyless boolean flag -- bare `active` sets it true (or keyed active=true/false). Schema default is false, but the prop is left unset on the node when omitted. |
| completed | boolean |  | false | yes |  | Marks a finished step: a filled circle with a two-stroke check instead of the dot. Keyless boolean flag -- bare `completed` sets it true (or keyed completed=true/false). Schema default is false, but the prop is left unset on the node when omitted. |

**Examples**

```wireframe
Stepper
  Step "Cart" completed
  Step "Address" active
  Step "Payment"
```

*A checkout Stepper: one done, one active, one upcoming.*

```wireframe
Step "Shipping"
```

*A plain step -- light ring, centre dot.*

```wireframe
Step "Review" active
```

*The current step -- heavier ring, bolder label.*

```wireframe
Step "Cart" completed
```

*A finished step -- filled circle with a check mark.*

```wireframe
Step completed "Done" active
```

*Label and both flags resolve in any token order.*

### Pagination

A row of numbered page cells flanked by prev/next chevrons. It is an inline leaf that draws its own chrome: square cells numbered 1..count, the current page cell tinted with a hatch accent, plus a `<` cell on the left and a `>` cell on the right. Width grows with `count` (one cell per page); an out-of-range `page` simply highlights nothing rather than erroring. Both props are keyed-only and the control accepts no sizing tokens.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| count | numeric |  | 1 | no |  | Number of page cells, drawn as squares numbered 1..count between the two chevrons; more pages make the control wider. Keyed only (a bare number throws). Fractional values floor to whole cells (min 1); defaults to 1. |
| page | numeric |  | 1 | no |  | Which page cell is the current one, drawn with a hatch accent tint and bold label. Keyed only (a bare number throws). A value outside 1..count highlights nothing and renders cleanly; defaults to 1 (highlighting the first cell). |

**Examples**

```wireframe
Pagination
```

*Bare default: a single numbered cell between the two chevrons.*

```wireframe
Pagination count=5
```

*Five page cells (1-5); page 1 is the current, tinted cell by default.*

```wireframe
Pagination count=7 page=3
```

*Seven pages with page 3 highlighted as the current page.*

```wireframe
Pagination count=10 page=10
```

*Ten pages with the last page selected.*

```wireframe
Stack column
  List
  Pagination count=6 page=2
```

*Pager beneath a list in a column; sizes to its cells rather than stretching.*

### BottomNavigation

The fixed bottom bar of a mobile layout, holding a row of BottomNavigationAction items that split its width equally (each Action declares flex:true). It renders a full-width paper surface with a hand-drawn muted divider rule along its top edge, and as a container it stretches to fill its parent's cross axis by default, so dropping it straight under a frame yields the classic edge-to-edge bottom bar. Its value and showLabels props parse and round-trip onto node.props but are best-effort at wireframe fidelity: a parent prop cannot reach its child Actions in this engine (a strategy sees only its own node), so Actions always draw their own labels regardless.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| value | string |  |  | no | v, val | Names the currently selected Action; keyed and quoted only (aliases v, val) -- there is no keyless slot, so a bare quoted literal throws "does not take a text literal" and a bare unquoted token throws "must be quoted". No default. Parse-only: it round-trips onto node.props but cannot restyle the child Actions in this engine. |
| showLabels | boolean |  | false | no |  | Whether the Actions show their labels; keyed (showLabels=true) or as a bare flag (showLabels), defaulting to false. Parse-only: Actions always draw their own label regardless, since a parent prop cannot reach a child here. |

**Examples**

```wireframe
BottomNavigation
  BottomNavigationAction "Home" icon="Home"
  BottomNavigationAction "Search" icon="Search"
  BottomNavigationAction "Profile" icon="Person"
```

*A three-destination bottom bar; the Actions split the bar width equally.*

```wireframe
BottomNavigation value="search"
  BottomNavigationAction "Home" icon="Home"
  BottomNavigationAction "Search" icon="Search"
```

*value names the selected Action (keyed and quoted; parse-only).*

```wireframe
BottomNavigation showLabels
  BottomNavigationAction "Recents" icon="History"
  BottomNavigationAction "Favorites" icon="Favorite"
  BottomNavigationAction "Nearby" icon="LocationOn"
```

*showLabels as a bare flag (parse-only; Actions still draw their labels).*

```wireframe
BottomNavigation v="home" showLabels
  BottomNavigationAction "Home" icon="Home"
  BottomNavigationAction "Cart" icon="ShoppingCart"
  BottomNavigationAction "Account" icon="Person"
```

*value (via the v alias) and showLabels set together, in any order.*

### BottomNavigationAction

One destination in a BottomNavigation bar, drawn as the classic mobile stack: a small icon on top with its label centered beneath. The keyless quoted literal is the label; icon= takes an icon NAME that renders as clean vector artwork when known and falls back to the placeholder glyph (a bordered box with a diagonal mark) when unknown or unset (an unknown name also emits a soft diagnostic). As a flex leaf, sibling Actions split the bar width equally, and an Action always draws its own label since the parent's showLabels/value never reach a child.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | The caption drawn beneath the icon, written as the keyless quoted literal (e.g. BottomNavigationAction "Home"). Defaults to undefined, in which case the Action draws just its icon with no label band. A long label widens the box; the stack height is fixed. |
| icon | icon |  |  | no |  | Keyed icon NAME for the glyph above the label (PascalCase, bare or quoted -- icon=Home and icon="Home" are equivalent). A known name renders clean vector artwork; an unknown or omitted name falls back to the placeholder glyph (an unknown name also emits a soft diagnostic). Keyed only -- a second bare quoted literal is rejected, not treated as the icon. |

**Examples**

```wireframe
BottomNavigation
  BottomNavigationAction "Home" icon=Home
  BottomNavigationAction "Search" icon=Search
  BottomNavigationAction "Profile" icon=Person
```

*A three-tab bottom bar; the Actions split its width equally.*

```wireframe
BottomNavigationAction "Home" icon=Home
```

*A single labelled Action with a known icon, drawn as clean vector artwork.*

```wireframe
BottomNavigationAction "Search"
```

*Label only; the unset icon slot draws the placeholder glyph.*

```wireframe
BottomNavigationAction icon=Favorite
```

*Icon-only Action: no quoted literal, so no label text under the glyph.*

```wireframe
BottomNavigation
  BottomNavigationAction "Home" icon=Home to=#home
  BottomNavigationAction "Alerts" icon=Notifications to=#alerts
```

*Each tab links to a screen via the universal to=#id, wrapping the Action in an anchor.*

## Content

### Typography

Text -- the wireframe's type leaf, covering everything from page headings to muted captions to placeholder copy. A bare token is the text literal (the label); two keyless enums, `variant` (font size/role, defaults to `body1`) and `align`, set in any order, plus a keyless `noWrap` flag. With a label and no `noWrap`, text word-wraps to its container's known width (the default) in columns and grids; in rows -- which measure children without a width -- and under `noWrap`, it stays one line trimmed with a trailing ellipsis. The `caption` variant draws in the muted/disabled ink so it reads as de-emphasized, and a bare `~N` with no label renders N rows of filler at the variant's size -- squiggle strokes by default, real-ish lorem words under `filler=lorem`. Typography takes no sizing token (no positional width/height); its box is intrinsic to the text.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | The text to draw, given bare as the keyless string literal (e.g. Typography "Sign in"). Omit it and pass a bare ~N amount instead to render filler rows rather than a string. |
| variant | enum | h1, h2, h3, h4, h5, h6, subtitle1, subtitle2, body1, body2, caption, overline, button | body1 | yes |  | Type role, keyless: one of h1, h2, h3, h4, h5, h6, subtitle1, subtitle2, body1, body2, caption, overline, button. Drives the font size (h1-h6 also draw bold); defaults to body1, and caption inks in the muted/disabled color. |
| align | enum | inherit, left, center, right, justify | inherit | yes |  | Horizontal placement within the box, keyless or keyed (a bare `center` or `align=center` both work): inherit, left, center, right, or justify. center anchors at the midpoint, right at the trailing edge, and left/justify/inherit at the left edge (justify degrades to left at sketch fidelity). Defaults to inherit (left). |
| noWrap | boolean |  | false | yes |  | Keyless boolean flag (bare noWrap or noWrap=true): pins the single-line form -- one line trimmed to the box with a trailing ellipsis. Defaults to false, which lets a too-wide label word-wrap to the container's known width. |
| filler | enum | squiggle, lorem, blocks |  | no |  | Greeking style for placeholder body text: squiggle, lorem, or blocks (keyed, e.g. filler=lorem; blocks currently renders like squiggle). The universal ~N sigil is the usual shorthand. |

**Examples**

```wireframe
Typography "Sign in"
```

*Default body1 text on one line.*

```wireframe
Typography h4 "Account settings"
```

*A bold h4 section heading (larger variant = larger font).*

```wireframe
Typography caption "Last saved 2 minutes ago"
```

*A caption, drawn in muted ink as de-emphasized helper text.*

```wireframe
Typography "Centered title" center noWrap
```

*Center-anchored, pinned to a single line that trims with an ellipsis if it overflows.*

```wireframe
Typography ~3
```

*No label: three rows of squiggle filler at body1 size.*

```wireframe
Typography ~2 filler=lorem
```

*Two filler rows rendered as real-ish lorem words instead of squiggles.*

### Button

A clickable action control whose keyless quoted text becomes its label. Three variants set the look: contained fills a hand-drawn hatch tint under a bold label, outlined draws a bordered surface, and text (the default) draws just the label with no chrome. The label is optional -- a lone startIcon/endIcon with no label renders a compact, roughly square icon button, while a bare Button shows the "Button" placeholder. disabled mutes the whole control, fullWidth stretches it to fill the container cross axis, and to=#id (href= alias) makes it navigate.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | Visible button text, the keyless string literal (`Button "Save"`). Optional: omitting it with an icon present makes an icon-only button, and a bare Button shows the "Button" placeholder. The keyed form requires quoting (`label="Save"`); a bare `label=Save` throws. |
| variant | enum | text, outlined, contained | text | yes |  | Visual style, a keyless enum: `contained` (hatch-tinted fill + bold label), `outlined` (bordered surface), or `text` (label only, no chrome). Defaults to `text`. |
| size | enum | small, medium, large | medium | yes |  | Scale of padding and label font, a keyless enum: `small`, `medium`, or `large`. Defaults to `medium`. Disjoint from variant/background, so the keyless tokens are order-independent. |
| disabled | boolean |  | false | yes |  | Mutes the whole button (chrome, icons, and label) to the muted ink. A keyless flag (`disabled`) or keyed (`disabled=true`/`disabled=false`); defaults to false (absent). |
| startIcon | icon |  |  | no |  | Icon drawn just inside the left edge before the label, an icon NAME (PascalCase, bare or quoted as the value). Keyed only (`startIcon=Send`); a bare `Send` token throws. With no label it becomes an icon-only button. Unknown names draw the placeholder square and warn. |
| endIcon | icon |  |  | no |  | Icon drawn just inside the right edge after the label, an icon NAME (bare or quoted as the value). Keyed only (`endIcon=ArrowForward`); contributes to the icon-only button when no label is given. |
| fullWidth | boolean |  | false | yes |  | Stretches the button to fill the container cross axis like a block leaf instead of sizing to its label. A keyless flag (`fullWidth`) or keyed (`fullWidth=true`/`fullWidth=false`); defaults to false. |
| background | enum | hatch, crosshatch, none | hatch | yes |  | Hatch pattern for the contained tint, a keyless enum: `hatch` (default diagonal), `crosshatch` (both diagonals), or `none` (opaque untextured fill over the opaque paper base). Defaults to `hatch`; only affects `variant=contained`. |
| denseBackground | boolean |  | false | yes |  | Packs the contained hatch lines closer together for a denser tint. A keyless flag (`denseBackground`) or keyed (`denseBackground=true`); defaults to false. Only affects `variant=contained`. |

**Examples**

```wireframe
Button "Save"
```

*Default text variant: just a centered label, no chrome.*

```wireframe
Button "Save" contained
```

*Filled primary look via the hatch-tinted contained variant.*

```wireframe
Button "Cancel" outlined large
```

*Large bordered (outlined) button; variant and size are order-independent keyless enums.*

```wireframe
Button "Sending..." contained disabled
```

*A muted, disabled contained button.*

```wireframe
Button "Send" contained startIcon=Send
```

*Label with a leading icon adornment (startIcon is keyed; its value is bare or quoted).*

```wireframe
Button startIcon=Edit
```

*Icon-only button: an icon with no label draws a compact, square glyph button.*

### Img

A placeholder image drawn as the classic crossed-box. It carries the full box sizing vocabulary (pixel / percent / flex `w h` tokens) plus a keyed `ratio=` for aspect (e.g. 16:9), `alt=` descriptive text, and a metadata-only `src=`. As a block leaf it fills its container's cross axis like a stretched `<img>` (its 160x120 intrinsic only shows in full when nothing constrains that axis). Sizing precedence layers `ratio` on top of the box model: with both dimensions pinned the explicit sizes win and ratio is ignored; with exactly one explicit `px`/`%` dimension the ratio derives the other; with ratio alone the cross axis fills while the main extent is ratio-derived (a `*`/flex dimension counts as "fill", not an explicit dimension).

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| width | size |  | content | yes | w | Footprint width (px \| % \| * \| flex), the first positional sizing token (e.g. `Img 200`, `Img 100%`); the keyed forms `width=`/`w=` throw "unknown property". When it is the only explicit `px`/`%` dimension, `ratio` derives the height from it (a `*`/flex width counts as fill, not an explicit dimension). |
| height | size |  | content | yes | h | Footprint height, the second positional sizing token (e.g. `Img 300 200`); the keyed forms `height=`/`h=` throw "unknown property". With both width and height pinned, `ratio` is ignored. |
| ratio | ratio |  |  | no |  | Aspect ratio like `16:9`, keyed only (`ratio=16:9`); a bare `16:9` token throws "unexpected token". Governs only when at most one dimension is pinned: with one explicit `px`/`%` dimension it derives the other, with none the cross axis fills and the main extent is ratio-derived. |
| alt | string |  |  | no |  | Descriptive alternative text (e.g. `alt="Hero banner"`), keyed only; a quoted bare string throws "does not take a text literal". Metadata that does not change the rendered placeholder. |
| src | string |  |  | no |  | The real image source (e.g. `src="hero.png"`), keyed only. Metadata only -- a wireframe always draws the crossed-box placeholder regardless of source, so it never affects the render. |

**Examples**

```wireframe
Img
```

*A bare placeholder: as a block leaf its width fills the container's cross axis (the 160x120 intrinsic is the fallback), with the 80x60 floor keeping an unconstrained one from collapsing.*

```wireframe
Img ratio=16:9
```

*No size given: the cross axis fills its container and the main extent is derived to keep 16:9 proportions.*

```wireframe
Img 200 ratio=16:9
```

*One explicit width (200px); the 16:9 ratio derives the height (112.5px).*

```wireframe
Img 300 200
```

*Both dimensions pinned as positional sizing tokens; an exact 300x200 box.*

```wireframe
Img 100% alt="Hero banner"
```

*Full-width banner with descriptive alt text.*

```wireframe
Stack row
  Img 50% ratio=16:9
  Img 50% ratio=16:9
```

*Two half-width thumbnails side by side, each height derived from 16:9.*

### Placeholder

A stand-in box for something undecided. It draws exactly Img's no-image look (a bordered box with two crossing diagonals) and overlays an optional centered label with a finer, muted description beneath it. With no label and no description it is a pure crossed box, identical to a bare Img. It carries box-style sizing tokens, so an author reserves space directly; an unconstrained Placeholder defaults to a comfortable 160x120 and is floored so it never collapses, while each text line is trimmed to the box width so a small placeholder ellipsizes instead of spilling past the outline.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| width | size |  | content | yes | w | Footprint width as a positional sizing token (px \| % \| * \| flex) -- the first bare sizing token, e.g. `Placeholder 240 80`. The keyed forms `width=`/`w=` are not accepted. Defaults to the intrinsic 160px; an unconstrained Placeholder is floored at 80px so it never collapses, but an explicit token (even below the floor) always wins. |
| height | size |  | content | yes | h | Footprint height as a positional sizing token (px \| % \| * \| flex) -- the second bare sizing token. The keyed forms `height=`/`h=` are not accepted. Defaults to the intrinsic 120px; an unconstrained Placeholder is floored at 72px, but an explicit token (even below the floor) always wins. |
| label | string |  |  | yes |  | Primary centered caption drawn over the box in ink. Keyless (a bare string literal), and order-independent with the sizing tokens. Omitted by default, leaving a pure crossed box. |
| description | string |  |  | no |  | Secondary caption beneath the label in a finer, muted style. Keyed only (description=); a second bare literal is rejected. Omitted by default; renders centered on its own even without a label. |

**Examples**

```wireframe
Placeholder
```

*A pure crossed box at the default 160x120, no text.*

```wireframe
Placeholder "Chart goes here"
```

*Crossed box with a single centered label.*

```wireframe
Placeholder "Revenue" description="Q3 by region"
```

*Label over a finer, muted description, straddling the center.*

```wireframe
Placeholder 100% 200px "Hero image"
```

*Reserve a full-width, 200px-tall hero slot with a label.*

```wireframe
Placeholder 240 80
```

*An explicitly sized stand-in (px tokens), no text.*

```wireframe
Stack column
  Placeholder * "Map"
```

*In a column: fill the available width with a labeled stand-in.*

### Avatar

A small user/identity token rendering initials, an image placeholder, or a bare shape. Keyless text is the initials label (e.g. "RB"), and src= flips the chrome to a crossed-box image placeholder (a wireframe never draws the real image). The variant enum picks a genuinely different silhouette (circular, rounded, or square), and size scales the diameter, initials font, and corner radius together. An avatar keeps its intrinsic square footprint wherever it sits -- it does not stretch to the container -- and stays transparent unless a background tint is asked for.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | circular, rounded, square | circular | yes |  | Keyless enum picking the silhouette: circular (default), rounded, or square. Each draws a genuinely different shape (a hand-drawn circle, a rounded rect, or a sharp rect); the keyed form variant= also works. |
| size | enum | small, medium, large | medium | yes |  | Keyless enum scaling the square diameter, initials font, and rounded corner radius together: small (32px), medium (40px, default), or large (56px). The keyed form size= also works. |
| src | string |  |  | no |  | Keyed-only image source; must be quoted (a bare src= throws "must be quoted"). Its presence flips the chrome to a crossed-box image placeholder instead of initials, mirroring Img -- a wireframe never draws the real image. |
| label | string |  |  | yes |  | The initials text, centered inside the shape. It is the one keyless literal (e.g. Avatar "RB"); a keyed label= must also be quoted. Ignored when src= is set. |
| background | enum | hatch, crosshatch, none | hatch | yes |  | Keyless enum tinting the avatar with a hand-drawn hatch over an opaque paper base, shape-matched to the variant: hatch, crosshatch, or none (an opaque base with no hashes). Drawn only when set -- omit it and a bare avatar stays transparent. The keyed form background= also works. |
| denseBackground | boolean |  | false | yes |  | Keyless boolean flag (default false) that packs the background tint's hatch lines closer together for a denser look. |

**Examples**

```wireframe
Avatar "RB"
```

*Initials avatar at the default 40px medium circular size.*

```wireframe
Avatar "AB" rounded large
```

*A large rounded-rectangle avatar showing initials.*

```wireframe
Avatar square src="user.png"
```

*A square image placeholder (crossed box, no initials).*

```wireframe
Avatar "JS" small hatch
```

*A small avatar tinted with a single-diagonal hatch over an opaque base.*

```wireframe
Avatar circular crosshatch denseBackground
```

*A bare circular avatar with a dense crosshatch tint.*

```wireframe
Stack row
  Avatar "RB"
  Avatar "JS" rounded
  Avatar square src="u.png"
```

*A row mixing initials, a rounded avatar, and an image placeholder.*

### Chip

A compact label token rendered as a hand-drawn pill. Keyless text becomes the label; with no text it falls back to "Chip". The filled variant (the default) lays an opaque hatch-tinted base under the border, while outlined draws the border only and stays transparent. The size enum (medium default, or small) tightens both the pill padding and the label font. Because the two keyless enums (variant and size) have disjoint value domains, they can be written bare in any order.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | The pill's text, supplied as the bare keyless string literal (e.g. Chip "New"). With no label the chip falls back to the placeholder text "Chip". |
| variant | enum | filled, outlined | filled | yes |  | Fill style: filled (default) lays an opaque hand-drawn hatch tint under the border; outlined draws the border only and stays transparent. Keyless enum, written bare. |
| size | enum | small, medium | medium | yes |  | Pill scale: medium (default) or small, where small tightens both the padding and the label font. Keyless enum, written bare. |
| background | enum | hatch, crosshatch, none | hatch | no |  | Hatch pattern for the filled tint: hatch (default), crosshatch, or none (an opaque solid base with no hash lines). Keyed-only on this element -- write background=crosshatch; a bare value does not target it. Only affects the filled variant. |
| denseBackground | boolean |  | false | yes |  | Boolean flag (default false) that packs the filled tint's hatch lines closer together; written bare as denseBackground or keyed as denseBackground=true. Only affects the filled variant. |
| filler | enum | squiggle, lorem, blocks |  | no |  | Greeking style for a chip with no label: squiggle, lorem, or blocks (keyed, e.g. filler=lorem). A bare Chip with no label falls back to "Chip". |

**Examples**

```wireframe
Chip "New"
```

*A filled chip labeled New, at the default medium size.*

```wireframe
Chip "Beta" outlined
```

*Outlined variant: border only, transparent (no fill).*

```wireframe
Chip "On" filled small
```

*Small filled chip; variant and size are bare keyless enums in any order.*

```wireframe
Chip "Tag" background=crosshatch
```

*Filled tint drawn with the cross-hatch pattern instead of plain hatch (background is keyed-only).*

```wireframe
Chip "Solid" filled background=none
```

*Opaque but untextured fill: a solid base with no hatch lines.*

```wireframe
Chip "Dense" denseBackground
```

*Packs the filled tint's hatch lines closer together.*

### Icon

A single glyph drawn by name from the built-in Material icon set (plus any custom Icons-block or injected packs). A bare or quoted keyless token is the icon name (`Icon Search` === `Icon \"Search\"`); a resolved name draws clean vector artwork while an unknown or omitted name falls back to a muted placeholder glyph (a bordered square with a diagonal) and warns (an omitted name draws the same placeholder but does not warn). The glyph is a fixed square sized by `fontSize` (small/medium/large/inherit, default medium) that keeps its intrinsic footprint and does not stretch to its container's cross axis. Icon takes no box-sizing vocabulary: there is no width/height (keyed or positional) -- a bare number is read as an icon name, not a size.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| name | icon |  |  | yes |  | The icon name, bare or quoted (Icon Search is identical to Icon "Search"), drawn from the built-in Material set plus any custom icons (Icons block / injected packs); spelling is forgiving (AccountCircle and account_circle both resolve). A known name draws clean vector artwork; an unknown or omitted name draws the muted placeholder glyph and emits a soft warning. (The keyed form is name=.) |
| fontSize | enum | small, medium, large, inherit | medium | no | size | Glyph size: small (18px), medium (24px, default), large (36px), or inherit (no ambient size at sketch fidelity, so it falls back to medium). Keyed via fontSize= or its size= alias -- a bare token is read as the icon name, so this is keyed only. |

**Examples**

```wireframe
Icon
```

*Nameless icon: draws the muted placeholder glyph at medium size, with no warning.*

```wireframe
Icon Search
```

*The Material "Search" glyph; the name may be bare (equivalent to Icon "Search").*

```wireframe
Icon "Settings" fontSize=large
```

*Large (36px square) settings glyph; fontSize is keyed only.*

```wireframe
Icon "Delete" size=small
```

*Small (18px square) delete glyph, using the size= alias for fontSize.*

```wireframe
Icon "Favorite" fontSize=inherit
```

*inherit has no ambient size at wireframe fidelity, so it falls back to medium (24px).*

```wireframe
Stack row
  Icon "Home"
  Icon "Search"
  Icon "Settings"
```

*A row of icons; each keeps its own square footprint side by side.*

### List

A mostly-invisible vertical container that stacks ListItems in a flush column. By default it draws nothing of its own and uses zero padding and gap, so rows abut in the conventional list look (spacing between lists comes from the surrounding container). Two affordances add chrome: `dense` tightens the rows via a negative inter-row gap, and `subheader` reserves a top band and draws a small muted heading above the items.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| dense | boolean |  | false | yes |  | Tightens the list by applying a negative inter-row gap so the same items occupy less height. Boolean, defaults to false; settable as a bare `dense` flag (resolves to true) or keyed as `dense=true`. |

**Examples**

```wireframe
List
  ListItem "Home"
  ListItem "Reports"
  ListItem "Settings"
```

*Default flush column of three rows.*

```wireframe
List dense
  ListItem "Inbox"
  ListItem "Sent"
  ListItem "Drafts"
```

*Dense list: rows pulled tighter together.*

```wireframe
List subheader="Library"
  ListItem "Songs"
  ListItem "Albums"
  ListItem "Artists"
```

*A section heading drawn in a reserved band above the items.*

```wireframe
List dense subheader="Folders"
  ListItem "Documents"
  ListItem "Downloads"
```

*Dense rows under a subheader, combining both affordances.*

### ListItem

A single full-width list row. Keyless text is the row label (default "List item"); the row draws a left-padded, vertically centered label above a faint bottom divider, at a fixed 40px height. As a block leaf it stretches to fill its container's cross axis, so stacking several ListItems in a column reads as a contiguous list. A `to=#id` makes the whole row navigate (the link wrapper is added by the renderer, not the element).

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | Row text, written bare or quoted as the first keyless literal (e.g. ListItem "Home"). Defaults to "List item" when omitted; truncated with an ellipsis to fit the row width. |
| icon | icon |  |  | no |  | Not rendered by the current engine -- a ListItem draws its label only; a leading icon is not implemented (icon= is rejected). |
| filler | enum | squiggle, lorem, blocks |  | no |  | Accepted but inert on ListItem -- the row always draws its label ("List item" when unlabeled); filler=squiggle\|lorem\|blocks has no visual effect. Use the universal ~N sigil for placeholder rows. |

**Examples**

```wireframe
ListItem "Home"
```

*A labeled row with the bottom divider.*

```wireframe
ListItem "Inbox" to=#inbox
```

*A row that navigates to the #inbox anchor when clicked.*

```wireframe
ListItem ~3w
```

*An unlabeled placeholder row filled with three lorem words via the bare filler sigil.*

```wireframe
ListItem
```

*Bare row falls back to the default "List item" label.*

```wireframe
Stack column
  ListItem "Profile"
  ListItem "Settings"
  ListItem "Sign out" to=#login
```

*Several rows stacked into a contiguous list, the last one linking out.*

### Table

The outer chrome of the table family: a bordered surface that flush-stacks its TableHead/TableBody/TableFooter groups or bare TableRows into an edge-to-edge column (a col container with pad:0 gap:0). Table itself draws only the outline; rows supply their own divider rules and selected-row tint, and cells draw their labels. Columns line up only when every row has the same cell count, since each TableCell is equal-flex and splits its row's width identically; ragged rows do not align. An empty Table still renders as a visible bordered region (minimum 160x40) rather than collapsing.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| size | enum | small, medium | medium | yes |  | Density knob, the keyless enum small \| medium (the keyed size= form is also accepted). The schema default is medium, though the resolver injects no default, so an omitted size stays undefined. Parse-only: it resolves but carries no visual effect, because a child cell cannot read its Table's size through the layout engine, so both values lay out and draw identically. |

**Examples**

```wireframe
Table
  TableHead
    TableRow
      TableCell "Name"
      TableCell "Role"
  TableBody
    TableRow
      TableCell "Ada"
      TableCell "Engineer"
    TableRow
      TableCell "Grace"
      TableCell "Admiral"
```

*A header plus body; equal cell counts make the two columns align.*

```wireframe
Table small
  TableRow
    TableCell "Item"
    TableCell "Qty"
  TableRow
    TableCell "Bolts"
    TableCell "40"
```

*Bare rows with no Head/Body grouping; the small density is parse-only (no visual change).*

```wireframe
Table
  TableBody
    TableRow selected
      TableCell "Ada"
      TableCell "Engineer"
    TableRow
      TableCell "Grace"
      TableCell "Admiral"
```

*The first body row is selected, drawn with a light hatch tint.*

```wireframe
Table
  TableRow
    TableCell "Total" align=right
    TableCell "42" align=right
```

*Right-aligned cell labels for a numeric/summary row.*

```wireframe
Table
```

*An empty table still draws its bordered region at the 160x40 minimum.*

### TableHead

The header row-group of a Table: an invisible grouping container that stacks its TableRows flush (no padding, no gap) so the header abuts the body. It adds one bit of chrome the Table family otherwise omits -- a heavier full-width rule along its bottom edge, the classic line that sets a table's header off from its body -- drawn only when the head actually has rows, so an empty TableHead stays invisible. It takes no own properties: a child cannot read its parent Table's size or other props, so there is nothing here to vary.

*Accepts children: yes*

No configurable properties.

**Examples**

```wireframe
Table
  TableHead
    TableRow
      TableCell "Name"
      TableCell "Role"
  TableBody
    TableRow
      TableCell "Ada"
      TableCell "Engineer"
```

*A two-column table: the TableHead labels the columns above a TableBody row.*

```wireframe
TableHead
  TableRow
    TableCell "Product"
    TableCell "Price" align=right
    TableCell "Stock" align=center
```

*Header-only group with right- and center-aligned heading cells (align is keyed).*

```wireframe
Table
  TableHead
    TableRow
      TableCell "Date"
      TableCell "Amount"
  TableBody
    TableRow
      TableCell "Jun 1"
      TableCell "$42"
    TableRow selected
      TableCell "Jun 2"
      TableCell "$18"
```

*Header over a body whose second row is highlighted via the row's selected flag.*

### TableBody

The body row-group of a Table -- an invisible `col` container that stacks its TableRows flush, exactly like an HTML `<tbody>`. It draws nothing of its own: the surrounding Table supplies the outer border and each TableRow draws its own divider rule, so head/body/footer groups and the rows within them abut with no padding or gap. It has no properties; you size and align via the Table and the TableRows/TableCells it holds.

*Accepts children: yes*

No configurable properties.

**Examples**

```wireframe
Table
  TableHead
    TableRow
      TableCell "Name"
      TableCell "Role"
  TableBody
    TableRow
      TableCell "Ada"
      TableCell "Admin"
    TableRow
      TableCell "Linus"
      TableCell "Editor"
```

*Standard usage: a TableBody of data rows beneath a TableHead inside a Table.*

```wireframe
Table
  TableBody
    TableRow
      TableCell "Item"
      TableCell "Qty" align=right
    TableRow selected
      TableCell "Widget"
      TableCell "3" align=right
```

*Body-only table with a right-aligned column and one selected (hatched) row.*

```wireframe
TableBody
  TableRow
    TableCell "Standalone row"
    TableCell "groups flush"
```

*TableBody on its own, stacking rows flush even without a wrapping Table.*

### TableFooter

The footer row-group of a Table, holding the TableRows that summarize the body above (totals, subtotals). Like TableHead and TableBody, it is an invisible grouping container -- a transparent column that stacks its rows flush with pad:0 gap:0 so they abut and align with the head and body. It draws no chrome of its own (the enclosing Table supplies the outer border and each TableRow its own divider rule), and the spec declares no properties, so there is nothing to configure beyond the universal to= link.

*Accepts children: yes*

No configurable properties.

**Examples**

```wireframe
Table
  TableHead
    TableRow
      TableCell "Item"
      TableCell "Amount"
  TableBody
    TableRow
      TableCell "Widget"
      TableCell "$40"
  TableFooter
    TableRow
      TableCell "Total"
      TableCell "$40"
```

*A full table: head, one body row, and a footer total row aligned into the same two columns.*

```wireframe
Table
  TableBody
    TableRow
      TableCell "Subtotal"
      TableCell "$120"
  TableFooter
    TableRow
      TableCell "Tax"
      TableCell "$10"
    TableRow
      TableCell "Total"
      TableCell "$130"
```

*A footer with multiple summary rows (tax then total), stacked flush with no gap.*

```wireframe
TableFooter
  TableRow
    TableCell "Total"
    TableCell "$40"
```

*The footer group on its own, stacking a single summary row.*

```wireframe
TableFooter to=#summary
  TableRow
    TableCell "Total"
    TableCell "$40"
```

*Linking the whole footer to another frame with the universal to= anchor.*

### TableRow

One row of a Table, laying its TableCells out left-to-right with no padding or gap so equal-flex cells abut and -- for rows of equal cell count -- align into shared columns. A row holds cells, so it is a row container that stretches to the full table width and draws a faint bottom divider rule (like ListItem) so adjacent rows read as separated. A `selected` row additionally tints behind its cells with a light hand-drawn hatch to read as selected.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| selected | boolean |  | false | yes |  | When set, tints the row with a light hand-drawn hatch behind its cells -- the selected-row highlight. Keyless boolean: a bare `selected` token sets it true (the keyed `selected=true` also works). Defaults to false (unhighlighted). |

**Examples**

```wireframe
TableRow
  TableCell "Ada"
  TableCell "Eng"
  TableCell "Active"
```

*A plain three-cell row; the cells split the width evenly and abut into columns.*

```wireframe
TableRow selected
  TableCell "Grace"
  TableCell "Away"
```

*A selected row, tinted with a light hatch behind its cells.*

```wireframe
Table small
  TableHead
    TableRow
      TableCell "Name"
      TableCell "Role"
  TableBody
    TableRow
      TableCell "Ada"
      TableCell "Eng"
    TableRow selected
      TableCell "Grace"
      TableCell "Eng"
```

*Rows in context: a header row plus a body whose second row is selected; equal cell counts align the columns.*

### TableCell

One cell of a table row, rendered as a text leaf: keyless text is the cell label, defaulting to "Cell" when omitted. It carries flex:true so equal-count sibling cells split their TableRow's width evenly, which is what aligns columns across rows. The keyed `align` prop anchors the label left, center, or right within the cell. Despite being a Content element it draws only its own label -- arbitrary nested children are dropped at wireframe fidelity.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| align | enum | left, center, right | left | no |  | Anchors the label within the cell box: `left` (text-anchor start, at the left inset), `center` (middle of the box), or `right` (end, at the trailing inset). Keyed only (`align=...`) -- a bare alignment token throws `unexpected token`; an unset align is absent (the resolver injects no default) and the strategy treats it as `left`. An out-of-domain value throws. |

**Examples**

```wireframe
Table
  TableRow
    TableCell "Name"
    TableCell "Role"
    TableCell "Status"
```

*Three header cells in a row; equal flex splits the width into aligned columns.*

```wireframe
Table
  TableHead
    TableRow
      TableCell "Name"
      TableCell "Amount" align=right
  TableBody
    TableRow
      TableCell "Ada"
      TableCell "$42.00" align=right
```

*Right-aligned numeric column kept consistent in the head and body rows.*

```wireframe
TableCell "Centered" align=center
```

*A standalone cell with its label anchored at the box midpoint.*

```wireframe
TableCell
```

*Bare cell with no label falls back to the default "Cell" text.*

```wireframe
Table
  TableRow
    TableCell ~2 filler=lorem
    TableCell ~3 filler=lorem
```

*Placeholder cells filled with lorem text via the bare ~amount and filler style.*

### Badge

A small, standalone notification indicator token. The default `standard` variant is a hand-drawn rounded pill carrying a short count or label; the `dot` variant is a tiny contentless ink-filled circle that ignores any content. Because this engine has no anchor-to-sibling overlay, a Badge renders as the indicator itself, inline like any other leaf -- not floated over a wrapped child (children=false); compose it next to an icon in your own layout. A bare Badge falls back to the count "3" so it always reads as a token.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| badgeContent | string |  |  | yes |  | The count/label drawn inside the standard pill, written as a quoted string literal (keyless, e.g. `Badge "9"`; the keyed `badgeContent="9"` also works). Not free text -- a filler token (`~5`, `___`) hard-errors. Defaults to "3" when omitted; ignored entirely by the `dot` variant. |
| variant | enum | standard, dot | standard | yes |  | Shape of the indicator: `standard` (a rounded pill carrying badgeContent) or `dot` (a small contentless circle). Keyless bare token (`Badge dot`) or keyed (`variant=dot`); defaults to `standard`. |

**Examples**

```wireframe
Badge
```

*Bare standard pill, falling back to the count "3".*

```wireframe
Badge "9"
```

*Standard pill carrying an explicit count.*

```wireframe
Badge "99+"
```

*Pill with a longer label; the pill widens to fit its content.*

```wireframe
Badge dot
```

*The dot variant: a tiny solid circle with no text.*

```wireframe
Badge "5" dot
```

*Order-independent tokens; the dot variant ignores the content string.*

## Inputs

### TextField

A single-line or multiline text input with an optional label. The label is optional; when set it rests inside the empty outlined/filled field and floats onto the top border (small, with a paper knockout) once a value or placeholder shows -- the standard variant drops the label instead of floating. Three variants (outlined default, filled, standard underline-only) cross with size (medium default, small), and error/disabled/required states; value/defaultValue ink the field while placeholder shows faintly only when empty, helperText sits below, and startIcon/endIcon plus a select caret are edge adornments. Always fills its column (block), so it has no positional width/height tokens.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | Field label, keyless (the single bare string slot). Optional: absent it draws nothing and reserves no space. Outlined/filled, it rests inside the empty field then floats small onto the top border once a value or placeholder shows; standard drops it instead of floating. |
| variant | enum | outlined, filled, standard | outlined | yes |  | Field chrome, keyless enum: outlined (default, full box), filled (box with a tinted hatch), or standard (bottom underline only). |
| value | string |  |  | no | v, val | In-field content, inked on the first row; aliases v and val. Keyed only -- a bare string is read as the label. A value also wins over a placeholder. |
| defaultValue | string |  |  | no |  | Fallback in-field content, rendered like a value when no value is set. Keyed only. |
| multiline | boolean |  | false | yes |  | Boolean flag (written bare); default false. Grows the field to multiple rows. Without rows= a multiline field spans 3 rows. |
| required | boolean |  | false | yes |  | Boolean flag (written bare); default false. Appends a ' *' marker to the label. |
| placeholder | string |  |  | no |  | Faint prompt text shown only when there is no value/defaultValue; keyed only. A placeholder (like a value) also floats the outlined/filled label. |
| helperText | string |  |  | no | helper | Sub-text drawn below the field; keyed, alias helper. Tints red in the error state. |
| error | boolean |  | false | yes |  | Boolean flag (written bare); default false. Tints the field border and helper text red (error wins over disabled for the stroke). |
| disabled | boolean |  | false | yes |  | Boolean flag (written bare); default false. Mutes the border/text gray and tints the fill. |
| rows | numeric |  |  | no |  | Visible text rows for a multiline field (rows=4). Ignored unless the field is multiline; a multiline field with no rows shows 3. The prop carries no default of its own. |
| size | enum | small, medium | medium | yes |  | Field height, keyless enum: medium (default) or small (shorter field). |
| startIcon | icon |  |  | no |  | Icon name (PascalCase, forgiving spelling), drawn just inside the leading edge and reserving its width. Keyed only -- a bare token is the label, not an icon. |
| endIcon | icon |  |  | no |  | Icon name drawn just inside the trailing edge, reserving its width. Keyed only. Claims the right slot, so it suppresses the select caret there. |
| select | boolean |  | false | no |  | Boolean flag (written bare); default false. Draws a dropdown caret on the trailing edge (unless an endIcon already claims that slot). |
| fullWidth | boolean |  | false | yes |  | Boolean flag (written bare); default false. Accepted but inert in v0.1 -- a TextField always fills its column via block layout regardless. |
| background | enum | hatch, crosshatch, none | hatch | no |  | Hand-drawn fill pattern for the filled variant: hatch (default), crosshatch, or none (opaque, untextured). Keyed only -- write background=crosshatch; a bare token throws. |
| denseBackground | boolean |  | false | yes |  | Boolean flag (written bare); default false. Tightens the hatch spacing of the field tint (filled/disabled only). |
| filler | enum | squiggle, lorem, blocks |  | no |  | Greeking style for the field's value text: squiggle, lorem, or blocks (keyed, e.g. filler=lorem). |

**Examples**

```wireframe
TextField "Email"
```

*Default outlined field; the label rests inside the empty box.*

```wireframe
TextField "Email" value="jane@x.com" helper="We never share it"
```

*A value floats the label onto the border; helper text sits below.*

```wireframe
TextField "Password" required error=true helper="Too short"
```

*Required (appends *) and in the error state -- border and helper tint red.*

```wireframe
TextField "Bio" filled multiline rows=4 placeholder="Tell us about yourself"
```

*A filled, 4-row multiline field with a faint placeholder.*

```wireframe
TextField "Search" standard small startIcon=Search
```

*Compact standard (underline-only) field with a leading search icon.*

```wireframe
TextField "Country" select value="United States"
```

*A select-style field draws a dropdown caret on the trailing edge.*

### Control

A single selection input that subsumes the old Checkbox and Switch. The variant picks the glyph -- a checkbox (square with a two-stroke tick when checked), a radio (ring with a centered filled dot), or a switch (pill track with a knob that slides left-off / right-on); checked and disabled are state flags, and size scales the glyph. It is an input leaf that keeps its intrinsic footprint in a row rather than stretching to the container, so a checkbox/radio is square and a switch is a wider pill. A checked switch tints its track with a hand-drawn hatch; disabled mutes the strokes (and the switch's hatch) to gray.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | radio, checkbox, switch | checkbox | yes |  | Selects the glyph: radio \| checkbox \| switch. Keyless enum; defaults to checkbox. Disjoint from size, so token order is free (e.g. `Control switch large` or `Control large switch`). |
| checked | boolean |  | false | yes |  | Marks the selected/on state -- adds the tick (checkbox), the dot (radio), or hatches the track and slides the knob right (switch). Keyless boolean flag (bare `checked`); the keyed `checked=true`/`checked=false` form also works. Defaults to false. |
| disabled | boolean |  | false | yes |  | Recolors the strokes (and a checked switch's hatch) to the muted ink. Keyless boolean flag (bare `disabled`), keyed form also accepted. Defaults to false. |
| size | enum | small, medium, large | medium | yes |  | Scales the glyph: small \| medium \| large (multipliers 0.78 / 1 / 1.25). Keyless enum, disjoint from variant; defaults to medium (matching the ported original at 1x). |
| background | enum | hatch, crosshatch, none | hatch | no |  | Tint pattern for the checked switch track: hatch (single diagonal, default), crosshatch (both diagonals), or none (opaque, untextured). Keyed only -- write background=crosshatch; a bare token throws. |
| denseBackground | boolean |  | false | yes |  | Packs the checked switch track's hatch lines closer together. Keyless boolean flag (bare `denseBackground`), keyed form (`denseBackground=true`) also accepted; defaults to false and only affects a checked switch. |

**Examples**

```wireframe
Control
```

*Bare default: an unchecked, medium checkbox.*

```wireframe
Control checked
```

*Checked checkbox -- the two-stroke tick appears.*

```wireframe
Control radio checked
```

*Radio button with its centered filled dot (selected).*

```wireframe
Control switch checked
```

*Switch in the on state: knob right, track hatched.*

```wireframe
Control switch checked disabled
```

*Disabled on-switch -- track and knob recolor to muted gray.*

```wireframe
Control switch checked background=crosshatch denseBackground
```

*On-switch whose track tint is a denser cross-hatch pattern.*

```wireframe
Control large disabled
```

*A large, disabled checkbox (variant/size keyless, any order).*

```wireframe
Stack row
  Control checkbox checked
  Control radio
  Control switch checked
```

*All three variants side by side, each keeping its intrinsic size in a row.*

### Select

A dropdown form control. A bare Select draws a closed, outlined field with a faint placeholder and a ▾ caret; keyless text sets the field label and a keyless variant (outlined|filled|standard) styles the field border like TextField (filled adds a hatch tint, standard draws just a bottom rule). Set value= to show a chosen entry inside the field -- on outlined and filled fields the label then floats onto the top border, while standard drops it. Options nested beneath stack under the field as the open menu.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | Field label, shown inside the closed field when no value is set, else floated above it (outlined/filled). Keyless (the bare quoted string) or keyed as label=. No default; absent if unset. |
| variant | enum | outlined, filled, standard | outlined | yes |  | Field border style: one of outlined\|filled\|standard. outlined/filled draw a full box (filled adds a hatch tint), standard draws only a bottom rule. Keyless enum or keyed as variant=; defaults to outlined (applied at render, not injected by the resolver). |
| value | string |  |  | no | v, val | Chosen entry shown inside the closed field, taking precedence over label as the field text. Keyed only (aliases v, val); no default. Select takes no positional/sizing tokens, so there is no bare form -- a bare quoted string is the label, and a bare number throws. |

**Examples**

```wireframe
Select "Country"
```

*Closed outlined field; the label shows as placeholder text with a ▾ caret.*

```wireframe
Select "Country" value="Canada"
```

*Value fills the field; the label floats onto the top border.*

```wireframe
Select "Status" filled value="Active"
```

*Filled (hatch-tinted) field that also floats its label over the chosen value.*

```wireframe
Select "Sort by" standard
```

*Standard variant: just an underline instead of a full box.*

```wireframe
Select "Country"
  Option "United States" selected
  Option "Canada"
  Option "Mexico" subtext="MX"
```

*Open menu: Options stack beneath the field, one pre-selected.*

```wireframe
Stack row
  Select v="50 rows"
```

*In a row the field self-sizes to show its value untrimmed (v= alias).*

### Option

A single row in a Select's dropdown menu (its real parent; a List also works for sketching). Keyless text is the label, and a keyless `selected` flag marks the chosen row with a hand-drawn accent hatch tint and a check mark. An optional keyed `subtext` adds a smaller secondary line (and a taller row); keyed `startIcon`/`endIcon` slots draw icons at the left and far right, with an explicit `endIcon` winning the right slot over the selected check. Each option is block-stretched to fill its menu's width and carries a faint bottom divider rule like a list row.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes | text | The row's primary text, written keyless (bare quoted string) or keyed as label= or its alias text=. Falls back to "Option" when unset. |
| subtext | string |  |  | no |  | An optional smaller secondary line drawn beneath the label; its presence makes the row taller (52px vs 40px). Keyed only (subtext=), value must be quoted; no default (absent when unset). |
| selected | boolean |  | false | yes |  | Keyless boolean flag marking the chosen row: paints a hand-drawn accent hatch tint across the box (hachure strokes, never a solid fill) and a right-edge check mark. Defaults to false (absent). |
| startIcon | icon |  |  | no |  | Leading icon NAME drawn at the left inset; the value is a bare or quoted PascalCase name (e.g. startIcon=Home), but the prop must be named (keyed only). An unknown name falls back to the placeholder glyph with a soft diagnostic. No default. |
| endIcon | icon |  |  | no |  | Trailing icon NAME drawn at the far-right slot; bare or quoted value, prop must be named (keyed only). An explicit endIcon wins that slot over the selected check mark. An unknown name falls back to the placeholder glyph with a soft diagnostic. No default. |

**Examples**

```wireframe
Select "Country" outlined
  Option "United States"
  Option "Canada"
  Option "Mexico"
```

*Three plain options stacked as the open menu under a Select.*

```wireframe
Select "Country"
  Option "United States" selected
  Option "Canada"
```

*The selected option gets a hatch tint and a right-edge check mark.*

```wireframe
Select "Recipient"
  Option "Alex Kim" subtext="alex@example.com"
  Option "Sam Lee" subtext="sam@example.com"
```

*A secondary subtext line under each label makes a taller two-line row.*

```wireframe
Select "Action"
  Option "Home" startIcon=Home
  Option "Settings" startIcon=Settings endIcon=ChevronRight
```

*Leading and trailing icon slots (bare icon names).*

```wireframe
Select "Account"
  Option "Profile" startIcon=Person selected
  Option "Sign out" to=#login
```

*A selected option with a start icon, plus a navigating option via to=.*

### Slider

A value-selection track with a draggable thumb. The thumb is positioned by `value` along a track bounded by `min` and `max`, and `orientation` flips the track between horizontal (default) and vertical. As a block leaf it stretches to fill its parent's cross extent -- the full width of a column or the full height of a row -- and falls back to a 120px minimum length on its own. `value` is clamped to [min, max], with `min` anchored at the left (horizontal) or bottom (vertical). Slider takes no sizing token: a bare number is always `value`, so a second bare number is a duplicate-`value` error rather than a width.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| value | numeric |  | 0 | yes | n, v, val | Thumb position along the track, clamped to [min, max]. Keyless (a bare number) or keyed via value= / n= / v= / val=; accepts negative and fractional numbers. Setting it twice (two bare numbers, or a bare number plus value=) is an error. Defaults to 0. |
| min | numeric |  | 0 | no |  | Lower bound of the track, anchored at the left (horizontal) or bottom (vertical). Keyed only (min=). Defaults to 0; if min==max the thumb degrades to the start with no NaN. |
| max | numeric |  | 100 | no |  | Upper bound of the track, anchored at the right (horizontal) or top (vertical). Keyed only (max=). Defaults to 100. |
| orientation | enum | horizontal, vertical | horizontal | yes |  | Track direction, one of horizontal \| vertical. Keyless (a bare token) or keyed via orientation=. Defaults to horizontal. |

**Examples**

```wireframe
Slider
```

*Default horizontal track; thumb at value 0 (min) on the left.*

```wireframe
Slider 30
```

*Thumb at 30 on the default 0-100 scale (a bare number sets value).*

```wireframe
Slider 75 min=0 max=100
```

*Explicit range with the thumb at 75% of the track.*

```wireframe
Slider vertical 60
```

*Vertical orientation, thumb at 60 (min at the bottom); the number and orientation tokens are order-free.*

```wireframe
Stack row
  Slider 40 vertical
```

*In a row, a vertical slider blocks to fill the row height.*

```wireframe
Stack column
  Slider 50
```

*In a column, a horizontal slider blocks to fill the column width.*

### Rating

A read-only star-rating sketch: a row of star glyphs, `value` of them filled (in ink) and the rest hollow, out of `max` total -- so the footprint grows with `max`. A bare Rating draws five hand-drawn stars (none filled); `value` clamps to [0, max] and rounds, since half-stars don't read at wireframe fidelity. Setting an explicit `icon`/`emptyIcon` swaps the whole row over to that resolved artwork (e.g. `icon=Favorite` reads as a heart rating), while an omitted pair keeps the sketchy stars. Rating takes no width/height sizing -- the only bare token it accepts is the keyless `value`.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| value | numeric |  | 0 | yes | n, v, val | How many glyphs are filled, drawn in ink. Keyless (a bare number routes here, so `Rating 4`) or keyed via `value=`/`n=`/`v=`/`val=`; clamped to [0, max] and rounded (3.6 -> 4 filled). Defaults to 0. |
| max | numeric |  | 5 | no |  | Number of star glyphs (default 5). A large max is clamped to 12 glyphs so the row still reads at sketch fidelity. |
| icon | icon |  | Star | no |  | Icon name for filled cells, keyed only (`icon=Favorite`; a bare name throws). The value may be bare or quoted PascalCase. Setting it engages icon-mode, swapping the hand-drawn stars for that artwork (filled cells in ink). Defaults to Star, but the default is deliberately NOT drawn -- an unset row keeps the sketchy stars. |
| emptyIcon | icon |  | StarBorder | no |  | Icon name for empty cells in icon-mode, keyed only (value bare or quoted). Defaults to StarBorder; like `icon`, the default is never drawn (an unset row stays hand-drawn stars), and if only `icon` is set the empty cells reuse that same artwork drawn muted. |

**Examples**

```wireframe
Rating
```

*Five hand-drawn stars, none filled (the default row).*

```wireframe
Rating 4
```

*Four of five stars filled (a bare number is the keyless value).*

```wireframe
Rating value=3 max=5
```

*Three filled out of an explicit five, keyed spelling.*

```wireframe
Rating 2 max=3 icon=Favorite emptyIcon=FavoriteBorder
```

*A heart rating: two filled hearts of three, icon-mode artwork.*

```wireframe
Rating 8 max=10
```

*Eight of ten -- a wider row tracks the larger max.*

```wireframe
Rating 3.6
```

*A fractional value rounds to four filled stars.*

### Calendar

An embeddable month/scheduling calendar. A bare Calendar renders a clean month with good defaults; variants cover a dense sidebar picker, a single-week strip, and a 12-month year overview. Day cells are laid out from the parsed month string, so real months align on the correct weekday.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| month | string |  |  | yes | title | Header text, smart-parsed to lay out the real month. Accepts "MonthName YYYY" (full or 3-letter) and "YYYY-MM"; a bare "YYYY" feeds the year variant. An unparseable string (e.g. "Sprint A") becomes the title over a canonical grid. Defaults to "June 2026". |
| variant | enum | month, compact, week, year | month | yes |  | Calendar form: month (full, main content), compact (dense, sidebar), week (one-week strip), or year (3x4 mini-month overview). |
| value | numeric |  |  | no | v, val, selected | Selected day-of-month, drawn as a filled highlight. Keyed only (a bare number is a sizing token). |
| today | numeric |  |  | no |  | Day-of-month marked as today, drawn as an outlined ring. |
| weekStart | enum | sun, mon | sun | no |  | First column of the week: Sunday or Monday. Shifts the weekday header and the first day's offset. |
| weekdays | boolean |  | true | yes |  | Show the weekday header row (S M T W ...). Set weekdays=false to hide it. |
| header | boolean |  | true | yes | controls | Show the title and prev/next chevron row. Set header=false to hide it. |
| events | boolean |  | false | yes |  | Sprinkle deterministic event-indicator dots under day numbers (off by default, so a drop-in Calendar stays clean). |
| width | size |  |  | yes | w | Footprint width (px \| % \| * \| flex), positional (first sizing token). The grid scales to fill it; width drives a proportional height unless height is also pinned. |
| height | size |  |  | yes | h | Footprint height (px \| % \| * \| flex), positional (second sizing token). Overrides the width-derived height and stretches the grid to fill the exact box. |

**Examples**

```wireframe
Calendar
```

*Full June 2026 month with clean defaults.*

```wireframe
Calendar "March 2026"
```

*A real March (31 days, starts Sunday).*

```wireframe
Calendar compact
```

*Dense, sidebar-sized month.*

```wireframe
Calendar "Feb 2026" compact value=14
```

*Compact February with day 14 selected.*

```wireframe
Calendar "2026-06" value=16 today=16 events
```

*Selected day, a today ring, and event dots.*

```wireframe
Calendar week value=10
```

*The single week containing the 10th.*

```wireframe
Calendar "2026" year
```

*A 3x4 overview of all twelve months.*

```wireframe
Stack column
  Calendar compact 100%
```

*In a sidebar: fill the column width; the height follows.*

### ToggleButtonGroup

A segmented-control container that holds abutting ToggleButtons under a single unifying border. orientation lays the buttons in a row (default) or column, with pad:0 gap:0 so they sit flush as one control. A group with no buttons is meaningless, so it is always a container. size parses and lands on the group but is best-effort/cosmetic: the engine gives children no parent context, so per-button density is actually set on each ToggleButton's own size.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| orientation | enum | horizontal, vertical | horizontal | yes |  | Lays the buttons along this axis: one of horizontal \| vertical, defaulting to horizontal (vertical -> column). Keyless (bare `horizontal`/`vertical`) or keyed `orientation=`. |
| size | enum | small, medium, large | medium | yes |  | Intended density for the segmented control: one of small \| medium \| large, defaulting to medium. Keyless (bare) or keyed `size=`, but parse-only/best-effort -- the group can't resize its children (the engine gives them no parent context), so set the matching size on each ToggleButton to actually change density. |

**Examples**

```wireframe
ToggleButtonGroup
  ToggleButton "FormatAlignLeft" selected
  ToggleButton "FormatAlignCenter"
  ToggleButton "FormatAlignRight"
```

*Default horizontal alignment toggle with the first button selected.*

```wireframe
ToggleButtonGroup vertical
  ToggleButton "FormatBold"
  ToggleButton "FormatItalic"
  ToggleButton "FormatUnderlined"
```

*A vertical (column) segmented control.*

```wireframe
ToggleButtonGroup small
  ToggleButton "FormatBold" small selected
  ToggleButton "FormatItalic" small
```

*A dense control: group size is cosmetic, so each button repeats size to actually shrink.*

```wireframe
ToggleButtonGroup orientation=vertical size=large
  ToggleButton "ViewList" large selected
  ToggleButton "ViewModule" large
```

*Keyed orientation and size; the large density is mirrored on each button to take effect.*

### ToggleButton

A single icon button in a ToggleButtonGroup segmented control, with an on/off pressed state (selected) and an icon face. The face is always its own opaque, tinted surface: an unselected button defaults to a hatch pattern and a selected one to the denser crosshatch, so the pressed state reads at a glance. Three keyless slots of distinct kinds (an icon name, the size enum, the background enum) plus the selected/denseBackground flags parse in any order; the bare icon name is read last, so the enum and boolean words always win their meaning.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| icon | icon |  |  | yes |  | The icon name drawn centered on the button face (PascalCase, forgiving spelling). Keyless literal, bare or quoted (ToggleButton FormatBold === ToggleButton "FormatBold"); the keyed icon= form also works, bare or quoted. A known name renders clean vector artwork, an unknown one falls back to the placeholder glyph plus a warning. The bare reading is tried last, so selected and the size/background words keep their meaning -- quote to force a colliding name. |
| selected | boolean |  | false | yes |  | Whether the toggle is pressed, written as a keyless boolean flag (or selected=true/false). Defaults to false. When set, it drives the face pattern default to the denser crosshatch (vs hatch when off) unless an explicit background= pins a different one. |
| size | enum | small, medium, large | medium | yes |  | The button's square footprint and icon extent: one of small \| medium \| large, defaulting to medium. Keyless enum (or size=large); unlike the group's size, this is the button's own prop, so the density is real. |
| background | enum | hatch, crosshatch, none |  | yes |  | The opaque face tint pattern: one of hatch \| crosshatch \| none, written keyless (or background=). No static default -- the effective pattern is hatch when unselected and crosshatch when selected, and an explicit value overrides that regardless of selected. none keeps the opaque base with no hashes. |
| denseBackground | boolean |  | false | yes |  | Packs the face tint's hatch lines closer together. Keyless boolean flag (or denseBackground=true), defaulting to false. It changes only the line density, not which pattern is drawn -- the selected-driven hatch/crosshatch default still applies unless an explicit background= pins it. |

**Examples**

```wireframe
ToggleButton FormatBold
```

*An unselected toggle showing the FormatBold icon over the default hatch face.*

```wireframe
ToggleButton FormatBold selected
```

*The pressed (selected) state, drawn with the denser crosshatch default.*

```wireframe
ToggleButton FormatItalic large
```

*A large-size button with a bigger square footprint and icon.*

```wireframe
ToggleButtonGroup
  ToggleButton FormatAlignLeft selected
  ToggleButton FormatAlignCenter
  ToggleButton FormatAlignRight
```

*A segmented alignment control: the group abuts the buttons, with the left option active.*

```wireframe
ToggleButton FormatBold selected background=hatch
```

*Explicit background=hatch pins the pattern, overriding the selected crosshatch default.*

```wireframe
ToggleButton Favorite crosshatch denseBackground
```

*A crosshatch face with denseBackground packing the hatch lines closer together.*

### ButtonGroup

A fused row or column of Button children. The group itself draws no chrome -- the Buttons supply their own borders and a zero gap abuts them so the shared edges read as the classic "fused buttons" look. A bare ButtonGroup lays its Buttons left-to-right; orientation switches to a stacked column, and a group-level variant (text / outlined / contained) is recorded but does not override each Button's own appearance.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | text, outlined, contained | outlined | yes |  | Group-level style, a keyless enum: text \| outlined \| contained, default outlined. Also accepts the keyed form variant=. Recorded but the honest sketch leaves each Button to draw its own look, so it does not override child chrome. |
| orientation | enum | horizontal, vertical | horizontal | yes |  | Layout axis, a keyless enum: horizontal (default) lays the Buttons in a fused row, vertical stacks them in a fused column. Also accepts the keyed form orientation=; its value domain is disjoint from variant so the two can appear in either order on one line. |

**Examples**

```wireframe
ButtonGroup
  Button "Left"
  Button "Center"
  Button "Right"
```

*Default fused row of three abutting Buttons.*

```wireframe
ButtonGroup contained
  Button "Save"
  Button "Cancel"
```

*Group-level contained variant on a two-button row.*

```wireframe
ButtonGroup vertical
  Button "One"
  Button "Two"
  Button "Three"
```

*Stacked column of fused Buttons.*

```wireframe
ButtonGroup contained vertical
  Button "Bold"
  Button "Italic"
  Button "Underline"
```

*Two keyless enums in one line; order is unambiguous.*

```wireframe
ButtonGroup variant=text
  Button "Day"
  Button "Week"
  Button "Month"
```

*variant via its keyed spelling instead of a bare token.*

### Fab

A floating action button: a circular (default) action chrome carrying a single centered icon, the high-emphasis primary action of a screen. The `extended` variant grows into a stadium-shaped pill that prints the icon name beside the glyph as a label; `size` (small/medium/large) scales the real drawn diameter. The keyless text is the icon NAME (so `Fab edit` reads the same as `Fab "edit"`), and as a fixed leaf (`block:false`) it keeps its intrinsic footprint wherever it sits rather than stretching to fill its container.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | circular, extended | circular | yes |  | Shape of the button: `circular` (default) draws a true circle (w === h) with the icon centered, while `extended` draws a wider stadium pill that seats the glyph plus the icon name as a printed label. Written keyless (bare `extended`) or keyed (`variant=extended`); a bad value like `variant=square` throws. |
| size | enum | small, medium, large | medium | yes |  | Scales the real drawn diameter: `small` (40px) &lt; `medium` (default, 56px) &lt; `large` (72px), also setting the label font. Written keyless (bare `large`) or keyed (`size=large`); a bad value like `size=huge` throws. |
| icon | icon |  |  | yes |  | The icon NAME drawn in the slot (PascalCase, forgiving spelling), keyless so a bare or quoted token (`Fab edit` === `Fab "edit"`) lands here; the keyed `icon=` form also works. An unset icon falls back silently to the placeholder glyph, an unknown name to the placeholder plus a soft warning. For an extended Fab this name doubles as the printed label. |

**Examples**

```wireframe
Fab "edit"
```

*Default medium circular Fab with a centered edit icon.*

```wireframe
Fab add large
```

*Large circle; the bare token reads as the icon name (same as "add").*

```wireframe
Fab "share" extended
```

*Extended pill: the share glyph at the left, "share" printed as the label.*

```wireframe
Fab "edit" extended small
```

*A compact extended pill; the two keyless enums resolve in any order.*

```wireframe
Fab "edit" to=#next
```

*A navigating Fab; the universal to= wraps it in a link.*

## Feedback

### Alert

A feedback banner: a left severity glyph followed by a message inside a bordered box. Keyless text is the message; severity (error, warning, info, success) and variant (standard, filled, outlined) are both keyless enums whose value domains are disjoint, so the tokens resolve in any order. Because the sketch is monochrome, severity is carried by a distinct leading glyph (error !, warning ?, info i, success checkmark) rather than color; severity defaults to success and variant to standard. Outlined draws a border only, while standard and filled add a hatch tint and a left accent bar -- denser and heavier when filled.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| severity | enum | error, warning, info, success | success | yes |  | Which state the banner reports, drawn as a distinct leading glyph since the sketch is monochrome: error (!), warning (?), info (i), success (checkmark). Keyless bare token or keyed (severity=); defaults to success. |
| variant | enum | standard, filled, outlined | standard | yes |  | The banner's look: outlined (border only), standard (border + light hatch tint + thin left accent bar), or filled (border + dense hatch tint + heavy left accent bar). Keyless bare token or keyed (variant=); defaults to standard. |
| label | string |  |  | yes |  | The message text drawn after the severity glyph. Resolves from keyless quoted text, the keyed label= form, or a ~N filler token (which seeds placeholder lorem instead). Defaults to "Alert" when omitted, and is trimmed with an ellipsis if it overflows the box. |

**Examples**

```wireframe
Alert "Saved"
```

*Default success banner: checkmark glyph, standard tint and accent bar.*

```wireframe
Alert error "Upload failed"
```

*Error severity, shown by the leading ! glyph.*

```wireframe
Alert warning outlined "Your session expires soon"
```

*Warning (?) in the outlined variant: border only, no tint or accent bar.*

```wireframe
Alert info filled "A new version is available"
```

*Info (i) in the filled variant: dense hatch tint and a heavy left accent bar.*

```wireframe
Alert success "Changes published"
```

*Explicit success severity with the checkmark glyph.*

```wireframe
Stack column
  Alert error "Could not connect to server"
```

*Inside a column the banner is block, so it stretches to span the full width.*

### Dialog

A modal surface that floats above the page as a true out-of-flow overlay: it consumes no space in its parent's flow, and the frame paints it last over an opaque paper sheet and a faint backdrop scrim, so content underneath never shows through. Children stack in a padded column to form the dialog body. `position` anchors the sheet 9 ways within its parent box (center by default); `size` (a maxWidth breakpoint) sets the sheet width via a per-breakpoint floor, and `fullScreen` fills the parent on both axes. The sheet is always capped to its parent extent, so a modal never spills past its container.

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| position | enum | center, top, bottom, left, right, topLeft, topRight, bottomLeft, bottomRight | center | yes |  | Keyless 9-way anchor for the sheet within its parent content box: center (default), top, bottom, left, right, topLeft, topRight, bottomLeft, bottomRight. The default is applied by the strategy (the resolver injects none). Resolves bare or keyed; ignored entirely when size=fullScreen. |
| size | enum | fullScreen, content, xs, sm, md, lg, lx | content | yes |  | Keyless maxWidth-breakpoint enum setting the sheet width: content (default) sizes to children floored to a small sheet; xs\|sm\|md\|lg\|lx are progressively wider breakpoint floors; fullScreen fills the parent on both axes (dropping the floor and ignoring position). Floors are minimums that content can exceed, but the sheet is always capped to the parent extent. Resolves bare or keyed. |

**Examples**

```wireframe
Dialog
  Typography h6 "Delete item?"
  Typography "This action cannot be undone."
```

*A default content-sized, centered confirmation modal; the sheet sizes to its children.*

```wireframe
Dialog md
  Typography h6 "Sign in"
  TextField "Email"
  Button "Continue" contained
```

*A medium (640px floor) form dialog, content stacked in the padded body column.*

```wireframe
Dialog sm topRight
  Typography "Saved successfully"
```

*A small toast-like sheet anchored to the top-right corner of the parent.*

```wireframe
Dialog fullScreen
  Typography h5 "Editor"
  Typography "Full-screen content fills the frame."
```

*A full-screen modal that fills the parent on both axes (position is ignored).*

```wireframe
Dialog size=lg position=bottom
  Typography "Wide sheet docked to the bottom edge"
```

*The same two enums in keyed form: a large (800px floor) sheet docked to the bottom edge.*

```wireframe
Box 360px 280px outline=solid
  Typography "Settings"
  Dialog sm
    Typography "Nested modal, anchored to this Box."
```

*Nested in a sized Box: the dialog positions within that Box, not the whole frame, and is capped to it.*

### DialogHeader

The title region of a Dialog, and the dialog counterpart of CardHeader. It is a full-width block leaf -- not a container -- that draws a bold title row plus an optional trailing close X, leaner than CardHeader (no leading icon, no subheader). The enclosing Dialog supplies the paper sheet, so the band is transparent; the close glyph is drawn by default and removed with closeIcon="none". A bare DialogHeader with no title falls back to the placeholder label "Title".

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| title | string |  |  | yes | label, text | Bold title text for the dialog band. Written bare as the keyless string literal, or keyed via the canonical title= or its label=/text= aliases. Falls back to "Title" when unset; the band hosts no children, so the title is its only text. Only one text literal is allowed. |
| closeIcon | icon |  | Close | no |  | Icon name for the trailing dismiss X, keyed only (e.g. closeIcon=Cancel); a bare icon token is rejected as an unexpected token. Defaults to "Close" so a plain header draws a real dismiss glyph; pass closeIcon=none (case-blind) to omit it. An unknown name falls back to the placeholder glyph (with a soft diagnostic). |

**Examples**

```wireframe
Dialog md
  DialogHeader "Delete file?"
```

*A standard dialog title with the default trailing close X.*

```wireframe
Dialog md
  DialogHeader "Read-only notice" closeIcon=none
```

*Title with no dismiss glyph (an undismissable header).*

```wireframe
Dialog
  DialogHeader label="Edit profile"
```

*Setting the title through the label alias instead of the bare literal.*

```wireframe
Dialog md
  DialogHeader "Confirm changes"
  DialogContent
    Typography "This action cannot be undone."
```

*A header above a content slot inside the dialog sheet.*

```wireframe
Dialog md
  DialogHeader
```

*Bare header: falls back to the placeholder title "Title".*

### DialogContent

The body region of a Dialog, the dialog counterpart of CardContent. It is a transparent reference container that stacks its children in a generously padded vertical column (two spacing units of inset, one unit of gap) and draws nothing of its own -- the enclosing Dialog supplies the paper sheet. It takes no props; hold text, fields, or any controls here, between an optional DialogHeader and a DialogActions bar.

*Accepts children: yes*

No configurable properties.

**Examples**

```wireframe
Dialog md
  DialogContent
    Typography body1 "Are you sure you want to delete this item?"
```

*A simple confirmation body: prose stacked in the padded column.*

```wireframe
Dialog
  DialogHeader "Delete file?"
  DialogContent
    Typography body2 "This action cannot be undone."
  DialogActions
    Button "Cancel" text
    Button "Delete" contained
```

*The body slot between a DialogHeader title and a DialogActions button bar.*

```wireframe
Dialog md
  DialogContent
    TextField "Email" outlined
    TextField "Password" outlined
```

*A form dialog: two fields stack top-to-bottom, inset from the sheet edge.*

### DialogActions

The action button row of a Dialog -- the dialog counterpart of CardActions. It lays its children, typically a couple of Buttons, in a single padded row and draws nothing of its own; the enclosing Dialog supplies the paper sheet beneath. Unlike CardActions, it right-aligns its buttons against the sheet's trailing edge, packing them to the right; giving a child flex or `*` defeats this, since the flex child absorbs the free space instead. It is meant to sit inside a Dialog (as the bottom action row), and an empty DialogActions still lays out cleanly.

*Accepts children: yes*

No configurable properties.

**Examples**

```wireframe
Dialog md
  DialogActions
    Button "Cancel"
    Button "OK" contained
```

*The standard Cancel / OK pair, right-aligned at the bottom of the sheet.*

```wireframe
Dialog
  DialogContent
    Typography "This action cannot be undone."
  DialogActions
    Button "Cancel" text
    Button "Delete" contained
```

*A full confirmation dialog: body content above, the action row below.*

```wireframe
Dialog md
  DialogActions
    Spacer
    Button "Save" contained
```

*A leading Spacer pushes a single primary button to the trailing edge (the flex Spacer absorbs the free space).*

### Snackbar

A brief dark feedback toast. It renders inline as a hand-drawn pill with a dense ink crosshatch tint -- its one "dark" feedback surface -- carrying the message in medium-weight ink, centered. Since this engine has no overlay layer, the bar is drawn where it is authored; the position prop cannot float it, but any non-inline value draws a small hand-drawn corner bracket pointing at the screen corner the toast would anchor to (so topRight and bottomLeft render visibly differently). A bare Snackbar falls back to the message "Message sent" and sizes itself to its text.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| position | enum | inline, topLeft, topRight, bottomLeft, bottomRight | inline | yes |  | Which screen corner the toast would anchor to: inline \| topLeft \| topRight \| bottomLeft \| bottomRight (default inline). Keyless (a bare enum token) or keyed (position=). With no overlay layer the bar stays where authored, so any non-inline value just adds a hand-drawn corner bracket at the matching corner of the pill -- inline (and any unrecognized value) draws none. An invalid value is a hard error. |
| message | string |  |  | yes | label | The toast text, drawn centered in the pill; alias `label`. Keyless (a bare quoted string) or keyed (message= / label=). Defaults to "Message sent" when omitted. |

**Examples**

```wireframe
Snackbar
```

*Bare toast: the default "Message sent" pill, sized to its text.*

```wireframe
Snackbar "Changes saved"
```

*Custom message as the keyless quoted literal.*

```wireframe
Snackbar "Upload complete" topRight
```

*Message plus a top-right corner bracket marking where it would anchor.*

```wireframe
Snackbar bottomLeft "Message sent"
```

*Position and message in either order -- the keyless literal and enum are disjoint, so both orderings parse.*

```wireframe
Snackbar label="Connection lost" position=topLeft
```

*Keyed forms: the `label` alias for message and an explicit position=.*

### Progress

A determinate progress indicator whose filled portion reflects `value` along the `min`..`max` range. The keyless `variant` enum picks the shape: linear (the default look) draws a thin horizontal bar that stretches to fill its container's width, with a crosshatched run from the left edge sized to the value fraction; circular keeps a fixed 40px square ring with a clockwise filled arc swept from 12 o'clock. `value` is a keyless number defaulting to 0 (an empty track -- the idiomatic "just started" state), clamped to the range; a degenerate range like min==max degrades to an empty fill rather than erroring. Progress is not a sizing leaf -- it takes no `width`/`height` tokens; the linear bar widens only because it is a block element that fills its parent's cross axis.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | linear, circular | indeterminate | yes |  | Keyless enum picking the shape: `linear` (a thin bar that blocks to fill the parent's width) or `circular` (a fixed 40px square ring with a clockwise arc). The schema default is `indeterminate`, which has no distinct wireframe geometry -- it (and anything other than `circular`) draws the linear bar. `indeterminate` is the default but is not a typeable token; only `linear` and `circular` can be written. |
| value | numeric |  | 0 | yes | n, v, val | The filled amount along [min,max], drawn as the bar's crosshatched run or the ring's arc. Keyless (a bare number, e.g. `Progress 60`) with aliases `n`/`v`/`val`; also accepted keyed (`value=`/`n=`/`v=`/`val=`). Defaults to 0 (empty track) and is clamped to the range. |
| min | numeric |  | 0 | no |  | Lower bound of the value range; keyed only (numeric, e.g. `min=0`), default 0. |
| max | numeric |  | 100 | no |  | Upper bound of the value range; keyed only (numeric, e.g. `max=100`), default 100. A non-positive span (e.g. min==max) degrades to an empty fill rather than dividing by zero. |
| thickness | enum | small, medium, large | medium | yes |  | Keyless enum (`small` \| `medium` \| `large`, default `medium`) scaling the variant's weight: the bar height for linear, the ring/arc stroke width for circular. It is disjoint from `variant` and `value`, so the tokens parse in any order, and it never changes the 40px circular footprint. |

**Examples**

```wireframe
Progress 60
```

*Default linear bar, 60% filled (a bare number is the value).*

```wireframe
Progress linear 75 large
```

*An explicit thick linear bar at 75%.*

```wireframe
Progress circular 40
```

*Circular ring with a 40% arc swept clockwise from 12 o'clock.*

```wireframe
Progress circular value=80 small
```

*A thin-stroked circular ring at 80%.*

```wireframe
Progress value=5 min=0 max=10
```

*Custom range: value 5 of 0..10 fills about half.*

```wireframe
Stack column
  Progress linear 40
```

*In a column the linear bar stretches to the container width; only its value is set.*

### Skeleton

A gray, content-less loading placeholder -- the stand-in shown while data is in flight. A leaf with no label of its own; its only job is to occupy space in the chosen shape. The keyless variant picks the chrome: rectangular (default) is a hatch-tinted bordered box, rounded is a denser cross-hatch box with a real corner radius, circular is a hatch-tinted ellipse (square by default), and text draws muted filler lines (no box) that scale in count with the box height. Sizes to itself rather than stretching its container's cross axis, so a row of skeletons keeps each one's own width.

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Description |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | text, circular, rectangular, rounded | rectangular | yes |  | Picks the placeholder chrome (keyless enum): "text" (muted filler lines, no box), "circular" (hatch-tinted ellipse, square intrinsic), "rectangular" (hatch-tinted bordered box), or "rounded" (denser cross-hatch box with a 6px corner radius). Defaults to "rectangular". Also accepts the keyed spelling variant=; setting it twice (keyless dup or keyless-vs-keyed) is a hard error, as is an unknown value. |
| width | size |  |  | yes | w | Footprint width, positional (first sizing token, e.g. Skeleton 200px 24px): a pixel length (200px), percentage (100%), fill (*), or a bare number as a flex weight (200). There is no keyed width=/w= prop -- the keyed spelling throws "unknown property" -- and the literal word "flex" is not a value (it throws "unexpected token"). The spec lists alias w, but only the positional form works. When unpinned it falls back to the intrinsic box (120, or 40 for circular). |
| height | size |  |  | yes | h | Footprint height, positional (second sizing token): a pixel length (24px), percentage (100%), fill (*), or a bare number as a flex weight. Like width it is positional-only -- height=/h= throws "unknown property" and the literal word "flex" throws "unexpected token". The spec lists alias h, but only the positional form works. Unpinned it falls back to the intrinsic (16, or 40 for circular); for the text variant a taller box yields more filler lines. |

**Examples**

```wireframe
Skeleton
```

*Default rectangular block placeholder at its natural 120x16 box.*

```wireframe
Skeleton text
```

*Muted filler lines standing in for a line of copy (no border or tint).*

```wireframe
Skeleton circular
```

*A bare circular skeleton, square (40x40) so it draws as a circle.*

```wireframe
Skeleton rounded 120px 40px
```

*A rounded-corner box placeholder, sized 120 wide by 40 tall.*

```wireframe
Skeleton text 100% 64px
```

*Full-width copy placeholder; the taller box draws more filler lines.*

```wireframe
Stack row
  Skeleton circular 40px 40px
  Skeleton text 200px 40px
```

*Avatar-plus-text loading row: a circle beside ghosted copy lines.*
