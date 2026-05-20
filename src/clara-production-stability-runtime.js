import {
  getRealtimeGuardState,
  shouldSuppressRealtimeConsole,
  suspendRealtime,
} from "./lib/claraRealtimeGuard";

const RUNTIME_KEY = "__CLARA_PRODUCTION_STABILITY_RUNTIME__";

function installConsoleNoiseGuard() {
  if (typeof window === "undefined" || window.__CLARA_CONSOLE_NOISE_GUARD__) return;
  window.__CLARA_CONSOLE_NOISE_GUARD__ = true;

  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);
  const lastPrinted = new Map();

  const shouldSuppress = (args) => {
    if (shouldSuppressRealtimeConsole(args)) return true;

    const text = args.map((item) => String(item?.message || item || "")).join(" ").toLowerCase();
    const repetitive =
      text.includes("supabase is not configured") ||
      text.includes("profile save skipped") ||
      text.includes("realtime") ||
      text.includes("websocket") ||
      text.includes("channel_error") ||
      text.includes("timed_out") ||
      text.includes("forced reflow") ||
      text.includes("requestanimationframe");

    if (!repetitive) return false;

    const key = text.slice(0, 180);
    const now = Date.now();
    const last = Number(lastPrinted.get(key) || 0);
    if (last && now - last < 60_000) return true;
    lastPrinted.set(key, now);
    return false;
  };

  console.warn = (...args) => {
    if (shouldSuppress(args)) return;
    originalWarn(...args);
  };

  console.error = (...args) => {
    if (shouldSuppress(args)) return;
    originalError(...args);
  };
}

function installNetworkStabilityHooks() {
  if (typeof window === "undefined") return;

  window.addEventListener("offline", () => {
    suspendRealtime("Browser offline; CLARA is using local-first mode.", 15 * 60_000);
  });

  window.addEventListener("online", () => {
    const state = getRealtimeGuardState();
    if (state.suspended) return;
    window.dispatchEvent(new CustomEvent("clara:realtime-status-changed", { detail: state }));
  });
}

function installProductionStabilityRuntime() {
  if (typeof window === "undefined") return;
  if (window[RUNTIME_KEY]) return;
  window[RUNTIME_KEY] = true;

  installConsoleNoiseGuard();
  installNetworkStabilityHooks();
}

try {
  installProductionStabilityRuntime();
} catch (error) {
  console.warn("CLARA production stability runtime failed:", error);
}
