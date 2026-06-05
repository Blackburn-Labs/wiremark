// Generates docs/reference/components.md from meta/mui-support-matrix.json.
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

const REL_SRC = 'meta/mui-support-matrix.json';
const REL_OUT = 'docs/reference/components.md';
const REGEN_CMD = 'npm run docs:reference';

const SRC = resolve(ROOT, REL_SRC);
const OUT = resolve(ROOT, REL_OUT);

// Columns folded into the per-component grouping/heading rather than repeated in
// every property row. Anything else in the matrix flows through automatically.
const MATRIX_HIDDEN_COLS = new Set(['Component', 'Category', 'Component tier']);

// Property rows with one of these Support values are omitted entirely. The matrix
// tracks coverage, but the published reference shows only what wiremark supports;
// a component whose every row is excluded drops out of the doc.
const SUPPORT_EXCLUDE = new Set(['never', 'n/a']);

// Matrix columns to drop from / relabel in the published tables. 'Support' is
// gone (everything shown is supported); 'MUI default' is simply our 'Default'.
const COLUMN_OMIT = new Set(['Support']);
const COLUMN_RENAME = new Map([['MUI default', 'Default']]);

// Left-cell labels in the Legend sheet that begin a new definition table. Kept
// ASCII on purpose; an unrecognised label simply degrades to a normal row.
const LEGEND_SECTION_STARTS = new Set([
  'Column',
  'Support tier',
  'Keyless rules',
  'v9-specific',
]);

// Legend content tied to the dropped concepts, removed so that "How to read"
// matches the tables: the whole 'Support tier' definition block, plus the
// individual 'Support' / 'n/a' description rows.
const LEGEND_SECTION_OMIT = new Set(['Support tier']);
const LEGEND_TERM_OMIT = new Set(['Support', 'n/a']);

/** Escape a value for safe inclusion in a single GFM table cell. */
function escapeCell(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>')
    .trim();
}

/** Union of object keys across rows, in first-seen order. */
function orderedKeys(rows) {
  const keys = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys;
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

/** "How to read" section, rendered from the Legend sheet. */
function renderLegend(legend, lines) {
  const rows = legend.rows || [];
  if (!rows.length) return;
  const [leftKey, rightKey] = orderedKeys(rows);

  lines.push('## How to read this reference', '');

  // Rows with an empty left cell are introductory prose.
  for (const row of rows) {
    if (String(row[leftKey] ?? '').trim()) continue;
    const text = String(row[rightKey] ?? '').trim();
    if (text) lines.push(`> ${text}`, '');
  }

  let header = null;
  let body = [];
  let skipping = false;
  const flush = () => {
    if (header && !skipping) lines.push(table(header, body), '');
    header = null;
    body = [];
  };

  for (const row of rows) {
    const left = String(row[leftKey] ?? '').trim();
    if (!left) continue; // prose handled above
    const right = row[rightKey];
    if (LEGEND_SECTION_STARTS.has(left)) {
      flush();
      skipping = LEGEND_SECTION_OMIT.has(left);
      if (!skipping) header = [left, right];
      continue;
    }
    if (skipping || LEGEND_TERM_OMIT.has(left)) continue;
    const term = COLUMN_RENAME.get(left) ?? left;
    if (header) {
      body.push([term, right]);
    } else {
      header = ['Term', 'Meaning'];
      body = [[term, right]];
    }
  }
  flush();
}

/** The component matrix, grouped by Category then Component. */
function renderMatrix(matrix, lines) {
  const rows = (matrix.rows || []).filter(
    (row) => !SUPPORT_EXCLUDE.has(String(row.Support ?? '').trim()),
  );
  if (!rows.length) return;
  const dataCols = orderedKeys(rows).filter(
    (k) => !MATRIX_HIDDEN_COLS.has(k) && !COLUMN_OMIT.has(k),
  );
  const headerLabels = dataCols.map((k) => COLUMN_RENAME.get(k) ?? k);

  // Group preserving first-seen order at both levels.
  const order = [];
  const byCategory = new Map();
  for (const row of rows) {
    const category = row.Category || 'Uncategorized';
    if (!byCategory.has(category)) {
      byCategory.set(category, { components: [], byComponent: new Map() });
      order.push(category);
    }
    const group = byCategory.get(category);
    const component = row.Component || '(unnamed)';
    if (!group.byComponent.has(component)) {
      group.byComponent.set(component, { tier: row['Component tier'], rows: [] });
      group.components.push(component);
    }
    group.byComponent.get(component).rows.push(row);
  }

  lines.push('## Components', '');
  for (const category of order) {
    lines.push(`- [${category}](#${slug(category)})`);
  }
  lines.push('');

  for (const category of order) {
    const group = byCategory.get(category);
    lines.push(`## ${category}`, '');
    for (const component of group.components) {
      const info = group.byComponent.get(component);
      lines.push(`### ${component}`, '');
      if (info.tier) lines.push(`*Component tier: ${info.tier}*`, '');
      const cells = info.rows.map((row) => dataCols.map((col) => row[col]));
      lines.push(table(headerLabels, cells), '');
    }
  }
}

function main() {
  const json = JSON.parse(readFileSync(SRC, 'utf8'));
  const sheets = json.sheets || {};
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
      `components and properties wiremark supports; anything the matrix marks as out ` +
      `of scope is omitted. Do not edit it by hand: change the JSON and run ` +
      `\`${REGEN_CMD}\`.`,
    '',
  );
  if (json.source) lines.push(`> Matrix source: ${json.source}`, '');

  if (sheets.Legend) renderLegend(sheets.Legend, lines);
  if (sheets.Matrix) renderMatrix(sheets.Matrix, lines);

  const output = lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, output);
  console.log(`Wrote ${REL_OUT} from ${REL_SRC}`);
}

main();
