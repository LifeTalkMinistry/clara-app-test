import { useLayoutEffect, useRef } from "react";

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function measurableRect(element) {
  if (!(element instanceof HTMLElement)) return null;
  const ownRect = element.getBoundingClientRect();
  if (ownRect.height > 0 || ownRect.width > 0) return ownRect;

  const descendants = Array.from(element.querySelectorAll("*"));
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;

  descendants.forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    const rect = child.getBoundingClientRect();
    if (!(rect.height > 0 || rect.width > 0)) return;
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
    left = Math.min(left, rect.left);
  });

  if (!Number.isFinite(top) || !Number.isFinite(bottom)) return ownRect;
  return {
    top,
    right,
    bottom,
    left,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function isVisibleElement(element) {
  if (!(element instanceof HTMLElement)) return false;
  if (element.hidden) return false;
  const style = window.getComputedStyle?.(element);
  if (style?.display === "none" || style?.visibility === "hidden") return false;
  const rect = measurableRect(element);
  return Boolean(rect && (rect.height > 0 || rect.width > 0));
}

function resolveElement(ref, mode = "self") {
  const owner = ref?.current;
  if (!(owner instanceof HTMLElement)) return null;

  if (mode === "last-child") {
    const children = Array.from(owner.children);
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];
      if (isVisibleElement(child)) return child;
    }
    return null;
  }

  if (mode === "latest-assistant") {
    const children = Array.from(owner.children);
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];
      if (!(child instanceof HTMLElement) || !isVisibleElement(child)) continue;
      if (child.classList.contains("justify-start")) return child;
    }
    return null;
  }

  return owner;
}

/**
 * Canonical CLARA conversation viewport authority.
 *
 * A caller supplies one semantic reveal key only after the current turn is fully
 * actionable. The hook then performs at most one layout-time reveal for that key.
 * Passive renders, typewriter ticks, keyboard geometry changes, and DOM mutations
 * do not authorize additional transcript movement.
 *
 * For large conversation owners that already render transcript rows and controls
 * as direct children of one stack, the optional ref modes let that stack remain
 * the only ref wiring: `latest-assistant` resolves the newest completed CLARA row
 * and `last-child` resolves the currently mounted action region.
 */
export default function useClaraConversationReveal({
  viewportRef,
  assistantRef,
  actionRef = null,
  assistantRefMode = "self",
  actionRefMode = "self",
  revealKey,
  enabled = true,
  requireAction = false,
  behavior = "smooth",
}) {
  const lastRevealedKeyRef = useRef(null);

  useLayoutEffect(() => {
    if (!enabled || revealKey == null || typeof window === "undefined") return undefined;

    const semanticKey = String(revealKey);
    if (lastRevealedKeyRef.current === semanticKey) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const viewport = viewportRef?.current;
      const assistant = resolveElement(assistantRef, assistantRefMode);
      const action = actionRef ? resolveElement(actionRef, actionRefMode) : null;

      if (!(viewport instanceof HTMLElement) || !(assistant instanceof HTMLElement)) return;
      if (requireAction && !(action instanceof HTMLElement)) return;

      const viewportRect = viewport.getBoundingClientRect();
      const assistantRect = measurableRect(assistant);
      const actionRect = action instanceof HTMLElement ? measurableRect(action) : null;
      if (!assistantRect) return;
      if (requireAction && !actionRect) return;

      const regionTop = Math.min(assistantRect.top, actionRect?.top ?? assistantRect.top);
      const regionBottom = Math.max(assistantRect.bottom, actionRect?.bottom ?? assistantRect.bottom);
      const regionHeight = Math.max(0, regionBottom - regionTop);
      const viewportHeight = Math.max(0, viewportRect.height || viewport.clientHeight || 0);
      const currentTop = viewport.scrollTop;
      let targetTop = currentTop;

      if (regionHeight <= viewportHeight) {
        if (regionTop < viewportRect.top) {
          targetTop = currentTop + (regionTop - viewportRect.top);
        } else if (regionBottom > viewportRect.bottom) {
          targetTop = currentTop + (regionBottom - viewportRect.bottom);
        }
      } else {
        // The full actionable region cannot fit. Preserve comprehension by showing
        // the beginning of the newest assistant response instead of jumping to the
        // bottom of the controls.
        targetTop = currentTop + (assistantRect.top - viewportRect.top);
      }

      const maximumTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      targetTop = clamp(targetTop, 0, maximumTop);

      lastRevealedKeyRef.current = semanticKey;

      if (Math.abs(targetTop - currentTop) > 1) {
        viewport.scrollTo({ top: targetTop, behavior });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    actionRef,
    actionRefMode,
    assistantRef,
    assistantRefMode,
    behavior,
    enabled,
    requireAction,
    revealKey,
    viewportRef,
  ]);
}
