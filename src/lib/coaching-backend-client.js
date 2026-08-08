import {
  getClaraBackendUrl,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

const COACHING_REQUEST_TIMEOUT_MS = 10_000;

function getCoachingApiBase() {
  return getClaraBackendUrl();
}

function requireToken(token = getStoredBackendToken()) {
  if (!token) {
    const error = new Error("Please sign in to schedule your CLARA session.");
    error.status = 401;
    throw error;
  }
  return token;
}

function normalizeAnswersForBackend(answers = {}) {
  const focus = Array.isArray(answers.focus)
    ? answers.focus.map((value) => String(value || "").trim()).filter(Boolean).join(",")
    : String(answers.focus || "").trim();
  return { ...answers, focus };
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
      answers: normalizeAnswersForBackend(answers),
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
    body: { answers: normalizeAnswersForBackend(answers) },
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
  getCoachingApiBase,
  normalizeAnswersForBackend,
};
