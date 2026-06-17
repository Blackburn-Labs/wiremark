// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import { parseMonth, daysInMonth, dayOfWeek } from '../../src/elements/Calendar.js';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];
/** Rendered SVG for `src`. */
const svgOf = (src) => render(src).svg;
/** Count of `<path` elements in the SVG (proxy for distinct drawn marks). */
const pathCount = (svg) => (svg.match(/<path\b/g) ?? []).length;
/** The largest x= of any `<text>` element -- a frame-offset-independent proxy for
 *  how far right the grid is drawn, so it scales with the box width. */
const maxTextX = (svg) => Math.max(...[...svg.matchAll(/<text[^>]*\bx="([\d.]+)"/g)].map((m) => Number(m[1])));

// --- parse: keyless wiring + props ---------------------------------------------

test('Calendar parses cleanly as an inputs leaf with no diagnostics', () => {
  const doc = parse('Wireframe\n  Calendar');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].component, 'Calendar');
});

test('the resolver injects no defaults; props are absent until set', () => {
  // Defaults (variant=month, weekStart=sun, weekdays/header=true, events=false)
  // live in the strategy, not the resolved node -- the Rating/Skeleton convention.
  const c = firstChild('Wireframe\n  Calendar');
  for (const p of ['month', 'variant', 'value', 'today', 'weekStart', 'weekdays', 'header', 'events']) {
    assert.equal(c.props[p], undefined, `props.${p} should be absent`);
  }
});

test('a quoted literal is the keyless `month` slot', () => {
  assert.equal(firstChild('Wireframe\n  Calendar "March 2026"').props.month, 'March 2026');
  assert.equal(firstChild('Wireframe\n  Calendar "2026-06"').props.month, '2026-06');
});

