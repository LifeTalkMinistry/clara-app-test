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
      if (child.matches('[data-clara-conversation-role="assistant"]') || child.classList.contains("justify-start")) {
        return child;
      }
    }
    return null;
  }

  return owner;
}

function resolveNewestAssistantInViewport(viewport) {
  if (!(viewport instanceof HTMLElement)) return null;

  const semanticRows = Array.from(
    viewport.querySelectorAll('[data-clara-conversation-role="assistant"]')
  );
  for (let index = semanticRows.length - 1; index >= 0; index -= 1) {
    if (isVisibleElement(semanticRows[index])) return semanticRows[index];
  }

  const assistantRows = Array.from(viewport.querySelectorAll(".justify-start"));
  for (let index = assistantRows.length - 1; index >= 0; index -= 1) {
    if (isVisibleElement(assistantRows[index])) return assistantRows[index];
  }

  return null;
}

function isNearLatest(viewport, assistant, tolerance = 180) {
  const viewportRect = viewport.getBoundingClientRect();
  const assistantRect = measurableRect(assistant);
  if (!assistantRect) return false;

  const intersects = assistantRect.bottom >= viewportRect.top && assistantRect.top <= viewportRect.bottom;
  const distanceFromBottom = Math.max(
    0,
    viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop
  );

  return intersects || distanceFromBottom <= tolerance;
}

/**
 * Canonical CLARA conversation viewport authority.
 *
 * Final reveal:
 * A caller supplies one semantic reveal key only after the current turn is fully
 * actionable. The hook then performs at most one layout-time reveal for that key.
 *
 * Live follow:
 * While the newest CLARA bubble is still growing (for example during the shared
 * typewriter animation), a ResizeObserver follows only real layout growth. It
 * nudges the transcript just enough to keep the newest rendered lines visible.
 * It never chases scrollHeight, never runs from DOM mutations, and it stops
 * following the current bubble if the user deliberately wheels or touch-scrolls
 * away from the latest conversation.
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
  liveFollowEnabled = true,
  liveFollowMargin = 12,
}) {
  const lastRevealedKeyRef = useRef(null);
  const liveAssistantElementRef = useRef(null);
  const liveFollowArmedRef = useRef(false);

  // This effect intentionally runs after every render. Parent-paced conversations
  // re-render as their typewriter advances, while child-owned typewriters are
  // covered by the ResizeObserver once their assistant row has mounted.
  useLayoutEffect(() => {
    if (!liveFollowEnabled || typeof window === "undefined") return undefined;

    const viewport = viewportRef?.current;
    if (!(viewport instanceof HTMLElement)) return undefined;

    const assistant = resolveNewestAssistantInViewport(viewport);
    if (!(assistant instanceof HTMLElement)) return undefined;

    if (liveAssistantElementRef.current !== assistant) {
      liveAssistantElementRef.current = assistant;
      liveFollowArmedRef.current = isNearLatest(viewport, assistant);
    }

    const suspendLiveFollow = () => {
      liveFollowArmedRef.current = false;
    };

    viewport.addEventListener("wheel", suspendLiveFollow, { passive: true });
    viewport.addEventListener("touchmove", suspendLiveFollow, { passive: true });

    let frame = 0;
    const revealGrowingEdge = () => {
      if (!liveFollowArmedRef.current) return;
      if (frame) window.cancelAnimationFrame(frame);

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (!liveFollowArmedRef.current) return;
        if (!viewport.isConnected || !assistant.isConnected) return;

        const viewportRect = viewport.getBoundingClientRect();
        const assistantRect = measurableRect(assistant);
        if (!assistantRect) return;

        const visibleBottom = viewportRect.bottom - Math.max(0, Number(liveFollowMargin) || 0);
        if (assistantRect.bottom <= visibleBottom + 1) return;

        const currentTop = viewport.scrollTop;
        const overflow = assistantRect.bottom - visibleBottom;
        const maximumTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
        const targetTop = clamp(currentTop + overflow, 0, maximumTop);

        if (targetTop > currentTop + 1) {
          // Live typing uses an immediate, tiny geometry correction. Smooth
          // animations would queue while text is still wrapping and create bounce.
          viewport.scrollTo({ top: targetTop, behavior: "auto" });
        }
      });
    };

    revealGrowingEdge();

    const ResizeObserverCtor = window.ResizeObserver;
    const observer = typeof ResizeObserverCtor === "function"
      ? new ResizeObserverCtor(revealGrowingEdge)
      : null;
    observer?.observe(assistant);

    return () => {
      viewport.removeEventListener("wheel", suspendLiveFollow);
      viewport.removeEventListener("touchmove", suspendLiveFollow);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  });

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
