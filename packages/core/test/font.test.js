// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '../src/index.js';
import { SKETCH_FAMILY, SKETCH_FONT, SKETCH_CLASS } from '../src/draw.js';
import { FONT_SIZE_ADJUST, textRunWidth, truncateText, ELLIPSIS } from '../src/metrics.js';
import { COMIC_NEUE_WOFF, COMIC_NEUE_ADVANCE } from '../src/fonts/comic-neue.js';

/**
 * The embedded sketch font (tasks/FONT.md, issue #2): every SVG embeds Comic
 * Neue under the private family 'wiremark-sketch' (size-adjusted to Comic Sans
 * geometry), only the weights it uses, with a stack that falls back to an
 * installed Comic Neue / Comic Sans MS. `embedFont: false` drops the font data
 * but keeps the stack and the --wiremark-font-family hook.
 */

const PLAIN = 'Wireframe\n  Typography "plain text"';
const BOLD = 'Wireframe\n  Snackbar "Saved"'; // Snackbar draws its message at weight 600
const NO_TEXT = 'Wireframe\n  Box';

/** @param {string} svg */
const faces = (svg) => [...svg.matchAll(/@font-face\{([^}]*)\}/g)].map((m) => m[1]);

test('the stack leads with the embedded face, then Comic Neue, then Comic Sans MS, ending in cursive', () => {
  assert.equal(SKETCH_FAMILY, 'wiremark-sketch');
  assert.match(SKETCH_FONT, /^'wiremark-sketch', 'Comic Neue', 'Comic Sans MS', 'Comic Sans', /);
  assert.match(SKETCH_FONT, /, cursive$/);
});

