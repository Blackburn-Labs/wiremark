# wiremark documentation

**wiremark** is a text-based, markdown-embeddable wireframing format — think
"YAML-flavored [MUI](https://mui.com/)": a hierarchy of familiar Material UI
component names, indented to show containment, rendered in a hand-drawn
(Balsamiq-like) style.

A wireframe lives inside a fenced ` ```wireframe ` block:

````markdown
```wireframe
Wireframe #login mobile
  Stack col gap=2
    Typography h4 "Sign in"
    TextField "Email" type=email
    TextField "Password" type=password
    Button "Sign in" primary to=#dashboard
```
````

These docs describe **wiremark the language** — the syntax you write inside that
block. They are deliberately *adapter-agnostic*: nothing here depends on a
particular host (Obsidian, markdown-it, remark, the editor, ...). Each adapter
finds the fenced block and hands its contents to the same core, so what you
learn here applies everywhere wiremark renders.

## Guides

Read in order if you are new; jump around once you know the basics.

1. [Introduction](guides/01-introduction.md) — what wiremark is, the mental model, and when to reach for it.
2. [Getting started](guides/02-getting-started.md) — your first wireframe, line by line.
3. [Syntax & structure](guides/03-syntax-and-structure.md) — indentation, components, properties, quoting, comments.
4. [Layout & sizing](guides/04-layout-and-sizing.md) — `Stack`, `Box`, `Grid`, and the sizing tokens.
5. [Text & filler](guides/05-text-and-filler.md) — real text, placeholder filler, amounts, and styles.
6. [Frames, anchors & flow](guides/06-frames-and-flow.md) — naming screens, linking them, and composing shared chrome.
7. [Patterns & recipes](guides/07-patterns.md) — worked examples for the layouts you'll build most.
8. [Style & best practices](guides/08-style-guide.md) — conventions, agent-first tips, and common mistakes.
9. [Icons](guides/09-icons.md) — the built-in Material icon vocabulary, custom icons, and Iconify packs.

## Tools

- [Rendering to SVG with the CLI](tools/cli.md) — turn a `.wiremark` file into
  a standalone SVG with `npx @wiremark/cli`, no host required.

## Reference

- [Component library reference](reference/components.md) — every supported
  component and property, with its keyless behavior, default, and DSL mapping.
- [Built-in icon gallery](reference/icons.md) — every built-in icon, rendered,
  by category.

The reference pages are **generated** — components from
[`meta/element-specs.json`](../meta/element-specs.json), icons from
[`meta/builtin-icons.json`](../meta/builtin-icons.json); each JSON is the
single source of truth for its page. Do not edit the generated markdown by
hand. After changing a JSON, regenerate:

```sh
npm run docs:reference   # components.md from element-specs.json
npm run icons:builtin    # icons.md + the committed icon data, from builtin-icons.json
```

## About these docs

Everything here is plain [GitHub-flavored Markdown](https://github.github.com/gfm/)
with no host-specific extensions, so it renders correctly on GitHub, in an IDE
preview, or dropped into a static-site generator such as Docusaurus, VitePress,
or MkDocs. Files are numbered for ordering; links between them are relative.

> wiremark is specified at **v0.1**. The guides teach the stable v0.1 core; the
> reference lists every component and property wiremark supports.
