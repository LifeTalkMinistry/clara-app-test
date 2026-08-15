import claraGeminiCoreHandler from "./clara-gemini-core.js";
import {
  CLARA_AI_CLEANUP_TIMEOUT_MS,
  CLARA_AI_SERVER_DEADLINE_MS,
  CLARA_AI_USAGE_TIMEOUT_MS,
  abortCode,
  createAbortReason,
  createLinkedAbortController,
} from "./clara-gemini-lifecycle.js";

// The core handler still owns the existing Ask Before You Spend safety contracts:
// - one approved Gemini model
// - prompt size enforcement
// - rate limiting
// - duplicate request protection
// - server-owned GEMINI_API_KEY

const DEFAULT_CLARA_BACKEND_API_URL = "https://api.clarapmc.com";
const DAILY_LIMIT_CODE = "CLARA_AI_DAILY_LIMIT_REACHED";

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Expose-Headers", "X-Clara-Request-Id");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Cache-Control", "no-store");
}

function canWriteResponse(res) {
  return Boolean(res) && res.writableEnded !== true && res.destroyed !== true;
}

function sendJson(res, statusCode, payload) {
  if (!canWriteResponse(res)) return false;
  setCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
  return true;
}

function getClaraBackendApiUrl() {
  return cleanText(process.env.CLARA_BACKEND_API_URL || DEFAULT_CLARA_BACKEND_API_URL).replace(/\/+$/, "");
}

function getBearerToken(req) {
  const authorization = cleanText(req.headers?.authorization || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return cleanText(match?.[1] || "");
}

function unavailableUsage() {
  return { available: false };
}

function normalizeUsage(payload = {}) {
  const source = payload?.usage || payload?.details?.usage || payload;
  if (!source || typeof source !== "object" || source.available !== true) return unavailableUsage();
  const limit = Math.max(0, Number(source.limit || 0));
  const used = Math.max(0, Number(source.used || 0));
  const remaining = Math.max(0, Number(source.remaining ?? limit - used));
  return {
    available: true,
    tier: cleanText(source.tier || "free").toLowerCase() || "free",
    limit,
    used,
    remaining,
    usageDate: cleanText(source.usageDate || source.usage_date || ""),
    timeZone: cleanText(source.timeZone || source.time_zone || "Asia/Manila") || "Asia/Manila",
  };
}

function usageFailure(code = "") {
  if (code === "CLARA_AI_CLIENT_CANCELLED" || code === "CLARA_AI_CANCELLED") {
    return {
      status: 499,
      code: "CLARA_AI_CANCELLED",
      message: "CLARA AI request was cancelled.",
    };
  }
  if (code === "CLARA_AI_SERVER_DEADLINE") {
    return {
      status: 504,
      code: "CLARA_AI_DEADLINE_EXCEEDED",
      message: "CLARA AI request reached its server deadline.",
    };
  }
  return null;
}

async function requestUsageBackend(
  req,
  path,
  {
    method = "GET",
    body,
    parentSignal,
    timeoutMs = CLARA_AI_USAGE_TIMEOUT_MS,
    timeoutCode = "CLARA_AI_USAGE_TIMEOUT",
  } = {},
) {
  const token = getBearerToken(req);
  if (!token) {
    return {
      ok: false,
      status: 401,
      payload: {
        code: "CLARA_AI_AUTH_REQUIRED",
        message: "Your CLARA session is required before Ask Before You Spend can use AI.",
      },
    };
  }

  const abort = createLinkedAbortController({
    parentSignal,
    timeoutMs,
    timeoutCode,
    timeoutMessage: "CLARA AI usage request timed out.",
  });

  try {
    const response = await fetch(`${getClaraBackendApiUrl()}${path}`, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: abort.signal,
    });
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, payload };
  } catch (error) {
    const code = error?.code || abortCode(abort.signal);
    const lifecycleFailure = usageFailure(code);
    if (lifecycleFailure) {
      return {
        ok: false,
        status: lifecycleFailure.status,
        payload: {
          code: lifecycleFailure.code,
          message: lifecycleFailure.message,
        },
      };
    }

    return {
      ok: false,
      status: 503,
      payload: {
        code: code === timeoutCode ? timeoutCode : "CLARA_AI_USAGE_UNAVAILABLE",
        message: "CLARA couldn't verify today's AI allowance right now.",
      },
    };
  } finally {
    abort.clear();
  }
}

