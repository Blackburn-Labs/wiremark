# wiremark component reference (condensed)

Every component the renderer implements, with its props. Legend:

- `Name [c]` -- accepts children (indent them under it). **Anything without
  `[c]` is a leaf: children indented under it are silently dropped.**
- `[w h]` -- takes bare sizing tokens, width then height (`240px`, `30%`, `*`,
  or a bare flex weight); there is no keyed `width=`/`height=` form.
- `[~]` -- accepts filler amount tokens `~N`/`~Nw`/`~Nl`/`_`.
- Each property is `name|alias:TYPE=default`, with `*` appended when the value
  may be given keyless (bare, no `key=`). Enums show their values inline:
  `(a|b|c)`. A prop marked `(keyless only)` has no `key=` form at all.
- Types: `T` quoted text, `N` number, `B` boolean flag (bare name means true),
  `I` icon name, `R` `#frame-id` reference, `A` aspect ratio (like `16:9`).
- Universal: every component also accepts `to=#frame-id` (alias `href=`) and a
  bare `#id` token (names the element, e.g. as an `anchor=` target). The
  `Wireframe` root is described in SKILL.md.

This file is a pinned local copy and may lag behind the renderer. If a
wireframe uses a component or prop not listed below, or you need a component
and want to check whether a newer release added it, fetch the current version
of this same list from <https://docs.wiremark.dev/skills/wiremark/reference.md>
before concluding it does not exist.

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
Calendar [w h] -- month|title:T*, variant:(month|compact|week|year)=month*, value|v|val|selected:N, today:N, weekStart:(sun|mon)=sun, weekdays:B=true*, header|controls:B=true*, events:B*
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
