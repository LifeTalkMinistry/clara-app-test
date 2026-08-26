import {
  getStoredBackendToken,
  getStoredBackendUser,
  isStoredTokenLive,
  readJwtPayload,
} from "@/lib/clara-backend-client";
import { getEligibleDayKey } from "@/lib/challenge-schedule.js";
import { performDailyCheckIn } from "@/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInActions.js";
import {
  loadState,
  writeState,
} from "@/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInPersistence.js";
import {
  CLARA_PRODUCT_ACCESS_CHANGED_EVENT,
  isClaraProductRuntimeLocked,
} from "@/lib/clara-product-runtime-access";

const INSTALLED_FLAG = "__CLARA_DAILY_AWARENESS_STREAK_INSTALLED__";
const BANNER_ID = "clara-daily-awareness-streak-banner";
const STYLE_ID = "clara-daily-awareness-streak-styles";
const AUTO_HIDE_MS = 6500;
const TOTAL_DAYS = 30;
let hideTimer = null;

function getAuthenticatedIdentity() {
  const token = getStoredBackendToken();
  if (!isStoredTokenLive(token)) return null;

  const storedUser = getStoredBackendUser();
  const payload = readJwtPayload(token);
  const userId = storedUser?.id ?? payload?.userId ?? payload?.user_id ?? null;
  if (userId === null || userId === undefined || String(userId).trim() === "") {
    return null;
  }

  return { userId: String(userId) };
}

