import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

function requireToken(token = getStoredBackendToken()) {
  if (!token) {
    const error = new Error("Your CLARA account session is not available. Log in again.");
    error.code = "ACCOUNT_SESSION_REQUIRED";
    throw error;
  }
  return token;
}

export function sendBackendSupportMessage({ topic, content, senderName, senderEmail, token } = {}) {
  return backendRequest("/api/support/messages", {
    method: "POST",
    token: requireToken(token),
    body: {
      topic: String(topic || "Other concern").trim() || "Other concern",
      content: String(content || "").trim(),
      senderName: String(senderName || "").trim(),
      senderEmail: String(senderEmail || "").trim(),
    },
  });
}
