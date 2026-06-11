// Generates the built-in icon data module (and its docs gallery) from
// meta/builtin-icons.json -- the hand-maintained curated icon vocabulary
// (tasks/ICONS.md). Icon bodies come from @iconify-json/ic (Material Icons,
// baseline/filled style; Apache-2.0), a devDependency only -- the generated
// module is committed and shipped, so core gains no runtime dependency.
//
//   npm run icons:builtin
//
// Outputs (all committed, none hand-edited):
//   packages/core/src/icons/builtin.js   icon name -> path data (the runtime module)
//   docs/reference/icons.md              the icon vocabulary, by category
//   docs/reference/icon-gallery.svg      rendered gallery embedded by icons.md
//
// The byte budget is an enforced invariant: generation FAILS if builtin.js
// exceeds BUDGET_KB, so the curated list can only grow by trimming elsewhere
// (or by an explicit, signed-off budget change here).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const require = createRequire(import.meta.url);

const REL_SRC = 'meta/builtin-icons.json';
const REL_OUT = 'packages/core/src/icons/builtin.js';
const REL_DOC = 'docs/reference/icons.md';
const REL_GALLERY = 'docs/reference/icon-gallery.svg';
const REGEN_CMD = 'npm run icons:builtin';

const BUDGET_KB = 80;

/** MUI PascalCase -> the Material kebab name (`ArrowBack` -> `arrow-back`). */
function kebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .toLowerCase();
}

/**
 * Resolve an icon record in the Iconify JSON, following alias `parent` chains
 * (an alias may itself point at an alias). Returns the body string or null.
 */
function bodyOf(pack, iconName) {
  let name = iconName;
  for (let hops = 0; hops < 5; hops++) {
    const icon = pack.icons[name];
    if (icon) return icon.body;
    const alias = pack.aliases?.[name];
    if (!alias) return null;
    name = alias.parent;
  }
  return null;
}

/**
 * A body that is exactly one `<path fill="currentColor" d="..."/>` (the ~90%
 * case for the Material family) stores as its bare `d` string; anything else
 * keeps the raw inner-SVG markup (detectable downstream by its leading `<`).
 */
function compact(body) {
  const m = /^<path fill="currentColor" d="([^"]+)"\/>$/.exec(body);
  return m ? m[1] : body;
}

function main() {
  const spec = JSON.parse(readFileSync(resolve(ROOT, REL_SRC), 'utf8'));
  const pack = require('@iconify-json/ic/icons.json');

  /** @type {Map<string, { mui: string, category: string, data: string }>} kebab name -> entry */
  const entries = new Map();
  const missing = [];
  for (const [category, names] of Object.entries(spec.categories)) {
    for (const mui of names) {
      const k = kebab(mui);
      if (entries.has(k)) throw new Error(`duplicate icon "${mui}" (${k}) -- already listed under "${entries.get(k).category}"`);
      const body = bodyOf(pack, `baseline-${k}`) ?? bodyOf(pack, k);
      if (body === null) { missing.push(`${mui} (baseline-${k})`); continue; }
      entries.set(k, { mui, category, data: compact(body) });
    }
  }
  if (missing.length) {
    throw new Error(`${missing.length} icon(s) not found in @iconify-json/ic:\n  ${missing.join('\n  ')}`);
  }

  // --- the runtime data module -------------------------------------------
  const rows = [...entries.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, e]) => `  '${k}': ${JSON.stringify(e.data)},`);
  const module = `// GENERATED FILE -- DO NOT EDIT BY HAND.
// Source of truth: ${REL_SRC}; regenerate with: ${REGEN_CMD}
//
// Built-in icon vocabulary: Material Icons (baseline/filled style), extracted
// from @iconify-json/ic. Icon artwork (c) Google, Apache License 2.0 -- see
// ./LICENSE in this directory. Keys are Material kebab names; values are a
// bare \`<path d>\` string, or raw inner-SVG markup when they start with \`<\`.
// Bodies target a 24x24 viewBox and inherit \`currentColor\`.

/** @type {Record<string, string>} */
export default {
${rows.join('\n')}
};
`;
  const bytes = Buffer.byteLength(module, 'utf8');
  if (bytes > BUDGET_KB * 1024) {
    throw new Error(`${REL_OUT} is ${(bytes / 1024).toFixed(1)} KB -- over the ${BUDGET_KB} KB budget (tasks/ICONS.md decision #2). Trim ${REL_SRC}.`);
  }
  mkdirSync(dirname(resolve(ROOT, REL_OUT)), { recursive: true });
  writeFileSync(resolve(ROOT, REL_OUT), module);

  // --- docs: gallery SVG + the vocabulary page ---------------------------
  writeFileSync(resolve(ROOT, REL_GALLERY), gallerySVG(spec.categories, entries));
  writeFileSync(resolve(ROOT, REL_DOC), galleryDoc(spec.categories, entries));

  console.log(`Wrote ${REL_OUT} (${entries.size} icons, ${(bytes / 1024).toFixed(1)} KB / ${BUDGET_KB} KB budget)`);
  console.log(`Wrote ${REL_DOC} + ${REL_GALLERY}`);
}

