// @ts-check
/**
 * Shared layout/text metrics -- a leaf module (imports nothing from core but the
 * generated, data-only fonts/comic-neue.js) so the engine (layout), the
 * renderer, and every element strategy can depend on it with no risk of an
 * import cycle.
 *
 * Numbers here fill gaps the SPEC leaves to the renderer: preset pixel sizes,
 * per-variant font sizes, spacing, and a crude single-line text measurer (good
 * enough for sketch fidelity; no real font shaping) plus its truncation inverse.
 */

import { COMIC_NEUE_ADVANCE } from './fonts/comic-neue.js';

/** MUI spacing unit; `gap=N` resolves to N * SPACING px. */
export const SPACING = 8;
/** Inner padding between a frame edge and its content. */
export const FRAME_PAD = 16;
/** Thickness (px) of the scrollbar gutter reserved on an element's scrolled edge by
 *  the universal `scrollbar` prop -- the strip sits IN this gutter so it never paints
 *  over content (layout reserves it; the render facade draws into it). */
export const SCROLLBAR_THICKNESS = 12;

/** Preset -> pixel size (SPEC ss.5.1 names presets but leaves dimensions open). */
export const PRESET_SIZES = {
  mobile: { w: 375, h: 812 },
  landscape: { w: 1280, h: 800 },
  portrait: { w: 834, h: 1112 },
};
/** Size for a preset-less, dimension-less `Wireframe`. */
export const DEFAULT_FRAME = { w: 800, h: 600 };

/**
 * Multi-frame flow-chart layout (SPEC ss.7.4). When a file declares several
 * frames, they are positioned as a Mermaid-style flow chart over the `to=#id`
 * navigation graph rather than stacked. These are the inter-frame gaps:
 *  - FLOW_GAP: the MINIMUM width of the routing channel between consecutive
 *    ranks (along the flow axis). The channel widens past this minimum to fit
 *    the connector tracks and edge labels routed through it (see routing.js);
 *    a channel carrying only straight, label-less runs stays exactly this wide.
 *  - SIBLING_GAP: between frames sharing a rank (across the flow axis).
 *  - COMPONENT_GAP: between disconnected frame groups.
 */
export const FRAME_FLOW_GAP = 80;
export const FRAME_SIBLING_GAP = 48;
export const FRAME_COMPONENT_GAP = 96;

/**
 * Channel/track routing inside an inter-rank channel (routing.js). Each bending
 * connector run across a channel sits on its own parallel TRACK; the channel
 * sizes to hold them plus padding, then widens further for any edge labels.
 *  - CHANNEL_TRACK_GAP: spacing between adjacent tracks (and so the across-run
 *    separation of a bidirectional pair's two shafts).
 *  - CHANNEL_PAD: clearance kept between the outermost track and each rank band.
 */
export const CHANNEL_TRACK_GAP = 28;
export const CHANNEL_PAD = 20;

/**
 * Lanes carry skip-rank edges OUTSIDE a component's cross extent, so a connector
 * spanning >1 rank never crosses an intervening frame. Nested skip edges stack
 * on parallel lanes.
 *  - FLOW_LANE_MARGIN: gap between the component's cross edge and the first lane.
 *  - FLOW_LANE_GAP: spacing between successive nested lanes.
 */
export const FLOW_LANE_MARGIN = 48;
export const FLOW_LANE_GAP = 32;

/**
 * Edge-label boxes routed inside a widened channel (routing.js).
 *  - CONNECTOR_LABEL_PAD: paper-knockout padding around the caption text.
 *  - CONNECTOR_LABEL_CLEAR: extra clearance a label claims past its own box when
 *    sizing the channel, so it never abuts a rank band.
 *  - CONNECTOR_LABEL_STAGGER: main-axis offset applied to de-overlap labels that
 *    collide along the cross axis within one channel.
 */
export const CONNECTOR_LABEL_PAD = 3;
export const CONNECTOR_LABEL_CLEAR = 6;
export const CONNECTOR_LABEL_STAGGER = 8;

/** Connector arrowhead: wing length (px) and half-spread (radians). */
export const ARROW_HEAD = 10;
export const ARROW_SPREAD = 0.45;

