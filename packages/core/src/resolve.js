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

/** The explicit Card sub-part components (SPEC ss.5.3). */
const CARD_PARTS = new Set(['CardMedia', 'CardContent', 'CardActions']);

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

  const slots = comp.keyless ?? [];
  const literalSlot = slots.find((s) => s.kind === 'literal');
  const enumSlot = slots.find((s) => s.kind === 'enum');
  const enumProp = enumSlot ? comp.props[enumSlot.to] : null;
  let sawLiteral = false;

  for (const tok of raw.tokens) {
    if (tok.kind === 'literal') {
      if (!literalSlot) throw new WiremarkError(`${raw.name} does not take a text literal`, loc);
      if (sawLiteral) throw new WiremarkError(`${raw.name}: more than one text literal`, loc);
      props[literalSlot.to] = tok.value;
      sawLiteral = true;
      continue;
    }
    if (tok.kind === 'keyed') {
      const prop = comp.props[tok.key];
      if (!prop) throw new WiremarkError(`${raw.name}: unknown property "${tok.key}="`, loc);
      props[tok.key] = coerce(prop, tok, raw.name, loc);
      continue;
    }
    // bare token: sizing | filler | keyless enum | boolean flag (in that order)
    const v = tok.value;
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
    if (enumProp && enumProp.values && enumProp.values.includes(v)) { props[enumSlot.to] = v; continue; }
    const flag = comp.props[v];
    if (flag && flag.type === 'boolean') { props[v] = true; continue; }
    throw new WiremarkError(`${raw.name}: unexpected token \`${v}\``, loc);
  }

  /** @type {ResolvedNode} */
  const node = {
    component: raw.name,
    props,
    children: raw.children.map(resolveNode),
    line: raw.line,
  };
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
      const prop = comp.props[tok.key];
      if (!prop) throw new WiremarkError(`Wireframe: unknown property "${tok.key}="`, loc);
      props[tok.key] = coerce(prop, tok, 'Wireframe', loc);
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
