// @ts-check
/**
 * Icon machinery tests (tasks/ICONS.md): the icons.js lookup chain, the
 * draw.js clean-vector primitives, the resolver's `Icons` block + icon
 * post-pass, injected Iconify packs, and the committed built-in data module's
 * enforced invariants (byte budget, format). Per-element rendering behavior
 * lives in test/elements/<Name>.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

import { normalizeIconName, builtinIcon, buildInjectedIcons, resolveIcon } from '../src/icons.js';
import BUILTIN from '../src/icons/builtin.js';
import { iconBody, COLORS } from '../src/draw.js';
import { parse, render } from '../src/index.js';

// --- normalizer + built-in lookup -------------------------------------------

test('normalizeIconName: MUI PascalCase, kebab, snake, and lowercase all converge', () => {
  for (const spelling of ['ArrowBack', 'arrow-back', 'arrow_back', 'arrowback', 'ARROW_BACK']) {
    assert.equal(normalizeIconName(spelling), 'arrowback');
  }
  // `:` survives, so pack-prefixed spellings stay distinct from bare names.
  assert.equal(normalizeIconName('lucide:ArrowBack'), 'lucide:arrowback');
});

test('builtinIcon resolves every forgiving spelling to the same 24-grid icon', () => {
  const canonical = builtinIcon('ChevronRight');
  assert.ok(canonical, 'ChevronRight is a built-in');
  assert.equal(canonical.viewBox, 24);
  for (const spelling of ['chevron-right', 'chevron_right', 'chevronright']) {
    assert.deepEqual(builtinIcon(spelling), canonical);
  }
  assert.equal(builtinIcon('NoSuchIconXyz'), null);
});

test('the icon names element defaults rely on are all built-ins', () => {
  // CardHeader closeIcon=Close, AccordionHeader icon=ChevronRight,
  // Rating icon=Star / emptyIcon=StarBorder (CONVENTION: resolver resolves
  // PropDef default NAMES, so these must exist or every default warns).
  for (const name of ['Close', 'ChevronRight', 'Star', 'StarBorder']) {
    assert.ok(builtinIcon(name), `built-in set must cover default icon "${name}"`);
  }
});

// --- the committed data module's invariants ----------------------------------

test('generated builtin.js stays inside the 80 KB budget (ICONS.md decision #2)', () => {
  const path = new URL('../src/icons/builtin.js', import.meta.url);
  assert.ok(statSync(path).size <= 80 * 1024, 'committed icon data must stay <= 80 KB');
  // And it is worth its bytes: the curated set is ~300+ icons, not a stub.
  assert.ok(Object.keys(BUILTIN).length >= 300, 'curated set should stay ~300+ icons');
});

test('builtin.js entries are kebab keys with path-data or markup bodies', () => {
  for (const [key, body] of Object.entries(BUILTIN)) {
    assert.match(key, /^[a-z0-9-]+$/, `key "${key}" should be Material kebab`);
    assert.ok(typeof body === 'string' && body.length > 0, `"${key}" body must be non-empty`);
    if (!body.startsWith('<')) {
      assert.match(body, /^[Mm]/, `"${key}" bare body should be path data (starts with a moveto)`);
      assert.ok(!body.includes('"'), `"${key}" bare path data must be quote-free (embedded in d="...")`);
    }
  }
});

test('builtin.js LICENSE notice ships next to the data (Apache-2.0 attribution)', () => {
  const license = readFileSync(new URL('../src/icons/LICENSE', import.meta.url), 'utf8');
  assert.match(license, /Material Icons/);
  assert.match(license, /Apache License/);
});

// --- injected icons: flat maps and Iconify packs ------------------------------

/** A minimal Iconify-JSON-shaped pack (the de-facto interchange format). */
const FAKE_PACK = {
  prefix: 'fake',
  width: 16,
  height: 16,
  icons: {
    dot: { body: '<path fill="currentColor" d="M8 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8"/>' },
    big: { body: '<path d="M0 0h32v32H0z"/>', width: 32, height: 32 },
  },
  aliases: {
    point: { parent: 'dot' },
    spot: { parent: 'point' }, // alias -> alias -> icon
  },
};

