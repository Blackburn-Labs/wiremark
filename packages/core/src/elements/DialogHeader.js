// @ts-check
import { text, drawIcon } from '../draw.js';
import { SPACING, measureText } from '../metrics.js';

/**
 * DialogHeader -- the title region of a Dialog (MUI DialogTitle). The dialog
 * counterpart of CardHeader (SPEC: MUI Feedback surface, v1.0).
 *
 * Reference strategy (full-width title band leaf): like CardHeader it is a
 * `block` leaf, not a container -- it draws its own title row from props, so it
 * hosts no children and spans the Dialog column's full width. It is deliberately
 * LEANER than CardHeader: a dialog title is just the title text (bold) plus an
 * optional trailing close `X`, with no leading icon or subheader. The enclosing
 * Dialog supplies the paper sheet, so the band is transparent -- it paints only
 * its text and the close glyph, never a surface of its own.
 *
 * `closeIcon` is an icon-typed prop (an icon NAME, like CardHeader's): it
 * defaults to `Close`, so a plain header draws a real dismiss X (the resolver
 * annotates the default's artwork even when the prop is unset); pass
 * `closeIcon="none"` to omit it. A known name resolves to clean vector artwork
 * via `drawIcon`; an unknown one falls back to the placeholder glyph
 * (tasks/ICONS.md ss.3).
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Title font size (px) and the square slot extent for the close glyph. */
const TITLE_FONT = 18;
const GLYPH = 24;

/** Vertical padding above/below the title line. */
const PAD_Y = SPACING * 1.5;

/** `closeIcon` resolves to "Close" when unset: the resolver annotates the
 * default's ARTWORK onto `node.icons.closeIcon` but never injects the value into
 * `props`, so this show/hide gate still applies the default itself. `none` opts
 * out (case-blind, like icon lookup). Mirrors CardHeader's gate.
 * @param {import('./common.js').ResolvedNode} node @returns {boolean} */
const showsClose = (node) => {
  const v = typeof node.props.closeIcon === 'string' ? node.props.closeIcon : 'Close';
  return v.toLowerCase() !== 'none' && v !== '';
};

/** Vertical top of the close-icon slot, centered in the band.
 * @param {import('./common.js').Box} box @returns {number} */
const iconY = (box) => box.y + (box.h - GLYPH) / 2;

export default {
  name: 'DialogHeader',
  tier: 'v1.0',
  category: 'feedback',
  props: {
    title: { type: 'string', aliases: ['label', 'text'] },
    closeIcon: { type: 'icon', default: 'Close' },
  },
  keyless: [{ kind: 'literal', to: 'title' }],
  notes: 'Dialog title region (MUI DialogTitle): bold title + optional trailing close X. closeIcon="none" omits the close glyph.',

  block: true,
  intrinsic: (node) => {
    const h = Math.ceil(TITLE_FONT + 2 * PAD_Y);
    // Width hint: the title plus side gutters for the trailing close glyph. The
    // Dialog stretches it to full width anyway (block), so this is a sensible
    // minimum only.
    const title = typeof node.props.title === 'string' ? node.props.title : 'Title';
    const w = measureText(title, TITLE_FONT).w + 2 * SPACING + (GLYPH + SPACING);
    return { w: Math.ceil(w), h };
  },
  render: (node, box) => {
    let out = '';
    const left = box.x + SPACING;
    const right = box.x + box.w - SPACING;

    // Trailing close icon (drawn by default since closeIcon defaults to Close)
    // hugging the right edge. `closeIcon="none"` opts out. drawIcon picks real
    // artwork vs the placeholder; the element never branches on it.
    if (showsClose(node)) {
      out += drawIcon(node, 'closeIcon', right - GLYPH, iconY(box), GLYPH);
    }

    // Title, vertically centered, bold. It runs from the left inset to the
    // close-icon slot (or the right inset when the close glyph opts out).
    const limit = right - (showsClose(node) ? GLYPH + SPACING : 0);
    const maxW = limit - left;
    const title = typeof node.props.title === 'string' ? node.props.title : 'Title';
    out += text(left, box.y + box.h / 2 + TITLE_FONT * 0.35, title,
      { fontSize: TITLE_FONT, weight: 700, maxW });
    return out;
  },
};
