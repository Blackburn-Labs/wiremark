// @ts-check
import { REGISTRY } from './registry.js';
import { diagnostic } from './errors.js';
import { FRAME_PAD, PRESET_SIZES, DEFAULT_FRAME, SPACING } from './metrics.js';

/**
 * Stage (4) -- LAYOUT.  Document -> box geometry.
 *
 * A flexbox-lite solver (SPEC ss.4) driven by per-element *strategies* (the
 * facade dispatches; each `elements/<Name>.js` supplies the behavior):
 *  - A container declares `layoutSpec(node) -> {axis,pad,gap,cols}`; the engine
 *    arranges its children along that axis, sharing leftover main-axis space by
 *    flex weight (`*` = weight 1; a bare number = that weight; `Spacer` flexes).
 *  - A leaf declares `intrinsic(node) -> {w,h}`; sizing tokens (px | % | * |
 *    flex) on any node override/feed the distribution.
 *
 * Two passes: `measure` finds intrinsic sizes bottom-up; `place` distributes the
 * allocated region top-down. Output coordinates are absolute within each frame.
 *
 * The document layer (cross-frame `background=#id` composition, SPEC ss.5.1.1)
 * is resolved here too -- backgrounds are chained deepest-first, missing targets
 * and cycles emit warnings rather than hard-failing.
 *
 * @typedef {import('./resolve.js').Document} Document
 * @typedef {import('./resolve.js').Frame} Frame
 * @typedef {import('./resolve.js').ResolvedNode} ResolvedNode
 * @typedef {import('./resolve.js').Size} Size
 *
 * @typedef {Object} Rect
 * @property {number} x @property {number} y @property {number} w @property {number} h
 *
 * @typedef {Object} Box
 * @property {number} x @property {number} y @property {number} w @property {number} h
 * @property {ResolvedNode} node
 * @property {Box[]} children
 *
 * @typedef {Object} LaidOutFrame
 * @property {string} [id]
 * @property {number} w
 * @property {number} h
 * @property {Box} root
 * @property {Frame} frame
 * @property {boolean} visible
 * @property {LaidOutFrame[]} backgroundChain   // deepest-first, painted beneath
 * @property {number} [x]   // absolute frame position (multi-frame flow layout); see frame-layout.js
 * @property {number} [y]
 */

/** @param {string} name @returns {import('./elements/common.js').ComponentDef & {intrinsic?:Function, layoutSpec?:Function, render?:Function, aspect?:Function, block?:boolean|((node:ResolvedNode)=>boolean), flex?:boolean, minSize?:{w:number,h:number}|((node:ResolvedNode)=>{w:number,h:number}), overlay?:boolean|((node:ResolvedNode)=>boolean), overlayPlacement?:(node:ResolvedNode, parentContent:Rect, measured:{w:number,h:number})=>Rect}} */
function strategyFor(name) {
  return REGISTRY[name] ?? /** @type {*} */ ({});
}

/**
 * A node is a container if its def says so (`container:true`) OR it supplies a
 * `layoutSpec`. Keying off the def (not just layoutSpec) means a container can
 * never silently drop its children just because its author hasn't written a
 * custom layoutSpec yet -- it falls back to a plain column.
 * @param {ResolvedNode} node @returns {boolean}
 */
function isContainer(node) {
  const s = strategyFor(node.component);
  return s.container === true || typeof s.layoutSpec === 'function';
}

/**
 * Is this node an OVERLAY (out of flow)? An overlay contributes nothing to its
 * parent's content size and gets no flex/grid slot (this module), and the FRAME
 * paints it last, over the in-flow content (render.js). `overlay` may be a static
 * boolean OR a per-node predicate, mirroring how `block`/`minSize` may be
 * functions. EXPORTED so render.js's deferred paint pass keys off the exact same
 * predicate as this module's flow partition -- one source of truth for "what is
 * an overlay." (Dialog; Drawer overlay variant; Scrollbar.)
 * @param {ResolvedNode} node @returns {boolean}
 */
export function isOverlay(node) {
  const s = strategyFor(node.component);
  return typeof s.overlay === 'function' ? !!s.overlay(node) : !!s.overlay;
}

/** Resolve a container's layout spec, defaulting to a 0-gap column. @param {ResolvedNode} node @returns {{axis:string,pad?:number,gap?:number,cols?:number}} */
function specFor(node) {
  const s = strategyFor(node.component);
  return typeof s.layoutSpec === 'function' ? s.layoutSpec(node) : { axis: 'col', pad: 0, gap: 0 };
}