test('`title=` is an alias for month', () => {
  const doc = parse('Wireframe\n  Calendar title="Sprint A"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.month, 'Sprint A');
});

test('a bare enum token is the keyless `variant` slot', () => {
  for (const v of ['month', 'compact', 'week', 'year']) {
    const c = firstChild(`Wireframe\n  Calendar ${v}`);
    assert.equal(c.props.variant, v, `${v} should set variant`);
  }
});

test('value is KEYED only; a bare number is a sizing token, not value', () => {
  // `value` has no keyless number slot (a bare number is sizing here, exactly like
  // Box/Skeleton). `Calendar 14` therefore sets a flex sizing token, NOT value.
  const c = firstChild('Wireframe\n  Calendar 14');
  assert.equal(c.props.value, undefined, 'bare 14 must not set value');
  assert.deepEqual(c.size, { w: { unit: 'flex', value: 14 }, h: undefined });
});

test('value is set with the keyed spelling and each alias (v / val / selected)', () => {
  assert.equal(firstChild('Wireframe\n  Calendar value=12').props.value, 12);
  for (const alias of ['v', 'val', 'selected']) {
    const doc = parse(`Wireframe\n  Calendar ${alias}=9`);
    assert.deepEqual(doc.diagnostics, [], `Calendar ${alias}=9 should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.value, 9, `${alias}= should map to value`);
  }
});

test('today / weekStart / weekdays / header / events parse', () => {
  const c = firstChild('Wireframe\n  Calendar "Feb 2026" value=14 today=3 weekStart=mon weekdays=false header=false events');
  assert.equal(c.props.today, 3);
  assert.equal(c.props.weekStart, 'mon');
  assert.equal(c.props.weekdays, false);
  assert.equal(c.props.header, false);
  assert.equal(c.props.events, true);
});

test('weekStart is keyed-only; a bare `mon` is not a keyless slot', () => {
  assert.throws(() => parse('Wireframe\n  Calendar mon'), /unexpected token/);
});

test('an unquoted month is rejected (month must be quoted)', () => {
  assert.throws(() => parse('Wireframe\n  Calendar March'), /unexpected token/);
});

test('an unknown bare token is an error', () => {
  assert.throws(() => parse('Wireframe\n  Calendar sparkly'), /unexpected token/);
});

test('a bad enum value for weekStart is rejected', () => {
  assert.throws(() => parse('Wireframe\n  Calendar weekStart=tue'), /not valid for "weekStart="/);
});

// --- month logic (pure arithmetic; the exported helpers) -----------------------

test('daysInMonth handles ordinary months and leap-year February', () => {
  assert.equal(daysInMonth(2026, 5), 30, 'June 2026 has 30 days');
  assert.equal(daysInMonth(2026, 2), 31, 'March 2026 has 31 days');
  assert.equal(daysInMonth(2026, 1), 28, 'Feb 2026 (non-leap) has 28 days');
  assert.equal(daysInMonth(2028, 1), 29, 'Feb 2028 (leap) has 29 days');
  assert.equal(daysInMonth(2100, 1), 28, 'Feb 2100 (century non-leap) has 28 days');
  assert.equal(daysInMonth(2000, 1), 29, 'Feb 2000 (400-divisible leap) has 29 days');
});

test('dayOfWeek (Sakamoto) returns 0=Sunday and matches real dates', () => {
  assert.equal(dayOfWeek(2026, 5, 1), 1, 'June 1 2026 is a Monday');
  assert.equal(dayOfWeek(2026, 1, 1), 0, 'Feb 1 2026 is a Sunday');
  assert.equal(dayOfWeek(2026, 0, 1), 4, 'Jan 1 2026 is a Thursday');
  assert.equal(dayOfWeek(2026, 2, 1), 0, 'March 1 2026 is a Sunday');
});

test('parseMonth reads "MonthName YYYY" (full or abbreviated)', () => {
  const june = parseMonth('June 2026');
  assert.equal(june.year, 2026);
  assert.equal(june.monthIndex, 5);
  assert.equal(june.days, 30);
  assert.equal(june.firstWeekday, 1);
  assert.equal(june.label, 'June 2026');
  assert.equal(june.namedMonth, true);
  // 3-letter form resolves to the same month.
  assert.equal(parseMonth('Jun 2026').monthIndex, 5);
  assert.equal(parseMonth('Sept 2026').monthIndex, 8);
});

test('parseMonth reads "YYYY-MM"', () => {
  const p = parseMonth('2026-06');
  assert.equal(p.monthIndex, 5);
  assert.equal(p.days, 30);
  assert.equal(p.label, 'June 2026');
});

test('parseMonth reads a bare year (the year variant input)', () => {
  const p = parseMonth('2026');
  assert.equal(p.year, 2026);
  assert.equal(p.label, '2026');
  assert.equal(p.namedMonth, false);
});

test('parseMonth falls back to a canonical grid for an unparseable title', () => {
  const p = parseMonth('Sprint A');
  assert.equal(p.label, 'Sprint A', 'the raw string is kept as the title');
  assert.equal(p.canonical, true);
  assert.equal(p.days, 30);
  assert.ok(Number.isFinite(p.firstWeekday));
});

// --- layout: intrinsic + sizing ------------------------------------------------

test('every variant lays out to a finite, positive box', () => {
  for (const v of ['month', 'compact', 'week', 'year']) {
    const box = firstBox(`Wireframe\n  Calendar ${v}`);
    assert.ok(Number.isFinite(box.w) && box.w > 0, `${v} w finite/positive, got ${box.w}`);
    assert.ok(Number.isFinite(box.h) && box.h > 0, `${v} h finite/positive, got ${box.h}`);
  }
});

test('compact has a smaller footprint than month', () => {
  assert.ok(firstBox('Wireframe\n  Calendar compact').w < firstBox('Wireframe\n  Calendar month').w);
});

test('positional px tokens pin the exact box (w then h)', () => {
  const box = firstBox('Wireframe\n  Calendar 420px 380px');
  assert.equal(Math.round(box.w), 420);
  assert.equal(Math.round(box.h), 380);
});

test('a pinned width drives a proportional height (preserves the natural aspect)', () => {
  // Pinning width keeps the variant's natural aspect ratio, so day cells stay ~square.
  const nat = firstBox('Wireframe\n  Calendar');
  const box = firstBox('Wireframe\n  Calendar 320px');
  assert.equal(Math.round(box.w), 320);
  assert.ok(Math.abs(box.h / box.w - nat.h / nat.w) < 0.02, `aspect should match natural (${nat.w}x${nat.h}), got ${box.w}x${box.h}`);
});

test('w=100% (positional) fills the column and scales the height proportionally', () => {
  // The mechanism a sidebar uses: the calendar fills the column width, height follows.
  const nat = firstBox('Wireframe\n  Calendar');
  const box = layout(parse('Wireframe\n  Stack column 240px\n    Calendar 100%'))[0].root.children[0].children[0];
  assert.equal(Math.round(box.w), 240);
  assert.ok(Math.abs(box.h - 240 * (nat.h / nat.w)) <= 2, `height should follow width proportionally, got ${box.h}`);
});

test('a pinned height is honored alongside a relative width (height overrides)', () => {
  // `100% 380px` = relative width + px height: the width fills the column, the px
  // height pin wins over the width-derived one (the intrinsic h-pin branch).
  const box = layout(parse('Wireframe\n  Stack column 240px\n    Calendar 100% 380px'))[0].root.children[0].children[0];
  assert.equal(Math.round(box.w), 240, 'relative width fills the column');
  assert.equal(Math.round(box.h), 380, 'the px height pin is honored');
});

// --- render --------------------------------------------------------------------

test('a bare Calendar renders the default June 2026 month with day numbers', () => {
  const { svg, diagnostics } = render('Wireframe\n  Calendar');
  assert.deepEqual(diagnostics, []);
  assert.match(svg, /<path /);
  assert.ok(svg.includes('June 2026'), 'the title is drawn');
  assert.ok(svg.includes('>15<'), 'in-month day numbers are drawn');
});

test('a parsed month title is drawn', () => {
  assert.ok(svgOf('Wireframe\n  Calendar "March 2026"').includes('March 2026'));
  assert.ok(svgOf('Wireframe\n  Calendar "2026-06"').includes('June 2026'));
});

test('an unparseable title renders as the raw string over a clean grid', () => {
  const { svg, diagnostics } = render('Wireframe\n  Calendar "Sprint A"');
  assert.deepEqual(diagnostics, []);
  assert.ok(svg.includes('Sprint A'), 'the raw title is drawn');
  // The canonical fallback still draws a real 30-day grid (not just the title).
  assert.ok(svg.includes('>15<') && svg.includes('>30<'), 'the canonical grid draws its day numbers');
});

test('the render adapts its geometry to the box width (sizing -> grid)', () => {
  // The headline claim: the SAME element is a small sidebar widget or a full-bleed
  // calendar. A render that ignored box.w (drew at NATURAL.w) would not scale here.
  const small = maxTextX(svgOf('Wireframe\n  Calendar 200px'));
  const large = maxTextX(svgOf('Wireframe\n  Calendar 600px'));
  assert.ok(large > small + 200, `the grid should track box.w (200px->${Math.round(small)}, 600px->${Math.round(large)})`);
});

test('value draws a filled accent highlight only when set', () => {
  const ACCENT = /fill="#cfe0ee"/;
  assert.doesNotMatch(svgOf('Wireframe\n  Calendar'), ACCENT, 'no highlight without value');
  assert.match(svgOf('Wireframe\n  Calendar value=16'), ACCENT, 'value fills a day');
});

test('today draws an outlined ring (its unique 1.6 stroke) only when set', () => {
  const RING = /stroke-width="1\.6"/;
  assert.doesNotMatch(svgOf('Wireframe\n  Calendar'), RING, 'no ring without today');
  assert.match(svgOf('Wireframe\n  Calendar today=10'), RING, 'today draws a ring');
});

test('events adds indicator dots (more drawn marks than without)', () => {
  const without = pathCount(svgOf('Wireframe\n  Calendar "June 2026"'));
  const withEvents = pathCount(svgOf('Wireframe\n  Calendar "June 2026" events'));
  assert.ok(withEvents > without, `events should add dots (${withEvents} vs ${without})`);
});

test('weekStart=mon reorders the weekday header (Mo leads, Su trails)', () => {
  const sun = svgOf('Wireframe\n  Calendar "June 2026"');
  const mon = svgOf('Wireframe\n  Calendar "June 2026" weekStart=mon');
  assert.ok(sun.indexOf('>Su<') < sun.indexOf('>Mo<'), 'sun-start: Su precedes Mo');
  assert.ok(mon.indexOf('>Mo<') < mon.indexOf('>Su<'), 'mon-start: Mo precedes Su');
});

test('the month grid renders only the weeks the month needs (no trailing all-next-month row)', () => {
  // Each grid emits 1 title + 7 weekday heads + rows*7 day-cell <text>, so rows are
  // recoverable. June 2026 (Sun start) fits in 5 weeks, May 2026 needs 6, Feb 2026
  // (Sun start, 1st=Sun) is exactly 4 -- and a 6-row month must NOT shrink to 5.
  const textCount = (svg) => (svg.match(/<text\b/g) ?? []).length;
  const rowsOf = (src) => (textCount(svgOf(src)) - 8) / 7;
  assert.equal(rowsOf('Wireframe\n  Calendar "June 2026"'), 5, 'June 2026 = 5 weeks (no dangling 6th row)');
  assert.equal(rowsOf('Wireframe\n  Calendar "May 2026"'), 6, 'May 2026 genuinely spans 6 weeks');
  assert.equal(rowsOf('Wireframe\n  Calendar "Feb 2026"'), 4, 'Feb 2026 (Sun start) is a clean 4 weeks');
  assert.equal(rowsOf('Wireframe\n  Calendar "Feb 2026" weekStart=mon'), 5, 'weekStart can change the week count');
});

test('header=false / weekdays=false drop their rows but still render', () => {
  const { svg, diagnostics } = render('Wireframe\n  Calendar header=false weekdays=false');
  assert.deepEqual(diagnostics, []);
  assert.ok(!svg.includes('June 2026'), 'no header title when header=false');
  assert.ok(svg.includes('>15<'), 'the day grid still draws');
});

test('the year variant renders 12 month abbreviations', () => {
  const svg = svgOf('Wireframe\n  Calendar "2026" year');
  for (const abbr of ['Jan', 'Feb', 'Mar', 'Dec']) {
    assert.ok(svg.includes(`>${abbr}<`), `year overview should label ${abbr}`);
  }
});

test('the year variant tints the named month, but not for a bare year', () => {
  const ACCENT = /fill="#cfe0ee"/;
  assert.match(svgOf('Wireframe\n  Calendar "June 2026" year'), ACCENT, 'a named month is highlighted');
  assert.doesNotMatch(svgOf('Wireframe\n  Calendar "2026" year'), ACCENT, 'a bare year highlights no month');
});

test('the week variant renders a single row (fewer marks than a full month)', () => {
  const week = pathCount(svgOf('Wireframe\n  Calendar week'));
  const month = pathCount(svgOf('Wireframe\n  Calendar month'));
  assert.ok(week < month, `a week strip draws fewer marks than a month (${week} vs ${month})`);
});

test('a Calendar carrying to= is wrapped in a link by the facade', () => {
  assert.match(svgOf('Wireframe\n  Calendar to=#next'), /<a class="wm-link" href="#next">/);
});

// --- determinism ---------------------------------------------------------------

test('rendering is deterministic (byte-identical across runs)', () => {
  const src = 'Wireframe\n  Calendar "2026-06" value=16 today=16 events weekStart=mon';
  assert.equal(render(src).svg, render(src).svg);
});