/** Re-inflate a stored entry to inner-SVG markup for the gallery. */
function inflate(data) {
  return data.startsWith('<') ? data : `<path fill="currentColor" d="${data}"/>`;
}

/** A clean, deterministic gallery: per category, a labeled grid of glyph + name. */
function gallerySVG(categories, entries) {
  const COLS = 6, CELL_W = 150, CELL_H = 56, ICON = 24, PAD = 16, HEADER = 34;
  const FONT = "ui-sans-serif, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
  let y = PAD;
  let out = '';
  for (const [category, names] of Object.entries(categories)) {
    out += `<text x="${PAD}" y="${y + 20}" font-family="${FONT}" font-size="16" font-weight="700" fill="#22303f">${category}</text>`;
    y += HEADER;
    names.forEach((mui, i) => {
      const k = kebab(mui);
      const col = i % COLS, row = Math.floor(i / COLS);
      const x = PAD + col * CELL_W;
      const cy = y + row * CELL_H;
      out += `<g transform="translate(${x} ${cy})" fill="#22303f">${inflate(entries.get(k).data)}`
        + `<text x="${ICON + 8}" y="17" font-family="${FONT}" font-size="11" fill="#444">${mui}</text></g>`;
    });
    y += Math.ceil(names.length / COLS) * CELL_H + PAD;
  }
  const w = PAD * 2 + COLS * CELL_W;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${y}" viewBox="0 0 ${w} ${y}">`
    + `<rect width="${w}" height="${y}" fill="#ffffff"/>` + out + '</svg>\n';
}

/** The markdown vocabulary page: name lists by category + the embedded gallery. */
function galleryDoc(categories, entries) {
  const lines = [
    '<!--',
    '  GENERATED FILE -- DO NOT EDIT BY HAND.',
    `  Source of truth: ${REL_SRC}`,
    `  Regenerate with: ${REGEN_CMD}`,
    '-->',
    '',
    '# Built-in icons',
    '',
    `wiremark ships ${entries.size} built-in icons -- the filled (baseline) style of Google's`,
    'Material Icons, the set behind `@mui/icons-material`. Use them anywhere an element',
    'takes an icon prop:',
    '',
    '```wireframe',
    'Wireframe #home',
    '  Button "Save" startIcon=Check',
    '  Icon Search',
    '```',
    '',
    'Names are written in MUI PascalCase (`ArrowBack`), but lookup is forgiving:',
    '`ArrowBack`, `arrow-back`, `arrow_back`, and `arrowback` all resolve to the same',
    'icon. An unknown name renders the placeholder glyph and a soft warning -- never',
    'an error. Custom icons can be added per document or per host; see the',
    '[icons guide](../guides/09-icons.md).',
    '',
    '![Built-in icon gallery](./icon-gallery.svg)',
    '',
  ];
  for (const [category, names] of Object.entries(categories)) {
    lines.push(`## ${category}`, '');
    lines.push(names.map((n) => `\`${n}\``).join(' '), '');
  }
  return lines.join('\n').trimEnd() + '\n';
}

main();
