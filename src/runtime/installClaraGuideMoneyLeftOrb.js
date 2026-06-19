const GUIDE_MODE_CHANGE_EVENT = "clara:guide-mode-change";
const GUIDE_TARGET_CHANGE_EVENT = "clara:guide-target-change";
const GUIDE_FEATURE_COMPLETE_EVENT = "clara:guide-feature-complete";
const GUIDE_EXIT_EVENT = "clara:guide-exit";

const PRIVACY_FEATURE = "money-left-privacy";
const ORB_FEATURE = "money-left-orb";
const ROOT_CLASS = "clara-guide-money-left-orb-active";
const PRIVACY_ROOT_CLASS = "clara-guide-money-left-privacy-active";
const ORB_SELECTOR = '[data-clara-manual-expense-orb="true"]';

const SINGLE_TAP_DELAY = 240;
const DOUBLE_TAP_WINDOW = 280;
const LONG_PRESS_DELAY = 520;
const MOVE_CANCEL_DISTANCE = 12;

const PHASE_COPY = {
  intro: {
    title: "MEET THE CLARA ORB",
    body: "One control gives you three quick actions.",
    footer: "LEARN EACH ACTION ONE AT A TIME.",
    actionLabel: "NEXT",
    items: [
      { label: "1 TAP", value: "Log Expense" },
      { label: "2 TAPS", value: "Transaction Hub" },
      { label: "HOLD", value: "Chat with CLARA" },
    ],
  },
  "await-single": {
    title: "1 TAP — LOG EXPENSE",
    body: "Tap the CLARA orb once to open the quick expense logger.",
    footer: "TAP THE ORB ONCE.",
  },
  "await-double": {
    title: "2 TAPS — TRANSACTION HUB",
    body: "Tap the orb twice quickly to open your complete transaction history.",
    footer: "DOUBLE-TAP THE ORB NOW.",
  },
  "await-hold": {
    title: "HOLD — CHAT WITH CLARA",
    body: "Press and hold the orb until CLARA opens.",
    footer: "PRESS AND HOLD THE ORB NOW.",
  },
  complete: {
    title: "ORB READY",
    body: "Tap once to log an expense, tap twice for Transaction Hub, or hold to chat with CLARA.",
    footer: "YOU NOW KNOW ALL THREE ORB ACTIONS.",
    actionLabel: "NEXT",
  },
};

let guideModeActive = false;
let orbGuideActive = false;
let phase = "intro";
let previewType = null;
let bubbleNode = null;
let previewNode = null;
let singleTapTimer = null;
let longPressTimer = null;
let tapResetTimer = null;
let lastTapAt = 0;
let holdTriggered = false;
let keyIsDown = false;
let pointerState = {
  startX: 0,
  startY: 0,
  moved: false,
};

function getDashboardScroller() {
  const anchor = document.querySelector(".clara-guide-carousel-anchor");
  return anchor?.closest?.("main") || document.scrollingElement || null;
}

function preserveDashboardScrollPosition(callback) {
  if (typeof callback !== "function") return;

  const scroller = getDashboardScroller();
  const lockedScrollTop = Number(scroller?.scrollTop) || 0;
  const restore = () => {
    if (!scroller) return;
    if (Math.abs((Number(scroller.scrollTop) || 0) - lockedScrollTop) > 0.5) {
      scroller.scrollTop = lockedScrollTop;
    }
  };

  callback();
  window.requestAnimationFrame(() => {
    restore();
    window.requestAnimationFrame(restore);
  });
}

