// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { REGISTRY, getComponent } from '../src/registry.js';
import { resolve } from '../src/resolve.js';
import { buildTree } from '../src/tree.js';
import { lex } from '../src/lexer.js';

/**
 * Foundation regression suite (Task #1) -- locks in the resolver/prop-model
 * capabilities element devs depend on, INDEPENDENT of any element migration:
 *  - prop ALIASES (keyed `gap=`/`href=` -> canonical prop)
 *  - MULTIPLE keyless enums, disambiguated by disjoint value domains
 *  - keyless BOOLEANS (explicit `flag` slot + implicit bare-name -> true)
 *  - to/href reconciliation (canonical `to`, `href` as its universal alias)
 *
 * The multi-enum / keyless-bool cases are driven through a synthetic component
 * registered into REGISTRY for the test, mirroring the spec shapes (Control /
 * Button) so the contract is verified before those elements land. See
 * /tmp/wiremark-team/CONVENTION.md for the authoring contract this enforces.
 */

const parse = (src) => resolve(buildTree(lex(src)));

/** Register a synthetic element for the duration of a test, then remove it. */
function withElement(def, fn) {
  REGISTRY[def.name] = def;
  try { fn(); } finally { delete REGISTRY[def.name]; }
}

/** A Control-shaped element: 2 keyless enums (disjoint) + 2 keyless booleans + a literal. */
const CONTROLISH = {
  name: 'Controlish', tier: 'v0.1', category: 'inputs',
  props: {
    label: { type: 'string' },
    variant: { type: 'enum', values: ['radio', 'checkbox', 'switch'], default: 'checkbox' },
    size: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
    checked: { type: 'boolean', default: false },
    disabled: { type: 'boolean', default: false },
    spacing: { type: 'number', default: 0, aliases: ['gap'] },
  },
  // Only the enums + literal get keyless entries; the booleans (checked/disabled)
  // are keyless simply by being declared boolean props (CONVENTION s.3).
  keyless: [
    { kind: 'literal', to: 'label' },
    { kind: 'enum', to: 'variant' },
    { kind: 'enum', to: 'size' },
  ],
  intrinsic: () => ({ w: 10, h: 10 }),
};

// --- prop aliases -------------------------------------------------------------

test('alias: a keyed token under an alias lands on the canonical prop (coerced)', () => {
  withElement(CONTROLISH, () => {
    const n = parse('Wireframe\n  Controlish gap=3').frames[0].children[0];
    assert.equal(n.props.spacing, 3, 'gap= resolves to spacing, coerced to a number');
    assert.ok(!('gap' in n.props), 'the alias name is not stored');
  });
});

test('alias: the canonical spelling still works', () => {
  withElement(CONTROLISH, () => {
    const n = parse('Wireframe\n  Controlish spacing=4').frames[0].children[0];
    assert.equal(n.props.spacing, 4);
  });
});

test('alias: setting a prop via both canonical and alias is an ambiguity error', () => {
  withElement(CONTROLISH, () => {
    assert.throws(() => parse('Wireframe\n  Controlish gap=1 spacing=2'), /more than once/);
  });
});

test('getComponent exposes the alias -> canonical map', () => {
  withElement(CONTROLISH, () => {
    const c = getComponent('Controlish');
    assert.ok(c);
    assert.equal(c.aliases.gap, 'spacing');
    assert.equal(c.aliases.href, 'to', 'the universal href alias is present on every component');
  });
});

// --- multiple keyless enums ---------------------------------------------------

test('multi-enum: two keyless enums resolve by value domain, in any order', () => {
  withElement(CONTROLISH, () => {
    const a = parse('Wireframe\n  Controlish switch large').frames[0].children[0];
    assert.equal(a.props.variant, 'switch');
    assert.equal(a.props.size, 'large');

    const b = parse('Wireframe\n  Controlish large switch').frames[0].children[0];
    assert.equal(b.props.variant, 'switch', 'order does not matter');
    assert.equal(b.props.size, 'large');
  });
});

test('multi-enum: two values for the SAME enum is an error', () => {
  withElement(CONTROLISH, () => {
    assert.throws(() => parse('Wireframe\n  Controlish switch radio'), /set more than once/);
  });
});

test('single keyless enum still behaves (N=1 unchanged)', () => {
  // A bare enum value resolves whether the element has one keyless enum or several.
  const stack = parse('Wireframe\n  Stack row').frames[0].children[0];
  assert.equal(stack.props.direction, 'row');
});

// --- keyless booleans (declared boolean prop is keyless; no `flag` slot) -------

test('keyless bool: a bare token naming a boolean prop turns it true', () => {
  withElement(CONTROLISH, () => {
    const checked = parse('Wireframe\n  Controlish checked').frames[0].children[0];
    assert.equal(checked.props.checked, true);
    const disabled = parse('Wireframe\n  Controlish disabled').frames[0].children[0];
    assert.equal(disabled.props.disabled, true);
  });
});

test('keyless bool: composes with multi-enum + literal in any order', () => {
  withElement(CONTROLISH, () => {
    const n = parse('Wireframe\n  Controlish "Accept" switch checked large disabled').frames[0].children[0];
    assert.deepEqual(
      { v: n.props.variant, s: n.props.size, c: n.props.checked, d: n.props.disabled, l: n.props.label },
      { v: 'switch', s: 'large', c: true, d: true, l: 'Accept' },
    );
  });
});

test('keyless bool: the keyed form (disabled=true/false) still works', () => {
  withElement(CONTROLISH, () => {
    assert.equal(parse('Wireframe\n  Controlish disabled=true').frames[0].children[0].props.disabled, true);
    assert.equal(parse('Wireframe\n  Controlish disabled=false').frames[0].children[0].props.disabled, false);
  });
});

// --- to / href reconciliation -------------------------------------------------

test('to/href: href= is an alias of the universal to= (both -> props.to)', () => {
  // Button carries only the universal to=/href= here (no own href prop).
  const viaTo = parse('Wireframe #a\n  Button "Go" to=#dash').frames[0].children[0];
  const viaHref = parse('Wireframe #a\n  Button "Go" href=#dash').frames[0].children[0];
  assert.equal(viaTo.props.to, 'dash');
  assert.equal(viaHref.props.to, 'dash', 'href routes to the canonical to');
});

test('to/href: setting both to= and href= is an ambiguity error', () => {
  assert.throws(() => parse('Wireframe\n  Button "x" to=#a href=#b'), /more than once/);
});

test('to/href: no shipped element declares its own to/href prop', () => {
  for (const [name, def] of Object.entries(REGISTRY)) {
    assert.ok(!('to' in def.props), `${name} must not redeclare the universal to= prop`);
    assert.ok(!('href' in def.props), `${name} must not declare a separate href prop (use the universal to alias)`);
  }
});

// --- element anchor ids (#id) -------------------------------------------------

test('anchor id: a keyless #id is captured on node.id (sigil stripped), never in props', () => {
  const n = parse('Wireframe\n  Button "Go" #cta').frames[0].children[0];
  assert.equal(n.id, 'cta', 'the #id lands on the node, with the # stripped');
  assert.ok(!('id' in n.props), 'id is node-level metadata, not a resolved prop');
});

test('anchor id: composes with literal / enum / sizing in any order', () => {
  const a = parse('Wireframe\n  Typography h4 "Title" #heading').frames[0].children[0];
  assert.deepEqual({ id: a.id, v: a.props.variant, l: a.props.label }, { id: 'heading', v: 'h4', l: 'Title' });

  // order is irrelevant: the #id may lead, and it does not consume a sizing slot
  const b = parse('Wireframe\n  Spacer #content 16px').frames[0].children[0];
  assert.equal(b.id, 'content');
  assert.deepEqual(b.size.w, { unit: 'px', value: 16 }, 'the px token still resolves as the width');
});

test('anchor id: ANY element may be anchored, including leaves and nested nodes', () => {
  // Spacer declares no props of its own -- the anchor is universal, not opt-in.
  const spacer = parse('Wireframe\n  Spacer #content').frames[0].children[0];
  assert.equal(spacer.id, 'content');

  // A Card flattens its children into an implicit CardContent (SPEC ss.5.3); the
  // anchor on the nested Button survives that rewrite.
  const card = parse('Wireframe\n  Card #panel\n    Button "Go" #cta').frames[0].children[0];
  assert.equal(card.id, 'panel');
  assert.equal(card.children[0].component, 'CardContent');
  assert.equal(card.children[0].children[0].id, 'cta');
});

test('anchor id: setting two ids on one element is an error', () => {
  assert.throws(() => parse('Wireframe\n  Button "Go" #a #b'), /set more than once/);
});

// --- the disjoint-domains invariant (the replacement smoke assertion) ---------

test('INVARIANT: each component\'s keyless-enum value domains are pairwise disjoint', () => {
  for (const [name, def] of Object.entries(REGISTRY)) {
    const enumSlots = (def.keyless ?? []).filter((s) => s.kind === 'enum');
    const seen = new Map(); // value -> the slot that claimed it
    for (const slot of enumSlots) {
      const values = def.props[slot.to]?.values ?? [];
      for (const v of values) {
        assert.ok(
          !seen.has(v),
          `${name}: keyless-enum value "${v}" appears in both "${seen.get(v)}" and "${slot.to}" (domains must be disjoint)`,
        );
        seen.set(v, slot.to);
      }
    }
  }
});