test('a text-bearing SVG opens with the font <style>: one size-adjusted 400 face + the scoped rule', () => {
  const { svg, diagnostics } = render(PLAIN);
  assert.deepEqual(diagnostics, []);
  assert.match(svg, /^<svg [^>]*><style>@font-face\{/, 'the <style> is the first child of <svg>');
  const f = faces(svg);
  assert.equal(f.length, 1, 'regular text needs only the 400 face');
  assert.match(f[0], /^font-family:'wiremark-sketch';src:url\(data:font\/woff;base64,[A-Za-z0-9+/=]+\) format\('woff'\);/);
  assert.match(f[0], /font-weight:400;/);
  assert.match(f[0], new RegExp(`size-adjust:${Math.round(FONT_SIZE_ADJUST * 100)}%`));
  assert.ok(svg.includes(`.${SKETCH_CLASS} text{font-family:var(--wiremark-font-family, ${SKETCH_FONT})}`),
    'the family rule is scoped to the document group and reads the CSS hook first');
});

test('the 700 face is embedded only when some text is bold', () => {
  const plain = faces(render(PLAIN).svg);
  const bold = faces(render(BOLD).svg);
  assert.equal(plain.length, 1);
  assert.equal(bold.length, 2);
  assert.match(bold[1], /font-weight:700;/);
});

test('an SVG without any text embeds no font data (the rule stays for the CSS hook)', () => {
  const { svg } = render(NO_TEXT);
  assert.ok(!svg.includes('<text '), 'precondition: the source draws no text');
  assert.equal(faces(svg).length, 0);
  assert.ok(svg.includes(`.${SKETCH_CLASS} text{font-family:var(--wiremark-font-family,`));
});

test('embedFont: false drops the font data but keeps the stack, the rule, and the group', () => {
  const on = render(BOLD).svg;
  const off = render(BOLD, { embedFont: false }).svg;
  assert.equal(faces(off).length, 0);
  assert.ok(off.includes(`.${SKETCH_CLASS} text{font-family:var(--wiremark-font-family, ${SKETCH_FONT})}`));
  assert.ok(off.includes(`<g class="${SKETCH_CLASS}" font-family="${SKETCH_FONT}">`));
  assert.ok(on.length - off.length > 40_000, `both faces are ~22 KB of base64 each (saved ${on.length - off.length} bytes)`);
  // Everything but the <style> is identical: embedding never changes layout.
  const strip = (/** @type {string} */ s) => s.replace(/<style>[^<]*<\/style>/, '');
  assert.equal(strip(on), strip(off));
});

test('content sits in one group carrying the stack; <text> elements carry no family of their own', () => {
  const { svg } = render(BOLD);
  assert.ok(svg.includes(`<g class="${SKETCH_CLASS}" font-family="${SKETCH_FONT}">`));
  assert.ok(svg.endsWith('</g></svg>'), 'the group wraps everything up to the root close');
  assert.doesNotMatch(svg, /<text [^>]*font-family=/);
});

test('the embedded output is deterministic', () => {
  assert.equal(render(BOLD).svg, render(BOLD).svg);
});

test('the generated faces are real WOFF 1.0 files', () => {
  for (const w of /** @type {const} */ ([400, 700])) {
    const bytes = Buffer.from(COMIC_NEUE_WOFF[w], 'base64');
    assert.equal(bytes.toString('latin1', 0, 4), 'wOFF', `${w} face signature`);
    assert.equal(bytes.readUInt32BE(8), bytes.length, `${w} face header length matches its data`);
  }
});

test('the generated module stays within its budget and ships with its license', () => {
  const dir = join(import.meta.dirname, '..', 'src', 'fonts');
  assert.ok(statSync(join(dir, 'comic-neue.js')).size <= 60 * 1024, 'over the 60 KB budget in scripts/generate-font.mjs');
  const license = readFileSync(join(dir, 'comic-neue.OFL.txt'), 'utf8');
  assert.match(license, /SIL Open Font License, Version 1\.1/);
  assert.match(license, /Comic Neue Project Authors/);
});

test('truncation widths never under-estimate the embedded face (regular and bold, as drawn)', () => {
  const FS = 100;
  for (let cp = 32; cp <= 126; cp++) {
    const ch = String.fromCodePoint(cp);
    for (const w of /** @type {const} */ ([400, 700])) {
      const drawn = (COMIC_NEUE_ADVANCE[w].ascii[cp - 32] / 1000) * FONT_SIZE_ADJUST * FS;
      assert.ok(textRunWidth(ch, FS, w) >= drawn - 1e-9,
        `${JSON.stringify(ch)} @${w}: table ${textRunWidth(ch, FS, w).toFixed(2)} < drawn ${drawn.toFixed(2)}`);
    }
  }
});

test('a truncated label fits its box in the embedded face (sweep)', () => {
  const s = 'Quarterly revenue summary for the northern region, minus returns';
  for (const w of /** @type {const} */ ([400, 700])) {
    const adv = COMIC_NEUE_ADVANCE[w];
    for (let maxW = 20; maxW <= 400; maxW += 7) {
      const out = truncateText(s, 16, maxW, w);
      let run = 0;
      for (const ch of out) {
        const t = ch === ELLIPSIS ? adv.ellipsis : adv.ascii[ch.codePointAt(0) - 32];
        run += (t / 1000) * FONT_SIZE_ADJUST * 16;
      }
      if (out !== s) assert.ok(run <= maxW, `@${w} maxW=${maxW}: "${out}" draws ${run.toFixed(1)}px`);
    }
  }
});

// ---------------------------------------------------------------------------
// Phase 2: custom fonts -- the `Font` directive and the font render options.
// ---------------------------------------------------------------------------

import { parse } from '../src/index.js';
import { measureText, LINE_HEIGHT, DEFAULT_LEADING } from '../src/metrics.js';

const WRAP = 'Wireframe w=200 h=300\n  Typography "one two three four five six seven eight nine ten eleven twelve"';
/** Baselines of every drawn <text>. @param {string} svg */
const ys = (svg) => [...svg.matchAll(/<text x="[^"]*" y="([^"]*)"/g)].map((m) => Number(m[1]));
/** The <style> rule's stack. @param {string} svg */
const ruleStack = (svg) => /text\{font-family:var\(--wiremark-font-family, ([^)]*)\)\}/.exec(svg)?.[1];
/** The document group's class. @param {string} svg */
const groupClass = (svg) => /<g class="(wm-[^"]+)" font-family=/.exec(svg)?.[1];
/** A fake font payload: the 4-byte signature plus padding. @param {number[]} sig */
const fontBytes = (sig) => new Uint8Array([...sig, 0, 0, 0, 0, 0, 0, 0, 0]);

