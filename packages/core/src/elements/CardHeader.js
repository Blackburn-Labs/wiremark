// @ts-check
import { text, drawIcon, COLORS } from '../draw.js';
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
 * It draws, left to right: an optional leading `icon`, then the `title` (bold)
 * with the `subheader` (muted, smaller) stacked beneath it, and an optional
 * trailing `closeIcon` at the right edge. The Card supplies the paper beneath,
 * so the band itself is transparent -- it paints only its content, never a
 * surface of its own.
 *
 * `icon` / `closeIcon` are icon-typed props (icon NAMES, like `Icon.name`): a
 * known name -- built-in, document-inline, or injected -- is resolved onto
 * `node.icons` at resolve time and drawn here as clean vector artwork via
 * `drawIcon`; an unknown name falls back to the classic bordered-box-with-
 * diagonal placeholder (tasks/ICONS.md ss.3, superseding the elements2-era
 * "every name renders the same placeholder" ruling). The icon vocabulary stays
 * open (ss.10.3). `closeIcon` defaults to `Close` -- the resolver annotates the
 * default's artwork even when the prop is unset -- so a plain header draws a
 * real Close X; pass `closeIcon="none"` to omit the trailing icon.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Title / subheader font sizes (px) and the slot extent for the side icons. */
const TITLE_FONT = 16;
const SUB_FONT = 13;
const GLYPH = 24;

/** Vertical padding above/below the text block. */
const PAD_Y = SPACING * 1.5;

/** Has this header an explicit subheader line? @param {import('./common.js').ResolvedNode} node */
const hasSubheader = (node) => typeof node.props.subheader === 'string' && node.props.subheader !== '';

/** `closeIcon` resolves to "Close" when unset: the resolver annotates the
 * default's ARTWORK onto `node.icons.closeIcon` but never injects the value
 * into `props`, so the show/hide gate still applies the default itself.
 * `none` opts out (and suppresses the annotation engine-side too).
 * @param {import('./common.js').ResolvedNode} node @returns {boolean} */
const showsClose = (node) => {
  const v = typeof node.props.closeIcon === 'string' ? node.props.closeIcon : 'Close';
  return v.toLowerCase() !== 'none' && v !== ''; // case-blind, like icon lookup itself
};

/** Vertical top of a side-icon slot, centered in the band.
 * @param {import('./common.js').Box} box @returns {number} */
const iconY = (box) => box.y + (box.h - GLYPH) / 2;

export default {
  name: 'CardHeader',
  tier: 'v1.0',
  category: 'surfaces',
  props: {
    title: { type: 'string', aliases: ['label', 'text'] },
    subheader: { type: 'string', aliases: ['subtext'] },
    icon: { type: 'icon', default: null },
    closeIcon: { type: 'icon', default: 'Close' },
  },
  keyless: [{ kind: 'literal', to: 'title' }],
  notes: 'Card title region; icon/closeIcon are icon names -- known names draw real artwork, unknown ones the placeholder glyph (tasks/ICONS.md). closeIcon="none" omits the trailing icon.',

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

    // Leading icon (optional): drawn at the left, text shifts right. drawIcon
    // picks real artwork vs the placeholder; the element never branches on it.
    const hasIcon = typeof node.props.icon === 'string' && node.props.icon !== ''
      && node.props.icon.toLowerCase() !== 'none';
    let textX = left;
    if (hasIcon) {
      out += drawIcon(node, 'icon', left, iconY(box), GLYPH);
      textX = left + GLYPH + SPACING;
    }

    // Trailing close icon (drawn by default since closeIcon defaults to Close --
    // a real Close X) hugging the right edge. `closeIcon="none"` opts out.
    if (showsClose(node)) {
      out += drawIcon(node, 'closeIcon', right - GLYPH, iconY(box), GLYPH);
    }

    // Title + subheader stacked. With a subheader the pair is centered as a block;
    // a lone title centers on the band's vertical midline. Text runs from textX
    // to the close-icon slot (or the right inset when closeIcon opts out).
    const limit = right - (showsClose(node) ? GLYPH + SPACING : 0);
    const maxW = limit - textX;
    const title = typeof node.props.title === 'string' ? node.props.title : 'Title';
    if (hasSubheader(node)) {
      const blockH = TITLE_FONT + SPACING / 2 + SUB_FONT;
      const top = box.y + (box.h - blockH) / 2;
      out += text(textX, top + TITLE_FONT, title, { fontSize: TITLE_FONT, weight: 700, maxW });
      out += text(textX, top + TITLE_FONT + SPACING / 2 + SUB_FONT, node.props.subheader,
        { fontSize: SUB_FONT, fill: COLORS.muted, maxW });
    } else {
      out += text(textX, box.y + box.h / 2 + TITLE_FONT * 0.35, title,
        { fontSize: TITLE_FONT, weight: 700, maxW });
    }
    return out;
  },
};
