// Generates docs/reference/components.md from meta/element-specs.json,
// refreshes the condensed component list inside the LLM agent guide
// (site/static/wiremark-llm.md) and the agent skill reference
// (site/static/skills/wiremark/reference.md), between their BEGIN/END
// GENERATED markers, and packs the skill folder into
// site/static/skills/wiremark.zip (the upload artifact for hosts without a
// filesystem, e.g. claude.ai).
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

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const REL_SRC = 'meta/element-specs.json';
const REL_OUT = 'docs/reference/components.md';
const REL_LLM = 'site/static/wiremark-llm.md';
const REL_SKILL_DIR = 'site/static/skills/wiremark';
const REL_SKILL_REF = `${REL_SKILL_DIR}/reference.md`;
const REL_SKILL_ZIP = 'site/static/skills/wiremark.zip';
const REGEN_CMD = 'npm run docs:reference';

const SRC = resolve(ROOT, REL_SRC);
const OUT = resolve(ROOT, REL_OUT);
const LLM = resolve(ROOT, REL_LLM);
const SKILL_DIR = resolve(ROOT, REL_SKILL_DIR);
const SKILL_REF = resolve(ROOT, REL_SKILL_REF);
const SKILL_ZIP = resolve(ROOT, REL_SKILL_ZIP);

// Columns of the per-element property table, in render order. Each maps an
// element's property object onto a cell value. The prose column prefers the
// richer `description` and falls back to `notes` (universal props carry only
// `notes`; a new property without a description yet still shows something).
const PROPERTY_COLUMNS = [
  ['Name', (p) => p.name],
  ['Type', (p) => p.type],
  ['Values', (p) => (p.values ?? []).join(', ')],
  ['Default', (p) => p.default],
  ['Keyless', (p) => (p.keyless ? 'yes' : 'no')],
  ['Aliases', (p) => (p.aliases ?? []).join(', ')],
  ['Description', (p) => p.description ?? p.notes],
];

/** Make data-derived prose safe for Docusaurus's MDX parser: escape bare `<` and
 *  `{` (which MDX reads as JSX) EXCEPT inside inline code spans, where MDX keeps
 *  them literal -- so `` `<img>` `` survives but a bare `<a>` becomes `&lt;a>`. */
function mdxSafe(text) {
  if (text === undefined || text === null) return text;
  return String(text)
    .split(/(`[^`]*`)/) // odd segments are code spans; keep them verbatim
    .map((seg, i) => (i % 2 === 1 ? seg : seg.replace(/</g, '&lt;').replace(/\{/g, '&#123;')))
    .join('');
}

/** Escape a value for safe inclusion in a single GFM table cell. Order matters:
 *  pipe-escape, then MDX-escape, then turn newlines into the literal <br> tag
 *  (which must survive the MDX-escape, so it is inserted last). */
function escapeCell(value) {
  if (value === undefined || value === null) return '';
  return mdxSafe(String(value).replace(/\|/g, '\\|').trim()).replace(/\r?\n/g, '<br>');
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

/** The universal-property table: props merged onto EVERY element, so they are not
 *  repeated per component. Rendered from the JSON's `universal` array. */
function renderUniversal(universal, lines) {
  if (!universal || !universal.length) return;
  lines.push('## Universal properties', '');
  lines.push(
    'These apply to *every* element (the registry injects them onto each component), ' +
      'so they are NOT repeated in the per-component tables below.',
    '',
  );
  const headers = PROPERTY_COLUMNS.map(([label]) => label);
  const cells = universal.map((p) => PROPERTY_COLUMNS.map(([, get]) => get(p)));
  lines.push(table(headers, cells), '');
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
      if (comp.description) lines.push(mdxSafe(comp.description), '');
      lines.push(`*Accepts children: ${comp.children ? 'yes' : 'no'}*`, '');
      if (comp.properties && comp.properties.length) {
        const cells = comp.properties.map((p) => PROPERTY_COLUMNS.map(([, get]) => get(p)));
        lines.push(table(headers, cells), '');
      } else {
        lines.push('No configurable properties.', '');
      }
      renderExamples(comp.examples, lines);
    }
  }
}

/** Render an element's `examples` as fenced wiremark blocks, each followed by its
 *  caption. Omitted entirely when the element has no examples. */
function renderExamples(examples, lines) {
  if (!examples || !examples.length) return;
  lines.push('**Examples**', '');
  for (const ex of examples) {
    lines.push('```wireframe', ex.code, '```', '');
    if (ex.description) lines.push(`*${mdxSafe(ex.description)}*`, '');
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

/** The condensed component list, one fenced block grouped by category. A leading
 *  UNIVERSAL line (from the registry's universal props) shows the props every
 *  element accepts, so they are not repeated on each element line. */
function condensedList(elements, universalProps) {
  const lines = ['```'];
  if (universalProps && Object.keys(universalProps).length) {
    const entries = Object.entries(universalProps).map(([name, p]) => condensedProp(name, p, new Set()));
    lines.push(`UNIVERSAL (every element) -- ${entries.join(', ')}`, '');
  }
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
  const { UNIVERSAL_PROPS } = await import('../packages/core/src/registry.js');
  const body = condensedList(ELEMENTS, UNIVERSAL_PROPS);
  spliceGenerated(LLM, REL_LLM, body);
  spliceGenerated(SKILL_REF, REL_SKILL_REF, body);
}

// --- Skill upload artifact (site/static/skills/wiremark.zip) ---
//
// Hosts without a filesystem (claude.ai chat) install skills by uploading a
// ZIP of the skill folder, so the docs site serves one built from the exact
// files it serves individually. Store-only (no compression) with a fixed
// timestamp: the two markdown members are small, and identical inputs must
// produce a byte-identical archive.

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// 2026-01-01 00:00:00 in MS-DOS date/time encoding.
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
const DOS_TIME = 0;

/** Pack `entries` ([{name, data}]) into a store-only ZIP buffer. */
function zipStore(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); // compressed size (stored)
    local.writeUInt32LE(data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // central directory signature
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42); // local header offset
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory signature
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

/** Zip the skill folder (every file in it) for hosts that install by upload. */
function writeSkillZip() {
  const entries = readdirSync(SKILL_DIR, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .sort()
    .map((name) => ({
      name: `wiremark/${name}`,
      data: readFileSync(resolve(SKILL_DIR, name)),
    }));
  writeFileSync(SKILL_ZIP, zipStore(entries));
  console.log(`Wrote ${REL_SKILL_ZIP} from ${REL_SKILL_DIR}/`);
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
  renderUniversal(json.universal, lines);
  renderComponents(json.components, lines);

  const output = lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, output);
  console.log(`Wrote ${REL_OUT} from ${REL_SRC}`);
}

main();
await updateAgentGuides();
writeSkillZip();