// --- pass 1: intrinsic measurement (bottom-up) --------------------------------

/**
 * Content size of a node. `avail` optionally supplies the cross-axis space the
 * parent will give it -- that is what lets an aspect-locked leaf (Img `ratio=`)
 * and the containers above it reserve the correct height; without it the measure
 * pass and the place pass disagree and aspect children overflow their parent.
 * It is also forwarded to leaf `intrinsic(node, avail)` so a width-aware leaf
 * (Typography word-wrap) can report the height it will actually draw at that
 * width; most leaves ignore the extra argument.
 * @param {ResolvedNode} node
 * @param {{ w?: number, h?: number }} [avail]
 * @returns {{ w: number, h: number }}
 */
export function measure(node, avail) {
  const s = strategyFor(node.component);
  let base;
  if (isContainer(node)) {
    base = measureContainer(node, specFor(node), avail);
  } else {
    const ratio = typeof s.aspect === 'function' ? s.aspect(node) : undefined;
    if (ratio && avail && Number.isFinite(avail.w)) base = { w: /** @type {number} */ (avail.w), h: /** @type {number} */ (avail.w) / ratio };
    else if (ratio && avail && Number.isFinite(avail.h)) base = { w: /** @type {number} */ (avail.h) * ratio, h: /** @type {number} */ (avail.h) };
    else if (typeof s.intrinsic === 'function') base = s.intrinsic(node, avail);
    else base = { w: 0, h: 0 };
  }

  // A surface/leaf may declare a minimum so an empty one (e.g. a bare Card in a
  // grid) still draws at a sensible size rather than collapsing to nothing.
  // `minSize` may be a static `{w,h}` OR a predicate `(node) => {w,h}`, mirroring
  // how `block` may be a function -- a per-node minimum lets an element floor its
  // size by a prop (Dialog's `size` breakpoint). A non-finite floor is ignored so
  // a malformed minSize can never poison the geometry (a NaN dimension feeds an
  // unbounded fill in the renderer -- the Dialog-then-Snackbar OOM, this migration).
  if (s.minSize) {
    const min = typeof s.minSize === 'function' ? s.minSize(node) : s.minSize;
    const mw = Number.isFinite(min?.w) ? min.w : 0;
    const mh = Number.isFinite(min?.h) ? min.h : 0;
    base = { w: Math.max(base.w, mw), h: Math.max(base.h, mh) };
  }

  // Explicit px tokens pin the size; %/*/flex resolve only in `place`.
  const sz = node.size;
  if (sz?.w?.unit === 'px') base = { ...base, w: /** @type {number} */ (sz.w.value) };
  if (sz?.h?.unit === 'px') base = { ...base, h: /** @type {number} */ (sz.h.value) };
  return base;
}

/**
 * Measure a container, threading the available cross-axis space down to children
 * so aspect-derived heights propagate up (SPEC ss.4).
 * @param {ResolvedNode} node
 * @param {{ axis:string, pad?:number, gap?:number, cols?:number }} spec
 * @param {{ w?: number, h?: number }} [avail]
 * @returns {{ w: number, h: number }}
 */
