// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  parse, render, toFlowGraph, toMermaid,
  REGISTRY, getComponent, isKnownComponent,
} from '../src/index.js';
import { FRAME_PAD, PRESET_SIZES } from '../src/metrics.js';
import { layout } from '../src/layout.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

/** @param {string} name */
function fixture(name) {
  return readFileSync(join(FIXTURES, name), 'utf8');
}

test('public API surface is exported', () => {
  for (const fn of [parse, render, toFlowGraph, toMermaid, getComponent, isKnownComponent]) {
    assert.equal(typeof fn, 'function');
  }
});

test('registry covers the v0.1 required components', () => {
  const required = [
    'Wireframe', 'Stack', 'Box', 'Grid', 'Card', 'AppBar', 'Toolbar',
    'Typography', 'Button', 'TextField', 'Img', 'List', 'ListItem',
  ];
  for (const name of required) {
    assert.ok(isKnownComponent(name), `missing component: ${name}`);
    assert.equal(REGISTRY[name].tier, 'v0.1', `${name} should be tier v0.1`);
  }
});

test('getComponent merges the universal to= prop', () => {
  const card = getComponent('Card');
  assert.ok(card, 'Card should resolve');
  assert.equal(card.props.to.type, 'ref');
  assert.equal(getComponent('NopeComponent'), undefined);
});

test('keyless slots never collide: <=1 literal; keyless-enum domains pairwise disjoint (ss.3.2.2)', () => {
  // Multiple keyless enums per element are allowed (e.g. Button variant+size); a bare
  // token resolves to the enum whose value-domain contains it, so those domains MUST
  // be pairwise disjoint per component. (Mirrors the foundation invariant test.)
  for (const [name, def] of Object.entries(REGISTRY)) {
    const slots = def.keyless ?? [];
    assert.ok(slots.filter((s) => s.kind === 'literal').length <= 1, `${name}: more than one keyless literal`);
    const seen = new Map();
    for (const slot of slots.filter((s) => s.kind === 'enum')) {
      for (const v of def.props[slot.to]?.values ?? []) {
        assert.ok(!seen.has(v), `${name}: keyless-enum value "${v}" in both "${seen.get(v)}" and "${slot.to}" (domains must be disjoint)`);
        seen.set(v, slot.to);
      }
    }
    // A keyless boolean resolves by its bare NAME, after keyless enums — so a boolean
    // prop whose name equals a keyless-enum value would be unreachable as a bare flag.
    for (const [pname, pdef] of Object.entries(def.props ?? {})) {
      if (pdef.type === 'boolean')
        assert.ok(!seen.has(pname), `${name}: boolean "${pname}" is shadowed by a same-named keyless-enum value`);
    }
  }
});

test('fixture corpus loads and each fixture is a frame', () => {
  const files = readdirSync(FIXTURES).filter((f) => f.endsWith('.wiremark'));
  assert.ok(files.length >= 5, 'expected the ss.8 + composition fixtures');
  for (const file of files) {
    const src = readFileSync(join(FIXTURES, file), 'utf8').trim();
    assert.ok(src.length > 0, `${file} is empty`);
    assert.ok(src.startsWith('Wireframe'), `${file} should start with a Wireframe root`);
  }
});

// --- pipeline status: front-end + prototype render landed; later phases pending ---

test('Phase 1: parse the login fixture to a stable AST', () => {
  const doc = parse(readFileSync(join(FIXTURES, 'login.wiremark'), 'utf8'));
  assert.equal(doc.frames.length, 1);

  const frame = doc.frames[0];
  assert.equal(frame.id, 'login');
  assert.equal(frame.preset, 'mobile');

  const stack = frame.children[0];
  assert.equal(stack.component, 'Stack');
  assert.equal(stack.props.direction, 'column');
  assert.equal(stack.props.spacing, 2);

  const heading = stack.children[0];
  assert.equal(heading.component, 'Typography');
  assert.equal(heading.props.variant, 'h4');
  assert.equal(heading.props.label, 'Sign in');

  const email = stack.children.find((c) => c.props.label === 'Email');
  assert.equal(email.component, 'TextField');
  assert.equal(email.props.type, 'email');

  const button = stack.children.find((c) => c.component === 'Button');
  assert.equal(button.props.variant, 'contained'); // filled look now via variant=contained (no `primary`)
  assert.equal(button.props.to, 'dashboard'); // to=#dashboard, anchor normalized

  const filler = stack.children.at(-1);
  assert.equal(filler.component, 'Typography');
  assert.deepEqual(filler.filler, { amount: 2, unit: 'units' }); // Typography ~2
});

test('Phase 3 (prototype): render hello-world to one hand-drawn SVG', () => {
  const { svg, diagnostics } = render(readFileSync(join(FIXTURES, 'hello-world.wiremark'), 'utf8'));
  assert.equal(diagnostics.length, 0);
  assert.match(svg, /^<svg /);
  assert.match(svg, /<\/svg>$/);
  assert.match(svg, /width="800" height="600"/); // default bare-Wireframe canvas
  assert.match(svg, /Hello World!/);             // the Typography text
  assert.match(svg, /<path /);                    // rough.js frame border
});

test('the front-end rejects tabs in indentation (SPEC ss.3.1)', () => {
  assert.throws(() => parse('Wireframe\n\tTypography "x"'), /tab/i);
});

test('the front-end rejects a bare (unquoted) text literal (SPEC ss.3.2.1/3.2.3)', () => {
  assert.throws(() => parse('Wireframe\n  Typography Email'), Error);
});

