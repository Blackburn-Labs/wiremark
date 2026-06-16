// @ts-check
import {
  measureText, CONNECTOR_SPREAD, FRAME_FLOW_GAP, CHANNEL_TRACK_GAP, CHANNEL_PAD,
  FLOW_LANE_MARGIN, FLOW_LANE_GAP, CONNECTOR_LABEL_PAD, CONNECTOR_LABEL_CLEAR,
  CONNECTOR_LABEL_STAGGER,
} from './metrics.js';

/**
 * Channel/track connector routing for multi-frame flows (tasks/FLOW.md).
 *
 * A leaf module (imports only `metrics.js`, per the no-cycle convention) shared
 * by BOTH layout stages so the two agree on geometry without plumbing a plan
 * object across the pipeline:
 *
 *   - `frame-layout.js` calls `planFlow()` BEFORE it assigns main coordinates, to
 *     learn each inter-rank CHANNEL's required width and the cross-axis LANE
 *     reservations skip edges need.
 *   - `render.js` re-derives the same rank structure from the placed rects via
 *     `inferComponents()`, runs the IDENTICAL `planFlow()`, then `realizeRoutes()`
 *     turns the plan into absolute polylines.
 *
 * Both stages feed `planFlow` the same logical inputs (ranks, cross spans, face
 * lengths, edge declaration order) up to a UNIFORM cross shift, and every plan
 * decision is shift-invariant, so they compute byte-identical channel widths and
 * track orders. Recompute beats plumbing because a hand-built `placed` array in a
 * test then exercises the very code path production does.
 *
 * Everything works in MAIN/CROSS space (the same split frame-layout uses):
 *   - TD: main = +y (rank progression), cross = +x (spread within a rank)
 *   - LR: main = +x,                    cross = +y
 * A connector leaves a frame's main face, crosses the inter-rank channel on an
 * assigned parallel TRACK, and enters the next frame's main face. Skip-rank edges
 * detour onto a LANE outside the component's cross extent so they never cut a
 * frame they pass.
 *
 * @typedef {'TD'|'LR'} Direction
 * @typedef {{ x: number, y: number }} Point
 * @typedef {{ id: string, rank: number, cross0: number, cross1: number,
 *             mainNear?: number, mainFar?: number }} PlanNode
 * @typedef {{ from: string, to: string, label?: string, index: number }} PlanEdge
 */

const EPS = 0.5;

/* -------------------------------------------------------------------------- */
/*  Plan -- decisions that are identical in both stages (shift-invariant).     */
/* -------------------------------------------------------------------------- */

/**
 * Plan the routing for ONE connected component: classify each edge, anchor it on
 * its faces, assign tracks within each channel, size the channels, and reserve
 * lanes for skip edges. Reads only `id/rank/cross0/cross1` off each node (the
 * main coordinates are not needed to decide topology), so layout can call it with
 * provisional cross positions before it has placed anything on the main axis.
 *
 * @param {PlanNode[]} nodes
 * @param {PlanEdge[]} edges
 * @param {Direction} dir
 * @returns {{ maxRank: number, channelWidths: number[],
 *             lane: { lowExtent: number, highExtent: number }, routes: object[] }}
 */
