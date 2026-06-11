// Generates docs/reference/components.md from meta/element-specs.json, and
// refreshes the condensed component list inside the LLM agent guide
// (site/static/wiremark-llm.md) and the Claude skill reference
// (site/static/skills/wiremark/reference.md), between their BEGIN/END
// GENERATED markers.
//
// Two sources of truth, deliberately:
//  - components.md <- meta/element-specs.json, the *intended* coverage matrix.
//  - the agent guide + skill lists <- the LIVE REGISTRY
//    (packages/core/src/elements), i.e. exactly what renders today.
// Never edit any of the generated markdown by hand. Change the JSON or the
// element definitions, then rerun:
//
//   npm run docs:reference
//
// Pure Node (ESM), no dependencies beyond core's own. Safe to run from any
// working directory: all paths are resolved relative to this file.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const REL_SRC = 'meta/element-specs.json';
const REL_OUT = 'docs/reference/components.md';
const REL_LLM = 'site/static/wiremark-llm.md';
const REL_SKILL_REF = 'site/static/skills/wiremark/reference.md';
const REGEN_CMD = 'npm run docs:reference';

const SRC = resolve(ROOT, REL_SRC);
const OUT = resolve(ROOT, REL_OUT);
const LLM = resolve(ROOT, REL_LLM);
const SKILL_REF = resolve(ROOT, REL_SKILL_REF);

// Columns of the per-element property table, in render order. Each maps an
// element's property object onto a cell value.
const PROPERTY_COLUMNS = [
  ['Name', (p) => p.name],
  ['Type', (p) => p.type],
  ['Values', (p) => (p.values ?? []).join(', ')],
  ['Default', (p) => p.default],
  ['Keyless', (p) => (p.keyless ? 'yes' : 'no')],
  ['Aliases', (p) => (p.aliases ?? []).join(', ')],
  ['Notes', (p) => p.notes],
];

/** Escape a value for safe inclusion in a single GFM table cell. */
function escapeCell(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>')
    .trim();
}

/** GitHub-slugger compatible anchor (matches GitHub and Docusaurus). */
function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s/g, '-');
}

/** Build a GFM table from a header array and an array of row-cell arrays. */
function table(headers, rows) {
  const head = `| ${headers.map(escapeCell).join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((cells) => `| ${cells.map(escapeCell).join(' | ')} |`);
  return [head, sep, ...body].join('\n');
}

/** The component matrix, grouped by category in first-seen order. */
function renderComponents(components, lines) {
  if (!components || !components.length) return;

  const order = [];
  const byCategory = new Map();
  for (const comp of components) {
    const category = comp.category || 'Uncategorized';
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
      order.push(category);
    }
    byCategory.get(category).push(comp);
  }

  lines.push('## Components', '');
  for (const category of order) {
    lines.push(`- [${category}](#${slug(category)})`);
  }
  lines.push('');

  const headers = PROPERTY_COLUMNS.map(([label]) => label);
  for (const category of order) {
    lines.push(`## ${category}`, '');
    for (const comp of byCategory.get(category)) {
      lines.push(`### ${comp.name}`, '');
      lines.push(`*Accepts children: ${comp.children ? 'yes' : 'no'}*`, '');
      if (comp.properties && comp.properties.length) {
        const cells = comp.properties.map((p) => PROPERTY_COLUMNS.map(([, get]) => get(p)));
        lines.push(table(headers, cells), '');
      } else {
        lines.push('No configurable properties.', '');
      }
    }
  }
}

// --- Condensed list for the LLM agent guide (site/static/wiremark-llm.md) ---
//
// One line per component, grouped by category, designed to be token-cheap for
// an LLM while still carrying every prop, enum value, default, and alias.
//
// UNLIKE components.md, this list is generated from the LIVE REGISTRY
// (packages/core/src/elements), not from the JSON matrix. The matrix documents
// the *intended* surface, which legitimately runs ahead of (and occasionally
// deviates from) the implementation; an agent following it would write syntax
// the resolver hard-rejects (`ListItem icon=`) or nest children that layout
// silently drops (`TableCell` is a leaf). The agent guide must describe exactly
// what renders today, so its source of truth is the code itself.
//
// The notation is explained by the legend that precedes the generated block in
// the guide: `Name [c] [w h] [~] -- prop|alias:TYPE=default*, ...` where `*`
// marks a keyless-capable prop and TYPE is T/N/B/I/R/A or inline enum values.

/** Single-letter type codes for the condensed list (see the guide's legend). */
const TYPE_CODES = {
  string: 'T',
  number: 'N',
  boolean: 'B',
  icon: 'I',
  ref: 'R',
  ratio: 'A',
};

