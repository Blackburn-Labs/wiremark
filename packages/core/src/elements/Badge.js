// @ts-check
import { surface, centeredLabel, rellipse, COLORS } from '../draw.js';
import { measureText } from '../metrics.js';

/**
 * Badge -- a small notification indicator token. Keyless text is its content
 * (`badgeContent`); the `variant` enum picks the shape. (SPEC ss.5.4)
 *
 * DESIGN CHOICE (children=false). In MUI a Badge *wraps* content and floats a
 * dot/count in the corner. The spec slice marks Badge `children: false`, and
 * this engine has no anchor-to-sibling overlay primitive -- so an honest,
 * standalone rendering is the indicator ITSELF, drawn inline like any other
 * leaf token. An author who wants "icon + corner badge" composes the badge next
 * to the icon in their own layout; we draw only the badge chrome.
 *
 * CONTENT PROP. The spec names the content prop `badgeContent` (not the engine's
 * usual `label`), so the shared `textOf`/`textIntrinsic` helpers -- which key off
 * `props.label` -- don't apply. We resolve and measure the display string here
 * via the content-agnostic `measureText`, falling back to "3" so a bare `Badge`
 * still reads as a count token. `badgeContent` is a quoted string LITERAL, not
 * free text: Badge is NOT `text: true`, so a filler token (`~5`, `___`) hard-
 * errors instead of silently resolving into an indicator that ignores it.
 *
 * Strategy (inline leaf): not `block`, so it sizes to its content rather than
 * stretching the container's cross axis. Two variants:
 *  - standard (default): a small rounded pill carrying the count/label.
 *  - dot: a tiny solid circle with NO text (MUI's dot variant ignores content).
 *
 * One keyless literal (`badgeContent`) and one keyless enum (`variant`); their
 * kinds are disjoint, so `Badge "9" dot` and `Badge dot "9"` both parse.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Pill padding for the standard count token (px). */
const PAD_X = 7;
const PAD_Y = 3;
/** Badge label font (px) -- smaller than body, like a real MUI badge. */
const FONT_SIZE = 11;
/** Diameter of the `dot` variant's circle (px). */
const DOT_SIZE = 10;
/** Shown when no badgeContent is given. */
const FALLBACK = '3';

/** @param {import('./common.js').ResolvedNode} node */
const isDot = (node) => node.props.variant === 'dot';

/** The string a standard Badge draws: its content, else the fallback count. */
const contentOf = (node) =>
  typeof node.props.badgeContent === 'string' ? node.props.badgeContent : FALLBACK;

export default {
  name: 'Badge',
  tier: 'v1.0',
  category: 'content',
  props: {
    badgeContent: { type: 'string' },
    variant: { type: 'enum', values: ['standard', 'dot'], default: 'standard' },
  },
  keyless: [
    { kind: 'literal', to: 'badgeContent' },
    { kind: 'enum', to: 'variant' },
  ],
  notes: 'Standalone indicator token (children=false): standard pill carries badgeContent; dot is a contentless circle. Not text-bearing: badgeContent is a literal, so filler hard-errors. Fallback content "3" when no badgeContent.',

  block: false,
  intrinsic: (node) => {
    if (isDot(node)) return { w: DOT_SIZE, h: DOT_SIZE };
    // Measure at the size we actually DRAW at so the pill tracks the content.
    const { w, h } = measureText(contentOf(node), FONT_SIZE);
    return { w: w + 2 * PAD_X, h: h + 2 * PAD_Y };
  },
  render: (node, box) => {
    if (isDot(node)) {
      // A filled circle centered in the (DOT_SIZE square) box; no text.
      return rellipse(box.x + box.w / 2, box.y + box.h / 2, box.w, box.h,
        { fill: COLORS.ink, fillStyle: 'solid' });
    }
    // standard: a rounded pill with the count/label centered.
    return surface(box) + centeredLabel(box, contentOf(node), { fontSize: FONT_SIZE });
  },
};