test('buildInjectedIcons: flat maps take d strings and {body, viewBox} values', () => {
  const m = buildInjectedIcons({ logo: 'M1 1L9 9', wide: { body: '<path d="M0 0h48v48H0z"/>', viewBox: 48 } });
  assert.deepEqual(m.get('logo'), { body: 'M1 1L9 9', viewBox: 24 });
  assert.deepEqual(m.get('wide'), { body: '<path d="M0 0h48v48H0z"/>', viewBox: 48 });
});

test('buildInjectedIcons: unusable entries are skipped, never thrown on', () => {
  const m = buildInjectedIcons({ empty: '', junk: 42, obj: {}, ok: 'M0 0h1v1H0z' });
  assert.deepEqual([...m.keys()], ['ok']);
});

test('buildInjectedIcons: an Iconify pack registers bare AND pack:name spellings', () => {
  const m = buildInjectedIcons(FAKE_PACK);
  assert.equal(m.get('dot')?.viewBox, 16, 'pack-level size applies');
  assert.equal(m.get('fake:dot')?.body, m.get('dot')?.body, 'prefixed spelling routes to the same icon');
  assert.equal(m.get('big')?.viewBox, 32, 'per-icon size overrides the pack');
  assert.equal(m.get('point')?.body, m.get('dot')?.body, 'aliases resolve through parent');
  assert.equal(m.get('spot')?.body, m.get('dot')?.body, 'alias chains resolve');
});

test('buildInjectedIcons: arrays mix packs and maps; later bare names win', () => {
  const m = buildInjectedIcons([FAKE_PACK, { dot: 'M2 2L3 3' }]);
  assert.equal(m.get('dot')?.body, 'M2 2L3 3', 'later source wins the bare name');
  assert.match(m.get('fake:dot')?.body ?? '', /^<path fill/, 'the prefixed spelling stays unambiguous');
});

test('resolveIcon precedence: inline -> injected -> built-in; inline null blocks fallback', () => {
  const injected = buildInjectedIcons({ search: 'M1 1' });
  /** @type {Map<string, *>} */
  const inline = new Map([['search', { body: 'M2 2', viewBox: 24 }], ['close', null]]);
  assert.equal(resolveIcon('Search', { inline, injected })?.body, 'M2 2', 'inline wins');
  assert.equal(resolveIcon('Search', { injected })?.body, 'M1 1', 'injected beats built-in');
  assert.equal(resolveIcon('Search', {})?.body, builtinIcon('Search')?.body, 'built-in is the floor');
  assert.equal(resolveIcon('Close', { inline }), null, 'an unresolved inline DECLARATION blocks built-in fallback');
  assert.equal(resolveIcon('NoSuchIconXyz', { inline, injected }), null);
});

// --- draw.js clean-vector primitive ------------------------------------------

test('iconBody wraps a bare d string and scales from the viewBox grid', () => {
  const svg = iconBody('M0 0h24v24H0z', 10, 20, 12, { ink: '#123456' });
  assert.equal(svg, '<g transform="translate(10 20) scale(0.5)" fill="#123456"><path d="M0 0h24v24H0z"/></g>');
});

test('iconBody keeps raw bodies but substitutes currentColor with the ink', () => {
  const svg = iconBody('<path fill="currentColor" stroke="currentColor" d="M1 1"/>', 0, 0, 24, { viewBox: 24 });
  assert.ok(!svg.includes('currentColor'), 'output must be self-contained');
  assert.ok(svg.includes(`fill="${COLORS.ink}" stroke="${COLORS.ink}"`), 'ink replaces currentColor');
});

// --- the `Icons` block + resolver post-pass ----------------------------------

const USE = 'Wireframe\n  Icon "logo"\n';