function createRequestId() {
  const random = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  return `clara-ai-${Date.now()}-${random}`;
}

function createRequestTiming(requestId) {
  const requestStartedAt = Date.now();
  const marks = { requestStart: requestStartedAt };
  let finished = false;
  let authenticationMode = "unknown";

  const mark = (name) => {
    if (!marks[name]) marks[name] = Date.now();
    return marks[name];
  };

  const duration = (stage) => {
    const start = marks[`${stage}Start`];
    const end = marks[`${stage}End`];
    return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : null;
  };

  const offset = (name) => Number.isFinite(marks[name])
    ? Math.max(0, marks[name] - requestStartedAt)
    : null;

  return {
    start(stage) {
      mark(`${stage}Start`);
    },
    end(stage) {
      mark(`${stage}Start`);
      mark(`${stage}End`);
    },
    setAuthenticationMode(value) {
      authenticationMode = cleanText(value || "unknown") || "unknown";
    },
    finish({ status, model = "", httpStatus = 0 } = {}) {
      if (finished) return;
      finished = true;
      const completedAt = Date.now();
      console.info("[CLARA Gemini Timing]", {
        requestId,
        usageReservationMs: duration("usageReservation"),
        authenticationMs: duration("authentication"),
        geminiMs: duration("gemini"),
        parseMs: duration("structuredParse"),
        responseSendMs: duration("responseSend"),
        totalMs: Math.max(0, completedAt - requestStartedAt),
        status: cleanText(status || "UNKNOWN") || "UNKNOWN",
        httpStatus: Number(httpStatus || 0),
        model: cleanText(model),
        authenticationMode,
        requestStartOffsetMs: 0,
        usageReservationStartOffsetMs: offset("usageReservationStart"),
        usageReservationEndOffsetMs: offset("usageReservationEnd"),
        authStartOffsetMs: offset("authenticationStart"),
        authEndOffsetMs: offset("authenticationEnd"),
        geminiStartOffsetMs: offset("geminiStart"),
        geminiEndOffsetMs: offset("geminiEnd"),
        structuredParseStartOffsetMs: offset("structuredParseStart"),
        structuredParseEndOffsetMs: offset("structuredParseEnd"),
        responseSendOffsetMs: offset("responseSendStart"),
      });
    },
  };
}

function createServerLifecycle(req, res) {
  const controller = new AbortController();
  let clientCancelled = false;

  const abort = (reason) => {
    if (!controller.signal.aborted) controller.abort(reason);
  };

  const onClientAbort = () => {
    clientCancelled = true;
    abort(createAbortReason("CLARA_AI_CLIENT_CANCELLED", "CLARA AI client disconnected."));
  };

  const onResponseClose = () => {
    if (res.writableEnded === true || res.finished === true) return;
    onClientAbort();
  };

  req.once?.("aborted", onClientAbort);
  res.once?.("close", onResponseClose);

  const deadlineId = setTimeout(() => {
    abort(createAbortReason("CLARA_AI_SERVER_DEADLINE", "CLARA AI server deadline exceeded."));
  }, CLARA_AI_SERVER_DEADLINE_MS);

  return {
    signal: controller.signal,
    wasClientCancelled: () => clientCancelled,
    clear() {
      clearTimeout(deadlineId);
      req.removeListener?.("aborted", onClientAbort);
      res.removeListener?.("close", onResponseClose);
    },
  };
}

