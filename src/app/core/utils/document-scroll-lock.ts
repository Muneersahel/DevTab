/**
 * Reference-counted body scroll lock for stacked modals (native `<dialog>`,
 * settings overlay, etc.). Restores prior inline `overflow` and
 * `padding-right` when the last lock is released. Compensates for scrollbar
 * gutter to avoid layout shift when `overflow: hidden` removes the scrollbar.
 */
let lockDepth = 0;
let priorOverflow = '';
let priorPaddingRight = '';

export function lockDocumentBodyScroll(document: Document): void {
  const body = document.body;
  if (!body) return;
  if (lockDepth === 0) {
    priorOverflow = body.style.overflow;
    priorPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  lockDepth++;
}

export function unlockDocumentBodyScroll(document: Document): void {
  const body = document.body;
  if (!body || lockDepth === 0) return;
  lockDepth--;
  if (lockDepth === 0) {
    body.style.overflow = priorOverflow;
    body.style.paddingRight = priorPaddingRight;
    priorOverflow = '';
    priorPaddingRight = '';
  }
}
