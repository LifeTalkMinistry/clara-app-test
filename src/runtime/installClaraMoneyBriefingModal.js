const RUNTIME_KEY = "__claraMoneyBriefingModalRuntime__";
const MEANS_CONTEXT_KEY = "__claraCanonicalMeansSnapshot__";
const MEANS_SNAPSHOT_UPDATED_EVENT = "clara:means-snapshot-updated";
const METRIC_SELECTOR = '[data-clara-orb-means-metric="true"]';
const COMPACT_SELECTOR = '[data-clara-current-cycle-briefing="true"]';
const MODAL_SELECTOR = '[data-clara-money-briefing-modal="true"]';
const SOURCE_SELECTOR = '[data-clara-money-briefing="active-cycle"]';

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
  if (!match) return "payday";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
  }).format(date);
}

function readSnapshot() {
  const snapshot = window[MEANS_CONTEXT_KEY];
  return snapshot && typeof snapshot === "object" ? snapshot : null;
}

function realRoomFor(snapshot) {
  return Number(snapshot?.wallBill ?? snapshot?.projectedRoom ?? 0) || 0;
}

function remainingPlanFor(snapshot) {
  return Number(snapshot?.remainingPlannedSpending ?? snapshot?.upcoming ?? 0) || 0;
}

function compactSignature(snapshot) {
  if (!snapshot) return "waiting";
  return [
    Math.round(Number(snapshot.income || 0)),
    Math.round(Number(snapshot.availableWalletMoney ?? snapshot.availableNow ?? 0)),
    Math.round(Number(snapshot.spent || 0)),
    Math.round(remainingPlanFor(snapshot)),
    Math.round(realRoomFor(snapshot)),
    snapshot.cycleEndDate || "",
  ].join(":");
}

function currentCycleMarkup(snapshot) {
  if (!snapshot) {
    return `
      <div style="padding:14px 15px;text-align:left">
        <span style="display:block;font-size:8px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.30)">This pay cycle</span>
        <strong style="display:block;margin-top:8px;font-size:11px;color:rgba(255,255,255,.72)">Waiting for your active pay cycle…</strong>
      </div>`;
  }

  const realRoom = realRoomFor(snapshot);
  const remainingPlan = remainingPlanFor(snapshot);
  const realRoomTone = realRoom >= 0 ? "#67e8c8" : "#ff7f8d";

  return `
    <div style="padding:13px 14px 12px;text-align:left">
      <span style="display:block;font-size:7.5px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.27)">This pay cycle</span>
      <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:14px;margin-top:7px;font-size:10px;color:rgba(255,255,255,.39)"><span>Income this pay cycle</span><strong style="white-space:nowrap;color:rgba(255,255,255,.74)">${money(snapshot.income)}</strong></span>
      <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:14px;margin-top:5px;font-size:10px;color:rgba(255,255,255,.48)"><span>Money in hand</span><strong style="white-space:nowrap;color:rgba(255,255,255,.90)">${money(snapshot.availableWalletMoney ?? snapshot.availableNow)}</strong></span>
      <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:14px;margin-top:5px;font-size:10px;color:rgba(255,255,255,.36)"><span>Actual spent</span><strong style="white-space:nowrap;color:rgba(255,255,255,.68)">${money(snapshot.spent)}</strong></span>
      <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:14px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.055);font-size:10px;color:rgba(255,255,255,.44)"><span>Remaining planned spending</span><strong style="white-space:nowrap;color:rgba(255,255,255,.82)">${money(remainingPlan)}</strong></span>
      <span style="display:block;margin-top:10px;padding-top:9px;border-top:1px solid rgba(103,232,200,.15)">
        <span style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:14px">
          <span style="font-size:8px;font-weight:900;letter-spacing:.10em;text-transform:uppercase;color:rgba(255,255,255,.58)">Real room until ${formatHorizonDate(snapshot.cycleEndDate)}</span>
          <strong style="white-space:nowrap;font-size:13px;font-weight:950;letter-spacing:-.02em;color:${realRoomTone}">${money(realRoom)}</strong>
        </span>
        <span style="display:block;margin-top:3px;font-size:8.5px;font-weight:650;line-height:1.35;color:rgba(255,255,255,.27)">Money in hand minus everything still planned</span>
      </span>
    </div>`;
}