function shouldRunOnCurrentRoute() {
  const hash = String(window.location.hash || "").toLowerCase();
  if (!hash) return true;
  return !/(login|sign-in|signin|register|signup|onboarding|reset-password)/.test(hash);
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${BANNER_ID}{position:fixed;left:max(14px,env(safe-area-inset-left));right:max(14px,env(safe-area-inset-right));top:calc(max(12px,env(safe-area-inset-top)) + 6px);z-index:2147482500;font-family:inherit;color:#f8fbff;animation:claraDailyAwarenessIn .34s cubic-bezier(.2,.8,.2,1) both}
    #${BANNER_ID} .das-card{position:relative;max-width:680px;margin:0 auto;overflow:hidden;border:1px solid rgba(116,224,255,.28);border-radius:22px;background:linear-gradient(145deg,rgba(8,29,63,.985),rgba(5,18,42,.985));box-shadow:0 20px 52px rgba(0,0,0,.46),0 0 34px rgba(31,146,255,.10),inset 0 1px 0 rgba(255,255,255,.09);padding:14px 14px 13px;backdrop-filter:blur(20px)}
    #${BANNER_ID} .das-card::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 14% 0%,rgba(83,219,255,.14),transparent 42%),radial-gradient(circle at 88% 100%,rgba(53,91,255,.13),transparent 44%)}
    #${BANNER_ID} .das-top{position:relative;display:flex;gap:12px;align-items:flex-start}
    #${BANNER_ID} .das-orb{width:11px;height:11px;border-radius:999px;background:#72e4ff;box-shadow:0 0 18px rgba(114,228,255,.78),0 0 34px rgba(31,146,255,.38);margin-top:5px;flex:0 0 auto}
    #${BANNER_ID} .das-copy{min-width:0;flex:1;padding-right:34px}
    #${BANNER_ID} .das-kicker{font-size:9.5px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:rgba(183,239,255,.72)}
    #${BANNER_ID} .das-title{margin-top:3px;font-size:16px;line-height:1.2;font-weight:950;letter-spacing:-.02em;color:#fff}
    #${BANNER_ID} .das-body{margin-top:4px;font-size:11.5px;line-height:1.45;font-weight:650;color:rgba(235,244,255,.66)}
    #${BANNER_ID} .das-close{position:absolute;right:0;top:-2px;width:30px;height:30px;border-radius:999px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.035);color:rgba(255,255,255,.68);font:800 18px/1 inherit;display:grid;place-items:center;cursor:pointer}
    #${BANNER_ID} .das-progress{position:relative;margin-top:12px;padding:9px 10px 8px;border-radius:15px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025)}
    #${BANNER_ID} .das-progress-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;font-size:9px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:rgba(190,233,255,.56)}
    #${BANNER_ID} .das-progress-head strong{font-size:10px;letter-spacing:.04em;color:rgba(224,250,255,.88)}
    #${BANNER_ID} .das-lights{display:grid;grid-template-columns:repeat(15,minmax(0,1fr));gap:5px}
    #${BANNER_ID} .das-light{aspect-ratio:1;border-radius:999px;background:rgba(169,214,255,.10);border:1px solid rgba(172,223,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.01)}
    #${BANNER_ID} .das-light.is-on{background:#58d9ff;border-color:rgba(151,240,255,.88);box-shadow:0 0 8px rgba(88,217,255,.66),0 0 14px rgba(47,135,255,.28)}
    #${BANNER_ID} .das-light.is-current{transform:scale(1.16);background:#d9fbff;box-shadow:0 0 9px rgba(216,251,255,.95),0 0 20px rgba(64,180,255,.72)}
    @keyframes claraDailyAwarenessIn{from{opacity:0;transform:translateY(-10px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
    @media (min-width:520px){#${BANNER_ID} .das-lights{grid-template-columns:repeat(30,minmax(0,1fr));gap:4px}}
  `;
  document.head.appendChild(style);
}

function removeBanner() {
  if (hideTimer) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
  document.getElementById(BANNER_ID)?.remove();
}

function showPremiumBanner(state) {
  if (
    isClaraProductRuntimeLocked() ||
    !document.body ||
    document.getElementById(BANNER_ID)
  ) {
    return;
  }
  ensureStyles();

  const completed = Math.max(
    1,
    Math.min(TOTAL_DAYS, Number(state?.completedCheckInDays || state?.currentStreak || 1)),
  );
  const lights = Array.from({ length: TOTAL_DAYS }, (_, index) => {
    const day = index + 1;
    const className = day <= completed
      ? day === completed
        ? "das-light is-on is-current"
        : "das-light is-on"
      : "das-light";
    return `<span class="${className}" aria-hidden="true"></span>`;
  }).join("");

  const root = document.createElement("div");
  root.id = BANNER_ID;
  root.innerHTML = `
    <div class="das-card" role="status" aria-live="polite">
      <div class="das-top">
        <span class="das-orb" aria-hidden="true"></span>
        <div class="das-copy">
          <div class="das-kicker">Daily Awareness Streak</div>
          <div class="das-title">Day ${completed} of ${TOTAL_DAYS} is active</div>
          <div class="das-body">You opened CLARA and checked in with your financial position today.</div>
        </div>
        <button class="das-close" type="button" aria-label="Close daily streak banner">×</button>
      </div>
      <div class="das-progress" aria-label="${completed} of ${TOTAL_DAYS} daily awareness days completed">
        <div class="das-progress-head"><span>Awareness progress</span><strong>${completed}/${TOTAL_DAYS}</strong></div>
        <div class="das-lights">${lights}</div>
      </div>
    </div>
  `;

  root.querySelector(".das-close")?.addEventListener("click", removeBanner);
  document.body.appendChild(root);
  hideTimer = window.setTimeout(removeBanner, AUTO_HIDE_MS);
}

function activateDailyAwarenessStreak() {
  if (isClaraProductRuntimeLocked()) {
    removeBanner();
    return;
  }
  if (document.visibilityState === "hidden" || !shouldRunOnCurrentRoute()) return;

  const identity = getAuthenticatedIdentity();
  if (!identity) return;

  const todayKey = getEligibleDayKey();
  const currentState = loadState(identity.userId, todayKey);
  const result = performDailyCheckIn({
    value: currentState,
    userId: identity.userId,
    todayKey,
    persist: (nextState, expectedEvent) =>
      writeState(
        identity.userId,
        nextState,
        "daily_awareness_open",
        todayKey,
        expectedEvent,
      ),
  });

  if (result.status === "completed") {
    showPremiumBanner(result.state);
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") activateDailyAwarenessStreak();
}

function handleProductAccessChange() {
  if (isClaraProductRuntimeLocked()) {
    removeBanner();
    return;
  }
  activateDailyAwarenessStreak();
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window[INSTALLED_FLAG]) {
  window[INSTALLED_FLAG] = true;

  window.addEventListener("pageshow", activateDailyAwarenessStreak);
  window.addEventListener("focus", activateDailyAwarenessStreak);
  window.addEventListener("hashchange", activateDailyAwarenessStreak);
  window.addEventListener(CLARA_PRODUCT_ACCESS_CHANGED_EVENT, handleProductAccessChange);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", activateDailyAwarenessStreak, { once: true });
  } else {
    activateDailyAwarenessStreak();
  }

  [750, 2500, 7000].forEach((delay) => {
    window.setTimeout(activateDailyAwarenessStreak, delay);
  });
}
