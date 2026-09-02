import "./installClaraPwaFreshness";
import "./installClaraOrbChatHandoff";
import "./installClaraOrbCommandChatRouting";
import "./installClaraBuyCheckKeyboardGuard";
import "./installClaraOrbViewportOwnershipGuard";
import { fetchCanonicalClaraProfile, resolveCanonicalFirstName } from "@/lib/canonical-clara-profile";
import { FINANCE_DATA_UPDATED_EVENT } from "@/lib/financeRepository";
import { DEBT_OBLIGATIONS_UPDATED_EVENT } from "@/lib/debtObligationStore";
import { MEANS_SNAPSHOT_UPDATED_EVENT } from "@/lib/clara-means-boundary";
import {
  CLARA_MONEY_ROUTINE_UPDATED_EVENT,
  CLARA_MONEY_SCHEDULE_UPDATED_EVENT,
} from "@/lib/clara-money-schedule-repository";
import { buildRollingMeansSnapshot } from "@/lib/clara-means-rolling-authority";

const RUNTIME_KEY = "__claraOrbGreetingRuntime__";
const PRODUCTION_GREETING_SELECTOR =
  '.clara-community-root[data-community-view="orb"] [data-clara-orb-visual-offset] > div:first-child > p';
const TUTORIAL_GREETING_SELECTOR =
  '[data-clara-tutorial-orb-intro="true"] [data-clara-orb-visual-offset] > div:first-child > p';
const TUTORIAL_ROOT_SELECTOR = '[data-clara-tutorial-orb-intro="true"]';
const ORB_COMPOSITION_SELECTOR = '[data-clara-orb-composition="true"]';
const ORB_LAUNCHER_SELECTOR = '[data-clara-orb-launcher="true"]';
const ORB_IDLE_COPY_SELECTOR = ".clara-orb-idle-copy";
const MEANS_METRIC_ATTR = "data-clara-orb-means-metric";
const MEANS_PLACEHOLDER_ATTR = "data-clara-orb-means-placeholder";
const MEANS_CONTEXT_KEY = "__claraCanonicalMeansSnapshot__";
const INCOME_HUB_UPDATED_EVENT = "clara-income-hub-updated";
const CALENDAR_UPDATED_EVENT = "clara:schedule-events-updated";

function resolveGreetingLabel() {
  return (
    document.querySelector(TUTORIAL_GREETING_SELECTOR) ||
    document.querySelector(PRODUCTION_GREETING_SELECTOR)
  );
}

function resolveTutorialIdentity(label) {
  const tutorialRoot = label?.closest?.(TUTORIAL_ROOT_SELECTOR);
  if (!tutorialRoot) return null;

  return {
    firstName: String(tutorialRoot.dataset.claraTutorialOrbName || "").trim(),
  };
}

function isOrbCommandModeVisible(label) {
  const composition = label?.closest?.(ORB_COMPOSITION_SELECTOR);
  const launcher = composition?.querySelector?.(ORB_LAUNCHER_SELECTOR);
  return launcher?.dataset?.orbCommandVisible === "true";
}

function clearGreetingPresentation(label) {
  if (!label) return;

  delete label.dataset.claraOrbUserGreeting;
  delete label.dataset.claraOrbGreetingScope;
  label.style.fontSize = "";
  label.style.fontWeight = "";
  label.style.lineHeight = "";
  label.style.letterSpacing = "";
  label.style.textTransform = "";
  label.style.color = "";
}

function money(value) {
  const amount = Number(value || 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const sign = safeAmount < 0 ? "−" : "";
  return `${sign}₱${Math.abs(safeAmount).toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })}`;
}

function formatHorizonDate(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "the next payday";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDayBefore(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "the following payday";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() - 1);
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
  }).format(date);
}

async function buildMeansSnapshot(profile = {}) {
  return buildRollingMeansSnapshot({ profile });
}