export function planFlow(nodes, edges, dir) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const maxRank = nodes.reduce((m, n) => Math.max(m, n.rank), 0);
  const centerCross = (/** @type {PlanNode} */ n) => (n.cross0 + n.cross1) / 2;
  const faceLen = (/** @type {PlanNode} */ n) => n.cross1 - n.cross0;

  // Drawable edges (both ends present, distinct), in declaration order.
  /** @type {*[]} */
  const drawn = [];
  for (const e of edges) {
    const s = byId.get(e.from);
    const d = byId.get(e.to);
    if (!s || !d || s === d) continue;
    drawn.push({ ...e, s, d });
  }

  // A connector always uses a MAIN face -- the FAR (main+) face when it heads to a
  // deeper rank, the NEAR (main-) face when it heads to a shallower one -- so faces
  // follow the rank relation, never a center compare.
  for (const e of drawn) {
    const fwd = e.d.rank > e.s.rank;
    e.sFace = fwd ? 'far' : 'near';
    e.dFace = fwd ? 'near' : 'far';
    e.pair = pairKey(e.from, e.to);
  }

  // --- Classify by rank span: adjacent edges (|Δrank| == 1) cross a single
  // channel; skip edges (|Δrank| > 1) cross two channels with a lane between.
  for (const e of drawn) {
    const rs = e.s.rank, rd = e.d.rank;
    const diff = rd - rs;
    e.rankSpan = Math.abs(diff);
    if (e.rankSpan <= 1) {
      e.kind = 'adjacent';
      e.channel = Math.min(rs, rd);
    } else {
      e.kind = 'skip';
      const fwd = diff > 0;
      e.tailChannel = fwd ? rs : rs - 1;
      e.headChannel = fwd ? rd - 1 : rd;
    }
  }

  // --- Lane SIDES for skip edges. Side = the nearer cross edge by the two frames'
  // centres (decided BEFORE anchoring, so a skip can then anchor toward its lane).
  // Lane LEVELS are assigned lower down, once anchors are known.
  const skips = drawn.filter((e) => e.kind === 'skip');
  const crossMin = nodes.length ? Math.min(...nodes.map((n) => n.cross0)) : 0;
  const crossMax = nodes.length ? Math.max(...nodes.map((n) => n.cross1)) : 0;
  for (const e of skips) {
    const mean = (centerCross(e.s) + centerCross(e.d)) / 2;
    e.laneSide = (mean - crossMin) <= (crossMax - mean) ? 'low' : 'high';
  }

  // --- Anchors: per-pair slot ordering + intra-pair CONNECTOR_SPREAD clustering
  // (the scheme render.js used, lifted into cross space so both stages agree).
  // Intra-pair signed offset, applied the SAME way at both ends so a pair reads as
  // two close parallel lines; a lone edge gets 0.
  /** @type {Map<string, number[]>} */
  const byPair = new Map();
  drawn.forEach((e, i) => {
    const list = byPair.get(e.pair);
    if (list) list.push(i);
    else byPair.set(e.pair, [i]);
  });
  const poff = drawn.map(() => 0);
  for (const idxs of byPair.values()) {
    [...idxs]
      .sort((a, b) => (edgeKey(drawn[a]) < edgeKey(drawn[b]) ? -1 : 1))
      .forEach((i, t) => { poff[i] = (t - (idxs.length - 1) / 2) * CONNECTOR_SPREAD; });
  }

  // On each (frame, main-face), order the distinct pairs by the cross they aim at,
  // then hand each a slot fraction. A SKIP edge aims at its LANE side, not its far
  // target, so it anchors at the lane-side extreme of the face -- its short run to
  // the lane then hugs the side instead of sweeping across centred siblings.
  const aimOf = (/** @type {*} */ e, /** @type {PlanNode} */ other) =>
    e.kind === 'skip' ? (e.laneSide === 'low' ? -Infinity : Infinity) : centerCross(other);
  /** @type {Map<string, Map<string, number>>} */
  const facePairs = new Map();
  const note = (/** @type {string} */ fk, /** @type {string} */ pair, /** @type {number} */ aim) => {
    let m = facePairs.get(fk);
    if (!m) { m = new Map(); facePairs.set(fk, m); }
    if (!m.has(pair)) m.set(pair, aim);
  };
  for (const e of drawn) {
    note(`${e.from}|${e.sFace}`, e.pair, aimOf(e, e.d));
    note(`${e.to}|${e.dFace}`, e.pair, aimOf(e, e.s));
  }
  /** @type {Map<string, Map<string, number>>} */
  const slot = new Map();
  for (const [fk, pairs] of facePairs) {
    const ordered = [...pairs.entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
    const fracs = new Map();
    ordered.forEach(([pair], j) => fracs.set(pair, (j + 1) / (ordered.length + 1)));
    slot.set(fk, fracs);
  }
  const fracOf = (/** @type {string} */ fk, /** @type {string} */ pair) =>
    /** @type {Map<string, number>} */ (slot.get(fk))?.get(pair) ?? 0.5;
  const anchorCross = (/** @type {PlanNode} */ n, /** @type {number} */ frac, /** @type {number} */ off) => {
    const len = faceLen(n);
    return n.cross0 + Math.max(4, Math.min(len - 4, len * frac + off));
  };
  drawn.forEach((e, i) => {
    e.tailCross = anchorCross(e.s, fracOf(`${e.from}|${e.sFace}`, e.pair), poff[i]);
    e.headCross = anchorCross(e.d, fracOf(`${e.to}|${e.dFace}`, e.pair), poff[i]);
    e.poff = poff[i];
    if (e.kind === 'adjacent') e.straight = Math.abs(e.tailCross - e.headCross) < EPS;
  });

  // --- Lane LEVELS (now that anchors are known). Nest by rank span, then by anchor
  // proximity to the lane side: the skip whose anchor sits NEAREST the side takes the
  // OUTERMOST lane. Ordering by declaration index instead let two same-pair / same-
  // span skips -- a back-link to an ancestor, or two links to one deep screen -- put
  // the nearer-anchored edge on the INNER lane, forcing it to sweep across the other
  // (a crossing). The key is a cross DIFFERENCE, so it stays shift-invariant; index
  // is the deterministic final tie-break. Level 0 is innermost (nearest the frames).
  const towardSide = (/** @type {*} */ e) =>
    (e.laneSide === 'low' ? -1 : 1) * (e.tailCross + e.headCross) / 2;
  let lowMax = -1, highMax = -1;
  for (const side of /** @type {const} */ (['low', 'high'])) {
    skips.filter((e) => e.laneSide === side)
      .sort((a, b) => a.rankSpan - b.rankSpan || towardSide(a) - towardSide(b) || a.index - b.index)
      .forEach((e, lvl) => {
        e.laneLevel = lvl;
        if (side === 'low') lowMax = Math.max(lowMax, lvl);
        else highMax = Math.max(highMax, lvl);
      });
  }
  for (const e of skips) {
    const reach = FLOW_LANE_MARGIN + e.laneLevel * FLOW_LANE_GAP;
    e.laneCross = e.laneSide === 'low' ? crossMin - reach : crossMax + reach;
  }
  const lane = {
    lowExtent: lowMax >= 0 ? FLOW_LANE_MARGIN + lowMax * FLOW_LANE_GAP : 0,
    highExtent: highMax >= 0 ? FLOW_LANE_MARGIN + highMax * FLOW_LANE_GAP : 0,
  };

  // --- Across-runs, grouped per channel. An adjacent edge contributes one run;
  // a skip edge contributes a stub run in each of its two channels. A run whose
  // two cross ends coincide is STRAIGHT and consumes no track.
  /** @type {Map<number, *[]>} */
  const channelRuns = new Map();
  const addRun = (/** @type {number} */ ch, /** @type {*} */ run) => {
    const list = channelRuns.get(ch);
    if (list) list.push(run);
    else channelRuns.set(ch, [run]);
  };
  for (const e of drawn) {
    if (e.kind === 'adjacent') {
      const fwd = e.d.rank > e.s.rank;
      addRun(e.channel, {
        e, role: 'adjacent', straight: e.straight,
        fromCross: e.tailCross, toCross: e.headCross,
        fromSide: fwd ? 'top' : 'bottom', toSide: fwd ? 'bottom' : 'top',
      });
    } else {
      const fwd = e.d.rank > e.s.rank;
      addRun(e.tailChannel, {
        e, role: 'skipTail', straight: false,
        fromCross: e.tailCross, toCross: e.laneCross,
        fromSide: fwd ? 'top' : 'bottom', toSide: 'lane',
      });
      addRun(e.headChannel, {
        e, role: 'skipHead', straight: false,
        fromCross: e.laneCross, toCross: e.headCross,
        fromSide: 'lane', toSide: fwd ? 'bottom' : 'top',
      });
    }
  }

  // --- Track assignment per channel: order the bending runs to minimise
  // crossings (then keep labels central), keeping each pair contiguous.
  for (const [, runs] of channelRuns) {
    const bending = runs.filter((r) => !r.straight);
    if (!bending.length) continue;
    const order = orderTracks(bending);
    const k = order.length;
    order.forEach((r, p) => {
      r.trackOffset = (p - (k - 1) / 2) * CHANNEL_TRACK_GAP;
      if (r.role === 'adjacent') r.e.adjTrackOffset = r.trackOffset;
      else if (r.role === 'skipTail') r.e.tailTrackOffset = r.trackOffset;
      else r.e.headTrackOffset = r.trackOffset;
    });
  }

  // --- Channel widths: hold the tracks plus padding, then widen for any label.
  const channelWidths = new Array(maxRank).fill(FRAME_FLOW_GAP);
  for (const [ch, runs] of channelRuns) {
    if (ch < 0 || ch >= maxRank) continue; // degenerate guard (hand-built rects)
    const k = runs.filter((r) => !r.straight).length;
    let w = Math.max(FRAME_FLOW_GAP, 2 * CHANNEL_PAD + Math.max(0, k - 1) * CHANNEL_TRACK_GAP);
    for (const r of runs) {
      if (!r.e.label || r.role === 'skipHead') continue; // a skip's label rides its tail run
      const ext = labelExtentMain(r.e.label, dir);
      const off = r.trackOffset ?? 0;
      w = Math.max(w, 2 * Math.abs(off) + ext + 2 * (CONNECTOR_LABEL_PAD + CONNECTOR_LABEL_CLEAR));
    }
    channelWidths[ch] = w;
  }

  // --- Routes, carrying every decision realize needs (cross anchors are in the
  // coordinate frame these nodes were given -- absolute when render calls us).
  const routes = drawn.map((e) => {
    const base = {
      index: e.index, from: e.from, to: e.to, label: e.label,
      kind: e.kind, tailFace: e.sFace, headFace: e.dFace,
      tailCross: e.tailCross, headCross: e.headCross,
    };
    if (e.kind === 'adjacent') {
      return { ...base, channel: e.channel, straight: e.straight, trackOffset: e.adjTrackOffset ?? 0 };
    }
    return {
      ...base, tailChannel: e.tailChannel, headChannel: e.headChannel,
      tailTrackOffset: e.tailTrackOffset ?? 0, headTrackOffset: e.headTrackOffset ?? 0,
      laneCross: e.laneCross, laneSide: e.laneSide, laneLevel: e.laneLevel,
    };
  });

  return { maxRank, channelWidths, lane, routes };
}

/**
 * Order a channel's bending runs onto tracks. Each PAIR is one indivisible UNIT
 * (so a bidirectional pair's shafts stay contiguous AND a third edge can hop the
 * whole pair in one move -- adjacent run-swaps alone get stuck against a pair).
 * Seed units by pair centroid, then hill-climb on `[crossings, labelCentrality]`
 * via adjacent UNIT swaps + per-unit reversals (the bidirectional flip), counting
 * crossings on NORMALISED geometry (track main = order index, gap-width-invariant,
 * so layout-time and render-time agree).
 * @param {*[]} bending @returns {*[]}
 */
function orderTracks(bending) {
  const mid = (/** @type {*} */ r) => (r.fromCross + r.toCross) / 2;
  /** @type {Map<string, *[]>} */
  const groups = new Map();
  for (const r of bending) {
    const g = groups.get(r.e.pair);
    if (g) g.push(r);
    else groups.set(r.e.pair, [r]);
  }
  let units = [...groups.values()].map((runs) =>
    runs.slice().sort((a, b) => a.e.poff - b.e.poff || a.e.index - b.e.index));
  const centroid = (/** @type {*[]} */ u) => u.reduce((s, r) => s + mid(r), 0) / u.length;
  units.sort((a, b) => centroid(a) - centroid(b) || (a[0].e.pair < b[0].e.pair ? -1 : 1));

  const cost = (/** @type {*[][]} */ us) => trackCost(us.flat());
  const better = (/** @type {[number,number]} */ x, /** @type {[number,number]} */ y) =>
    x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]);
  let curCost = cost(units);
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 200) {
    improved = false;
    for (let i = 0; i < units.length - 1; i++) {
      const cand = units.slice();
      [cand[i], cand[i + 1]] = [cand[i + 1], cand[i]];
      const cc = cost(cand);
      if (better(cc, curCost)) { units = cand; curCost = cc; improved = true; }
    }
    for (let i = 0; i < units.length; i++) {
      if (units[i].length < 2) continue;
      const cand = units.slice();
      cand[i] = units[i].slice().reverse();
      const cc = cost(cand);
      if (better(cc, curCost)) { units = cand; curCost = cc; improved = true; }
    }
  }
  return units.flat();
}

