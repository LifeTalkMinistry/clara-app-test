import React, { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import "../../src/clara-universal-background.css";
import "../../src/clara-ai-overlay-soft-anchor.css";

const nativeSetTimeout = window.setTimeout.bind(window);
const nativeClearTimeout = window.clearTimeout.bind(window);
const nativeSetInterval = window.setInterval.bind(window);
const nativeClearInterval = window.clearInterval.bind(window);

const diagnostic = {
  counter: 0,
  startedAt: performance.now(),
  events: [],
};
window.__claraAddIncomeDiagnostic = diagnostic;

function record(type, detail = {}) {
  diagnostic.counter += 1;
  diagnostic.events.push({
    n: diagnostic.counter,
    t: Number((performance.now() - diagnostic.startedAt).toFixed(1)),
    type,
    ...detail,
  });
  if (diagnostic.events.length > 1500) diagnostic.events.splice(0, diagnostic.events.length - 1500);
}

window.setTimeout = (callback, delay = 0, ...args) => {
  let id = 0;
  const stack = new Error(`setTimeout(${delay})`).stack || "";
  const wrapped = (...callbackArgs) => {
    record("timeout-fired", { id, delay });
    return callback(...callbackArgs);
  };
  id = nativeSetTimeout(wrapped, delay, ...args);
  record("timeout-scheduled", { id, delay, stack });
  return id;
};

window.clearTimeout = (id) => {
  record("timeout-cleared", { id, stack: new Error("clearTimeout").stack || "" });
  return nativeClearTimeout(id);
};

window.setInterval = (callback, delay = 0, ...args) => {
  let id = 0;
  const stack = new Error(`setInterval(${delay})`).stack || "";
  const wrapped = (...callbackArgs) => {
    record("interval-fired", { id, delay });
    return callback(...callbackArgs);
  };
  id = nativeSetInterval(wrapped, delay, ...args);
  record("interval-scheduled", { id, delay, stack });
  return id;
};

window.clearInterval = (id) => {
  record("interval-cleared", { id, stack: new Error("clearInterval").stack || "" });
  return nativeClearInterval(id);
};

const params = new URLSearchParams(window.location.search);
if (params.get("ai") === "1") {
  document.body.classList.add("clara-ai-environment-active");
  document.documentElement.classList.add("clara-ai-environment-active");
}

async function resetLocalFinance() {
  window.localStorage.clear();
  await new Promise((resolve) => {
    const request = window.indexedDB.deleteDatabase("clara_local_finance");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

await resetLocalFinance();

// The production ORB bootstrap imports the PWA freshness runtime. In this isolated
// real-component harness, suppress only the document-refresh side effect so the
// browser can remain on the diagnostic URL. This does not change Add Income code.
window.__claraPwaFreshnessRuntime__ = true;
await import("../../src/runtime/installClaraOrbGreeting.js");
const { default: ClaraFinancialContextSetupCoordinator } = await import(
  "../../src/components/fresh/main-dashboard/assistant/ClaraFinancialContextSetupCoordinator.jsx"
);

const user = {
  id: "diagnostic-add-income-user",
  email: "diagnostic-add-income@example.test",
  firstName: "Max",
  name: "Max Diagnostic",
};

const incomeSetupState = {
  version: 1,
  status: "in_progress",
  currentStep: "income_hub",
  outcomes: {
    incomeHub: null,
    wallet: null,
    moneySchedule: null,
    obligations: null,
  },
  completedAt: null,
  migration: { reason: null },
};

function snapshot(reason) {
  const root = document.querySelector('[data-clara-add-income-chat="true"]');
  const viewport = root?.querySelector('[data-clara-ai-message-viewport="true"]');
  const stack = root?.querySelector('[data-clara-ai-message-stack="true"]');
  const opening = root?.querySelector('[data-clara-income-opening="true"]');
  const assistantRows = root?.querySelectorAll('[data-clara-conversation-role="assistant"]')?.length || 0;
  const rootRect = root?.getBoundingClientRect();
  const viewportRect = viewport?.getBoundingClientRect();
  const stackRect = stack?.getBoundingClientRect();
  const pickStyle = (element) => {
    if (!element) return null;
    const style = getComputedStyle(element);
    return {
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      height: style.height,
      minHeight: style.minHeight,
      position: style.position,
      zIndex: style.zIndex,
      overflow: style.overflow,
      transform: style.transform,
      pointerEvents: style.pointerEvents,
    };
  };

  record("dom-snapshot", {
    reason,
    rootPresent: Boolean(root),
    viewportPresent: Boolean(viewport),
    stackPresent: Boolean(stack),
    stackChildren: stack?.children.length || 0,
    openingPresent: Boolean(opening),
    assistantRows,
    rootRect: rootRect ? { x: rootRect.x, y: rootRect.y, width: rootRect.width, height: rootRect.height } : null,
    viewportRect: viewportRect ? { x: viewportRect.x, y: viewportRect.y, width: viewportRect.width, height: viewportRect.height } : null,
    stackRect: stackRect ? { x: stackRect.x, y: stackRect.y, width: stackRect.width, height: stackRect.height } : null,
    viewportStyle: pickStyle(viewport),
    stackStyle: pickStyle(stack),
  });
}

let previousSignature = "";
const observer = new MutationObserver(() => {
  const root = document.querySelector('[data-clara-add-income-chat="true"]');
  const stack = root?.querySelector('[data-clara-ai-message-stack="true"]');
  const signature = JSON.stringify({
    root: Boolean(root),
    children: stack?.children.length || 0,
    opening: Boolean(root?.querySelector('[data-clara-income-opening="true"]')),
    assistants: root?.querySelectorAll('[data-clara-conversation-role="assistant"]')?.length || 0,
    paused: Boolean(document.querySelector('[data-clara-financial-context-setup="true"] button')?.textContent?.includes("Resume setup")),
  });
  if (signature !== previousSignature) {
    previousSignature = signature;
    snapshot("mutation");
  }
});
observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true });

function Harness() {
  const [state, setState] = useState(incomeSetupState);
  return (
    <div
      className="clara-community-root fixed inset-0 flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#06111f] text-white"
      data-community-view="orb"
      data-clara-financial-context-gated="true"
    >
      <ClaraFinancialContextSetupCoordinator
        user={user}
        initialState={state}
        onStateChange={setState}
        onComplete={() => record("setup-complete")}
      />
    </div>
  );
}

const tree = params.get("strict") === "1" ? (
  <StrictMode><Harness /></StrictMode>
) : (
  <Harness />
);

createRoot(document.getElementById("root")).render(tree);
nativeSetTimeout(() => snapshot("post-render-50ms"), 50);
nativeSetTimeout(() => snapshot("post-render-1000ms"), 1000);
nativeSetTimeout(() => snapshot("post-render-5000ms"), 5000);