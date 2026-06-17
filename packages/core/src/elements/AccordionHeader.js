// @ts-check
import { surface, drawIcon, text, backgroundHatch, BACKGROUNDS, COLORS } from '../draw.js';
import { SPACING } from '../metrics.js';

/**
 * AccordionHeader -- the clickable summary bar of an expandable panel. It is an
 * independent SIBLING of AccordionBody: there is NO `Accordion` parent element,
 * so an author places a header and (optionally) a body one after another and
 * neither contains the other. (FAMILY 8; SPEC ss.5.3 Surfaces)
 *
 * Reference strategy (full-width bar leaf): `block` so the bar fills its
 * container's cross axis (like an AppBar or a list row), a fixed header height,
 * and a bordered `surface` with the title left-aligned and an expand/collapse
 * chevron pinned to the right. It pairs with AccordionBody, which draws a matching
 * bordered panel directly beneath; both use the default solid ink stroke so the
 * shared seam reads as one continuous outline.
 *
 *  - `title` (keyless literal; aliases `label`/`text`): the summary text, read
 *    directly from `props.title` (NOT via `textOf`, so no filler -- this leaf
 *    does not set `text: true`).
 *  - `expanded` (keyless boolean): selects the chevron DIRECTION -- ExpandLess
 *    (pointing up) when open, ExpandMore (pointing down) when closed -- so the
 *    open/closed state reads from the glyph itself (MUI behavior).
 *  - `disabled` (keyless boolean): draws the whole bar (border, title, icon) in
 *    the muted ink, matching how Control mutes a disabled input.
 *  - `icon` (keyed, `type: 'icon'`, no default): an explicit OVERRIDE chevron. When
 *    set it wins in BOTH states ("the icon for this header"). Unset, the bar uses
 *    the per-state defaults below.
 *  - `expandedIcon` / `collapsedIcon` (keyed, `type: 'icon'`; defaults `ExpandLess`
 *    / `ExpandMore`): the per-state default chevrons. The resolver annotates a
 *    defaulted-but-unset icon prop's artwork at resolve time (ICONS.md ss.3; cf.
 *    Rating's icon/emptyIcon), so the bar draws a REAL chevron out of the box.
 *    Authors may override either state's glyph independently. Unknown names fall
 *    back to the classic placeholder glyph (resolve-time diagnostic, not ours).
 *  - `background` (keyless enum hatch|crosshatch) + `denseBackground` (keyless
 *    boolean): an optional hand-drawn tint across the bar surface, drawn only when
 *    the author opts in. A filled AccordionHeader IS its own opaque surface, so the
 *    tint passes `base: true` (CONVENTION s.8 (A) caller) -- a solid paper base
 *    under the hashes so content behind it can't show through.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Fixed header bar height (px) -- a touch taller than a list row so it reads as a section header. */
const HEADER_H = 44;
/** Footprint of the right-hand chevron icon slot (px). */
const GLYPH = 16;

/** The string the bar draws: explicit title, else a generic placeholder. */
const titleOf = (node) =>
  typeof node.props.title === 'string' ? node.props.title : 'Section';

/** The icon-slot key to draw: an explicit `icon` override wins in BOTH states;
 *  otherwise the per-state default (`expandedIcon` when open, else `collapsedIcon`).
 *  All three are annotated on `node.icons` -- `icon` only when set, the two state
 *  props always (from their defaults) -- so the chosen key always has artwork. */
const iconKey = (node) =>
  typeof node.props.icon === 'string' ? 'icon'
    : node.props.expanded === true ? 'expandedIcon'
    : 'collapsedIcon';

export default {
  name: 'AccordionHeader',
  tier: 'v1.0',
  category: 'surfaces',
  props: {
    title: { type: 'string', aliases: ['label', 'text'] },
    expanded: { type: 'boolean', default: false },
    disabled: { type: 'boolean', default: false },
    // `icon` is the explicit override (no default -> unset means "use the state
    // default"); expandedIcon/collapsedIcon carry the per-state default chevrons.
    icon: { type: 'icon' },
    expandedIcon: { type: 'icon', default: 'ExpandLess' },
    collapsedIcon: { type: 'icon', default: 'ExpandMore' },
    background: { type: 'enum', values: BACKGROUNDS },
    denseBackground: { type: 'boolean', default: false },
  },
  keyless: [{ kind: 'literal', to: 'title' }],
  notes: 'Sibling of AccordionBody; no Accordion parent. Default chevron is ExpandMore (collapsed) / ExpandLess (expanded); icon= overrides both states. Optional background/denseBackground tint (opaque base:true surface).',

  block: true,
  intrinsic: () => ({ w: 160, h: HEADER_H }),
  render: (node, box) => {
    const disabled = node.props.disabled === true;
    const ink = disabled ? COLORS.muted : COLORS.ink;

    // Optional hand-drawn tint across the bar surface, drawn UNDER the border.
    // A filled header is its own opaque surface (base:true), so content behind it
    // can't show through the hatch gaps. Only when the author opts in.
    let out = '';
    if (typeof node.props.background === 'string' || node.props.denseBackground === true) {
      out += backgroundHatch(box, node.props.background, node.props.denseBackground === true, { base: true });
    }

    // The bordered bar. Default solid stroke (so it abuts AccordionBody's panel
    // as one outline), recoloured to the muted ink when disabled.
    out += surface(box, { stroke: ink });

    // Title, left-padded and vertically centered.
    const fs = 16;
    out += text(box.x + SPACING, box.y + box.h / 2 + fs * 0.35, titleOf(node),
      { fontSize: fs, fill: ink, maxW: box.w - 3 * SPACING - GLYPH });

    // Expand/collapse chevron pinned to the right, via the shared `drawIcon`: real
    // artwork (ExpandMore collapsed / ExpandLess expanded by default, or an
    // explicit `icon=` override) as clean vectors, or the placeholder glyph when a
    // name didn't resolve. Drawn in NORMAL ink whether open or closed (the state
    // reads from the chevron DIRECTION, not a tint); disabled mutes it with the bar.
    const gx = box.x + box.w - SPACING - GLYPH;
    const gy = box.y + (box.h - GLYPH) / 2;
    out += drawIcon(node, iconKey(node), gx, gy, GLYPH, { ink });
    return out;
  },
};