function ensureCompactBriefing(metric) {
  if (!metric?.parentElement) return null;
  const parent = metric.parentElement;
  let compact = parent.querySelector(COMPACT_SELECTOR);
  if (!compact) {
    compact = document.createElement("section");
    compact.dataset.claraCurrentCycleBriefing = "true";
    compact.setAttribute("aria-label", "Current pay cycle money briefing");
    compact.style.width = "min(300px, 78vw)";
    compact.style.margin = "10px auto 1px";
    compact.style.overflow = "hidden";
    compact.style.border = "1px solid rgba(112,157,229,.13)";
    compact.style.borderRadius = "16px";
    compact.style.background = "linear-gradient(180deg,rgba(9,21,50,.74),rgba(4,11,31,.69))";
    compact.style.boxShadow = "0 14px 34px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.025)";
    compact.style.backdropFilter = "blur(12px)";
    compact.style.webkitBackdropFilter = "blur(12px)";

    const action = document.createElement("button");
    action.type = "button";
    action.dataset.claraOpenMoneyBriefing = "true";
    action.style.display = "flex";
    action.style.width = "calc(100% - 20px)";
    action.style.minHeight = "38px";
    action.style.margin = "0 10px 10px";
    action.style.padding = "0 13px";
    action.style.alignItems = "center";
    action.style.justifyContent = "space-between";
    action.style.gap = "10px";
    action.style.border = "1px solid rgba(112,157,229,.16)";
    action.style.borderRadius = "12px";
    action.style.background = "linear-gradient(100deg,rgba(39,94,196,.12),rgba(99,65,192,.10))";
    action.style.color = "rgba(225,236,255,.76)";
    action.style.fontSize = "9px";
    action.style.fontWeight = "850";
    action.style.letterSpacing = ".02em";
    action.style.cursor = "pointer";
    action.style.webkitTapHighlightColor = "transparent";
    action.innerHTML = '<span>View Full Money Briefing</span><span aria-hidden="true" style="font-size:13px;color:rgba(145,190,255,.60)">→</span>';
    action.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openMoneyBriefingModal();
    });

    const body = document.createElement("div");
    body.dataset.claraCurrentCycleBriefingBody = "true";
    compact.append(body, action);
    metric.after(compact);
  }

  const snapshot = readSnapshot();
  const signature = compactSignature(snapshot);
  if (compact.dataset.claraCurrentCycleSignature !== signature) {
    compact.dataset.claraCurrentCycleSignature = signature;
    const body = compact.querySelector('[data-clara-current-cycle-briefing-body="true"]');
    if (body) body.innerHTML = currentCycleMarkup(snapshot);
  }

  return compact;
}

function hideInlineFullBriefing(metric) {
  if (!metric) return;
  if (metric.getAttribute("aria-expanded") !== "false") metric.setAttribute("aria-expanded", "false");
  metric.querySelectorAll('[data-clara-means-expanded="true"]').forEach((node) => {
    if (node.style.display !== "none") node.style.display = "none";
  });

  const chip = metric.firstElementChild;
  if (chip) {
    const chevron = chip.lastElementChild;
    if (chevron && chevron.textContent?.includes("⌄") && chevron.style.display !== "none") {
      chevron.style.display = "none";
    }
  }
}

function bindClonedInfoToggle(root) {
  const toggle = root?.querySelector?.('[data-clara-means-info-toggle="true"]');
  if (!toggle) return;
  const copy = root.querySelector('[data-clara-means-info-copy="true"]');
  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!copy) return;
    const nextOpen = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", nextOpen ? "true" : "false");
    copy.style.display = nextOpen ? "block" : "none";
  });
}

function modalContentMarkup() {
  const metric = document.querySelector(METRIC_SELECTOR);
  const source = metric?.querySelector?.(SOURCE_SELECTOR) || document.querySelector(SOURCE_SELECTOR);
  if (!source) {
    return '<div style="padding:22px;font-size:13px;font-weight:700;line-height:1.6;color:rgba(255,255,255,.60)">CLARA is still preparing your full money briefing. Your current-cycle summary remains available on the main screen.</div>';
  }

  const clone = source.cloneNode(true);
  clone.style.display = "block";
  clone.style.width = "100%";
  clone.style.maxWidth = "none";
  clone.style.margin = "0";
  clone.style.padding = "0";
  clone.style.border = "0";
  clone.style.borderRadius = "0";
  clone.style.background = "transparent";
  clone.style.boxShadow = "none";
  clone.style.backdropFilter = "none";
  clone.style.webkitBackdropFilter = "none";
  clone.dataset.claraMoneyBriefingModalContent = "true";

  const holder = document.createElement("div");
  holder.appendChild(clone);
  return holder.innerHTML;
}

function closeMoneyBriefingModal() {
  const modal = document.querySelector(MODAL_SELECTOR);
  if (!modal) return;
  modal.remove();
  const previousOverflow = document.body.dataset.claraBriefingPreviousOverflow;
  document.body.style.overflow = previousOverflow || "";
  delete document.body.dataset.claraBriefingPreviousOverflow;
}

