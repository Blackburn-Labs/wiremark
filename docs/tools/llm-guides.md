# Giving wiremark to AI agents

wiremark is designed to be **agent-first**: the vocabulary is a small set of
familiar component names, the structure is indentation, and defaults carry
most of the weight, so an LLM can usually read and write it with no
instructions at all. When a project leans on
wiremark heavily, though, a little precision pays off — exact enum values, the
quoting rule, sizing order, frame composition. For that we publish two
ready-made instruction files you can hand straight to an agent.

## The two files

- **Full guide — <https://docs.wiremark.dev/wiremark-llm.md>**
  The rules, worked examples, common mistakes, and a condensed list of every
  component with its properties, enum values, defaults, and aliases. An agent
  with this file in context needs no other reference to read or write
  wiremark.

- **Compact guide — <https://docs.wiremark.dev/wiremark-llm-compact.md>**
  The same rules boiled down to one screen, with **no** component list — it
  links to the [component reference](https://docs.wiremark.dev/reference/components)
  for lookups instead. Use this when you want to spend as little of the
  agent's context window as possible and the agent can fetch a URL when it
  needs details.

Both are plain markdown, written *to* the agent ("you are reading or writing
wiremark…"), and the full guide's component list is generated straight from
the renderer's own component registry on every docs build — so it describes
exactly what renders, and cannot drift as components are added.

## Using them

**Reference by URL.** If your agent can fetch the web, one line in your
project's `CLAUDE.md` / `AGENTS.md` is enough:

```markdown
## Wireframes

Screens in this repo are sketched in wiremark (fenced ```wireframe blocks).
Before reading or writing one, fetch and follow
https://docs.wiremark.dev/wiremark-llm.md
```

**Or download into the repo.** For offline agents, or to pin a copy alongside
the wireframes it describes:

```sh
curl -O https://docs.wiremark.dev/wiremark-llm.md
# or the small one:
curl -O https://docs.wiremark.dev/wiremark-llm-compact.md
```

…then point at the local file instead:

```markdown
Before reading or writing a wireframe, read ./wiremark-llm.md and follow it.
```

## Which one?

| | Full | Compact |
|---|---|---|
| Component list | Inline (no lookups needed) | No — links to the reference |
| Context cost | A few thousand tokens | Under a thousand tokens |
| Best for | Offline agents; heavy wireframe work | Agents with web access; occasional use |

If you are unsure, start with the full guide: it is still small, and an agent
that never has to stop and look something up writes better wireframes.

## The Claude skill

For Claude Code (and other hosts that support
[Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)),
the same instructions are packaged as a downloadable **skill**. A skill loads
*progressively*: Claude sees only the skill's one-line description until a
wireframe task actually comes up, then reads the instructions, and opens the
bundled component reference only when it needs to look something up — so it
costs almost no context until used.

Install it into a project (or use `~/.claude/skills/` for all projects):

```sh
mkdir -p .claude/skills/wiremark
curl -o .claude/skills/wiremark/SKILL.md https://docs.wiremark.dev/skills/wiremark/SKILL.md
curl -o .claude/skills/wiremark/reference.md https://docs.wiremark.dev/skills/wiremark/reference.md
```

The skill teaches Claude the same rules as the guides above, tells it to check
`reference.md` before using an unfamiliar component, and to validate its work
by rendering with `npx @wiremark/cli`. The reference is generated from the
renderer's registry, same as the full guide's list.
