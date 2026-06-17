// @ts-check
import { rrect, rline, rellipse, centeredLabel, text, COLORS } from '../draw.js';

/**
 * Calendar -- a hand-drawn month/scheduling calendar (SPEC: Inputs). A drop-in
 * `Calendar` renders a clean month with good defaults; a few keyless knobs tailor
 * it. Four variants share one set of cell/grid helpers:
 *  - month (default): header (title + prev/next chevrons), weekday row, a 6x7 grid
 *    of day cells. Leading/trailing cells show the adjacent month's days MUTED (it
 *    reads more like a real calendar than blanks).
 *  - compact: the same structure at smaller metrics (single-letter weekdays) -- the
 *    sidebar size. One density flag through the shared month renderer, NOT a
 *    separate code path.
 *  - week: header + weekday row + a single row of 7 day cells for the week
 *    containing `value` (default the week of the 1st); spans month boundaries with
 *    muted days.
 *  - year: header (the year) + a 3x4 grid of 12 mini-month thumbnails, each a tiny
 *    abbreviation + day-number micro-grid laid out from the correct first weekday.
 *
 * Strategy (self-rendering sizing leaf, the `Rating`/`Skeleton` precedent): the
 * single default-exported object is BOTH schema and layout/render strategy. It
 * draws through `draw.js` primitives only -- no children, no roughjs, no clock.
 * The month layout is pure arithmetic on the parsed month string (Sakamoto's
 * algorithm for the 1st's weekday), so output is fully deterministic and
 * byte-identical across runs.
 *
 * Sizing (`sizing: true`, `block: false`, like `Box`/`Skeleton`/`Img`): the
 * element accepts the whole box-sizing vocabulary (`w`/`h`/`%`/`*`/flex, ss.4) and
 * the `render` ALWAYS lays the grid out from the final `box.w`/`box.h`, so the same
 * element is a 220px sidebar widget or a full-bleed `w=100%` main-content calendar.
 * `intrinsic(node, avail)` is width-aware (the mechanism Typography uses): given a
 * width -- pinned, or the width the parent offers -- it derives a proportional
 * height that keeps day cells ~square, so `w=100%` in a narrow column looks right
 * with no height math. Pinning `h=` overrides; pinning neither yields the variant's
 * natural size.
 *
 * Keyless wiring (obeys the no-collision rule in smoke.test.js): one literal
 * (`month`, quoted strings only) and one enum (`variant`); sizing is its own
 * category, so `value` is KEYED only (a bare number is a sizing token here, exactly
 * as on `Box`/`Skeleton`). Defaults are applied in the strategy, never injected by
 * the resolver -- the same convention `Rating.js` relies on.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** The four variants, in declaration order; an unknown/absent value -> `month`. */
const VARIANTS = ['month', 'compact', 'week', 'year'];

/**
 * Base square cell size (px) per density -- the natural footprint is derived from
 * it (7 columns wide; height = the vertical unit count x cell), so cells stay
 * ~square at the natural size and the width-aware `intrinsic` keeps that ratio.
 */
const CELL = { month: 46, compact: 32 };

/** Natural footprint (px) of the year overview (fixed; not a cell grid). */
const NATURAL_YEAR = { w: 432, h: 584 };

/**
 * Vertical layout units for the month-like variants: the header and weekday rows
 * are sized relative to one grid row (a grid row = 1 unit). Total units =
 * header? + weekday? + rowCount, so a calendar with the header/weekday rows turned
 * off simply reclaims their share for the grid.
 */
const HEADER_U = 1.0;
const WEEKDAY_U = 0.7;

/** Readable lower bound (px) for any scaled font, so a tiny calendar stays legible. */
const MIN_FONT = 8;

/** The bare-`Calendar` month (a correct June 2026: 30 days, starts Monday). */
const DEFAULT_MONTH = 'June 2026';
/** Year used when a parseable month omits its year, and for the `year` fallback. */
const DEFAULT_YEAR = 2026;
/** Canonical fallback grid (an unparseable title like "Sprint A"): a fixed shape. */
const CANONICAL_DAYS = 30;
const CANONICAL_FIRST = 3; // a fixed first-weekday (Wed) for the generic grid

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_ABBR = MONTH_NAMES.map((n) => n.slice(0, 3));

