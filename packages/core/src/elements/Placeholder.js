// @ts-check
import { rcrossbox, text, COLORS } from '../draw.js';
import { LINE_HEIGHT } from '../metrics.js';

const FALLBACK = { w: 160, h: 120 };
const FLOOR = { w: 80, h: 72 };

/** Label / description type sizes (px). The label reads as the primary caption,
 *  the description as finer, secondary text -- a touch smaller and muted. */
const LABEL_FONT = 14;
const DESC_FONT = 11;
/** Inset (px) kept on each side so a centered line ellipsizes before it reaches
 *  the crossed-box outline instead of riding the border. */
const TEXT_INSET = 8;

/**
 * Placeholder -- a stand-in box for something undecided. It draws exactly Img's
 * no-image look (a bordered box with two crossing diagonals via `rcrossbox`),
 * then overlays an optional centered `label` with a finer, muted `description`
 * underneath it (what the placeholder is reserving space for).
 *
 * It carries the same sizing vocabulary as a box (pixel / percent / flex `w h`
 * tokens via `sizing: true`), so an author reserves space directly
 * (`Placeholder 100% 200px "Chart"`). With no label and no description it is a
 * pure crossed box, identical to a bare Img.
 *
 * Strategy (leaf): `intrinsic` gives a comfortable default; `minSize` floors an
 * unconstrained one so it never collapses (and leaves room for two text lines).
 * An explicit `w`/`h` token always wins over the floor. Text is render-only: it
 * is centered over the box and each line is trimmed to the box width, so a small
 * placeholder ellipsizes rather than spilling past the outline.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Placeholder',
  tier: 'v1.0',
  category: 'content',
  sizing: true,
  props: {
    // width/height (+ w/h aliases) are realized by `sizing: true` (CONVENTION ss.4).
    label: { type: 'string' },
    description: { type: 'string' },
  },
  keyless: [{ kind: 'literal', to: 'label' }],
  notes: 'Reserve space for something undecided: a crossed box (like Img) with an optional centered label and a finer description beneath it.',

  minSize: { ...FLOOR },
  intrinsic: () => ({ ...FALLBACK }),
  render: (node, box) => {
    let out = rcrossbox(box.x, box.y, box.w, box.h);
    const label = typeof node.props.label === 'string' ? node.props.label : '';
    const description = typeof node.props.description === 'string' ? node.props.description : '';
    if (!label && !description) return out; // pure crossed box, exactly like Img

    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const maxW = Math.max(0, box.w - 2 * TEXT_INSET);
    const descStep = DESC_FONT * LINE_HEIGHT;

    if (label && description) {
      // Two-line stack centered on the box: label sits just above the middle,
      // description one line below it, so the pair straddles the center.
      const labelY = cy - descStep / 2 + LABEL_FONT * 0.35;
      out += text(cx, labelY, label,
        { fontSize: LABEL_FONT, anchor: 'middle', fill: COLORS.ink, maxW });
      out += text(cx, labelY + descStep, description,
        { fontSize: DESC_FONT, anchor: 'middle', fill: COLORS.muted, maxW });
    } else if (label) {
      out += text(cx, cy + LABEL_FONT * 0.35, label,
        { fontSize: LABEL_FONT, anchor: 'middle', fill: COLORS.ink, maxW });
    } else {
      // description only: still centered, drawn in the finer muted style.
      out += text(cx, cy + DESC_FONT * 0.35, description,
        { fontSize: DESC_FONT, anchor: 'middle', fill: COLORS.muted, maxW });
    }
    return out;
  },
};
