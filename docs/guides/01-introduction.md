# Introduction

wiremark is a text-based format for **wireframes** — low-fidelity screen
sketches that capture layout and intent without the detail of a real design.
You write a small, indented outline of component names; a renderer turns it into
a hand-drawn picture of the screen.

```wireframe
Wireframe #login mobile
  Stack column gap=2
    Typography h4 "Sign in"
    TextField "Email" startIcon=Email
    TextField "Password" startIcon=Lock
    Button "Sign in" contained to=#dashboard
```

That block describes a phone-sized sign-in screen: a heading, two fields, and a
contained button that navigates to a `#dashboard` frame. No coordinates, no
styling, no boilerplate — just the structure.

## The mental model

If you have used a component-based UI library, wiremark will feel familiar.
Three ideas carry the whole format:

1. **Component names are familiar.** `Stack`, `Box`, `Typography`, `Card`,
   `Grid`, `Button`, `TextField`, `AppBar`, `List`, ... The vocabulary is
   inspired by Material UI, but it is wiremark's own set — check the
   [component reference](../reference/components.md) rather than assuming a
   library's name exists here.

2. **Indentation is containment.** A line indented under another line is its
   child. That single rule replaces every wrapper, brace, and closing tag. The
   shape of the text *is* the shape of the screen.

3. **Defaults do the work.** A bare component name renders something sensible. A
   lone `Typography` is a line of placeholder text; a lone `Button` reads
   "Button". You add detail only where it communicates something.

## What it is good for

- **Fast wireframing.** Sketch a screen in a few lines, in any text editor.
- **Living inside documents.** A wireframe is a fenced code block, so it travels
  with your markdown — specs, PRDs, READMEs, design notes — and renders inline
  the way a Mermaid diagram does.
- **Capturing flows, not just screens.** Frames are named with `#id` and linked
  with `to=#id`, so a navigation graph falls out of the document for free (see
  [Frames, anchors & flow](06-frames-and-flow.md)).
- **Working with AI agents.** The format is intentionally low-ambiguity and
  low-token. An LLM can read, write, and reason about a wireframe with little
  to no setup, because the component names read the way it expects UI
  vocabulary to read.

## What it is not

- **Not pixel-perfect design.** Output is a deliberate hand-drawn sketch, not a
  polished mockup. That is a feature: a sketch invites feedback on structure
  instead of bikeshedding on colors.
- **Not a styling system.** There is no `style=` or `sx=`, no theme, no colors.
  Hand-drawn *is* the render model. (`filler=` is unrelated — it controls
  placeholder content, not visual theming. See [Text & filler](05-text-and-filler.md).)
- **Not responsive.** A frame describes one screen at one size. There are no
  breakpoints.

## The design principles behind it

These shape every decision in the format, and knowing them makes the rules feel
obvious rather than arbitrary:

- **Agent-first.** Self-describing, low-ambiguity, cheap to tokenize.
- **Borrowed semantics.** Vocabulary is MUI-inspired so it feels familiar —
  without promising name-for-name parity.
- **Hierarchy over coordinates.** Indentation and relative sizing, never x/y.
- **Aggressive defaulting.** Bare names render; detail is opt-in.
- **Hand-drawn by default.** A sketch aesthetic, not a theme to configure.
- **Markdown-native.** One pure core, embedded via thin per-host adapters.

## Next

Head to [Getting started](02-getting-started.md) to write and understand a
wireframe line by line.