function clearTimer(timerName) {
  if (timerName === "single" && singleTapTimer) {
    window.clearTimeout(singleTapTimer);
    singleTapTimer = null;
  }

  if (timerName === "long" && longPressTimer) {
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  if (timerName === "tap-reset" && tapResetTimer) {
    window.clearTimeout(tapResetTimer);
    tapResetTimer = null;
  }
}

function clearAllTimers() {
  clearTimer("single");
  clearTimer("long");
  clearTimer("tap-reset");
  lastTapAt = 0;
  holdTriggered = false;
  keyIsDown = false;
  pointerState = { startX: 0, startY: 0, moved: false };
  document.documentElement.classList.remove("clara-guide-orb-holding");
}

function stopEvent(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  event?.stopImmediatePropagation?.();
}

function getOrbFromEvent(event) {
  return event?.target?.closest?.(ORB_SELECTOR) || null;
}

function focusOrb() {
  window.requestAnimationFrame(() => {
    const orb = document.querySelector(ORB_SELECTOR);
    if (!orb) return;

    try {
      orb.focus({ preventScroll: true });
    } catch {
      orb.focus();
    }
  });
}

function setOrbAriaLabel() {
  const orb = document.querySelector(ORB_SELECTOR);
  if (!orb || !orbGuideActive) return;

  const labels = {
    intro: "CLARA orb with three actions",
    "await-single": "Tap once to practice logging an expense",
    "await-double": "Tap twice to practice opening Transaction Hub",
    "await-hold": "Press and hold to practice opening CLARA Chat",
    complete: "CLARA orb with three actions",
  };

  orb.setAttribute("data-clara-guide-original-aria-label", orb.getAttribute("aria-label") || "");
  orb.setAttribute("aria-label", labels[phase] || "CLARA orb guide action");
}

function restoreOrbAriaLabel() {
  const orb = document.querySelector(ORB_SELECTOR);
  if (!orb) return;

  const original = orb.getAttribute("data-clara-guide-original-aria-label");
  if (original !== null) {
    if (original) orb.setAttribute("aria-label", original);
    else orb.removeAttribute("aria-label");
    orb.removeAttribute("data-clara-guide-original-aria-label");
  }
}

function createBubble() {
  if (bubbleNode?.isConnected) return bubbleNode;

  const shell = document.createElement("div");
  shell.className = "clara-guide-orb-bubble-shell";
  shell.setAttribute("data-clara-guide-orb-bubble", "true");
  shell.innerHTML = `
    <div class="clara-guide-orb-bubble-surface" role="status" aria-live="polite">
      <div class="clara-guide-orb-bubble-arrow" aria-hidden="true"></div>
      <p class="clara-guide-orb-bubble-title" data-clara-guide-orb-title></p>
      <p class="clara-guide-orb-bubble-body" data-clara-guide-orb-body></p>
      <div class="clara-guide-orb-bubble-items" data-clara-guide-orb-items hidden></div>
      <p class="clara-guide-orb-bubble-footer" data-clara-guide-orb-footer></p>
      <button type="button" class="clara-guide-orb-next" data-clara-guide-orb-next hidden>NEXT</button>
    </div>
  `;

  shell.querySelector("[data-clara-guide-orb-next]")?.addEventListener("click", handleBubbleNext);
  document.body.appendChild(shell);
  bubbleNode = shell;
  return shell;
}

function renderBubble() {
  if (!orbGuideActive || previewType) return;

  const copy = PHASE_COPY[phase] || PHASE_COPY.intro;
  const shell = createBubble();
  shell.hidden = false;
  shell.querySelector("[data-clara-guide-orb-title]").textContent = copy.title;
  shell.querySelector("[data-clara-guide-orb-body]").textContent = copy.body;
  shell.querySelector("[data-clara-guide-orb-footer]").textContent = copy.footer;

  const itemsNode = shell.querySelector("[data-clara-guide-orb-items]");
  itemsNode.replaceChildren();
  const items = Array.isArray(copy.items) ? copy.items : [];
  itemsNode.hidden = items.length === 0;

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "clara-guide-orb-bubble-item";

    const label = document.createElement("span");
    label.className = "clara-guide-orb-bubble-item-label";
    label.textContent = item.label;

    const value = document.createElement("span");
    value.className = "clara-guide-orb-bubble-item-value";
    value.textContent = item.value;

    row.append(label, value);
    itemsNode.appendChild(row);
  });

  const nextButton = shell.querySelector("[data-clara-guide-orb-next]");
  nextButton.hidden = !copy.actionLabel;
  nextButton.textContent = copy.actionLabel || "NEXT";
  nextButton.disabled = false;
}

