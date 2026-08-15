export const CLARA_AI_SERVER_DEADLINE_MS = 30000;
export const CLARA_AI_USAGE_TIMEOUT_MS = 8000;
export const CLARA_AI_AUTH_TIMEOUT_MS = 8000;
export const CLARA_AI_GEMINI_TIMEOUT_MS = 20000;
export const CLARA_AI_CLEANUP_TIMEOUT_MS = 5000;

export function createAbortReason(code, message) {
  const error = new Error(message);
  error.name = "AbortError";
  error.code = code;
  return error;
}

export function abortCode(signal, fallback = "") {
  return String(signal?.reason?.code || fallback || "").trim();
}

export function createLinkedAbortController({
  parentSignal,
  timeoutMs,
  timeoutCode,
  timeoutMessage,
} = {}) {
  const controller = new AbortController();
  let timedOut = false;

  const abortFromParent = () => {
    if (controller.signal.aborted) return;
    controller.abort(
      parentSignal?.reason ||
        createAbortReason("CLARA_AI_CANCELLED", "CLARA AI request was cancelled."),
    );
  };

  if (parentSignal?.aborted) {
    abortFromParent();
  } else {
    parentSignal?.addEventListener?.("abort", abortFromParent, { once: true });
  }

  const safeTimeoutMs = Math.max(1, Number(timeoutMs || 0));
  const timeoutId = setTimeout(() => {
    if (controller.signal.aborted) return;
    timedOut = true;
    controller.abort(
      createAbortReason(
        timeoutCode || "CLARA_AI_STAGE_TIMEOUT",
        timeoutMessage || "CLARA AI stage timed out.",
      ),
    );
  }, safeTimeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    clear() {
      clearTimeout(timeoutId);
      parentSignal?.removeEventListener?.("abort", abortFromParent);
    },
  };
}
