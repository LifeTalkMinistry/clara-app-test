import { useLayoutEffect, useRef } from "react";

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

/**
 * Canonical CLARA conversation viewport authority.
 *
 * A caller supplies one semantic reveal key only after the current turn is fully
 * actionable. The hook then performs at most one layout-time reveal for that key.
 * Passive renders, typewriter ticks, keyboard geometry changes, and DOM mutations
 * do not authorize additional transcript movement.
 */
export default function useClaraConversationReveal({
  viewportRef,
  assistantRef,
  actionRef = null,
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
      const assistant = assistantRef?.current;
      const action = actionRef?.current || null;

      if (!(viewport instanceof HTMLElement) || !(assistant instanceof HTMLElement)) return;
      if (requireAction && !(action instanceof HTMLElement)) return;

      const viewportRect = viewport.getBoundingClientRect();
      const assistantRect = assistant.getBoundingClientRect();
      const actionRect = action instanceof HTMLElement ? action.getBoundingClientRect() : null;

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
    assistantRef,
    behavior,
    enabled,
    requireAction,
    revealKey,
    viewportRef,
  ]);
}