test('Icons block: an inline path renders where the icon is used', () => {
  const { svg, diagnostics } = render(`Icons\n  logo "M12 2 2 22h20z"\n\n${USE}`);
  assert.deepEqual(diagnostics, []);
  assert.ok(svg.includes('M12 2 2 22h20z'));
});

test('Icons block: viewBox= scales the inline grid', () => {
  // Icon medium = 24px; a 48 grid must scale by 24/48 = 0.5.
  const { svg } = render(`Icons\n  logo "M0 0h48v48H0z" viewBox=48\n\n${USE}`);
  assert.ok(svg.includes('scale(0.5)'), 'a 48-grid icon at 24px draws at scale 0.5');
});

test('Icons block: an inline name SHADOWS a built-in (precedence ss.2)', () => {
  const inline = render('Icons\n  search "M1 2L3 4"\n\nWireframe\n  Icon "Search"').svg;
  assert.ok(inline.includes('M1 2L3 4'), 'the inline override wins');
  assert.ok(!inline.includes(/** @type {string} */(builtinIcon('Search')?.body)), 'the built-in body is not drawn');
});

test('Icons block: duplicate names warn softly and the first declaration wins', () => {
  const { svg, diagnostics } = render(`Icons\n  logo "M1 1L2 2"\n  logo "M3 3L4 4"\n\n${USE}`);
  assert.ok(svg.includes('M1 1L2 2'));
  assert.ok(!svg.includes('M3 3L4 4'));
  assert.ok(diagnostics.some((d) => d.severity === 'warning' && /duplicate icon "logo"/.test(d.message)));
});

test('Icons block: malformed entries are hard, author-must-fix errors', () => {
  const cases = [
    ['Icons #tag\n  logo "M1 1"', /Icons takes no tokens/],
    ['Icons\n  logo', /needs a "<path data>" literal or src=/],
    ['Icons\n  logo "M1 1" src=./x.svg', /a path literal or src=, not both/],
    ['Icons\n  logo "<script>alert(1)</script>"', /must be SVG path data, not markup/],
    ['Icons\n  logo "M1 1" viewBox=abc', /viewBox= expects a positive number/],
    ['Icons\n  logo "M1 1" bogus=1', /unexpected token `bogus=`/],
    ['Icons\n  logo "M1 1"\n    Child', /"logo" takes no children/],
    ['Icons\n  logo "M1 1" "M2 2"', /more than one path literal/],
  ];
  for (const [src, re] of cases) {
    assert.throws(() => parse(/** @type {string} */(src)), re, `should reject: ${src}`);
  }
});

test('Icons block: src= without a host loader degrades to placeholder + warning', () => {
  const { svg, diagnostics } = render(`Icons\n  logo src=./logo.svg\n\n${USE}`);
  assert.ok(diagnostics.some((d) => /src= needs a host that loads files/.test(d.message)));
  assert.match(svg, /stroke="#9aa7b2"/, 'the unresolved slot draws the muted placeholder');
});

test('Icons block: the host loadIcon callback resolves src= entries', () => {
  /** @type {string[]} */
  const asked = [];
  const { svg, diagnostics } = render(`Icons\n  logo src=./art/logo.svg\n\n${USE}`, {
    loadIcon: (src) => { asked.push(src); return { body: 'M5 5L6 6', viewBox: 10 }; },
  });
  assert.deepEqual(asked, ['./art/logo.svg'], 'core hands the raw src to the host');
  assert.deepEqual(diagnostics, []);
  assert.ok(svg.includes('M5 5L6 6'));
});

test('Icons block: a throwing loadIcon degrades softly with the host message', () => {
  const { svg, diagnostics } = render(`Icons\n  logo src=./gone.svg\n\n${USE}`, {
    loadIcon: () => { throw new Error('ENOENT-ish'); },
  });
  assert.ok(diagnostics.some((d) => /cannot load ".\/gone.svg": ENOENT-ish/.test(d.message)));
  assert.match(svg, /stroke="#9aa7b2"/);
});

