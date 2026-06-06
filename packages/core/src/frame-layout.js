// @ts-check
import { FRAME_FLOW_GAP, FRAME_SIBLING_GAP, FRAME_COMPONENT_GAP } from './metrics.js';

/**
 * Stage (4b) -- FRAME LAYOUT.  Position several frames as a flow chart.
 *
 * When a file declares more than one frame, they are arranged like a Mermaid
 * flowchart over the `to=#id` navigation graph (SPEC ss.7.4) instead of being
 * stacked. This is a thin layered (Sugiyama-lite) solver, pure and deterministic
 * -- every tie breaks on declaration order, so the same source always yields the
 * same coordinates (no `Math.random`/`Date.now`).
 *
 * It runs after `layout()` (which sizes each frame) and reads the frame-level
 * graph from `flow.js`. It MUTATES each visible `LaidOutFrame`, adding absolute
 * `{x, y}`; `render.js` then places frames there. Invisible frames (`visible=
 * false`, e.g. a `#shell` used only as a `background=` template) are not graph
 * nodes and are left unpositioned -- they still compose as backgrounds.
 *
 * All geometry is computed on a MAIN axis (rank progression) and a CROSS axis
 * (spread within a rank); only the final assignment maps to `{x, y}`, so the only
 * difference between TD and LR is one swap:
 *   - TD (top-down):  main = +y, cross = +x
 *   - LR (left-right): main = +x, cross = +y
 *
 * @typedef {import('./layout.js').LaidOutFrame} LaidOutFrame
 * @typedef {import('./flow.js').FlowGraph} FlowGraph
 *
 * @typedef {'TD'|'LR'} Direction
 * @typedef {{ main: number, cross: number }} MainCross
 */

/**
 * Assign `{x, y}` to every visible frame by laying the navigation graph out as a
 * flow chart. Mutates and also returns `frames`.
 * @param {LaidOutFrame[]} frames           all frames from layout() (incl. invisible)
 * @param {FlowGraph} [graph]               frame-level nav graph from toFlowGraph()
 * @param {{ direction?: Direction }} [options]
 * @returns {LaidOutFrame[]}
 */
export function layoutFrames(frames, graph = { nodes: [], edges: [] }, options = {}) {
  const direction = options.direction === 'LR' ? 'LR' : 'TD';
  const visible = frames.filter((f) => f.visible);
  if (visible.length === 0) return frames;

  // Declaration order across ALL frames -- the single source of determinism.
  const order = new Map(frames.map((f, i) => [f, i]));
  const idx = (/** @type {LaidOutFrame} */ f) => order.get(f) ?? 0;

  // id -> visible frame (first declaration wins on the unlikely duplicate id).
  const byId = new Map();
  for (const f of visible) if (f.id != null && !byId.has(f.id)) byId.set(f.id, f);

  // Directed nav edges between two distinct, visible, anchored frames. Edges to
  // an undefined/invisible target (a dangling `to=#x`) and self-loops drop out.
  /** @type {[LaidOutFrame, LaidOutFrame][]} */
  const edges = [];
  for (const e of graph.edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (a && b && a !== b) edges.push([a, b]);
  }

  // Lay out each connected component on its own, then pack them along the cross
  // axis (a single shelf) in declaration order.
  let crossCursor = 0;
  for (const comp of components(visible, edges, idx)) {
    const local = layoutComponent(comp, edges, idx, direction);
    for (const [f, p] of local.pos) {
      const cross = p.cross + crossCursor;
      if (direction === 'TD') { f.x = cross; f.y = p.main; }
      else { f.x = p.main; f.y = cross; }
    }
    crossCursor += local.crossSpan + FRAME_COMPONENT_GAP;
  }
  return frames;
}

/**
 * Split frames into connected components over the UNDIRECTED edge set. Frames
 * with no edges (anonymous frames, or anchored frames nothing links to) come out
 * as singletons. Components are returned in ascending declaration order of their
 * earliest member, and each component's members are sorted the same way.
 * @param {LaidOutFrame[]} visible
 * @param {[LaidOutFrame, LaidOutFrame][]} edges
 * @param {(f: LaidOutFrame) => number} idx
 * @returns {LaidOutFrame[][]}
 */
