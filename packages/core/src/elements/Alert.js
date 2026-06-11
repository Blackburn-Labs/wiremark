// @ts-check
import { FILLER_STYLES } from './common.js';
import { surface, backgroundHatch, rline, text, COLORS } from '../draw.js';
import { textOf, measureText } from '../metrics.js';

/**
 * Alert -- a feedback banner: a left severity glyph followed by a message,
 * inside a bordered box. Keyless text is the message label; both `severity`
 * and `variant` are keyless enums (their value domains are disjoint, so
 * `Alert error filled "Saved"` parses regardless of token order -- CONVENTION
 * s.2.1). (SPEC ss.5.4, Feedback)
 *
 * Strategy (banner leaf, `block` so it fills its container's cross axis like a
 * real alert spans its column). The resolver injects no PropDef defaults, so
 * severity (`success`) and variant (`standard`) are applied here at draw time
 * (CONVENTION ss.6).
 *
 * This is a MONOCHROME sketch, so color can't carry severity. Each severity
 * instead draws a DISTINCT leading glyph so the four states are visually (and
 * assertably) different chrome:
 *   error `!`  warning `?`  info `i`  success `✓`
 *
 * The three variants give three distinguishable looks:
 *   - outlined: border only -- no tint, no accent bar.
 *   - standard: border + a light hand-drawn hatch tint + a thin left accent bar.
 *   - filled:   border + a DENSE hatch tint + a heavier left accent bar.
 * (Tint via the shared borderless `backgroundHatch`; the border keeps its own
 * normal roughness -- CONVENTION ss.8.)
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Leading glyph per severity; success is the spec default. */
const SEVERITY_GLYPH = { error: '!', warning: '?', info: 'i', success: '✓' };

/** Banner text size, its line box, inner padding, and the glyph gutter (px). */
const FS = 14;
const PAD_X = 12;
const PAD_Y = 10;
const GLYPH_W = 22; // gutter reserved for the leading severity glyph
const MIN_W = 160;

/** Left accent-bar stroke width per variant (outlined draws none). */
const BAR_W = { standard: 1.5, filled: 3 };

/** @param {import('./common.js').ResolvedNode} node */
const severityOf = (node) =>
  node.props.severity in SEVERITY_GLYPH ? node.props.severity : 'success';

/** @param {import('./common.js').ResolvedNode} node */
const variantOf = (node) =>
  node.props.variant in BAR_W || node.props.variant === 'outlined' ? node.props.variant : 'standard';

export default {
  name: 'Alert',
  tier: 'v1.0',
  category: 'feedback',
  text: true,
  props: {
    label: { type: 'string' },
    severity: { type: 'enum', values: ['error', 'warning', 'info', 'success'], default: 'success' },
    variant: { type: 'enum', values: ['standard', 'filled', 'outlined'], default: 'standard' },
    filler: { type: 'enum', values: FILLER_STYLES },
  },
  keyless: [
    { kind: 'literal', to: 'label' },
    { kind: 'enum', to: 'severity' },
    { kind: 'enum', to: 'variant' },
  ],
  notes: 'Severity + variant both keyless. Monochrome: severity shown by a leading glyph (! ? i ✓).',

  block: true,
  intrinsic: (node) => {
    const { w } = measureText(textOf(node, 'Alert'), FS);
    return {
      w: Math.max(MIN_W, w + GLYPH_W + 2 * PAD_X),
      h: Math.ceil(FS * 1.4) + 2 * PAD_Y,
    };
  },
  render: (node, box) => {
    const variant = variantOf(node);
    const glyph = SEVERITY_GLYPH[severityOf(node)];

    // standard/filled lay a borderless hatch tint under the border (filled denser);
    // outlined stays open. The border is drawn separately at its own roughness.
    let out = variant === 'outlined' ? '' : backgroundHatch(box, 'hatch', variant === 'filled');
    out += surface(box, {});

    // Left accent bar marks standard/filled (heavier when filled); outlined omits it.
    if (variant !== 'outlined') {
      out += rline(box.x, box.y + 2, box.x, box.y + box.h - 2, { strokeWidth: BAR_W[variant] });
    }

    // Leading severity glyph, then the message, both vertically centered.
    const cy = box.y + box.h / 2 + FS * 0.35;
    out += text(box.x + PAD_X, cy, glyph, { fontSize: FS + 2, weight: 700 });
    out += text(box.x + PAD_X + GLYPH_W, cy, textOf(node, 'Alert'),
      { fontSize: FS, maxW: box.w - 2 * PAD_X - GLYPH_W });
    return out;
  },
};
