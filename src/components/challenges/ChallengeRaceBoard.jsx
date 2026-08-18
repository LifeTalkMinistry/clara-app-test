import { useEffect, useMemo, useState } from "react";
import { Check, Flame, Medal, ShieldAlert, Trophy, Users } from "lucide-react";
import { backendRequest, getStoredBackendToken, getStoredBackendUser } from "@/lib/clara-backend-client";

const FILTERS = [
  { key: "still_in", label: "Still In" },
  { key: "finished", label: "Finished" },
  { key: "out", label: "Out" },
];
const TEST_HIDDEN_ATTR = "data-clara-test-race-hidden";
const FRAMEWORK_HIDDEN_ATTR = "data-clara-thirty-framework-hidden";
const FRAMEWORK_METRICS_ID = "clara-thirty-framework-metrics";
const FRAMEWORK_CALENDAR_ID = "clara-thirty-framework-calendar";
const RACE_BOARD_HOST_ID = "clara-live-race-board-host";
const FRAMEWORK_SHELL_ATTR = "data-clara-thirty-framework-shell";
const CHALLENGE_PROGRESS_STORAGE_KEY = "clara-challenge-progress-v1";
const THIRTY_DAY_CHALLENGE_ID = "thirty-day-discipline";
const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function initials(name = "") {
  const parts = String(name || "CLARA Member").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CL";
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2)).toUpperCase();
}

function monthLabel(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) return "Current Race";
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );
}

function prettyDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return "";
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  );
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentWeekWindow(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayIndex = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayIndex);

  const days = WEEKDAY_LABELS.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { key: localDateKey(date), date, label, index };
  });

  return {
    todayKey: localDateKey(today),
    dayIndex,
    days,
  };
}

function readThirtyDayProgress() {
  try {
    const raw = window.localStorage.getItem(CHALLENGE_PROGRESS_STORAGE_KEY) || "{}";
    const parsed = JSON.parse(raw);
    return parsed?.[THIRTY_DAY_CHALLENGE_ID] || null;
  } catch {
    return null;
  }
}

function makeCalendarCheckIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("h-3", "w-3");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "m9 12 2 2 4-4");
  svg.appendChild(path);
  return svg;
}

function syncThirtyDayCalendar(metrics) {
  if (!metrics) return;

  const entry = readThirtyDayProgress();
  const windowState = currentWeekWindow();
  const checkIns = new Set(
    (Array.isArray(entry?.checkIns) ? entry.checkIns : []).filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(String(key || "")))
  );
  const joinedAt = entry?.joinedAt ? new Date(entry.joinedAt) : null;
  const joinedKey = joinedAt && !Number.isNaN(joinedAt.getTime()) ? localDateKey(joinedAt) : null;
  const signature = `${windowState.todayKey}:${joinedKey || ""}:${[...checkIns].sort().join(",")}`;

  let calendar = document.getElementById(FRAMEWORK_CALENDAR_ID);
  if (!calendar) {
    calendar = document.createElement("div");
    calendar.id = FRAMEWORK_CALENDAR_ID;
    calendar.className = "mt-4 grid grid-cols-7 gap-1.5";
  }

  const parent = metrics.parentElement;
  const siblings = parent ? Array.from(parent.children) : [];
  const metricsIndex = siblings.indexOf(metrics);
  const statusRow = metricsIndex >= 0
    ? siblings.slice(metricsIndex + 1).find((node) => node !== calendar && node.matches?.("div.flex.flex-wrap"))
    : null;
  const anchor = statusRow || metrics;
  if (anchor.nextElementSibling !== calendar) {
    anchor.insertAdjacentElement("afterend", calendar);
  }

  if (calendar.dataset.signature === signature) return;
  calendar.dataset.signature = signature;
  calendar.replaceChildren();

  windowState.days.forEach((day) => {
    const isChecked = checkIns.has(day.key);
    const isToday = day.key === windowState.todayKey;
    const isPastMissed = Boolean(
      joinedKey &&
      day.index < windowState.dayIndex &&
      day.key >= joinedKey &&
      !isChecked
    );

    const cell = document.createElement("div");
    cell.className = `flex min-w-0 flex-col items-center rounded-[13px] border px-1 py-2 ${
      isChecked
        ? "border-[#22c7b8]/25 bg-[#22c7b8]/10"
        : isPastMissed
          ? "border-[#fb7185]/14 bg-[#fb7185]/[0.035]"
          : isToday
            ? "border-[#facc15]/25 bg-[#facc15]/[0.055]"
            : "border-white/[0.07] bg-white/[0.018]"
    }`;

    const label = document.createElement("span");
    label.className = `text-[8px] font-black ${isToday ? "text-[#fde68a]" : "text-white/35"}`;
    label.textContent = day.label;

    const value = document.createElement("span");
    value.className = `mt-1 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${
      isChecked
        ? "bg-[#22c7b8]/18 text-[#99f6e4]"
        : isPastMissed
          ? "text-[#fb7185]/55"
          : "text-white/22"
    }`;
    if (isChecked) value.appendChild(makeCalendarCheckIcon());
    else value.textContent = String(day.date.getDate());

    cell.append(label, value);
    calendar.appendChild(cell);
  });
}

