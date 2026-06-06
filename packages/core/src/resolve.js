// @ts-check
import { WiremarkError } from './errors.js';
import { getComponent } from './registry.js';
import { PRESETS } from './elements/common.js';

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
const CARD_PARTS = new Set(['CardContent', 'CardActions']);

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
    // size/filler/enum/flag -- so it is captured first. For now the id is only
    // recorded (no layout/render/flow use yet); future versions consume it.
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

  return { id, preset, props, children: raw.children.map(resolveNode), line: raw.line };
}

/**
 * @param {RawNode[]} roots
 * @param {object} [options]
 * @returns {Document}
 */
export function resolve(roots, options = {}) {
  void options;
  /** @type {Diagnostic[]} */
  const diagnostics = [];
  const frames = roots.map((r) => resolveFrame(r));
  return { frames, diagnostics };
}
