// @ts-check
import { backgroundHatch, surface, centeredLabel, rline, COLORS } from '../draw.js';
import { measureText } from '../metrics.js';

/**
 * Snackbar -- a brief, dark feedback bar (MUI's transient toast). Keyless text is
 * its `message`; the keyless `position` enum says which screen corner it would
 * anchor to. (SPEC ss.5.4, Feedback)
 *
 * DESIGN CHOICE (no overlay). A real Snackbar floats over the app at a screen
 * corner and auto-dismisses. This engine has no overlay/portal layer -- boxes are
 * laid out in flow -- so an honest rendering draws the bar INLINE where it is
 * authored, as a dark-tinted hand-drawn pill. We never fake a floating layer or a
 * solid fill (a solid block would read as finished UI, not a wireframe).
 *
 * DARK TINT. The toast is conveyed with a DENSE ink crosshatch under the pill --
 * hand-drawn hashes, not a solid block -- so it reads as the one "dark" feedback
 * surface, distinct from a plain light Chip/pill. The message stays in ink at a
 * medium weight; the hashes are sparse enough that the label reads over them.
 *
 * POSITION, HONESTLY. With no overlay, `position` cannot actually move the bar,
 * but it is a real, discriminating prop: for any non-`inline` value we draw a
 * small hand-drawn corner bracket at the matching corner of the pill, pointing at
 * the screen corner the toast would occupy. So `topRight` and `bottomLeft` render
 * visibly differently, and the choice is never silently dropped.
 *
 * CONTENT PROP. The spec names the text prop `message` (alias `label`), not the
 * engine's usual `label`, so the shared `textOf`/`textIntrinsic` helpers -- which
 * key off `props.label` -- don't apply. We resolve and measure the display string
 * here via `measureText`, defaulting to "Message sent" so a bare `Snackbar` still
 * reads as a toast.
 *
 * Strategy (inline leaf): not `block`, so the bar sizes to its message rather
 * than stretching the container's cross axis. One keyless literal (`message`) and
 * one keyless enum (`position`); their kinds are disjoint, so `Snackbar "Saved"
 * topRight` and `Snackbar topRight "Saved"` both parse.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Pill padding (px) -- a touch roomier than a Chip so the bar reads as a toast. */
const PAD_X = 16;
const PAD_Y = 10;
/** Message font (px) -- body-ish. */
const FONT_SIZE = 14;
/** Shown when no message is given. */
const FALLBACK = 'Message sent';
/** Length (px) of each leg of the corner bracket that marks a non-inline position. */
const TICK = 7;

/** The string a Snackbar draws: its message, else the fallback toast text. */
const messageOf = (node) =>
  typeof node.props.message === 'string' ? node.props.message : FALLBACK;

/**
 * Which corner of the pill the position bracket hugs. `inline` (and any
 * unexpected value) -> no bracket. Returned as the [horizontal, vertical] edges.
 * @param {string} [position]
 * @returns {{ h: 'left'|'right', v: 'top'|'bottom' } | null}
 */
function cornerOf(position) {
  switch (position) {
    case 'topLeft': return { h: 'left', v: 'top' };
    case 'topRight': return { h: 'right', v: 'top' };
    case 'bottomLeft': return { h: 'left', v: 'bottom' };
    case 'bottomRight': return { h: 'right', v: 'bottom' };
    default: return null; // inline
  }
}

/**
 * A small hand-drawn corner bracket (two legs) at the named corner of `box`,
 * marking the screen corner the toast would anchor to.
 * @param {import('../layout.js').Box} box
 * @param {{ h: 'left'|'right', v: 'top'|'bottom' }} corner
 * @returns {string}
 */
function positionTick(box, corner) {
  const x = corner.h === 'left' ? box.x : box.x + box.w;
  const y = corner.v === 'top' ? box.y : box.y + box.h;
  const dx = corner.h === 'left' ? TICK : -TICK;
  const dy = corner.v === 'top' ? TICK : -TICK;
  const o = { stroke: COLORS.muted, strokeWidth: 1.4 };
  // one horizontal leg + one vertical leg, both starting at the corner point
  return rline(x, y, x + dx, y, o) + rline(x, y, x, y + dy, o);
}

export default {
  name: 'Snackbar',
  tier: 'v1.0',
  category: 'feedback',
  props: {
    position: {
      type: 'enum',
      values: ['inline', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
      default: 'inline',
    },
    message: { type: 'string', aliases: ['label'] },
  },
  keyless: [
    { kind: 'literal', to: 'message' },
    { kind: 'enum', to: 'position' },
  ],
  notes: 'Inline dark-tinted toast (no overlay): dense ink crosshatch + message; non-inline position draws a corner bracket. Fallback "Message sent".',

  block: false,
  intrinsic: (node) => {
    // Measure at the size we actually DRAW at so the bar tracks its message.
    const { w, h } = measureText(messageOf(node), FONT_SIZE);
    return { w: w + 2 * PAD_X, h: h + 2 * PAD_Y };
  },
  render: (node, box) => {
    // Dense ink crosshatch reads as the dark toast surface (hand-drawn, never a
    // solid block); the bordered pill + the message ride on top.
    const tint = backgroundHatch(box, 'crosshatch', true, { fill: COLORS.ink });
    const corner = cornerOf(node.props.position);
    const tick = corner ? positionTick(box, corner) : '';
    return tint + surface(box) + centeredLabel(box, messageOf(node), { fontSize: FONT_SIZE, weight: 600 }) + tick;
  },
};
