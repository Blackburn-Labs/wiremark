# Icons

Several components take **icon props** — `Icon` itself, `Button`'s
`startIcon`/`endIcon`, `Fab`, `ToggleButton`, `BottomNavigationAction`,
`CardHeader`, `AccordionHeader`, `Option`, `Rating`. Give any of them an icon
*name* and wiremark draws the real glyph: clean, solid-black Material artwork
inside the usual hand-drawn chrome (the classic wireframing look — sketchy
frames, crisp icons).

```wireframe
Wireframe #home mobile
  AppBar
    Toolbar
      Icon Menu
      Typography h6 "Inbox"
      Spacer
      Icon Search
  Button "Save" contained startIcon=Check
  Button "Delete" outlined startIcon=Delete
```

## The built-in vocabulary

wiremark ships ~400 built-in icons: the **filled (baseline) style of Google's
Material Icons** — the same set behind `@mui/icons-material`, so the names you
(or an agent) already know from MUI just work: `ArrowBack`, `Close`,
`MoreVert`, `ShoppingCart`, `Visibility`, …

Browse the full set in the [built-in icon gallery](../reference/icons.md).

Lookup is **forgiving about spelling**: `ArrowBack`, `arrow-back`,
`arrow_back`, and `arrowback` all resolve to the same icon. Docs and examples
use MUI PascalCase.

Names are identifiers, so they can be written **bare or quoted**, keyed or
keyless:

```wireframe
Icon Search          // keyless, bare
Icon "Search"        // keyless, quoted — identical
Button "Go" startIcon=ArrowForward
```

One precedence note for keyless names: bare tokens are first tried as sizing,
enums, and boolean flags, so `Fab large` reads as a *size*. Quote the name
(`Fab "large"`) if you ever need a bare-looking word as an icon name.

## Unknown names degrade gracefully

An icon name that doesn't resolve is **never an error**: the component draws
the generic placeholder glyph (a muted box with a diagonal) and the render
reports a soft warning — `unknown icon "Foo" -- rendered as placeholder`. No
icon at all draws the same placeholder, with no warning. Wireframes stay
renderable while you iterate.

## Custom icons in the document

For a logo or anything outside the built-in set, declare your own icons in a
top-level **`Icons` block** — a sibling of your `Wireframe` frames, anywhere in
the file. Each entry is a name plus quoted **SVG path data** (the `d` of a
`<path>`), optionally with the square grid it was drawn on (`viewBox=`,
default 24):

```wireframe
Icons
  logo "M12 2 2 22h20z"
  brand "M4 4h24v24H4z" viewBox=32

Wireframe #home
  AppBar
    Toolbar
      Icon logo
      Button "Buy" startIcon=brand
```

Inline icons are **path data only** by design — monochrome, black, and nothing
to sanitize — and they take precedence over injected and built-in icons of the
same name, so a document is fully self-contained and portable.

Entries may instead reference an SVG **file**, resolved by the host (the CLI
resolves relative to the `.wiremark` file; core itself never touches the
filesystem):

```wireframe
Icons
  logo src=./art/logo.svg
```

A file that can't be loaded degrades like an unknown name: placeholder plus a
warning.

## Injecting icons from the API

Hosts (and scripts) can inject icons at render time — either a flat
name-to-path map, or whole [Iconify](https://iconify.design) icon packs, the
de-facto JSON format every major icon set publishes
(`@iconify-json/<set>`, ~200k icons):

```js
import { render } from '@wiremark/core';
// JSON import attributes need Node 18.20+ / 20.10+; on older engines use
// createRequire or JSON.parse(readFileSync(...)) instead.
import lucide from '@iconify-json/lucide/icons.json' with { type: 'json' };

render(source, { icons: { logo: 'M12 2 2 22h20z' } });   // flat map
render(source, { icons: [lucide] });                     // full Iconify pack
```

Pack icons resolve by bare name (`Icon "feather"`) and by an explicit
`pack:name` spelling (`Icon "lucide:feather"`) when sets collide. Precedence,
lowest to highest: built-in → injected → document `Icons` block.

## Custom icons from the CLI

The CLI wires both host-side doors for you:

```sh
npx @wiremark/cli home.wiremark --icons ./my-icons
```

`--icons <dir>` registers every `<name>.svg` in the directory as icon `name`,
and `Icons`-block `src=` entries load relative to each input file. Either way
the CLI extracts the SVG's artwork (scripts, styles, and event handlers are
stripped) and hands wiremark the geometry.

## Tips

- **Stick to MUI names** for anything common — they're what agents guess
  correctly, and they render identically everywhere wiremark runs.
- Custom artwork reads best as a **single solid path on a square grid**.
  Wireframes are monochrome ink: `currentColor` becomes the ink, but other
  hardcoded colors in injected artwork pass through as-is — keep custom icons
  single-color.
- `Rating` draws its hand-drawn stars by default; setting `icon=`
  (and optionally `emptyIcon=`) explicitly swaps the row to that artwork —
  `Rating 3 icon=Favorite` reads as a heart rating.
