<!--
  GENERATED FILE -- DO NOT EDIT BY HAND.
  Source of truth: meta/element-specs.json
  Regenerate with: npm run docs:reference
-->

# wiremark Component Library Reference

This reference is generated from [`meta/element-specs.json`](../../meta/element-specs.json) -- the single source of truth for wiremark's component and property coverage. It lists the elements wiremark supports and, for each, its properties; anything out of scope is omitted. Do not edit it by hand: change the JSON and run `npm run docs:reference`.

## Components

- [Layout](#layout)
- [Surfaces](#surfaces)
- [Navigation](#navigation)
- [Content](#content)
- [Inputs](#inputs)
- [Feedback](#feedback)

## Layout

### Box

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| width | size |  | content | yes | w |  |
| height | size |  | content | yes | h |  |
| elevation | numeric |  | 0 | no |  |  |
| outline | enum | none, solid, dashed, dotted | none | yes |  |  |

### Stack

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| direction | enum | row, row-reverse, column, column-reverse | column | yes |  |  |
| spacing | numeric |  | 0 | no | gap |  |
| divider | boolean |  | false | yes |  |  |
| width | size |  | content | yes | w |  |
| height | size |  | content | yes | h |  |
| elevation | numeric |  | 0 | no |  |  |
| outline | enum | none, solid, dashed, dotted | none | yes |  |  |

### Grid

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| columns | numeric |  | 12 | no | cols |  |
| spacing | numeric |  | 0 | no | gap |  |
| width | size |  | 100% | yes | w |  |
| height | size |  | content | yes | h |  |

### Divider

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| orientation | enum | horizontal, vertical | horizontal | yes |  |  |
| variant | enum | solid, dashed, dotted | solid | yes |  |  |

### Spacer

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| width | size |  | 1 | yes | w |  |
| height | size |  | 1 | yes | h |  |

## Surfaces

### Card

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| elevation | numeric |  | 1 | no |  |  |
| variant | enum | elevation, outlined | elevation | yes |  |  |

### CardHeader

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| title | string |  |  | yes | label, text |  |
| subheader | string |  |  | no | subtext |  |
| icon | icon |  |  | no |  |  |
| closeIcon | icon |  | Close | no |  |  |

### CardContent

*Accepts children: yes*

No configurable properties.

### CardActions

*Accepts children: yes*

No configurable properties.

### AppBar

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | regular, dense | regular | yes |  |  |
| background | enum | hatch, crosshatch | hatch | no |  | Hand-drawn tint pattern: hatch (single diagonal) or crosshatch (both diagonals). |
| denseBackground | boolean |  | false | no |  | Packs the background tint's hatch lines closer together. |

### Toolbar

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | regular, dense | regular | yes |  |  |

### AccordionHeader

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| title | string |  |  | yes | label, text |  |
| expanded | boolean |  | false | yes |  |  |
| disabled | boolean |  | false | yes |  |  |
| icon | icon |  | ChevronRight | no |  | ChevronDown used by default if `expanded` |

### AccordionBody

*Accepts children: yes*

No configurable properties.

## Navigation

### Drawer

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| anchor | enum | left, right, top, bottom | left | yes |  | v1.0. |
| variant | enum | permanent, persistent, temporary | temporary | yes |  | v1.0. |
| open | boolean |  | false | yes |  | Drawn open by default in wireframe. |

### Link

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | Keyless text literal. |
| href | reference |  |  | no | to | DSL to=#id (frame-level only). |
| underline | enum | none, hover, always | always | no |  | Cosmetic; v1.0. |
| variant | enum | h1, h2, h3, h4, h5, h6, subtitle1, subtitle2, body1, body2, caption, overline, button | inherit | yes |  | Shares Typography scale. |
| filler | string |  |  | no |  | Filler control. |

### MenuItem

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | no |  | Could map like ListItem in v1.0. |
| selected | boolean |  | false | no |  |  |
| disabled | boolean |  | false | no |  |  |

### Menubar

*Accepts children: yes*

No configurable properties.

### Tabs

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| orientation | enum | horizontal, vertical | horizontal | yes |  |  |
| variant | enum | standard, scrollable, fullWidth | standard | yes |  |  |

### Tab

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  |  |

### Breadcrumbs

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| separator | string |  | / | yes |  |  |

### Stepper

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| orientation | enum | horizontal, vertical | horizontal | yes |  |  |

### Step

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  |  |
| active | boolean |  | false | no |  |  |
| completed | boolean |  |  | no |  |  |

### Pagination

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| count | numeric |  | 1 | no |  |  |
| page | numeric |  | 1 | no |  |  |

### BottomNavigation

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| value | string |  |  | no |  | Mobile nav bar; v1.0 candidate. |
| showLabels | boolean |  | false | no |  |  |

### BottomNavigationAction

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | no |  |  |
| icon | string |  |  | no |  |  |

## Content

### Typography

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | Keyless text literal. |
| variant | enum | h1, h2, h3, h4, h5, h6, subtitle1, subtitle2, body1, body2, caption, overline, button | body1 | yes |  | Keyless enum (DSL uses h4/body etc). |
| align | enum | inherit, left, center, right, justify | inherit | no |  | v1.0. |
| noWrap | boolean |  | false | no |  | Truncation; v1.0. |
| filler | string |  | 1 line | no |  | Filler amount + style. |

### Button

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | Keyless text literal. |
| variant | enum | text, outlined, contained | text | yes |  | Keyless enum. |
| href | reference |  |  | no | to | DSL to=#id. |
| size | enum | small, medium, large | medium | yes |  |  |
| disabled | boolean |  | false | no |  | v1.0 boolean flag. |
| startIcon | string |  |  | no |  | Use Icon child in v1.0. |
| endIcon | string |  |  | no |  |  |
| fullWidth | boolean |  | false | no |  | Express via sizing instead. |
| background | enum | hatch, crosshatch | hatch | no |  | Tint pattern for the contained fill: hatch (single diagonal) or crosshatch (both diagonals). |
| denseBackground | boolean |  | false | no |  | Packs the contained tint's hatch lines closer together. |

### TextField

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | Keyless string literal. |
| variant | enum | outlined, filled, standard | outlined | yes |  | Keyless enum. |
| value | string |  |  | no |  | Keyed; drawn value text. |
| type | enum | text, password, email, number | text | no |  | Keyed. |
| multiline | boolean |  | false | no |  | Boolean flag. |
| required | boolean |  | false | no |  | Boolean flag. |
| placeholder | string |  |  | no |  | v1.0; value= covers most cases. |
| helperText | string |  |  | no | helper | v1.0. |
| error | boolean |  | false | no |  | v1.0 boolean. |
| disabled | boolean |  | false | no |  | v1.0 boolean. |
| rows | numeric |  |  | no |  | With multiline. |
| defaultValue | string |  |  | no |  | Use value= in DSL. |
| size | enum | small, medium | medium | no |  | v1.0. |
| fullWidth | boolean |  | false | no |  | Express via sizing. |
| select | boolean |  | false | no |  | Use Select component instead. |
| background | enum | hatch, crosshatch | hatch | no |  | Tint pattern for the filled/disabled fill: hatch (single diagonal) or crosshatch (both diagonals). |
| denseBackground | boolean |  | false | no |  | Packs the filled/disabled tint's hatch lines closer together. |
| to | reference |  |  | no |  | Clickable region. |
| filler | string |  | label fill | no |  | Filler. |

### Img

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| ratio | ratio |  |  | no |  | Aspect ratio keyed. |
| alt | string |  |  | no |  | Alt text keyed (quoted literal). |
| src | string |  |  | no |  | Real source; v1.0. |

### Avatar

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | circular, rounded, square | circular | yes |  | v0.1 draws a circle. |
| src | string |  |  | no |  | v1.0. |
| alt | string |  |  | no |  | v1.0. |
| label | string |  |  | yes |  | Initials/icon. |

### Chip

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | Keyless text literal. |
| variant | enum | filled, outlined | filled | yes |  | v1.0. |
| size | enum | small, medium | medium | yes |  | v1.0. |
| background | enum | hatch, crosshatch | hatch | no |  | Tint pattern for the filled fill: hatch (single diagonal) or crosshatch (both diagonals). |
| denseBackground | boolean |  | false | no |  | Packs the filled tint's hatch lines closer together. |
| filler | string |  | Chip | no |  | Filler. |

### Icon

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| name | string |  |  | yes |  | Keyless name; vocab is open (spec §10.3). |
| fontSize | enum | small, medium, large, inherit | medium | no | size | v1.0. |

### List

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| dense | boolean |  | false | no |  | v1.0 flag. |
| subheader | string |  |  | no |  | v1.0. |

### ListItem

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | Keyless text literal. |
| to | reference |  |  | no |  | Clickable nav target. |
| filler | string |  | 1 line | no |  | Filler. |

### ListItemButton

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| selected | boolean |  | false | no |  | Folded into ListItem to= in DSL. |

### ListItemIcon

*Accepts children: yes*

No configurable properties.

### ListItemText

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| primary | string |  |  | no |  | Folded into ListItem label. |
| secondary | string |  |  | no |  | Two-line item; v1.0. |

### Table

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| size | enum | small, medium | medium | no |  | Tables likely v1.0. |

### TableRow

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| selected | boolean |  | false | no |  |  |

### TableCell

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| align | enum | left, center, right | left | no |  |  |

### Badge

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| badgeContent | string |  |  | yes |  | Overlay count; v1.0. |
| variant | enum | standard, dot | standard | yes |  |  |

## Inputs

### Control

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | radio, checkbox, switch | checkbox | yes |  |  |
| checked | boolean |  | false | yes |  |  |
| disabled | boolean |  | false | yes |  |  |
| size | enum | small, medium, large | medium | yes |  |  |
| background | enum | hatch, crosshatch | hatch | no |  | Tint pattern for the checked switch track: hatch (single diagonal) or crosshatch (both diagonals). |
| denseBackground | boolean |  | false | no |  | Packs the checked switch track's hatch lines closer together. |

### Select

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  |  |
| variant | enum | outlined, filled, standard | outlined | yes |  |  |
| value | string |  |  | no | v, val |  |

### Option

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes | text |  |
| subtext | string |  |  | no |  |  |
| selected | boolean |  | false | yes |  |  |
| startIcon | icon |  |  | no |  |  |
| endIcon | icon |  |  | no |  |  |

### Slider

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| value | numeric |  | 0 | yes | n, v, val |  |
| min | numeric |  | 0 | no |  |  |
| max | numeric |  | 100 | no |  |  |
| orientation | enum | horizontal, vertical | horizontal | yes |  |  |

### Rating

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| value | numeric |  | 0 | yes | n, v, val |  |
| max | numeric |  | 100 | no |  |  |
| icon | icon |  | Star | no |  |  |
| emptyIcon | icon |  | StarBorder | no |  |  |

### ToggleButtonGroup

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| orientation | enum | horizontal, vertical | horizontal | yes |  |  |
| size | enum | small, medium, large | medium | yes |  |  |

### ToggleButton

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| icon | icon |  |  | yes |  |  |
| selected | boolean |  | false | yes |  |  |
| size | enum | small, medium, large | medium | yes |  |  |

### ButtonGroup

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | text, outlined, contained | outlined | yes |  |  |
| orientation | enum | horizontal, vertical | horizontal | yes |  |  |

### Fab

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | circular, extended | circular | yes |  |  |
| size | enum | small, medium, large | medium | yes |  |  |
| icon | icon |  |  | yes |  |  |

## Feedback

### Alert

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| severity | enum | error, warning, info, success | success | yes |  |  |
| variant | enum | standard, filled, outlined | standard | yes |  |  |
| label | string |  |  | yes |  |  |

### Dialog

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| size | enum | fullScreen, content, xs, sm, md, lg, lx | content | yes |  |  |

### Snackbar

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| position | enum | inline, topLeft, topRight, bottomLeft, bottomRight | inline | yes |  |  |
| message | string |  |  | yes | label |  |

### Progress

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | linear, circular | indeterminate | yes |  | v1.0. |
| value | numeric |  | 0 | yes | n, v, val |  |
| min | numeric |  | 0 | no |  |  |
| max | numeric |  | 100 | no |  |  |

### Skeleton

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | text, circular, rectangular, rounded | rectangular | yes |  |  |
| width | size |  |  | yes | w |  |
| height | size |  |  | yes | h |  |
