export const CLARA_REALTIME_GUARD_KEY = "clara_realtime_degradation_guard_v1";
export const CLARA_REALTIME_STATUS_EVENT = "clara:realtime-status-changed";

const FAILURE_WINDOW_MS = 90_000;
const FAILURE_THRESHOLD = 2;
const DEFAULT_SUSPEND_MS = 10 * 60_000;
const MAX_HISTORY = 12;

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function readGuard() {
  if (typeof window === "undefined") {
    return {
      failureCount: 0,
      disabledUntil: 0,
      mode: "online",
      events: [],
    };
  }

  return safeJsonParse(window.localStorage.getItem(CLARA_REALTIME_GUARD_KEY), {
    failureCount: 0,
    disabledUntil: 0,
    mode: "online",
    events: [],
  }) || { failureCount: 0, disabledUntil: 0, mode: "online", events: [] };
}

function writeGuard(next) {
  if (typeof window === "undefined") return next;
  window.localStorage.setItem(CLARA_REALTIME_GUARD_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(CLARA_REALTIME_STATUS_EVENT, { detail: getRealtimeGuardState() }));
  return next;
}

function cleanText(value, max = 220) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function isFailureStatus(status) {
  const value = String(status || "").toUpperCase();
  return ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED", "SOCKET_ERROR", "ERROR"].some((token) => value.includes(token));
}

function isSuccessStatus(status) {
  const value = String(status || "").toUpperCase();
  return value.includes("SUBSCRIBED") || value.includes("CONNECTED") || value.includes("OK");
}

function pushEvent(guard, event) {
  return [event, ...(guard.events || [])].slice(0, MAX_HISTORY);
}

export function getRealtimeGuardState() {
  const guard = readGuard();
  const disabledUntil = Number(guard.disabledUntil || 0);
  const suspended = Date.now() < disabledUntil;
  return {
    ...guard,
    suspended,
    disabledForMs: Math.max(0, disabledUntil - Date.now()),
    localFirst: suspended || guard.mode === "local_first_realtime_suspended",
  };
}

export function isRealtimeSuspended() {
  return getRealtimeGuardState().suspended;
}

export function suspendRealtime(reason = "Realtime temporarily unavailable", durationMs = DEFAULT_SUSPEND_MS) {
  const guard = readGuard();
  const next = {
    ...guard,
    mode: "local_first_realtime_suspended",
    disabledUntil: Date.now() + durationMs,
    lastFailureAt: nowIso(),
    lastFailureReason: cleanText(reason),
    failureCount: Number(guard.failureCount || 0),
    events: pushEvent(guard, {
      type: "suspended",
      reason: cleanText(reason),
      at: nowIso(),
    }),
  };
  return writeGuard(next);
}

export function recordRealtimeStatus(status, meta = {}) {
  const guard = readGuard();
  const value = cleanText(status || "unknown", 80);
  const now = Date.now();

  if (isSuccessStatus(value)) {
    const next = {
      ...guard,
      mode: "online",
      failureCount: 0,
      disabledUntil: 0,
      lastSuccessAt: nowIso(),
      events: pushEvent(guard, {
        type: "success",
        status: value,
        channel: cleanText(meta.channel, 120),
        at: nowIso(),
      }),
    };
    return writeGuard(next);
  }

  if (!isFailureStatus(value)) return guard;

  const lastFailureMs = Number(guard.lastFailureMs || 0);
  const withinWindow = lastFailureMs && now - lastFailureMs <= FAILURE_WINDOW_MS;
  const failureCount = withinWindow ? Number(guard.failureCount || 0) + 1 : 1;
  const reason = `${cleanText(meta.channel || "Realtime channel", 120)} ${value}`;

  const next = {
    ...guard,
    failureCount,
    lastFailureMs: now,
    lastFailureAt: nowIso(),
    lastFailureReason: reason,
    events: pushEvent(guard, {
      type: "failure",
      status: value,
      channel: cleanText(meta.channel, 120),
      at: nowIso(),
    }),
  };

  if (failureCount >= FAILURE_THRESHOLD) {
    next.mode = "local_first_realtime_suspended";
    next.disabledUntil = now + DEFAULT_SUSPEND_MS;
    next.events = pushEvent(next, {
      type: "suspended",
      reason,
      at: nowIso(),
    });
  }

  return writeGuard(next);
}

export function createNoopRealtimeChannel(channelName = "realtime-disabled") {
  const channel = {
    topic: channelName,
    state: "closed",
    __claraNoopRealtime: true,
    on: () => channel,
    subscribe: (callback) => {
      if (typeof callback === "function") {
        window.setTimeout?.(() => callback("CLOSED"), 0);
      }
      return channel;
    },
    unsubscribe: async () => ({ error: null }),
    send: async () => ({ error: null }),
    track: async () => ({ error: null }),
    untrack: async () => ({ error: null }),
  };

  return channel;
}

export function wrapRealtimeChannel(channel, channelName = "realtime-channel") {
  if (!channel || channel.__claraRealtimeWrapped) return channel;

  return new Proxy(channel, {
    get(target, prop, receiver) {
      if (prop === "__claraRealtimeWrapped") return true;

      if (prop === "subscribe") {
        return (callback, ...args) => {
          if (isRealtimeSuspended()) {
            return createNoopRealtimeChannel(channelName).subscribe(callback);
          }

          const wrappedCallback = (status, error) => {
            recordRealtimeStatus(status, { channel: channelName, error: error?.message || error });
            if (typeof callback === "function") callback(status, error);
          };

          try {
            return target.subscribe(wrappedCallback, ...args);
          } catch (error) {
            recordRealtimeStatus("SOCKET_ERROR", { channel: channelName, error: error?.message || error });
            return createNoopRealtimeChannel(channelName).subscribe(callback);
          }
        };
      }

      if (prop === "on") {
        return (...args) => {
          if (isRealtimeSuspended()) return receiver;
          const result = target.on(...args);
          return result === target ? receiver : result;
        };
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export function shouldSuppressRealtimeConsole(args = []) {
  const text = args.map((item) => String(item?.message || item || "")).join(" ").toLowerCase();
  return (
    text.includes("websocket") ||
    text.includes("realtime") ||
    text.includes("channel_error") ||
    text.includes("timed_out") ||
    text.includes("quota") ||
    text.includes("egress")
  ) && isRealtimeSuspended();
}
