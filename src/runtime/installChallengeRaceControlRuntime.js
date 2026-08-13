import {
  backendRequest,
  getStoredBackendToken,
  getStoredBackendUser,
  isStoredTokenLive,
} from "@/lib/clara-backend-client";

const ROOT_ID = "clara-live-race-control-runtime";
const STYLE_ID = "clara-live-race-control-runtime-style";
const HIDDEN_ATTR = "data-clara-race-runtime-hidden";
const REFRESH_MS = 30_000;
let latestBoard = null;
let activeFilter = "still_in";
let requestRunning = false;
let observer = null;

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name = "") {
  const parts = String(name || "CLARA Member").trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : (parts[0] || "CL").slice(0, 2)).toUpperCase();
}

function prettyDate(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ""));
  if (!match) return String(key || "—");
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" })
    .format(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function challengePageVisible() {
  const heading = [...document.querySelectorAll("h1")].find((node) => node.textContent?.trim() === "Challenges");
  return Boolean(heading && heading.offsetParent !== null);
}

function thirtyDayTabActive() {
  return [...document.querySelectorAll("button")].some((button) => {
    if (button.textContent?.trim() !== "30-Day") return false;
    return button.className.includes("bg-[#22c7b8]") || button.className.includes("shadow-[inset");
  });
}

function challengeMain() {
  const heading = [...document.querySelectorAll("h1")].find((node) => node.textContent?.trim() === "Challenges");
  return heading?.closest("div.relative")?.querySelector("main") || document.querySelector("main");
}

function restoreHiddenOfficialCards() {
  document.querySelectorAll(`[${HIDDEN_ATTR}="true"]`).forEach((node) => {
    node.style.display = node.dataset.claraRacePreviousDisplay || "";
    node.removeAttribute(HIDDEN_ATTR);
    delete node.dataset.claraRacePreviousDisplay;
  });
}

function hideOfficialTestConflicts() {
  if (latestBoard?.control?.mode !== "test") {
    restoreHiddenOfficialCards();
    return;
  }

  const main = challengeMain();
  if (!main) return;
  [...main.querySelectorAll("section")].forEach((section) => {
    if (section.id === ROOT_ID || section.closest(`#${ROOT_ID}`)) return;
    const text = section.textContent || "";
    const shouldHide =
      text.includes("Next 30-Day Race") ||
      text.includes("Race in progress") ||
      text.includes("Race day") ||
      text.includes("30-Day CLARA Streak");
    if (!shouldHide || section.getAttribute(HIDDEN_ATTR) === "true") return;
    section.dataset.claraRacePreviousDisplay = section.style.display || "";
    section.style.display = "none";
    section.setAttribute(HIDDEN_ATTR, "true");
  });
}

function statusMeta(status) {
  if (status === "finished") return { label: "Finished", cls: "finished", symbol: "✓" };
  if (status === "out") return { label: "Out", cls: "out", symbol: "×" };
  if (status === "needs_check_in") return { label: "Needs today", cls: "risk", symbol: "!" };
  return { label: "Checked in", cls: "in", symbol: "✓" };
}

function filteredParticipants(board) {
  const participants = Array.isArray(board?.participants) ? board.participants : [];
  if (activeFilter === "finished") return participants.filter((item) => item.status === "finished");
  if (activeFilter === "out") return participants.filter((item) => item.status === "out");
  return participants.filter((item) => ["checked_in", "needs_check_in"].includes(item.status));
}

function participantCard(participant) {
  const meta = statusMeta(participant.status);
  const avatar = participant.avatarUrl
    ? `<img src="${esc(participant.avatarUrl)}" alt="" onerror="this.style.display='none'">`
    : "";
  return `
    <div class="clara-race-person ${meta.cls}">
      <div class="clara-race-avatar ${meta.cls}">
        <span>${esc(initials(participant.displayName))}</span>${avatar}
        <i>${meta.symbol}</i>
      </div>
      <div class="clara-race-person-copy">
        <b>${esc(participant.displayName)}</b>
        <small class="${meta.cls}">${esc(meta.label)}</small>
      </div>
      <div class="clara-race-day"><small>DAY</small><b>${Number(participant.day || 0)}</b></div>
    </div>`;
}

function personalCopy(board) {
  const user = getStoredBackendUser();
  const participant = (board?.participants || []).find((item) => String(item.userId) === String(user?.id));
  const raceDay = Number(board?.control?.raceDay || 1);
  if (!participant) {
    if (raceDay <= 1) return "Complete today's Daily Money Tip check-in to appear on the starting line.";
    return "You are not currently active in this test race. Your normal CLARA streak is still safe.";
  }
  if (participant.status === "checked_in") return `You're still in. Day ${participant.day} is secured.`;
  if (participant.status === "needs_check_in") return `You're still in, but today's Daily Money Tip check-in is still needed.`;
  if (participant.status === "finished") return "You finished this race. Test completion will not issue an official prize entry.";
  return `Your test-race run ended on Day ${participant.day || 0}. Your ordinary CLARA streak history is not deleted by ending the test.`;
}

function boardMarkup(board) {
  const control = board?.control || {};
  const summary = board?.summary || { started: 0, stillIn: 0, finished: 0, out: 0 };
  const test = control.mode === "test";
  const list = filteredParticipants(board);
  const modeTitle = test ? "CLARA TEST RACE" : "CLARA OFFICIAL RACE";
  const modeCopy = test
    ? "Pre-launch competition is ON. Real Daily Money Tip check-ins decide who stays in. No official tickets or prizes are issued from this test run."
    : "The official 30-Day Race is running. Everyone is racing against consistency, not against each other.";

  return `
    <section id="${ROOT_ID}" class="clara-race-runtime ${test ? "test" : "live"}">
      <div class="clara-race-runtime-line"></div>
      <div class="clara-race-runtime-head">
        <div class="clara-race-runtime-icon">🏁</div>
        <div class="clara-race-runtime-title">
          <p>${esc(modeTitle)}</p>
          <h3>Day ${Number(control.raceDay || 1)} of 30</h3>
          <span>Started ${esc(prettyDate(control.raceStartDay))}</span>
        </div>
        <strong class="clara-race-runtime-badge ${test ? "test" : "live"}">${test ? "TEST" : "LIVE"}</strong>
      </div>
      <p class="clara-race-runtime-copy">${esc(modeCopy)}</p>
      <div class="clara-race-you">${esc(personalCopy(board))}</div>

      <div class="clara-race-summary">
        <div><small>STARTED</small><b>${Number(summary.started || 0)}</b></div>
        <div><small>STILL IN</small><b>${Number(summary.stillIn || 0)}</b></div>
        <div><small>FINISHED</small><b>${Number(summary.finished || 0)}</b></div>
        <div><small>OUT</small><b>${Number(summary.out || 0)}</b></div>
      </div>

      <div class="clara-race-filter">
        <button data-clara-race-filter="still_in" class="${activeFilter === "still_in" ? "active" : ""}">Still In</button>
        <button data-clara-race-filter="finished" class="${activeFilter === "finished" ? "active" : ""}">Finished</button>
        <button data-clara-race-filter="out" class="${activeFilter === "out" ? "active" : ""}">Out</button>
      </div>

      <div class="clara-race-people">
        ${list.length ? list.map(participantCard).join("") : '<div class="clara-race-empty">No competitors in this group yet.</div>'}
      </div>
      <p class="clara-race-footnote">The Race Board refreshes automatically from backend streak metadata. Emails, budgets, transactions, messages, and notes are not shown here.</p>
    </section>`;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .clara-race-runtime{position:relative;overflow:hidden;border:1px solid rgba(34,199,184,.22);border-radius:26px;background:#091727;padding:18px;color:#fff}.clara-race-runtime.test{border-color:rgba(250,204,21,.24)}
    .clara-race-runtime-line{position:absolute;inset:0 0 auto;height:2px;background:linear-gradient(90deg,#22c7b8 0 50%,#facc15 50% 62%,#f43f5e 62% 100%)}
    .clara-race-runtime-head{display:flex;align-items:center;gap:12px}.clara-race-runtime-icon{display:flex;width:44px;height:44px;flex:0 0 44px;align-items:center;justify-content:center;border:1px solid rgba(250,204,21,.2);border-radius:16px;background:rgba(250,204,21,.07);font-size:18px}.clara-race-runtime-title{min-width:0;flex:1}.clara-race-runtime-title p{margin:0;color:rgba(250,204,21,.72);font-size:9px;font-weight:900;letter-spacing:.16em}.clara-race-runtime-title h3{margin:3px 0 2px;font-size:20px;line-height:1.1;font-weight:900}.clara-race-runtime-title span{font-size:10px;font-weight:700;color:rgba(255,255,255,.38)}
    .clara-race-runtime-badge{padding:6px 9px;border-radius:999px;font-size:8px;font-weight:900;letter-spacing:.12em}.clara-race-runtime-badge.test{border:1px solid rgba(250,204,21,.2);background:rgba(250,204,21,.07);color:#fde68a}.clara-race-runtime-badge.live{border:1px solid rgba(34,199,184,.2);background:rgba(34,199,184,.08);color:#99f6e4}
    .clara-race-runtime-copy{margin:13px 0 0;font-size:11px;line-height:1.65;font-weight:650;color:rgba(255,255,255,.45)}.clara-race-you{margin-top:12px;padding:11px 12px;border:1px solid rgba(94,234,212,.12);border-radius:15px;background:rgba(34,199,184,.04);font-size:10px;line-height:1.5;font-weight:800;color:rgba(204,251,241,.72)}
    .clara-race-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:13px}.clara-race-summary div{padding:9px 5px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.02);text-align:center}.clara-race-summary small{display:block;font-size:7px;font-weight:900;letter-spacing:.08em;color:rgba(255,255,255,.25)}.clara-race-summary b{display:block;margin-top:3px;font-size:16px;font-weight:900}
    .clara-race-filter{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:13px;padding:4px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:#061321}.clara-race-filter button{height:34px;border:0;border-radius:10px;background:transparent;color:rgba(255,255,255,.36);font-size:9px;font-weight:900}.clara-race-filter button.active{background:rgba(255,255,255,.08);color:#fff}
    .clara-race-people{display:grid;gap:7px;margin-top:10px}.clara-race-person{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:18px;background:rgba(255,255,255,.02)}.clara-race-person.out{opacity:.5}.clara-race-avatar{position:relative;display:flex;width:44px;height:44px;flex:0 0 44px;align-items:center;justify-content:center;overflow:visible;border:2px solid #22c7b8;border-radius:50%;background:#10243a;font-size:10px;font-weight:900}.clara-race-avatar.risk,.clara-race-avatar.finished{border-color:#facc15}.clara-race-avatar.out{border-color:rgba(255,255,255,.15)}.clara-race-avatar img{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;object-fit:cover}.clara-race-avatar i{position:absolute;right:-2px;bottom:-2px;z-index:2;display:flex;width:16px;height:16px;align-items:center;justify-content:center;border:2px solid #091727;border-radius:50%;background:#0a1a29;color:#99f6e4;font-size:8px;font-style:normal}.clara-race-avatar.risk i,.clara-race-avatar.finished i{color:#fde68a}.clara-race-avatar.out i{color:rgba(255,255,255,.38)}
    .clara-race-person-copy{min-width:0;flex:1}.clara-race-person-copy b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:900}.clara-race-person-copy small{display:block;margin-top:2px;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:#99f6e4}.clara-race-person-copy small.risk,.clara-race-person-copy small.finished{color:#fde68a}.clara-race-person-copy small.out{color:rgba(255,255,255,.35)}.clara-race-day{text-align:right}.clara-race-day small{display:block;font-size:7px;font-weight:900;color:rgba(255,255,255,.23)}.clara-race-day b{font-size:15px;font-weight:900}.clara-race-empty{padding:18px 10px;border:1px solid rgba(255,255,255,.06);border-radius:16px;text-align:center;font-size:10px;font-weight:750;color:rgba(255,255,255,.35)}.clara-race-footnote{margin:11px 2px 0;font-size:8px;line-height:1.5;font-weight:650;color:rgba(255,255,255,.25)}
    @media(min-width:560px){.clara-race-people{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);
}

function removeRuntime() {
  document.getElementById(ROOT_ID)?.remove();
  restoreHiddenOfficialCards();
}

function mountBoard() {
  if (!challengePageVisible() || !thirtyDayTabActive()) {
    removeRuntime();
    return;
  }
  if (!latestBoard?.control?.isRunning) {
    removeRuntime();
    return;
  }

  installStyles();
  hideOfficialTestConflicts();
  const main = challengeMain();
  const inner = main?.querySelector(".mx-auto.w-full.max-w-3xl");
  if (!inner) return;

  const existing = document.getElementById(ROOT_ID);
  const wrapper = document.createElement("div");
  wrapper.innerHTML = boardMarkup(latestBoard).trim();
  const next = wrapper.firstElementChild;
  if (existing) existing.replaceWith(next);
  else {
    const tabs = [...inner.children].find((node) => node.tagName === "DIV" && node.querySelectorAll("button").length === 3 && node.textContent?.includes("30-Day"));
    if (tabs?.nextSibling) inner.insertBefore(next, tabs.nextSibling);
    else inner.appendChild(next);
  }
}

async function refreshBoard() {
  const token = getStoredBackendToken();
  if (!isStoredTokenLive(token) || requestRunning) {
    if (!token) removeRuntime();
    return;
  }
  requestRunning = true;
  try {
    latestBoard = await backendRequest("/api/users/me/challenge-race-board", { token, timeoutMs: 8000 });
    mountBoard();
  } catch {
    // Race control must never break the Challenge page if the backend is offline.
  } finally {
    requestRunning = false;
  }
}

function handleClick(event) {
  const filter = event.target.closest("[data-clara-race-filter]")?.dataset.claraRaceFilter;
  if (filter) {
    activeFilter = filter;
    mountBoard();
  }
}

export function installChallengeRaceControlRuntime() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraChallengeRaceControlRuntimeInstalled) return;
  window.__claraChallengeRaceControlRuntimeInstalled = true;

  document.addEventListener("click", handleClick);
  window.addEventListener("online", () => void refreshBoard());
  window.addEventListener("pageshow", () => void refreshBoard());

  observer = new MutationObserver(() => mountBoard());
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

  [800, 2500, 6000].forEach((delay) => window.setTimeout(() => void refreshBoard(), delay));
  window.setInterval(() => void refreshBoard(), REFRESH_MS);
}

installChallengeRaceControlRuntime();