/** Single- and two-letter weekday heads, Sunday-first; rotated for `weekStart=mon`. */
const WEEKDAY_1 = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_2 = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Clamp `n` to [lo, hi]. */
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** The resolved variant (defaults to `month`; the resolver injects no default). */
const variantOf = (node) =>
  typeof node.props.variant === 'string' && VARIANTS.includes(node.props.variant)
    ? node.props.variant
    : 'month';

/** The month string to lay out (defaults to `June 2026`; the resolver injects no default). */
const monthOf = (node) => (typeof node.props.month === 'string' ? node.props.month : DEFAULT_MONTH);

/** A prop coerced to a rounded integer day, or undefined when absent/non-finite. */
const dayProp = (raw) => {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Week rows a month-like grid actually needs (4-6) -- only as many as hold the
 * month's own days, so a month that fits in five weeks never renders a trailing
 * all-next-month sixth row.
 * @param {ReturnType<typeof parseMonth>} parsed @param {number} weekStartOffset
 * @returns {number}
 */
function monthRowsOf(parsed, weekStartOffset) {
  const lead = (parsed.firstWeekday - weekStartOffset + 7) % 7;
  return Math.max(4, Math.min(6, Math.ceil((lead + parsed.days) / 7)));
}

/** Total vertical units (in cell-heights): header? + weekday? + grid rows. */
const vUnits = (showHeader, showWeekdays, rows) =>
  (showHeader ? HEADER_U : 0) + (showWeekdays ? WEEKDAY_U : 0) + rows;

/**
 * The natural footprint (px) for a node: the year overview is fixed; a month-like
 * variant is 7 cells wide and (header + weekday + its real week count) cells tall,
 * so the footprint -- and the `intrinsic` aspect ratio -- track the actual content
 * (week count, header/weekday toggles) and day cells stay ~square at natural size.
 * @param {import('./common.js').ResolvedNode} node @returns {{ w: number, h: number }}
 */
function naturalSize(node) {
  const variant = variantOf(node);
  if (variant === 'year') return { ...NATURAL_YEAR };
  const parsed = parseMonth(monthOf(node));
  const rows = variant === 'week' ? 1 : monthRowsOf(parsed, node.props.weekStart === 'mon' ? 1 : 0);
  const cell = variant === 'compact' ? CELL.compact : CELL.month;
  return { w: 7 * cell, h: vUnits(node.props.header !== false, node.props.weekdays !== false, rows) * cell };
}

// --- month arithmetic (pure, deterministic; exported for direct testing) --------

/**
 * Days in month `mi` (0=Jan) of year `y`, with a proper leap-year February
 * (`y%4===0 && (y%100!==0 || y%400===0)`).
 * @param {number} y @param {number} mi @returns {number}
 */
export function daysInMonth(y, mi) {
  if (mi === 1) return (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28;
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mi];
}

/**
 * Sakamoto's algorithm: the weekday of `y`-`mi`(0=Jan)-`d`, as 0=Sunday..6=Saturday.
 * Compact and dependency-free, so the 1st's column is exact for any real date.
 * @param {number} y @param {number} mi @param {number} d @returns {number}
 */
export function dayOfWeek(y, mi, d) {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yy = mi < 2 ? y - 1 : y; // Jan/Feb borrow from the prior year
  return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[mi] + d) % 7;
}

/** @param {number} y @param {number} mi */
const monthInfo = (y, mi) => ({
  label: `${MONTH_NAMES[mi]} ${y}`,
  year: y,
  monthIndex: mi,
  days: daysInMonth(y, mi),
  firstWeekday: dayOfWeek(y, mi, 1),
  namedMonth: true,
});

/**
 * Smart-parse a month string into a layout descriptor. Accepts `"MonthName YYYY"`
 * (full or 3-letter name, year optional), `"YYYY-MM"`, and a bare `"YYYY"` (for the
 * year variant). An unparseable string (e.g. `"Sprint A"`) becomes the title over a
 * canonical grid (`canonical: true`), so the calendar still draws cleanly.
 * @param {string} str
 * @returns {{ label: string, year: number, monthIndex: number, days: number,
 *   firstWeekday: number, namedMonth: boolean, canonical?: boolean }}
 */
export function parseMonth(str) {
  const raw = String(str ?? '').trim();
  let m;
  // YYYY-MM
  if ((m = /^(\d{4})-(\d{1,2})$/.exec(raw))) {
    return monthInfo(Number(m[1]), clamp(Number(m[2]) - 1, 0, 11));
  }
  // MonthName [YYYY]  -- match on the 3-letter prefix so Jun/June/Sept all resolve
  if ((m = /^([A-Za-z]{3,})\.?(?:\s+(\d{4}))?$/.exec(raw))) {
    const mi = MONTH_ABBR.findIndex((a) => a.toLowerCase() === m[1].slice(0, 3).toLowerCase());
    if (mi >= 0) return monthInfo(m[2] ? Number(m[2]) : DEFAULT_YEAR, mi);
  }
  // bare YYYY -- the year variant's input; month variants fall back to January.
  if ((m = /^(\d{4})$/.exec(raw))) {
    return { ...monthInfo(Number(m[1]), 0), label: String(Number(m[1])), namedMonth: false };
  }
  // canonical fallback: keep the raw string as the title over a fixed generic grid.
  return {
    label: raw || 'Calendar',
    year: DEFAULT_YEAR,
    monthIndex: 0,
    days: CANONICAL_DAYS,
    firstWeekday: CANONICAL_FIRST,
    namedMonth: false,
    canonical: true,
  };
}

/**
 * Build a `rows`x7 month grid: leading cells are the previous month's trailing
 * days, then the in-month days, then just enough next-month days to fill the last
 * row -- adjacent-month cells flagged `inMonth: false` so they draw muted. `rows`
 * is `monthRowsOf`, so there is never a trailing all-next-month row.
 * @param {ReturnType<typeof parseMonth>} parsed @param {number} weekStartOffset 0=Sun, 1=Mon
 * @param {number} rows @returns {{ day: number, inMonth: boolean }[]}
 */
function buildGrid(parsed, weekStartOffset, rows) {
  const lead = (parsed.firstWeekday - weekStartOffset + 7) % 7;
  const prevMi = (parsed.monthIndex + 11) % 12;
  const prevYear = parsed.monthIndex === 0 ? parsed.year - 1 : parsed.year;
  const prevDays = parsed.canonical ? 31 : daysInMonth(prevYear, prevMi);
  /** @type {{ day: number, inMonth: boolean }[]} */
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push({ day: prevDays - lead + 1 + i, inMonth: false });
  for (let d = 1; d <= parsed.days; d++) cells.push({ day: d, inMonth: true });
  let next = 1;
  while (cells.length < rows * 7) cells.push({ day: next++, inMonth: false });
  return cells;
}

/** Weekday heads for the row, rotated to the configured first column. */
const weekdayLabels = (weekStartOffset, dense) => {
  const base = dense ? WEEKDAY_1 : WEEKDAY_2;
  return base.slice(weekStartOffset).concat(base.slice(0, weekStartOffset));
};

/** A deterministic event predicate: ~2 of every 5 in-month days carry an indicator. */
const hasEvent = (day) => (day * 7 + 3) % 5 < 2;

// --- drawing helpers (draw.js primitives only) ----------------------------------

/**
 * A hand-drawn chevron at (cx, cy) of half-extent `s`, pointing `left` or `right`.
 * Two `rline` segments -- no icon machinery (kept internal, not user-swappable in v1).
 * @param {number} cx @param {number} cy @param {number} s @param {'left'|'right'} dir
 */
