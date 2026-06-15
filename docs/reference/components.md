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

### Anchor

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| width | size |  |  | yes | w |  |
| height | size |  |  | yes | h |  |

## Surfaces

### Card

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| elevation | numeric |  | 1 | no |  |  |

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
| background | enum | hatch, crosshatch, none | hatch | yes |  | Hand-drawn tint pattern: hatch (single diagonal), crosshatch (both diagonals), or none (opaque, untextured -- a solid base with no hashes). |
| denseBackground | boolean |  | false | yes |  | Packs the background tint's hatch lines closer together. |

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
| icon | icon |  |  | no |  | Explicit chevron OVERRIDE; wins in both states. Unset, the per-state defaults below apply. |
| expandedIcon | icon |  | ExpandLess | no |  | The chevron drawn when expanded (default ExpandLess, pointing up). |
| collapsedIcon | icon |  | ExpandMore | no |  | The chevron drawn when collapsed (default ExpandMore, pointing down). |
| background | enum | hatch, crosshatch, none |  | yes |  | Optional opaque hatch tint across the bar (drawn only when set; (A)-site base:true). none = opaque base, no hashes. |
| denseBackground | boolean |  | false | yes |  | Packs the background hatch lines closer. |

### AccordionBody

*Accepts children: yes*

No configurable properties.

## Navigation

### Drawer

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| pin | enum | left, right, top, bottom | left | yes |  | v1.0. The single placement knob (left default). Sets the docked/pinned side, the content-facing divider edge, the 100% fill axis, and the child-stacking axis. Implies the panel axis (left/right=>vertical side panel, top/bottom=>horizontal bar), so no separate orientation prop is needed -- mirrors MUI's Drawer anchor (renamed pin to avoid colliding with the Anchor element / a frame's anchor= composition). |
| variant | enum | permanent, overlay, rail | permanent | yes |  | v1.0. permanent=in-flow panel (seam only, no full box); overlay=out-of-flow floating sheet, pinned to the pin edge; rail=thin in-flow strip. |
| divider | boolean |  | true | yes |  | Solid seam on the inner edge facing the content; divider=false suppresses it. |
| background | enum | hatch, crosshatch, none | hatch | yes |  | Opaque hatch tint on the panel (drawn only when set). none = opaque base, no hashes. |
| denseBackground | boolean |  | false | yes |  | Packs the background hatch lines closer. |

### Link

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  |  |
| underline | boolean |  | true | yes |  |  |
| variant | enum | h1, h2, h3, h4, h5, h6, subtitle1, subtitle2, body1, body2, caption, overline, button | inherit | yes |  | Shares Typography scale. |
| filler | string |  |  | no |  | Filler control. |

### MenuItem

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  |  |
| selected | boolean |  | false | yes |  |  |
| disabled | boolean |  | false | yes |  |  |

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
| active | boolean |  | false | yes |  |  |
| completed | boolean |  |  | yes |  |  |

### Pagination

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| count | numeric |  | 1 | no |  |  |
| page | numeric |  | 1 | no |  |  |

### BottomNavigation

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| value | string |  |  | no | v, val |  |
| showLabels | boolean |  | false | no |  |  |

### BottomNavigationAction

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  |  |
| icon | icon |  |  | no |  |  |

## Content

### Typography

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  |  |
| variant | enum | h1, h2, h3, h4, h5, h6, subtitle1, subtitle2, body1, body2, caption, overline, button | body1 | yes |  |  |
| align | enum | inherit, left, center, right, justify | inherit | yes |  |  |
| noWrap | boolean |  | false | yes |  |  |
| filler | string |  | 1 line | no |  |  |

### Button

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | Optional. An icon (startIcon/endIcon) with no label draws a compact, square icon-only button. A bare Button with neither label nor icon shows a Button placeholder. |
| variant | enum | text, outlined, contained | text | yes |  |  |
| size | enum | small, medium, large | medium | yes |  |  |
| disabled | boolean |  | false | yes |  |  |
| startIcon | icon |  |  | no |  |  |
| endIcon | icon |  |  | no |  |  |
| fullWidth | boolean |  | false | yes |  | Express via sizing instead. |
| background | enum | hatch, crosshatch, none | hatch | yes |  |  |
| denseBackground | boolean |  | false | yes |  |  |

### Img

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| width | size |  | content | yes | w |  |
| height | size |  | content | yes | h |  |
| ratio | ratio |  |  | no |  |  |
| alt | string |  |  | no |  |  |
| src | string |  |  | no |  |  |

### Placeholder

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| width | size |  | content | yes | w |  |
| height | size |  | content | yes | h |  |
| label | string |  |  | yes |  |  |
| description | string |  |  | no |  |  |

