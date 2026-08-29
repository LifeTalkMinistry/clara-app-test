const SESSION_PREFIX = "clara_weekly_money_check_v1_";
const PREFERENCE_PREFIX = "clara_weekly_money_check_preference_v1_";
const UPDATED_EVENT = "clara:weekly-money-check-updated";
const INSTALLED_FLAG = "__CLARA_WEEKLY_CROSS_CHECK_REMINDER_INSTALLED__";
const BANNER_ID = "clara-weekly-cross-check-reminder";
const SETUP_ID = "clara-weekly-cross-check-day-setup";
const DISMISS_PREFIX = "clara_weekly_cross_check_dismissed_v1_";
const DAILY_STREAK_TITLE_ID = "clara-streak-bubble-title";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function safeJson(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function localDateKey(date = new Date()) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function dateFromKey(key) {
  const [year, month, day] = String(key || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mostRecentDueDateKey(weekday, referenceDate = new Date()) {
  const normalized = Number(weekday);
  if (!Number.isInteger(normalized) || normalized < 0 || normalized > 6) return "";
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);
  const offset = (date.getDay() - normalized + 7) % 7;
  date.setDate(date.getDate() - offset);
  return localDateKey(date);
}

function daysLate(dueDateKey, referenceDate = new Date()) {
  const due = dateFromKey(dueDateKey);
  if (!due) return 0;
  const now = new Date(referenceDate);
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((now - due) / 86400000));
}

function getStoragePairs() {
  if (typeof window === "undefined" || !window.localStorage) return [];
  const pairs = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(SESSION_PREFIX)) continue;
    const owner = key.slice(SESSION_PREFIX.length);
    if (!owner) continue;
    pairs.push({
      owner,
      sessionKey: key,
      preferenceKey: `${PREFERENCE_PREFIX}${owner}`,
      session: safeJson(window.localStorage.getItem(key)),
      preference: safeJson(window.localStorage.getItem(`${PREFERENCE_PREFIX}${owner}`)),
    });
  }
  return pairs;
}

function getActivePair() {
  const pairs = getStoragePairs();
  if (!pairs.length) return null;
  return pairs.sort((left, right) => {
    const leftTime = new Date(left.session?.updatedAt || left.session?.completedAt || left.session?.startedAt || 0).getTime() || 0;
    const rightTime = new Date(right.session?.updatedAt || right.session?.completedAt || right.session?.startedAt || 0).getTime() || 0;
    return rightTime - leftTime;
  })[0];
}

function completionCoversDue(session, dueDateKey) {
  if (String(session?.status || "").toLowerCase() !== "completed") return false;
  const completedAt = new Date(session?.completedAt || session?.completed_at || "");
  const dueDate = dateFromKey(dueDateKey);
  if (!dueDate || Number.isNaN(completedAt.getTime())) return false;
  const nextDue = new Date(dueDate);
  nextDue.setDate(nextDue.getDate() + 7);
  return completedAt >= dueDate && completedAt < nextDue;
}

function reminderState(pair, now = new Date()) {
  const weekday = Number(pair?.preference?.weekday);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;
  const dueDateKey = mostRecentDueDateKey(weekday, now);
  if (!dueDateKey || completionCoversDue(pair?.session, dueDateKey)) return null;
  const lateBy = daysLate(dueDateKey, now);
  return {
    owner: pair.owner,
    weekday,
    weekdayLabel: DAYS[weekday],
    dueDateKey,
    lateBy,
    overdue: lateBy > 0,
  };
}

function shouldRenderOnCurrentRoute() {
  const hash = String(window.location.hash || "").toLowerCase();
  if (!hash) return true;
  return !/(login|sign-in|signin|register|signup|onboarding)/.test(hash);
}

function isDailyAwarenessBannerVisible() {
  return Boolean(document.getElementById(DAILY_STREAK_TITLE_ID));
}

function removeNode(id) {
  document.getElementById(id)?.remove();
}