function components(visible, edges, idx) {
  const adj = new Map(visible.map((f) => [f, /** @type {LaidOutFrame[]} */ ([])]));
  for (const [a, b] of edges) { adj.get(a)?.push(b); adj.get(b)?.push(a); }

  const seen = new Set();
  const comps = [];
  for (const start of [...visible].sort((a, b) => idx(a) - idx(b))) {
    if (seen.has(start)) continue;
    const comp = [];
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const u = /** @type {LaidOutFrame} */ (stack.pop());
      comp.push(u);
      for (const v of adj.get(u) ?? []) if (!seen.has(v)) { seen.add(v); stack.push(v); }
    }
    comp.sort((a, b) => idx(a) - idx(b));
    comps.push(comp);
  }
  return comps;
}

/**
 * Layered layout of one connected component, in main/cross coordinates with the
 * near corner at (0, 0).
 * @param {LaidOutFrame[]} comp
 * @param {[LaidOutFrame, LaidOutFrame][]} allEdges
 * @param {(f: LaidOutFrame) => number} idx
 * @param {Direction} direction
 * @returns {{ pos: Map<LaidOutFrame, MainCross>, crossSpan: number, mainSpan: number }}
 */
function layoutComponent(comp, allEdges, idx, direction) {
  const crossExt = (/** @type {LaidOutFrame} */ f) => (direction === 'TD' ? f.w : f.h);
  const mainExt = (/** @type {LaidOutFrame} */ f) => (direction === 'TD' ? f.h : f.w);

  if (comp.length === 1) {
    const f = comp[0];
    return { pos: new Map([[f, { main: 0, cross: 0 }]]), crossSpan: crossExt(f), mainSpan: mainExt(f) };
  }

  const inComp = new Set(comp);
  const edges = allEdges.filter(([a, b]) => inComp.has(a) && inComp.has(b));
  const key = (/** @type {LaidOutFrame} */ a, /** @type {LaidOutFrame} */ b) => `${idx(a)}>${idx(b)}`;

  // Directed adjacency over ALL edges (sorted) -- used only for cycle breaking.
  const out = new Map(comp.map((f) => [f, /** @type {LaidOutFrame[]} */ ([])]));
  for (const [a, b] of edges) out.get(a)?.push(b);
  for (const list of out.values()) list.sort((a, b) => idx(a) - idx(b));

  // 1. Break cycles: DFS in declaration order; an edge into a GRAY node is a back
  //    edge (e.g. a "Back" link) -- excluded from ranking, still drawn later.
  const reversed = new Set();
  const color = new Map(); // undefined=white, 0=gray, 1=black
  const dfs = (/** @type {LaidOutFrame} */ u) => {
    color.set(u, 0);
    for (const v of out.get(u) ?? []) {
      const c = color.get(v);
      if (c === 0) reversed.add(key(u, v));
      else if (c === undefined) dfs(v);
    }
    color.set(u, 1);
  };
  for (const s of [...comp].sort((a, b) => idx(a) - idx(b))) if (!color.has(s)) dfs(s);
  const fwd = edges.filter(([a, b]) => !reversed.has(key(a, b)));

  // 2. Longest-path ranking over the resulting DAG (Kahn): a frame sits one rank
  //    past its deepest predecessor, so every forward arrow points down a rank.
  const outF = new Map(comp.map((f) => [f, /** @type {LaidOutFrame[]} */ ([])]));
  const inN = new Map(comp.map((f) => [f, /** @type {LaidOutFrame[]} */ ([])]));
  const indeg = new Map(comp.map((f) => [f, 0]));
  for (const [a, b] of fwd) { outF.get(a)?.push(b); inN.get(b)?.push(a); indeg.set(b, (indeg.get(b) ?? 0) + 1); }
  const rank = new Map(comp.map((f) => [f, 0]));
  const indegLeft = new Map(indeg);
  let queue = comp.filter((f) => indegLeft.get(f) === 0).sort((a, b) => idx(a) - idx(b));
  while (queue.length) {
    const u = /** @type {LaidOutFrame} */ (queue.shift());
    for (const v of outF.get(u) ?? []) {
      if ((rank.get(v) ?? 0) < (rank.get(u) ?? 0) + 1) rank.set(v, (rank.get(u) ?? 0) + 1);
      indegLeft.set(v, (indegLeft.get(v) ?? 0) - 1);
      if (indegLeft.get(v) === 0) queue.push(v);
    }
  }
  const maxRank = Math.max(...comp.map((f) => rank.get(f) ?? 0));

  // ranks[r] -- frames at rank r, seeded in declaration order.
  const ranks = Array.from({ length: maxRank + 1 }, () => /** @type {LaidOutFrame[]} */ ([]));
  for (const f of [...comp].sort((a, b) => idx(a) - idx(b))) ranks[rank.get(f) ?? 0].push(f);

  // 3. Crossing reduction: a few fixed median sweeps (down then up). Deterministic
  //    -- order each rank by the median position of its neighbors in the adjacent
  //    rank, ties broken by declaration order.
  for (let it = 0; it < 4; it++) {
    const down = it % 2 === 0;
    const seq = down ? range(1, maxRank) : range(maxRank - 1, 0);
    for (const r of seq) {
      const adjRank = down ? ranks[r - 1] : ranks[r + 1];
      const posOf = new Map(adjRank.map((f, i) => [f, i]));
      const neigh = down ? inN : outF;
      const med = new Map(ranks[r].map((f) => [f, median(neigh.get(f) ?? [], posOf)]));
      ranks[r] = sortByKey(ranks[r], med, idx);
    }
  }

  // 4. Coordinates. Pack each rank along the cross axis using real frame extents,
  //    then center the ranks against the widest one. Advance the main axis by the
  //    tallest frame in the previous rank.
  const localCross = new Map();
  const rankCrossSpan = [];
  for (let r = 0; r <= maxRank; r++) {
    let cursor = 0;
    for (const f of ranks[r]) { localCross.set(f, cursor); cursor += crossExt(f) + FRAME_SIBLING_GAP; }
    rankCrossSpan[r] = Math.max(0, cursor - FRAME_SIBLING_GAP);
  }
  const maxCross = Math.max(...rankCrossSpan);
  /** @type {Map<LaidOutFrame, MainCross>} */
  const pos = new Map();
  let main = 0;
  for (let r = 0; r <= maxRank; r++) {
    const offset = Math.round((maxCross - rankCrossSpan[r]) / 2);
    let rankMain = 0;
    for (const f of ranks[r]) {
      pos.set(f, { main, cross: (localCross.get(f) ?? 0) + offset });
      rankMain = Math.max(rankMain, mainExt(f));
    }
    main += rankMain + FRAME_FLOW_GAP;
  }
  return { pos, crossSpan: maxCross, mainSpan: Math.max(0, main - FRAME_FLOW_GAP) };
}