/** Render one registry property as `name|alias:TYPE=default*`. */
function condensedProp(name, p, keylessTargets) {
  const label = [name, ...(p.aliases ?? [])].join('|');
  const type = p.type === 'enum' ? `(${(p.values ?? []).join('|')})` : (TYPE_CODES[p.type] ?? p.type);
  // Defaults are included when they inform a choice; `false` booleans and free
  // string defaults are noise at this altitude, and an enum default outside the
  // value list (Link's `inherit`, Progress's `indeterminate`) is a trap -- an
  // agent that writes the shown default explicitly would hard-error.
  const hasDefault = p.default !== undefined && p.default !== null && p.default !== false
    && p.type !== 'string'
    && (p.type !== 'enum' || (p.values ?? []).includes(p.default));
  const dflt = hasDefault ? `=${p.default}` : '';
  // Booleans are always usable as bare flags (the resolver treats any declared
  // boolean prop as a keyless flag); everything else needs a keyless slot.
  const keyless = p.type === 'boolean' || keylessTargets.has(name) ? '*' : '';
  return `${label}:${type}${dflt}${keyless}`;
}

/** One condensed line for a registry element definition. */
function condensedElement(def) {
  const markers = [
    def.container ? '[c]' : '',
    def.sizing ? '[w h]' : '',
    def.text ? '[~]' : '',
  ].filter(Boolean).join(' ');
  const head = markers ? `${def.name} ${markers}` : def.name;

  const keylessTargets = new Set((def.keyless ?? []).map((s) => s.to).filter(Boolean));
  const entries = Object.entries(def.props ?? {}).map(([name, p]) =>
    condensedProp(name, p, keylessTargets));
  // A keyless literal slot may target a prop that has no keyed declaration at
  // all (ListItem/TableCell label): surface it, flagged as keyless-only so an
  // agent never writes `label=`.
  for (const slot of def.keyless ?? []) {
    if (slot.kind === 'literal' && slot.to && !(def.props ?? {})[slot.to]) {
      entries.unshift(`${slot.to}:T* (keyless only)`);
    }
  }
  return entries.length ? `${head} -- ${entries.join(', ')}` : head;
}

/** The condensed component list, one fenced block grouped by category. */
function condensedList(elements) {
  const lines = ['```'];
  let lastCategory;
  for (const def of elements) {
    if (def.category === 'root') continue; // Wireframe is covered in the prose
    const category = def.category || 'uncategorized';
    if (category !== lastCategory) {
      if (lastCategory !== undefined) lines.push('');
      lines.push(category.toUpperCase());
      lastCategory = category;
    }
    lines.push(condensedElement(def));
  }
  lines.push('```');
  return lines.join('\n');
}

const LLM_BEGIN = /^<!-- BEGIN GENERATED: component-list\b.*-->$/m;
const LLM_END = /^<!-- END GENERATED: component-list -->$/m;

/** Replace the marked component-list section of one file with `body`. */
function spliceGenerated(path, relPath, body) {
  const text = readFileSync(path, 'utf8');
  const begin = text.match(LLM_BEGIN);
  const end = text.match(LLM_END);
  if (begin?.index === undefined || end?.index === undefined || end.index < begin.index) {
    throw new Error(`${relPath}: BEGIN/END GENERATED component-list markers not found`);
  }
  const head = text.slice(0, begin.index + begin[0].length);
  const tail = text.slice(end.index);
  writeFileSync(path, `${head}\n${body}\n${tail}`);
  console.log(`Updated ${relPath} from the element registry`);
}

/** Refresh every file that embeds the condensed component list. */
async function updateAgentGuides() {
  // Imported lazily so plain components.md regeneration never depends on the
  // core package's import graph being loadable.
  const { ELEMENTS } = await import('../packages/core/src/elements/index.js');
  const body = condensedList(ELEMENTS);
  spliceGenerated(LLM, REL_LLM, body);
  spliceGenerated(SKILL_REF, REL_SKILL_REF, body);
}

function main() {
  const json = JSON.parse(readFileSync(SRC, 'utf8'));
  const lines = [];

  lines.push('<!--');
  lines.push('  GENERATED FILE -- DO NOT EDIT BY HAND.');
  lines.push(`  Source of truth: ${REL_SRC}`);
  lines.push(`  Regenerate with: ${REGEN_CMD}`);
  lines.push('-->');
  lines.push('');
  lines.push('# wiremark Component Library Reference', '');
  lines.push(
    `This reference is generated from [\`${REL_SRC}\`](../../${REL_SRC}) -- the single ` +
      `source of truth for wiremark's component and property coverage. It lists the ` +
      `elements wiremark supports and, for each, its properties; anything out of scope ` +
      `is omitted. Do not edit it by hand: change the JSON and run \`${REGEN_CMD}\`.`,
    '',
  );
  renderComponents(json.components, lines);

  const output = lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, output);
  console.log(`Wrote ${REL_OUT} from ${REL_SRC}`);
}

main();
await updateAgentGuides();
