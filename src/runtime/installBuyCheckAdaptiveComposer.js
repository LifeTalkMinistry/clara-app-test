const BUY_CHECK_COMPOSER_SELECTOR = '[data-clara-buy-check-react-form="true"] textarea';
const COMPOSER_MIN_HEIGHT = 44;
const COMPOSER_ABSOLUTE_MAX_HEIGHT = 480;
const COMPOSER_VIEWPORT_RESERVE = 170;

function availableComposerHeight() {
  const viewportHeight = Number(
    window.visualViewport?.height ||
      document.documentElement?.clientHeight ||
      window.innerHeight ||
      800,
  );

  return Math.max(
    160,
    Math.min(COMPOSER_ABSOLUTE_MAX_HEIGHT, viewportHeight - COMPOSER_VIEWPORT_RESERVE),
  );
}

function resizeComposer(textarea) {
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  if (!textarea.matches(BUY_CHECK_COMPOSER_SELECTOR)) return;

  const maxHeight = availableComposerHeight();

  // React's composer still owns the text value. This patch owns only the
  // presentation height so long drafts can be reviewed before sending.
  textarea.style.setProperty('height', '0px', 'important');
  textarea.style.setProperty('max-height', `${maxHeight}px`, 'important');

  const contentHeight = textarea.scrollHeight;
  const nextHeight = Math.min(
    Math.max(contentHeight, COMPOSER_MIN_HEIGHT),
    maxHeight,
  );

  textarea.style.setProperty('height', `${nextHeight}px`, 'important');
  textarea.style.setProperty(
    'overflow-y',
    contentHeight > maxHeight ? 'auto' : 'hidden',
    'important',
  );
}

function resizeAllComposers() {
  document.querySelectorAll(BUY_CHECK_COMPOSER_SELECTOR).forEach(resizeComposer);
}

function scheduleResize(textarea) {
  // The component currently runs its own post-render height effect. Two frames
  // ensure this content-first sizing wins after React has committed the draft.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => resizeComposer(textarea));
  });
}

function handleComposerActivity(event) {
  const textarea = event.target;
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  if (!textarea.matches(BUY_CHECK_COMPOSER_SELECTOR)) return;
  scheduleResize(textarea);
}

function handleAddedNodes(mutations) {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;

      if (node.matches?.(BUY_CHECK_COMPOSER_SELECTOR)) {
        scheduleResize(node);
      }

      node.querySelectorAll?.(BUY_CHECK_COMPOSER_SELECTOR).forEach(scheduleResize);
    }
  }
}

function installBuyCheckAdaptiveComposer() {
  if (window.__claraBuyCheckAdaptiveComposerInstalled) return;
  window.__claraBuyCheckAdaptiveComposerInstalled = true;

  document.addEventListener('input', handleComposerActivity, true);
  document.addEventListener('paste', handleComposerActivity, true);
  document.addEventListener('focusin', handleComposerActivity, true);

  const observer = new MutationObserver(handleAddedNodes);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('resize', resizeAllComposers, { passive: true });
  window.visualViewport?.addEventListener('resize', resizeAllComposers, { passive: true });

  resizeAllComposers();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installBuyCheckAdaptiveComposer, { once: true });
} else {
  installBuyCheckAdaptiveComposer();
}
