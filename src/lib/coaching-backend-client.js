import {
  getClaraBackendUrl,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

const VERCEL_COACHING_PROXY_PATH = "/clara-api";
const COACHING_REQUEST_TIMEOUT_MS = 10_000;

function isVercelWebRuntime() {
  if (typeof window === "undefined") return false;
  const hostname = String(window.location?.hostname || "").trim().toLowerCase();
  return hostname === "clara-app-test.vercel.app" || hostname.endsWith(".vercel.app");
}

function getCoachingApiBase() {
  // The production PWA must stay same-origin. This avoids browser CORS and
  // routes requests through the Vercel rewrite that already reaches CLARA.
  return isVercelWebRuntime()
    ? VERCEL_COACHING_PROXY_PATH
    : getClaraBackendUrl();
}

function requireToken(token = getStoredBackendToken()) {
  if (!token) {
    const error = new Error("Please sign in to schedule your CLARA session.");
    error.status = 401;
    throw error;
  }
  return token;
}

async function coachingRequest(
  path,
  { method = "GET", body, token = getStoredBackendToken() } = {}
) {
  const authorizedToken = requireToken(token);
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timeoutId = setTimeout(() => controller?.abort(), COACHING_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getCoachingApiBase()}${path}`, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${authorizedToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      ...(controller ? { signal: controller.signal } : {}),
    });

    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      const error = new Error("CLARA received an invalid response from the account server.");
      error.status = response.status;
      error.code = "INVALID_BACKEND_RESPONSE";
      throw error;
    }

    if (!response.ok) {
      const error = new Error(
        payload?.message || `CLARA request failed with status ${response.status}.`
      );
      error.status = response.status;
      error.code = payload?.code || `HTTP_${response.status}`;
      throw error;
    }

    return payload;
  } catch (cause) {
    if (cause?.status || cause?.code === "INVALID_BACKEND_RESPONSE") throw cause;

    const error = new Error("CLARA could not reach the account server.");
    error.code = cause?.name === "AbortError" ? "REQUEST_TIMEOUT" : "NETWORK_ERROR";
    error.cause = cause;
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function fetchCoachingAvailability({ from, to, sessionType, token } = {}) {
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  query.set("session_type", sessionType);
  return coachingRequest(`/api/coaching/availability?${query.toString()}`, {
    token,
  });
}

export function createCoachingAppointment({ slotId, sessionType, answers, token }) {
  return coachingRequest("/api/coaching/appointments", {
    method: "POST",
    token,
    body: {
      slot_id: slotId,
      session_type: sessionType,
      answers,
    },
  });
}

export async function fetchMyCoachingAppointments(token) {
  const payload = await coachingRequest("/api/coaching/appointments/me", {
    token,
  });
  return Array.isArray(payload?.appointments) ? payload.appointments : [];
}

export function updateCoachingAppointmentAnswers({ appointmentId, answers, token }) {
  return coachingRequest(`/api/coaching/appointments/${appointmentId}`, {
    method: "PATCH",
    token,
    body: { answers },
  });
}

export function cancelCoachingAppointment(appointmentId, token) {
  return coachingRequest(`/api/coaching/appointments/${appointmentId}/cancel`, {
    method: "POST",
    token,
  });
}

export function requestCoachingReschedule(appointmentId, token) {
  return coachingRequest(
    `/api/coaching/appointments/${appointmentId}/request-reschedule`,
    {
      method: "POST",
      token,
    }
  );
}

export {
  COACHING_REQUEST_TIMEOUT_MS,
  VERCEL_COACHING_PROXY_PATH,
  getCoachingApiBase,
};
