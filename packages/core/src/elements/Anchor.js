// @ts-check
/**
 * Anchor -- an invisible, named region. A background frame declares
 * `Anchor #id` where foreground content belongs; a frame using that background
 * composes into it with `anchor=#id` (tasks/FOREGROUND.md; SPEC ss.5.1.2 proposed).
 *
 * Strategy: a zero-intrinsic leaf like Spacer, but block:true as well -- unsized
 * it fills its container's leftover space on BOTH axes (flex on the main axis,
 * block-stretch on the cross), so a bare `Anchor #id` means "the rest of this
 * container". Sizing tokens pin a fixed region. No render: it draws nothing.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Anchor',
  tier: 'v1.0',
  category: 'layout',
  props: {},
  notes: 'Invisible named region a foreground frame composes into via anchor=#id.',

  sizing: true,
  flex: true,
  block: true,
  intrinsic: () => ({ w: 0, h: 0 }),
};