function openMoneyBriefingModal() {
  closeMoneyBriefingModal();

  const overlay = document.createElement("div");
  overlay.dataset.claraMoneyBriefingModal = "true";
  overlay.setAttribute("role", "presentation");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "100000";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))";
  overlay.style.background = "rgba(1,5,18,.74)";
  overlay.style.backdropFilter = "blur(14px) saturate(1.08)";
  overlay.style.webkitBackdropFilter = "blur(14px) saturate(1.08)";

  overlay.innerHTML = `
    <section role="dialog" aria-modal="true" aria-label="Full Money Briefing" style="position:relative;display:flex;flex-direction:column;width:min(430px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:hidden;border:1px solid rgba(127,168,255,.18);border-radius:28px;background:linear-gradient(155deg,rgba(5,20,48,.985),rgba(3,10,31,.992) 52%,rgba(21,9,48,.988));box-shadow:0 28px 80px rgba(0,0,0,.58),inset 0 1px 0 rgba(255,255,255,.05)">
      <div aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:28px"><div style="position:absolute;width:190px;height:190px;left:-90px;top:-90px;border-radius:999px;background:rgba(36,189,255,.08);filter:blur(38px)"></div><div style="position:absolute;width:220px;height:220px;right:-110px;bottom:-110px;border-radius:999px;background:rgba(128,74,255,.10);filter:blur(42px)"></div></div>
      <header style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 18px 14px;border-bottom:1px solid rgba(255,255,255,.06)">
        <div style="min-width:0;text-align:left"><span style="display:block;font-size:8px;font-weight:900;letter-spacing:.17em;text-transform:uppercase;color:rgba(135,196,255,.48)">CLARA</span><strong style="display:block;margin-top:3px;font-size:17px;font-weight:950;letter-spacing:-.025em;color:rgba(255,255,255,.95)">Full Money Briefing</strong><span style="display:block;margin-top:3px;font-size:9px;font-weight:650;color:rgba(255,255,255,.34)">This pay cycle + next pay cycle</span></div>
        <button type="button" data-clara-close-money-briefing="true" aria-label="Close Full Money Briefing" style="display:grid;place-items:center;flex:0 0 auto;width:40px;height:40px;padding:0;border:1px solid rgba(255,255,255,.11);border-radius:999px;background:rgba(255,255,255,.035);color:rgba(255,255,255,.68);font-size:20px;font-weight:500;cursor:pointer;-webkit-tap-highlight-color:transparent">×</button>
      </header>
      <div data-clara-money-briefing-scroll="true" style="position:relative;z-index:1;overflow-y:auto;overscroll-behavior:contain;padding:16px 18px 22px;scrollbar-width:thin;scrollbar-color:rgba(145,190,255,.25) transparent">
        ${modalContentMarkup()}
      </div>
    </section>`;

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeMoneyBriefingModal();
  });
  overlay.querySelector('[data-clara-close-money-briefing="true"]')?.addEventListener("click", closeMoneyBriefingModal);
  bindClonedInfoToggle(overlay);

  if (!document.body.dataset.claraBriefingPreviousOverflow) {
    document.body.dataset.claraBriefingPreviousOverflow = document.body.style.overflow || "";
  }
  document.body.style.overflow = "hidden";
  document.body.appendChild(overlay);
  overlay.querySelector('[data-clara-close-money-briefing="true"]')?.focus();
}

function syncPresentation() {
  const metric = document.querySelector(METRIC_SELECTOR);
  if (!metric) return;
  hideInlineFullBriefing(metric);
  ensureCompactBriefing(metric);
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  window[RUNTIME_KEY]?.destroy?.();

  let queued = false;
  let destroyed = false;
  const queueSync = () => {
    if (queued || destroyed) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      if (!destroyed) syncPresentation();
    });
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  const interceptMetricClick = (event) => {
    const metric = event.target?.closest?.(METRIC_SELECTOR);
    if (!metric) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openMoneyBriefingModal();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape" && document.querySelector(MODAL_SELECTOR)) {
      event.preventDefault();
      closeMoneyBriefingModal();
    }
  };

  const handleSnapshotUpdate = () => {
    queueSync();
    if (document.querySelector(MODAL_SELECTOR)) {
      window.requestAnimationFrame(() => {
        if (document.querySelector(MODAL_SELECTOR)) openMoneyBriefingModal();
      });
    }
  };

  document.addEventListener("click", interceptMetricClick, true);
  document.addEventListener("keydown", handleKeyDown);
  window.addEventListener(MEANS_SNAPSHOT_UPDATED_EVENT, handleSnapshotUpdate);
  queueSync();

  window[RUNTIME_KEY] = {
    destroy() {
      destroyed = true;
      observer.disconnect();
      document.removeEventListener("click", interceptMetricClick, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(MEANS_SNAPSHOT_UPDATED_EVENT, handleSnapshotUpdate);
      closeMoneyBriefingModal();
      document.querySelector(COMPACT_SELECTOR)?.remove();
    },
  };
}

install();
