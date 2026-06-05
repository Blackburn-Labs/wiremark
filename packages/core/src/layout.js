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
 */

/** @param {string} name @returns {import('./elements/common.js').ComponentDef & {intrinsic?:Function, layoutSpec?:Function, render?:Function, aspect?:Function, block?:boolean, flex?:boolean, minSize?:{w:number,h:number}}} */
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
    else if (typeof s.intrinsic === 'function') base = s.intrinsic(node);
    else base = { w: 0, h: 0 };
  }

  // A surface/leaf may declare a minimum so an empty one (e.g. a bare Card in a
  // grid) still draws at a sensible size rather than collapsing to nothing.
  if (s.minSize) base = { w: Math.max(base.w, s.minSize.w), h: Math.max(base.h, s.minSize.h) };

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
  const kids = node.children ?? [];
  const totalGap = gap * Math.max(0, kids.length - 1);

  if (spec.axis === 'row') {
    const innerH = avail && Number.isFinite(avail.h) ? /** @type {number} */ (avail.h) - 2 * pad : undefined;
    const sizes = kids.map((k) => measure(k, innerH != null ? { h: innerH } : undefined));
    const w = sizes.reduce((a, sz) => a + sz.w, 0) + totalGap;
    const h = innerH != null ? innerH : sizes.reduce((a, sz) => Math.max(a, sz.h), 0);
    return { w: w + 2 * pad, h: h + 2 * pad };
  }
  if (spec.axis === 'grid') {
    const cols = Math.max(1, spec.cols ?? 1);
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
    box.children = spec.axis === 'grid' ? arrangeGrid(kids, content, spec) : arrangeLinear(kids, content, spec);
  }
  return box;
}

/**
 * @param {ResolvedNode[]} children @param {Rect} content
 * @param {{ axis:string, gap?:number }} spec @returns {Box[]}
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
      const cross = crossExtent(child, horiz, crossAvail);
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
  let cursor = horiz ? content.x : content.y;
  for (const i of items) {
    const cross = crossExtent(i.child, horiz, crossAvail);
    // Row items center on the cross (vertical) axis, matching MUI; column items
    // align to the start. Block children fill the cross axis either way.
    const region = horiz
      ? { x: cursor, y: content.y + (crossAvail - cross) / 2, w: i.main, h: cross }
      : { x: content.x, y: cursor, w: cross, h: i.main };
    boxes.push(place(i.child, region));
    cursor += i.main + gap;
  }
  return boxes;
}

/**
 * Cross-axis extent for a child: explicit token, else stretch (block / container)
 * or intrinsic (inline leaf).
 * @param {ResolvedNode} child @param {boolean} horiz @param {number} crossAvail
 * @returns {number}
 */
function crossExtent(child, horiz, crossAvail) {
  const s = strategyFor(child.component);
  const tok = horiz ? child.size?.h : child.size?.w;
  if (tok?.unit === 'px') return tok.value;
  if (tok?.unit === '%') return (/** @type {number} */ (tok.value) / 100) * crossAvail;
  if (tok) return crossAvail; // fill / flex on the cross axis
  const block = s.block ?? isContainer(child); // containers stretch to fill by default
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
  const cols = Math.max(1, spec.cols ?? 1);
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
  return frames;
}