function ensureStyles() {
  if (document.getElementById("clara-weekly-cross-check-reminder-styles")) return;
  const style = document.createElement("style");
  style.id = "clara-weekly-cross-check-reminder-styles";
  style.textContent = `
    #${BANNER_ID}{position:fixed;left:max(14px,env(safe-area-inset-left));right:max(14px,env(safe-area-inset-right));top:calc(max(12px,env(safe-area-inset-top)) + 6px);z-index:2147482500;font-family:inherit;color:#f8fbff;animation:claraWeeklyReminderIn .28s ease-out both}
    #${BANNER_ID} .cwc-card{max-width:680px;margin:0 auto;border:1px solid rgba(113,211,255,.24);border-radius:22px;background:linear-gradient(145deg,rgba(7,26,57,.98),rgba(5,18,42,.98));box-shadow:0 18px 48px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.08);padding:14px 14px 12px;backdrop-filter:blur(18px)}
    #${BANNER_ID} .cwc-top{display:flex;gap:12px;align-items:flex-start}
    #${BANNER_ID} .cwc-dot{width:10px;height:10px;border-radius:999px;background:#56d8ff;box-shadow:0 0 16px rgba(86,216,255,.55);margin-top:5px;flex:0 0 auto}
    #${BANNER_ID} .cwc-copy{min-width:0;flex:1}
    #${BANNER_ID} .cwc-kicker{font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:rgba(179,236,255,.68)}
    #${BANNER_ID} .cwc-title{margin-top:3px;font-size:15px;line-height:1.25;font-weight:900;color:#fff}
    #${BANNER_ID} .cwc-body{margin-top:4px;font-size:12px;line-height:1.45;font-weight:650;color:rgba(235,244,255,.68)}
    #${BANNER_ID} .cwc-actions{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:11px}
    #${BANNER_ID} button{min-height:42px;border-radius:15px;border:1px solid rgba(255,255,255,.10);font:800 12px/1 inherit;cursor:pointer}
    #${BANNER_ID} .cwc-primary{background:linear-gradient(135deg,#1769ff,#0d52c9);color:#fff;border-color:rgba(107,180,255,.35);box-shadow:0 10px 22px rgba(23,105,255,.18)}
    #${BANNER_ID} .cwc-later{padding:0 16px;background:rgba(255,255,255,.035);color:rgba(255,255,255,.72)}

    #${SETUP_ID}{position:fixed;inset:0;z-index:2147482800;display:flex;align-items:flex-end;justify-content:center;box-sizing:border-box;padding:24px max(16px,env(safe-area-inset-right)) max(22px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));background:radial-gradient(circle at 50% 72%,rgba(21,83,170,.18),transparent 42%),rgba(0,5,18,.78);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);font-family:inherit;color:#fff}
    #${SETUP_ID} .cwc-setup-card{position:relative;isolation:isolate;overflow:hidden;box-sizing:border-box;width:min(100%,430px);border-radius:30px;border:1px solid rgba(104,204,255,.28);background:linear-gradient(160deg,rgba(8,31,68,.995) 0%,rgba(5,19,45,.995) 58%,rgba(3,13,32,.995) 100%);padding:24px 22px 22px;box-shadow:0 30px 90px rgba(0,0,0,.62),0 0 0 1px rgba(38,137,255,.04),inset 0 1px 0 rgba(255,255,255,.09)}
    #${SETUP_ID} .cwc-setup-card::before{content:"";position:absolute;z-index:-1;left:15%;right:15%;top:-46px;height:90px;border-radius:999px;background:rgba(35,125,255,.18);filter:blur(28px);pointer-events:none}
    #${SETUP_ID} .cwc-setup-kicker{display:flex;align-items:center;gap:8px;font-size:10px;line-height:1;font-weight:900;letter-spacing:.17em;text-transform:uppercase;color:rgba(178,232,255,.72)}
    #${SETUP_ID} .cwc-setup-kicker::before{content:"";width:7px;height:7px;border-radius:999px;background:#69dcff;box-shadow:0 0 14px rgba(105,220,255,.55);flex:0 0 auto}
    #${SETUP_ID} h2{margin:12px 0 0;max-width:350px;font-size:23px;line-height:1.14;letter-spacing:-.025em;font-weight:900;color:#fff;text-wrap:balance}
    #${SETUP_ID} p{margin:10px 0 0;max-width:365px;font-size:12.5px;line-height:1.55;font-weight:600;color:rgba(229,240,255,.67)}
    #${SETUP_ID} .cwc-days-label{margin-top:22px;font-size:10px;line-height:1;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:rgba(218,236,255,.48)}
    #${SETUP_ID} .cwc-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;width:100%;margin-top:10px}
    #${SETUP_ID} .cwc-day{appearance:none;-webkit-appearance:none;box-sizing:border-box;min-width:0;width:100%;min-height:48px;padding:0 2px;margin:0;background:rgba(255,255,255,.035);color:rgba(236,245,255,.58);border:1px solid rgba(255,255,255,.09);border-radius:14px;font:850 10px/1 inherit;text-align:center;cursor:pointer;transition:transform .16s ease,border-color .16s ease,background .16s ease,color .16s ease,box-shadow .16s ease}
    #${SETUP_ID} .cwc-day:hover{border-color:rgba(126,206,255,.22);background:rgba(255,255,255,.055);color:rgba(255,255,255,.82)}
    #${SETUP_ID} .cwc-day:focus-visible{outline:2px solid rgba(105,220,255,.82);outline-offset:2px}
    #${SETUP_ID} .cwc-day[aria-pressed="true"]{transform:translateY(-1px);background:linear-gradient(180deg,rgba(31,130,255,.26),rgba(22,91,191,.18));border-color:rgba(105,220,255,.62);color:#f4fcff;box-shadow:0 8px 22px rgba(14,107,230,.18),inset 0 1px 0 rgba(255,255,255,.08)}
    #${SETUP_ID} .cwc-save{appearance:none;-webkit-appearance:none;box-sizing:border-box;display:flex;width:100%;max-width:none;min-width:0;min-height:50px;margin:18px 0 0;padding:0 18px;align-items:center;justify-content:center;border-radius:17px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.045);color:rgba(231,241,255,.34);font:900 12.5px/1 inherit;text-align:center;white-space:nowrap;overflow:hidden;cursor:not-allowed;box-shadow:none;transition:transform .16s ease,background .16s ease,border-color .16s ease,color .16s ease,box-shadow .16s ease,opacity .16s ease}
    #${SETUP_ID} .cwc-save:not(:disabled){cursor:pointer;background:linear-gradient(135deg,#1c78ff 0%,#0d55d2 100%);border-color:rgba(112,188,255,.42);color:#fff;box-shadow:0 13px 30px rgba(13,85,210,.25),inset 0 1px 0 rgba(255,255,255,.13)}
    #${SETUP_ID} .cwc-save:not(:disabled):active{transform:translateY(1px);box-shadow:0 8px 20px rgba(13,85,210,.20),inset 0 1px 0 rgba(255,255,255,.10)}
    #${SETUP_ID} .cwc-save:focus-visible{outline:2px solid rgba(105,220,255,.82);outline-offset:3px}
    @keyframes claraWeeklyReminderIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
    @media (max-width:370px){#${SETUP_ID}{padding-left:12px;padding-right:12px}#${SETUP_ID} .cwc-setup-card{padding:22px 18px 19px}#${SETUP_ID} .cwc-days{gap:4px}#${SETUP_ID} .cwc-day{min-height:46px;border-radius:12px;font-size:9px}}
    @media (min-width:640px){#${SETUP_ID}{align-items:center}#${SETUP_ID} .cwc-setup-card{padding:26px 24px 24px}}
    @media (prefers-reduced-motion:reduce){#${SETUP_ID} .cwc-day,#${SETUP_ID} .cwc-save,#${BANNER_ID}{transition:none;animation:none}}
  `;
  document.head.appendChild(style);
}