function drawChevron(cx, cy, s, dir) {
  const sign = dir === 'left' ? 1 : -1; // arms open away from the point
  const tipX = cx - sign * s;
  const armX = cx + sign * s;
  const o = { stroke: COLORS.muted, strokeWidth: 1.4 };
  return rline(tipX, cy, armX, cy - s, o) + rline(tipX, cy, armX, cy + s, o);
}

/** The title + prev/next chevron row, drawn across header box `b`. */
function drawHeader(b, label) {
  const tf = clamp(b.h * 0.42, MIN_FONT + 1, 22);
  let out = centeredLabel(b, label, { fontSize: tf, weight: 700, maxW: b.w * 0.7 });
  const s = clamp(b.h * 0.26, 4, 11);
  const cy = b.y + b.h / 2;
  out += drawChevron(b.x + b.h * 0.55, cy, s, 'left');
  out += drawChevron(b.x + b.w - b.h * 0.55, cy, s, 'right');
  return out;
}

/**
 * One day cell: the number (ink in-month, muted adjacent), with `value` drawn as a
 * filled accent highlight (number kept in ink, the MUI selected-day look), `today`
 * as an outlined ring, and `events` as 1-3 small dots under the number.
 * @param {{ day: number, inMonth: boolean }} cell
 * @param {number} x @param {number} y @param {number} w @param {number} h @param {number} fs
 * @param {{ value?: number, today?: number, events: boolean }} opts
 */
function drawDayCell(cell, x, y, w, h, fs, opts) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const sel = cell.inMonth && opts.value === cell.day;
  const tod = cell.inMonth && opts.today === cell.day;
  const d = Math.min(w, h) * 0.74;
  let out = '';
  if (sel) out += rellipse(cx, cy, d, d, { fill: COLORS.accent, fillStyle: 'solid', stroke: COLORS.ink, strokeWidth: 1.2 });
  // The `today` ring's stroke width (1.6) is intentionally distinct from every
  // other stroke the calendar draws (chevrons 1.4, grid 0.75-1, selected 1.2), so
  // its presence is unambiguous in the rendered SVG.
  else if (tod) out += rellipse(cx, cy, d, d, { stroke: COLORS.ink, strokeWidth: 1.6 });
  out += centeredLabel({ x, y, w, h }, String(cell.day), { fontSize: fs, fill: cell.inMonth ? COLORS.ink : COLORS.muted });
  if (opts.events && cell.inMonth && hasEvent(cell.day)) {
    const n = (cell.day % 3) + 1;
    const dr = clamp(Math.min(w, h) * 0.05, 1, 2.5);
    const gap = dr * 2.6;
    const dotY = y + h - dr - 2;
    for (let k = 0; k < n; k++) {
      out += rellipse(cx - ((n - 1) * gap) / 2 + k * gap, dotY, dr * 2, dr * 2, { fill: COLORS.ink, fillStyle: 'solid', stroke: 'none' });
    }
  }
  return out;
}

/**
 * The shared month/compact/week renderer: header, weekday row, then the day grid
 * -- as many week rows as the month needs (so no trailing all-next-month row), or a
 * single row for the week strip. One density flag drives compact's smaller heads.
 * @param {{x:number,y:number,w:number,h:number}} box
 * @param {ReturnType<typeof parseMonth>} parsed
 * @param {{ showHeader:boolean, showWeekdays:boolean, weekStartOffset:number,
 *   dense:boolean, isWeek:boolean, value?:number, today?:number, events:boolean }} cfg
 */
