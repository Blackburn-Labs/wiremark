---
name: wiremark
description: Read and write wiremark, the text-based wireframe DSL rendered from fenced wireframe code blocks and .wiremark files. Use when creating, editing, or interpreting wireframes, screen sketches, screen flows, or low-fidelity UI mockups in markdown documents.
---

# wiremark

wiremark is a plain-text wireframe format: an indented outline of component
names that renders to a hand-drawn SVG sketch. Source lives in a fenced code
block tagged `wireframe` (or a standalone `.wiremark` file).

```wireframe
Wireframe #login mobile
  Stack column gap=2
    Typography h4 "Sign in"
    TextField "Email" type=email
    TextField "Password" type=password
    Button "Sign in" contained to=#dashboard
```

Before using a component not shown above, check `reference.md` in this skill
folder -- it lists every component with its props, enum values, and defaults.
Do not invent components.

## Rules

- Every line is `Component [keyless-value | key=value]*`. Components are
  PascalCase names (`Stack`, `Card`, `TextField`, `AppBar`, ...). Many feel
  familiar from UI libraries, but the vocabulary is wiremark's own -- never
  guess a name; check `reference.md`.
- Indentation is containment: a line indented under another is its child. Two
  spaces per level, never tabs. Only components marked `[c]` in `reference.md`
  take children -- children under a leaf are dropped *silently*.
- Quoted = drawn text, and quoting it is mandatory (`TextField "Email"`, never
  `TextField Email`). Bare = setting: enum value (`outlined`), boolean flag
  (`checked`), sizing token, number, or icon name. Never quote a setting:
  `variant="outlined"` and `gap="2"` are hard errors. No bare text lines --
  wrap text in its owner (`Typography "..."`).
- Keyless values resolve by type/value alone, in any order:
  `TextField "Email" outlined` == `TextField label="Email" variant=outlined`.
- Sizing is `width height`, in that order, bare tokens only (no `width=` key),
  on components marked `[w h]`: `240px` (pixels), `30%`, `*` (fill), bare
  number (flex weight). `Box 240px *` is a fixed-width, full-height rail.
  Omit for natural content size.
- Defaults do the work: bare `Img` draws a placeholder image, bare `Button`
  reads "Button". For placeholder text give a filler amount token on a
  component marked `[~]`: `~3` (sentences/lines), `~5w` (words), `~2l`
  (lines), or `_`/`__`/`___`. Filler style: `filler=squiggle|lorem|blocks` on
  the `Wireframe` root.
- Comments are `//` to end of line.
- Frames: `Wireframe #id mobile|landscape|portrait` (or both `w=` and `h=`),
  one or more per document. `visible=false` hides a shared-shell frame;
  `background=#shell` composes it underneath another frame; `Anchor #region`
  + `anchor=#region` places foreground content inside the shell (drop the
  preset when using `anchor=`); `direction=TD|LR` orients multi-frame flow.
- Every element accepts `to=#frame-id`, making it a link; the navigation graph
  is inferred from those links (frames only, no deep links). Multiple visible
  frames render as a flow chart automatically.
- Icon props take Material icon names, forgivingly spelled (`Icon Search`,
  `Button "Save" startIcon=Check`); unknown names degrade to a placeholder.
- Hard errors (must fix): tabs, unquoted text, quoted enum/number, unknown
  component/prop, bad enum value. Soft warnings (still renders): missing
  background/anchor target, unknown icon. Silent (check yourself): a `to=`
  link to a nonexistent frame, children nested under a leaf component.
- Out of scope: styling (`style=`/`sx=`/colors), breakpoints, x/y coordinates.

## Gotchas

Button variants are `text|outlined|contained` (use `contained` for a primary
action, never `primary`); Typography body variants are `body1`/`body2` (not
`body`); checkboxes/switches are `Control checkbox` / `Control switch`
(+ `checked`); companion components you may know from UI libraries do not
exist (no `DialogTitle`/`DialogContent`, `IconButton`, `Menu`, `Container`,
`Paper`, `ListItemText` -- nest content directly, use a bare `Icon`, quote
the `ListItem` label).

## Checking your work

After writing or editing a wireframe, validate it: save the source as
`x.wiremark` and run `npx @wiremark/cli x.wiremark -o x.svg` (Node 18+). Hard
errors exit non-zero with a line number; warnings print to stderr while the
SVG is still written. Dead `to=` links and children under leaf components are
silent -- re-read those yourself.

Further reading: <https://docs.wiremark.dev> (human docs),
<https://docs.wiremark.dev/reference/icons> (icon gallery).
