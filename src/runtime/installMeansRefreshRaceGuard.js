import { FINANCE_DATA_UPDATED_EVENT } from "@/lib/financeRepository";

const MEANS_CONTEXT_KEY = "__claraCanonicalMeansSnapshot__";
const GUARD_KEY = "__claraMeansRefreshRaceGuard__";
const RETRY_MARKER = "__claraMeansRefreshRaceRetry";
const POLL_INTERVAL_MS = 25;
const POLL_TIMEOUT_MS = 1500;

function installMeansRefreshRaceGuard() {
  if (typeof window === "undefined") return;
  window[GUARD_KEY]?.destroy?.();

  let destroyed = false;
  let pollTimer = null;
  let pollStartedAt = 0;
  let observedCapturedAt = 0;
  let sourceDetail = null;

  const clearPoll = () => {
    if (pollTimer) window.clearTimeout(pollTimer);
    pollTimer = null;
  };

  const dispatchStableRefresh = () => {
    if (destroyed) return;
    window.dispatchEvent(
      new CustomEvent(FINANCE_DATA_UPDATED_EVENT, {
        detail: {
          ...(sourceDetail || {}),
          [RETRY_MARKER]: true,
          source: `${String(sourceDetail?.source || "finance:update")}:means-stability`,
        },
      })
    );
  };

  const pollForCompletedSnapshot = () => {
    if (destroyed) return;

    const capturedAt = Number(window[MEANS_CONTEXT_KEY]?.capturedAt || 0);
    const snapshotAdvanced = capturedAt > observedCapturedAt;
    const timedOut = Date.now() - pollStartedAt >= POLL_TIMEOUT_MS;

    if (snapshotAdvanced || timedOut) {
      clearPoll();
      dispatchStableRefresh();
      return;
    }

    pollTimer = window.setTimeout(pollForCompletedSnapshot, POLL_INTERVAL_MS);
  };

  const handleFinanceUpdate = (event) => {
    if (event?.detail?.[RETRY_MARKER]) return;

    clearPoll();
    sourceDetail = event?.detail || null;
    observedCapturedAt = Number(window[MEANS_CONTEXT_KEY]?.capturedAt || 0);
    pollStartedAt = Date.now();
    pollTimer = window.setTimeout(pollForCompletedSnapshot, POLL_INTERVAL_MS);
  };

  window.addEventListener(FINANCE_DATA_UPDATED_EVENT, handleFinanceUpdate);

  window[GUARD_KEY] = {
    destroy() {
      destroyed = true;
      clearPoll();
      window.removeEventListener(FINANCE_DATA_UPDATED_EVENT, handleFinanceUpdate);
      window[GUARD_KEY] = null;
    },
  };
}

installMeansRefreshRaceGuard();
