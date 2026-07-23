import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

function requireToken(token = getStoredBackendToken()) {
  if (!token) {
    const error = new Error("Please sign in to schedule your CLARA session.");
    error.status = 401;
    throw error;
  }
  return token;
}

export function fetchCoachingAvailability({ from, to, sessionType, token } = {}) {
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  query.set("session_type", sessionType);
  return backendRequest(`/api/coaching/availability?${query.toString()}`, {
    token: requireToken(token),
  });
}

export function createCoachingAppointment({ slotId, sessionType, answers, token }) {
  return backendRequest("/api/coaching/appointments", {
    method: "POST",
    token: requireToken(token),
    body: {
      slot_id: slotId,
      session_type: sessionType,
      answers,
    },
  });
}

export async function fetchMyCoachingAppointments(token) {
  const payload = await backendRequest("/api/coaching/appointments/me", {
    token: requireToken(token),
  });
  return Array.isArray(payload?.appointments) ? payload.appointments : [];
}

export function cancelCoachingAppointment(appointmentId, token) {
  return backendRequest(`/api/coaching/appointments/${appointmentId}/cancel`, {
    method: "POST",
    token: requireToken(token),
  });
}

export function requestCoachingReschedule(appointmentId, token) {
  return backendRequest(`/api/coaching/appointments/${appointmentId}/request-reschedule`, {
    method: "POST",
    token: requireToken(token),
  });
}