test('Font directive: family plus optional width= and leading= land on the Document', () => {
  assert.equal(parse('Wireframe').font, undefined, 'no directive, no font field');
  assert.deepEqual(parse('Font "Patrick Hand"\nWireframe').font, { family: 'Patrick Hand' });
  assert.deepEqual(parse('Font "My Font" width=0.9 leading=1.3\nWireframe').font,
    { family: 'My Font', width: 0.9, leading: 1.3 });
  assert.deepEqual(parse('Wireframe\nFont "Late"').font, { family: 'Late' }, 'position in the file does not matter');
});

test('Font directive: malformed lines are hard errors', () => {
  const bad = {
    'Font': /exactly one quoted family name/,
    'Font "A" "B"': /exactly one quoted family name/,
    'Font Patrick': /exactly one quoted family name/,
    'Font "A" bold': /unexpected token `bold`/,
    'Font "A" size=2': /unknown property "size="/,
    'Font "A" width=abc': /width= expects a number from 0\.3 to 3/,
    'Font "A" width=9': /width= expects a number/,
    'Font "A" leading=0.1': /leading= expects a number from 0\.8 to 4/,
    'Font "A" width="0.9"': /width= expects a number/,
    'Font "A"\n  Typography "x"': /takes no children/,
  };
  for (const [src, re] of Object.entries(bad)) {
    assert.throws(() => parse(`${src}\nWireframe`), (e) => e.name === 'WiremarkError' && re.test(e.message), src);
  }
});

test('Font directive: family names that could break out of the CSS rule are rejected', () => {
  for (const name of ["x'}body{color:red", 'a;b', 'a<b', 'a"b', 'a\\b', ' leading', '']) {
    assert.throws(() => parse(`Font "${name.replace(/"/g, '\\"')}"\nWireframe`), /not a valid family name|exactly one quoted/, JSON.stringify(name));
  }
});

test('Font directive: a duplicate warns and the first wins', () => {
  const doc = parse('Font "First"\nFont "Second"\nWireframe');
  assert.equal(doc.font?.family, 'First');
  assert.ok(doc.diagnostics.some((d) => /duplicate Font directive -- the first \("First"\) wins/.test(d.message)));
});

test('a custom family: no built-in embed, stack X then the fallback tail, its own scoped class', () => {
  const { svg, diagnostics } = render('Font "Patrick Hand"\nWireframe\n  Snackbar "Saved"');
  assert.deepEqual(diagnostics, []);
  assert.equal(faces(svg).length, 0, 'the built-in Comic Neue is NOT embedded for a custom family');
  assert.ok(!svg.includes(SKETCH_FAMILY), 'the private face is not in the stack either');
  assert.equal(ruleStack(svg), "'Patrick Hand', 'Comic Neue', 'Comic Sans MS', 'Comic Sans', "
    + "'Chalkboard SE', 'Marker Felt', 'Segoe Print', 'Bradley Hand', cursive");
  assert.match(groupClass(svg) ?? '', /^wm-font-[0-9a-f]{8}$/);
  assert.notEqual(groupClass(svg), SKETCH_CLASS, 'distinct from the built-in class, so inline SVGs never clash');
  assert.equal(groupClass(svg), groupClass(render('Font "Patrick Hand"\nWireframe\n  Typography "x"').svg),
    'same stack -> same class (deterministic)');
});

test('"Comic Neue" means the built-in face (embedded, size-adjusted)', () => {
  const { svg } = render('Font "Comic Neue"\nWireframe\n  Typography "x"');
  assert.equal(groupClass(svg), SKETCH_CLASS);
  assert.equal(faces(svg).length, 1);
  assert.equal(ruleStack(svg), SKETCH_FONT);
});

