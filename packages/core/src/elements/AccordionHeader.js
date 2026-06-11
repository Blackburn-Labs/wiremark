// @ts-check
import { surface, drawIcon, text, COLORS } from '../draw.js';
import { SPACING } from '../metrics.js';

/**
 * AccordionHeader -- the clickable summary bar of an expandable panel. It is an
 * independent SIBLING of AccordionBody: there is NO `Accordion` parent element,
 * so an author places a header and (optionally) a body one after another and
 * neither contains the other. (FAMILY 8; SPEC ss.5.3 Surfaces)
 *
 * Reference strategy (full-width bar leaf): `block` so the bar fills its
 * container's cross axis (like an AppBar or a list row), a fixed header height,
 * and a bordered `surface` with the title left-aligned and a chevron icon
 * pinned to the right. It pairs with AccordionBody, which draws a matching
 * bordered panel directly beneath; both use the default solid ink stroke so the
 * shared seam reads as one continuous outline.
 *
 *  - `title` (keyless literal; aliases `label`/`text`): the summary text, read
 *    directly from `props.title` (NOT via `textOf`, so no filler -- this leaf
 *    does not set `text: true`).
 *  - `expanded` (keyless boolean): conventionally flips the chevron to point
 *    down. The default artwork stays `ChevronRight` either way, so the direction
 *    nuance is decorative -- but an expanded header tints its icon with the
 *    accent ink so the open state is still legible (authors who want the
 *    pointing-down look can set `icon=ExpandMore` themselves).
 *  - `disabled` (keyless boolean): draws the whole bar (border, title, icon) in
 *    the muted ink, matching how Control mutes a disabled input.
 *  - `icon` (keyed, `type: 'icon'`; default `ChevronRight`): the icon NAME,
 *    resolved against the icon lookup chain at resolve time (ICONS.md ss.3 --
 *    superseding the elements2-era placeholder-only ruling). The resolver
 *    annotates the default's artwork even when the prop is unset, so the bar
 *    draws a REAL chevron out of the box; unknown names fall back to the classic
 *    placeholder glyph (with a resolve-time diagnostic, not ours to emit).
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

export default {
  name: 'AccordionHeader',
  tier: 'v1.0',
  category: 'surfaces',
  props: {
    title: { type: 'string', aliases: ['label', 'text'] },
    expanded: { type: 'boolean', default: false },
    disabled: { type: 'boolean', default: false },
    icon: { type: 'icon', default: 'ChevronRight' },
  },
  keyless: [{ kind: 'literal', to: 'title' }],
  notes: 'Sibling of AccordionBody; there is no Accordion parent. The default ChevronRight stays put when expanded (direction is decorative); the open state shows as an accent-tinted icon.',

  block: true,
  intrinsic: () => ({ w: 160, h: HEADER_H }),
  render: (node, box) => {
    const disabled = node.props.disabled === true;
    const expanded = node.props.expanded === true;
    const ink = disabled ? COLORS.muted : COLORS.ink;

    // The bordered bar. Default solid stroke (so it abuts AccordionBody's panel
    // as one outline), recoloured to the muted ink when disabled.
    let out = surface(box, { stroke: ink });

    // Title, left-padded and vertically centered.
    const fs = 16;
    out += text(box.x + SPACING, box.y + box.h / 2 + fs * 0.35, titleOf(node), { fontSize: fs, fill: ink });

    // Icon slot pinned to the right, drawn through the shared `drawIcon`: the
    // resolved artwork (a real ChevronRight by default) as clean vectors, or the
    // classic placeholder glyph when the name didn't resolve. The chevron
    // direction stays put at wireframe fidelity, so an expanded header instead
    // tints the icon with the accent ink to keep the open state legible --
    // unless disabled, where the whole bar stays muted.
    const gx = box.x + box.w - SPACING - GLYPH;
    const gy = box.y + (box.h - GLYPH) / 2;
    const glyphInk = disabled ? COLORS.muted : expanded ? COLORS.accent : COLORS.ink;
    out += drawIcon(node, 'icon', gx, gy, GLYPH, { ink: glyphInk });
    return out;
  },
};
