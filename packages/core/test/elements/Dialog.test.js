// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * Dialog (SPEC: MUI Feedback, v1.0). This engine has no overlay / z-axis layer,
 * so a Dialog is drawn honestly IN FLOW as a heavily-elevated paper surface (a
 * deep drop shadow under a bordered white sheet). Its one spec prop is `size`
 * (keyless enum, MUI `maxWidth`), which sets the dialog's WIDTH:
 *
 *  - `content` (default) -- sizes to children, floored to a small sheet width.
 *  - `xs | sm | md | lg | lx` -- breakpoint floors, each strictly wider, applied
 *    via a per-node `minSize` so the dialog reads at that breakpoint even empty.
 *  - `fullScreen` -- stretches to the full frame width (`block` predicate); the
 *    breakpoint floor is dropped so nothing fights the stretch.
 *
 * The Dialog box is the frame's first child: layout(doc)[0].root.children[0].
 */

const dialogBox = (src) => layout(parse(src))[0].root.children[0];

// --- Parsing: defaults + clean parse -----------------------------------------

test('a bare Dialog parses clean as a container with size unset in props', () => {
  const doc = parse('Wireframe\n  Dialog');
  assert.deepEqual(doc.diagnostics, []);
  const dialog = doc.frames[0].children[0];
  assert.equal(dialog.component, 'Dialog');
  // The resolver does not inject PropDef defaults; the strategy applies size=content.
  assert.equal(dialog.props.size, undefined);
});

test('an empty Dialog lays out to a finite, positive elevated sheet (minSize floor)', () => {
  const box = dialogBox('Wireframe\n  Dialog');
  assert.equal(box.node.component, 'Dialog');
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
  // The content floor keeps an empty dialog at a sensible sheet width, not collapsed.
  assert.ok(box.w >= 280, `content dialog width should floor to >= 280, got ${box.w}`);
});

test('a Dialog stacks its children inside, in column order', () => {
  const SRC = 'Wireframe\n  Dialog\n    Typography "Title"\n    Typography "Body"';
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
  const box = layout(doc)[0].root.children[0];
  assert.deepEqual(box.children.map((c) => c.node.component), ['Typography', 'Typography']);
  // Column: the second child sits below the first.
  const [c0, c1] = box.children;
  assert.ok(c1.y > c0.y, 'second child should sit below the first (col)');
});

// --- size: keyless + keyed, every enum value, defaults -----------------------

test('size is keyless and accepts each enum value', () => {
  for (const s of ['fullScreen', 'content', 'xs', 'sm', 'md', 'lg', 'lx']) {
    const doc = parse(`Wireframe\n  Dialog ${s}`);
    assert.deepEqual(doc.diagnostics, [], `size=${s} should parse clean`);
    assert.equal(doc.frames[0].children[0].props.size, s);
  }
});

test('size also resolves in keyed form', () => {
  const doc = parse('Wireframe\n  Dialog size=md');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.size, 'md');
});

// --- size: REAL per-breakpoint width geometry --------------------------------

test('each breakpoint floors the dialog to a strictly wider minimum width', () => {
  // xs < sm < md < lg < lx, asserted at layout level on an otherwise-identical
  // (empty) dialog so the difference is the breakpoint floor, not the content.
  // Use a wide frame (1400px) so the two largest breakpoints (lg 800, lx 960)
  // both fit -- in the default 800px frame they would both clamp to the frame
  // width and stop being strictly ordered at the top of the ladder.
  const order = ['xs', 'sm', 'md', 'lg', 'lx'];
  const widths = order.map((s) => dialogBox(`Wireframe w=1400 h=900\n  Dialog ${s}`).w);
  for (let i = 1; i < widths.length; i++) {
    assert.ok(
      widths[i] > widths[i - 1],
      `${order[i]} (${widths[i]}) should be wider than ${order[i - 1]} (${widths[i - 1]})`,
    );
  }
});

test('a breakpoint dialog is wider than the default content dialog', () => {
  const content = dialogBox('Wireframe\n  Dialog').w;
  const md = dialogBox('Wireframe\n  Dialog md').w;
  assert.ok(md > content, `md (${md}) should be wider than content (${content})`);
});