### Avatar

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | circular, rounded, square | circular | yes |  |  |
| size | enum | small, medium, large | medium | yes |  |  |
| src | string |  |  | no |  |  |
| label | string |  |  | yes |  |  |
| background | enum | hatch, crosshatch, none | hatch | yes |  |  |
| denseBackground | boolean |  | false | yes |  |  |

### Chip

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  |  |
| variant | enum | filled, outlined | filled | yes |  |  |
| size | enum | small, medium | medium | yes |  |  |
| background | enum | hatch, crosshatch, none | hatch | yes |  |  |
| denseBackground | boolean |  | false | yes |  |  |
| filler | string |  | Chip | no |  |  |

### Icon

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| icon | icon |  |  | yes |  |  |
| size | enum | small, medium, large | medium | yes |  |  |

### List

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| dense | boolean |  | false | yes |  |  |

### ListItem

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  |  |
| icon | icon |  |  | no |  |  |
| filler | string |  | 1 line | no |  |  |

### Table

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| size | enum | small, medium | medium | yes |  |  |

### TableHead

*Accepts children: yes*

No configurable properties.

### TableBody

*Accepts children: yes*

No configurable properties.

### TableFooter

*Accepts children: yes*

No configurable properties.

### TableRow

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| selected | boolean |  | false | yes |  |  |

### TableCell

*Accepts children: yes*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| align | enum | left, center, right | left | no |  |  |

### Badge

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| badgeContent | string |  |  | yes |  |  |
| variant | enum | standard, dot | standard | yes |  |  |

## Inputs

### TextField

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| label | string |  |  | yes |  | Optional. Absent: nothing drawn, no space reserved. Outlined: rests inside the empty field, floats onto the top border once a value/placeholder shows. |
| variant | enum | outlined, filled, standard | outlined | yes |  |  |
| value | string |  |  | no | v, val |  |
| defaultValue | string |  |  | no |  |  |
| multiline | boolean |  | false | yes |  |  |
| required | boolean |  | false | yes |  | Appends a * marker to the label. |
| placeholder | string |  |  | no |  |  |
| helperText | string |  |  | no | helper |  |
| error | boolean |  | false | yes |  |  |
| disabled | boolean |  | false | yes |  |  |
| rows | numeric |  | 1 | no |  |  |
| size | enum | small, medium | medium | yes |  |  |
| startIcon | icon |  |  | no |  | Icon name (MUI PascalCase); drawn just inside the leading edge. |
| endIcon | icon |  |  | no |  | Icon name; drawn just inside the trailing edge (takes the slot a select caret would use). |
| select | boolean |  | false | no |  | Draws a dropdown caret on the trailing edge. |
| fullWidth | boolean |  | false | yes |  |  |
| background | enum | hatch, crosshatch, none | hatch | yes |  |  |
| denseBackground | boolean |  | false | yes |  |  |
| filler | string |  | label fill | no |  |  |

### Control

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | radio, checkbox, switch | checkbox | yes |  |  |
| checked | boolean |  | false | yes |  |  |
| disabled | boolean |  | false | yes |  |  |
| size | enum | small, medium, large | medium | yes |  |  |
| background | enum | hatch, crosshatch, none | hatch | yes |  | Tint pattern for the checked switch track: hatch (single diagonal), crosshatch (both diagonals), or none (opaque, untextured track). |
| denseBackground | boolean |  | false | yes |  | Packs the checked switch track's hatch lines closer together. |

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
| background | enum | hatch, crosshatch, none |  | yes |  | Opaque face tint (always drawn; (A)-site base:true). Defaults to hatch, or crosshatch when selected; an explicit value (or denseBackground) overrides that default regardless of selected. none = opaque base, no hashes. |
| denseBackground | boolean |  | false | yes |  | Packs the face tint's hatch lines closer together. |

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
| position | enum | center, top, bottom, left, right, topLeft, topRight, bottomLeft, bottomRight | center | yes |  |  |
| size | enum | fullScreen, content, xs, sm, md, lg, lx | content | yes |  |  |

### DialogHeader

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| title | string |  |  | yes | label, text |  |
| closeIcon | icon |  | Close | no |  |  |

### DialogContent

*Accepts children: yes*

No configurable properties.

### DialogActions

*Accepts children: yes*

No configurable properties.

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
| thickness | enum | small, medium, large | medium | yes |  | Bar height for linear; ring/arc stroke width for circular. |

### Skeleton

*Accepts children: no*

| Name | Type | Values | Default | Keyless | Aliases | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| variant | enum | text, circular, rectangular, rounded | rectangular | yes |  |  |
| width | size |  |  | yes | w |  |
| height | size |  |  | yes | h |  |
