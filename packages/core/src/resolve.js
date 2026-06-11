// @ts-check
import { WiremarkError, diagnostic } from './errors.js';
import { getComponent } from './registry.js';
import { PRESETS } from './elements/common.js';
import { buildInjectedIcons, normalizeIconName, resolveIcon } from './icons.js';

/**
 * Stage (3) -- RESOLVE.  raw tree -> validated, semantic Document.
 *
 * The heart of the front-end. For every node, using its definition from the
 * component REGISTRY:
 *  - Resolve keyless tokens to keyed props by value/type alone (SPEC ss.3.2.2):
 *    at most one string literal (-> the text/label prop), at most one enum
 *    (-> e.g. variant/direction), sizing as its own ordered category.
 *  - Parse sizing tokens `w h` (px | % | * | flex-weight), order-significant
 *    among themselves only (SPEC ss.4).
 *  - Parse filler amount tokens `~N[w|l]` and underscore sugar (SPEC ss.6).
 *  - Validate: unknown component, unquoted literal, bare text node, duplicate
 *    or ambiguous props, bad enum value -> `WiremarkError`.
 *  - Resolve frame-level metadata on `Wireframe` (#id, preset, w/h, background,
 *    visible, filler).
 *
 * The `Card` flattening rule (SPEC ss.5.3) and cross-frame `background=`
 * resolution are layout/render concerns and are not yet exercised (the prototype
 * renders only `Wireframe` + `Typography`); the parser itself is general.
 *
 * @typedef {import('./tree.js').RawNode} RawNode
 * @typedef {import('./errors.js').Diagnostic} Diagnostic
 *
 * @typedef {Object} Size
 * @property {'px'|'%'|'fill'|'flex'} unit
 * @property {number} [value]               // omitted for `fill` (`*`)
 *
 * @typedef {Object} Filler
 * @property {number|'short'|'medium'|'long'} amount
 * @property {'units'|'words'|'lines'|'bucket'} unit
 *
 * @typedef {Object} ResolvedNode
 * @property {string} component
 * @property {string} [id]                 // keyless `#id` anchor, if any (SPEC ss.7.1)
 * @property {Record<string, *>} props     // resolved keyed props
 * @property {{ w?: Size, h?: Size }} [size]   // parsed sizing, if any
 * @property {Filler} [filler]             // parsed filler amount, if any
 * @property {Record<string, import('./icons.js').ResolvedIcon|null>} [icons]
 *           // icon-typed props resolved at resolve time (ICONS.md ss.3): artwork
 *           // for draw.js's drawIcon, or null for an unknown name (-> placeholder)
 * @property {ResolvedNode[]} children
 * @property {number} line
 *
 * @typedef {Object} Frame
 * @property {string} [id]
 * @property {string} [preset]              // mobile | landscape | portrait
 * @property {Record<string, *>} props      // background, visible, filler, w, h
 * @property {ResolvedNode[]} children
 * @property {number} line
 *
 * @typedef {Object} Document
 * @property {Frame[]} frames
 * @property {Diagnostic[]} diagnostics
 */

/**
 * Parse a bare token as a sizing value (SPEC ss.4.1); null if it is not one.
 * @param {string} tok
 * @returns {Size|null}
 */
function parseSize(tok) {
  if (tok === '*') return { unit: 'fill' };
  let m;
  if ((m = /^(\d+(?:\.\d+)?)px$/.exec(tok))) return { unit: 'px', value: Number(m[1]) };
  if ((m = /^(\d+(?:\.\d+)?)%$/.exec(tok))) return { unit: '%', value: Number(m[1]) };
  if ((m = /^(\d+(?:\.\d+)?)$/.exec(tok))) return { unit: 'flex', value: Number(m[1]) };
  return null;
}

/**
 * Parse a bare token as a filler amount (SPEC ss.6.1-6.2); null if it is not one.
 * @param {string} tok
 * @returns {Filler|null}
 */
function parseFiller(tok) {
  const m = /^~(\d+)([wl])?$/.exec(tok);
  if (m) {
    const unit = m[2] === 'w' ? 'words' : m[2] === 'l' ? 'lines' : 'units';
    return { amount: Number(m[1]), unit };
  }
  if (/^_+$/.test(tok)) {
    const n = tok.length;
    return { amount: n <= 1 ? 'short' : n === 2 ? 'medium' : 'long', unit: 'bucket' };
  }
  return null;
}

