// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import { pinAt, routePoints, roadLines, contourLines } from '../../src/elements/Map.js';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];
/** Rendered SVG for `src`. */
const svgOf = (src) => render(src).svg;
/** Count of `<path` elements in the SVG (proxy for distinct drawn marks). */
const pathCount = (svg) => (svg.match(/<path\b/g) ?? []).length;
/** Count of solid-accent fill paths -- the unique signature of a POI pin head. */
const pinHeads = (svg) => (svg.match(/fill="#cfe0ee" stroke="none"/g) ?? []).length;

// --- parse: keyless wiring + props ---------------------------------------------

test('Map parses cleanly as a content leaf with no diagnostics', () => {
  const doc = parse('Wireframe\n  Map');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].component, 'Map');
});

test('the resolver injects no defaults; props are absent until set', () => {
  // Defaults (level=street, path/compass/labels=false) live in the strategy, not
  // the resolved node -- the Calendar/Rating convention.
  const c = firstChild('Wireframe\n  Map');
  for (const p of ['level', 'icon', 'pins', 'path', 'compass', 'labels', 'contours']) {
    assert.equal(c.props[p], undefined, `props.${p} should be absent`);
  }
});

test('a bare icon name is the keyless `icon` slot and resolves onto node.icons', () => {
  const c = firstChild('Wireframe\n  Map DirectionsCar');
  assert.equal(c.props.icon, 'DirectionsCar');
  assert.ok(c.icons?.icon, 'a known icon resolves to artwork for drawIcon');
});

test('a quoted literal is also the keyless `icon` slot', () => {
  assert.equal(firstChild('Wireframe\n  Map "LocationOn"').props.icon, 'LocationOn');
});

test('icon aliases marker= / center= map to icon (keyed)', () => {
  assert.equal(firstChild('Wireframe\n  Map marker=LocationOn').props.icon, 'LocationOn');
  assert.equal(firstChild('Wireframe\n  Map center=DirectionsCar').props.icon, 'DirectionsCar');
});

test('a bare enum token is the keyless `level` slot (both levels)', () => {
  for (const v of ['street', 'area']) {
    assert.equal(firstChild(`Wireframe\n  Map ${v}`).props.level, v, `${v} should set level`);
  }
});

test('`zoom=` is an alias for level', () => {
  const doc = parse('Wireframe\n  Map zoom=area');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.level, 'area');
});

test('pins is KEYED only; a bare number is a sizing token, not pins', () => {
  // `pins` has no keyless number slot: a bare number is sizing here (the resolver
  // tries parseSize before any keyless-number step on a sizing element), exactly
  // like Box/Calendar value. `Map 4` therefore sets a flex sizing token, NOT pins.
  const c = firstChild('Wireframe\n  Map 4');
  assert.equal(c.props.pins, undefined, 'bare 4 must not set pins');
  assert.deepEqual(c.size, { w: { unit: 'flex', value: 4 }, h: undefined });
});

