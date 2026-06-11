# Syntax & structure

wiremark has essentially one line shape, applied recursively through
indentation:

```
<indentation> Component [ keyless-value | key=value ]*
```

A component name, then any number of properties — keyed or keyless, in any
order. This guide covers each part precisely.

## Indentation is containment

A line indented further than the line above it is a **child** of that line.
Siblings share the same indentation. There are no braces, fences, or closing
tags.

```wireframe
Stack row              // parent
  Box * *              // child of Stack
    Typography         // child of Box
  Box * *              // sibling of the first Box
```

Indentation follows **YAML's whitespace conventions**:

- **Spaces only — tabs are not allowed.** A parser should reject tabs.
- **Be consistent.** Use the same step at every level.
- **Two spaces per level is idiomatic.**

The shape of the text is the shape of the screen, so keep it tidy — see the
[style guide](08-style-guide.md).

## Components

The first token on a line is the component name. It is always **PascalCase**:
`Stack`, `Box`, `Typography`, `Card`, `Grid`, `Button`, `TextField`, `AppBar`,
`List`, `ListItem`, ... The full set is in the
[component reference](../reference/components.md).

Some components have no properties at all and are valid as a bare name:

```wireframe
Divider
Spacer
```

## Properties: keyed and keyless

After the component name, a line carries two kinds of properties:

- **Keyed** — written `key=value`: `type=password`, `cols=3`, `to=#dashboard`,
  `variant=outlined`, `label="Email"`.
- **Keyless** — a value with no `key=`, resolved to a property by its *type or
  value alone*: an enum (`outlined`, `row`, `h3`), a string literal
  (`"Sign in"`), or a sizing token (`100% 30%`).

Keyed and keyless properties may be interleaved freely. **Order does not encode
meaning** (with one exception — sizing, covered in
[Layout & sizing](04-layout-and-sizing.md)).

## The quoting rule

One rule governs how every token is read:

- **A quoted string is always a free-form text literal** — text that will be
  *drawn* (a label, a value, alt text). Quoting is **mandatory** for literals.
  There is no "optional quoting".
- **A bare token is never a text literal.** It is one of: an **enum** value
  (`outlined`, `row`, `h3`), a **boolean flag** (`primary`, `required`), a
  **number** (only as a keyed value like `cols=3`, or as sizing), or a **sizing
  token** (`100%`, `*`, `240px`, flex weight `2`).

This makes a line scannable: quotes mark "text that appears on screen", bare
tokens mark "settings".

```wireframe
TextField label="Outlined" variant=outlined value="Outlined"
```

Here the **label** reads "Outlined" and the **value** reads "Outlined", while
`variant=outlined` is plainly an enum — the quotes (or their absence) tell you,
and the parser, which is which.

Because a bare word can never be a text literal, this is **invalid**:

```
TextField Email          // wrong: 'Email' is free-form text and must be quoted
```

and must be written:

```wireframe
TextField "Email"        // correct
```

## How keyless resolution works

A keyless property is just a keyed property with the `key=` left off. These two
lines are identical:

```wireframe
TextField "Email" outlined value="example@email.com"
TextField label="Email" variant=outlined value="example@email.com"
```

The governing principle: **every keyless value must resolve to exactly one
property by its value or type alone.** To guarantee that, component definitions
obey four rules (you do not have to memorize them — they are why you never hit
ambiguity):

1. **At most one string-literal** keyless property per component (the text/label).
2. **Numbers may not be keyless**, except sizing tokens.
3. **An enum value may not be keyless if it duplicates a boolean flag's key.**
4. **An enum value may not be keyless if it appears in more than one enum property.**

The practical consequence: on the core components, the keyless set is at most one
text literal (the label) plus at most one enum (the variant) plus sizing — none
of which can collide. So they may appear in **any order**:

```wireframe
Typography "Acme" h6
Typography h6 "Acme"
Button "Buy" primary
Button primary "Buy"
```

> **Style tip (non-binding).** The grammar accepts any order, but pick a
> convention and stick to it — for example, always put the string literal last.
> The parser does not care; your future readers will. See the
> [style guide](08-style-guide.md).

Each component's reference entry lists which properties are keyless-allowed (the
"Keyless?" column).

## No bare text nodes

A quoted string **cannot stand alone** on a line. Every drawn string must be the
content of a component that owns it. Many markup formats allow loose text
children; wiremark does not, because a loose string is ambiguous (which
component renders it, at what variant?).

Invalid:

```
Box * *
  "Up 12% this week"          // wrong: bare text node
```

Valid — wrap it in the component that owns it:

```wireframe
Box * *
  Typography "Up 12% this week"   // correct
```

## Comments

`#` is reserved for anchors (frame ids and links), so comments use `//` to the
end of the line:

```wireframe
Button "Save" primary   // submits the form
```

## Recap

- One line shape: `Component` then properties, nested by indentation.
- Spaces only, consistent, 2 per level.
- Quoted = drawn text (mandatory); bare = enum / flag / number / sizing.
- Keyed and keyless properties mix freely; order is free (except sizing).
- No loose text; comment with `//`.

Next: [Layout & sizing](04-layout-and-sizing.md).