function createBufferedResponse() {
  const headers = new Map();
  let body = "";
  const response = {
    statusCode: 200,
    setHeader(name, value) {
      headers.set(String(name).toLowerCase(), { name: String(name), value });
    },
    getHeader(name) {
      return headers.get(String(name).toLowerCase())?.value;
    },
    removeHeader(name) {
      headers.delete(String(name).toLowerCase());
    },
    writeHead(statusCode, values = {}) {
      this.statusCode = statusCode;
      Object.entries(values || {}).forEach(([name, value]) => this.setHeader(name, value));
      return this;
    },
    write(chunk = "") {
      body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
      return true;
    },
    end(chunk = "") {
      if (chunk !== undefined && chunk !== null) this.write(chunk);
      return this;
    },
  };
  return {
    response,
    snapshot() {
      return {
        statusCode: response.statusCode || 200,
        headers: [...headers.values()],
        body,
      };
    },
  };
}

function copyBufferedHeaders(snapshot, res) {
  snapshot.headers.forEach(({ name, value }) => {
    if (String(name).toLowerCase() === "content-length") return;
    res.setHeader(name, value);
  });
}

function parseBufferedJson(body = "") {
  try {
    return JSON.parse(String(body || ""));
  } catch {
    return null;
  }
}

async function refundReservedUsage(req, requestId) {
  const result = await requestUsageBackend(req, "/api/ai/usage/refund", {
    method: "POST",
    body: { requestId },
    timeoutMs: CLARA_AI_CLEANUP_TIMEOUT_MS,
    timeoutCode: "CLARA_AI_USAGE_CLEANUP_TIMEOUT",
  });
  if (!result.ok) {
    console.warn("[CLARA Gemini] Usage refund did not complete.", {
      requestId,
      status: result.status,
      code: cleanText(result.payload?.code),
    });
    return null;
  }
  return normalizeUsage(result.payload);
}

async function resolveUncertainReservation(req, requestId) {
  await refundReservedUsage(req, requestId);
}

function handleUsageStatusPayload(result) {
  if (result.status === 404) {
    return { status: 200, payload: { ok: true, usage: unavailableUsage() } };
  }
  if (!result.ok) {
    return {
      status: result.status || 503,
      payload: {
        ok: false,
        code: result.payload?.code || "CLARA_AI_USAGE_UNAVAILABLE",
        error: result.payload?.message || "CLARA couldn't load today's AI allowance.",
      },
    };
  }
  return { status: 200, payload: { ok: true, usage: normalizeUsage(result.payload) } };
}

async function handleUsageStatus(req, res) {
  const result = await requestUsageBackend(req, "/api/ai/usage");
  const resolved = handleUsageStatusPayload(result);
  sendJson(res, resolved.status, resolved.payload);
}

function finishWithoutResponse(timing, { status, model = "", httpStatus = 0 } = {}) {
  timing.finish({ status, model, httpStatus });
}

function sendTimedJson(res, timing, statusCode, payload, status) {
  timing.start("responseSend");
  const sent = sendJson(res, statusCode, payload);
  timing.end("responseSend");
  timing.finish({
    status: status || (statusCode >= 200 && statusCode < 300 ? "SUCCESS" : "FAILED"),
    model: payload?.model,
    httpStatus: statusCode,
  });
  return sent;
}

function sendTimedSnapshot(res, timing, snapshot, payload, status) {
  timing.start("responseSend");
  let sent = false;
  try {
    if (canWriteResponse(res)) {
      copyBufferedHeaders(snapshot, res);
      setCorsHeaders(res);
      res.statusCode = snapshot.statusCode;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(payload));
      sent = true;
    }
  } catch {
    sent = false;
  }
  timing.end("responseSend");
  if (sent) {
    timing.finish({
      status,
      model: payload?.model,
      httpStatus: snapshot.statusCode,
    });
  }
  return sent;
}