/** Inclusive integer range, ascending or descending. @param {number} a @param {number} b @returns {number[]} */
function range(a, b) {
  const out = [];
  if (a <= b) for (let i = a; i <= b; i++) out.push(i);
  else for (let i = a; i >= b; i--) out.push(i);
  return out;
}

/**
 * Left-median of a node's neighbor positions; undefined if it has none.
 * @param {LaidOutFrame[]} neighbors
 * @param {Map<LaidOutFrame, number>} posOf
 * @returns {number|undefined}
 */
function median(neighbors, posOf) {
  const ps = neighbors.map((n) => posOf.get(n)).filter((p) => p !== undefined).sort((a, b) => a - b);
  return ps.length ? ps[Math.floor((ps.length - 1) / 2)] : undefined;
}

/**
 * Sort by a numeric key (neighbor-median); nodes with no key keep to the end, and
 * ties (and missing keys) break by declaration order -- fully deterministic.
 * @param {LaidOutFrame[]} items
 * @param {Map<LaidOutFrame, number|undefined>} keyMap
 * @param {(f: LaidOutFrame) => number} idx
 * @returns {LaidOutFrame[]}
 */
function sortByKey(items, keyMap, idx) {
  return [...items].sort((a, b) => {
    const ka = keyMap.get(a); const kb = keyMap.get(b);
    const na = ka === undefined ? Infinity : ka;
    const nb = kb === undefined ? Infinity : kb;
    return na !== nb ? na - nb : idx(a) - idx(b);
  });
}
