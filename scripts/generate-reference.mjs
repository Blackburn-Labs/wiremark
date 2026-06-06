// Generates docs/reference/components.md from meta/element-specs.json.
//
// The JSON matrix is the SINGLE SOURCE OF TRUTH for wiremark's component and
// property coverage. The generated markdown is derived from it -- never edit the
// markdown by hand. Change the JSON, then rerun:
//
//   npm run docs:reference
//
// Pure Node (ESM), no dependencies. Safe to run from any working directory: all
// paths are resolved relative to this file.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const REL_SRC = 'meta/element-specs.json';
const REL_OUT = 'docs/reference/components.md';
const REGEN_CMD = 'npm run docs:reference';

const SRC = resolve(ROOT, REL_SRC);
const OUT = resolve(ROOT, REL_OUT);

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
