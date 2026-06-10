// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse, render } from '../src/index.js';
import { layout } from '../src/layout.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

/** @param {string} name */
const fixture = (name) => readFileSync(join(FIXTURES, name), 'utf8');

/** Collect every component name in a node's subtree. @param {{component:string,children:any[]}} n @param {Set<string>} [acc] */
const walk = (n, acc = new Set()) => {
  acc.add(n.component);
  for (const c of n.children ?? []) walk(c, acc);
  return acc;
};

/** The set of component names appearing anywhere in a parsed document's first frame. */
const componentsOf = (doc) => {
  const seen = new Set();
  for (const child of doc.frames[0].children) walk(child, seen);
  return seen;
};

// The worked-example fixture corpus (SPEC ss.8 composition): each is a realistic
// single-frame screen exercising one component FAMILY end-to-end -- parse, layout,
// render -- with zero diagnostics. One table row per fixture drives the shared
// parse/compose/render/layout checks below (smoke.test.js uses the same
// table-driven shape for its multi-fixture render check). Fixture-specific
// assertions (data-table's equal-width columns) stay standalone after the loop.
const FIXTURES_UNDER_TEST = [
  {
    file: 'data-table.wiremark', id: 'users',
    requires: ['Table', 'TableHead', 'TableBody', 'TableFooter', 'TableRow', 'TableCell', 'Pagination'],
    texts: ['Users', 'Name', 'Ada Lovelace', 'Grace Hopper', 'Add user'],
  },
  {
    file: 'app-nav.wiremark', id: 'appnav',
    requires: ['Drawer', 'Menubar', 'MenuItem', 'Tabs', 'Tab', 'Breadcrumbs', 'BottomNavigation', 'BottomNavigationAction'],
    texts: ['Acme Console', 'File', 'Overview', 'Dashboard', 'Home'],
  },
  {
    // Select renders its `value` ("United States"), not its `label`, per the
    // FAMILIES.md Select ruling; ToggleButton draws its keyless literal as an icon
    // glyph (not visible text), so neither is asserted here.
    file: 'settings-form.wiremark', id: 'settings',
    requires: ['Select', 'Option', 'Slider', 'Rating', 'ToggleButtonGroup', 'ToggleButton', 'ButtonGroup', 'Fab', 'Stepper', 'Step', 'TextField', 'Control', 'Button'],
    texts: ['Checkout', 'Shipping details', 'United States', 'Place order', 'Rate your experience'],
  },
  {
    file: 'profile.wiremark', id: 'profile',
    requires: ['Avatar', 'Badge', 'CardHeader', 'AccordionHeader', 'AccordionBody'],
    texts: ['Profile', 'Jane Doe', 'Product Designer', 'About', 'Activity'],
  },
  {
    file: 'feedback-states.wiremark', id: 'feedback',
    requires: ['Alert', 'Dialog', 'Snackbar', 'Progress', 'Skeleton'],
    texts: ['Sync status', 'Upload failed', 'Importing data', 'Discard draft?', 'Settings updated'],
  },
];

for (const fx of FIXTURES_UNDER_TEST) {
  test(`${fx.file} parses clean and composes its target family`, () => {
    const doc = parse(fixture(fx.file));
    assert.deepEqual(doc.diagnostics, [], `${fx.file} should parse cleanly`);
    assert.equal(doc.frames.length, 1, `${fx.file} is a single frame`);
    assert.equal(doc.frames[0].id, fx.id, `${fx.file} frame id`);
    const seen = componentsOf(doc);
    for (const name of fx.requires) assert.ok(seen.has(name), `${fx.file} should include ${name}`);
  });

  test(`${fx.file} renders to valid SVG with its content, zero diagnostics`, () => {
    const { svg, diagnostics } = render(fixture(fx.file));
    assert.deepEqual(diagnostics, [], `${fx.file} should render without diagnostics`);
    assert.match(svg, /^<svg /, `${fx.file} starts with <svg`);
    assert.match(svg, /<\/svg>$/, `${fx.file} ends with </svg>`);
    assert.match(svg, /<path /, `${fx.file} draws hand-drawn paths`);
    for (const t of fx.texts) assert.ok(svg.includes(t), `${fx.file} should render "${t}"`);
  });

  test(`${fx.file} lays out to a finite, positive frame with no NaN boxes`, () => {
    const frame = layout(parse(fixture(fx.file)))[0];
    assert.ok(Number.isFinite(frame.w) && frame.w > 0, `${fx.file} frame width finite/positive, got ${frame.w}`);
    assert.ok(Number.isFinite(frame.h) && frame.h > 0, `${fx.file} frame height finite/positive, got ${frame.h}`);
    assert.ok(frame.root.children.length > 0, `${fx.file} has laid-out children`);
    // Deep-walk every laid-out box: x/y/w/h must all be finite. This guards
    // against an element returning a non-finite measure (e.g. the function-minSize
    // bug that once left the Dialog subtree NaN) silently producing a broken SVG.
    /** @param {any} box @returns {any[]} */
    const flatten = (box) => [box, ...(box.children ?? []).flatMap(flatten)];
    for (const b of flatten(frame.root)) {
      assert.ok(
        Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.w) && Number.isFinite(b.h),
        `${fx.file}: ${b.node?.component ?? 'box'} has a non-finite dimension `
          + `(x=${b.x} y=${b.y} w=${b.w} h=${b.h})`,
      );
    }
  });
}

// data-table-specific: the Table family lays each TableRow's cells out as
// equal-flex, so a row with N cells yields N (near-)equal-width boxes -- the
// documented "aligned columns for equal-count rows" behavior (FAMILIES.md). This
// is the one genuinely fixture-specific assertion, so it stays out of the table.
test('data-table lays out equal-width cells within a row (FAMILIES.md column ruling)', () => {
  const frame = layout(parse(fixture('data-table.wiremark')))[0];
  /** @param {any} box @returns {any[]} */
  const flatten = (box) => [box, ...(box.children ?? []).flatMap(flatten)];
  const rows = flatten(frame.root).filter((b) => b.node?.component === 'TableRow');
  assert.ok(rows.length >= 4, `expected several TableRows, got ${rows.length}`);
  const wideRow = rows.find((r) => (r.children ?? []).length === 4);
  assert.ok(wideRow, 'a 4-cell row should exist');
  const widths = wideRow.children.map((c) => c.w);
  for (const w of widths) {
    assert.ok(Math.abs(w - widths[0]) <= 1, `cells should be equal width, got ${widths.join(', ')}`);
  }
});
