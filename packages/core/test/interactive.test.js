// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { render } from '../src/index.js';

/**
 * Interactive metadata (the `interactive` render option). When on, every element
 * AND frame is wrapped in a <g> carrying `data-wm-line` (its 1-based line in the
 * wiremark source) plus `data-wm-id` / `data-wm-component` / `data-wm-to` where
 * they apply, so an editor host can map a click in the SVG back to the source.
 * Core injects no script and runs nothing -- the host attaches its own listener.
 * Off (the default) leaves output byte-for-byte unchanged: no <g> wrappers, and a
 * `to=` stays a live <a> hyperlink.
 */

const SRC = [
  'Wireframe #home',                    // line 1 -- frame, id=home
  '  Card',                             // line 2 -- container
  '    Button "Save" #submit to=#home', // line 3 -- id + to=
  '  Typography "Hi"',                  // line 4 -- no id, no to=
].join('\n');

/** The opening `<g ...>` tag whose `data-wm-component` is `component` (or null). */
function tagOf(svg, component) {
  const m = svg.match(new RegExp(`<g [^>]*data-wm-component="${component}"[^>]*>`));
  return m ? m[0] : null;
}

/** Index of the `</g>` that closes the `<g` beginning at `openIdx` (balanced). */
function matchingClose(svg, openIdx) {
  const re = /<g[\s>]|<\/g>/g;
  re.lastIndex = openIdx;
  let depth = 0;
  let m;
  while ((m = re.exec(svg))) {
    if (m[0] === '</g>') { if (--depth === 0) return m.index; }
    else depth++;
  }
  return svg.length;
}

test('default (no option): emits no data-wm- metadata and keeps to= as a live <a>', () => {
  const { svg } = render(SRC);
  assert.ok(!svg.includes('data-wm-'), 'no metadata attributes when the toggle is off');
  assert.ok(!svg.includes('class="wm-node"'), 'no element wrappers when off');
  assert.ok(svg.includes('<a class="wm-link" href="#home">'), 'to= is a live link when off');
});

test('interactive: tags each element with its source line, id (only if present), and component', () => {
  const { svg } = render(SRC, { interactive: true });

  // Button on line 3 carries every attribute.
  const btn = tagOf(svg, 'Button');
  assert.ok(btn, 'Button is wrapped');
  assert.match(btn, /data-wm-line="3"/);
  assert.match(btn, /data-wm-id="submit"/);
  assert.match(btn, /data-wm-component="Button"/);

  // Typography on line 4 has line + component but NO id and NO to=.
  const typo = tagOf(svg, 'Typography');
  assert.ok(typo, 'Typography is wrapped');
  assert.match(typo, /data-wm-line="4"/);
  assert.doesNotMatch(typo, /data-wm-id=/, 'no data-wm-id when the element has no #id');
  assert.doesNotMatch(typo, /data-wm-to=/, 'no data-wm-to when the element has no to=');
});

test('interactive: to= is exposed as data-wm-to, with no live <a> hyperlink', () => {
  const { svg } = render(SRC, { interactive: true });
  assert.ok(!svg.includes('<a class="wm-link"'), 'the <a> link is suppressed in interactive mode');
  assert.match(/** @type {string} */ (tagOf(svg, 'Button')), /data-wm-to="home"/);
});

test('interactive: tags the frame group so blank frame chrome maps to the frame', () => {
  const { svg } = render(SRC, { interactive: true });
  const frame = tagOf(svg, 'Frame');
  assert.ok(frame, 'the frame group is tagged');
  assert.match(frame, /class="wm-frame"/);
  assert.match(frame, /data-wm-line="1"/);
  assert.match(frame, /data-wm-id="home"/);
});

test('interactive: a child wrapper nests inside its container wrapper (closest -> innermost)', () => {
  const { svg } = render(SRC, { interactive: true });
  const cardAttr = svg.indexOf('data-wm-component="Card"');
  const btnAttr = svg.indexOf('data-wm-component="Button"');
  assert.ok(cardAttr !== -1 && btnAttr !== -1);
  // The container opens before the child...
  assert.ok(cardAttr < btnAttr, 'container <g> opens before its child <g>');
  // ...and the child still opens before the container's matching </g>, i.e. the
  // Button group is INSIDE the Card group, not a following sibling.
  const cardOpen = svg.lastIndexOf('<g ', cardAttr);
  assert.ok(btnAttr < matchingClose(svg, cardOpen), 'child closes before its container');
});

test('interactive: ids are escaped for safe SVG attributes', () => {
  const { svg } = render('Wireframe\n  Button "x" #a&b', { interactive: true });
  assert.ok(svg.includes('data-wm-id="a&amp;b"'), 'an ampersand in an id is escaped');
});