/**
 * Coerce a keyed token's value to its declared prop type, enforcing the quoting
 * rule (SPEC ss.3.2.1): text is quoted, everything else is bare.
 * @param {import('./elements/common.js').PropDef} prop
 * @param {import('./lexer.js').Token} tok
 * @param {string} comp
 * @param {{ line: number }} loc
 * @returns {*}
 */
function coerce(prop, tok, comp, loc) {
  const { value, quoted } = tok;
  switch (prop.type) {
    case 'string':
      if (!quoted) throw new WiremarkError(`${comp}: text value for "${tok.key}=" must be quoted, got bare \`${value}\``, loc);
      return value;
    case 'enum':
      if (quoted) throw new WiremarkError(`${comp}: enum value for "${tok.key}=" must be bare, not quoted`, loc);
      if (prop.values && !prop.values.includes(value))
        throw new WiremarkError(`${comp}: "${value}" is not valid for "${tok.key}=" (expected: ${prop.values.join(', ')})`, loc);
      return value;
    case 'number': {
      const n = Number(value);
      if (quoted || !Number.isFinite(n)) throw new WiremarkError(`${comp}: "${tok.key}=" expects a number, got \`${value}\``, loc);
      return n;
    }
    case 'boolean':
      if (value === 'true') return true;
      if (value === 'false') return false;
      throw new WiremarkError(`${comp}: "${tok.key}=" expects true|false, got \`${value}\``, loc);
    case 'icon':
      // Icon NAMES are identifiers, not prose: `startIcon=Check` reads best
      // bare, but the quoted spelling (`startIcon="Check"`) predates the icon
      // type and stays valid (ICONS.md ss.3).
      return value;
    case 'ref':
    case 'id':
      return value.startsWith('#') ? value.slice(1) : value; // frame anchor (SPEC ss.7)
    case 'ratio':
    default:
      return value;
  }
}

/**
 * Resolve a keyed `key=value` token onto its canonical prop, honoring aliases
 * (CONVENTION s.1): if `key` is not itself a prop, route it through the
 * component's alias->canonical map. Coerces by the *canonical* prop's def and
 * stores under the canonical name; a canonical prop set twice (e.g. via both
 * `spacing=` and its alias `gap=`) is an ambiguity error.
 * @param {Record<string, *>} props      accumulator (mutated)
 * @param {import('./lexer.js').Token} tok
 * @param {ComponentResolved} comp
 * @param {string} name @param {{ line: number }} loc
 */
function resolveKeyed(props, tok, comp, name, loc) {
  const key = /** @type {string} */ (tok.key);
  const canonical = comp.props[key] ? key : comp.aliases[key];
  if (!canonical) throw new WiremarkError(`${name}: unknown property "${key}="`, loc);
  if (Object.hasOwn(props, canonical))
    throw new WiremarkError(`${name}: "${canonical}" set more than once (via "${key}=")`, loc);
  props[canonical] = coerce(comp.props[canonical], tok, name, loc);
}

/**
 * @typedef {NonNullable<ReturnType<typeof getComponent>>} ComponentResolved
 */

/** The explicit Card sub-part components (SPEC ss.5.3; CardMedia removed in the spec migration). */
const CARD_PARTS = new Set(['CardHeader', 'CardContent', 'CardActions']);

/**
 * Resolve one non-frame node (and its subtree) against its component definition.
 * @param {RawNode} raw
 * @returns {ResolvedNode}
 */
