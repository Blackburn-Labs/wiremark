// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import { anchorRect } from '../../src/elements/common.js';

/**
 * Dialog (SPEC: MUI Feedback, v1.0). A TRUE OVERLAY: it consumes NO space in its
 * parent's flow, is positioned parent-relative by a 9-way `position` enum, and the
 * frame paints it LAST over the in-flow content (the engine's out-of-flow layer --
 * common.js `overlay`/`overlayPlacement`). It draws an opaque paper sheet under a
 * deep elevation shadow, over a faint backdrop scrim, so content beneath never
 * shows through.
 *
 * Two keyless enums (disjoint, so both stay keyless -- CONVENTION s.2.1):
 *  - `position`: center (default), top, bottom, left, right, topLeft, topRight,
 *    bottomLeft, bottomRight -- a 9-way anchor within the PARENT content box.
 *  - `size` (MUI maxWidth) -- the sheet WIDTH:
 *      `content` (default) sizes to children, floored to a small sheet width;
 *      `xs|sm|md|lg|lx` are progressively wider breakpoint floors (via per-node
 *      `minSize`); `fullScreen` fills the parent box (ignores position). The sheet
 *      is CAPPED to its parent extent -- a modal never spills past its container.
 *
 * Because the Dialog is out of flow, layout appends its box LAST in its parent's
 * children. `dialogBox` finds it by component (robust to that ordering).
 */

/** The laid-out Dialog box in the first frame (found by component -- an overlay is
 *  appended after its in-flow siblings, so it is not necessarily children[0]). */
const dialogBox = (src) => findByComponent(layout(parse(src))[0].root, 'Dialog');

/** Depth-first search of a laid-out box tree for the first box of `component`.
 *  @param {*} box @param {string} component @returns {*} */
function findByComponent(box, component) {
  if (box.node.component === component) return box;
  for (const child of box.children) {
    const hit = findByComponent(child, component);
    if (hit) return hit;
  }
  return null;
}

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

