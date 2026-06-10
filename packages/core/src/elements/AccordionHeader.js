// @ts-check
import { surface, iconGlyph, text, COLORS } from '../draw.js';
import { SPACING } from '../metrics.js';

/**
 * AccordionHeader -- the clickable summary bar of an expandable panel. It is an
 * independent SIBLING of AccordionBody: there is NO `Accordion` parent element,
 * so an author places a header and (optionally) a body one after another and
 * neither contains the other. (FAMILY 8; SPEC ss.5.3 Surfaces)
 *
 * Reference strategy (full-width bar leaf): `block` so the bar fills its
 * container's cross axis (like an AppBar or a list row), a fixed header height,
 * and a bordered `surface` with the title left-aligned and a chevron-style glyph
 * pinned to the right. It pairs with AccordionBody, which draws a matching
 * bordered panel directly beneath; both use the default solid ink stroke so the
 * shared seam reads as one continuous outline.
 *
 *  - `title` (keyless literal; aliases `label`/`text`): the summary text, read
 *    directly from `props.title` (NOT via `textOf`, so no filler -- this leaf
 *    does not set `text: true`).
 *  - `expanded` (keyless boolean): conventionally flips the chevron to point
 *    down. At wireframe fidelity the glyph is the same generic placeholder either
 *    way, so the direction nuance is decorative -- but an expanded header tints
 *    its glyph with the accent ink so the open state is still legible.
 *  - `disabled` (keyless boolean): draws the whole bar (border, title, glyph) in
 *    the muted ink, matching how Control mutes a disabled input.
 *  - `icon` (keyed string; default `ChevronRight`): the icon NAME. Per the icon
 *    ruling every name renders the same placeholder glyph (the shared `iconGlyph`
 *    helper -- a bordered box with a diagonal stroke), so the value is recorded
 *    but not vocabulary-specific. `ChevronDown` is the conventional default when
 *    expanded.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Fixed header bar height (px) -- a touch taller than a list row so it reads as a section header. */
const HEADER_H = 44;
/** Footprint of the right-hand chevron placeholder glyph (px). */
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
    icon: { type: 'string', default: 'ChevronRight' },
  },
  keyless: [{ kind: 'literal', to: 'title' }],
  notes: 'Sibling of AccordionBody; there is no Accordion parent. Expanded chevron direction is decorative at wireframe fidelity.',

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

    // Placeholder icon glyph pinned to the right (the shared `iconGlyph` look).
    // The chevron-direction nuance is decorative at wireframe fidelity, so an
    // expanded header instead tints the glyph with the accent ink to keep the
    // open state legible -- unless disabled, where the whole bar stays muted.
    const gx = box.x + box.w - SPACING - GLYPH;
    const gy = box.y + (box.h - GLYPH) / 2;
    const glyphInk = disabled ? COLORS.muted : expanded ? COLORS.accent : COLORS.ink;
    out += iconGlyph(gx, gy, GLYPH, { stroke: glyphInk });
    return out;
  },
};