test('a custom stack never repeats a family, and CSS generics stay unquoted', () => {
  assert.equal(ruleStack(render('Font "Comic Sans MS"\nWireframe\n  Typography "x"').svg),
    "'Comic Sans MS', 'Comic Neue', 'Comic Sans', 'Chalkboard SE', 'Marker Felt', 'Segoe Print', 'Bradley Hand', cursive");
  assert.match(ruleStack(render('Font "serif"\nWireframe\n  Typography "x"').svg) ?? '', /^serif, 'Comic Neue'/);
  assert.match(ruleStack(render('Font "cursive"\nWireframe\n  Typography "x"').svg) ?? '', /^cursive, 'Comic Neue', .*'Bradley Hand'$/);
});

test('render options: fontFamily applies when the document has no Font line', () => {
  const viaOption = render(WRAP, { fontFamily: 'Patrick Hand' }).svg;
  const viaDoc = render(`Font "Patrick Hand"\n${WRAP}`).svg;
  assert.equal(viaOption, viaDoc);
});

test('precedence: the document Font line beats every font option', () => {
  const doc = `Font "Patrick Hand"\n${WRAP}`;
  assert.equal(render(doc, { fontFamily: 'Georgia', fontWidth: 2, fontLeading: 3 }).svg, render(doc).svg);
});

test('leading= / fontLeading set the line step of wrapped text', () => {
  const step = (/** @type {string} */ svg) => ys(svg)[1] - ys(svg)[0];
  assert.equal(step(render(WRAP).svg), Math.ceil(16 * DEFAULT_LEADING));
  assert.equal(step(render(WRAP, { fontLeading: 2 }).svg), 32);
  assert.equal(step(render(`Font "Comic Neue" leading=2\n${WRAP}`).svg), 32, 'leading applies to the built-in too');
});

test('width= / fontWidth scale text measurement (narrower text wraps into fewer lines)', () => {
  const lines = (/** @type {string} */ svg) => ys(svg).length;
  const base = lines(render(WRAP).svg);
  assert.ok(base >= 3, `precondition: the default wraps (${base} lines)`);
  assert.ok(lines(render(`Font "Narrow" width=0.5\n${WRAP}`).svg) < base);
  assert.ok(lines(render(WRAP, { fontWidth: 2 }).svg) > base);
});

test('known faces get a measured width preset; unknown faces default to 1', () => {
  /** The wrapped lines as drawn. @param {string} src */
  const wrapped = (src) => [...render(src).svg.matchAll(/<text [^>]*>([^<]*)</g)].map((m) => m[1]);
  // Patrick Hand's preset (0.77) packs more words per line than an unmeasured face at 1.0.
  const patrick = wrapped(`Font "Patrick Hand"\n${WRAP}`);
  const unmeasured = wrapped(`Font "Unmeasured"\n${WRAP}`);
  assert.ok(patrick[0].split(' ').length > unmeasured[0].split(' ').length, `${patrick[0]} vs ${unmeasured[0]}`);
  assert.deepEqual(patrick, wrapped(`Font "Unmeasured" width=0.77\n${WRAP}`), 'the preset is width=0.77');
  assert.deepEqual(unmeasured, wrapped(WRAP), 'an unmeasured face measures like the built-in');
});

test('text metrics are restored after every render, even one that throws', () => {
  const before = measureText('Hello world', 16);
  render(`Font "X" width=2.5 leading=3\n${WRAP}`);
  assert.deepEqual(measureText('Hello world', 16), before);
  assert.equal(LINE_HEIGHT, DEFAULT_LEADING);
  // A Document parsed elsewhere can still fail inside layout; the swap must unwind.
  const doc = parse(`Font "X" width=2.5 leading=3\n${WRAP}`);
  const broken = { ...doc, frames: [null] };
  assert.throws(() => render(/** @type {*} */ (broken)));
  assert.deepEqual(measureText('Hello world', 16), before);
  assert.equal(LINE_HEIGHT, DEFAULT_LEADING);
});

