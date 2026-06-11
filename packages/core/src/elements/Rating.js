// @ts-check
import { rline, drawIcon, COLORS } from '../draw.js';

/**
 * Rating -- a row of star glyphs, `value` of them filled and the rest hollow
 * (SPEC ss.5.4). A read-only sketch stand-in for MUI's Rating: `value=k` filled
 * stars out of `max=N` total, so the control's footprint grows with `max`.
 *
 * Strategy (input leaf, `block: false`): N fixed-size star glyphs laid in a row
 * with a small gutter, so the intrinsic width tracks `max`. Stars are hand-drawn
 * through `draw.js` only -- each is a 10-vertex polygon (5 outer + 5 inner
 * points) stroked segment-by-segment with `rline`; a FILLED star adds an inner
 * "ink" star (a smaller solid polygon outline) so filled vs hollow is assertable
 * in the SVG without a separate fill primitive. `value` is clamped to [0, max]
 * and rounded, since fractional stars don't read at wireframe fidelity.
 *
 * Glyph count is `max` rounded, clamped to [1, MAX_GLYPHS]. The spec slice lists
 * `max` default 100, but 100 stars don't read at sketch fidelity, so an omitted
 * `max` falls back to DEFAULT_MAX=5 (MUI's actual Rating default) -- the resolver
 * injects no defaults, so this strategy fallback is what applies. The clamp keeps
 * a deliberately large `max=` from blowing up layout regardless.
 *
 * `value` is a keyless number (CONVENTION s.4; aliases n/v/val): a bare numeric
 * token routes to it via the `{ kind: 'number', to: 'value' }` slot, so `Rating 4`
 * fills four stars and `Rating value=4` / `n=4` / `v=4` / `val=4` are equivalent.
 * Fractional values round (`Rating 3.6` -> 4 filled), since half-stars don't read
 * at wireframe fidelity.
 *
 * `icon` / `emptyIcon` are icon-typed (`type: 'icon'`, defaults `Star` /
 * `StarBorder`): the resolver looks each name up and annotates `node.icons`,
 * warning on unknown names at resolve time (tasks/ICONS.md ss.3 -- superseding
 * the elements2-era "every name renders the same placeholder" ruling). An
 * EXPLICITLY set name swaps the row over to that resolved artwork (filled
 * cells in ink, empty cells muted -- `icon=Favorite` reads as a heart rating,
 * MUI-style). With NEITHER prop set the row keeps its hand-drawn stars: the
 * sketchy star is the wireframe-fidelity default, so the annotated default
 * artwork (Star/StarBorder) is deliberately not drawn.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Star glyph extent (px) and the gutter between adjacent stars. */
const STAR = 18;
const GUTTER = 3;

/** Upper bound on glyphs actually drawn, so a large `max` can't blow up layout. */
const MAX_GLYPHS = 12;

/**
 * Glyph count when `max` is absent. The spec slice lists 100, but 100 stars don't
 * read at sketch fidelity; 5 is MUI's actual Rating default and the sensible draw.
 */
const DEFAULT_MAX = 5;

/** Coerce a prop to a finite non-negative integer, or `fallback` if absent/bad. */
const intProp = (raw, fallback) => {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** Number of star glyphs to draw: `max` rounded, clamped to [1, MAX_GLYPHS]. */
const glyphsOf = (node) => Math.min(MAX_GLYPHS, Math.max(1, intProp(node.props.max, DEFAULT_MAX)));

/** How many of those glyphs are filled: `value` rounded, clamped to [0, glyphs]. */
const filledOf = (node) => Math.min(glyphsOf(node), Math.max(0, intProp(node.props.value, 0)));

/**
 * The 10 vertices of a 5-pointed star inscribed in a `size` box at (x, y),
 * alternating an outer and an inner radius. Returns points as [x, y] pairs.
 * @param {number} x @param {number} y @param {number} size
 * @returns {[number, number][]}
 */
function starPoints(x, y, size) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const outer = size / 2;
  const inner = outer * 0.42;
  /** @type {[number, number][]} */
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    // Start at the top point (-90deg) and step every 36deg.
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
  }
  return pts;
}

/** Stroke a closed star polygon through `pts` with the given line opts. */
function starOutline(pts, opts) {
  let out = '';
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    out += rline(x1, y1, x2, y2, opts);
  }
  return out;
}

/**
 * One star glyph at (x, y). A hollow star is the muted outline; a filled star
 * adds a second, smaller star drawn in ink so it reads as "filled in" by hand
 * (a denser scribble) -- and so a test can count ink stars to discriminate
 * filled from empty.
 * @param {number} x @param {number} y @param {boolean} filled
 * @returns {string}
 */
function star(x, y, filled) {
  const outline = starOutline(starPoints(x, y, STAR), { stroke: COLORS.muted, strokeWidth: 1 });
  if (!filled) return outline;
  const innerSize = STAR * 0.62;
  const off = (STAR - innerSize) / 2;
  const ink = starOutline(starPoints(x + off, y + off, innerSize), { stroke: COLORS.ink, strokeWidth: 1.4 });
  return outline + ink;
}

export default {
  name: 'Rating',
  tier: 'v1.0',
  category: 'inputs',
  props: {
    value: { type: 'number', default: 0, aliases: ['n', 'v', 'val'] },
    // Spec slice lists max default 100; we deviate to DEFAULT_MAX=5 so the schema
    // matches the runtime fallback (100 stars don't read at sketch fidelity).
    max: { type: 'number', default: DEFAULT_MAX },
    icon: { type: 'icon', default: 'Star' },
    emptyIcon: { type: 'icon', default: 'StarBorder' },
  },
  keyless: [{ kind: 'number', to: 'value' }],
  notes: 'Row of glyphs; keyless value (n/v/val) fills value-of-max. max default is 5 (MUI\'s Rating default), an architect-sanctioned deviation from the spec slice\'s 100, which is unreadable at sketch fidelity; large max values are visually clamped to MAX_GLYPHS=12. Default glyphs are hand-drawn stars; an EXPLICIT icon=/emptyIcon= swaps in the resolved artwork (ink filled, muted empty) per tasks/ICONS.md.',

  block: false,
  intrinsic: (node) => {
    const n = glyphsOf(node);
    return { w: n * STAR + (n - 1) * GUTTER, h: STAR };
  },
  render: (node, box) => {
    const n = glyphsOf(node);
    const filled = filledOf(node);
    // EXPLICIT icon=/emptyIcon= engages icon-mode: filled cells draw the `icon`
    // artwork in ink, empty cells the `emptyIcon` artwork (else the same icon)
    // muted -- so `Rating 2 icon=Favorite` reads as a heart rating, MUI-style.
    // An UNSET pair keeps today's hand-drawn stars: the PropDef defaults
    // (Star/StarBorder) are annotated by the resolver but deliberately not
    // drawn, because the sketchy star IS the wireframe-fidelity default.
    const explicitIcon = typeof node.props.icon === 'string';
    const explicitEmpty = typeof node.props.emptyIcon === 'string';
    const iconMode = explicitIcon || explicitEmpty;
    let out = '';
    for (let i = 0; i < n; i++) {
      const x = box.x + i * (STAR + GUTTER);
      if (!iconMode) {
        out += star(x, box.y, i < filled);
      } else if (i < filled) {
        out += drawIcon(node, 'icon', x, box.y, STAR);
      } else {
        out += drawIcon(node, explicitEmpty ? 'emptyIcon' : 'icon', x, box.y, STAR, { ink: COLORS.muted });
      }
    }
    return out;
  },
};