function drawMonthLike(box, parsed, cfg) {
  const monthRows = monthRowsOf(parsed, cfg.weekStartOffset);
  const rows = cfg.isWeek ? 1 : monthRows;
  const unit = box.h / vUnits(cfg.showHeader, cfg.showWeekdays, rows);
  const headerH = cfg.showHeader ? HEADER_U * unit : 0;
  const weekdayH = cfg.showWeekdays ? WEEKDAY_U * unit : 0;
  const gridH = box.h - headerH - weekdayH;
  const rowH = gridH / rows;
  const cellW = box.w / 7;
  let out = '';

  if (cfg.showHeader) out += drawHeader({ x: box.x, y: box.y, w: box.w, h: headerH }, parsed.label);

  if (cfg.showWeekdays) {
    const labels = weekdayLabels(cfg.weekStartOffset, cfg.dense);
    const wy = box.y + headerH;
    const wf = clamp(weekdayH * 0.55, MIN_FONT - 1, 15);
    for (let c = 0; c < 7; c++) {
      out += centeredLabel({ x: box.x + c * cellW, y: wy, w: cellW, h: weekdayH }, labels[c], { fontSize: wf, weight: 700, fill: COLORS.muted });
    }
  }

  const gy = box.y + headerH + weekdayH;
  // The week strip slices the (full-month) row that holds the target day; the
  // month/compact grid is built to exactly its own row count.
  const grid = buildGrid(parsed, cfg.weekStartOffset, cfg.isWeek ? monthRows : rows);
  let cells = grid;
  if (cfg.isWeek) {
    const target = (cfg.value != null && cfg.value >= 1 && cfg.value <= parsed.days) ? cfg.value : 1;
    let idx = grid.findIndex((c) => c.inMonth && c.day === target);
    if (idx < 0) idx = 0;
    const start = Math.floor(idx / 7) * 7;
    cells = grid.slice(start, start + 7);
  }

  // Light calendar grid: a muted bounding rect plus thin column/row rules.
  out += rrect(box.x, gy, box.w, gridH, { stroke: COLORS.muted, strokeWidth: 1 });
  for (let c = 1; c < 7; c++) out += rline(box.x + c * cellW, gy, box.x + c * cellW, gy + gridH, { stroke: COLORS.muted, strokeWidth: 0.75 });
  for (let r = 1; r < rows; r++) out += rline(box.x, gy + r * rowH, box.x + box.w, gy + r * rowH, { stroke: COLORS.muted, strokeWidth: 0.75 });

  const df = clamp(Math.min(rowH, cellW) * 0.4, MIN_FONT, 22);
  for (let i = 0; i < cells.length; i++) {
    const c = i % 7;
    const r = Math.floor(i / 7);
    out += drawDayCell(cells[i], box.x + c * cellW, gy + r * rowH, cellW, rowH, df, cfg);
  }
  return out;
}

/**
 * One mini-month thumbnail in the year overview: a bold abbreviation over a tiny
 * day-number micro-grid laid out from the month's true first weekday. `highlight`
 * tints the relevant month (when the title named one).
 * @param {{x:number,y:number,w:number,h:number}} b
 * @param {number} year @param {number} mi @param {boolean} highlight @param {number} weekStartOffset
 */
function drawMiniMonth(b, year, mi, highlight, weekStartOffset) {
  const pad = clamp(b.w * 0.06, 2, 8);
  let out = '';
  if (highlight) out += rrect(b.x + pad / 2, b.y + pad / 2, b.w - pad, b.h - pad, { fill: COLORS.accent, fillStyle: 'solid', stroke: COLORS.ink, strokeWidth: 1 });
  const af = clamp(b.h * 0.13, 7, 13);
  out += text(b.x + pad, b.y + pad + af, MONTH_ABBR[mi], { fontSize: af, weight: 700, fill: COLORS.ink });
  const gridTop = b.y + pad + af * 1.5;
  const mcw = (b.w - 2 * pad) / 7;
  const mrh = (b.h - (gridTop - b.y) - pad) / 6;
  const nf = clamp(mrh * 0.7, 5, 9);
  const days = daysInMonth(year, mi);
  const lead = (dayOfWeek(year, mi, 1) - weekStartOffset + 7) % 7;
  for (let d = 1; d <= days; d++) {
    const idx = lead + d - 1;
    const r = Math.floor(idx / 7);
    if (r > 5) break;
    const cx = b.x + pad + (idx % 7) * mcw + mcw / 2;
    const cy = gridTop + r * mrh + mrh / 2;
    out += text(cx, cy + nf * 0.35, String(d), { fontSize: nf, anchor: 'middle', fill: COLORS.ink });
  }
  return out;
}