function resolveNode(raw) {
  const comp = getComponent(raw.name);
  const loc = { line: raw.line };
  if (!comp) throw new WiremarkError(`unknown component "${raw.name}"`, loc);

  /** @type {Record<string, *>} */
  const props = {};
  /** @type {Size[]} */
  const sizes = [];
  /** @type {Filler|undefined} */
  let filler;
  /** @type {string|undefined} */
  let id;

  const slots = comp.keyless ?? [];
  const literalSlot = slots.find((s) => s.kind === 'literal');
  // ALL keyless-enum slots (not just the first): a bare token is assigned to the
  // first slot whose value-domain contains it. Domains are pairwise disjoint per
  // component (CONVENTION s.2.1), so the match is unambiguous. N=1 is the common
  // case and behaves exactly as before.
  const enumSlots = slots.filter((s) => s.kind === 'enum');
  // At most one keyless NUMBER slot per element (CONVENTION s.4): a bare numeric
  // token (`Progress 60`) routes to a numeric prop. Tried AFTER sizing/filler so a
  // `sizing:true` element still reads bare numbers as geometry and `~`/`_` filler
  // is untouched; there is one shared slot across Progress/Slider/Rating's `value`.
  const numberSlot = slots.find((s) => s.kind === 'number');
  let sawLiteral = false;

  for (const tok of raw.tokens) {
    if (tok.kind === 'literal') {
      if (!literalSlot) throw new WiremarkError(`${raw.name} does not take a text literal`, loc);
      if (sawLiteral) throw new WiremarkError(`${raw.name}: more than one text literal`, loc);
      props[/** @type {string} */ (literalSlot.to)] = tok.value;
      sawLiteral = true;
      continue;
    }
    if (tok.kind === 'keyed') {
      resolveKeyed(props, tok, comp, raw.name, loc);
      continue;
    }
    // bare token: anchor id | sizing | filler | keyless enum | keyless boolean (in that order)
    const v = tok.value;
    // A keyless `#id` anchor is allowed on ANY element (SPEC ss.7.1), mirroring how
    // resolveFrame names a frame. The `#` sigil is unambiguous -- it can never be a
    // size/filler/enum/flag -- so it is captured first. Layout's anchored-frame
    // pass consumes it as an `anchor=#id` target (tasks/FOREGROUND.md).
    if (v.startsWith('#')) {
      if (id !== undefined) throw new WiremarkError(`${raw.name}: id set more than once (\`${v}\`)`, loc);
      id = v.slice(1);
      continue;
    }
    if (comp.sizing) {
      const s = parseSize(v);
      if (s) { sizes.push(s); continue; }
    }
    const f = parseFiller(v);
    if (f) {
      if (!comp.text) throw new WiremarkError(`${raw.name}: filler (\`${v}\`) is only valid on text components`, loc);
      filler = f;
      continue;
    }
    // Keyless number (CONVENTION s.4): a bare numeric token -> the number slot's
    // prop, coerced to a Number. Comes before enum/bool so `Progress 60` sets value.
    if (numberSlot && /^-?\d+(?:\.\d+)?$/.test(v)) {
      const to = /** @type {string} */ (numberSlot.to);
      if (Object.hasOwn(props, to)) throw new WiremarkError(`${raw.name}: "${to}" set more than once (\`${v}\`)`, loc);
      props[to] = Number(v);
      continue;
    }
    const enumSlot = enumSlots.find((s) => comp.props[s.to]?.values?.includes(v));
    if (enumSlot) {
      const to = /** @type {string} */ (enumSlot.to);
      if (Object.hasOwn(props, to)) throw new WiremarkError(`${raw.name}: "${to}" set more than once (\`${v}\`)`, loc);
      props[to] = v;
      continue;
    }
    // Keyless boolean (CONVENTION s.3): a bare token naming a boolean prop -> true.
    // A boolean prop is keyless simply by being declared; no separate slot kind.
    const boolProp = comp.props[v];
    if (boolProp && boolProp.type === 'boolean') {
      if (Object.hasOwn(props, v)) throw new WiremarkError(`${raw.name}: "${v}" set more than once`, loc);
      props[v] = true;
      continue;
    }
    // Keyless icon name (ICONS.md ss.2): on an element whose literal slot targets
    // an icon-typed prop, a bare token is the icon name -- `Icon Search`,
    // `Fab edit`. Tried LAST so it can never shadow sizing/enum/boolean tokens
    // (`Fab large` stays a size; quote the name to force an icon: `Fab "large"`).
    if (literalSlot && comp.props[literalSlot.to ?? '']?.type === 'icon' && !sawLiteral) {
      const to = /** @type {string} */ (literalSlot.to);
      if (Object.hasOwn(props, to)) throw new WiremarkError(`${raw.name}: "${to}" set more than once (\`${v}\`)`, loc);
      props[to] = v;
      sawLiteral = true;
      continue;
    }
    throw new WiremarkError(`${raw.name}: unexpected token \`${v}\``, loc);
  }

  /** @type {ResolvedNode} */
  const node = {
    component: raw.name,
    props,
    children: raw.children.map(resolveNode),
    line: raw.line,
  };
  if (id !== undefined) node.id = id;
  if (sizes.length) node.size = { w: sizes[0], h: sizes[1] }; // SPEC ss.4: width then height
  if (filler) node.filler = filler;

  // Card flatten (SPEC ss.5.3): a Card with no explicit Card* children treats
  // all of its children as living in one implicit CardContent, so the layout
  // engine sees a uniform Card -> CardContent -> ... shape either way.
  if (node.component === 'Card' && node.children.length
      && !node.children.some((c) => CARD_PARTS.has(c.component))) {
    node.children = [{ component: 'CardContent', props: {}, children: node.children, line: node.line }];
  }
  return node;
}

