import "./installOrbReminderPriority";
import "./installWeeklyCrossCheckForegroundOwnership";
import "./installWeeklyCrossCheckReminder";
import { getEffectiveDemoFinanceLocalUserId } from "@/lib/demo/activeDemoProfile";
import { reconcileWeeklyMoneyCheckWallets } from "@/lib/weeklyMoneyCheckReconciliationRepository";
import { WEEKLY_MONEY_CHECK_UPDATED_EVENT } from "@/lib/weeklyMoneyCheckState";

const SESSION_STORAGE_PREFIX = "clara_weekly_money_check_v1_";
const INSTALLED_FLAG = "__CLARA_WEEKLY_MONEY_CHECK_RECONCILIATION_INSTALLED__";
const inFlight = new Set();

function clean(value = "") {
  return String(value ?? "").trim();
}

function parseSession(value) {
  try {
    const parsed = JSON.parse(value || "null");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getSessionIdentity(session = {}) {
  return clean(session.completedAt || session.completed_at || session.startedAt || session.started_at);
}

function findStoredSession(session) {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const targetIdentity = getSessionIdentity(session);

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(SESSION_STORAGE_PREFIX)) continue;

    const stored = parseSession(window.localStorage.getItem(key));
    if (!stored) continue;

    if (targetIdentity && getSessionIdentity(stored) === targetIdentity) {
      return { key, session: stored };
    }
  }

  return null;
}

function writeReconciliationStatus(session, patch = {}) {
  const stored = findStoredSession(session);
  if (!stored || typeof window === "undefined" || !window.localStorage) return null;

  const next = {
    ...stored.session,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(stored.key, JSON.stringify(next));
  return next;
}

function appendReconciliationMessage(messages = [], text = "") {
  const list = Array.isArray(messages) ? messages : [];
  const safeText = clean(text);
  if (!safeText) return list;

  const alreadyPresent = list.some((entry) => clean(entry?.text).includes("wallet balances are now aligned"));
  if (alreadyPresent) return list;

  return [
    ...list,
    {
      id: `weekly-check-reconciled-${Date.now()}`,
      role: "assistant",
      text: safeText,
      animate: false,
    },
  ];
}

async function reconcileCompletedWeeklyCheck(session) {
  const identity = getSessionIdentity(session);
  if (!identity || inFlight.has(identity)) return;

  const snapshots = Array.isArray(session?.walletSnapshots) ? session.walletSnapshots : [];
  const hasMismatch = snapshots.some((snapshot) => {
    const actual = Number(snapshot?.actualBalance ?? snapshot?.actual_balance);
    const recorded = Number(snapshot?.recordedBalance ?? snapshot?.recorded_balance);
    return Number.isFinite(actual) && Number.isFinite(recorded) && Math.abs(actual - recorded) > 0.009;
  });

  if (!hasMismatch) return;
  if (clean(session?.reconciliationStatus || session?.reconciliation_status) === "completed") return;

  inFlight.add(identity);
  writeReconciliationStatus(session, {
    reconciliationStatus: "in_progress",
    reconciliation_status: "in_progress",
    reconciliationError: null,
    reconciliation_error: null,
  });

  try {
    const localUserId = getEffectiveDemoFinanceLocalUserId();
    const reconciliationId = `weekly-money-check-${identity}`;
    const result = await reconcileWeeklyMoneyCheckWallets(localUserId, snapshots, {
      reconciliationId,
    });
    const reconciledAt = new Date().toISOString();
    const reconciliationMessage =
      result.adjustedWallets > 0
        ? `Your wallet balances are now aligned with the actual amounts you confirmed. I recorded ${result.adjustedWallets} Weekly Cross-Check adjustment${result.adjustedWallets === 1 ? "" : "s"} in Transaction Hub so the correction stays traceable. No difference was applied twice.`
        : "Your wallet balances are now aligned with the actual amounts you confirmed. No extra adjustment was needed.";

    const stored = findStoredSession(session);
    const baseSession = stored?.session || session;
    const nextMessages = appendReconciliationMessage(
      baseSession?.conversationMessages,
      reconciliationMessage
    );

    writeReconciliationStatus(baseSession, {
      reconciliationStatus: "completed",
      reconciliation_status: "completed",
      reconciliationId: result.reconciliationId,
      reconciliation_id: result.reconciliationId,
      reconciledAt,
      reconciled_at: reconciledAt,
      reconciledWallets: result.adjustedWallets,
      reconciled_wallets: result.adjustedWallets,
      reconciliationError: null,
      reconciliation_error: null,
      conversationMessages: nextMessages,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("clara:weekly-money-check-reconciled", {
          detail: {
            reconciliationId: result.reconciliationId,
            adjustedWallets: result.adjustedWallets,
          },
        })
      );
    }
  } catch (error) {
    const message = clean(error?.message || "Weekly Cross-Check reconciliation could not be completed.");
    writeReconciliationStatus(session, {
      reconciliationStatus: "needs_retry",
      reconciliation_status: "needs_retry",
      reconciliationError: message,
      reconciliation_error: message,
    });
    console.warn("[CLARA Weekly Cross-Check] reconciliation safely aborted:", error);
  } finally {
    inFlight.delete(identity);
  }
}

export function installWeeklyMoneyCheckReconciliation() {
  if (typeof window === "undefined") return;
  if (window[INSTALLED_FLAG]) return;
  window[INSTALLED_FLAG] = true;

  window.addEventListener(WEEKLY_MONEY_CHECK_UPDATED_EVENT, (event) => {
    const session = event?.detail?.session || event?.detail;
    const status = clean(session?.status).toLowerCase();
    if (status !== "completed") return;
    void reconcileCompletedWeeklyCheck(session);
  });
}

installWeeklyMoneyCheckReconciliation();