/**
 * Tangential gap (px) clustering the connectors of ONE frame pair around their
 * shared anchor slot, so a bidirectional `#a ⇄ #b` (or two same-direction edges)
 * reads as two close parallel lines that still touch the face (ss.7.4). This is
 * intra-pair ANCHOR clustering only -- the old elbow-bend role is retired now
 * that channel/track routing (routing.js) lanes every run onto its own track.
 */
export const CONNECTOR_SPREAD = 40;

/** Stroke width for flow connectors -- thicker than sketch strokes so they read as a separate diagram layer. */
export const CONNECTOR_WIDTH = 2.5;

/** Per-variant font size in px (MUI-ish); the default variant is `body`. */
export const VARIANT_FONT = {
  h1: 48, h2: 40, h3: 32, h4: 24, h5: 20, h6: 18,
  subtitle1: 16, subtitle2: 14, body1: 16, body2: 14, body: 16,
  caption: 12, overline: 12, button: 14,
};
export const DEFAULT_VARIANT = 'body';
/** Line height (multiple of font size) of the built-in sketch font. */
export const DEFAULT_LEADING = 1.4;
const CHAR_W = 0.58; // average glyph advance as a fraction of font size

/**
 * Per-render text metrics for the font in use (tasks/FONT.md): the line height,
 * and a horizontal scale applied to every width estimate (`measureText`, the
 * per-glyph table) -- 1 for the built-in font. `LINE_HEIGHT` is an exported
 * `let`, so every importer reads the live value through its ES-module binding.
 * Set by index.js's render() around layout + render and ALWAYS restored to the
 * defaults (`setFontMetrics()`), the same swap discipline as the theme palette.
 */
export let LINE_HEIGHT = DEFAULT_LEADING;
let widthScale = 1;

/**
 * @param {{ width?: number, leading?: number }} [m]  omit to restore the defaults
 */
export function setFontMetrics(m = {}) {
  widthScale = m.width ?? 1;
  LINE_HEIGHT = m.leading ?? DEFAULT_LEADING;
}

/** @param {import('./resolve.js').ResolvedNode} node @returns {string} */
export function variantOf(node) {
  const v = node.props.variant;
  return typeof v === 'string' && v in VARIANT_FONT ? v : DEFAULT_VARIANT;
}

/** @param {import('./resolve.js').ResolvedNode} node @returns {number} */
export function fontSizeOf(node) {
  return VARIANT_FONT[variantOf(node)];
}

/**
 * Crude single-line text box for `str` at `fontSize` (no font shaping).
 * @param {string} str @param {number} fontSize @returns {{ w: number, h: number }}
 */
export function measureText(str, fontSize) {
  return { w: Math.ceil(str.length * fontSize * CHAR_W * widthScale), h: Math.ceil(fontSize * LINE_HEIGHT) };
}

/** The truncation marker -- a single ellipsis glyph. */
export const ELLIPSIS = '…';

/**
 * Scale the embedded sketch face (Comic Neue) is drawn at, via the @font-face
 * `size-adjust` draw.js emits. Comic Neue is ~a uniformly 10%-smaller Comic
 * Sans (fixture-label corpus: width 0.911, x-height 0.915), so at 110% it lands
 * on Comic Sans geometry and layouts sized for Comic Sans carry over
 * (tasks/FONT.md). `size-adjust` is scoped to the embedded face only, so a
 * fallback to an installed Comic Neue / Comic Sans is never scaled.
 */
export const FONT_SIZE_ADJUST = 1.1;
/** Comic Sans bold runs ~6% wider per glyph on average. */
const BOLD_FACTOR = 1.06;

/**
 * Per-glyph advance ratios (advance / fontSize) for ASCII 32..126, measured
 * from Comic Sans MS (canvas advances at 64px, stored as thousandths) -- the
 * fallback face for viewers that ignore the embedded font.
 */
const COMIC_SANS_W = ('299,238,424,843,693,820,654,388,366,366,530,480,277,417,249,512,610,450,610,610,'
  + '610,610,610,610,610,610,299,299,381,510,381,524,931,731,630,603,722,625,607,680,768,546,665,'
  + '611,551,883,797,798,521,876,628,693,680,737,650,1040,724,635,693,376,550,376,581,627,556,512,'
  + '593,514,587,548,508,531,578,280,403,540,274,777,523,526,535,520,480,487,471,520,486,684,590,'
  + '521,538,366,421,366,598').split(',').map((n) => Number(n) / 1000);
