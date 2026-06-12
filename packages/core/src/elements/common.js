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
 * @property {boolean | ((node: ResolvedNode) => boolean)} [overlay]  // OUT-OF-FLOW: the PARENT excludes this node from flow (it adds nothing to the parent's content size and takes no flex share / grid cell), and the FRAME paints it LAST, over all in-flow content. Static or per-node predicate, like `block`/`minSize`. Orthogonal to layoutSpec/intrinsic -- an overlay still measures its own insides normally; only its placement and paint timing change. The first element-level out-of-flow capability (Dialog; Drawer's overlay variant).
 * @property {(node: ResolvedNode, parentContent: Rect, measured: Size2D) => Rect} [overlayPlacement]  // OVERLAY only: the element OWNS its placement and any parent-relative SIZING. The engine measures the subtree BARE (its content size -- handing a container an avail extent would make it FILL that extent, defeating its own sizing; `%`/fill resolve later in arrangeLinear, which overlays bypass), then hands back `parentContent` (the parent's padded inner rect this node would have flowed into) and `measured` (its content size); the element returns its absolute box, deriving any fill/stretch from `parentContent` itself. Keeps the engine vocabulary-free: Dialog maps its 9-way `position` here; Drawer's overlay variant docks to an edge (anchorRect's stretch). The returned w/h are FINAL -- place() uses the rect verbatim, it does not re-measure.
 * @property {(node: ResolvedNode, box: Box) => string} [render] // draw THIS element's chrome (children drawn by the facade)
 *
 * @typedef {import('../resolve.js').ResolvedNode} ResolvedNode
 * @typedef {import('../layout.js').Box} Box
 * @typedef {import('../layout.js').Rect} Rect
 * @typedef {{ w: number, h: number }} Size2D
 *
 * @typedef {Object} LayoutSpec
 * @property {'row'|'col'|'grid'} axis
 * @property {number} [pad]   // inner padding (px)
 * @property {number} [gap]   // gap between children (px)
 * @property {number} [cols]  // grid only: column count
 * @property {boolean} [reverse] // row-reverse/column-reverse: flip child order on the main axis
 * @property {'start'|'end'|'center'} [mainAlign] // pack children toward the start (default), end, or center of the MAIN axis. Only applies when no child flexes (a flex/`*`/Spacer child already consumes the free space, so it wins). `start` is byte-identical to omitting it. Used for MUI right-aligned rows (DialogActions -> 'end').
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
 *   - overlay: true | (node)=>bool   The element is OUT OF FLOW. Its parent gives
 *       it no flow slot (it adds nothing to the parent's size and takes no flex
 *       share or grid cell), and the FRAME paints it LAST, on top of all in-flow
 *       content -- so a later-declared sibling can't draw over it. Pair it with
 *       `overlayPlacement(node, parentContent, measured) -> {x,y,w,h}`: the engine
 *       measures the subtree BARE (its content size -- avail would make a container
 *       fill, defeating its own sizing), then the element returns its absolute box
 *       positioned within `parentContent` (the parent's padded inner rect),
 *       deriving any fill/stretch from `parentContent` itself. The element OWNS the
 *       positioning vocabulary (Dialog's `position`, Drawer's edge); the engine
 *       stays vocabulary-free. SIZE still comes from layoutSpec/intrinsic +
 *       w/h/minSize as usual; only POSITION (parent-relative) and PAINT ORDER
 *       (frame-last) change. An overlay still declares layoutSpec/intrinsic for its
 *       own insides. (Dialog; Drawer's overlay variant -- the engine's first
 *       out-of-flow layer.)
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

/**
 * @typedef {'start'|'center'|'end'|'stretch'} Align  // one axis of an overlay anchor
 * @typedef {{ h: Align, v: Align }} Anchor           // horizontal + vertical alignment
 */

/**
 * Seat one axis: the [origin, extent] for an `align`ed box of `size` in a track of
 * `length` starting at `origin`. `stretch` fills the track (size := length, at the
 * track start). start/center/end keep the box at `size`, clamped so the NEAR edge
 * never crosses the track start -- an oversized box overflows the FAR end only,
 * matching the column-overflow convention in layout.js (a frame clips that spill;
 * a Box does not). @param {Align} align @param {number} origin @param {number} length @param {number} size
 * @returns {[number, number]}
 */
function seatAxis(align, origin, length, size) {
  if (align === 'stretch') return [origin, length];
  const offset = align === 'center' ? (length - size) / 2 : align === 'end' ? length - size : 0;
  return [Math.max(origin, origin + offset), size];
}

/**
 * THE shared overlay placement helper: seat a `size` box inside a `parent` content
 * rect at a 9-way (+stretch) `anchor`. The single geometry op every out-of-flow
 * element delegates to from its `overlayPlacement` hook, so the start/center/end/
 * stretch math lives in ONE place:
 *  - Dialog maps its `position` enum to {h,v} in {start,center,end} (center = MUI
 *    center); fullScreen -> {h:'stretch', v:'stretch'}.
 *  - Drawer's overlay variant docks to a side: left = {h:'start', v:'stretch'},
 *    right = {h:'end', v:'stretch'}, top/bottom the transpose.
 * `'stretch'` fills the parent on that axis (size ignored there); the other anchors
 * keep `size` and overflow only past the parent's FAR edge (never the near edge).
 * Pure + deterministic. @param {Rect} parent @param {Size2D} size @param {Anchor} anchor
 * @returns {Rect}
 */
export function anchorRect(parent, size, anchor) {
  const [x, w] = seatAxis(anchor.h, parent.x, parent.w, size.w);
  const [y, h] = seatAxis(anchor.v, parent.y, parent.h, size.h);
  return { x, y, w, h };
}