function openWeeklyCrossCheck() {
  removeNode(BANNER_ID);
  window.location.hash = "/community?view=orb&mode=weekly-money-check&source=weekly-reminder";
}

function showSetup(pair) {
  if (!pair || pair.preference || document.getElementById(SETUP_ID)) return;
  if (String(pair.session?.status || "").toLowerCase() !== "completed") return;
  ensureStyles();
  removeNode(BANNER_ID);

  let selected = null;
  const root = document.createElement("div");
  root.id = SETUP_ID;
  root.setAttribute("role", "presentation");
  root.innerHTML = `
    <section class="cwc-setup-card" role="dialog" aria-modal="true" aria-labelledby="cwc-setup-title" aria-describedby="cwc-setup-description">
      <div class="cwc-setup-kicker">Weekly Cross-Check</div>
      <h2 id="cwc-setup-title">When should CLARA check in with you?</h2>
      <p id="cwc-setup-description">Pick one day for your weekly check-in. If you miss it, CLARA keeps the reminder visible until that week’s Cross-Check is complete.</p>
      <div class="cwc-days-label">Choose your day</div>
      <div class="cwc-days" aria-label="Choose your weekly cross-check day"></div>
      <button class="cwc-save" type="button" disabled>Set weekly check-in</button>
    </section>
  `;

  const daysHost = root.querySelector(".cwc-days");
  const saveButton = root.querySelector(".cwc-save");
  DAYS.forEach((label, weekday) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cwc-day";
    button.textContent = label.slice(0, 3);
    button.setAttribute("aria-label", `Choose ${label}`);
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      selected = weekday;
      daysHost.querySelectorAll(".cwc-day").forEach((node) => node.setAttribute("aria-pressed", "false"));
      button.setAttribute("aria-pressed", "true");
      saveButton.disabled = false;
    });
    daysHost.appendChild(button);
  });

  saveButton.addEventListener("click", () => {
    if (!Number.isInteger(selected)) return;
    const preference = {
      weekday: selected,
      recurrence: "weekly",
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(pair.preferenceKey, JSON.stringify(preference));
    window.dispatchEvent(new CustomEvent(UPDATED_EVENT, {
      detail: { type: "weekday_changed", preference },
    }));
    removeNode(SETUP_ID);
    refreshReminder();
  });

  document.body.appendChild(root);
}