// --- injected icons through the public API ------------------------------------

test('render(src, {icons}): a flat map injects icons document-wide', () => {
  const { svg, diagnostics } = render(USE, { icons: { logo: 'M7 7L8 8' } });
  assert.deepEqual(diagnostics, []);
  assert.ok(svg.includes('M7 7L8 8'));
});

test('render(src, {icons}): Iconify packs resolve bare and pack-prefixed names', () => {
  const bare = render('Wireframe\n  Icon "dot"', { icons: FAKE_PACK });
  assert.deepEqual(bare.diagnostics, []);
  assert.ok(bare.svg.includes('M8 4a4 4 0 1 0 0 8'));
  const prefixed = render('Wireframe\n  Icon "fake:dot"', { icons: [FAKE_PACK] });
  assert.deepEqual(prefixed.diagnostics, []);
  assert.ok(prefixed.svg.includes('M8 4a4 4 0 1 0 0 8'));
});

test('an unknown icon name warns once per use site with the author spelling', () => {
  const { diagnostics } = render('Wireframe\n  Icon "NoSuchIconXyz"\n  Button "Hi" startIcon=AlsoNotReal');
  const msgs = diagnostics.map((d) => d.message);
  assert.ok(msgs.some((m) => m.includes('unknown icon "NoSuchIconXyz"')));
  assert.ok(msgs.some((m) => m.includes('unknown icon "AlsoNotReal"')));
});

test('buildInjectedIcons: pack entries with empty bodies or bad dimensions are dropped', () => {
  // Same skip-never-throw hygiene as flat maps: a malformed pack entry misses
  // (-> placeholder downstream), it never registers broken artwork.
  const m = buildInjectedIcons({
    prefix: 'bad',
    height: -10, // bad pack-level size -> Iconify default 16
    icons: {
      empty: { body: '' },
      neg: { body: '<path d="M0 0h24v24z"/>', height: -24 },
      ok: { body: '<path d="M1 1"/>' },
    },
  });
  assert.equal(m.get('empty'), undefined, 'an empty body never registers');
  assert.equal(m.get('neg')?.viewBox, 16, 'a negative size falls back, never a negative viewBox');
  assert.equal(m.get('ok')?.viewBox, 16);
});

test('a keyed icon prop + a bare keyless name is "set more than once", both orders', () => {
  assert.throws(() => parse('Wireframe\n  Icon name=Search Home'), /"name" set more than once/);
  assert.throws(() => parse('Wireframe\n  Icon Home name=Search'), /"name" set more than once/);
});

test("the `none` opt-out is as case-forgiving as icon lookup ('None'/'NONE' too)", () => {
  for (const v of ['none', 'None', 'NONE']) {
    const doc = parse(`Wireframe\n  CardHeader "T" closeIcon=${v}`);
    assert.deepEqual(doc.diagnostics, [], `closeIcon=${v} should not warn`);
    assert.equal(doc.frames[0].children[0].icons, undefined, `closeIcon=${v} suppresses the annotation`);
  }
});

test('a failed src= icon warns ONCE (at the declaration), not again per use', () => {
  const { diagnostics } = render('Icons\n  logo src=./gone.svg\n\nWireframe\n  Icon "logo"\n  Button "Hi" startIcon=logo', {
    loadIcon: () => null,
  });
  assert.equal(diagnostics.length, 1, `expected exactly the declaration warning, got ${JSON.stringify(diagnostics)}`);
  assert.match(diagnostics[0].message, /icon "logo": cannot load/);
});

// --- determinism ---------------------------------------------------------------

test('icon rendering is deterministic across runs (same source -> same bytes)', () => {
  const src = `Icons\n  logo "M12 2 2 22h20z"\n\nWireframe\n  Icon logo\n  Button "Save" startIcon=Check\n`;
  const a = render(src, { icons: FAKE_PACK }).svg;
  const b = render(src, { icons: FAKE_PACK }).svg;
  assert.equal(a, b);
});
