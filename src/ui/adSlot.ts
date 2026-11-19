/**
 * Ad placements, as in jp_dk: a sticky 320×50 banner on every screen, and a
 * 300×250 MREC on the loading screen (the MREC lives in index.html and is
 * removed with the boot overlay).
 *
 * The banner is DOM, not canvas: a live ad tag (GPT, AdSense, IMA) renders its
 * own iframe and cannot paint into a 2D context. mountAdCreative() is the
 * integration point. The canvas stops above the banner (see --ad-h in
 * index.html), so the board never sits under it.
 */

const AD_HEIGHT_PX = 50;
const AD_LABEL = '広告';

let root: HTMLElement | null = null;
let creative: HTMLElement | null = null;

/** Binds to the banner markup in index.html and fills in the label and size. */
export function initAdSlot(): void {
  root = document.getElementById('ad-slot');
  if (!root) return;
  const frame = root.querySelector<HTMLElement>('#ad-frame');
  creative = root.querySelector<HTMLElement>('#ad-creative');
  if (frame) {
    frame.style.width = `min(100%, 320px)`;
    frame.style.height = `${AD_HEIGHT_PX}px`;
  }
  const label = root.querySelector<HTMLElement>('#ad-label');
  if (label) label.textContent = AD_LABEL;
}

/** Shows or hides the sticky banner. */
export function setAdVisible(visible: boolean): void {
  if (!root) return;
  root.dataset['hidden'] = visible ? 'false' : 'true';
}

/**
 * The GAM banner container, `#gam-banner-320x50`. Hand it to GAM:
 *
 *   const el = mountAdCreative();
 *   if (el) googletag.cmd.push(() => googletag.display(el.id));
 */
export function mountAdCreative(): HTMLElement | null {
  if (!creative) return null;
  return creative.querySelector<HTMLElement>('#gam-banner-320x50');
}