async function handleGeminiWithDailyAllowance(req, res, { requestId, lifecycle, timing }) {
  timing.start("usageReservation");
  const reservation = await requestUsageBackend(req, "/api/ai/usage/consume", {
    method: "POST",
    body: { requestId },
    parentSignal: lifecycle.signal,
  });
  timing.end("usageReservation");

  if (reservation.status === 404) {
    // Safe rollout path: if the self-hosted usage migration is not active yet,
    // keep the existing authenticated Gemini path without inventing a second AI path.
    req.__claraAiRequestContext = {
      requestId,
      signal: lifecycle.signal,
      authenticationVerified: false,
      timing,
    };
    timing.setAuthenticationMode("users-me-fallback");
  } else if (!reservation.ok) {
    const code = reservation.payload?.code || "CLARA_AI_USAGE_UNAVAILABLE";
    const usage = normalizeUsage(reservation.payload);

    // A transport timeout/unavailable result is ambiguous: the backend may have
    // committed the idempotent reservation before the response was lost.
    if (reservation.status >= 500 || code === "CLARA_AI_CANCELLED" || code === "CLARA_AI_DEADLINE_EXCEEDED") {
      await resolveUncertainReservation(req, requestId);
    }

    const cancelled = code === "CLARA_AI_CANCELLED" || lifecycle.wasClientCancelled();
    if (cancelled && !canWriteResponse(res)) {
      finishWithoutResponse(timing, { status: "CANCELLED", httpStatus: 499 });
      return;
    }

    sendTimedJson(res, timing, reservation.status || 503, {
      ok: false,
      code,
      error: code === DAILY_LIMIT_CODE
        ? "You've used today's CLARA replies for your current plan. Your allowance resets tomorrow."
        : reservation.payload?.message || "CLARA couldn't verify today's AI allowance.",
      ...(usage.available ? { usage } : {}),
    }, cancelled ? "CANCELLED" : "FAILED");
    return;
  } else {
    // Successful usage reservation is already authenticated by the self-hosted
    // backend's requireAuth() middleware. This server-owned flag is never read
    // from the client and lets the core avoid a redundant /api/users/me lookup.
    req.__claraAiRequestContext = {
      requestId,
      signal: lifecycle.signal,
      authenticationVerified: true,
      timing,
    };
    timing.setAuthenticationMode("usage-reservation");
  }

  const hasReservation = reservation.status !== 404 && reservation.ok;
  const reservationUsage = normalizeUsage(reservation.payload);
  const buffered = createBufferedResponse();
  let snapshot;

  try {
    await claraGeminiCoreHandler(req, buffered.response);
    snapshot = buffered.snapshot();
  } catch (error) {
    if (hasReservation) await refundReservedUsage(req, requestId);
    const code = error?.code || abortCode(lifecycle.signal);
    const cancelled = code === "CLARA_AI_CLIENT_CANCELLED" || code === "CLARA_AI_CANCELLED";

    if (cancelled && !canWriteResponse(res)) {
      finishWithoutResponse(timing, { status: "CANCELLED", httpStatus: 499 });
      return;
    }

    sendTimedJson(res, timing, cancelled ? 499 : 502, {
      ok: false,
      code: cancelled ? "CLARA_AI_CANCELLED" : "CLARA_AI_UPSTREAM_FAILED",
      error: cancelled ? "CLARA AI request was cancelled." : "CLARA AI could not complete the request.",
    }, cancelled ? "CANCELLED" : "FAILED");
    return;
  }

  const payload = parseBufferedJson(snapshot.body);
  const succeeded = snapshot.statusCode >= 200 && snapshot.statusCode < 300 && payload?.ok !== false;
  const lifecycleCode = abortCode(lifecycle.signal);
  const lifecycleCancelled = lifecycle.signal.aborted;

  if (!succeeded || lifecycleCancelled) {
    const refundedUsage = hasReservation ? await refundReservedUsage(req, requestId) : null;
    const clientCancelled = lifecycleCode === "CLARA_AI_CLIENT_CANCELLED" || lifecycle.wasClientCancelled();
    const serverDeadline = lifecycleCode === "CLARA_AI_SERVER_DEADLINE";

    if (clientCancelled && !canWriteResponse(res)) {
      finishWithoutResponse(timing, {
        status: "CANCELLED",
        model: payload?.model,
        httpStatus: 499,
      });
      return;
    }

    if (lifecycleCancelled) {
      sendTimedJson(res, timing, serverDeadline ? 504 : 499, {
        ok: false,
        code: serverDeadline ? "CLARA_AI_DEADLINE_EXCEEDED" : "CLARA_AI_CANCELLED",
        error: serverDeadline
          ? "CLARA AI request reached its server deadline."
          : "CLARA AI request was cancelled.",
        ...(refundedUsage?.available ? { usage: refundedUsage } : {}),
      }, serverDeadline ? "FAILED" : "CANCELLED");
      return;
    }

    copyBufferedHeaders(snapshot, res);
    if (payload && typeof payload === "object") {
      sendTimedJson(res, timing, snapshot.statusCode, {
        ...payload,
        ...(refundedUsage?.available ? { usage: refundedUsage } : {}),
      }, "FAILED");
      return;
    }

    timing.start("responseSend");
    if (canWriteResponse(res)) {
      res.statusCode = snapshot.statusCode;
      res.end(snapshot.body);
    }
    timing.end("responseSend");
    timing.finish({ status: "FAILED", httpStatus: snapshot.statusCode });
    return;
  }

  if (!canWriteResponse(res)) {
    if (hasReservation) await refundReservedUsage(req, requestId);
    finishWithoutResponse(timing, {
      status: "CANCELLED",
      model: payload?.model,
      httpStatus: 499,
    });
    return;
  }

  if (payload && typeof payload === "object") {
    const sent = sendTimedSnapshot(res, timing, snapshot, {
      ...payload,
      ...(hasReservation ? { usage: reservationUsage } : {}),
    }, "SUCCESS");
    if (!sent) {
      if (hasReservation) await refundReservedUsage(req, requestId);
      finishWithoutResponse(timing, {
        status: "CANCELLED",
        model: payload?.model,
        httpStatus: 499,
      });
    }
    return;
  }

  timing.start("responseSend");
  let sent = false;
  try {
    if (canWriteResponse(res)) {
      copyBufferedHeaders(snapshot, res);
      res.statusCode = snapshot.statusCode;
      res.end(snapshot.body);
      sent = true;
    }
  } catch {
    sent = false;
  }
  timing.end("responseSend");
  if (sent) {
    timing.finish({ status: "SUCCESS", httpStatus: snapshot.statusCode });
  } else {
    if (hasReservation) await refundReservedUsage(req, requestId);
    finishWithoutResponse(timing, { status: "CANCELLED", httpStatus: 499 });
  }
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET") {
    await handleUsageStatus(req, res);
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED", error: "Method not allowed." });
    return;
  }

  const requestId = createRequestId();
  const timing = createRequestTiming(requestId);
  const lifecycle = createServerLifecycle(req, res);
  res.setHeader("X-Clara-Request-Id", requestId);

  try {
    await handleGeminiWithDailyAllowance(req, res, { requestId, lifecycle, timing });
  } catch (error) {
    const code = error?.code || abortCode(lifecycle.signal);
    const cancelled = code === "CLARA_AI_CLIENT_CANCELLED" || code === "CLARA_AI_CANCELLED";
    if (cancelled && !canWriteResponse(res)) {
      finishWithoutResponse(timing, { status: "CANCELLED", httpStatus: 499 });
      return;
    }
    sendTimedJson(res, timing, cancelled ? 499 : 500, {
      ok: false,
      code: cancelled ? "CLARA_AI_CANCELLED" : "CLARA_AI_REQUEST_FAILED",
      error: cancelled ? "CLARA AI request was cancelled." : "CLARA AI could not complete the request.",
    }, cancelled ? "CANCELLED" : "FAILED");
  } finally {
    lifecycle.clear();
    delete req.__claraAiRequestContext;
  }
}