/**
 * Push a frame-level `filler=` style down to every text-bearing descendant that
 * doesn't carry its own (SPEC ss.6: the style is set "at two levels", element
 * over frame). Element strategies render from their own props, so the inherited
 * default is materialized here at resolve time.
 * @param {ResolvedNode[]} nodes @param {string} style
 */
function inheritFillerStyle(nodes, style) {
  for (const node of nodes) {
    if (getComponent(node.component)?.text && node.props.filler == null) node.props.filler = style;
    inheritFillerStyle(node.children, style);
  }
}

/**
 * Resolve a top-level `Wireframe` node into a Frame (SPEC ss.5.1).
 * @param {RawNode} raw
 * @returns {Frame}
 */
function resolveFrame(raw) {
  const loc = { line: raw.line };
  if (raw.name !== 'Wireframe')
    throw new WiremarkError(`a top-level node must be a Wireframe frame, found "${raw.name}"`, loc);
  const comp = /** @type {NonNullable<ReturnType<typeof getComponent>>} */ (getComponent('Wireframe'));

  /** @type {Record<string, *>} */
  const props = {};
  let id;
  let preset;

  for (const tok of raw.tokens) {
    if (tok.kind === 'literal') throw new WiremarkError('Wireframe does not take a text literal', loc);
    if (tok.kind === 'keyed') {
      resolveKeyed(props, tok, comp, 'Wireframe', loc);
      continue;
    }
    const v = tok.value;
    if (v.startsWith('#')) { id = v.slice(1); continue; }
    if (PRESETS.includes(v)) { preset = v; continue; }
    throw new WiremarkError(`Wireframe: unexpected token \`${v}\` (expected #id or a preset: ${PRESETS.join(', ')})`, loc);
  }

  const children = raw.children.map(resolveNode);
  if (typeof props.filler === 'string') inheritFillerStyle(children, props.filler);
  return { id, preset, props, children, line: raw.line };
}

/**
 * Post-walk warnings over a frame's element tree (tasks/FOREGROUND.md): an
 * `Anchor` with no `#id` can never be targeted by `anchor=`, and a duplicate
 * element `#id` within one frame shadows -- the first declaration wins (layout
 * searches in document order). Soft diagnostics; resolution already succeeded.
 * Frame ids are a separate namespace (SPEC ss.7.1) and stay out of the set.
 * @param {Frame} frame
 * @param {Diagnostic[]} diagnostics
 */
function checkElementIds(frame, diagnostics) {
  /** @type {Set<string>} */
  const seen = new Set();
  /** @param {ResolvedNode[]} nodes */
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.component === 'Anchor' && node.id === undefined)
        diagnostics.push(diagnostic('warning', 'Anchor without #id can never be targeted', { line: node.line }));
      if (node.id !== undefined) {
        if (seen.has(node.id))
          diagnostics.push(diagnostic('warning', `duplicate id "#${node.id}" in frame "#${frame.id ?? '?'}"`, { line: node.line }));
        else seen.add(node.id);
      }
      walk(node.children);
    }
  };
  walk(frame.children);
}

/**
 * Inline-icon path data alphabet: SVG `<path d>` commands, numbers, and
 * separators only. Enforced so an `Icons` entry can never smuggle markup,
 * styles, or scripts into the SVG (ICONS.md ss.4a -- path-data-only by design;
 * the literal is embedded verbatim in a `d="..."` attribute downstream).
 */