function showBanner(state) {
  if (!state || document.getElementById(BANNER_ID) || !shouldRenderOnCurrentRoute()) return;
  if (isDailyAwarenessBannerVisible()) {
    removeNode(BANNER_ID);
    return;
  }

  const dismissalKey = `${DISMISS_PREFIX}${state.owner}_${state.dueDateKey}`;
  if (window.sessionStorage?.getItem(dismissalKey) === "1") return;
  ensureStyles();

  const root = document.createElement("div");
  root.id = BANNER_ID;
  const title = state.overdue ? "Weekly Cross-Check is overdue" : "Weekly Cross-Check is due";
  const body = state.overdue
    ? `Your ${state.weekdayLabel} check is still waiting${state.lateBy > 1 ? ` (${state.lateBy} days)` : ""}. It will stay here until this week’s check is completed.`
    : `Today is your ${state.weekdayLabel} check-in. Let’s make sure CLARA still matches the money you actually have.`;
  root.innerHTML = `
    <div class="cwc-card" role="status" aria-live="polite">
      <div class="cwc-top">
        <span class="cwc-dot" aria-hidden="true"></span>
        <div class="cwc-copy">
          <div class="cwc-kicker">Accountability reminder</div>
          <div class="cwc-title">${title}</div>
          <div class="cwc-body">${body}</div>
        </div>
      </div>
      <div class="cwc-actions">
        <button class="cwc-primary" type="button">Do Cross-Check</button>
        <button class="cwc-later" type="button">Later</button>
      </div>
    </div>
  `;
  root.querySelector(".cwc-primary")?.addEventListener("click", openWeeklyCrossCheck);
  root.querySelector(".cwc-later")?.addEventListener("click", () => {
    try {
      window.sessionStorage?.setItem(dismissalKey, "1");
    } catch {}
    removeNode(BANNER_ID);
  });
  document.body.appendChild(root);
}

function refreshReminder() {
  if (typeof window === "undefined" || typeof document === "undefined" || !document.body) return;

  if (isDailyAwarenessBannerVisible()) {
    removeNode(BANNER_ID);
    return;
  }

  const pair = getActivePair();
  if (!pair) {
    removeNode(BANNER_ID);
    return;
  }

  if (!pair.preference) {
    removeNode(BANNER_ID);
    showSetup(pair);
    return;
  }

  removeNode(SETUP_ID);
  const state = reminderState(pair);
  if (!state) {
    removeNode(BANNER_ID);
    return;
  }
  showBanner(state);
}

export function installWeeklyCrossCheckReminder() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[INSTALLED_FLAG]) return;
  window[INSTALLED_FLAG] = true;

  let queueRefreshTimer = null;
  let dailyWasVisible = false;
  const scheduleRefresh = (delay = 80) => {
    if (queueRefreshTimer) window.clearTimeout(queueRefreshTimer);
    queueRefreshTimer = window.setTimeout(() => {
      queueRefreshTimer = null;
      refreshReminder();
    }, delay);
  };

  const syncBannerPriority = () => {
    const dailyIsVisible = isDailyAwarenessBannerVisible();
    if (dailyIsVisible) {
      dailyWasVisible = true;
      removeNode(BANNER_ID);
      return;
    }

    if (dailyWasVisible) {
      dailyWasVisible = false;
      scheduleRefresh(120);
    }
  };

  const installPriorityObserver = () => {
    if (!document.body || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(syncBannerPriority);
    observer.observe(document.body, { childList: true, subtree: true });
    syncBannerPriority();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      installPriorityObserver();
      scheduleRefresh(220);
    }, { once: true });
  } else {
    installPriorityObserver();
    scheduleRefresh(220);
  }

  window.addEventListener(UPDATED_EVENT, scheduleRefresh);
  window.addEventListener("storage", scheduleRefresh);
  window.addEventListener("focus", scheduleRefresh);
  window.addEventListener("hashchange", scheduleRefresh);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden") scheduleRefresh();
  });
}

installWeeklyCrossCheckReminder();
