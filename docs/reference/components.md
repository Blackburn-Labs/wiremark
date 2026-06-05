<!--
  GENERATED FILE -- DO NOT EDIT BY HAND.
  Source of truth: meta/mui-support-matrix.json
  Regenerate with: npm run docs:reference
-->

# wiremark Component Library Reference

This reference is generated from [`meta/mui-support-matrix.json`](../../meta/mui-support-matrix.json) -- the single source of truth for wiremark's component and property coverage. It lists the components and properties wiremark supports; anything the matrix marks as out of scope is omitted. Do not edit it by hand: change the JSON and run `npm run docs:reference`.

> Matrix source: hand-maintained (originally extracted from mui_support_matrix.xlsx)

## How to read this reference

> Generated against Material UI v9.0.1 (mui.com/material-ui/all-components). Support tiers reflect the Wireframe DSL spec v0.1.

| Column | Meaning |
| --- | --- |
| Component | MUI v9 component (or DSL-specific element such as Img / Spacer). |
| Category | MUI docs grouping (Inputs, Data display→Content, Feedback, Surfaces, Navigation, Layout, Utils). |
| Component tier | Which milestone the COMPONENT itself enters the DSL: v0.1 (prototype), v1.0 (broad-coverage), or never (not in the DSL vocabulary, e.g. Tooltip, Popover, Modal, MUI X). |
| Property | The MUI prop name. Parenthesised names like (width) or (filler) are DSL-side concepts, not literal MUI props. |
| Type / values | Prop type or enum value set. |
| Default | Default value in MUI v9. |
| Keyless? | Whether the property may be written without key= on that component (DSL §3.2.2). 'yes' = keyless-allowed. |
| DSL mapping | The keyed DSL prop the value resolves to (or '(indentation)' for containment). |
| Notes | Rationale / caveat. |

| Keyless rules | From spec §3.2.2 (enforced at component-definition time) |
| --- | --- |
| Rule 1 | At most ONE string-literal keyless property per component (the text/label). |
| Rule 2 | Numbers may not be keyless, except sizing tokens (width/height/flex). |
| Rule 3 | An enum value may not be keyless if it duplicates a boolean property's key. |
| Rule 4 | An enum value may not be keyless if it appears in more than one enum property. |
| Consequence | On v0.1 components the keyless set is ≤1 literal (label) + ≤1 enum (variant) + sizing, which never collide, so order is free. |

| v9-specific | Notes reflected in the matrix |
| --- | --- |
| Grid | 'column' / 'column-reverse' removed from direction in v9; direction is row-only. |
| CardHeader | Deprecated CardHeader props removed in v9. |
| List / Inputs | Deprecated ListItem/ListItemText props and deprecated input props/classes removed. |
| New components | NumberField (Base UI powered) and Menubar added in v9 — both mapped to v1.0 here. |
| ButtonBase | nativeButton prop added in v9 (render concern; never). |

## Components