const PATH_DATA_RE = /^[MmLlHhVvCcSsQqTtAaZz0-9eE+\-.,\s]+$/;

/** Inline icons default to the Material 24x24 grid, like the built-in set. */
const INLINE_VIEWBOX = 24;

/**
 * Resolve one `src=` inline-icon entry through the host's `loadIcon` callback.
 * Core never touches the filesystem (SPEC ss.1): the host (CLI / editor)
 * supplies the loader and owns path resolution + sanitization (ICONS.md
 * ss.4c). Any failure degrades to null -- the entry renders as the
 * placeholder, with a soft Diagnostic saying why.
 * @param {string} name @param {string} src @param {number|undefined} viewBox
 * @param {{ loadIcon?: (src: string) => * }} options
 * @param {Diagnostic[]} diagnostics @param {{ line: number }} loc
 * @returns {import('./icons.js').ResolvedIcon|null}
 */
function loadIconSrc(name, src, viewBox, options, diagnostics, loc) {
  const warn = (/** @type {string} */ why) =>
    diagnostics.push(diagnostic('warning', `icon "${name}": ${why} -- rendered as placeholder`, loc));
  if (typeof options.loadIcon !== 'function') {
    warn(`src= needs a host that loads files (e.g. the CLI)`);
    return null;
  }
  let loaded;
  try {
    loaded = options.loadIcon(src);
  } catch (err) {
    warn(`cannot load "${src}": ${/** @type {Error} */ (err).message}`);
    return null;
  }
  if (typeof loaded === 'string' && loaded !== '') return { body: loaded, viewBox: viewBox ?? INLINE_VIEWBOX };
  if (typeof loaded === 'object' && loaded !== null && typeof loaded.body === 'string' && loaded.body !== '') {
    return { body: loaded.body, viewBox: viewBox ?? (Number(loaded.viewBox) || INLINE_VIEWBOX) };
  }
  warn(`cannot load "${src}"`);
  return null;
}

/**
 * Consume one top-level `Icons` block (ICONS.md ss.4a -- the SPEC ss.10.3
 * extension point) into the document-inline icon map. Entries are
 * `name "<path d>" [viewBox=N]` or `name src=<path> [viewBox=N]`; malformed
 * entries are hard errors (author-must-fix, like any structural problem), a
 * duplicate name is a soft warning and the first declaration wins (the
 * element-#id convention).
 * @param {RawNode} raw
 * @param {Map<string, import('./icons.js').ResolvedIcon|null>} icons
 * @param {Diagnostic[]} diagnostics
 * @param {{ loadIcon?: (src: string) => * }} options
 */
function collectInlineIcons(raw, icons, diagnostics, options) {
  if (raw.tokens.length)
    throw new WiremarkError('Icons takes no tokens of its own -- icons are its children', { line: raw.line });
  for (const entry of raw.children) {
    const loc = { line: entry.line };
    if (entry.children.length)
      throw new WiremarkError(`Icons: "${entry.name}" takes no children`, loc);

    /** @type {string|undefined} */ let d;
    /** @type {string|undefined} */ let src;
    /** @type {number|undefined} */ let viewBox;
    for (const tok of entry.tokens) {
      if (tok.kind === 'literal') {
        if (d !== undefined) throw new WiremarkError(`Icons: "${entry.name}" has more than one path literal`, loc);
        d = tok.value;
      } else if (tok.kind === 'keyed' && tok.key === 'viewBox') {
        const n = Number(tok.value);
        if (tok.quoted || !Number.isFinite(n) || n <= 0)
          throw new WiremarkError(`Icons: "${entry.name}": viewBox= expects a positive number`, loc);
        viewBox = n;
      } else if (tok.kind === 'keyed' && tok.key === 'src') {
        src = tok.value;
      } else {
        const shown = tok.kind === 'keyed' ? `${tok.key}=` : tok.value;
        throw new WiremarkError(`Icons: "${entry.name}": unexpected token \`${shown}\``, loc);
      }
    }
    if (d !== undefined && src !== undefined)
      throw new WiremarkError(`Icons: "${entry.name}" takes a path literal or src=, not both`, loc);
    if (d === undefined && src === undefined)
      throw new WiremarkError(`Icons: "${entry.name}" needs a "<path data>" literal or src=`, loc);
    if (d !== undefined && !PATH_DATA_RE.test(d))
      throw new WiremarkError(`Icons: "${entry.name}": the literal must be SVG path data, not markup`, loc);

    const key = normalizeIconName(entry.name);
    if (icons.has(key)) {
      diagnostics.push(diagnostic('warning', `duplicate icon "${entry.name}" -- the first declaration wins`, loc));
      continue;
    }
    icons.set(key, d !== undefined
      ? { body: d, viewBox: viewBox ?? INLINE_VIEWBOX }
      : loadIconSrc(entry.name, /** @type {string} */ (src), viewBox, options, diagnostics, loc));
  }
}