test('pins is set with the keyed spelling and each alias (poi / markers)', () => {
  assert.equal(firstChild('Wireframe\n  Map pins=4').props.pins, 4);
  for (const alias of ['poi', 'markers']) {
    const doc = parse(`Wireframe\n  Map ${alias}=5`);
    assert.deepEqual(doc.diagnostics, [], `Map ${alias}=5 should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.pins, 5, `${alias}= should map to pins`);
  }
});

test('path / compass / labels are keyless boolean flags', () => {
  const c = firstChild('Wireframe\n  Map street path compass labels');
  assert.equal(c.props.path, true);
  assert.equal(c.props.compass, true);
  assert.equal(c.props.labels, true);
});

test('path / compass aliases route= / controls= map keyed (a bare alias is an icon name)', () => {
  // The aliases work KEYED (resolveKeyed routes them); a BARE alias falls through
  // to the icon-name catch-all (the literal slot is icon-typed), the Icon/Fab rule.
  const c = firstChild('Wireframe\n  Map route=true controls=true');
  assert.equal(c.props.path, true);
  assert.equal(c.props.compass, true);
});

test('an unknown bare token becomes an icon name (soft warning), never a hard error', () => {
  // Because the single literal slot is icon-typed, any unrecognized bare token is
  // treated as an icon name -- resolved to the placeholder with a soft Diagnostic
  // (the Icon/Fab behavior), not a thrown "unexpected token".
  const { diagnostics } = render('Wireframe\n  Map Frobnicate');
  assert.equal(firstChild('Wireframe\n  Map Frobnicate').props.icon, 'Frobnicate');
  assert.ok(
    diagnostics.some((d) => d.severity === 'warning' && /unknown icon "Frobnicate"/.test(d.message)),
    'an unknown icon name warns rather than throwing',
  );
});

// --- deterministic logic (pure index predicates; the exported helpers) ---------

test('pinAt is a pure predicate placing pins inside the rect', () => {
  const rect = { x: 10, y: 20, w: 300, h: 200 };
  assert.deepEqual(pinAt(3, rect), pinAt(3, rect), 'same (i, rect) -> same point');
  for (let i = 0; i < 12; i++) {
    const p = pinAt(i, rect);
    assert.ok(p.x > rect.x && p.x < rect.x + rect.w, `pin ${i} x inside`);
    assert.ok(p.y > rect.y && p.y < rect.y + rect.h, `pin ${i} y inside`);
  }
});

test('routePoints is pure, has a fixed shape, and scales into the rect', () => {
  const rect = { x: 0, y: 0, w: 400, h: 300 };
  const pts = routePoints(rect);
  assert.equal(pts.length, 5, 'origin + bends + destination');
  assert.deepEqual(routePoints(rect), pts, 'pure: same rect -> same points');
  for (const p of pts) {
    assert.ok(p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h);
  }
  // The route is directional: origin near the bottom-left, destination top-right.
  assert.ok(pts[0].x < pts[4].x && pts[0].y > pts[4].y);
});

test('roadLines count switches with level', () => {
  const rect = { x: 0, y: 0, w: 300, h: 200 };
  assert.ok(roadLines('street', rect).length > roadLines('area', rect).length, 'street is the denser grid');
  // An unknown level falls back to the street grid.
  assert.equal(roadLines('galaxy', rect).length, roadLines('street', rect).length);
});

test('contourLines is a pure marching-squares layer, in-bounds, with index contours', () => {
  const rect = { x: 5, y: 10, w: 300, h: 200 };
  const segs = contourLines(rect);
  assert.deepEqual(contourLines(rect), segs, 'pure: same rect -> same iso-line segments');
  assert.ok(segs.length > 20, 'a real elevation field yields many iso-line segments');
  assert.ok(segs.some((s) => s.index) && segs.some((s) => !s.index), 'has both index and minor contours');
  // A bigger box samples a finer grid -> more segments.
  assert.ok(contourLines({ x: 0, y: 0, w: 600, h: 400 }).length > contourLines({ x: 0, y: 0, w: 160, h: 120 }).length);
  for (const s of segs) {
    assert.ok(s.x1 >= rect.x - 1 && s.x1 <= rect.x + rect.w + 1, 'x within the rect');
    assert.ok(s.y1 >= rect.y - 1 && s.y1 <= rect.y + rect.h + 1, 'y within the rect');
  }
});

test('the map logic reaches no clock or RNG (pure + deterministic)', () => {
  const src = readFileSync(join(import.meta.dirname, '../../src/elements/Map.js'), 'utf8');
  // Match call-shaped patterns (a trailing `(`) so a JSDoc mention of the names
  // in prose -- e.g. "never the clock or `Math.random`" -- isn't a false positive.
  assert.doesNotMatch(src, /Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(/, 'no Date/Math.random reachable');
});

// --- layout: intrinsic + sizing ------------------------------------------------

test('every level lays out to a finite, positive box', () => {
  for (const v of ['street', 'area']) {
    const box = firstBox(`Wireframe\n  Map ${v}`);
    assert.ok(Number.isFinite(box.w) && box.w > 0, `${v} w finite/positive, got ${box.w}`);
    assert.ok(Number.isFinite(box.h) && box.h > 0, `${v} h finite/positive, got ${box.h}`);
  }
});

test('a bare Map has the natural ~360x260 landscape footprint', () => {
  const box = firstBox('Wireframe\n  Map');
  assert.ok(Math.abs(box.w - 360) <= 1, `natural w ~360, got ${box.w}`);
  assert.ok(Math.abs(box.h - 260) <= 1, `natural h ~260, got ${box.h}`);
});

test('positional px tokens pin the exact box (w then h)', () => {
  const box = firstBox('Wireframe\n  Map 420px 300px');
  assert.equal(Math.round(box.w), 420);
  assert.equal(Math.round(box.h), 300);
});

test('a pinned width drives a proportional height (preserves the natural aspect)', () => {
  const nat = firstBox('Wireframe\n  Map');
  const box = firstBox('Wireframe\n  Map 320px');
  assert.equal(Math.round(box.w), 320);
  assert.ok(Math.abs(box.h / box.w - nat.h / nat.w) < 0.02, `aspect should match natural, got ${box.w}x${box.h}`);
});

test('w=100% (positional) fills the column and scales the height proportionally', () => {
  const nat = firstBox('Wireframe\n  Map');
  const box = layout(parse('Wireframe\n  Stack column 240px\n    Map 100%'))[0].root.children[0].children[0];
  assert.equal(Math.round(box.w), 240);
  assert.ok(Math.abs(box.h - 240 * (nat.h / nat.w)) <= 2, `height should follow width proportionally, got ${box.h}`);
});

test('a pinned height is honored alongside a relative width (height overrides)', () => {
  const box = layout(parse('Wireframe\n  Stack column 240px\n    Map 100% 300px'))[0].root.children[0].children[0];
  assert.equal(Math.round(box.w), 240, 'relative width fills the column');
  assert.equal(Math.round(box.h), 300, 'the px height pin is honored');
});

// --- render --------------------------------------------------------------------

test('a bare Map renders the framed street panel, clean', () => {
  const { svg, diagnostics } = render('Wireframe\n  Map');
  assert.deepEqual(diagnostics, []);
  assert.match(svg, /<path /, 'the bordered surface + street grid draw');
  assert.equal(pinHeads(svg), 0, 'no pins by default');
  assert.ok(!svg.includes('scale('), 'no center icon by default');
  assert.ok(!svg.includes('stroke-width="2.5"'), 'no route by default');
});

test('pins=N draws exactly N pin heads, clamped to the visual maximum', () => {
  assert.equal(pinHeads(svgOf('Wireframe\n  Map pins=5')), 5);
  assert.equal(pinHeads(svgOf('Wireframe\n  Map pins=1')), 1);
  assert.equal(pinHeads(svgOf('Wireframe\n  Map pins=12')), 12);
  assert.equal(pinHeads(svgOf('Wireframe\n  Map pins=200')), 24, 'a huge pins= clamps to MAX_PINS=24');
});

test('icon= draws the center marker: a known name as clean artwork, unknown as the placeholder', () => {
  const known = render('Wireframe\n  Map DirectionsCar');
  assert.deepEqual(known.diagnostics, [], 'a built-in icon renders clean');
  assert.ok(known.svg.includes('scale('), 'a resolved icon draws clean vector artwork');
  assert.ok(pathCount(known.svg) > pathCount(svgOf('Wireframe\n  Map')), 'the marker ring adds marks');
  // An unknown name degrades to the placeholder glyph and still renders.
  const unknown = render('Wireframe\n  Map Nonsuch');
  assert.ok(unknown.diagnostics.some((d) => /unknown icon/.test(d.message)));
  assert.match(unknown.svg, /<path /, 'the placeholder marker still draws');
  assert.ok(!unknown.svg.includes('scale('), 'an unresolved icon draws no clean artwork');
});

test('path draws the GPS route connector (its own thick arrow) only when set', () => {
  const ROUTE = /stroke-width="2\.5"/; // CONNECTOR_WIDTH -- used nowhere else in the map
  assert.doesNotMatch(svgOf('Wireframe\n  Map area'), ROUTE, 'no route without path');
  assert.match(svgOf('Wireframe\n  Map area path'), ROUTE, 'path draws a connectorArrow');
});

test('compass adds chrome marks only when set', () => {
  const without = pathCount(svgOf('Wireframe\n  Map'));
  assert.ok(pathCount(svgOf('Wireframe\n  Map compass')) > without, 'compass adds the rose + zoom box');
});

test('labels add squiggle marks only when set', () => {
  const without = pathCount(svgOf('Wireframe\n  Map'));
  assert.ok(pathCount(svgOf('Wireframe\n  Map labels')) > without, 'labels add squiggles');
});

test('the contour texture draws by default and contours=false drops it', () => {
  const withContours = pathCount(svgOf('Wireframe\n  Map'));
  const without = pathCount(svgOf('Wireframe\n  Map contours=false'));
  assert.ok(without < withContours, `contours=false removes the contour layer (${without} < ${withContours})`);
});

test('the area level renders clean (the park/water blob)', () => {
  assert.deepEqual(render('Wireframe\n  Map area pins=4').diagnostics, []);
});

test('the render adapts its geometry to the box width (sizing -> grid)', () => {
  // The headline claim: the SAME element is a small sidebar locator or a full-bleed
  // map. A wider box draws a denser street grid (more line marks).
  const small = pathCount(svgOf('Wireframe\n  Map 200px'));
  const large = pathCount(svgOf('Wireframe\n  Map 700px'));
  assert.ok(large > small, `the grid should track box.w (200px->${small}, 700px->${large})`);
});

test('a Map carrying to= is wrapped in a link by the facade', () => {
  assert.match(svgOf('Wireframe\n  Map to=#next'), /<a class="wm-link" href="#next">/);
});

// --- determinism ---------------------------------------------------------------

test('rendering is deterministic (byte-identical across runs)', () => {
  const src = 'Wireframe\n  Map area DirectionsCar pins=6 path compass labels';
  assert.equal(render(src).svg, render(src).svg);
});