/** Comic Sans's own ELLIPSIS advance ratio (same at 400 and 700 weight). */
const COMIC_SANS_ELLIPSIS_W = 0.675;

/**
 * Comic Neue advance ratio as drawn (size-adjusted), normalized to the regular
 * scale the truncation math uses: bold runs are multiplied by BOLD_FACTOR at
 * use, so the 700 face is divided by it here.
 * @param {number} thousandths @param {400|700} weight @returns {number}
 */
function neueRatio(thousandths, weight) {
  return (thousandths / 1000) * FONT_SIZE_ADJUST / (weight === 700 ? BOLD_FACTOR : 1);
}

/**
 * The truncation table: per glyph, the WIDER of Comic Sans and the embedded
 * Comic Neue (regular and bold) -- the two faces viewers realistically get.
 * Matching on average isn't enough: Comic Neue's space, `n`, `m` run 15-25%
 * wider than Comic Sans's, so an average-only table lets a quarter of labels
 * spill past their box. Taking the max costs ~5% (text ellipsizes slightly
 * earlier) and keeps every cut safe in both faces. These drive WHERE
 * truncateText cuts; `measureText`'s flat CHAR_W average stays the layout-time
 * sizer, so intrinsic geometry is unchanged.
 */
const GLYPH_W = COMIC_SANS_W.map((cs, i) => Math.max(
  cs,
  neueRatio(COMIC_NEUE_ADVANCE[400].ascii[i], 400),
  neueRatio(COMIC_NEUE_ADVANCE[700].ascii[i], 700),
));
/** Advance ratio of the ELLIPSIS glyph itself -- same max-of-faces rule. */
const ELLIPSIS_W = Math.max(
  COMIC_SANS_ELLIPSIS_W,
  neueRatio(COMIC_NEUE_ADVANCE[400].ellipsis, 400),
  neueRatio(COMIC_NEUE_ADVANCE[700].ellipsis, 700),
);
/** Headroom for viewers that fall back to slightly wider faces in the stack. */
const SAFETY = 1.03;

/** @param {string} ch  one code point @returns {number} advance ratio */
function glyphRatio(ch) {
  const c = /** @type {number} */ (ch.codePointAt(0));
  if (c >= 32 && c <= 126) return GLYPH_W[c - 32];
  if (c === 0x2026) return ELLIPSIS_W;
  return c < 0x2e80 ? 0.62 : 1.1; // accented Latin etc. near-average; CJK & beyond full-width-ish
}

/**
 * Width (px) of `str` as actually rendered by the sketch font -- a per-glyph
 * estimate, unlike `measureText`'s flat average. Render-time concerns only
 * (truncation); layout keeps sizing by `measureText`.
 * @param {string} str @param {number} fontSize @param {string|number} [weight]
 * @returns {number}
 */
export function textRunWidth(str, fontSize, weight = 400) {
  let run = 0;
  for (const ch of str) run += glyphRatio(ch);
  return run * fontSize * widthScale * (Number(weight) >= 600 ? BOLD_FACTOR : 1);
}

/**
 * Greedy word-wrap of `str` into lines whose per-glyph `textRunWidth` fits
 * `maxW` px. Whitespace collapses to single spaces; a lone word wider than
 * `maxW` keeps its own line (the renderer's per-line `maxW` ellipsizes it).
 * Layout and render MUST wrap at the same width so measured height matches the
 * drawn line count -- this is the one shared implementation (Typography).
 * @param {string} str @param {number} fontSize @param {number} maxW
 * @param {string|number} [weight]
 * @returns {string[]}  at least one line
 */
export function wrapText(str, fontSize, maxW, weight = 400) {
  const words = str.split(/\s+/).filter(Boolean);
  if (words.length === 0 || !Number.isFinite(maxW) || maxW <= 0) return [str];
  /** @type {string[]} */
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && textRunWidth(candidate, fontSize, weight) > maxW) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  lines.push(line);
  return lines;
}