test('invalid font options warn and are ignored (never throw); the parsed Document is not mutated', () => {
  const doc = parse(WRAP);
  const { svg, diagnostics } = render(doc, { fontFamily: 'bad;name', fontWidth: 99, fontLeading: 'x' });
  assert.equal(svg, render(WRAP).svg, 'all three ignored -> default output');
  assert.equal(diagnostics.length, 3);
  assert.ok(diagnostics.every((d) => d.severity === 'warning'));
  assert.deepEqual(doc.diagnostics, [], 'warnings are per-render, not written into the Document');
});

test('fontFace: host bytes or base64 for the custom family embed under its name, format from the signature', () => {
  const cases = [
    [fontBytes([0x77, 0x4f, 0x46, 0x32]), 'woff2', 'font/woff2'],
    [fontBytes([0x77, 0x4f, 0x46, 0x46]), 'woff', 'font/woff'],
    [fontBytes([0x00, 0x01, 0x00, 0x00]), 'truetype', 'font/ttf'],
    [fontBytes([0x4f, 0x54, 0x54, 0x4f]).buffer, 'opentype', 'font/otf'],
    [Buffer.from(fontBytes([0x77, 0x4f, 0x46, 0x32])).toString('base64'), 'woff2', 'font/woff2'],
  ];
  for (const [data, format, mime] of cases) {
    const { svg, diagnostics } = render(`Font "Brand Sans"\n${WRAP}`, { fontFace: { data, weight: 400 } });
    assert.deepEqual(diagnostics, [], format);
    const f = faces(svg);
    assert.equal(f.length, 1, format);
    assert.match(f[0], new RegExp(`^font-family:'Brand Sans';src:url\\(data:${mime};base64,[A-Za-z0-9+/=]+\\) format\\('${format}'\\);font-weight:400;font-style:normal$`));
  }
});

test('fontFace: base64 from bytes round-trips exactly (pure-JS encoder)', () => {
  const bytes = new Uint8Array(1000).map((_, i) => (i * 37 + 11) & 255);
  bytes.set([0x77, 0x4f, 0x46, 0x32]);
  const { svg } = render(`Font "Brand Sans"\n${WRAP}`, { fontFace: { data: bytes } });
  const b64 = /base64,([^)]*)\)/.exec(svg)?.[1];
  assert.equal(b64, Buffer.from(bytes).toString('base64'));
});

test('fontFace: junk, a wrong format claim, or another family is skipped', () => {
  const doc = `Font "Brand Sans"\n${WRAP}`;
  const junk = render(doc, { fontFace: { data: 'PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==' } }); // "<script>alert(1)</script>"
  assert.equal(faces(junk.svg).length, 0);
  assert.match(junk.diagnostics[0]?.message ?? '', /not a recognizable WOFF2\/WOFF\/TrueType\/OpenType font/);
  assert.equal(faces(render(doc, { fontFace: { data: 'not base64!' } }).svg).length, 0);
  assert.equal(faces(render(doc, { fontFace: { data: fontBytes([0x77, 0x4f, 0x46, 0x32]), format: 'woff' } }).svg).length, 0);
  const other = render(doc, { fontFace: { data: fontBytes([0x77, 0x4f, 0x46, 0x32]), family: 'Other' } });
  assert.equal(faces(other.svg).length, 0);
  assert.deepEqual(other.diagnostics, [], 'a face for another family is silently not ours');
});

test('fontFace with the built-in font in use warns and embeds only the built-in face', () => {
  const { svg, diagnostics } = render(WRAP, { fontFace: { data: fontBytes([0x77, 0x4f, 0x46, 0x32]) } });
  assert.equal(faces(svg).length, 1);
  assert.match(faces(svg)[0], /font-family:'wiremark-sketch'/);
  assert.match(diagnostics[0]?.message ?? '', /fontFace ignored/);
});

test('embedFont: false drops host faces too', () => {
  const { svg } = render(`Font "Brand Sans"\n${WRAP}`, { fontFace: { data: fontBytes([0x77, 0x4f, 0x46, 0x32]) }, embedFont: false });
  assert.equal(faces(svg).length, 0);
  assert.match(ruleStack(svg) ?? '', /^'Brand Sans', 'Comic Neue'/);
});
