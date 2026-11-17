// Generates the built-in sketch font module from @fontsource/comic-neue
// (Comic Neue, SIL OFL 1.1, no Reserved Font Name -- tasks/FONT.md). The font
// package is a devDependency only: the generated module is committed and
// shipped, so core gains no runtime dependency and never reads a font file.
//
//   npm run font:builtin
//
// Outputs (committed, never hand-edited):
//   packages/core/src/fonts/comic-neue.js        base64 WOFF faces + advance widths
//   packages/core/src/fonts/comic-neue.OFL.txt   the font's license (must ship with it)
//
// The module carries, per weight (400, 700):
//   - the Latin-subset WOFF as base64 (embedded into every SVG as an @font-face
//     under the private family name 'wiremark-sketch' -- see draw.js)
//   - the advance width of ASCII 32..126 and the ellipsis, in thousandths of an
//     em, UNSCALED (metrics.js applies FONT_SIZE_ADJUST and merges them with
//     the Comic Sans table so truncation is safe for both faces)
//
// The byte budget is an enforced invariant: generation FAILS if the module
// exceeds BUDGET_KB (it lands in every core consumer's bundle).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const require = createRequire(import.meta.url);

const PKG = '@fontsource/comic-neue';
const WEIGHTS = [400, 700];
const REL_OUT = 'packages/core/src/fonts/comic-neue.js';
const REL_LICENSE = 'packages/core/src/fonts/comic-neue.OFL.txt';
const REGEN_CMD = 'npm run font:builtin';
const BUDGET_KB = 60;
const ELLIPSIS = 0x2026;

/**
 * Minimal WOFF 1.0 reader: returns the decompressed sfnt tables we need.
 * WOFF = 44-byte header + 20-byte table directory entries; each table is
 * zlib-compressed unless compLength === origLength.
 * @param {Buffer} buf
 * @returns {Record<string, Buffer>}
 */
function readWoff(buf) {
  if (buf.toString('latin1', 0, 4) !== 'wOFF') throw new Error('not a WOFF 1.0 file');
  const numTables = buf.readUInt16BE(12);
  /** @type {Record<string, Buffer>} */
  const tables = {};
  for (let i = 0; i < numTables; i++) {
    const at = 44 + i * 20;
    const tag = buf.toString('latin1', at, at + 4);
    const offset = buf.readUInt32BE(at + 4);
    const compLength = buf.readUInt32BE(at + 8);
    const origLength = buf.readUInt32BE(at + 12);
    const raw = buf.subarray(offset, offset + compLength);
    tables[tag] = compLength < origLength ? inflateSync(raw) : raw;
  }
  return tables;
}

/**
 * Unicode BMP code point -> glyph id, from the cmap's (3,1) format-4 subtable.
 * @param {Buffer} cmap
 * @returns {(cp: number) => number}
 */
function cmapLookup(cmap) {
  const n = cmap.readUInt16BE(2);
  let sub = -1;
  for (let i = 0; i < n; i++) {
    const at = 4 + i * 8;
    const platform = cmap.readUInt16BE(at);
    const encoding = cmap.readUInt16BE(at + 2);
    const offset = cmap.readUInt32BE(at + 4);
    if (platform === 3 && encoding === 1 && cmap.readUInt16BE(offset) === 4) { sub = offset; break; }
  }
  if (sub < 0) throw new Error('no (3,1) format-4 cmap subtable');
  const segX2 = cmap.readUInt16BE(sub + 6);
  const ends = sub + 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const rangeOffsets = deltas + segX2;
  return (cp) => {
    for (let s = 0; s < segX2; s += 2) {
      const end = cmap.readUInt16BE(ends + s);
      if (cp > end) continue;
      const start = cmap.readUInt16BE(starts + s);
      if (cp < start) return 0;
      const delta = cmap.readInt16BE(deltas + s);
      const ro = cmap.readUInt16BE(rangeOffsets + s);
      if (ro === 0) return (cp + delta) & 0xffff;
      const gid = cmap.readUInt16BE(rangeOffsets + s + ro + (cp - start) * 2);
      return gid === 0 ? 0 : (gid + delta) & 0xffff;
    }
    return 0;
  };
}

/**
 * Advance widths (thousandths of an em) for ASCII 32..126 plus the ellipsis.
 * @param {Record<string, Buffer>} t
 */
function advances(t) {
  const upm = t.head.readUInt16BE(18);
  const numHMetrics = t.hhea.readUInt16BE(34);
  const lookup = cmapLookup(t.cmap);
  /** @param {number} cp */
  const adv = (cp) => {
    const gid = lookup(cp);
    if (gid === 0) throw new Error(`U+${cp.toString(16).toUpperCase().padStart(4, '0')} is not in the font`);
    const i = Math.min(gid, numHMetrics - 1);
    return Math.round((t.hmtx.readUInt16BE(i * 4) / upm) * 1000);
  };
  const ascii = [];
  for (let cp = 32; cp <= 126; cp++) ascii.push(adv(cp));
  return { ascii, ellipsis: adv(ELLIPSIS) };
}

function main() {
  const pkgDir = dirname(require.resolve(`${PKG}/package.json`));
  const version = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf8')).version;

  /** @type {Record<number, string>} */ const faces = {};
  /** @type {Record<number, number[]>} */ const ascii = {};
  /** @type {Record<number, number>} */ const ellipsis = {};
  for (const w of WEIGHTS) {
    const buf = readFileSync(resolve(pkgDir, `files/comic-neue-latin-${w}-normal.woff`));
    const m = advances(readWoff(buf));
    faces[w] = buf.toString('base64');
    ascii[w] = m.ascii;
    ellipsis[w] = m.ellipsis;
  }

  const out = `// @ts-check
// GENERATED by scripts/generate-font.mjs from ${PKG}@${version} -- DO NOT EDIT.
// Regenerate with: ${REGEN_CMD}
//
// Comic Neue (c) 2014 The Comic Neue Project Authors, SIL Open Font License 1.1
// (see ./comic-neue.OFL.txt, which ships alongside this module). Latin subset.
//
// A data-only leaf module (imports nothing), so metrics.js and draw.js may
// import it without breaking their own leaf status.

/** Base64 WOFF 1.0 faces by font-weight. */
export const COMIC_NEUE_WOFF = {
  400: '${faces[400]}',
  700: '${faces[700]}',
};

/**
 * Unscaled advance widths in thousandths of an em: ASCII 32..126 (index =
 * code point - 32) and the ellipsis (U+2026), by font-weight.
 */
export const COMIC_NEUE_ADVANCE = {
  400: { ascii: [${ascii[400].join(',')}], ellipsis: ${ellipsis[400]} },
  700: { ascii: [${ascii[700].join(',')}], ellipsis: ${ellipsis[700]} },
};
`;

  const kb = Buffer.byteLength(out) / 1024;
  if (kb > BUDGET_KB) {
    throw new Error(`${REL_OUT} is ${kb.toFixed(1)} KB, over the ${BUDGET_KB} KB budget`);
  }
  mkdirSync(dirname(resolve(ROOT, REL_OUT)), { recursive: true });
  writeFileSync(resolve(ROOT, REL_OUT), out);
  writeFileSync(resolve(ROOT, REL_LICENSE), readFileSync(resolve(pkgDir, 'LICENSE'), 'utf8'));
  console.log(`wrote ${REL_OUT} (${kb.toFixed(1)} KB) and ${REL_LICENSE} from ${PKG}@${version}`);
}

main();