test('Phase 2: layout produces correct geometry for the dashboard', () => {
  const frame = layout(parse(fixture('dashboard.wiremark')))[0];
  // landscape preset sizes the frame.
  assert.deepEqual({ w: frame.w, h: frame.h }, PRESET_SIZES.landscape);

  const contentW = PRESET_SIZES.landscape.w - 2 * FRAME_PAD; // 1280 - 32 = 1248
  const [appbar, body] = frame.root.children;

  // The AppBar spans the full frame content width.
  assert.equal(appbar.node.component, 'AppBar');
  assert.ok(Math.abs(appbar.w - contentW) <= 1, `AppBar should span the content width (~${contentW}), got ${appbar.w}`);

  // The body is a row: a fixed 240px nav rail, then the flexing main region.
  assert.equal(body.node.component, 'Stack');
  const [nav, main] = body.children;
  assert.equal(nav.w, 240, 'the nav rail honors its 240px token');
  assert.ok(main.w > nav.w, `the main region flexes to fill the rest, got ${main.w}`);
  // The body Stack is `row 100% * spacing=3`, so a 24px gap sits between the two
  // children; nav + gap + main (not nav + main) fill the content width.
  const gap = main.x - (nav.x + nav.w);
  assert.equal(gap, 24, 'spacing=3 yields a 24px inter-child gap');
  assert.ok(Math.abs((nav.w + gap + main.w) - contentW) <= 1, 'nav + gap + main fill the row width');

  // The main region holds a 3-column grid; the three cards are equal-width cells
  // laid left-to-right, and the grid has real height (cards are not collapsed).
  const grid = main.children[0];
  assert.equal(grid.node.component, 'Grid');
  assert.equal(grid.children.length, 3, 'three grid cells');
  const [c0, c1, c2] = grid.children;
  assert.ok(c0.x < c1.x && c1.x < c2.x, 'cells flow left-to-right');
  assert.ok(Math.abs(c0.w - c1.w) <= 1 && Math.abs(c1.w - c2.w) <= 1, 'cells are equal width');
  assert.ok(grid.h > 0, `the grid should have positive height, got ${grid.h}`);
});

test('Phase 3: render the §8 fixtures to valid SVG with their content', () => {
  const expectations = {
    'login.wiremark': ['Sign in', 'Email', 'Password'],
    'dashboard.wiremark': ['Acme', 'Card 1'],
    'product-card.wiremark': ['Product name', 'Buy'],
  };
  for (const [file, texts] of Object.entries(expectations)) {
    const { svg, diagnostics } = render(fixture(file));
    assert.deepEqual(diagnostics, [], `${file} should render without diagnostics`);
    assert.match(svg, /^<svg /, `${file} starts with <svg`);
    assert.match(svg, /<\/svg>$/, `${file} ends with </svg>`);
    assert.match(svg, /<path /, `${file} draws hand-drawn paths`);
    for (const t of texts) assert.ok(svg.includes(t), `${file} should render "${t}"`);
  }
});

// Inline sources keep these self-contained (the standalone shell/screen fixtures
// were folded into multi-frame.wiremark): a hidden #shell supplies shared chrome,
// a visible #screen pulls it in with background=#shell.
const SHELL = [
  'Wireframe #shell landscape visible=false',
  '  AppBar',
  '    Toolbar',
  '      Typography h6 "Acme"',
  '  Box 240px *',
].join('\n');
const SCREEN_BG = [
  'Wireframe #screen landscape background=#shell',
  '  Grid cols=3',
  '    Card',
  '    Card',
  '    Card',
].join('\n');

test('Phase 3 (composition): a visible frame paints over its background= chain (ss.5.1.1)', () => {
  // Rendered together, the shell is underlaid beneath the screen and the pair
  // resolves cleanly.
  const { svg, diagnostics } = render(`${SHELL}\n\n${SCREEN_BG}`);
  assert.deepEqual(diagnostics, [], 'a resolvable background chain warns about nothing');
  assert.match(svg, /^<svg /);
  assert.match(svg, /Acme/, "the shell's chrome is painted beneath the screen");
  // shell is visible=false, so only the one visible frame stands alone in the output.
  assert.equal((svg.match(/<g transform/g) ?? []).length, 1, 'only the visible frame renders standalone');
});

test('Phase 3 (composition): an unresolved background= warns but still renders (ss.5.1.1)', () => {
  // Rendered on its own, #screen cannot find #shell; the engine warns rather than
  // failing and emits the foreground regardless.
  const { svg, diagnostics } = render(SCREEN_BG);
  assert.ok(
    diagnostics.some((d) => d.severity === 'warning' && /#shell/.test(d.message)),
    'a missing background target yields a warning',
  );
  assert.match(svg, /^<svg /);
  assert.match(svg, /<\/svg>$/);
  assert.match(svg, /<path /, 'the foreground still draws');
});

test('Phase 4: infer the navigation graph from to= links', () => {
  // Flow extraction is covered in depth by flow.test.js; this guards the pipeline
  // wiring -- the dashboard's ListItem to= links surface as edges from the frame.
  const { nodes, edges } = toFlowGraph(parse(fixture('dashboard.wiremark')));
  assert.deepEqual(nodes, [{ id: 'dashboard' }]);
  for (const target of ['home', 'reports', 'settings']) {
    assert.ok(edges.some((e) => e.from === 'dashboard' && e.to === target), `expected edge dashboard -> ${target}`);
  }
});