function measureContainer(node, spec, avail) {
  const pad = spec.pad ?? 0;
  const gap = spec.gap ?? 0;
  // Overlay children are OUT OF FLOW: they add nothing to the parent's content
  // size and seed no gap. Measuring over the flow kids only is what makes a
  // container's size identical whether or not a Dialog/Drawer/Scrollbar overlays
  // it (the regression guard: with no overlays this is `node.children` verbatim).
  const kids = (node.children ?? []).filter((k) => !isOverlay(k));
  const totalGap = gap * Math.max(0, kids.length - 1);

  if (spec.axis === 'row') {
    const innerH = avail && Number.isFinite(avail.h) ? /** @type {number} */ (avail.h) - 2 * pad : undefined;
    const sizes = kids.map((k) => measure(k, innerH != null ? { h: innerH } : undefined));
    const w = sizes.reduce((a, sz) => a + sz.w, 0) + totalGap;
    const h = innerH != null ? innerH : sizes.reduce((a, sz) => Math.max(a, sz.h), 0);
    return { w: w + 2 * pad, h: h + 2 * pad };
  }
  if (spec.axis === 'grid') {
    const cols = Math.max(1, Math.floor(spec.cols ?? 1));
    const innerW = avail && Number.isFinite(avail.w) ? /** @type {number} */ (avail.w) - 2 * pad : undefined;
    const cellW = innerW != null ? (innerW - gap * (cols - 1)) / cols : undefined;
    const sizes = kids.map((k) => measure(k, cellW != null ? { w: cellW } : undefined));
    const cw = sizes.reduce((a, sz) => Math.max(a, sz.w), 0);
    const ch = sizes.reduce((a, sz) => Math.max(a, sz.h), 0);
    const rows = Math.ceil(kids.length / cols) || 0;
    const w = innerW != null ? innerW : cols * cw + gap * (cols - 1);
    const h = rows * ch + gap * Math.max(0, rows - 1);
    return { w: w + 2 * pad, h: h + 2 * pad };
  }
  // col
  const innerW = avail && Number.isFinite(avail.w) ? /** @type {number} */ (avail.w) - 2 * pad : undefined;
  const sizes = kids.map((k) => measure(k, innerW != null ? { w: innerW } : undefined));
  const w = innerW != null ? innerW : sizes.reduce((a, sz) => Math.max(a, sz.w), 0);
  const h = sizes.reduce((a, sz) => a + sz.h, 0) + totalGap;
  return { w: w + 2 * pad, h: h + 2 * pad };
}

// --- pass 2: placement (top-down) --------------------------------------------

/**
 * Place `node` into an allocated `region`, returning its absolute Box (and,
 * for containers, its arranged children).
 * @param {ResolvedNode} node @param {Rect} region @returns {Box}
 */
export function place(node, region) {
  /** @type {Box} */
  const box = { x: region.x, y: region.y, w: region.w, h: region.h, node, children: [] };
  if (isContainer(node)) {
    const spec = specFor(node);
    const pad = spec.pad ?? 0;
    const content = { x: region.x + pad, y: region.y + pad, w: region.w - 2 * pad, h: region.h - 2 * pad };
    const kids = node.children ?? [];
    // OUT-OF-FLOW split: flow kids arrange exactly as before (so an overlay-free
    // container is byte-identical -- `flowKids` then equals `kids`); overlay kids
    // are placed parent-relative afterward and appended LAST in document order.
    const flowKids = kids.filter((k) => !isOverlay(k));
    const overlayKids = kids.filter((k) => isOverlay(k));
    box.children = spec.axis === 'grid' ? arrangeGrid(flowKids, content, spec) : arrangeLinear(flowKids, content, spec);
    for (const child of overlayKids) box.children.push(placeOverlay(child, content));
  }
  return box;
}

/**
 * Place one OUT-OF-FLOW child against its parent's `content` rect.
 *
 * The subtree is measured at its CONTENT size (bare `measure`, no avail), so a
 * content-/breakpoint-sized overlay keeps its own width rather than stretching to
 * the parent -- a `col`/`row` container handed an avail extent fills it (the
 * in-flow `block` behaviour), which would defeat a Dialog's `size`. PARENT-RELATIVE
 * sizing is the ELEMENT's job: `overlayPlacement(node, content, measured)` gets the
 * parent content rect and returns the final box, so a fullScreen Dialog fills the
 * parent, a Drawer docks 100% to an edge, a Scrollbar pins the right edge -- each
 * computes its own extent from `content`. (Note `%`/`fill` sizing tokens are
 * resolved in arrangeLinear, which overlays bypass; an overlay that wants a `%`
 * extent derives it in its own `overlayPlacement` from `content`.) The engine stays
 * vocabulary-free. The returned rect is used VERBATIM (place() does not re-measure),
 * so the element's w/h are final.
 *
 * The parent content rect is annotated onto `node.overlayParent` so the element's
 * render can paint a parent-spanning scrim behind itself (a Dialog's modal
 * backdrop) without the render facade threading the parent through -- the same
 * node-annotation pattern as `node.icons`. A malformed overlay with no placement
 * hook degrades to its content size at the parent origin rather than throwing
 * (CONVENTION s.11). @param {ResolvedNode} node @param {Rect} content @returns {Box}
 */
function placeOverlay(node, content) {
  const s = strategyFor(node.component);
  const measured = measure(node);
  node.overlayParent = { ...content };
  const rect = typeof s.overlayPlacement === 'function'
    ? s.overlayPlacement(node, content, measured)
    : { x: content.x, y: content.y, w: measured.w, h: measured.h };
  return place(node, rect);
}