/**
 * Truncate `str` to fit within `maxW` px, replacing the cut tail with a single
 * ellipsis. Two-stage fit test: a string whose `measureText` width fits is
 * returned untouched (layout sized its box by that estimate, so sufficient
 * space NEVER alters output), and so is one whose per-glyph `textRunWidth`
 * fits (the flat average over-estimates prose by ~25%, which would cut far
 * short of the box edge). The cut itself is per-glyph too, so the kept prefix
 * runs to just shy of `maxW` as rendered.
 * Degenerates: bare ELLIPSIS when only it fits, '' when not even that.
 * @param {string} str @param {number} fontSize @param {number} [maxW]
 * @param {string|number} [weight]
 * @returns {string}
 */
export function truncateText(str, fontSize, maxW, weight = 400) {
  if (!Number.isFinite(maxW)) return str;
  const w = /** @type {number} */ (maxW);
  if (measureText(str, fontSize).w <= w) return str;
  const scale = fontSize * widthScale * (Number(weight) >= 600 ? BOLD_FACTOR : 1) * SAFETY;
  let run = 0;
  for (const ch of str) run += glyphRatio(ch);
  if (run * scale <= w) return str;
  const budget = w / scale - ELLIPSIS_W; // glyph-ratio room left beside the ellipsis
  let out = '';
  let used = 0;
  for (const ch of str) {
    const g = glyphRatio(ch);
    if (used + g > budget) break;
    used += g;
    out += ch;
  }
  if (out) return out + ELLIPSIS;
  return ELLIPSIS_W * scale <= w ? ELLIPSIS : '';
}

/**
 * Intrinsic size of a single-line text leaf (label/filler) plus optional
 * padding -- the shared `intrinsic` body for Button / Chip / Link / ListItem so
 * they don't each re-derive it.
 *
 * Pass `fontSize` when the element draws its label at a size that ISN'T its
 * Typography variant (e.g. Button/Chip/Icon scale by their own `size` prop) so
 * the measured box matches the drawn text. Omit it to measure at the node's
 * variant size (`fontSizeOf`) -- the default for true text elements.
 * @param {import('./resolve.js').ResolvedNode} node
 * @param {{ padX?: number, padY?: number, fallback?: string, fontSize?: number }} [opts]
 * @returns {{ w: number, h: number }}
 */
export function textIntrinsic(node, opts = {}) {
  const { padX = 0, padY = 0, fallback = 'Text', fontSize } = opts;
  const fs = typeof fontSize === 'number' ? fontSize : fontSizeOf(node);
  const { w, h } = measureText(textOf(node, fallback), fs);
  return { w: w + 2 * padX, h: h + 2 * padY };
}

/**
 * Parse an aspect-ratio token (`16:9`, `4/3`, `16x9`) to width/height; undefined
 * if unparseable. Used by Img / CardMedia `ratio=` sizing (SPEC ss.5.4, ss.8.3).
 * @param {string} str @returns {number|undefined}
 */
export function parseRatio(str) {
  if (typeof str !== 'string') return undefined;
  const m = /^(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)$/.exec(str.trim());
  if (!m) return undefined;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return b ? a / b : undefined;
}

/**
 * Turn a resolved `filler` amount (SPEC ss.6) into a rough line count.
 * @param {import('./resolve.js').ResolvedNode} node @returns {number}
 */
export function fillerLines(node) {
  const f = node.filler;
  if (!f) return 1;
  if (f.unit === 'lines' || f.unit === 'units') return typeof f.amount === 'number' ? f.amount : 1;
  if (f.unit === 'bucket') return f.amount === 'short' ? 1 : f.amount === 'medium' ? 2 : 3;
  if (f.unit === 'words') return 1; // words render on a single line
  return 1;
}

/**
 * The string a text component draws: its explicit label, or generated filler.
 * @param {import('./resolve.js').ResolvedNode} node
 * @param {string} [fallback]   default placeholder when no label/filler
 * @returns {string}
 */
export function textOf(node, fallback = 'Text') {
  if (typeof node.props.label === 'string') return node.props.label;
  if (node.filler) {
    const f = node.filler;
    if (f.unit === 'words') {
      const n = typeof f.amount === 'number' ? f.amount : 3;
      return Array.from({ length: n }, (_, i) => LOREM[i % LOREM.length]).join(' ');
    }
    return LOREM.slice(0, 6).join(' '); // a representative line of filler
  }
  return fallback;
}

/** The lorem word bank: cycled by word fillers and `filler=lorem` rows (SPEC ss.6). */
export const LOREM = ['Lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua'];