- [Layout](#layout)
- [Surfaces](#surfaces)
- [Navigation](#navigation)
- [Content](#content)
- [Inputs](#inputs)
- [Feedback](#feedback)

## Layout

### Box

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| children | node | — | no | (indentation) | Containment is indentation, not a prop. |
| (width) | px \| % \| * \| flex | content | yes | w= | Keyless sizing token 1 of 2 (spec §4). |
| (height) | px \| % \| * \| flex | content | yes | h= | Keyless sizing token 2 of 2 (spec §4). |

### Stack

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| direction | 'row'\|'row-reverse'\|'column'\|'column-reverse' | 'column' | yes | direction= | DSL uses row/col; reverse variants → v1.0. |
| spacing | number\|string\|array | 0 | no | gap= | Keyed gap= in DSL. |
| divider | node | — | no | — | Add Divider as child instead in v0.1. |
| (width) | sizing | content | yes | w= | Sizing keyless. |
| (height) | sizing | content | yes | h= | Sizing keyless. |

### Grid

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| container | bool | false | no | — | Implicit: Grid is always a container in DSL. |
| size | number\|'auto'\|'grow'\|object | — | no | — | Per-child span; v0.1 uses uniform cols=. |
| columns | number | 12 | no | cols= | DSL cols= sets the column count. |
| spacing | number\|string | 0 | no | gap= | DSL gap=. |
| rowSpacing | number\|string | — | no | — | Folded into gap= for v0.1. |
| columnSpacing | number\|string | — | no | — | Folded into gap= for v0.1. |
| direction | 'row'\|'row-reverse' | 'row' | no | — | v9 removed column directions. |

### Container

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| maxWidth | 'xs'\|'sm'\|'md'\|'lg'\|'xl'\|false | 'lg' | no | max= | DSL max=. |
| fixed | bool | false | no | — | Secondary; v1.0. |

### Divider

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| orientation | 'horizontal'\|'vertical' | 'horizontal' | no | — | v0.1 = bare propless line. |
| textAlign | 'center'\|'left'\|'right' | 'center' | no | — | Only relevant with child text. |
| children | node | — | no | label= | Labelled divider; v0.1 has none. |

### Spacer

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| (none) | — | — | — | — | DSL-only flexible gap; not an MUI component. |

## Surfaces

### Card

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| raised | bool | false | no | — | Elevation hint; v1.0. |
| variant | 'elevation'\|'outlined' | 'elevation' | no | variant= | v1.0. |
| children | node | — | no | (indentation) | Flatten rule applies (spec §5.3). |

### CardMedia

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| image | string(url) | — | no | — | Use child Img in v0.1. |
| children | node | — | no | (indentation) | Explicit card sub-part (spec §5.3). |

### CardContent

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| children | node | — | no | (indentation) | Explicit body region. |

### CardActions

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| children | node | — | no | (indentation) | Explicit action row. |

### CardHeader

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| title | node | — | no | — | v9 removed deprecated CardHeader props. |
| subheader | node | — | no | — | — |
| avatar | node | — | no | (indentation) | — |
| action | node | — | no | (indentation) | — |

### Paper

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| variant | 'elevation'\|'outlined' | 'elevation' | no | variant= | v1.0. |
| children | node | — | no | (indentation) | — |

### AppBar

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| position | 'fixed'\|'absolute'\|'sticky'\|'static'\|'relative' | 'fixed' | no | — | Visual position; v0.1 draws top bar. |
| children | node | — | no | (indentation) | Usually wraps a Toolbar. |

### Toolbar

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| variant | 'regular'\|'dense' | 'regular' | no | variant= | v1.0. |
| children | node | — | no | (indentation) | — |

### Accordion

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| expanded | bool | — | — | — | v9 removed deprecated props. |
| defaultExpanded | bool | false | — | — | — |
| disabled | bool | false | — | — | — |
| children | node | — | — | (indentation) | Needs AccordionSummary/Details. |

## Navigation

### Drawer

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| anchor | 'left'\|'right'\|'top'\|'bottom' | 'left' | no | anchor= | v1.0. |
| variant | 'permanent'\|'persistent'\|'temporary' | 'temporary' | no | variant= | v1.0. |
| open | bool | false | no | open= | Drawn open by default in wireframe. |
| children | node | — | no | (indentation) | — |

### Link

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| children | node | — | yes | label= | Keyless text literal. |
| href | string | — | no | to= | DSL to=#id (frame-level only). |
| underline | 'none'\|'hover'\|'always' | 'always' | no | — | Cosmetic; v1.0. |
| variant | Typography variant | 'inherit' | no | variant= | Shares Typography scale. |
| (filler) | ~N \| _runs | — | no | filler= | Filler control. |

### MenuItem

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| children | node | — | — | label= | Could map like ListItem in v1.0. |
| selected | bool | false | — | — | — |
| disabled | bool | false | — | — | — |

### Menubar

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| children | node | — | — | (indentation) | New in v9; could map to a menu strip. |

### Tabs

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| value | any | — | — | — | Could be a v1.0 component. |
| orientation | 'horizontal'\|'vertical' | 'horizontal' | — | — | — |
| variant | 'standard'\|'scrollable'\|'fullWidth' | 'standard' | — | variant= | — |

### Tab

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| label | node | — | — | label= | — |

### Breadcrumbs

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| separator | node | '/' | — | — | — |
| children | node | — | — | (indentation) | Children are Links. |

### Stepper

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| activeStep | number | 0 | — | — | — |
| orientation | 'horizontal'\|'vertical' | 'horizontal' | — | — | — |

### Pagination

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| count | number | 1 | — | count= | — |
| page | number | — | — | — | — |

### BottomNavigation

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| value | any | — | — | — | Mobile nav bar; v1.0 candidate. |
| showLabels | bool | false | — | — | — |

### BottomNavigationAction

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| label | node | — | — | label= | — |
| icon | node | — | — | — | — |

## Content

### Typography

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| children | node | — | yes | label= | Keyless text literal. |
| variant | h1..h6\|subtitle1/2\|body1/2\|caption\|overline\|button | 'body1' | yes | variant= | Keyless enum (DSL uses h4/body etc). |
| align | 'inherit'\|'left'\|'center'\|'right'\|'justify' | 'inherit' | no | align= | v1.0. |
| noWrap | bool | false | no | — | Truncation; v1.0. |
| (filler) | ~N[w\|l] \| _runs | 1 line | no | filler= / ~N | Filler amount + style. |

### Button

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| children | node | — | yes | label= | Keyless text literal. |
| variant | 'text'\|'outlined'\|'contained' | 'text' | yes | variant= | Keyless enum. |
| color | 'primary'\|'secondary'\|... | 'primary' | no | primary | DSL primary flag (boolean). |
| href | string | — | no | to= | DSL to=#id. |
| size | 'small'\|'medium'\|'large' | 'medium' | no | size= | v1.0. |
| disabled | bool | false | no | disabled | v1.0 boolean flag. |
| startIcon | node | — | no | — | Use Icon child in v1.0. |
| endIcon | node | — | no | — | — |
| fullWidth | bool | false | no | — | Express via sizing instead. |

### TextField

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| label | node | — | yes | label= | Keyless string literal. |
| variant | 'outlined'\|'filled'\|'standard' | 'outlined' | yes | variant= | Keyless enum. |
| value | any | — | no | value= | Keyed; drawn value text. |
| type | 'text'\|'password'\|'email'\|'number'\|... | 'text' | no | type= | Keyed. |
| multiline | bool | false | no | multiline | Boolean flag. |
| required | bool | false | no | required | Boolean flag. |
| placeholder | string | — | no | placeholder= | v1.0; value= covers most cases. |
| helperText | node | — | no | helper= | v1.0. |
| error | bool | false | no | error | v1.0 boolean. |
| disabled | bool | false | no | disabled | v1.0 boolean. |
| rows | number | — | no | rows= | With multiline. |
| defaultValue | any | — | no | — | Use value= in DSL. |
| size | 'small'\|'medium' | 'medium' | no | size= | v1.0. |
| fullWidth | bool | false | no | — | Express via sizing. |
| select | bool | false | no | — | Use Select component instead. |
| (to) | #id | — | no | to= | Clickable region. |
| (filler) | ~N \| _runs | label fill | no | filler= | Filler. |

### Img

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| (none keyless) | — | placeholder box | no | — | DSL-only image placeholder. |
| ratio | W:H | — | no | ratio= | Aspect ratio keyed. |
| alt | string | — | no | alt= | Alt text keyed (quoted literal). |
| src | string | — | no | src= | Real source; v1.0. |

### Avatar

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| variant | 'circular'\|'rounded'\|'square' | 'circular' | no | variant= | v0.1 draws a circle. |
| src | string | — | no | src= | v1.0. |
| alt | string | — | no | alt= | v1.0. |
| children | node | — | no | label= | Initials/icon. |

### Chip

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| label | node | — | yes | label= | Keyless text literal. |
| variant | 'filled'\|'outlined' | 'filled' | no | variant= | v1.0. |
| size | 'small'\|'medium' | 'medium' | no | size= | v1.0. |
| onDelete | func | — | no | deletable | v1.0 flag (shows x). |
| icon/avatar | node | — | no | (indentation) | v1.0. |
| (filler) | ~N \| _runs | 'Chip' | no | filler= | Filler. |

### Icon

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| name | string (icon id) | — | yes | name= | Keyless name; vocab is open (spec §10.3). |
| fontSize | 'small'\|'medium'\|'large'\|'inherit' | 'medium' | no | size= | v1.0. |

### List

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| children | node | — | no | (indentation) | Container of ListItems. |
| dense | bool | false | no | dense | v1.0 flag. |
| subheader | node | — | no | — | v1.0. |

### ListItem

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| children | node | — | yes | label= | Keyless text literal. |
| (to) | #id | — | no | to= | Clickable nav target. |
| secondaryAction | node | — | no | (indentation) | Trailing action; v1.0. |
| (filler) | ~N \| _runs | 1 line | no | filler= | Filler. |

### ListItemButton

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| selected | bool | false | — | — | Folded into ListItem to= in DSL. |

### ListItemIcon

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| children | node | — | — | — | Leading icon; v1.0. |

### ListItemText

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| primary | node | — | — | — | Folded into ListItem label. |
| secondary | node | — | — | — | Two-line item; v1.0. |

### Table

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| size | 'small'\|'medium' | 'medium' | — | — | Tables likely v1.0. |

### TableRow

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| selected | bool | false | — | — | — |

### TableCell

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| align | 'left'\|'center'\|'right' | 'left' | — | — | — |
| children | node | — | — | — | — |

### Badge

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| badgeContent | node | — | — | — | Overlay count; v1.0. |
| variant | 'standard'\|'dot' | 'standard' | — | — | — |

## Inputs

### Checkbox

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| checked | bool | false | no | checked | Boolean flag. |
| disabled | bool | false | no | disabled | v1.0. |
| indeterminate | bool | false | no | indeterminate | v1.0. |
| size | 'small'\|'medium' | 'medium' | no | size= | v1.0. |

### Switch

*Component tier: v0.1*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| checked | bool | false | no | checked | Boolean flag. |
| disabled | bool | false | no | disabled | v1.0. |
| size | 'small'\|'medium' | 'medium' | no | size= | v1.0. |

### RadioGroup

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| value | any | — | — | — | v1.0; group of Radio. |
| row | bool | false | — | row | v1.0. |

### Radio

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| checked | bool | false | — | checked | v1.0. |
| disabled | bool | false | — | disabled | v1.0. |

### Select

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| value | any | — | — | value= | v1.0. |
| label | node | — | — | label= | v1.0. |
| multiple | bool | false | — | multiple | v1.0. |
| variant | 'outlined'\|'filled'\|'standard' | 'outlined' | — | variant= | v1.0. |
| children | node | — | — | (indentation) | MenuItem options. |

### Autocomplete

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| options | array | [] | — | — | Renders like a TextField in v1.0. |
| multiple | bool | false | — | multiple | — |

### Slider

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| value | number\|array | — | — | value= | v1.0. |
| min | number | 0 | — | min= | — |
| max | number | 100 | — | max= | — |
| orientation | 'horizontal'\|'vertical' | 'horizontal' | — | — | — |

### Rating

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| value | number | — | — | value= | v1.0. |
| max | number | 5 | — | max= | — |

### NumberField

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| value | number | — | — | value= | New in v9; v1.0 candidate. |
| min | number | — | — | min= | — |
| max | number | — | — | max= | — |

### ToggleButtonGroup

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| value | any | — | — | value= | v1.0. |
| exclusive | bool | false | — | exclusive | — |

### ToggleButton

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| value | any | — | — | — | — |
| selected | bool | false | — | selected | — |

### ButtonGroup

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| variant | 'text'\|'outlined'\|'contained' | 'outlined' | — | variant= | v9 removed deprecated classes. |
| orientation | 'horizontal'\|'vertical' | 'horizontal' | — | — | — |
| children | node | — | — | (indentation) | — |

### Fab

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| variant | 'circular'\|'extended' | 'circular' | — | variant= | v1.0. |
| size | 'small'\|'medium'\|'large' | 'large' | — | size= | — |

## Feedback

### Alert

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| severity | 'error'\|'warning'\|'info'\|'success' | 'success' | — | severity= | v9 a11y improvements; v1.0. |
| variant | 'standard'\|'filled'\|'outlined' | 'standard' | — | variant= | — |
| children | node | — | — | label= | Message text. |

### Dialog

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| open | bool | false | — | open= | v9 a11y improvements; v1.0 (modal frame). |
| maxWidth | enum\|false | 'sm' | — | max= | — |
| fullScreen | bool | false | — | — | — |
| children | node | — | — | (indentation) | Title/Content/Actions. |

### Snackbar

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| open | bool | false | — | — | Transient; v1.0 at most. |
| message | node | — | — | label= | — |

### CircularProgress

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| variant | 'determinate'\|'indeterminate' | 'indeterminate' | — | — | v1.0. |
| value | number | — | — | value= | — |

### LinearProgress

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| variant | enum | 'indeterminate' | — | — | v9 removed deprecated CSS classes. |
| value | number | — | — | value= | — |

### Skeleton

*Component tier: v1.0*

| Property | Type / values | Default | Keyless? | DSL mapping | Notes |
| --- | --- | --- | --- | --- | --- |
| variant | 'text'\|'circular'\|'rectangular'\|'rounded' | 'text' | — | variant= | Overlaps DSL filler concept; v1.0. |
| width | number\|string | — | — | w= | — |
| height | number\|string | — | — | h= | — |
