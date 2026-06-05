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
Button "Sign in" primary to=#dashboard
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
the reserved multi-frame flow view (see [below](#one-frame-per-block)).

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
- **Alignment and size.** The **foreground frame drives the screen size.** The
  background is underlaid at the top-left with no scaling; if it is larger it
  simply overflows/clips. There is no fitting behavior.

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

## One frame per block

In v0.1, each ` ```wireframe ` block holds exactly one `Wireframe`, which keeps
every block independently renderable. To show several screens, use several
blocks; their `#id` / `to=#id` links connect across the whole document.

> **Reserved for the future.** A forward-looking mode allows **multiple frames in
> one block**, auto-laid-out as a flow diagram (Mermaid-like) with connectors
> derived from `to=` links. It is reserved so the grammar stays open; v0.1
> renderers may treat a multi-frame block as an error or stack the frames.

## Recap

- `#id` names a frame; put it on the `Wireframe` root.
- `to=#id` on any element links to a frame; the nav graph is inferred from those
  links.
- Targets are frames only; there is no deep-linking and no `from`.
- `background=#id` underlays a shared frame; `visible=false` keeps that shared
  frame from drawing on its own.

Next: [Patterns & recipes](07-patterns.md).