test('content past the breakpoint floor still expands the dialog (floor is a minimum)', () => {
  // A very long child label pushes the dialog wider than the bare xs floor: the
  // floor is a minimum, not a clamp.
  const bare = dialogBox('Wireframe\n  Dialog xs').w;
  const long = dialogBox(
    'Wireframe\n  Dialog xs\n    Typography "a very long dialog body line that exceeds the xs breakpoint floor"',
  ).w;
  assert.ok(long > bare, `content wider than the floor should expand the dialog (${long} > ${bare})`);
});

test('fullScreen stretches to (about) the full frame width; non-fullScreen does not', () => {
  const frameW = layout(parse('Wireframe\n  Dialog fullScreen'))[0].w;
  const full = dialogBox('Wireframe\n  Dialog fullScreen').w;
  const md = dialogBox('Wireframe\n  Dialog md').w;
  // fullScreen fills the frame's content area (frame minus the root frame pad).
  assert.ok(full >= frameW - 40, `fullScreen (${full}) should span ~the full frame width (${frameW})`);
  // a sized (md) dialog keeps its own width, narrower than the whole frame.
  assert.ok(md < frameW, `md dialog (${md}) should be narrower than the frame (${frameW})`);
  assert.ok(full > md, `fullScreen (${full}) should be wider than md (${md})`);
});

// --- render: elevated paper surface ------------------------------------------

test('a Dialog renders a deep elevation shadow under a bordered paper surface', () => {
  const svg = render('Wireframe\n  Dialog md').svg;
  // The deep shadow is an opacity-bearing path painted behind the sheet.
  assert.match(svg, /<path opacity=/);
  // The paper is filled white (#ffffff) -- a real surface, not a bare outline.
  assert.match(svg, /fill="#ffffff"/);
  assert.match(svg, /<path/);
});

test("the dialog's shadow is deeper than a Card's (it reads as 'on top')", () => {
  // Card uses elevation 1; the Dialog lifts much higher (elevation 8), so its
  // shadow opacity saturates higher than a default Card's.
  const dialogSvg = render('Wireframe\n  Dialog md').svg;
  const cardSvg = render('Wireframe\n  Card').svg;
  const opacityOf = (svg) => {
    const m = /<path opacity="([\d.]+)"/.exec(svg);
    return m ? Number(m[1]) : 0;
  };
  assert.ok(
    opacityOf(dialogSvg) > opacityOf(cardSvg),
    `dialog shadow opacity (${opacityOf(dialogSvg)}) should exceed card's (${opacityOf(cardSvg)})`,
  );
});

// --- Errors: bad enum + duplicate slot ----------------------------------------

test('a bad keyed size value is a hard error listing the valid set', () => {
  assert.throws(() => parse('Wireframe\n  Dialog size=huge'), /size/);
});

test('an unknown bare token is a hard error (not a silent drop)', () => {
  assert.throws(() => parse('Wireframe\n  Dialog jumbo'), /Dialog/);
});

test('two size tokens (the same keyless enum slot twice) is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Dialog sm md'), /Dialog/);
});

test('a quoted enum value is rejected (enums are bare, not quoted)', () => {
  assert.throws(() => parse('Wireframe\n  Dialog size="md"'), /Dialog/);
});

// --- Dialog has no text literal slot + no filler ------------------------------

test('a Dialog rejects a text literal (it has no label slot)', () => {
  assert.throws(() => parse('Wireframe\n  Dialog "Title"'), /Dialog/);
});

test('a Dialog rejects filler (it is not a text component)', () => {
  // No text:true, so a `~3` filler token must error rather than be silently swallowed.
  assert.throws(() => parse('Wireframe\n  Dialog ~3'), /Dialog/);
});

// --- Universal to= link wrapping ----------------------------------------------

test('a Dialog carries the universal to= / href= link onto props.to', () => {
  const doc = parse('Wireframe\n  Dialog to=#next');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.to, 'next');
  const aliased = parse('Wireframe\n  Dialog href=#prev');
  assert.equal(aliased.frames[0].children[0].props.to, 'prev');
});

// --- A whole render path stays clean ------------------------------------------

test('a populated Dialog renders without diagnostics and reaches its children', () => {
  const SRC = 'Wireframe\n  Dialog md\n    Typography "Delete item?"\n    Typography "This cannot be undone."';
  const { svg, diagnostics } = render(SRC);
  assert.deepEqual(diagnostics, []);
  const probe = render('Wireframe\n  Typography "Delete item?"').svg;
  if (/Delete item\?/.test(probe)) assert.match(svg, /Delete item\?/);
  assert.match(svg, /<path/);
});