/**
 * @param {ResolvedNode[]} children @param {Rect} content
 * @param {{ axis:string, gap?:number, reverse?:boolean, mainAlign?:'start'|'end'|'center' }} spec @returns {Box[]}
 */
function arrangeLinear(children, content, spec) {
  const horiz = spec.axis === 'row';
  const gap = spec.gap ?? 0;
  const mainAvail = horiz ? content.w : content.h;
  const crossAvail = horiz ? content.h : content.w;
  const totalGap = gap * Math.max(0, children.length - 1);

  const items = children.map((child) => {
    const s = strategyFor(child.component);
    const sz = child.size;
    const tok = horiz ? sz?.w : sz?.h;
    let main = null;
    let flex = 0;
    if (tok?.unit === 'px') main = tok.value;
    else if (tok?.unit === '%') main = (/** @type {number} */ (tok.value) / 100) * mainAvail;
    else if (tok?.unit === 'fill') flex = 1;
    else if (tok?.unit === 'flex') flex = /** @type {number} */ (tok.value);
    if (main == null && flex === 0 && s.flex === true) flex = 1; // a flexible filler (Spacer, ss.5.2)
    if (main == null && flex === 0) {
      // Measure against the cross extent this child will actually get, so an
      // aspect-locked subtree (Img `ratio=`) reserves the right main extent.
      const cross = crossExtent(child, horiz, crossAvail, mainAvail);
      const m = measure(child, horiz ? { h: cross } : { w: cross });
      main = horiz ? m.w : m.h;
    }
    return { child, main: /** @type {number} */ (main), flex };
  });

  const fixed = items.reduce((a, i) => a + (i.flex ? 0 : i.main), 0);
  const totalFlex = items.reduce((a, i) => a + i.flex, 0);
  const leftover = Math.max(0, mainAvail - fixed - totalGap);
  for (const i of items) if (i.flex > 0) i.main = totalFlex ? (leftover * i.flex) / totalFlex : 0;

  const boxes = [];
  // row-reverse / column-reverse: flip placement order along the main axis. Flex
  // weights, leftover and totalGap are all computed order-independently above, so
  // reversing here only mirrors visual order (Stack `-reverse` directions, ss.5.2).
  const order = spec.reverse ? [...items].reverse() : items;
  // mainAlign packs the children toward the start (default), end, or center of the
  // main axis by offsetting the start cursor by the free space. Only meaningful
  // with NO flex child -- a flex/`*`/Spacer already absorbs `leftover` into its own
  // size, so the offset is then 0 (flex wins; otherwise the free space would be
  // double-counted). `start` keeps cursor at the content origin, so every existing
  // container is byte-identical. Used by DialogActions (`end`, MUI right-alignment).
  const align = totalFlex === 0 ? spec.mainAlign : 'start';
  const startOffset = align === 'end' ? leftover : align === 'center' ? leftover / 2 : 0;
  let cursor = (horiz ? content.x : content.y) + startOffset;
  const end = content.x + content.w;
  for (const i of order) {
    const cross = crossExtent(i.child, horiz, crossAvail, mainAvail);
    // A row clamps each child to the space remaining inside the parent: an
    // overcrowded row squeezes its trailing children (whose labels then trim to
    // an ellipsis) instead of letting boxes spill past the right edge. Columns
    // are left to overflow vertically -- there is no vertical analogue of text
    // truncation, so squashing heights would pile glyphs up instead. The
    // sub-pixel tolerance keeps fitting rows (e.g. equal-flex cells) at their
    // exact computed sizes despite accumulated float error in `cursor`.
    const remaining = end - cursor;
    const main = horiz && i.main > remaining + 1e-6 ? Math.max(0, remaining) : i.main;
    // Row items center on the cross (vertical) axis, matching MUI; column items
    // align to the start. Block children fill the cross axis either way.
    const region = horiz
      ? { x: cursor, y: content.y + (crossAvail - cross) / 2, w: main, h: cross }
      : { x: content.x, y: cursor, w: cross, h: main };
    boxes.push(place(i.child, region));
    cursor += main + gap;
  }
  return boxes;
}

