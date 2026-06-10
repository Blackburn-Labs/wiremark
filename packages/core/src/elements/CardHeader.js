// @ts-check
import { text, iconGlyph, COLORS } from '../draw.js';
import { SPACING, measureText } from '../metrics.js';

/**
 * CardHeader -- the title region of a Card (avatar / title / subheader / action).
 * (SPEC ss.5.3)
 *
 * Reference strategy (full-width header band leaf): like its MUI namesake a
 * CardHeader has no arbitrary children -- it is the title row built from its own
 * props -- so it is a `block` leaf rather than a container, mirroring the sibling
 * AccordionHeader band. (The spec slice marks `children: true`, but a header band
 * hosts nothing; the FAMILIES.md icon/header ruling lets a leaf override that
 * flag.) `block` makes it span the Card column's full width; its height tracks
 * whether a subheader is present.
 *
 * It draws, left to right: an optional leading `icon` placeholder glyph, then the
 * `title` (bold) with the `subheader` (muted, smaller) stacked beneath it, and an
 * optional trailing `closeIcon` glyph at the right edge. The Card supplies the
 * paper beneath, so the band itself is transparent -- it paints only its content,
 * never a surface of its own.
 *
 * `icon` / `closeIcon` are icon NAMES (strings, like `Icon.name`); per the icon
 * ruling every name renders the same bordered-box-with-diagonal placeholder. The
 * name is recorded but not shown -- the wireframe icon vocabulary is open
 * (ss.10.3). `closeIcon` defaults to `Close`; pass `closeIcon="none"` (a quoted
 * string, like any icon name) to omit the trailing glyph.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Title / subheader font sizes (px) and the glyph extent for the side icons. */
const TITLE_FONT = 16;
const SUB_FONT = 13;
const GLYPH = 24;

/** Vertical padding above/below the text block. */
const PAD_Y = SPACING * 1.5;

/** Has this header an explicit subheader line? @param {import('./common.js').ResolvedNode} node */
const hasSubheader = (node) => typeof node.props.subheader === 'string' && node.props.subheader !== '';

/** `closeIcon` resolves to "Close" when unset (the resolver does not inject PropDef
 * defaults), so a plain header draws the trailing glyph. `none` opts out.
 * @param {import('./common.js').ResolvedNode} node @returns {boolean} */
const showsClose = (node) => {
  const v = typeof node.props.closeIcon === 'string' ? node.props.closeIcon : 'Close';
  return v !== 'none' && v !== '';
};

/**
 * The shared placeholder glyph (bordered box + diagonal), vertically centered in
 * the band at `x` -- the same mark every icon-bearing element draws.
 * @param {number} x @param {import('./common.js').Box} box @returns {string}
 */
const glyph = (x, box) =>
  iconGlyph(x, box.y + (box.h - GLYPH) / 2, GLYPH, { stroke: COLORS.muted });

export default {
  name: 'CardHeader',
  tier: 'v1.0',
  category: 'surfaces',
  props: {
    title: { type: 'string', aliases: ['label', 'text'] },
    subheader: { type: 'string', aliases: ['subtext'] },
    icon: { type: 'string', default: null },
    closeIcon: { type: 'string', default: 'Close' },
  },
  keyless: [{ kind: 'literal', to: 'title' }],
  notes: 'Card title region; icon/closeIcon are icon names drawn as placeholder glyphs. closeIcon="none" omits the trailing glyph.',

  block: true,
  intrinsic: (node) => {
    const lines = TITLE_FONT + (hasSubheader(node) ? SPACING / 2 + SUB_FONT : 0);
    const h = Math.ceil(lines + 2 * PAD_Y);
    // Width hint: the longer of the title / subheader text, plus side gutters for
    // a possible leading + trailing glyph. The Card stretches it to full width
    // anyway (block), so this only sets a sensible minimum.
    const title = typeof node.props.title === 'string' ? node.props.title : 'Title';
    const sub = hasSubheader(node) ? node.props.subheader : '';
    const textW = Math.max(measureText(title, TITLE_FONT).w, measureText(sub, SUB_FONT).w);
    const w = textW + 2 * SPACING + 2 * (GLYPH + SPACING);
    return { w: Math.ceil(w), h };
  },
  render: (node, box) => {
    let out = '';
    const left = box.x + SPACING;
    const right = box.x + box.w - SPACING;

    // Leading icon (optional): a placeholder glyph at the left, text shifts right.
    const hasIcon = typeof node.props.icon === 'string' && node.props.icon !== '' && node.props.icon !== 'none';
    let textX = left;
    if (hasIcon) {
      out += glyph(left, box);
      textX = left + GLYPH + SPACING;
    }

    // Trailing close icon (drawn by default since closeIcon defaults to Close):
    // a glyph hugging the right edge. `closeIcon="none"` opts out.
    if (showsClose(node)) {
      out += glyph(right - GLYPH, box);
    }

    // Title + subheader stacked. With a subheader the pair is centered as a block;
    // a lone title centers on the band's vertical midline.
    const title = typeof node.props.title === 'string' ? node.props.title : 'Title';
    if (hasSubheader(node)) {
      const blockH = TITLE_FONT + SPACING / 2 + SUB_FONT;
      const top = box.y + (box.h - blockH) / 2;
      out += text(textX, top + TITLE_FONT, title, { fontSize: TITLE_FONT, weight: 700 });
      out += text(textX, top + TITLE_FONT + SPACING / 2 + SUB_FONT, node.props.subheader,
        { fontSize: SUB_FONT, fill: COLORS.muted });
    } else {
      out += text(textX, box.y + box.h / 2 + TITLE_FONT * 0.35, title,
        { fontSize: TITLE_FONT, weight: 700 });
    }
    return out;
  },
};
