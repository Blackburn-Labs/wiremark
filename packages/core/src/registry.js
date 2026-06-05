// @ts-check
/**
 * Component REGISTRY -- the semantic schema the resolver (stage 3) and renderer
 * (stage 5) consume. The definitions themselves live one-per-file under
 * `./elements/`; this module indexes them by name and adds the universal props
 * and lookup helpers.
 *
 * Only the v0.1 set plus the few v1.0 components the worked examples (ss.8) use
 * are defined so far; full MUI breadth (82 components) is tracked in
 * meta/mui-support-matrix.json and promoted here tier by tier.
 *
 * Keyless resolution obeys SPEC ss.3.2.2: at most one string literal, at most
 * one enum, sizing as its own ordered category -- so they can never collide.
 */
import { ELEMENTS } from './elements/index.js';

export { FILLER_STYLES, PRESETS } from './elements/common.js';

/** @typedef {import('./elements/common.js').ComponentDef} ComponentDef */
/** @typedef {import('./elements/common.js').PropDef} PropDef */

/**
 * Props available on *every* element, so they are not repeated per definition:
 *  - `to=#id` makes any element/region a clickable link to a frame (ss.7.2).
 * Sizing (`w h`) is likewise broadly available, flagged per element via `sizing`.
 * @type {Record<string, PropDef>}
 */
export const UNIVERSAL_PROPS = { to: { type: 'ref' } };

/** Component name -> definition. @type {Record<string, ComponentDef>} */
export const REGISTRY = Object.fromEntries(ELEMENTS.map((el) => [el.name, el]));

/** @param {string} name @returns {boolean} */
export function isKnownComponent(name) {
  return Object.hasOwn(REGISTRY, name);
}

/**
 * Look up a component definition, with the universal props (`to=`) merged in.
 * @param {string} name
 * @returns {(ComponentDef & { props: Record<string, PropDef> }) | undefined}
 */
export function getComponent(name) {
  const def = REGISTRY[name];
  if (!def) return undefined;
  return { ...def, props: { ...UNIVERSAL_PROPS, ...def.props } };
}