/** Lexicographic `[crossings, labelCentrality]` over the normalised track order. @param {*[]} order @returns {[number, number]} */
function trackCost(order) {
  const K = order.length;
  let crossings = 0;
  for (let i = 0; i < order.length; i++)
    for (let j = i + 1; j < order.length; j++)
      if (pathsCross(normRun(order[i], i, K), normRun(order[j], j, K))) crossings++;
  let central = 0;
  order.forEach((r, p) => { if (r.e.label) central += Math.abs(p - (K - 1) / 2); });
  return [crossings, central];
}

/**
 * A run's normalised polyline at order position `p`: channel top = 0, bottom =
 * K+2, the track at p+1. A `lane`-sided end exits laterally (stays at the track),
 * so its connecting stub is degenerate. (x = cross, y = main.)
 * @param {*} run @param {number} p @param {number} K @returns {Point[]}
 */
function normRun(run, p, K) {
  const track = p + 1;
  const sideMain = (/** @type {string} */ s) => (s === 'top' ? 0 : s === 'bottom' ? K + 2 : track);
  return [
    { x: run.fromCross, y: sideMain(run.fromSide) },
    { x: run.fromCross, y: track },
    { x: run.toCross, y: track },
    { x: run.toCross, y: sideMain(run.toSide) },
  ];
}