/** The year overview: header (the year) + a 3x4 grid of 12 mini-months. */
function drawYear(box, parsed, cfg) {
  const headerH = cfg.showHeader ? clamp(box.h * 0.085, 18, 56) : 0;
  let out = cfg.showHeader ? drawHeader({ x: box.x, y: box.y, w: box.w, h: headerH }, parsed.label) : '';
  const gy = box.y + headerH;
  const miniW = box.w / 3;
  const miniH = (box.h - headerH) / 4;
  for (let mi = 0; mi < 12; mi++) {
    const mb = { x: box.x + (mi % 3) * miniW, y: gy + Math.floor(mi / 3) * miniH, w: miniW, h: miniH };
    out += drawMiniMonth(mb, parsed.year, mi, parsed.namedMonth && parsed.monthIndex === mi, cfg.weekStartOffset);
  }
  return out;
}

export default {
  name: 'Calendar',
  tier: 'v1.0',
  category: 'inputs',
  props: {
    month: { type: 'string', aliases: ['title'] },
    variant: { type: 'enum', values: VARIANTS, default: 'month' },
    value: { type: 'number', aliases: ['v', 'val', 'selected'] },
    today: { type: 'number' },
    weekStart: { type: 'enum', values: ['sun', 'mon'], default: 'sun' },
    weekdays: { type: 'boolean', default: true },
    header: { type: 'boolean', default: true, aliases: ['controls'] },
    events: { type: 'boolean', default: false },
  },
  keyless: [
    { kind: 'literal', to: 'month' },
    { kind: 'enum', to: 'variant' },
  ],
  notes: 'Self-rendering calendar. Keyless literal month ("June 2026"/"2026-06"; unparseable -> title over a canonical grid) + keyless enum variant (month/compact/week/year). value (keyed; aliases v/val/selected) is a filled highlight, today an outlined ring, events deterministic dots (off by default). weekStart=sun|mon, weekdays/header booleans. sizing:true: w/h/%/* scale the whole grid; width drives a proportional height (pin h= to override).',

  sizing: true,
  block: false,
  intrinsic: (node, avail) => {
    const nat = naturalSize(node);
    const ar = nat.w / nat.h; // width / height -- kept constant so cells stay ~square
    const wTok = node.size?.w;
    const hTok = node.size?.h;
    // A px-pinned width fixes the box exactly; height follows it (the engine pins
    // only `w` in measure(), so the proportional height must be set here). A px h
    // pin without a w pin scales the width from the height instead.
    if (wTok?.unit === 'px') return { w: wTok.value, h: hTok?.unit === 'px' ? hTok.value : wTok.value / ar };
    if (hTok?.unit === 'px') return { w: hTok.value * ar, h: hTok.value };
    // Width-aware: derive height from the width the parent offers. With a relative
    // width token (%/*) fill the offer; without one keep the natural width (clamped
    // to the offer) so a wide parent never inflates the measured height past the
    // footprint actually drawn -- keeping the measure and place passes in agreement.
    if (avail && Number.isFinite(avail.w)) {
      const w = wTok ? /** @type {number} */ (avail.w) : Math.min(nat.w, /** @type {number} */ (avail.w));
      return { w, h: w / ar };
    }
    if (avail && Number.isFinite(avail.h)) {
      const h = hTok ? /** @type {number} */ (avail.h) : Math.min(nat.h, /** @type {number} */ (avail.h));
      return { w: h * ar, h };
    }
    return { ...nat };
  },
  render: (node, box) => {
    const variant = variantOf(node);
    const parsed = parseMonth(monthOf(node));
    const cfg = {
      showHeader: node.props.header !== false,
      showWeekdays: node.props.weekdays !== false,
      weekStartOffset: node.props.weekStart === 'mon' ? 1 : 0,
      dense: variant === 'compact',
      isWeek: variant === 'week',
      value: dayProp(node.props.value),
      today: dayProp(node.props.today),
      events: node.props.events === true,
    };
    if (variant === 'year') return drawYear(box, parsed, cfg);
    return drawMonthLike(box, parsed, cfg);
  },
};
