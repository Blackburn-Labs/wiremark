# Frames, anchors & flow

This is what turns wiremark from "draws boxes" into "captures a user flow". By
naming frames and linking them, you get an embedded navigation graph at no extra
cost — and a way to compose shared app chrome once and reuse it.

## Naming a frame: `#id`

A frame is named with a `#id` token on its `Wireframe` root. It is
HTML-anchor-like and unmistakable to parse:

```wireframe
Wireframe #login mobile
```

```wireframe
Wireframe #dashboard landscape
```

The name is optional, but you need one on any frame you want to link to.

## Linking: `to=#id`

**Any element can carry a `to=` property**, which makes that element — or its
whole region — a clickable zone that navigates to a frame:

```wireframe
Button "Sign in" contained to=#dashboard
ListItem "Settings" to=#settings
Box * * to=#detail            // an entire region is clickable
Card to=#product              // the whole card navigates
```

The `to=` value is always a frame anchor.

## Two deliberate constraints

These keep the flow model trivial:

1. **`to=` targets frames only — never elements inside a frame.** There is no
   `to=#dashboard.settings` deep-linking. The flow graph stays at the screen
   level.
2. **The graph is inferred, never declared.** There is no `from`. The navigation
   graph is reconstructed entirely from where `to=` links live. Read a document
   and you can build the full screen-to-screen flow with zero extra syntax.