/* -------------------------------------------------------------------------- */
/*  Realize -- turn a plan into absolute polylines (render only).              */
/* -------------------------------------------------------------------------- */

/**
 * Turn a plan into absolute connector polylines. `nodes` carry absolute
 * main/cross geometry; `bands[r]` is rank r's main interval `{near, far}` so a
 * channel sits between `bands[c].far` and `bands[c+1].near`.
 * @param {ReturnType<typeof planFlow>} plan
 * @param {PlanNode[]} nodes
 * @param {PlanEdge[]} _edges
 * @param {{ near: number, far: number }[]} bands
 * @param {{ crossMin: number, crossMax: number }} _bbox
 * @param {Direction} dir
 * @returns {object[]}
 */
export function realizeRoutes(plan, nodes, _edges, bands, _bbox, dir) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const toXY = (/** @type {number} */ cross, /** @type {number} */ main) =>
    dir === 'LR' ? { x: main, y: cross } : { x: cross, y: main };
  const faceMain = (/** @type {*} */ n, /** @type {string} */ face) => (face === 'far' ? n.mainFar : n.mainNear);
  const channelCenter = (/** @type {number} */ c) => {
    const near = bands[c]?.far, far = bands[c + 1]?.near;
    if (near == null || far == null) return far ?? near ?? 0;
    return far <= near ? far : (near + far) / 2; // degenerate guard
  };
  const clampTrack = (/** @type {number} */ m, /** @type {number} */ c) => {
    const near = bands[c]?.far, far = bands[c + 1]?.near;
    if (near == null || far == null) return m;
    return far <= near ? far : Math.max(near, Math.min(far, m));
  };

  /** @type {*[]} */
  const out = [];
  for (const r of plan.routes) {
    const s = byId.get(r.from), d = byId.get(r.to);
    if (!s || !d) continue;
    const tail = toXY(r.tailCross, faceMain(s, r.tailFace));
    const head = toXY(r.headCross, faceMain(d, r.headFace));
    /** @type {Point[]} */
    let points;
    let labelMain, labelChannel, labelSpan;
    if (r.kind === 'adjacent') {
      if (r.straight) {
        points = [tail, head];
        labelMain = channelCenter(r.channel);
      } else {
        const m = clampTrack(channelCenter(r.channel) + r.trackOffset, r.channel);
        points = [tail, toXY(r.tailCross, m), toXY(r.headCross, m), head];
        labelMain = m;
      }
      labelChannel = r.channel;
      labelSpan = [r.tailCross, r.headCross];
    } else {
      const tm = clampTrack(channelCenter(r.tailChannel) + r.tailTrackOffset, r.tailChannel);
      const hm = clampTrack(channelCenter(r.headChannel) + r.headTrackOffset, r.headChannel);
      points = [
        tail,
        toXY(r.tailCross, tm),
        toXY(r.laneCross, tm),
        toXY(r.laneCross, hm),
        toXY(r.headCross, hm),
        head,
      ];
      labelMain = tm;
      labelChannel = r.tailChannel;
      labelSpan = [r.tailCross, r.laneCross];
    }
    /** @type {*} */
    const route = { index: r.index, from: r.from, to: r.to, tail, head, points };
    if (r.label) {
      route.label = r.label;
      route._labelMain = labelMain;
      route._labelChannel = labelChannel;
      route._labelSpan = labelSpan;
    }
    out.push(route);
  }

  placeLabels(out, bands, dir);
  for (const r of out) { delete r._labelMain; delete r._labelChannel; delete r._labelSpan; }
  return out;
}