function restoreTestHiddenCards() {
  document.querySelectorAll(`[${TEST_HIDDEN_ATTR}="true"]`).forEach((node) => {
    node.style.display = node.dataset.claraTestRacePreviousDisplay || "";
    delete node.dataset.claraTestRacePreviousDisplay;
    node.removeAttribute(TEST_HIDDEN_ATTR);
  });
}

function setTestRacePresentation(enabled) {
  if (!enabled) {
    restoreTestHiddenCards();
    return;
  }

  const challengeView = document.querySelector(".clara-community-challenges-view");
  if (!challengeView) return;

  Array.from(challengeView.querySelectorAll("section")).forEach((section) => {
    const text = String(section.textContent || "");
    const shouldHide =
      text.includes("Next 30-Day Race") ||
      text.includes("Race in progress") ||
      text.includes("Race day") ||
      text.includes("30-Day CLARA Streak");
    if (!shouldHide || section.getAttribute(TEST_HIDDEN_ATTR) === "true") return;
    section.dataset.claraTestRacePreviousDisplay = section.style.display || "";
    section.style.display = "none";
    section.setAttribute(TEST_HIDDEN_ATTR, "true");
  });
}

function challengeSections() {
  const view = document.querySelector(".clara-community-challenges-view");
  return view ? Array.from(view.querySelectorAll("section")) : [];
}

function findThirtyDayCard() {
  return challengeSections().find((section) =>
    Array.from(section.querySelectorAll("h3")).some(
      (heading) => String(heading.textContent || "").trim() === "30-Day CLARA Streak",
    )
  ) || null;
}

function findThirtyDayRecord() {
  return challengeSections().find((section) => {
    const text = String(section.textContent || "");
    return text.includes("Challenge record") && text.includes("Streak days") && text.includes("Active entries");
  }) || null;
}

function findMonthlyDrawCard() {
  return challengeSections().find((section) =>
    String(section.textContent || "").includes("Monthly Finisher Draw")
  ) || null;
}

