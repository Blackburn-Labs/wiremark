// @ts-check
import { drawIcon, centeredLabel } from '../draw.js';
import { measureText } from '../metrics.js';

/**
 * BottomNavigationAction -- one destination in a BottomNavigation bar (SPEC
 * ss.5.4 Navigation). Renders the classic mobile bottom-nav stack: a small icon
 * on top with its label centered beneath. The keyless quoted literal is the
 * `label`; `icon=` is a keyed icon NAME (type:'icon', ICONS.md ss.3 -- this
 * supersedes the FAMILIES.md placeholder-only ruling): a known name renders as
 * clean vector artwork via drawIcon, an unknown or unset one falls back to the
 * shared iconGlyph placeholder (a bordered box with a diagonal mark) in the
 * same box.
 *
 * Strategy (leaf): a fixed-height stack that declares `flex: true` so sibling
 * actions split the bar width equally (FAMILIES.md F6, engine fact 4). It does
 * NOT read its parent BottomNavigation -- a child strategy only sees its own
 * node/box (engine fact 1) -- so it always draws its label at wireframe
 * fidelity (the parent's `showLabels`/`value` cannot reach it).
 *
 * NOT a filler-bearing element (no `text: true`): a bottom-nav action shows a
 * short, fixed `label` (a keyless quoted-string literal), never generated body
 * text, so it deliberately rejects a `~N`/`___` filler token. Declaring
 * `text: true` without ever consuming `node.filler` would silently swallow that
 * token -- a dead input -- so we omit it and `BottomNavigationAction ~5` errors.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Icon slot extent (px) drawn above the label (real artwork or placeholder). */
const GLYPH = 24;
/** Label font size (px) -- a small caption beneath the glyph. */
const LABEL_FONT = 12;
/** Vertical padding above the glyph and below the label (px). */
const PAD_Y = 8;
/** Gap between the glyph and the label (px). */
const GLYPH_GAP = 4;
/** Horizontal padding so a wide label keeps breathing room (px). */
const PAD_X = 8;

export default {
  name: 'BottomNavigationAction',
  tier: 'v1.0',
  category: 'navigation',
  props: {
    label: { type: 'string' },
    icon: { type: 'icon' },
  },
  keyless: [{ kind: 'literal', to: 'label' }],
  notes:
    'Bottom-nav destination leaf: flex:true so siblings split the bar width. '
    + 'icon= is an icon NAME (type:\'icon\', ICONS.md ss.3): known names render clean vectors '
    + 'via drawIcon, unknown/unset ones fall back to the iconGlyph placeholder. '
    + 'No text:true -- label is a fixed quoted literal, not filler. '
    + 'Always draws its label; the parent\'s showLabels/value cannot reach a child (engine fact 1).',

  // Equal share of the bar's main-axis width (the bar is a `row`); never stretch
  // beyond the stack on the cross axis.
  flex: true,
  block: false,
  intrinsic: (node) => {
    const label = typeof node.props.label === 'string' ? node.props.label : '';
    const labelW = label ? measureText(label, LABEL_FONT).w : 0;
    // Wide enough for the glyph or the label, whichever is bigger.
    const w = Math.max(GLYPH, labelW) + 2 * PAD_X;
    const h = PAD_Y + GLYPH + GLYPH_GAP + LABEL_FONT + PAD_Y;
    return { w, h };
  },
  render: (node, box) => {
    // Icon centered horizontally near the top; label centered in the band below.
    const gx = box.x + box.w / 2 - GLYPH / 2;
    const gy = box.y + PAD_Y;
    let out = drawIcon(node, 'icon', gx, gy, GLYPH);

    const label = typeof node.props.label === 'string' ? node.props.label : '';
    if (label) {
      const labelBand = {
        x: box.x,
        y: gy + GLYPH + GLYPH_GAP,
        w: box.w,
        h: LABEL_FONT,
      };
      out += centeredLabel(labelBand, label, { fontSize: LABEL_FONT });
    }
    return out;
  },
};
