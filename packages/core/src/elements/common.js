// @ts-check
/**
 * Shared constants and typedefs for element definitions.
 *
 * Leaf module: it imports nothing else from core, so every `elements/*.js` file
 * can depend on it with no risk of an import cycle.
 *
 * @typedef {'string'|'enum'|'boolean'|'number'|'id'|'ref'|'ratio'|'icon'} PropType
 *   // 'icon': an icon NAME (ICONS.md ss.3) -- parses like 'string' but accepts
 *   // bare or quoted values, and the resolver resolves it against the icon
 *   // lookup chain onto `node.icons` for draw.js's drawIcon.
 *
 * @typedef {Object} PropDef
 * @property {PropType} type
 * @property {string[]} [values]    // enum domain
 * @property {*} [default]
 * @property {string[]} [aliases]   // alternate keyed spellings (`gap`->`spacing`, `w`->width); resolver maps them to this canonical prop (CONVENTION s.1)
 *
 * @typedef {Object} KeylessSlot
 * @property {'literal'|'enum'|'number'|'sizing'|'id'|'preset'} kind
 * @property {string} [to]          // keyed prop this slot resolves to ('enum'/'literal'/'number')
 *
 * @typedef {Object} ComponentDef
 * @property {string} name
 * @property {'v0.1'|'v1.0'} tier
 * @property {'root'|'layout'|'surfaces'|'navigation'|'content'|'inputs'|'feedback'} category
 * @property {boolean} [container]  // may hold children
 * @property {Record<string, PropDef>} props
 * @property {KeylessSlot[]} [keyless]
 * @property {boolean} [sizing]     // accepts keyless `w h` sizing tokens (ss.4)
 * @property {boolean} [text]       // text-bearing -> supports filler (ss.6)
 * @property {string} [notes]
 *
 * --- Layout/render strategy (stages 4 & 5; the facade in layout.js / render.js
 *     dispatches to whichever of these an element supplies) ---
 * @property {(node: ResolvedNode) => LayoutSpec} [layoutSpec]  // CONTAINERS: how to arrange children
 * @property {(node: ResolvedNode, avail?: { w?: number, h?: number }) => Size2D} [intrinsic]  // LEAVES: natural content size; `avail` is the space the parent will give when known -- a width-aware leaf (Typography word-wrap) reports the height it draws at that width, most leaves ignore it
 * @property {boolean} [block]      // stretch to the container's cross axis (default: containers yes, leaves no)
 * @property {(node: ResolvedNode) => (number|undefined)} [aspect] // LEAVES: w/h ratio; engine derives cross from main (Img ratio=)
 * @property {boolean} [flex]       // consumes leftover main-axis space when unsized (Spacer)
 * @property {Size2D | ((node: ResolvedNode) => Size2D)} [minSize]  // clamp intrinsic up to at least this, so an empty surface still draws (Card, Img); may be a predicate of the node for a per-prop floor (Dialog size breakpoint). A non-finite dimension is ignored.
 * @property {(node: ResolvedNode, box: Box) => string} [render] // draw THIS element's chrome (children drawn by the facade)
 *
 * @typedef {import('../resolve.js').ResolvedNode} ResolvedNode
 * @typedef {import('../layout.js').Box} Box
 * @typedef {{ w: number, h: number }} Size2D
 *
 * @typedef {Object} LayoutSpec
 * @property {'row'|'col'|'grid'} axis
 * @property {number} [pad]   // inner padding (px)
 * @property {number} [gap]   // gap between children (px)
 * @property {number} [cols]  // grid only: column count
 * @property {boolean} [reverse] // row-reverse/column-reverse: flip child order on the main axis
 */

/*
 * --- ELEMENT STRATEGY CONTRACT (how the layout/render facade dispatches) -----
 *
 * Each element default-exports ONE object that is both its schema and its
 * strategy. Define exactly one of:
 *   - layoutSpec(node) -> { axis, pad?, gap?, cols? }  => you are a CONTAINER
 *   - intrinsic(node, avail?) -> { w, h }               => you are a LEAF
 *       (`avail` = the space the parent will give, when known; a width-aware
 *       leaf may wrap to `avail.w` and report the resulting height -- see
 *       Typography. Most leaves take only `node`.)
 * Optional on either:
 *   - render(node, box) -> string   Draw THIS element's own chrome via draw.js
 *       helpers (surface / centeredLabel / rrect / rcrossbox / ...). OMIT it
 *       entirely if the element is invisible (see Stack/Box/Grid). Draw across
 *       the FULL box; children inset by the `pad` you set in layoutSpec.
 *   - block: true   LEAF only -- stretch to the container's cross axis (like
 *       Typography). Containers stretch by default; leaves don't. Omit otherwise.
 * NOT drawn by elements: clickable `to=` regions (the render facade wraps any
 * node carrying `to=`) and child boxes (the facade recurses into them).
 *
 * Minimal LEAF:
 *   import { surface, centeredLabel } from '../draw.js';
 *   import { textIntrinsic, textOf } from '../metrics.js';
 *   export default {
 *     name: 'Foo', tier: 'v0.1', category: 'content',
 *     props: { label: { type: 'string' } },
 *     keyless: [{ kind: 'literal', to: 'label' }],
 *     intrinsic: (n) => textIntrinsic(n, { padX: 16, padY: 8, fallback: 'Foo' }),
 *     render: (n, box) => surface(box) + centeredLabel(box, textOf(n, 'Foo')),
 *   };
 *
 * Minimal CONTAINER (a surface that stacks children):
 *   import { surface } from '../draw.js';
 *   import { SPACING } from '../metrics.js';
 *   export default {
 *     name: 'Bar', tier: 'v0.1', category: 'surfaces', container: true,
 *     props: {},
 *     layoutSpec: () => ({ axis: 'col', pad: SPACING, gap: SPACING }),
 *     render: (_n, box) => surface(box),
 *   };
 * ---------------------------------------------------------------------------- */

/** Filler *style* domain, shared by the frame default and per-element override (ss.6.3). */
export const FILLER_STYLES = ['squiggle', 'lorem', 'blocks'];

/** `Wireframe` size presets (ss.5.1). */
export const PRESETS = ['mobile', 'landscape', 'portrait'];

/** Multi-frame flow-chart layout direction (ss.7.4): top-down or left-right. */
export const DIRECTIONS = ['TD', 'LR'];
