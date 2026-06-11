// @ts-check
import BUILTIN from './icons/builtin.js';

/**
 * Icon name resolution (tasks/ICONS.md). Leaf module: it imports only the
 * generated built-in data, so resolve.js, hosts, and tests can depend on it
 * with no risk of an import cycle.
 *
 * An icon resolves to `{ body, viewBox }`: `body` is either a bare `<path d>`
 * string or raw inner-SVG markup (leading `<`), targeting a square
 * `viewBox`-sized box and inheriting `currentColor`. draw.js turns that into
 * clean (non-sketch) vectors -- the Balsamiq look is clean glyphs inside rough
 * containers (ICONS.md decision #3).
 *
 * Lookup precedence (ICONS.md ss.2): document-inline icons -> injected icons ->
 * built-in set. A miss resolves to `null`; the CALLER decides what that means
 * (resolve.js renders the placeholder and emits a soft Diagnostic -- never a
 * hard error).
 *
 * Naming is MUI PascalCase, resolved forgivingly: `ArrowBack` ===
 * `arrow-back` === `arrow_back` === `arrowback`. A `pack:name` spelling (e.g.
 * `lucide:search`) routes to that injected Iconify pack explicitly.
 *
 * @typedef {{ body: string, viewBox: number }} ResolvedIcon
 */

/** The built-in set's icons are Material 24x24. */
const BUILTIN_VIEWBOX = 24;

/** Iconify JSON packs default to a 16px grid when they declare no size. */
const ICONIFY_DEFAULT_SIZE = 16;

/**
 * Canonicalize an icon name for lookup: lowercase, `-`/`_` stripped. A `:`
 * survives, so a `pack:name` spelling stays distinct from bare names.
 * @param {string} name @returns {string}
 */
export function normalizeIconName(name) {
  return String(name).toLowerCase().replace(/[-_]/g, '');
}

/** The built-in set, keyed by normalized name. @type {Map<string, ResolvedIcon>} */
const BUILTIN_BY_NAME = new Map(
  Object.entries(BUILTIN).map(([k, body]) => [normalizeIconName(k), { body, viewBox: BUILTIN_VIEWBOX }]),
);

/**
 * Look up a built-in icon by any forgiving spelling; null when unknown.
 * @param {string} name @returns {ResolvedIcon|null}
 */
export function builtinIcon(name) {
  return BUILTIN_BY_NAME.get(normalizeIconName(name)) ?? null;
}

/** Is this object an Iconify JSON pack (vs a flat name->body map)? */
function isIconifyPack(value) {
  return typeof value === 'object' && value !== null
    && typeof value.prefix === 'string'
    && typeof value.icons === 'object' && value.icons !== null;
}

/**
 * Normalize one user-supplied icon value into a ResolvedIcon. Accepts a bare
 * `d` string, raw inner-SVG markup, or `{ body, viewBox? }`. Returns null for
 * anything unusable (the entry is skipped, never thrown on -- injected maps
 * are host input, not document source).
 * @param {*} value @returns {ResolvedIcon|null}
 */
function coerceEntry(value) {
  if (typeof value === 'string' && value !== '') return { body: value, viewBox: BUILTIN_VIEWBOX };
  if (typeof value === 'object' && value !== null && typeof value.body === 'string' && value.body !== '') {
    const vb = Number(value.viewBox);
    return { body: value.body, viewBox: Number.isFinite(vb) && vb > 0 ? vb : BUILTIN_VIEWBOX };
  }
  return null;
}

/**
 * Register every icon of an Iconify JSON pack: bare names for direct lookup
 * plus `prefix:name` spellings for explicit routing (ICONS.md sign-off #5).
 * Alias entries resolve through their `parent` chain. Per-icon width/height
 * override the pack's; Iconify's default grid is 16.
 * @param {Map<string, ResolvedIcon>} out @param {*} pack
 */
function addPack(out, pack) {
  // Same skip-never-throw hygiene as coerceEntry: packs are host input, so a
  // malformed entry (empty body, zero/negative dimensions) is dropped -- the
  // name then misses and degrades to the placeholder, never to broken artwork.
  const dim = (/** @type {*} */ v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const packSize = dim(pack.height) || dim(pack.width) || ICONIFY_DEFAULT_SIZE;
  /** @param {string} name @param {*} icon */
  const put = (name, icon) => {
    if (typeof icon?.body !== 'string' || icon.body === '') return;
    const viewBox = dim(icon.height) || dim(icon.width) || packSize;
    const entry = { body: icon.body, viewBox };
    out.set(normalizeIconName(name), entry);
    out.set(`${normalizeIconName(pack.prefix)}:${normalizeIconName(name)}`, entry);
  };
  for (const [name, icon] of Object.entries(pack.icons)) put(name, icon);
  for (const [name, alias] of Object.entries(pack.aliases ?? {})) {
    let target = alias;
    for (let hops = 0; hops < 5 && target; hops++) {
      const parent = /** @type {*} */ (target).parent;
      if (pack.icons[parent]) { put(name, pack.icons[parent]); break; }
      target = pack.aliases?.[parent];
    }
  }
}

/**
 * Build the injected-icon registry from the host's `icons` option: a flat
 * name->body map, an Iconify JSON pack, or an array mixing both. Later
 * entries win bare-name collisions (object-spread semantics); `pack:name`
 * spellings stay unambiguous.
 * @param {*} option  the `icons` render/parse option, as given
 * @returns {Map<string, ResolvedIcon>}
 */
export function buildInjectedIcons(option) {
  /** @type {Map<string, ResolvedIcon>} */
  const out = new Map();
  if (option == null) return out;
  for (const source of Array.isArray(option) ? option : [option]) {
    if (source == null) continue;
    if (isIconifyPack(source)) {
      addPack(out, source);
      continue;
    }
    if (typeof source === 'object') {
      for (const [name, value] of Object.entries(source)) {
        const entry = coerceEntry(value);
        if (entry) out.set(normalizeIconName(name), entry);
      }
    }
  }
  return out;
}

/**
 * Resolve an icon name through the full precedence chain: document-inline ->
 * injected -> built-in -> null (ICONS.md ss.2). An inline DECLARATION always
 * wins, even one that failed to load (`src=` the host couldn't resolve, mapped
 * to null): the author overrode that name, so it renders as the placeholder
 * rather than silently falling back to an injected/built-in icon.
 * @param {string} name
 * @param {{ inline?: Map<string, ResolvedIcon|null>, injected?: Map<string, ResolvedIcon> }} [scopes]
 * @returns {ResolvedIcon|null}
 */
export function resolveIcon(name, scopes = {}) {
  const key = normalizeIconName(name);
  if (scopes.inline?.has(key)) return scopes.inline.get(key) ?? null;
  return scopes.injected?.get(key) ?? BUILTIN_BY_NAME.get(key) ?? null;
}
