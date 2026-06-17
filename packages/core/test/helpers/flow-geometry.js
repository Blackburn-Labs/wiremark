// @ts-check
import { measureText, CONNECTOR_LABEL_PAD } from '../../src/metrics.js';

/**
 * Test-only flow-connector geometry checks -- the in-repo successor to the R&D
 * analyzer that measured the original connector-routing failures (tasks/FLOW.md).
 * These are deliberately INDEPENDENT of routing.js's own helpers, so a bug in the
 * code under test can't mask itself: routing.test.js asserts, on every run, the
 * three historical failure classes stay at zero (through-frame / connector-
 * conflict / label-over-frame).
 *
 * @typedef {{ x: number, y: number }} Point
 * @typedef {{ x: number, y: number, w: number, h: number }} Rect
 */

/**
 * Does segment p1->p2 cross the strict INTERIOR of `rect`? Liang-Barsky clip
 * against the rect shrunk by `eps` on all sides, so a segment running along an
 * edge (a connector anchored on a face) is NOT a hit, only one that genuinely
 * enters the frame. NB the parallel case (a segment perpendicular to a boundary's
 * normal) is inside that slab when `q >= 0`; inverting that check would silently
 * hide every axis-aligned hit, which is exactly the failure this guards.
 * @param {Point} p1 @param {Point} p2 @param {Rect} rect @param {number} [eps]
 * @returns {boolean}
 */
export function segIntersectsRectInterior(p1, p2, rect, eps = 1) {
  const xmin = rect.x + eps, xmax = rect.x + rect.w - eps;
  const ymin = rect.y + eps, ymax = rect.y + rect.h - eps;
  if (xmin >= xmax || ymin >= ymax) return false; // degenerate / sub-eps rect
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  let t0 = 0, t1 = 1;
  /** @param {number} p @param {number} q */
  const clip = (p, q) => {
    if (Math.abs(p) < 1e-12) return q >= 0; // parallel: inside the slab iff q >= 0
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else { if (r < t0) return false; if (r < t1) t1 = r; }
    return true;
  };
  if (!clip(-dx, p1.x - xmin)) return false;
  if (!clip(dx, xmax - p1.x)) return false;
  if (!clip(-dy, p1.y - ymin)) return false;
  if (!clip(dy, ymax - p1.y)) return false;
  return t1 > t0; // a positive-length clipped span lies strictly inside
}

/**
 * Do any of polyline `pts`'s segments cross the interior of `rect`?
 * @param {Point[]} pts @param {Rect} rect @param {number} [eps] @returns {boolean}
 */
export function polylineHitsRect(pts, rect, eps = 1) {
  for (let i = 0; i < pts.length - 1; i++)
    if (segIntersectsRectInterior(pts[i], pts[i + 1], rect, eps)) return true;
  return false;
}

/**
 * Proper crossing (an interior X, endpoints touching don't count) between segments
 * a1-a2 and b1-b2. Independent reimplementation -- not routing.js's segCross.
 * @param {Point} a1 @param {Point} a2 @param {Point} b1 @param {Point} b2 @returns {boolean}
 */
function segmentsCross(a1, a2, b1, b2) {
  const d = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((b1.x - a1.x) * (b2.y - b1.y) - (b1.y - a1.y) * (b2.x - b1.x)) / d;
  const u = ((b1.x - a1.x) * (a2.y - a1.y) - (b1.y - a1.y) * (a2.x - a1.x)) / d;
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
}

/**
 * Do two connector polylines properly cross anywhere?
 * @param {Point[]} a @param {Point[]} b @returns {boolean}
 */
export function polylinesCross(a, b) {
  for (let i = 0; i < a.length - 1; i++)
    for (let j = 0; j < b.length - 1; j++)
      if (segmentsCross(a[i], a[i + 1], b[j], b[j + 1])) return true;
  return false;
}

/**
 * Length of the collinear overlap (px) between segments a1-a2 and b1-b2; 0 unless
 * they lie on the same line and share a positive-length span. Catches two distinct
 * connectors drawn ON TOP of each other (which a proper-crossing test misses).
 * @param {Point} a1 @param {Point} a2 @param {Point} b1 @param {Point} b2 @returns {number}
 */
export function collinearOverlap(a1, a2, b1, b2) {
  const dax = a2.x - a1.x, day = a2.y - a1.y;
  const len2 = dax * dax + day * day;
  if (len2 < 1e-9) return 0; // a is a point
  // b must be parallel to a and lie on a's infinite line.
  if (Math.abs(dax * (b2.y - b1.y) - day * (b2.x - b1.x)) > 1e-6) return 0; // not parallel
  const off = Math.abs(dax * (b1.y - a1.y) - day * (b1.x - a1.x)) / Math.sqrt(len2);
  if (off > 1e-6) return 0; // parallel but on a different line
  const len = Math.sqrt(len2);
  const tb1 = ((b1.x - a1.x) * dax + (b1.y - a1.y) * day) / len2;
  const tb2 = ((b2.x - a1.x) * dax + (b2.y - a1.y) * day) / len2;
  const lo = Math.max(0, Math.min(tb1, tb2));
  const hi = Math.min(1, Math.max(tb1, tb2));
  return Math.max(0, hi - lo) * len;
}

/**
 * Greatest collinear overlap between any segment of polyline `a` and any of `b`.
 * @param {Point[]} a @param {Point[]} b @returns {number}
 */
export function polylineOverlap(a, b) {
  let max = 0;
  for (let i = 0; i < a.length - 1; i++)
    for (let j = 0; j < b.length - 1; j++)
      max = Math.max(max, collinearOverlap(a[i], a[i + 1], b[j], b[j + 1]));
  return max;
}

/**
 * Reconstruct a caption's paper-knockout rect from its anchor + the SAME measure
 * + pad render.js draws it with, so the test sees exactly what lands on the page.
 * @param {Point} labelAt @param {string} label @param {number} [fontSize] @returns {Rect}
 */
export function labelRect(labelAt, label, fontSize = 12) {
  const { w, h } = measureText(label, fontSize);
  const pad = CONNECTOR_LABEL_PAD;
  return { x: labelAt.x - w / 2 - pad, y: labelAt.y - h / 2 - pad, w: w + 2 * pad, h: h + 2 * pad };
}

/**
 * Do two rects overlap on a positive-area region (used for label-vs-frame)?
 * @param {Rect} a @param {Rect} b @returns {boolean}
 */
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