test('a Dialog stacks its children inside, in column order (overlay still lays out its own body)', () => {
  const SRC = 'Wireframe\n  Dialog\n    Typography "Title"\n    Typography "Body"';
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
  const box = findByComponent(layout(doc)[0].root, 'Dialog');
  assert.deepEqual(box.children.map((c) => c.node.component), ['Typography', 'Typography']);
  // Column: the second child sits below the first. Being an overlay changes WHERE
  // the dialog sits and WHEN it paints, not how it arranges its own insides.
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

test('fullScreen fills (about) the full frame width; non-fullScreen does not', () => {
  // fullScreen now fills the PARENT content box (overlayPlacement), not an in-flow
  // block-stretch -- but the observable result is the same: ~full frame width.
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

// =============================================================================
// OVERLAY behavior (the engine's out-of-flow layer) -- task 15.
// =============================================================================

const FRAME_PAD = 16; // metrics.FRAME_PAD: the frame root's content inset

/** Content rect of a frame sized w x h (frame inset by the root frame pad). */
const contentRect = (w, h) => ({ x: FRAME_PAD, y: FRAME_PAD, w: w - 2 * FRAME_PAD, h: h - 2 * FRAME_PAD });

// --- position: keyless, every value, disjoint from size ----------------------

test('position is keyless and accepts each of the 9 enum values', () => {
  for (const p of ['center', 'top', 'bottom', 'left', 'right', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight']) {
    const doc = parse(`Wireframe\n  Dialog ${p}`);
    assert.deepEqual(doc.diagnostics, [], `position=${p} should parse clean`);
    assert.equal(doc.frames[0].children[0].props.position, p);
  }
});

test('position also resolves in keyed form and defaults to undefined (strategy applies center)', () => {
  assert.equal(parse('Wireframe\n  Dialog position=topRight').frames[0].children[0].props.position, 'topRight');
  // The resolver injects no defaults; `center` is applied by the strategy at layout.
  assert.equal(parse('Wireframe\n  Dialog').frames[0].children[0].props.position, undefined);
});

test('position and size are both keyless and order-independent (disjoint enum domains)', () => {
  // topRight (position) + md (size) in either order, plus a quoted body -- all resolve.
  const a = parse('Wireframe\n  Dialog topRight md').frames[0].children[0];
  const b = parse('Wireframe\n  Dialog md topRight').frames[0].children[0];
  assert.deepEqual([a.props.position, a.props.size], ['topRight', 'md']);
  assert.deepEqual([b.props.position, b.props.size], ['topRight', 'md']);
});

// --- consumes NO space: siblings + parent size unchanged ---------------------

test('a Dialog consumes no flow space: in-flow siblings are byte-identical with vs without it', () => {
  // Same frame, one with a Dialog declared between the two Cards. The Cards' boxes
  // (and the frame's own content) must be identical -- the overlay adds nothing.
  const without = layout(parse('Wireframe w=800 h=600\n  Card\n  Card'))[0];
  const withDlg = layout(parse('Wireframe w=800 h=600\n  Card\n  Dialog md\n    Typography "Hi"\n  Card'))[0];

  const cards = (frame) => frame.root.children.filter((c) => c.node.component === 'Card');
  const [w0, w1] = cards(without);
  const [d0, d1] = cards(withDlg);
  const sameBox = (a, b) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
  assert.ok(sameBox(w0, d0), `first Card moved: ${JSON.stringify(d0)} vs ${JSON.stringify(w0)}`);
  assert.ok(sameBox(w1, d1), `second Card moved: ${JSON.stringify(d1)} vs ${JSON.stringify(w1)}`);
  // Frame canvas is fixed by w/h either way (sanity).
  assert.equal(withDlg.w, without.w);
  assert.equal(withDlg.h, without.h);
});

test("a Dialog does not grow a content-sized parent Box (it adds 0 to the parent's measured size)", () => {
  // A Box sized only by its in-flow children: adding a Dialog must not change its size.
  const plain = layout(parse('Wireframe\n  Box outline=solid\n    Typography "Only line"'))[0].root.children[0];
  const withDlg = layout(parse('Wireframe\n  Box outline=solid\n    Typography "Only line"\n    Dialog md\n      Typography "modal"'))[0].root.children[0];
  assert.equal(withDlg.w, plain.w, 'Box width must not grow for an overlay child');
  assert.equal(withDlg.h, plain.h, 'Box height must not grow for an overlay child');
});

// --- the overlay box is appended LAST among its parent's children ------------

test('the Dialog box is appended after its in-flow siblings in the parent children', () => {
  const root = layout(parse('Wireframe\n  Card\n  Dialog\n    Typography "x"\n  Card'))[0].root;
  const kinds = root.children.map((c) => c.node.component);
  assert.deepEqual(kinds, ['Card', 'Card', 'Dialog'], 'overlay appended last regardless of source position');
});

// --- position GEOMETRY (placed within the parent content rect) ----------------

test('position seats the sheet at the right 9-way anchor within the frame content rect', () => {
  const W = 1000, H = 800;
  const c = contentRect(W, H); // {16,16,968,768}
  const near = (a, b, msg) => assert.ok(Math.abs(a - b) <= 1, `${msg}: ${a} vs ${b}`);
  const at = (pos) => dialogBox(`Wireframe w=${W} h=${H}\n  Dialog md ${pos}\n    Typography "Body"`);

  const center = at('center');
  near(center.x, c.x + (c.w - center.w) / 2, 'center x');
  near(center.y, c.y + (c.h - center.h) / 2, 'center y');

  const topLeft = at('topLeft');
  near(topLeft.x, c.x, 'topLeft x hugs content origin');
  near(topLeft.y, c.y, 'topLeft y hugs content origin');

  const bottomRight = at('bottomRight');
  near(bottomRight.x + bottomRight.w, c.x + c.w, 'bottomRight far x meets content far edge');
  near(bottomRight.y + bottomRight.h, c.y + c.h, 'bottomRight far y meets content far edge');

  // Edge-centers: `top` centers on x, hugs top; `right` hugs right, centers on y.
  const top = at('top');
  near(top.x, c.x + (c.w - top.w) / 2, 'top centers on x');
  near(top.y, c.y, 'top hugs the top edge');
  const right = at('right');
  near(right.x + right.w, c.x + c.w, 'right hugs the right edge');
  near(right.y, c.y + (c.h - right.h) / 2, 'right centers on y');
});

// --- NESTED: a Dialog inside a Box positions within THAT Box ------------------

test('a Dialog nested in a sized Box positions within that Box, not the whole frame', () => {
  // A 400x300 Box pushed down by a tall spacer Card, with a centered Dialog inside.
  // The Dialog must center within the BOX content, not the frame.
  const SRC = [
    'Wireframe w=1200 h=900',
    '  Box 400px 300px outline=solid',
    '    Dialog sm center',
    '      Typography "Nested"',
  ].join('\n');
  const root = layout(parse(SRC))[0].root;
  const boxBox = findByComponent(root, 'Box');
  const dlg = findByComponent(root, 'Dialog');
  // Dialog center should match the Box's center (Box has pad 0, so content == box).
  const near = (a, b, msg) => assert.ok(Math.abs(a - b) <= 1, `${msg}: ${a} vs ${b}`);
  near(dlg.x + dlg.w / 2, boxBox.x + boxBox.w / 2, 'dialog centers on the Box x, not the frame');
  near(dlg.y + dlg.h / 2, boxBox.y + boxBox.h / 2, 'dialog centers on the Box y, not the frame');
  // And it is genuinely offset from the frame center (the Box is not frame-centered here).
  assert.ok(Math.abs((dlg.x + dlg.w / 2) - 600) > 1, 'dialog is NOT at the frame center x');
});

// --- PAINT ORDER: frame-global last (over a LATER-declared sibling) ----------

test('paint order: the Dialog overlay layer paints AFTER a sibling declared after it (frame-global last)', () => {
  // The case per-container paint order would get WRONG: a sibling declared after
  // the Dialog must NOT draw over it. The deep elevation shadow (opacity 0.22, from
  // elevation 8) is unique to the Dialog and marks where the overlay layer begins;
  // a later-declared sibling's content (its Typography text) must come BEFORE it.
  const SRC = [
    'Wireframe w=800 h=600',
    '  Dialog md',
    '    Typography "Modal body"',
    '  Box 220px 120px outline=solid', // sibling declared AFTER the dialog
    '    Typography "LATERBOXTEXT"',
  ].join('\n');
  const svg = render(SRC).svg;
  const laterIdx = svg.indexOf('LATERBOXTEXT');
  const shadowIdx = svg.indexOf('opacity="0.22"'); // the dialog's deep shadow, drawn just under its sheet
  assert.ok(laterIdx >= 0, 'the later sibling content should render');
  assert.ok(shadowIdx >= 0, 'the dialog deep elevation shadow should be present');
  assert.ok(shadowIdx > laterIdx, `the dialog overlay (idx ${shadowIdx}) must paint after the later sibling (idx ${laterIdx})`);
});

test('paint order: a Dialog declared FIRST still paints after a later in-flow sibling', () => {
  // Concrete frame-global proof: a uniquely-named sibling is declared AFTER the
  // dialog; the dialog's body text must occur LATER in the SVG than that sibling's
  // text. The overlay phase runs after all flow content.
  const SRC = [
    'Wireframe w=900 h=600',
    '  Dialog md',
    '    Typography "DIALOGTEXT"',
    '  Typography "LATERSIBLING"',
  ].join('\n');
  const svg = render(SRC).svg;
  const laterSiblingIdx = svg.indexOf('LATERSIBLING');
  const dialogTextIdx = svg.indexOf('DIALOGTEXT');
  assert.ok(laterSiblingIdx >= 0 && dialogTextIdx >= 0, 'both texts present');
  assert.ok(
    dialogTextIdx > laterSiblingIdx,
    `the dialog (idx ${dialogTextIdx}) must paint AFTER the later-declared sibling (idx ${laterSiblingIdx})`,
  );
});

test('paint order is FRAME-GLOBAL across nesting: a Dialog nested in an early Box paints over a later top-level sibling', () => {
  // THE case that proves frame-global beats per-container: the Dialog lives inside
  // an EARLY Box, and a top-level sibling is declared AFTER that Box. Per-container
  // ordering would paint the whole later sibling after the early Box (and thus over
  // the nested modal); frame-global hoists every overlay to paint last, so the
  // nested modal still covers the later sibling.
  const SRC = [
    'Wireframe w=900 h=700',
    '  Box 400px 200px outline=solid',
    '    Typography "in the box"',
    '    Dialog sm',
    '      Typography "NESTEDMODAL"',
    '  Typography "TOPLEVELLATER"',
  ].join('\n');
  const svg = render(SRC).svg;
  const later = svg.indexOf('TOPLEVELLATER');
  const modal = svg.indexOf('NESTEDMODAL');
  assert.ok(later >= 0 && modal >= 0, 'both texts present');
  assert.ok(modal > later, `the nested modal (idx ${modal}) must paint after the later top-level sibling (idx ${later})`);
});

// --- OPAQUE sheet + scrim (content beneath never shows through) --------------

test('the Dialog sheet is an opaque paper fill and draws a backdrop scrim over its parent', () => {
  const svg = render('Wireframe w=800 h=600\n  Dialog md\n    Typography "x"').svg;
  // Opaque paper sheet (light palette paper = #ffffff).
  assert.match(svg, /fill="#ffffff"/, 'dialog sheet should be an opaque paper fill');
  // The faint scrim is a low-opacity group over the parent content box.
  assert.match(svg, /<g opacity="0\.12">/, 'a faint backdrop scrim should be drawn');
});

// --- fullScreen fills the parent and IGNORES position ------------------------

test('fullScreen fills the parent content box and ignores position', () => {
  const W = 800, H = 600;
  const c = contentRect(W, H);
  const near = (a, b, msg) => assert.ok(Math.abs(a - b) <= 1, `${msg}: ${a} vs ${b}`);
  // fullScreen alone fills the content rect.
  const full = dialogBox(`Wireframe w=${W} h=${H}\n  Dialog fullScreen`);
  near(full.x, c.x, 'fullScreen x == content origin');
  near(full.y, c.y, 'fullScreen y == content origin');
  near(full.w, c.w, 'fullScreen w == content width');
  near(full.h, c.h, 'fullScreen h == content height');
  // fullScreen + a corner position is still the full content box (position ignored).
  const pinned = dialogBox(`Wireframe w=${W} h=${H}\n  Dialog fullScreen topLeft`);
  near(pinned.w, c.w, 'fullScreen+topLeft still fills width');
  near(pinned.h, c.h, 'fullScreen+topLeft still fills height');
  near(pinned.x, c.x, 'fullScreen+topLeft still at content origin');
});

// --- CAP: a sheet never exceeds its parent (modal stays in its container) ----

test('an oversized sheet is capped to its parent (a content dialog wider than its Box clamps)', () => {
  // A small Box with a long-heading content Dialog: the dialog clamps to the Box,
  // it does not overflow it (a modal never spills past its container).
  const SRC = [
    'Wireframe w=1200 h=800',
    '  Box 240px 160px outline=solid',
    '    Dialog content',
    '      Typography h5 "A heading far longer than this little box could ever hold"',
  ].join('\n');
  const root = layout(parse(SRC))[0].root;
  const boxBox = findByComponent(root, 'Box');
  const dlg = findByComponent(root, 'Dialog');
  assert.ok(dlg.w <= boxBox.w + 0.01, `dialog width ${dlg.w} must be capped to the Box ${boxBox.w}`);
  assert.ok(dlg.h <= boxBox.h + 0.01, `dialog height ${dlg.h} must be capped to the Box ${boxBox.h}`);
  assert.ok(dlg.x >= boxBox.x - 0.01 && dlg.x + dlg.w <= boxBox.x + boxBox.w + 0.01, 'dialog stays within the Box horizontally');
});

test('a breakpoint FLOOR wider than a small parent loses to the parent (floor is a min, parent a max)', () => {
  // lg floors to 800, but the parent Box is only 200 wide: the parent extent caps
  // the sheet (800 floor > 200 parent -> 200). The floor grows the box only up to
  // the parent; it can never push the modal past its container.
  const SRC = 'Wireframe w=1200 h=800\n  Box 200px 300px outline=solid\n    Dialog lg\n      Typography "x"';
  const root = layout(parse(SRC))[0].root;
  const boxBox = findByComponent(root, 'Box');
  const dlg = findByComponent(root, 'Dialog');
  assert.ok(dlg.w <= boxBox.w + 0.01, `lg dialog (floor 800) must cap to the 200px Box, got ${dlg.w}`);
  assert.ok(Math.abs(dlg.w - boxBox.w) <= 0.01, `lg dialog fills exactly the small Box width, got ${dlg.w} vs ${boxBox.w}`);
});

// --- EMPTY-PARENT COLLAPSE (documented behavior) -----------------------------

test('EDGE A: a non-stretch Dialog in a collapsed Box keeps its measured size (ugly but VISIBLE), not clamped to ~0', () => {
  // Documented edge (CONVENTION Ruling 2.7): an overlay adds 0, so a content-sized
  // Box with only a Dialog collapses to ~0 HEIGHT. Path (i) -- honest collapse, no
  // ancestor-walking -- positions the Dialog against that tiny rect. THE GUARD: a
  // non-stretch (content/breakpoint) sheet must NOT be clamped to the ~0 parent --
  // it keeps its full measured size (md >= 640 wide, MIN_H tall), merely
  // MISpositioned at the degenerate origin. Visible, never invisible/NaN.
  const root = layout(parse('Wireframe\n  Box outline=solid\n    Dialog md\n      Typography "x"'))[0].root;
  const boxBox = findByComponent(root, 'Box');
  const dlg = findByComponent(root, 'Dialog');
  assert.ok(boxBox.h <= 1, `the overlay-only Box collapses to ~0 height, got ${boxBox.h}`);
  for (const v of [dlg.x, dlg.y, dlg.w, dlg.h]) assert.ok(Number.isFinite(v), `dialog geometry must stay finite, got ${v}`);
  // THE GUARD: full measured size survives the collapse (NOT clamped to the 0-height parent).
  assert.ok(dlg.w >= 640, `md dialog keeps its >=640 width despite the collapsed parent, got ${dlg.w}`);
  assert.ok(dlg.h >= 80, `dialog keeps its >=80 (MIN_H) height despite the 0-height parent, got ${dlg.h}`);
  // The frame root, by contrast, is fixed-size -- a frame-root dialog has real room.
  const rootDlg = dialogBox('Wireframe w=600 h=400\n  Dialog md\n    Typography "x"');
  assert.ok(rootDlg.w > 0 && rootDlg.h > 0 && rootDlg.x > FRAME_PAD - 1, 'a frame-root dialog has positive room');
});

test('EDGE A x B: a fullScreen Dialog in a collapsed Box fills ~0 (the honest degenerate; do NOT "fix" into ancestor-walking)', () => {
  // CONVENTION Ruling 2.8: fullScreen IS a stretch overlay, so it fills the parent
  // extent -- and a collapsed (overlay-only) Box has ~0 area, so a fullScreen Dialog
  // there fills ~0 (effectively invisible). That is the consistent consequence of
  // "fill a parent with no area" (a stretch overlay intentionally takes the parent
  // extent, 0 included). Asserting it pins the behavior so nobody later retargets a
  // collapsed parent's overlays to an ancestor. Frame-root fullScreen is always safe.
  const root = layout(parse('Wireframe\n  Box outline=solid\n    Dialog fullScreen\n      Typography "x"'))[0].root;
  const boxBox = findByComponent(root, 'Box');
  const dlg = findByComponent(root, 'Dialog');
  assert.ok(boxBox.h <= 1, `the overlay-only Box collapses to ~0 height, got ${boxBox.h}`);
  assert.ok(dlg.h <= 1, `a fullScreen dialog fills the collapsed parent -> ~0 height (honest degenerate), got ${dlg.h}`);
  for (const v of [dlg.x, dlg.y, dlg.w, dlg.h]) assert.ok(Number.isFinite(v), `geometry stays finite (no NaN), got ${v}`);
  // Frame-root fullScreen is the safe case: fills the real frame, positive height.
  const rootFull = dialogBox('Wireframe w=600 h=400\n  Dialog fullScreen\n    Typography "x"');
  assert.ok(rootFull.h > 0, `frame-root fullScreen has positive height, got ${rootFull.h}`);
});

// --- TWO overlays in one container: both place + both paint, last wins on top -

test('two Dialogs in one frame both lay out and both paint (in document order)', () => {
  const SRC = [
    'Wireframe w=900 h=700',
    '  Dialog sm topLeft',
    '    Typography "FIRSTDLG"',
    '  Dialog sm bottomRight',
    '    Typography "SECONDDLG"',
  ].join('\n');
  const root = layout(parse(SRC))[0].root;
  const dialogs = root.children.filter((c) => c.node.component === 'Dialog');
  assert.equal(dialogs.length, 2, 'both dialogs are laid out');
  // They position independently (topLeft vs bottomRight): different origins.
  assert.ok(dialogs[0].x < dialogs[1].x && dialogs[0].y < dialogs[1].y, 'the two dialogs occupy different anchors');
  // Both paint, second after first (document order among overlays).
  const svg = render(SRC).svg;
  const firstIdx = svg.indexOf('FIRSTDLG');
  const secondIdx = svg.indexOf('SECONDDLG');
  assert.ok(firstIdx >= 0 && secondIdx >= 0, 'both dialog bodies render');
  assert.ok(secondIdx > firstIdx, 'the later-declared overlay paints last (on top)');
});

// =============================================================================
// anchorRect -- the SHARED overlay placement helper (common.js). Dialog delegates
// to it; Drawer (#4) and Scrollbar (#12) will too. Tested directly here so every
// anchor (incl. `stretch`, which Dialog only uses for fullScreen but Drawer/
// Scrollbar use for edge-docking) is proven, not spec-only.
// =============================================================================

const PARENT = { x: 100, y: 50, w: 400, h: 300 }; // an off-origin parent rect

test('anchorRect: each start/center/end pair seats a box inside the parent rect', () => {
  const size = { w: 80, h: 60 };
  const eq = (got, exp, msg) => assert.deepEqual(
    { x: Math.round(got.x), y: Math.round(got.y), w: Math.round(got.w), h: Math.round(got.h) }, exp, msg);
  // corners
  eq(anchorRect(PARENT, size, { h: 'start', v: 'start' }), { x: 100, y: 50, w: 80, h: 60 }, 'topLeft');
  eq(anchorRect(PARENT, size, { h: 'end', v: 'end' }), { x: 420, y: 290, w: 80, h: 60 }, 'bottomRight far edges meet parent far edges');
  // center on both axes: (400-80)/2=160 -> x=260; (300-60)/2=120 -> y=170
  eq(anchorRect(PARENT, size, { h: 'center', v: 'center' }), { x: 260, y: 170, w: 80, h: 60 }, 'center');
  // edge-centers
  eq(anchorRect(PARENT, size, { h: 'center', v: 'start' }), { x: 260, y: 50, w: 80, h: 60 }, 'top edge-center');
  eq(anchorRect(PARENT, size, { h: 'end', v: 'center' }), { x: 420, y: 170, w: 80, h: 60 }, 'right edge-center');
});

test('anchorRect: stretch fills the parent extent on that axis (Drawer/Scrollbar edge-dock)', () => {
  const size = { w: 80, h: 60 };
  // both axes stretch == fill the whole parent (fullScreen).
  assert.deepEqual(anchorRect(PARENT, size, { h: 'stretch', v: 'stretch' }), { x: 100, y: 50, w: 400, h: 300 });
  // left drawer: stretch the cross (vertical) axis, start the main (horizontal) -> full-height strip at the left.
  assert.deepEqual(anchorRect(PARENT, size, { h: 'start', v: 'stretch' }), { x: 100, y: 50, w: 80, h: 300 });
  // right scrollbar: end + vertical stretch -> full-height strip pinned to the right edge.
  assert.deepEqual(anchorRect(PARENT, size, { h: 'end', v: 'stretch' }), { x: 420, y: 50, w: 80, h: 300 });
});

test('anchorRect: an oversized box overflows the FAR edge only (near edge stays on the parent origin)', () => {
  // A box wider/taller than the parent: center would push the near edge negative;
  // the clamp keeps the near edge at the parent origin and lets the far edge spill.
  const big = { w: 600, h: 500 }; // bigger than PARENT 400x300
  const r = anchorRect(PARENT, big, { h: 'center', v: 'center' });
  assert.equal(r.x, PARENT.x, 'near x stays at parent origin (no near-edge spill)');
  assert.equal(r.y, PARENT.y, 'near y stays at parent origin');
  assert.equal(r.w, 600, 'width preserved (overflows the far edge -- a frame clips it, a Box does not)');
  assert.equal(r.h, 500, 'height preserved');
});
