// @ts-check

/**
 * ButtonGroup -- a fused row (or column) of Button children. (SPEC ss.5.4)
 *
 * Strategy (invisible container): like MUI's ButtonGroup it draws no chrome of
 * its own -- the Buttons supply their own borders, and a ZERO gap abuts them so
 * the shared edges read as the classic "fused buttons" look (a single button
 * drawing its own outline at the seam). Keeping the group invisible (mirroring
 * Stack's default) avoids a double border around the row.
 *
 * Two keyless enums with disjoint value domains (CONVENTION s.2.1), so
 * `ButtonGroup contained vertical` parses regardless of token order:
 *  - `orientation` horizontal (default) -> axis 'row'; vertical -> axis 'col'.
 *  - `variant` (text / outlined / contained) is carried for parity with MUI's
 *    group-level variant; the honest sketch leaves each Button to draw its own
 *    look, so the prop is recorded but does not override child chrome.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'ButtonGroup',
  tier: 'v1.0',
  category: 'inputs',
  container: true,
  props: {
    variant: { type: 'enum', values: ['text', 'outlined', 'contained'], default: 'outlined' },
    orientation: { type: 'enum', values: ['horizontal', 'vertical'], default: 'horizontal' },
  },
  // variant + orientation are disjoint enum domains (CONVENTION s.2.1).
  keyless: [
    { kind: 'enum', to: 'variant' },
    { kind: 'enum', to: 'orientation' },
  ],
  notes: 'Fused Button row/column; gap 0 abuts the children. Invisible group (Buttons draw their own borders).',

  // gap 0 fuses the buttons; orientation picks the main axis. No pad: the group
  // hugs its children so the outermost button edges are the group edges.
  layoutSpec: (node) => ({
    axis: node.props.orientation === 'vertical' ? 'col' : 'row',
    pad: 0,
    gap: 0,
  }),
};
