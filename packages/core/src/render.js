// @ts-check
import { REGISTRY } from './registry.js';
import { COLORS, escape } from './draw.js';

/**
 * Stage (5) -- RENDER.  laid-out boxes -> hand-drawn SVG string.
 *
 * A thin facade: walk each frame's box tree and dispatch to the owning element's
 * `render(node, box)` strategy (the wobbly drawing lives in `elements/<Name>.js`
 * via the shared `draw.js` primitives). The element draws *itself*; the facade
 * then recurses into its children.
 *
 * Document layer: multiple frames are stacked vertically; each visible frame is
 * painted over its resolved `background=` chain (deepest-first), the foreground
 * driving size and the background underlaid as-is (SPEC ss.5.1.1). `visible=false`
 * frames are omitted from standalone output but still usable as backgrounds.
 *
 * @typedef {import('./layout.js').LaidOutFrame} LaidOutFrame
 * @typedef {import('./layout.js').Box} Box
 */

const FRAME_GAP = 40; // vertical gap between stacked frames

/** @param {Box} box @param {string[]} out */
function renderBox(box, out) {
  const node = box.node;
  const s = /** @type {*} */ (REGISTRY[node.component]) ?? {};
  /** @type {string[]} */
  const inner = [];
  if (typeof s.render === 'function') inner.push(s.render(node, box));
  for (const child of box.children) renderBox(child, inner);
  // Any node carrying to=#id is a clickable region (SPEC ss.7.2); the facade
  // wraps it here so elements never draw their own link.
  out.push(node.props.to
    ? `<a class="wm-link" href="#${escape(node.props.to)}">${inner.join('')}</a>`
    : inner.join(''));
}

/** @param {LaidOutFrame} frame @param {string[]} out */
function renderFrame(frame, out) {
  renderBox(frame.root, out);
}

/**
 * @param {LaidOutFrame[]} frames
 * @param {object} [options]
 * @returns {string}  SVG markup
 */
export function renderSVG(frames, options = {}) {
  void options;
  const standalone = frames.filter((f) => f.visible);

  let offsetY = 0;
  let totalW = 0;
  const blocks = [];
  for (const f of standalone) {
    /** @type {string[]} */
    const parts = [`<rect x="0" y="0" width="${f.w}" height="${f.h}" fill="${COLORS.paper}"/>`];
    for (const bg of f.backgroundChain) renderFrame(bg, parts); // beneath, deepest-first
    renderFrame(f, parts);

    blocks.push(`<g transform="translate(0 ${offsetY})">${parts.join('')}</g>`);
    offsetY += f.h + FRAME_GAP;
    totalW = Math.max(totalW, f.w);
  }

  const totalH = Math.max(0, offsetY - (standalone.length ? FRAME_GAP : 0));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`
    + `<rect x="0" y="0" width="${totalW}" height="${totalH}" fill="${COLORS.paper}"/>`
    + blocks.join('')
    + '</svg>'
  );
}