function removeBubble() {
  bubbleNode?.remove();
  bubbleNode = null;
}

function createStaticField(label, value) {
  return `
    <div class="clara-guide-orb-preview-field">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function getPreviewMarkup(type) {
  if (type === "log-expense") {
    return `
      <p class="clara-guide-orb-preview-eyebrow">ORB ACTION</p>
      <h2 id="clara-guide-orb-preview-title">Log Expense</h2>
      <p class="clara-guide-orb-preview-body">A single tap opens the expense form so you can record spending quickly.</p>
      <div class="clara-guide-orb-preview-fields">
        ${createStaticField("Amount", "₱120")}
        ${createStaticField("Budget List", "Food")}
        ${createStaticField("Wallet", "Main Wallet")}
      </div>
      <p class="clara-guide-orb-preview-safety">SIMULATION ONLY — NOTHING WILL BE SAVED.</p>
    `;
  }

  if (type === "transaction-hub") {
    return `
      <p class="clara-guide-orb-preview-eyebrow">ORB ACTION</p>
      <h2 id="clara-guide-orb-preview-title">Transaction Hub</h2>
      <p class="clara-guide-orb-preview-body">Two quick taps take you to the place where all recorded money activity can be reviewed.</p>
      <div class="clara-guide-orb-preview-transactions" aria-label="Static sample transactions">
        <div><span><strong>Expense</strong><small>Food</small></span><b>−₱120</b></div>
        <div><span><strong>Income</strong><small>Salary</small></span><b>+₱25,000</b></div>
        <div><span><strong>Transfer</strong><small>Main Wallet → Savings</small></span><b>₱2,000</b></div>
      </div>
      <p class="clara-guide-orb-preview-safety">SIMULATION ONLY — YOUR RECORDS WERE NOT OPENED OR CHANGED.</p>
    `;
  }

  return `
    <p class="clara-guide-orb-preview-eyebrow">ORB ACTION</p>
    <h2 id="clara-guide-orb-preview-title">Chat with CLARA</h2>
    <div class="clara-guide-orb-preview-chat">
      <span>CLARA</span>
      <p>Hi! Ask me anything about your spending, budget, savings, or next money decision.</p>
    </div>
    <input class="clara-guide-orb-preview-input" type="text" placeholder="Ask CLARA about your money..." disabled aria-label="Disabled CLARA chat simulation input" />
    <p class="clara-guide-orb-preview-safety">SIMULATION ONLY — NO MESSAGE WILL BE SENT.</p>
  `;
}

function showPreview(type) {
  previewType = type;
  clearAllTimers();

  if (bubbleNode) bubbleNode.hidden = true;
  previewNode?.remove();

  const shell = document.createElement("div");
  shell.className = "clara-guide-orb-preview-shell";
  shell.setAttribute("data-clara-guide-orb-preview", type);
  shell.innerHTML = `
    <div class="clara-guide-orb-preview-card" role="dialog" aria-labelledby="clara-guide-orb-preview-title">
      ${getPreviewMarkup(type)}
      <button type="button" class="clara-guide-orb-preview-next" data-clara-guide-orb-preview-next>NEXT</button>
    </div>
  `;

  shell.querySelector("[data-clara-guide-orb-preview-next]")?.addEventListener("click", handlePreviewNext);
  document.body.appendChild(shell);
  previewNode = shell;

  window.requestAnimationFrame(() => {
    shell.querySelector("[data-clara-guide-orb-preview-next]")?.focus({ preventScroll: true });
  });
}

function closePreview() {
  previewNode?.remove();
  previewNode = null;
  previewType = null;
}

function setPhase(nextPhase) {
  preserveDashboardScrollPosition(() => {
    clearAllTimers();
    phase = nextPhase;
    document.documentElement.setAttribute("data-clara-guide-orb-phase", phase);
    setOrbAriaLabel();
    renderBubble();
  });
}

function handleBubbleNext(event) {
  stopEvent(event);
  if (!orbGuideActive) return;

  if (phase === "intro") {
    setPhase("await-single");
    focusOrb();
    return;
  }

  if (phase === "complete") {
    window.dispatchEvent(
      new CustomEvent(GUIDE_FEATURE_COMPLETE_EVENT, {
        detail: { feature: ORB_FEATURE },
      }),
    );
  }
}

function handlePreviewNext(event) {
  stopEvent(event);
  if (!orbGuideActive || !previewType) return;

  const nextPhase =
    previewType === "log-expense"
      ? "await-double"
      : previewType === "transaction-hub"
        ? "await-hold"
        : "complete";

  preserveDashboardScrollPosition(() => {
    closePreview();
    phase = nextPhase;
    document.documentElement.setAttribute("data-clara-guide-orb-phase", phase);
    setOrbAriaLabel();
    renderBubble();
  });

  focusOrb();
}

function triggerCorrectGesture(type) {
  if (!orbGuideActive) return;

  preserveDashboardScrollPosition(() => {
    if (type === "single" && phase === "await-single") {
      phase = "single-preview";
      document.documentElement.setAttribute("data-clara-guide-orb-phase", phase);
      showPreview("log-expense");
      return;
    }

    if (type === "double" && phase === "await-double") {
      phase = "double-preview";
      document.documentElement.setAttribute("data-clara-guide-orb-phase", phase);
      showPreview("transaction-hub");
      return;
    }

    if (type === "hold" && phase === "await-hold") {
      phase = "hold-preview";
      document.documentElement.setAttribute("data-clara-guide-orb-phase", phase);
      showPreview("clara-chat");
    }
  });
}

function registerTap() {
  const now = Date.now();
  const previousTapAt = lastTapAt;

  if (phase === "await-single") {
    if (previousTapAt && now - previousTapAt <= DOUBLE_TAP_WINDOW) {
      lastTapAt = 0;
      clearTimer("single");
      clearTimer("tap-reset");
      return;
    }

    lastTapAt = now;
    clearTimer("single");
    singleTapTimer = window.setTimeout(() => {
      singleTapTimer = null;
      lastTapAt = 0;
      if (phase === "await-single") triggerCorrectGesture("single");
    }, Math.max(SINGLE_TAP_DELAY, DOUBLE_TAP_WINDOW));
    return;
  }

  if (phase === "await-double") {
    if (previousTapAt && now - previousTapAt <= DOUBLE_TAP_WINDOW) {
      lastTapAt = 0;
      clearTimer("tap-reset");
      triggerCorrectGesture("double");
      return;
    }

    lastTapAt = now;
    clearTimer("tap-reset");
    tapResetTimer = window.setTimeout(() => {
      tapResetTimer = null;
      lastTapAt = 0;
    }, DOUBLE_TAP_WINDOW);
  }
}

function beginHold(point) {
  clearTimer("long");
  holdTriggered = false;
  pointerState = {
    startX: Number(point?.clientX || 0),
    startY: Number(point?.clientY || 0),
    moved: false,
  };

  if (phase === "await-hold") {
    document.documentElement.classList.add("clara-guide-orb-holding");
  }

  longPressTimer = window.setTimeout(() => {
    longPressTimer = null;
    holdTriggered = true;
    clearTimer("single");
    clearTimer("tap-reset");
    lastTapAt = 0;
    document.documentElement.classList.remove("clara-guide-orb-holding");

    if (phase === "await-hold") triggerCorrectGesture("hold");
  }, LONG_PRESS_DELAY);
}

function cancelHold() {
  clearTimer("long");
  document.documentElement.classList.remove("clara-guide-orb-holding");
}

function handlePointerDown(event) {
  if (!orbGuideActive || !getOrbFromEvent(event)) return;
  stopEvent(event);

  if (!["await-single", "await-double", "await-hold"].includes(phase)) return;
  beginHold(event);
}

function handlePointerMove(event) {
  if (!orbGuideActive || !getOrbFromEvent(event)) return;
  stopEvent(event);

  const dx = Math.abs(Number(event.clientX || 0) - pointerState.startX);
  const dy = Math.abs(Number(event.clientY || 0) - pointerState.startY);

  if (dx > MOVE_CANCEL_DISTANCE || dy > MOVE_CANCEL_DISTANCE) {
    pointerState.moved = true;
    cancelHold();
  }
}

function finishPointerGesture(event, cancelled = false) {
  if (!orbGuideActive || !getOrbFromEvent(event)) return;
  stopEvent(event);
  cancelHold();

  const shouldIgnore = cancelled || pointerState.moved || holdTriggered;
  pointerState.moved = false;

  if (shouldIgnore) {
    holdTriggered = false;
    return;
  }

  if (phase === "await-single" || phase === "await-double") registerTap();
}

function handlePointerUp(event) {
  finishPointerGesture(event, false);
}

function handlePointerCancel(event) {
  finishPointerGesture(event, true);
}

function handleBlockedOrbEvent(event) {
  if (!orbGuideActive || !getOrbFromEvent(event)) return;
  stopEvent(event);
}

function handleKeyDown(event) {
  if (!orbGuideActive || !getOrbFromEvent(event)) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  stopEvent(event);

  if (keyIsDown || event.repeat) return;
  keyIsDown = true;

  if (["await-single", "await-double", "await-hold"].includes(phase)) {
    beginHold({ clientX: 0, clientY: 0 });
  }
}

function handleKeyUp(event) {
  if (!orbGuideActive || !getOrbFromEvent(event)) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  stopEvent(event);

  const wasHold = holdTriggered;
  keyIsDown = false;
  cancelHold();
  holdTriggered = false;

  if (!wasHold && (phase === "await-single" || phase === "await-double")) {
    registerTap();
  }
}

function startOrbGuide() {
  if (!guideModeActive || orbGuideActive) return;

  preserveDashboardScrollPosition(() => {
    orbGuideActive = true;
    phase = "intro";
    previewType = null;
    clearAllTimers();
    document.documentElement.classList.remove(PRIVACY_ROOT_CLASS);
    document.documentElement.classList.add(ROOT_CLASS);
    document.documentElement.setAttribute("data-clara-guide-orb-phase", phase);
    createBubble();
    renderBubble();
    setOrbAriaLabel();

    window.dispatchEvent(
      new CustomEvent(GUIDE_TARGET_CHANGE_EVENT, {
        detail: { feature: ORB_FEATURE },
      }),
    );
  });
}

function stopOrbGuide() {
  clearAllTimers();
  restoreOrbAriaLabel();
  closePreview();
  removeBubble();
  orbGuideActive = false;
  phase = "intro";
  document.documentElement.classList.remove(ROOT_CLASS, "clara-guide-orb-holding");
  document.documentElement.removeAttribute("data-clara-guide-orb-phase");
}

export function installClaraGuideMoneyLeftOrb() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_GUIDE_MONEY_LEFT_ORB_INSTALLED__) return;
  window.__CLARA_GUIDE_MONEY_LEFT_ORB_INSTALLED__ = true;

  window.addEventListener(GUIDE_MODE_CHANGE_EVENT, (event) => {
    guideModeActive = Boolean(event?.detail?.active);
    if (!guideModeActive) stopOrbGuide();
  });

  window.addEventListener(GUIDE_EXIT_EVENT, stopOrbGuide);

  window.addEventListener(GUIDE_FEATURE_COMPLETE_EVENT, (event) => {
    if (event?.detail?.feature === PRIVACY_FEATURE) startOrbGuide();
  });

  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("pointermove", handlePointerMove, true);
  document.addEventListener("pointerup", handlePointerUp, true);
  document.addEventListener("pointercancel", handlePointerCancel, true);
  document.addEventListener("pointerleave", handlePointerCancel, true);
  document.addEventListener("click", handleBlockedOrbEvent, true);
  document.addEventListener("dblclick", handleBlockedOrbEvent, true);
  document.addEventListener("contextmenu", handleBlockedOrbEvent, true);
  document.addEventListener("keydown", handleKeyDown, true);
  document.addEventListener("keyup", handleKeyUp, true);
}
