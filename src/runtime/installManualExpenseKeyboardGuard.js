const INSTALL_FLAG = "__claraManualExpenseKeyboardGuardInstalled";
const KEYBOARD_THRESHOLD_PX = 80;
const EDGE_GAP_PX = 16;

function getManualExpenseContext(target) {
  const sheet = target?.closest?.(".clara-manual-expense-sheet");
  if (!sheet) return null;

  const dialog = sheet.querySelector('form[role="dialog"]');
  if (!dialog) return null;

  const scrollArea = Array.from(dialog.children).find((child) =>
    child.querySelector?.("[data-expense-step]")
  );

  if (!scrollArea || !scrollArea.contains(target)) return null;
  return { dialog, scrollArea };
}

function getVisibleViewportBounds() {
  const viewport = window.visualViewport;
  const top = viewport?.offsetTop || 0;
  const height = viewport?.height || window.innerHeight;

  return {
    top,
    bottom: top + height,
  };
}

function getKeyboardInset() {
  const { bottom } = getVisibleViewportBounds();
  const inset = Math.max(0, window.innerHeight - bottom);
  return inset > KEYBOARD_THRESHOLD_PX ? inset : 0;
}

function syncScrollSpace(dialog, scrollArea) {
  const keyboardInset = getKeyboardInset();
  dialog.style.setProperty(
    "--clara-manual-expense-keyboard-inset",
    `${keyboardInset}px`
  );
  scrollArea.style.paddingBottom =
    "calc(1rem + var(--clara-manual-expense-keyboard-inset, 0px))";
  scrollArea.style.scrollPaddingBottom =
    "calc(1rem + var(--clara-manual-expense-keyboard-inset, 0px))";
}

function revealControl(target, behavior = "smooth") {
  const context = getManualExpenseContext(target);
  if (!context) return;

  const { dialog, scrollArea } = context;
  syncScrollSpace(dialog, scrollArea);

  const viewport = getVisibleViewportBounds();
  const scrollRect = scrollArea.getBoundingClientRect();
  const controlRect = target.getBoundingClientRect();
  const visibleTop = Math.max(scrollRect.top, viewport.top) + EDGE_GAP_PX;
  const visibleBottom =
    Math.min(scrollRect.bottom, viewport.bottom) - EDGE_GAP_PX;

  if (visibleBottom <= visibleTop) return;

  let delta = 0;
  if (controlRect.bottom > visibleBottom) {
    delta = controlRect.bottom - visibleBottom;
  } else if (controlRect.top < visibleTop) {
    delta = controlRect.top - visibleTop;
  }

  if (Math.abs(delta) > 1) {
    scrollArea.scrollBy({ top: delta, behavior });
  }
}

export function installManualExpenseKeyboardGuard() {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    window[INSTALL_FLAG]
  ) {
    return;
  }

  window[INSTALL_FLAG] = true;
  let revealFrame = 0;
  let focusTimer = 0;

  const revealActiveControl = (behavior = "auto") => {
    window.cancelAnimationFrame(revealFrame);
    revealFrame = window.requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active?.matches?.("input, textarea, select")) {
        revealControl(active, behavior);
      }
    });
  };

  const handleFocusIn = (event) => {
    const target = event.target;
    if (
      !target?.matches?.("input, textarea, select") ||
      !target.closest?.(".clara-manual-expense-sheet")
    ) {
      return;
    }

    revealControl(target, "auto");
    window.clearTimeout(focusTimer);
    focusTimer = window.setTimeout(() => revealControl(target, "smooth"), 280);
  };

  const handleViewportChange = () => revealActiveControl("auto");

  document.addEventListener("focusin", handleFocusIn, true);
  window.visualViewport?.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("scroll", handleViewportChange);
}

installManualExpenseKeyboardGuard();