Because links are inline and frame-level, a renderer can emit the inferred
navigation as a Mermaid flowchart automatically — the same structure that powers
the multi-frame flow view (see [below](#multiple-frames-and-the-flow-view)).

## Composing shared chrome: `background=#id`

Most apps repeat the same shell — app bar, nav rail, footer — on every screen.
Rather than copy it into each frame, author it once as its own frame and pull it
in underneath another with `background=#id`:

```wireframe
Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Typography h6 "Acme"
  Box 240px *            // left nav rail, part of the shared chrome
```

```wireframe
Wireframe #dashboard landscape background=#shell
  Grid cols=3            // only the screen-specific content; chrome comes from #shell
    Card
    Card
    Card
```

`#dashboard` renders its grid *on top of* the `#shell` frame. Edit the shell once
and every screen that backgrounds it updates.

How it behaves:

- **Resolution scope.** The target may live in the **same block or a different
  block** in the document. This is the one sanctioned cross-block dependency in
  v0.1 — a frame that uses `background=` is no longer independently renderable,
  because the renderer must resolve the id across the whole document.
- **Missing target.** If the id cannot be resolved, the renderer draws the
  foreground frame alone and emits a **warning**. It never hard-fails.
- **Chaining and cycles.** Backgrounds may chain (`#a` backgrounds `#b` which
  backgrounds `#c`), painted deepest-first. A frame must not reference itself
  directly or transitively; renderers detect cycles and break them with a
  warning.
- **Alignment and size (no anchor).** Without `anchor=`, the **foreground frame
  drives the screen size.** The background is underlaid at the top-left with no
  scaling; if it is larger it simply overflows/clips. There is no fitting
  behavior. To place the foreground *inside* a region of the background, use an
  [anchor point](#anchor-points) instead.

## Anchor points

`background=` underlays the shell, but both frames' content starts at the
top-left — a dashboard composed over an app shell would paint across the
shell's app bar and nav rail. An **anchor point** lets the background say where
foreground content belongs.

### Declaring regions: `Anchor #id`

`Anchor` is an invisible, named region — a layout component that draws nothing.
Unsized, it fills the leftover space of its container on both axes, so a bare
`Anchor #content` means "the rest of this container". A background frame may
declare several:

```wireframe
Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Typography h6 "Acme"
  Stack row 100% *
    Box 240px *
      Anchor #side         // a region inside the nav rail
    Anchor #content        // everything right of the rail, under the bar
```

Sizing tokens pin a region explicitly — a fixed bottom strip:

```wireframe
Wireframe #base portrait visible=false
  Anchor #main             // flexes: everything above the console
  Anchor #console * 200px  // a fixed 200px-tall strip at the bottom
```

### Composing into a region: `anchor=#id`

A foreground frame picks a region with `anchor=#id` (alias `at=`), given
**instead of** a preset or `w=`/`h=`:

```wireframe
Wireframe #home background=#shell anchor=#content
  Typography h1 "Dashboard"
  Grid cols=3
    Card to=#details
```

How it behaves:

- **The anchor sizes and places the frame; the background sizes the canvas.**
  `#home`'s content is laid out inside `#content`'s box, and its canvas — the
  rectangle drawn, clipped, and used by the flow chart — becomes `#shell`'s.
- **The region is a placement, not a viewport.** Normal frame padding applies
  inside it; overflowing content is clipped at the canvas only.
- **Shadowing.** The id is looked up in the frame's background chain only,
  **nearest background first** — a nearer frame's `#content` shadows a deeper
  one with the same id; within one frame, document order wins. The foreground's
  own tree is never searched.
- **Separate namespaces.** Element ids (`anchor=`) and frame ids
  (`background=`, `to=`) share the `#` sigil but never mix: `anchor=` never
  matches a frame, and `to=` stays frames-only.
- **Chaining.** Anchored frames compose transitively: if `#page` anchors into
  `#shell`, a third frame may use `background=#page anchor=#x` where `#x` lives
  in `#page` *or* `#shell`.
- **Any `#id` works.** `anchor=` may target any element carrying a `#id`
  (e.g. a `Card #hero`), but `Anchor` is the purpose-built carrier and the
  documented pattern.

Like `background=`, anchors degrade gracefully — every failure is a soft
warning, never a hard fail:

| Condition | Warning | Fallback |
|---|---|---|
| `anchor=` without `background=` | `anchor "#a" requires background=` | normal standalone layout |
| id not found in the background chain | `anchor "#a" not found in background chain of "#f"` | top-left overlay at own/preset size |
| `anchor=` together with a preset or `w=`/`h=` | `preset/size ignored: frame "#f" is sized by anchor "#a"` | the anchor wins |
| `Anchor` with no `#id` | `Anchor without #id can never be targeted` | laid out normally (an invisible spacer) |
| duplicate `#id` within one frame | `duplicate id "#a" in frame "#f"` | the first declaration wins |

## Hiding a reusable frame: `visible=false`

A frame that exists only to be a background should not also be drawn as its own
screen. `visible=false` suppresses standalone rendering:

```wireframe
Wireframe #shell visible=false
  AppBar
    Toolbar
      Typography h6 "Acme"
```

- `visible` defaults to `true`.
- `visible=false` omits the frame from standalone drawing **but does not** stop
  it being used as a `background=` target. "Hidden" means "not drawn on its own",
  not "never drawn".

## Multiple frames and the flow view

A single ` ```wireframe ` block can declare **several `Wireframe` frames**. When
more than one frame is visible, wiremark arranges them as a **flow chart**: each
frame is a node, positioned automatically over the inferred `to=#id` graph, with
hand-drawn connectors joining linked screens (the same structure `toMermaid`
emits).

```wireframe
Wireframe #home landscape
  Grid cols=3
    Card to=#details
    Card to=#details

Wireframe #details landscape
  Link "Back" to=#home
  Typography h1 "Item details"
```

- **Direction.** The flow runs top-down by default. Put `direction=LR` on a frame
  to lay it out left-to-right instead (`direction=TD` is the explicit default); a
  host may also pass `{ direction }` to the renderer. The first frame that
  declares `direction=` sets it for the whole document.
- **Background templates stay out of the flow.** A `visible=false` frame (e.g. a
  `#shell` pulled in via `background=#id`) is never a flow node, but still
  composes underneath the screens that reference it.
- **Only resolvable links draw.** A `to=#id` whose target is not a frame in the
  document — or a frame linking to itself — is left out of the graph and draws no
  connector; it never hard-fails.
- **Disconnected screens** (frames nothing links to) are packed alongside the
  linked group rather than dropped.

A lone frame is unaffected: a single-`Wireframe` document renders exactly as it
always has, with no flow chrome.

## Recap

- `#id` names a frame; put it on the `Wireframe` root.
- `to=#id` on any element links to a frame; the nav graph is inferred from those
  links.
- Targets are frames only; there is no deep-linking and no `from`.
- `background=#id` underlays a shared frame; `visible=false` keeps that shared
  frame from drawing on its own.
- `Anchor #id` names a region inside a background frame; `anchor=#id` (alias
  `at=`) composes a foreground frame's content into that region.
- Several visible frames auto-arrange into a connected flow chart; `direction=TD`
  (default) or `direction=LR` sets its orientation.

Next: [Patterns & recipes](07-patterns.md).
