// @ts-check
/**
 * Spacer -- a gap between siblings. Sized (`Spacer 16px`, `Spacer 24px 8px`) it
 * is a fixed gap; unsized it flexes, absorbing the leftover main-axis space of
 * its Stack to push the following siblings to the far edge. (SPEC ss.5.2)
 *
 * Strategy: `sizing:true` accepts the spec's keyless `width`/`height` (`w`/`h`)
 * tokens -> `node.size`, consumed by the layout engine. `flex:true` is the
 * fallback used ONLY when no size token is given (layout.js arrangeLinear, the
 * `s.flex===true` guard), so an explicit size always wins; flex here is an
 * engine strategy, not a DSL token, so it doesn't violate the strict spec. The
 * intrinsic stays 0x0: a px token pins via measure() regardless of intrinsic,
 * and flex doesn't read it -- so 0 keeps an unsized, non-flexing Spacer (one in
 * a content-sized axis with no slack) from injecting a ghost gap.
 *
 * The spec gives width/height a "default 1", but per the team-lead ruling that
 * is intentionally NOT realized as a fixed intrinsic: flex semantics supersede
 * when the Spacer is unsized (it occupies the leftover space, else nothing), and
 * a fixed 1x1 / SPACINGxSPACING floor was rejected because it injects a ghost
 * extent that breaks the login row's flex-push. The login form's Spacer flexes
 * (its row is stretched by the outer column), so it is unaffected.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Spacer',
  tier: 'v0.1',
  category: 'layout',
  props: {},
  notes: 'Gap between siblings: sized = fixed, unsized = flexes to fill a sized/stretched Stack.',

  sizing: true,
  flex: true,
  intrinsic: () => ({ w: 0, h: 0 }),
};