/**
 * Post-pass over a resolved tree: resolve every icon-typed prop against the
 * lookup chain (inline -> injected -> built-in) and annotate the node for
 * draw.js's drawIcon (ICONS.md ss.3). An UNSET prop falls back to its
 * PropDef `default` icon name (the one deliberate exception to the
 * no-default-injection rule: `props` stays untouched, only the artwork
 * annotation is added, so CardHeader's default Close glyph resolves without
 * the element re-doing lookup). `none`/empty means "explicitly no icon" --
 * no annotation, no warning. Unknown names warn ONLY when author-written;
 * a missing default is the element author's bug, not the document's.
 * @param {ResolvedNode[]} nodes
 * @param {{ inline: Map<string, import('./icons.js').ResolvedIcon|null>, injected: Map<string, import('./icons.js').ResolvedIcon> }} scopes
 * @param {Diagnostic[]} diagnostics
 */
function annotateIcons(nodes, scopes, diagnostics) {
  for (const node of nodes) {
    const comp = getComponent(node.component);
    for (const [key, def] of Object.entries(comp?.props ?? {})) {
      if (def.type !== 'icon') continue;
      const explicit = typeof node.props[key] === 'string' ? node.props[key] : undefined;
      const name = explicit ?? (typeof def.default === 'string' ? def.default : undefined);
      // `none`/empty = "explicitly no icon", spelled as forgivingly as any
      // icon name (none/None/NONE), since icon lookup itself is case-blind.
      if (name === undefined || name === '' || name.toLowerCase() === 'none') continue;
      const resolved = resolveIcon(name, scopes);
      (node.icons ??= {})[key] = resolved;
      // Warn only for an author-written name that resolved nowhere. A name the
      // document DECLARED inline but whose src= failed to load already warned
      // at the declaration site -- repeating "unknown icon" per use would be
      // both noisy and wrong (the name is known; its artwork failed).
      if (resolved === null && explicit !== undefined && !scopes.inline.has(normalizeIconName(explicit))) {
        diagnostics.push(diagnostic('warning', `unknown icon "${explicit}" -- rendered as placeholder`, { line: node.line }));
      }
    }
    annotateIcons(node.children, scopes, diagnostics);
  }
}

/**
 * @param {RawNode[]} roots
 * @param {object} [options]
 * @param {*} [options.icons]     injected icons: flat name->body map, Iconify
 *                                JSON pack(s), or an array of both (ICONS.md ss.4b)
 * @param {(src: string) => *} [options.loadIcon]  host file loader for `Icons`
 *                                `src=` entries (ICONS.md ss.4c); core never reads files
 * @returns {Document}
 */
export function resolve(roots, options = {}) {
  /** @type {Diagnostic[]} */
  const diagnostics = [];
  /** @type {Map<string, import('./icons.js').ResolvedIcon|null>} */
  const inline = new Map();
  /** @type {RawNode[]} */
  const frameRoots = [];
  // An `Icons` root is a document-level declaration, not a frame (ICONS.md
  // ss.4a): consume it into the inline icon map wherever it appears; its
  // icons apply document-wide regardless of source order.
  for (const r of roots) {
    if (r.name === 'Icons') collectInlineIcons(r, inline, diagnostics, options);
    else frameRoots.push(r);
  }
  const scopes = { inline, injected: buildInjectedIcons(/** @type {*} */ (options).icons) };
  const frames = frameRoots.map((r) => resolveFrame(r));
  for (const frame of frames) {
    checkElementIds(frame, diagnostics);
    annotateIcons(frame.children, scopes, diagnostics);
  }
  return { frames, diagnostics };
}
