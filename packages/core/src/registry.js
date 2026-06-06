// @ts-check
/**
 * Component REGISTRY -- the semantic schema the resolver (stage 3) and renderer
 * (stage 5) consume. The definitions themselves live one-per-file under
 * `./elements/`; this module indexes them by name and adds the universal props
 * and lookup helpers.
 *
 * Only the v0.1 set plus the few v1.0 components the worked examples (ss.8) use
 * are defined so far; full MUI breadth (82 components) is tracked in
 * meta/element-specs.json and promoted here tier by tier.
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
 *    `href=` is an alias (the spec's canonical name on Link/Button), so both
 *    spellings land on `props.to` -- what flow.js reads for nav edges. Elements
 *    must NOT redeclare `to`/`href` (CONVENTION s.7).
 * Sizing (`w h`) is likewise broadly available, flagged per element via `sizing`.
 * @type {Record<string, PropDef>}
 */
export const UNIVERSAL_PROPS = { to: { type: 'ref', aliases: ['href'] } };

/** Component name -> definition. @type {Record<string, ComponentDef>} */
export const REGISTRY = Object.fromEntries(ELEMENTS.map((el) => [el.name, el]));

/** @param {string} name @returns {boolean} */
export function isKnownComponent(name) {
  return Object.hasOwn(REGISTRY, name);
}

/**
 * Build the alias -> canonical-prop-name map for a prop table (CONVENTION s.1).
 * Each PropDef may list alternate keyed spellings in `aliases`; the resolver uses
 * this to route `gap=`/`w=`/`href=` etc. onto their canonical prop. Built once
 * per `getComponent` call so the resolver never re-scans.
 * @param {Record<string, PropDef>} props
 * @returns {Record<string, string>}  alias -> canonical name
 */
function aliasMap(props) {
  /** @type {Record<string, string>} */
  const map = {};
  for (const [canonical, def] of Object.entries(props)) {
    for (const alias of def.aliases ?? []) map[alias] = canonical;
  }
  return map;
}

/**
 * Look up a component definition, with the universal props (`to=`/`href=`) merged
 * in and an `aliases` map (alias -> canonical) attached for the resolver.
 * @param {string} name
 * @returns {(ComponentDef & { props: Record<string, PropDef>, aliases: Record<string, string> }) | undefined}
 */
export function getComponent(name) {
  const def = REGISTRY[name];
  if (!def) return undefined;
  const props = { ...UNIVERSAL_PROPS, ...def.props };
  return { ...def, props, aliases: aliasMap(props) };
}