function statusForScore(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return "Score unavailable";
  if (value >= 10000) return "Diamond";
  if (value >= 5000) return "Gold";
  if (value >= 2000) return "Silver";
  if (value >= 1000) return "Bronze";
  if (value >= 500) return "Vanguard";
  if (value >= 200) return "Strong Coverage";
  if (value >= 101) return "Below Your Means";
  if (value === 100) return "Within Your Means";
  if (value >= 1) return "Above Your Means";
  return "In Deficit";
}

function metricTone(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return "#9aa7be";
  if (value > 100) return "#67e8c8";
  if (value === 100) return "#e7eefc";
  if (value >= 0) return "#f4d36a";
  return "#ff7f8d";
}

function isScoreResolved(snapshot) {
  if (!snapshot) return false;
  if (snapshot.meansScoreResolved === false) return false;
  return Number.isFinite(Number(snapshot.score));
}

function unresolvedScoreLabel(snapshot) {
  if (snapshot?.migrationUnresolved) return "Cycle anchor needs migration";
  if (snapshot?.anchorState === "no_anchor") return "Cycle anchor not established";
  return "Score anchor unresolved";
}

function meansBriefingMarkup(snapshot, expanded) {
  const realRoom = Number(snapshot?.wallBill ?? snapshot?.projectedRoom ?? 0) || 0;
  const remainingPlan = Number(
    snapshot?.remainingPlannedSpending ?? snapshot?.upcoming ?? 0
  ) || 0;
  const otherUpcoming = Number(snapshot?.otherScheduledUpcoming || 0) || 0;
  const rollingResolved = snapshot?.upcomingCycleResolved === true;
  const upcomingRequirement = Number(snapshot?.upcomingCycleRequirement || 0) || 0;
  const upcomingCoverageResolved = snapshot?.upcomingCoverageScore != null &&
    Number.isFinite(Number(snapshot.upcomingCoverageScore));
  const upcomingShortfall = Number(snapshot?.upcomingShortfall || 0) || 0;
  const upcomingSurplus = Number(snapshot?.upcomingSurplus || 0) || 0;
  const upcomingEndLabel = formatDayBefore(snapshot?.upcomingCycleEndDate);
  const nextCycleMarkup = rollingResolved
    ? `
      <span data-clara-next-pay-cycle="true" style="display:block;margin-top:11px;padding-top:10px;border-top:1px solid rgba(96,165,250,.16)">
        <span style="display:block;font-size:7.5px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:rgba(145,190,255,.48)">Next pay cycle</span>
        <strong style="display:block;margin-top:3px;font-size:10px;font-weight:900;color:rgba(255,255,255,.76)">${formatHorizonDate(snapshot?.upcomingCycleStartDate)} → ${upcomingEndLabel}</strong>

        <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px;margin-top:7px;font-size:10px;color:rgba(255,255,255,.40)"><span style="min-width:0">Carryover from this cycle</span><strong style="white-space:nowrap;color:rgba(255,255,255,.75)">${money(snapshot?.upcomingCarryover)}</strong></span>
        <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px;margin-top:5px;font-size:10px;color:rgba(255,255,255,.40)"><span style="min-width:0">Lowest expected ${formatHorizonDate(snapshot?.upcomingCycleStartDate)} income</span><strong style="white-space:nowrap;color:rgba(255,255,255,.75)">${money(snapshot?.lowestExpectedIncome)}</strong></span>
        <span data-clara-upcoming-projected-resources="true" style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px;margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,.05);font-size:9px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.47)"><span style="min-width:0">Projected money available</span><strong style="white-space:nowrap;font-size:11px;color:rgba(255,255,255,.88)">${money(snapshot?.upcomingProjectedResources)}</strong></span>

        <span style="display:block;margin-top:9px;font-size:7.5px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.28)">Expected to cover before ${formatHorizonDate(snapshot?.upcomingCycleEndDate)}</span>
        <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px;margin-top:5px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span style="min-width:0">↳ Debt / obligations</span><strong style="white-space:nowrap;color:rgba(255,255,255,.58)">${money(snapshot?.upcomingDebtRequirement)}</strong></span>
        <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span style="min-width:0">↳ Money Schedule</span><strong style="white-space:nowrap;color:rgba(255,255,255,.58)">${money(snapshot?.upcomingMoneyScheduleRequirement)}</strong></span>
        <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span style="min-width:0">↳ Calendar Events</span><strong style="white-space:nowrap;color:rgba(255,255,255,.58)">${money(snapshot?.upcomingCalendarEventRequirement)}</strong></span>
        <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px;margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,.05);font-size:9px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.47)"><span style="min-width:0">Total upcoming requirement</span><strong style="white-space:nowrap;font-size:11px;color:rgba(255,255,255,.88)">${money(upcomingRequirement)}</strong></span>

        <span data-clara-next-cycle-coverage="true" style="display:block;margin-top:9px;padding-top:8px;border-top:1px solid rgba(103,232,200,.13)">
          ${upcomingCoverageResolved
            ? `<span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px"><span style="min-width:0;font-size:8px;font-weight:900;letter-spacing:.105em;text-transform:uppercase;color:rgba(255,255,255,.55)">Next-cycle coverage</span><strong style="white-space:nowrap;font-size:12px;font-weight:950;color:${Number(snapshot.upcomingCoverageScore) >= 100 ? "#67e8c8" : "#f4d36a"}">${snapshot.upcomingCoverageScore}%</strong></span>
              <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px;margin-top:4px;font-size:9px;color:rgba(255,255,255,.34)"><span>${upcomingShortfall > 0 ? "Short by" : "Room after requirements"}</span><strong style="white-space:nowrap;color:${upcomingShortfall > 0 ? "#ff9a9f" : "rgba(103,232,200,.78)"}">${money(upcomingShortfall > 0 ? upcomingShortfall : upcomingSurplus)}</strong></span>`
            : `<span style="display:block;font-size:9px;font-weight:750;line-height:1.45;color:rgba(255,255,255,.38)">No upcoming planned requirement is currently scheduled in this paycheck window, so CLARA does not invent a coverage percentage.</span>`}
        </span>
      </span>`
    : `
      <span data-clara-next-pay-cycle="unresolved" style="display:block;margin-top:11px;padding-top:10px;border-top:1px solid rgba(96,165,250,.12);font-size:9px;font-weight:650;line-height:1.45;color:rgba(255,255,255,.30)">CLARA could not resolve the following payday yet, so the current score is not extended with an invented future window.</span>`;

  return `
    <span data-clara-means-expanded="true" data-clara-money-briefing="active-cycle" style="display:${expanded ? "block" : "none"};width:min(300px,78vw);margin:10px auto 1px;padding:11px 12px;border:1px solid rgba(112,157,229,.13);border-radius:15px;background:linear-gradient(180deg,rgba(9,21,50,.72),rgba(4,11,31,.66));box-shadow:0 14px 34px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.025);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);text-align:left;overflow:hidden">
      <span style="display:block;font-size:7.5px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.25)">This pay cycle</span>
      <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px;margin-top:6px;font-size:10px;color:rgba(255,255,255,.38)"><span style="min-width:0">Income this pay cycle</span><strong style="white-space:nowrap;color:rgba(255,255,255,.72)">${money(snapshot?.income)}</strong></span>
      <span data-clara-money-in-hand="true" style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px;margin-top:5px;font-size:10px;color:rgba(255,255,255,.50)"><span style="min-width:0">Money in hand</span><strong style="white-space:nowrap;color:rgba(255,255,255,.88)">${money(snapshot?.availableWalletMoney ?? snapshot?.availableNow)}</strong></span>

      <span style="display:block;margin-top:9px;padding-top:8px;border-top:1px solid rgba(255,255,255,.055);font-size:7.5px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.25)">Spending</span>
      <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px;margin-top:6px;font-size:10px;color:rgba(255,255,255,.38)"><span style="min-width:0">Actual spent</span><strong style="white-space:nowrap;color:rgba(255,255,255,.72)">${money(snapshot?.spent)}</strong></span>

      <span style="display:block;margin-top:9px;padding-top:8px;border-top:1px solid rgba(255,255,255,.055);font-size:7.5px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.25)">Still to cover</span>
      <span data-clara-upcoming-commitments="true" style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px;margin-top:6px;font-size:10px;color:rgba(255,255,255,.46)"><span style="min-width:0;font-weight:760">Remaining planned spending</span><strong style="white-space:nowrap;color:rgba(255,255,255,.80)">${money(remainingPlan)}</strong></span>
      <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span style="min-width:0">↳ Debt / obligations</span><strong style="white-space:nowrap;color:rgba(255,255,255,.58)">${money(snapshot?.debtUpcoming)}</strong></span>
      <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span style="min-width:0">↳ Money Schedule</span><strong style="white-space:nowrap;color:rgba(255,255,255,.58)">${money(snapshot?.moneyScheduleUpcoming)}</strong></span>
      ${otherUpcoming > 0 ? `<span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span style="min-width:0">↳ Other planned</span><strong style="white-space:nowrap;color:rgba(255,255,255,.58)">${money(otherUpcoming)}</strong></span>` : ""}

      <span data-clara-real-room="true" style="display:block;margin-top:10px;padding-top:9px;border-top:1px solid rgba(103,232,200,.16)">
        <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:12px">
          <span style="min-width:0;font-size:8px;font-weight:900;letter-spacing:.105em;text-transform:uppercase;color:rgba(255,255,255,.55)">Real room until ${formatHorizonDate(snapshot?.cycleEndDate)}</span>
          <strong style="white-space:nowrap;font-size:12px;font-weight:950;letter-spacing:-.02em;color:${realRoom >= 0 ? "#67e8c8" : "#ff7f8d"};text-shadow:0 0 14px ${realRoom >= 0 ? "rgba(103,232,200,.12)" : "rgba(255,127,141,.12)"}">${money(realRoom)}</strong>
        </span>
        <span style="display:block;margin-top:3px;font-size:8.5px;font-weight:650;line-height:1.35;color:rgba(255,255,255,.27)">Money in hand minus everything still planned</span>
      </span>

      ${nextCycleMarkup}

      <span style="display:block;margin-top:9px;padding-top:8px;border-top:1px solid rgba(255,255,255,.055);font-size:8.5px;font-weight:700;line-height:1.45;color:rgba(255,255,255,.27);text-align:center">Your score considers the next pay cycle so upcoming bills don't catch you by surprise.</span>
      <span style="display:flex;align-items:center;justify-content:center;gap:5px;margin-top:7px;font-size:8.5px;font-weight:700;color:rgba(255,255,255,.22);text-align:center">
        <span>CLARA uses the more conservative pay-cycle view</span>
        <button type="button" data-clara-means-info-toggle="true" aria-label="How the Means Score is calculated" aria-expanded="false" style="display:inline-grid;place-items:center;width:15px;height:15px;padding:0;border:1px solid rgba(255,255,255,.13);border-radius:999px;background:rgba(255,255,255,.025);color:rgba(255,255,255,.36);font-size:9px;font-weight:800;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent">i</button>
      </span>
      <span data-clara-means-info-copy="true" style="display:none;margin-top:7px;padding:7px 8px;border:1px solid rgba(255,255,255,.05);border-radius:9px;background:rgba(255,255,255,.018);font-size:8.5px;font-weight:650;line-height:1.45;color:rgba(255,255,255,.30);text-align:center">CLARA checks both your money today and what is already scheduled before your following payday. Your expected income is used only for projection — it is not counted as money you already have.</span>
    </span>
  `;
}

function bindMeansInfoToggle(root) {
  const infoToggle = root?.querySelector?.('[data-clara-means-info-toggle="true"]');
  if (!infoToggle || infoToggle.dataset.claraMeansInfoBound === "true") return;
  infoToggle.dataset.claraMeansInfoBound = "true";
  infoToggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const infoCopy = root.querySelector?.('[data-clara-means-info-copy="true"]');
    if (!infoCopy) return;
    const nextOpen = infoToggle.getAttribute("aria-expanded") !== "true";
    infoToggle.setAttribute("aria-expanded", nextOpen ? "true" : "false");
    infoCopy.style.display = nextOpen ? "block" : "none";
  });
}

function ensureMeansPlaceholder(idleCopy) {
  const placeholder = idleCopy?.querySelector?.(`[${MEANS_PLACEHOLDER_ATTR}="true"]`);
  if (!placeholder || placeholder.dataset.claraMeansPremiumPlaceholder === "true") {
    return placeholder;
  }

  placeholder.dataset.claraMeansPremiumPlaceholder = "true";
  placeholder.style.marginTop = "9px";
  placeholder.style.fontSize = "initial";
  placeholder.style.fontWeight = "initial";
  placeholder.style.letterSpacing = "initial";
  placeholder.style.color = "inherit";
  placeholder.innerHTML = `
    <span style="display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:31px;padding:4px 11px 4px 5px;border:1px solid rgba(103,157,255,.14);border-radius:999px;background:linear-gradient(180deg,rgba(13,28,62,.68),rgba(4,10,31,.74));box-shadow:0 10px 28px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.035),0 0 20px rgba(46,110,255,.055);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)">
      <strong style="display:inline-grid;place-items:center;min-width:27px;height:23px;padding:0 6px;border:1px solid rgba(255,255,255,.07);border-radius:999px;background:rgba(255,255,255,.035);font-size:11px;font-weight:900;line-height:1;color:rgba(255,255,255,.58)">—</strong>
      <span style="font-size:8px;font-weight:900;line-height:1;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.34)">Means score</span>
    </span>
  `;

  return placeholder;
}

function ensureMeansMetric(label, snapshot, onToggle) {
  const composition = label?.closest?.(ORB_COMPOSITION_SELECTOR);
  const idleCopy = composition?.querySelector?.(ORB_IDLE_COPY_SELECTOR);
  if (!idleCopy) return null;

  const tapCopy = idleCopy.querySelector("p");
  if (tapCopy) tapCopy.style.display = "none";
  ensureMeansPlaceholder(idleCopy);

  let root = idleCopy.querySelector(`[${MEANS_METRIC_ATTR}="true"]`);

  if (!root) {
    root = document.createElement("button");
    root.type = "button";
    root.setAttribute(MEANS_METRIC_ATTR, "true");
    root.setAttribute("aria-expanded", "false");
    root.style.display = "block";
    root.style.width = "100%";
    root.style.margin = "9px auto 0";
    root.style.padding = "0";
    root.style.border = "0";
    root.style.background = "transparent";
    root.style.color = "inherit";
    root.style.textAlign = "center";
    root.style.cursor = "pointer";
    root.style.WebkitTapHighlightColor = "transparent";
    root.addEventListener("click", onToggle);
    idleCopy.appendChild(root);
  }

  const expanded = root.getAttribute("aria-expanded") === "true";
  const renderSignature = snapshot
    ? [
        "ready",
        snapshot.score,
        snapshot.meansScoreResolved === false ? 0 : 1,
        snapshot.anchorState || "",
        snapshot.migrationUnresolved ? 1 : 0,
        Math.round(snapshot.income || 0),
        Math.round(snapshot.spent || 0),
        Math.round(snapshot.upcoming || 0),
        Math.round(snapshot.debtUpcoming || 0),
        Math.round(snapshot.moneyScheduleUpcoming || 0),
        Math.round(snapshot.otherScheduledUpcoming || 0),
        snapshot.cycleStartDate || "",
        snapshot.cycleEndDate || "",
        Math.round(snapshot.availableNow || 0),
        Math.round(snapshot.cycle100Anchor || 0),
        Math.round(snapshot.remainingPlannedSpending || 0),
        Math.round(snapshot.wallBill || 0),
        snapshot.upcomingCycleStartDate || "",
        snapshot.upcomingCycleEndDate || "",
        Math.round(snapshot.lowestExpectedIncome || 0),
        Math.round(snapshot.upcomingProjectedResources || 0),
        Math.round(snapshot.upcomingCycleRequirement || 0),
        Math.round(snapshot.upcomingDebtRequirement || 0),
        Math.round(snapshot.upcomingMoneyScheduleRequirement || 0),
        Math.round(snapshot.upcomingCalendarEventRequirement || 0),
        snapshot.upcomingCoverageScore ?? "",
        Math.round(snapshot.upcomingShortfall || 0),
        Math.round(snapshot.upcomingSurplus || 0),
        snapshot.meansScoreLimitingWindow || "",
        expanded ? 1 : 0,
      ].join(":")
    : `waiting:${expanded ? 1 : 0}`;
  if (root.dataset.claraMeansRenderSignature === renderSignature) return root;
  root.dataset.claraMeansRenderSignature = renderSignature;

  if (!snapshot) {
    root.setAttribute(
      "aria-label",
      expanded
        ? "Means Score details. Waiting for a valid Income Hub pay cycle."
        : "Means Score. Waiting for a valid Income Hub pay cycle. Tap for details."
    );
    root.innerHTML = `
      <span style="display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:31px;padding:4px 10px 4px 5px;border:1px solid rgba(103,157,255,.14);border-radius:999px;background:linear-gradient(180deg,rgba(13,28,62,.68),rgba(4,10,31,.74));box-shadow:0 10px 28px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.035),0 0 20px rgba(46,110,255,.055);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)">
        <strong style="display:inline-grid;place-items:center;min-width:29px;height:23px;padding:0 6px;border:1px solid rgba(255,255,255,.07);border-radius:999px;background:rgba(255,255,255,.035);font-size:11px;font-weight:900;line-height:1;color:rgba(255,255,255,.58)">—</strong>
        <span style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;line-height:1">
          <span style="font-size:7px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.26)">Means score</span>
          <span style="font-size:9px;font-weight:800;letter-spacing:-.01em;color:rgba(255,255,255,.52)">Waiting for income timing</span>
        </span>
        <span style="margin-left:1px;font-size:9px;line-height:1;color:rgba(255,255,255,.25);transform:${expanded ? "rotate(180deg)" : "none"};transition:transform 160ms ease">⌄</span>
      </span>
      <span data-clara-means-expanded="true" style="display:${expanded ? "block" : "none"};width:min(300px,78vw);margin:10px auto 1px;padding:12px;border:1px solid rgba(112,157,229,.13);border-radius:15px;background:linear-gradient(180deg,rgba(9,21,50,.72),rgba(4,11,31,.66));box-shadow:0 14px 34px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.025);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);text-align:left">
        <strong style="display:block;font-size:10px;font-weight:900;letter-spacing:-.01em;color:rgba(255,255,255,.76)">No valid Income Hub pay cycle detected yet.</strong>
        <span style="display:block;margin-top:5px;font-size:9.5px;font-weight:650;line-height:1.5;color:rgba(255,255,255,.40)">Set a stable income schedule in Income Hub so CLARA can use payday-to-payday boundaries. CLARA will not substitute a calendar-month boundary.</span>
      </span>
    `;
    return root;
  }

  if (!isScoreResolved(snapshot)) {
    const unresolvedLabel = unresolvedScoreLabel(snapshot);
    root.setAttribute(
      "aria-label",
      `Means Score unavailable. ${unresolvedLabel}. Financial briefing remains available. ${expanded ? "Tap to collapse details." : "Tap for details."}`
    );
    root.innerHTML = `
      <span style="display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:31px;padding:4px 10px 4px 5px;border:1px solid rgba(154,167,190,.18);border-radius:999px;background:linear-gradient(180deg,rgba(13,28,62,.68),rgba(4,10,31,.74));box-shadow:0 10px 28px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.035);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)">
        <strong style="display:inline-grid;place-items:center;min-width:29px;height:23px;padding:0 6px;border:1px solid rgba(154,167,190,.16);border-radius:999px;background:rgba(154,167,190,.05);font-size:11px;font-weight:900;line-height:1;color:#9aa7be">—</strong>
        <span style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;line-height:1">
          <span style="font-size:7px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.26)">Means score</span>
          <span style="font-size:9px;font-weight:800;letter-spacing:-.01em;color:rgba(255,255,255,.55)">${unresolvedLabel}</span>
        </span>
        <span style="margin-left:1px;font-size:9px;line-height:1;color:rgba(255,255,255,.25);transform:${expanded ? "rotate(180deg)" : "none"};transition:transform 160ms ease">⌄</span>
      </span>
      ${meansBriefingMarkup(snapshot, expanded)}
    `;
    bindMeansInfoToggle(root);
    return root;
  }

  const tone = metricTone(snapshot.score);
  root.setAttribute(
    "aria-label",
    `Means Score ${snapshot.score}. ${statusForScore(snapshot.score)}. ${expanded ? "Tap to collapse details." : "Tap for details."}`
  );
  root.innerHTML = `
    <span style="display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:31px;padding:4px 10px 4px 5px;border:1px solid rgba(103,157,255,.14);border-radius:999px;background:linear-gradient(180deg,rgba(13,28,62,.68),rgba(4,10,31,.74));box-shadow:0 10px 28px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.035),0 0 20px rgba(46,110,255,.055);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)">
      <strong style="display:inline-grid;place-items:center;min-width:29px;height:23px;padding:0 6px;border:1px solid ${tone}33;border-radius:999px;background:${tone}0d;box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 0 14px ${tone}12;font-size:11px;font-weight:900;line-height:1;color:${tone}">${snapshot.score}</strong>
      <span style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;line-height:1">
        <span style="font-size:7px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.26)">Means score</span>
        <span style="font-size:9px;font-weight:800;letter-spacing:-.01em;color:rgba(255,255,255,.62)">${statusForScore(snapshot.score)}</span>
      </span>
      <span style="margin-left:1px;font-size:9px;line-height:1;color:rgba(255,255,255,.25);transform:${expanded ? "rotate(180deg)" : "none"};transition:transform 160ms ease">⌄</span>
    </span>
    ${meansBriefingMarkup(snapshot, expanded)}
  `;

  bindMeansInfoToggle(root);
  return root;
}

function installClaraOrbGreeting() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  window[RUNTIME_KEY]?.destroy?.();
  let queued = false;
  let activeLabel = null;
  let firstName = "";
  let loaded = false;
  let request = null;
  let destroyed = false;
  let canonicalProfile = null;
  let meansSnapshot = null;
  let meansRequest = null;

  const publishMeansSnapshot = (snapshot) => {
    const published = snapshot ? { ...snapshot, capturedAt: Date.now() } : null;
    window[MEANS_CONTEXT_KEY] = published;
    window.dispatchEvent(
      new CustomEvent(MEANS_SNAPSHOT_UPDATED_EVENT, {
        detail: { snapshot: published },
      })
    );
  };

  const toggleMeansMetric = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const root = event.currentTarget;
    const nextExpanded = root.getAttribute("aria-expanded") !== "true";
    root.setAttribute("aria-expanded", nextExpanded ? "true" : "false");
    if (activeLabel) ensureMeansMetric(activeLabel, meansSnapshot, toggleMeansMetric);
    if (!meansSnapshot) refreshMeans();
  };

  const refreshMeans = () => {
    if (!canonicalProfile || meansRequest || destroyed) return;
    meansRequest = buildMeansSnapshot(canonicalProfile)
      .then((snapshot) => {
        if (destroyed) return;
        meansSnapshot = snapshot;
        publishMeansSnapshot(snapshot);
        if (activeLabel) ensureMeansMetric(activeLabel, meansSnapshot, toggleMeansMetric);
      })
      .catch((error) => {
        if (destroyed) return;
        console.warn("CLARA Orb Means Score unavailable:", error);
        meansSnapshot = null;
        publishMeansSnapshot(null);
        if (activeLabel) ensureMeansMetric(activeLabel, null, toggleMeansMetric);
      })
      .finally(() => {
        meansRequest = null;
      });
  };

  const render = () => {
    const label = resolveGreetingLabel();
    if (!label) {
      activeLabel = null;
      firstName = "";
      loaded = false;
      return null;
    }

    if (label !== activeLabel) {
      activeLabel = label;
      const tutorialIdentity = resolveTutorialIdentity(label);
      firstName = tutorialIdentity?.firstName || "";
      loaded = Boolean(tutorialIdentity);
    }

    if (isOrbCommandModeVisible(label)) {
      clearGreetingPresentation(label);
      return null;
    }

    const nextText = firstName ? `Hi ${firstName}!` : "Hi!";
    if (label.textContent !== nextText) label.textContent = nextText;
    label.dataset.claraOrbUserGreeting = "true";
    label.dataset.claraOrbGreetingScope = resolveTutorialIdentity(label) ? "tutorial" : "production";
    label.style.fontSize = "18px";
    label.style.fontWeight = "900";
    label.style.lineHeight = "1.1";
    label.style.letterSpacing = "-0.02em";
    label.style.textTransform = "none";
    label.style.color = "rgba(255, 255, 255, 0.96)";

    if (!resolveTutorialIdentity(label)) {
      ensureMeansMetric(label, meansSnapshot, toggleMeansMetric);
    }
    return label;
  };

  const load = () => {
    if (!activeLabel || loaded || request) return;
    const requestedLabel = activeLabel;
    request = fetchCanonicalClaraProfile()
      .then((profile) => {
        if (destroyed || activeLabel !== requestedLabel) return;
        canonicalProfile = profile || null;
        firstName = resolveCanonicalFirstName(profile);
        loaded = true;
        render();
        refreshMeans();
      })
      .catch((error) => {
        if (destroyed || activeLabel !== requestedLabel) return;
        console.warn("CLARA Orb canonical profile greeting unavailable:", error);
        loaded = true;
        render();
      })
      .finally(() => {
        request = null;
      });
  };

  const sync = () => {
    queued = false;
    if (render()) load();
  };

  const queueSync = () => {
    if (queued || destroyed) return;
    queued = true;
    window.requestAnimationFrame(sync);
  };

  const handleFinanceRefresh = () => {
    meansSnapshot = null;
    refreshMeans();
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-orb-command-visible"],
  });
  window.addEventListener(FINANCE_DATA_UPDATED_EVENT, handleFinanceRefresh);
  window.addEventListener(INCOME_HUB_UPDATED_EVENT, handleFinanceRefresh);
  window.addEventListener(DEBT_OBLIGATIONS_UPDATED_EVENT, handleFinanceRefresh);
  window.addEventListener(CLARA_MONEY_ROUTINE_UPDATED_EVENT, handleFinanceRefresh);
  window.addEventListener(CLARA_MONEY_SCHEDULE_UPDATED_EVENT, handleFinanceRefresh);
  window.addEventListener(CALENDAR_UPDATED_EVENT, handleFinanceRefresh);
  window.addEventListener("clara:means-assumed-spent-reset", handleFinanceRefresh);
  window.addEventListener("clara:schedule:create-event", handleFinanceRefresh);
  queueSync();

  window[RUNTIME_KEY] = {
    destroy() {
      destroyed = true;
      observer.disconnect();
      window.removeEventListener(FINANCE_DATA_UPDATED_EVENT, handleFinanceRefresh);
      window.removeEventListener(INCOME_HUB_UPDATED_EVENT, handleFinanceRefresh);
      window.removeEventListener(DEBT_OBLIGATIONS_UPDATED_EVENT, handleFinanceRefresh);
      window.removeEventListener(CLARA_MONEY_ROUTINE_UPDATED_EVENT, handleFinanceRefresh);
      window.removeEventListener(CLARA_MONEY_SCHEDULE_UPDATED_EVENT, handleFinanceRefresh);
      window.removeEventListener(CALENDAR_UPDATED_EVENT, handleFinanceRefresh);
      window.removeEventListener("clara:means-assumed-spent-reset", handleFinanceRefresh);
      window.removeEventListener("clara:schedule:create-event", handleFinanceRefresh);
      clearGreetingPresentation(activeLabel);
      activeLabel = null;
      request = null;
      meansRequest = null;
      canonicalProfile = null;
      meansSnapshot = null;
      publishMeansSnapshot(null);
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraOrbGreeting();