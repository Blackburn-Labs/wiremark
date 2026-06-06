// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse, toFlowGraph, toMermaid } from '../src/index.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

/** @param {string} name */
function fixture(name) {
  return parse(readFileSync(join(FIXTURES, name), 'utf8'));
}

/**
 * @param {{ from: string, to: string, label?: string }[]} edges
 * @param {string} from
 * @param {string} to
 */
function findEdge(edges, from, to) {
  return edges.find((e) => e.from === from && e.to === to);
}

test('login flow: frame is a node and to= links become labeled edges (ss.7)', () => {
  const { nodes, edges } = toFlowGraph(fixture('login.wiremark'));

  assert.deepEqual(nodes, [{ id: 'login' }]);

  const toDashboard = findEdge(edges, 'login', 'dashboard');
  assert.ok(toDashboard, 'expected login -> dashboard (the Button)');
  assert.equal(toDashboard.label, 'Sign in');

  const toReset = findEdge(edges, 'login', 'reset');
  assert.ok(toReset, 'expected login -> reset (the Link)');
  assert.equal(toReset.label, 'Forgot?');

  // The graph is inferred only from to= links: nothing else in login navigates.
  assert.equal(edges.length, 2);
});

test('dashboard flow: each ListItem to= becomes an edge from the frame', () => {
  const { nodes, edges } = toFlowGraph(fixture('dashboard.wiremark'));

  assert.deepEqual(nodes, [{ id: 'dashboard' }]);

  for (const [target, label] of [
    ['home', 'Home'],
    ['reports', 'Reports'],
    ['settings', 'Settings'],
  ]) {
    const edge = findEdge(edges, 'dashboard', target);
    assert.ok(edge, `expected dashboard -> ${target}`);
    assert.equal(edge.label, label);
  }
  assert.equal(edges.length, 3);
});

test('edges may target frames not defined in this doc (ss.7.3)', () => {
  // login links to #dashboard and #reset, neither of which is a frame here.
  const { nodes, edges } = toFlowGraph(fixture('login.wiremark'));
  const ids = new Set(nodes.map((n) => n.id));
  assert.ok(!ids.has('dashboard'), 'target need not be a declared node');
  assert.ok(edges.every((e) => e.from === 'login'));
});

test('identical edges are de-duped', () => {
  const doc = parse(
    [
      'Wireframe #a',
      '  Stack column',
      '    Button "Go" to=#b',
      '    Button "Go" to=#b', // identical from/to/label -> one edge
      '    Link "Go" to=#b', // same from/to/label via a different element -> still one
    ].join('\n'),
  );
  const { edges } = toFlowGraph(doc);
  const aToB = edges.filter((e) => e.from === 'a' && e.to === 'b');
  assert.equal(aToB.length, 1, 'duplicate (from,to,label) edges collapse');
  assert.equal(aToB[0].label, 'Go');
});

test('a clickable region with no text yields an unlabeled edge', () => {
  const doc = parse(['Wireframe #a', '  Box * * to=#detail'].join('\n'));
  const { edges } = toFlowGraph(doc);
  assert.equal(edges.length, 1);
  assert.equal(edges[0].from, 'a');
  assert.equal(edges[0].to, 'detail');
  assert.equal(edges[0].label, undefined);
});

test('toMermaid(doc) emits a flowchart with nodes and edges', () => {
  const mermaid = toMermaid(fixture('login.wiremark'));

  assert.match(mermaid, /^flowchart TD/);
  assert.match(mermaid, /\blogin\b/);
  assert.match(mermaid, /\bdashboard\b/);
  // labeled edge uses Mermaid's -->|label| syntax
  assert.match(mermaid, /login -->\|Sign in\| dashboard/);
  assert.match(mermaid, /login -->\|Forgot\?\| reset/);
});

test('toMermaid accepts an already-built FlowGraph', () => {
  const graph = toFlowGraph(fixture('dashboard.wiremark'));
  const fromGraph = toMermaid(graph);
  const fromDoc = toMermaid(fixture('dashboard.wiremark'));
  assert.equal(fromGraph, fromDoc, 'graph and doc inputs agree');
  assert.match(fromGraph, /dashboard --> home|dashboard -->\|Home\| home/);
});

test('toMermaid: unlabeled edge uses the plain --> form', () => {
  const doc = parse(['Wireframe #a', '  Box * * to=#detail'].join('\n'));
  const mermaid = toMermaid(doc);
  assert.match(mermaid, /a --> detail/);
});
