// @ts-check
/**
 * Shared layout/text metrics -- a leaf module (imports nothing from core) so the
 * engine (layout), the renderer, and every element strategy can depend on it
 * with no risk of an import cycle.
 *
 * Numbers here fill gaps the SPEC leaves to the renderer: preset pixel sizes,
 * per-variant font sizes, spacing, and a crude single-line text measurer (good
 * enough for sketch fidelity; no real font shaping).
 */

/** MUI spacing unit; `gap=N` resolves to N * SPACING px. */
export const SPACING = 8;
/** Inner padding between a frame edge and its content. */
export const FRAME_PAD = 16;

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
 *  - FLOW_GAP: between consecutive ranks (along the flow axis).
 *  - SIBLING_GAP: between frames sharing a rank (across the flow axis).
 *  - COMPONENT_GAP: between disconnected frame groups.
 */
export const FRAME_FLOW_GAP = 80;
export const FRAME_SIBLING_GAP = 48;
export const FRAME_COMPONENT_GAP = 96;

/** Connector arrowhead: wing length (px) and half-spread (radians). */
export const ARROW_HEAD = 10;
export const ARROW_SPREAD = 0.45;

/**
 * Perpendicular gap (px) between parallel connectors that share a frame pair, so
 * a bidirectional `#a ⇄ #b` (or two same-direction edges) fan out instead of
 * overlapping (ss.7.4).
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
export const LINE_HEIGHT = 1.4;
const CHAR_W = 0.58; // average glyph advance as a fraction of font size

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
  return { w: Math.ceil(str.length * fontSize * CHAR_W), h: Math.ceil(fontSize * LINE_HEIGHT) };
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

const LOREM = ['Lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit'];
