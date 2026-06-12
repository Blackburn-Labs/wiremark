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

## Setup Agent Skill

The same instructions are also packaged as an
[Agent Skill](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview):
a folder holding a `SKILL.md` (the instructions) and a `reference.md` (the
component lookup). A skill loads *progressively*: the agent sees only the
skill's one-line description until a wireframe task actually comes up, then
reads the instructions, and opens the bundled component reference only when it
needs to look something up — so it costs almost no context until used.

The skill format started with Claude, but it is host-agnostic markdown: Claude
Code, Claude.ai, OpenAI Codex, and a growing list of other agents all load the
same files. Claude Code is the primary case, covered first; the others follow.

### Claude Code

Install the skill into a single project:

```sh
mkdir -p .claude/skills/wiremark
curl -o .claude/skills/wiremark/SKILL.md https://docs.wiremark.dev/skills/wiremark/SKILL.md
curl -o .claude/skills/wiremark/reference.md https://docs.wiremark.dev/skills/wiremark/reference.md
```

…or into your home directory, which makes it available in every project:

```sh
mkdir -p ~/.claude/skills/wiremark
curl -o ~/.claude/skills/wiremark/SKILL.md https://docs.wiremark.dev/skills/wiremark/SKILL.md
curl -o ~/.claude/skills/wiremark/reference.md https://docs.wiremark.dev/skills/wiremark/reference.md
```

| Location | Path | Applies to |
|---|---|---|
| Project | `.claude/skills/wiremark/` | That project only |
| Personal | `~/.claude/skills/wiremark/` | All your projects |

If the skill is installed at both levels, Claude Code uses the personal copy.

The skill teaches Claude the same rules as the guides above, tells it to check
`reference.md` before using an unfamiliar component, and to validate its work
by rendering with `npx @wiremark/cli`. The reference is generated from the
renderer's registry, same as the full guide's list.

The download is a pinned local copy — it does not update itself. Since the
published `reference.md` is regenerated from the registry on every docs
deploy, re-run the `reference.md` line periodically to pick up components
added since you installed:

```sh
curl -o .claude/skills/wiremark/reference.md https://docs.wiremark.dev/skills/wiremark/reference.md
# or, for a personal install:
curl -o ~/.claude/skills/wiremark/reference.md https://docs.wiremark.dev/skills/wiremark/reference.md
```

(Re-fetch `SKILL.md` the same way if you also want the latest instructions.)

A stale copy degrades gracefully either way: `reference.md` tells the agent
where to fetch its own latest version if it meets a component it does not
recognize.

### Claude.ai (chat)

Claude.ai has no filesystem to install into — custom skills are uploaded as a
**ZIP of the skill folder** instead. The docs site builds that ZIP from the
exact same two files on every deploy, so there is nothing separate to
maintain:

```sh
curl -O https://docs.wiremark.dev/skills/wiremark.zip
```

In claude.ai, open **Settings → Capabilities → Skills**, choose **Upload
skill**, and pick `wiremark.zip` (see the
[help-center article](https://support.claude.com/en/articles/12512180-use-skills-in-claude)
for the current steps). Custom skills require code execution to be enabled and
are per-user — each teammate uploads their own copy. To update, re-download
the ZIP and upload it again. One caveat: claude.ai's sandbox may not be able
to run `npx @wiremark/cli`, so the skill's render-to-validate step is skipped
there — reading and writing wireframes works the same.

### OpenAI Codex

Codex reads the same skill-folder format from `.agents/skills/` (per
repository) or `~/.agents/skills/` (user-wide) — the identical files, just a
different directory:

```sh
mkdir -p .agents/skills/wiremark
curl -o .agents/skills/wiremark/SKILL.md https://docs.wiremark.dev/skills/wiremark/SKILL.md
curl -o .agents/skills/wiremark/reference.md https://docs.wiremark.dev/skills/wiremark/reference.md
```

See the [Codex skills docs](https://developers.openai.com/codex/skills) for
discovery order and user-level installs.

### Other hosts

Any agent that supports the Agent Skills folder convention (a directory with a
`SKILL.md` whose frontmatter has `name` and `description`) can use these same
two files — install them wherever that host discovers skills, per its docs.