function finiteInteger(value, fallback = 0) {
  const match = String(value ?? "").match(/\d+/);
  if (!match) return fallback;
  const number = Number(match[0]);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

function readMetric(section, label) {
  if (!section) return 0;
  const labelNode = Array.from(section.querySelectorAll("p")).find(
    (node) => String(node.textContent || "").trim().toLowerCase() === label.toLowerCase(),
  );
  return finiteInteger(labelNode?.previousElementSibling?.textContent, 0);
}

function readRaceStatus(challengeCard) {
  const text = String(challengeCard?.textContent || "");
  if (text.includes("Qualified · official race")) return "Qualified";
  if (text.includes("Check in today to qualify")) return "Pending";
  if (text.includes("Not qualified · current race")) return "Not qualified";
  return "Not joined";
}

function makeMetric(label, value, suffix = "", accent = false, compactValue = false) {
  const cell = document.createElement("div");
  cell.className = accent
    ? "rounded-[17px] border border-[#facc15]/12 bg-[#facc15]/[0.035] px-2.5 py-3"
    : "rounded-[17px] border border-white/[0.08] bg-white/[0.025] px-2.5 py-3";

  const labelNode = document.createElement("p");
  labelNode.className = accent
    ? "text-[8px] font-black uppercase tracking-[0.1em] text-[#fde68a]/45"
    : "text-[8px] font-black uppercase tracking-[0.1em] text-white/28";
  labelNode.textContent = label;

  const valueNode = document.createElement("p");
  valueNode.className = accent
    ? compactValue
      ? "mt-1 text-[11px] font-black leading-4 text-[#fde68a]"
      : "mt-1 text-lg font-black text-[#fde68a]"
    : compactValue
      ? "mt-1 text-[11px] font-black leading-4 text-white"
      : "mt-1 text-lg font-black text-white";
  valueNode.textContent = `${value}${suffix}`;

  cell.append(labelNode, valueNode);
  return cell;
}

function hideFrameworkLegacy(section) {
  if (!section || section.getAttribute(FRAMEWORK_HIDDEN_ATTR) === "true") return;
  section.dataset.claraThirtyFrameworkPreviousDisplay = section.style.display || "";
  section.style.display = "none";
  section.setAttribute(FRAMEWORK_HIDDEN_ATTR, "true");
}

function restoreFrameworkPresentation() {
  document.getElementById(FRAMEWORK_METRICS_ID)?.remove();
  document.getElementById(FRAMEWORK_CALENDAR_ID)?.remove();

  document.querySelectorAll(`[${FRAMEWORK_HIDDEN_ATTR}="true"]`).forEach((section) => {
    section.style.display = section.dataset.claraThirtyFrameworkPreviousDisplay || "";
    delete section.dataset.claraThirtyFrameworkPreviousDisplay;
    section.removeAttribute(FRAMEWORK_HIDDEN_ATTR);
  });

  const shell = document.querySelector(`[${FRAMEWORK_SHELL_ATTR}="true"]`);
  if (shell) {
    shell.style.display = shell.dataset.claraThirtyFrameworkPreviousDisplay || "";
    shell.style.flexDirection = shell.dataset.claraThirtyFrameworkPreviousFlexDirection || "";
    delete shell.dataset.claraThirtyFrameworkPreviousDisplay;
    delete shell.dataset.claraThirtyFrameworkPreviousFlexDirection;
    shell.removeAttribute(FRAMEWORK_SHELL_ATTR);
  }

  const host = document.getElementById(RACE_BOARD_HOST_ID);
  if (host) {
    host.style.order = "";
    host.style.width = "";
  }
}

function syncFrameworkPresentation() {
  const challengeCard = findThirtyDayCard();
  if (!challengeCard) return;

  challengeCard.setAttribute("data-challenge-framework-zone", "my-progress");
  const record = findThirtyDayRecord();
  const streakDays = readMetric(record, "Streak days");
  const activeEntries = readMetric(record, "Active entries");
  const raceStatus = readRaceStatus(challengeCard);
  const signature = `${streakDays}:${activeEntries}:${raceStatus}`;

  let metrics = document.getElementById(FRAMEWORK_METRICS_ID);
  if (!metrics) {
    metrics = document.createElement("div");
    metrics.id = FRAMEWORK_METRICS_ID;
    metrics.className = "mt-4 grid grid-cols-3 gap-2";

    const heading = Array.from(challengeCard.querySelectorAll("h3")).find(
      (node) => String(node.textContent || "").trim() === "30-Day CLARA Streak",
    );
    const description = heading?.nextElementSibling;
    if (description) description.insertAdjacentElement("afterend", metrics);
  }

  if (metrics && metrics.dataset.signature !== signature) {
    metrics.dataset.signature = signature;
    metrics.replaceChildren(
      makeMetric("Active streak", streakDays, " days"),
      makeMetric("Draw entries", activeEntries, "", true),
      makeMetric("Race status", raceStatus, "", false, true),
    );
  }

  syncThirtyDayCalendar(metrics);

  if (record) hideFrameworkLegacy(record);
  challengeSections().forEach((section) => {
    const text = String(section.textContent || "");
    if (text.includes("Earned through consistency") || text.includes("CLARA challenge rule")) {
      hideFrameworkLegacy(section);
    }
  });

  findMonthlyDrawCard()?.setAttribute("data-challenge-framework-zone", "my-outcome");

  const shell = challengeCard.parentElement;
  if (shell && shell.getAttribute(FRAMEWORK_SHELL_ATTR) !== "true") {
    shell.dataset.claraThirtyFrameworkPreviousDisplay = shell.style.display || "";
    shell.dataset.claraThirtyFrameworkPreviousFlexDirection = shell.style.flexDirection || "";
    shell.style.display = "flex";
    shell.style.flexDirection = "column";
    shell.setAttribute(FRAMEWORK_SHELL_ATTR, "true");
  }

  const host = document.getElementById(RACE_BOARD_HOST_ID);
  if (host) {
    host.style.order = "50";
    host.style.width = "100%";
  }
}

function statusMeta(participant) {
  if (participant.status === "finished") {
    return { label: "Finished", icon: Medal, ring: "border-[#facc15]", text: "text-[#fde68a]" };
  }
  if (participant.status === "out") {
    return { label: "Out", icon: ShieldAlert, ring: "border-white/15", text: "text-white/35" };
  }
  if (participant.status === "needs_check_in") {
    return { label: "Needs today", icon: Flame, ring: "border-[#facc15]/65", text: "text-[#fde68a]" };
  }
  return { label: "Checked in", icon: Check, ring: "border-[#22c7b8]", text: "text-[#99f6e4]" };
}

function Competitor({ participant }) {
  const meta = statusMeta(participant);
  const Icon = meta.icon;
  return (
    <div className={`rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-3 ${participant.status === "out" ? "opacity-55" : ""}`}>
      <div className="flex items-center gap-3">
        <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 ${meta.ring} bg-[#10243a] text-xs font-black text-white`}>
          <span>{initials(participant.displayName)}</span>
          {participant.avatarUrl ? (
            <img
              src={participant.avatarUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={(event) => { event.currentTarget.style.display = "none"; }}
            />
          ) : null}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#06111f] bg-[#0a1a29]">
            <Icon className={`h-2.5 w-2.5 ${meta.text}`} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-black text-white">{participant.displayName}</p>
          <p className={`mt-0.5 text-[9px] font-black uppercase tracking-[0.08em] ${meta.text}`}>{meta.label}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black uppercase tracking-[0.1em] text-white/28">Day</p>
          <p className="text-base font-black text-white">{participant.day || 0}</p>
        </div>
      </div>
    </div>
  );
}

export default function ChallengeRaceBoard() {
  const [activeFilter, setActiveFilter] = useState("still_in");
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    const token = getStoredBackendToken();
    if (!token) {
      setState({ loading: false, data: null, error: "Sign in to view the live Race Board." });
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const data = await backendRequest("/api/users/me/challenge-race-board", { token });
        if (!cancelled) setState({ loading: false, data, error: "" });
      } catch (error) {
        if (!cancelled) {
          setState({ loading: false, data: null, error: "Race Board is temporarily unavailable." });
        }
      }
    };

    load();
    const intervalId = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const control = state.data?.control || null;
  const isTestRace = control?.mode === "test" && control?.isRunning;
  const isLiveRace = control?.mode === "live" && control?.isRunning;

  useEffect(() => {
    setTestRacePresentation(Boolean(isTestRace));
    return () => {
      if (isTestRace) restoreTestHiddenCards();
    };
  }, [isTestRace]);

  useEffect(() => {
    let queued = false;
    const run = () => {
      queued = false;
      syncFrameworkPresentation();
    };
    const queue = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(run);
    };

    syncFrameworkPresentation();
    const view = document.querySelector(".clara-community-challenges-view");
    const observer = view ? new MutationObserver(queue) : null;
    observer?.observe(view, { childList: true, subtree: true, characterData: true });
    window.setTimeout(queue, 0);

    return () => {
      observer?.disconnect();
      restoreFrameworkPresentation();
    };
  }, []);

  const participants = Array.isArray(state.data?.participants) ? state.data.participants : [];
  const summary = state.data?.summary || { started: 0, stillIn: 0, finished: 0, out: 0 };
  const currentUser = getStoredBackendUser();
  const me = participants.find((item) => String(item.userId) === String(currentUser?.id));

  const filtered = useMemo(() => {
    if (activeFilter === "finished") return participants.filter((item) => item.status === "finished");
    if (activeFilter === "out") return participants.filter((item) => item.status === "out");
    return participants.filter((item) => item.status === "checked_in" || item.status === "needs_check_in");
  }, [activeFilter, participants]);

  if (!state.loading && !state.error && !control?.isRunning) return null;

  const personalMessage = !me
    ? Number(control?.raceDay || 1) <= 1
      ? "Complete today's Daily Money Tip check-in to appear on the starting line."
      : "You are not currently active in this race."
    : me.status === "checked_in"
      ? `You're still in. Day ${me.day} is secured.`
      : me.status === "needs_check_in"
        ? "You're still in, but today's Daily Money Tip check-in is still needed."
        : me.status === "finished"
          ? "You finished the 30-day race."
          : `Your run ended on Day ${me.day || 0}.`;

  const heading = isTestRace
    ? `TEST Race · Day ${Number(control?.raceDay || 1)} of 30`
    : isLiveRace
      ? `${monthLabel(state.data?.raceMonth)} · Day ${Number(control?.raceDay || 1)} of 30`
      : monthLabel(state.data?.raceMonth);

  return (
    <section
      data-clara-challenge-race-board="true"
      data-challenge-framework-zone="our-progress"
      className={`relative overflow-hidden rounded-[26px] border bg-[#091727] p-4 sm:p-5 ${isTestRace ? "border-[#facc15]/24" : "border-[#22c7b8]/18"}`}
    >
      <div className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl ${isTestRace ? "bg-[#facc15]/[0.07]" : "bg-[#22c7b8]/[0.08]"}`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[17px] border ${isTestRace ? "border-[#facc15]/20 bg-[#facc15]/10 text-[#fde68a]" : "border-[#22c7b8]/20 bg-[#22c7b8]/10 text-[#99f6e4]"}`}>
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className={`text-[9px] font-black uppercase tracking-[0.17em] ${isTestRace ? "text-[#facc15]/70" : "text-[#5eead4]/60"}`}>
                  Our Progress
                </p>
                {isTestRace ? (
                  <span className="rounded-full border border-[#facc15]/20 bg-[#facc15]/[0.06] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-[#fde68a]">Pre-launch test</span>
                ) : null}
              </div>
              <h3 className="mt-1 text-lg font-black tracking-[-0.03em] text-white">30-Day Contenders</h3>
              <p className="mt-0.5 text-[9px] font-bold text-white/30">{heading}</p>
              {control?.raceStartDay ? (
                <p className="mt-0.5 text-[9px] font-bold text-white/30">Starting line · {prettyDate(control.raceStartDay)}</p>
              ) : null}
              <p className="mt-1 text-[10px] font-semibold leading-4 text-white/40">
                {isTestRace
                  ? "Real Daily Money Tip check-ins decide who stays in. This test does not issue official tickets, prizes, or permanent race rewards."
                  : "See who is still standing with you. This is a finish-together race, not a leaderboard."}
              </p>
            </div>
          </div>
          <Trophy className="mt-1 h-5 w-5 shrink-0 text-[#facc15]/65" />
        </div>

        {control?.isRunning ? (
          <div className={`mt-3 rounded-[16px] border px-3 py-2.5 text-[10px] font-bold leading-4 ${isTestRace ? "border-[#facc15]/12 bg-[#facc15]/[0.035] text-[#fde68a]/70" : "border-[#22c7b8]/12 bg-[#22c7b8]/[0.035] text-[#99f6e4]/70"}`}>
            {personalMessage}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="rounded-[15px] border border-white/[0.07] bg-white/[0.025] px-2 py-2.5 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.08em] text-white/28">Started</p>
            <p className="mt-1 text-base font-black text-white">{summary.started || 0}</p>
          </div>
          <div className="rounded-[15px] border border-[#22c7b8]/12 bg-[#22c7b8]/[0.04] px-2 py-2.5 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.08em] text-[#99f6e4]/45">Still In</p>
            <p className="mt-1 text-base font-black text-[#99f6e4]">{summary.stillIn || 0}</p>
          </div>
          <div className="rounded-[15px] border border-[#facc15]/12 bg-[#facc15]/[0.035] px-2 py-2.5 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.08em] text-[#fde68a]/45">Finished</p>
            <p className="mt-1 text-base font-black text-[#fde68a]">{summary.finished || 0}</p>
          </div>
          <div className="rounded-[15px] border border-white/[0.07] bg-white/[0.02] px-2 py-2.5 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.08em] text-white/24">Out</p>
            <p className="mt-1 text-base font-black text-white/45">{summary.out || 0}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-[16px] border border-white/[0.07] bg-[#061321] p-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`h-9 rounded-[12px] text-[9px] font-black transition ${activeFilter === filter.key ? "bg-white/[0.08] text-white" : "text-white/35"}`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="mt-3">
          {state.loading ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {[0, 1, 2, 3].map((item) => <div key={item} className="h-[74px] animate-pulse rounded-[20px] border border-white/[0.05] bg-white/[0.025]" />)}
            </div>
          ) : state.error ? (
            <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.02] px-4 py-5 text-center text-[11px] font-semibold text-white/38">{state.error}</div>
          ) : filtered.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {filtered.map((participant) => <Competitor key={participant.userId} participant={participant} />)}
            </div>
          ) : (
            <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.02] px-4 py-5 text-center">
              <p className="text-[11px] font-black text-white/55">No one here yet.</p>
              <p className="mt-1 text-[9px] font-semibold text-white/28">This board updates automatically as the race changes.</p>
            </div>
          )}
        </div>

        {isTestRace ? (
          <p className="mt-3 text-[8px] font-semibold leading-4 text-white/25">
            Ending or resetting this TEST race removes only the temporary competition starting line. It does not erase anyone's normal Daily Money Tip streak history.
          </p>
        ) : null}
      </div>
    </section>
  );
}