/**
 * Cross-axis extent for a child: explicit token, else an aspect-derived extent
 * (when the child pins only its main axis), else stretch (block / container) or
 * intrinsic (inline leaf).
 * @param {ResolvedNode} child @param {boolean} horiz @param {number} crossAvail
 * @param {number} [mainAvail]  main-axis space, so a `%` main extent can be
 *   resolved here for the aspect-derive branch
 * @returns {number}
 */
function crossExtent(child, horiz, crossAvail, mainAvail) {
  const s = strategyFor(child.component);
  const tok = horiz ? child.size?.h : child.size?.w;
  if (tok?.unit === 'px') return tok.value;
  if (tok?.unit === '%') return (/** @type {number} */ (tok.value) / 100) * crossAvail;
  if (tok) return crossAvail; // fill / flex on the cross axis
  // An aspect leaf (Img `ratio=`) that pins ONLY its main axis derives its cross
  // from the ratio instead of block-filling: in a row a `100px` width is the main
  // extent, so the height is 100/ratio. Gated tightly -- aspect function, finite
  // ratio, an explicit main token (no explicit cross token, handled above), and a
  // px/% main whose extent is known here (a flex/* main isn't resolved until after
  // distribution, so it falls through to block-fill). measure() owns the ratio
  // math (avail.w -> h, avail.h -> w), so the formula lives in exactly one place.
  const mainTok = horiz ? child.size?.w : child.size?.h;
  const ratio = typeof s.aspect === 'function' ? s.aspect(child) : undefined;
  if (ratio && Number.isFinite(ratio) && mainTok) {
    let mainExtent = null;
    if (mainTok.unit === 'px') mainExtent = /** @type {number} */ (mainTok.value);
    else if (mainTok.unit === '%' && mainAvail != null)
      mainExtent = (/** @type {number} */ (mainTok.value) / 100) * mainAvail;
    if (mainExtent != null)
      return measure(child, horiz ? { w: mainExtent } : { h: mainExtent })[horiz ? 'h' : 'w'];
  }
  // `block` may be a static boolean OR a per-node predicate (e.g. Button stretches
  // only when fullWidth). Containers stretch to fill by default.
  const block = typeof s.block === 'function' ? s.block(child) : (s.block ?? isContainer(child));
  if (block) return crossAvail;
  // An inline leaf keeps its intrinsic cross size, but never wider than the space
  // available -- a long label is clamped rather than overflowing the parent.
  return Math.min(measure(child)[horiz ? 'h' : 'w'], crossAvail);
}

/**
 * @param {ResolvedNode[]} children @param {Rect} content
 * @param {{ gap?:number, cols?:number }} spec @returns {Box[]}
 */
function arrangeGrid(children, content, spec) {
  const cols = Math.max(1, Math.floor(spec.cols ?? 1));
  const gap = spec.gap ?? 0;
  const rows = Math.ceil(children.length / cols) || 1;
  const cellW = (content.w - gap * (cols - 1)) / cols;
  const sizes = children.map((c) => measure(c, { w: cellW }));

  const rowH = [];
  for (let r = 0; r < rows; r++) {
    let mh = 0;
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx < children.length) mh = Math.max(mh, sizes[idx].h);
    }
    rowH.push(mh);
  }

  const boxes = [];
  let y = content.y;
  for (let r = 0; r < rows; r++) {
    let x = content.x;
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= children.length) break;
      boxes.push(place(children[idx], { x, y, w: cellW, h: rowH[r] }));
      x += cellW + gap;
    }
    y += rowH[r] + gap;
  }
  return boxes;
}

// --- frame sizing & the document layer ---------------------------------------

/** @param {Frame} frame @returns {{ w: number, h: number }} */
function frameSize(frame) {
  if (typeof frame.props.w === 'number' && typeof frame.props.h === 'number')
    return { w: frame.props.w, h: frame.props.h };
  if (frame.preset && PRESET_SIZES[frame.preset]) return { ...PRESET_SIZES[frame.preset] };
  return { ...DEFAULT_FRAME };
}

/**
 * Resolve a frame's `background=#id` chain, deepest-first (SPEC ss.5.1.1).
 * Missing target -> warning + foreground only; cycle -> warning + break.
 * @param {LaidOutFrame} frame
 * @param {Map<string, LaidOutFrame>} byId
 * @param {import('./errors.js').Diagnostic[]} diags
 * @returns {LaidOutFrame[]}
 */
