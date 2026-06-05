// @ts-check
/**
 * CardMedia -- the image/media region of a Card. (SPEC ss.5.3)
 *
 * Reference strategy (transparent region): a flush column (no padding, no gap)
 * that draws nothing of its own -- the child it holds, typically an `Img`
 * (often `ratio=16:9`), draws the media and bleeds to the card's edges. The Img
 * derives its own height from its aspect ratio against the card width, so the
 * media region needs no chrome here. `minSize` keeps an empty CardMedia from
 * collapsing to nothing so the slot still reads as a media area.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'CardMedia',
  tier: 'v1.0',
  category: 'surfaces',
  container: true,
  props: {},
  notes: 'Image/media region of a card.',

  layoutSpec: () => ({ axis: 'col', pad: 0, gap: 0 }),
  minSize: { w: 160, h: 100 },
};