/**
 * Anchor each caption on its own across-run and de-overlap them per channel by a
 * sorted cross-axis sweep, staggering the main coordinate when boxes collide and
 * clamping it so a label box never reaches into a rank band.
 * @param {*[]} routes @param {{ near: number, far: number }[]} bands @param {Direction} dir
 */
function placeLabels(routes, bands, dir) {
  /** @type {Map<number, *[]>} */
  const byChannel = new Map();
  for (const r of routes) {
    if (!r.label) continue;
    const list = byChannel.get(r._labelChannel);
    if (list) list.push(r);
    else byChannel.set(r._labelChannel, [r]);
  }
  for (const [ch, group] of byChannel) {
    const near = bands[ch]?.far, far = bands[ch + 1]?.near;
    const crossMid = (/** @type {*} */ r) => (r._labelSpan[0] + r._labelSpan[1]) / 2;
    group.sort((a, b) => crossMid(a) - crossMid(b));
    let stagger = 0;
    let lastCrossMax = -Infinity;
    for (const r of group) {
      const ext = measureText(r.label, 12);
      const crossExt = dir === 'LR' ? ext.h : ext.w;
      const mainExt = dir === 'LR' ? ext.w : ext.h;
      const lo = Math.min(r._labelSpan[0], r._labelSpan[1]);
      const hi = Math.max(r._labelSpan[0], r._labelSpan[1]);
      // Keep the caption over its own across-run -- but only when the run is wider
      // than the caption; a short/straight run just centres it (clamping a label
      // wider than its span would shove it off the run entirely).
      const cross = hi - lo > crossExt
        ? Math.max(lo + crossExt / 2, Math.min(hi - crossExt / 2, crossMid(r)))
        : crossMid(r);
      if (cross - crossExt / 2 < lastCrossMax) stagger += CONNECTOR_LABEL_STAGGER;
      else stagger = 0;
      lastCrossMax = cross + crossExt / 2;
      let main = r._labelMain + stagger;
      if (near != null && far != null && far > near) {
        const half = mainExt / 2 + CONNECTOR_LABEL_PAD;
        main = Math.max(near + half, Math.min(far - half, main));
      }
      r.labelAt = dir === 'LR' ? { x: main, y: cross } : { x: cross, y: main };
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Infer -- recover component/rank structure from placed rects (render only).  */
/* -------------------------------------------------------------------------- */

/**
 * Recover the per-component rank structure from absolute placed rects, so render
 * can run the same `planFlow` layout did. Components are the connected groups over
 * the drawable edges; a frame's rank is the index of its main-start among its
 * component's sorted distinct main-starts (exact -- a rank shares one main-start).
 * @param {{ frame: { id?: string }, x: number, y: number, w: number, h: number }[]} placed
 * @param {{ edges: { from: string, to: string, label?: string }[] }} graph
 * @param {Direction} dir
 * @returns {{ nodes: PlanNode[], edges: PlanEdge[], bands: { near: number, far: number }[], bbox: { crossMin: number, crossMax: number } }[]}
 */
export function inferComponents(placed, graph, dir) {
  // First-declaration wins on a duplicate frame id, matching frame-layout.js's
  // byId (and layout.js). A last-wins map here would route an edge to a DIFFERENT
  // physical frame than layout sized the channel for -- a two-stage disagreement
  // that draws the connector straight through frames.
  const rectById = new Map();
  for (const p of placed) if (p.frame?.id != null && !rectById.has(p.frame.id)) rectById.set(p.frame.id, p);

  // Drawable edges keep their GLOBAL declaration index, so the plan matches the
  // one frame-layout built from the same graph.
  /** @type {{ from: string, to: string, label?: string, index: number }[]} */
  const drawn = [];
  graph.edges.forEach((e, i) => {
    const s = rectById.get(e.from), d = rectById.get(e.to);
    if (!s || !d || s === d) return;
    drawn.push({ from: e.from, to: e.to, label: e.label, index: i });
  });

  // Connected components over the undirected drawable edges (frames in no edge
  // are singletons with nothing to route, so they drop out).
  /** @type {Map<string, Set<string>>} */
  const adj = new Map();
  const link = (/** @type {string} */ a, /** @type {string} */ b) => {
    let s = adj.get(a);
    if (!s) { s = new Set(); adj.set(a, s); }
    s.add(b);
  };
  for (const e of drawn) { link(e.from, e.to); link(e.to, e.from); }

  const seen = new Set();
  /** @type {string[][]} */
  const comps = [];
  for (const start of rectById.keys()) {
    if (!adj.has(start) || seen.has(start)) continue;
    const members = [];
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const u = /** @type {string} */ (stack.pop());
      members.push(u);
      for (const v of adj.get(u) ?? []) if (!seen.has(v)) { seen.add(v); stack.push(v); }
    }
    comps.push(members);
  }

  const mainNearOf = (/** @type {*} */ p) => (dir === 'LR' ? p.x : p.y);
  const mainFarOf = (/** @type {*} */ p) => (dir === 'LR' ? p.x + p.w : p.y + p.h);
  const cross0Of = (/** @type {*} */ p) => (dir === 'LR' ? p.y : p.x);
  const cross1Of = (/** @type {*} */ p) => (dir === 'LR' ? p.y + p.h : p.x + p.w);

  return comps.map((members) => {
    const set = new Set(members);
    const starts = [...new Set(members.map((id) => mainNearOf(rectById.get(id))))].sort((a, b) => a - b);
    const rankOf = new Map(starts.map((v, i) => [v, i]));
    /** @type {PlanNode[]} */
    const nodes = members.map((id) => {
      const p = rectById.get(id);
      return {
        id,
        rank: rankOf.get(mainNearOf(p)) ?? 0,
        cross0: cross0Of(p), cross1: cross1Of(p),
        mainNear: mainNearOf(p), mainFar: mainFarOf(p),
      };
    });
    const maxRank = starts.length - 1;
    /** @type {{ near: number, far: number }[]} */
    const bands = [];
    for (let r = 0; r <= maxRank; r++) {
      const rn = nodes.filter((n) => n.rank === r);
      bands[r] = {
        near: Math.min(...rn.map((n) => /** @type {number} */ (n.mainNear))),
        far: Math.max(...rn.map((n) => /** @type {number} */ (n.mainFar))),
      };
    }
    const bbox = {
      crossMin: Math.min(...nodes.map((n) => n.cross0)),
      crossMax: Math.max(...nodes.map((n) => n.cross1)),
    };
    /** @type {PlanEdge[]} */
    const edges = drawn.filter((e) => set.has(e.from) && set.has(e.to))
      .map((e) => ({ from: e.from, to: e.to, label: e.label, index: e.index }));
    return { nodes, edges, bands, bbox };
  });
}

/* -------------------------------------------------------------------------- */
/*  Shared geometry helpers (also used by render.js / tests).                  */
/* -------------------------------------------------------------------------- */

/** Unordered pair key for two frame ids. @param {string} a @param {string} b @returns {string} */
function pairKey(a, b) {
  return a < b ? `${a} ${b}` : `${b} ${a}`;
}

/** Directed edge key (declaration tie-break within a pair). @param {*} e @returns {string} */
function edgeKey(e) {
  return `${e.from} ${e.to}`;
}

/** Main-axis extent (px) a caption claims inside a channel: width in LR, height in TD. @param {string} label @param {Direction} dir @returns {number} */
function labelExtentMain(label, dir) {
  const { w, h } = measureText(label, 12);
  return dir === 'LR' ? w : h;
}

/** Do two connector polylines properly intersect? @param {Point[]} a @param {Point[]} b @returns {boolean} */
export function pathsCross(a, b) {
  for (let i = 0; i < a.length - 1; i++)
    for (let j = 0; j < b.length - 1; j++)
      if (segCross(a[i], a[i + 1], b[j], b[j + 1])) return true;
  return false;
}

/** Proper segment intersection (endpoints touching don't count). @param {Point} p1 @param {Point} p2 @param {Point} p3 @param {Point} p4 @returns {boolean} */
export function segCross(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
}