function backgroundChain(frame, byId, diags) {
  const chain = [];
  const seen = new Set([frame.id]);
  let current = frame;
  while (current.frame.props.background) {
    const targetId = current.frame.props.background;
    const target = byId.get(targetId);
    if (!target) {
      diags.push(diagnostic('warning', `background frame "#${targetId}" not found`, { line: current.frame.line }));
      break;
    }
    if (seen.has(targetId)) {
      diags.push(diagnostic('warning', `background cycle detected at "#${targetId}"; breaking`, { line: current.frame.line }));
      break;
    }
    seen.add(targetId);
    chain.unshift(target); // deepest-first: prepend so it paints first
    current = target;
  }
  return chain;
}

/**
 * Depth-first search of a laid-out box tree for the element carrying `#id`.
 * Document order: the first declaration wins, matching resolve's duplicate-id
 * warning. (The synthetic frame-root node never carries an element id.)
 * @param {Box} box @param {string} id @returns {Box|null}
 */
function findAnchorBox(box, id) {
  if (box.node.id === id) return box;
  for (const child of box.children) {
    const hit = findAnchorBox(child, id);
    if (hit) return hit;
  }
  return null;
}

/**
 * Third pass -- anchored composition (tasks/FOREGROUND.md; SPEC ss.5.1.2
 * proposed). A frame with `background=#B anchor=#a` adopts the laid-out box of
 * the element `#a` found in its background chain (nearest background first,
 * shadowing deeper frames) and takes its DIRECT background's canvas w/h as its
 * own. Frames re-place shortest-chain-first: a chain strictly extends its
 * background's chain, so a transitively anchored background is already in
 * final coordinates before its foreground searches it. All failures are soft
 * warnings; the frame keeps its legacy top-left layout.
 * @param {LaidOutFrame[]} frames
 * @param {import('./errors.js').Diagnostic[]} diags
 */
function placeAnchored(frames, diags) {
  const anchored = frames
    .filter((f) => typeof f.frame.props.anchor === 'string')
    .sort((a, b) => a.backgroundChain.length - b.backgroundChain.length); // backgrounds re-place first
  for (const f of anchored) {
    const anchorId = /** @type {string} */ (f.frame.props.anchor);
    if (!f.frame.props.background) {
      diags.push(diagnostic('warning', `anchor "#${anchorId}" requires background=`, { line: f.frame.line }));
      continue;
    }
    let hit = null; // nearest background first: the chain is stored deepest-first
    for (let i = f.backgroundChain.length - 1; i >= 0 && !hit; i--)
      hit = findAnchorBox(f.backgroundChain[i].root, anchorId);
    if (!hit) {
      diags.push(diagnostic('warning', `anchor "#${anchorId}" not found in background chain of "#${f.id ?? '?'}"`, { line: f.frame.line }));
      continue; // legacy top-left layout stands
    }
    if (f.frame.preset !== undefined || typeof f.frame.props.w === 'number' || typeof f.frame.props.h === 'number')
      diags.push(diagnostic('warning', `preset/size ignored: frame "#${f.id ?? '?'}" is sized by anchor "#${anchorId}"`, { line: f.frame.line }));
    const bg = f.backgroundChain[f.backgroundChain.length - 1]; // direct background drives the canvas
    f.w = bg.w;
    f.h = bg.h;
    f.root = place(f.root.node, { x: hit.x, y: hit.y, w: hit.w, h: hit.h });
  }
}

/**
 * @param {Document} doc
 * @param {object} [options]
 * @returns {LaidOutFrame[]}
 */
export function layout(doc, options = {}) {
  void options;
  /** @type {LaidOutFrame[]} */
  const frames = doc.frames.map((frame) => {
    const size = frameSize(frame);
    /** @type {ResolvedNode} */
    const rootNode = { component: 'Wireframe', props: frame.props, children: frame.children, line: frame.line };
    return {
      id: frame.id,
      w: size.w,
      h: size.h,
      root: place(rootNode, { x: 0, y: 0, w: size.w, h: size.h }),
      frame,
      visible: frame.props.visible !== false,
      backgroundChain: [],
    };
  });

  const byId = new Map(frames.filter((f) => f.id).map((f) => [/** @type {string} */ (f.id), f]));
  for (const f of frames) f.backgroundChain = backgroundChain(f, byId, doc.diagnostics);
  placeAnchored(frames, doc.diagnostics);
  return frames;
}
