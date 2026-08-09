import { backendRequest } from "@/lib/clara-backend-client";

export async function requestClaraPasswordReset({ email }) {
  return backendRequest("/api/password/request-reset", {
    method: "POST",
    body: {
      email: String(email || "").trim(),
    },
  });
}

export async function completeClaraPasswordReset({ token, newPassword }) {
  return backendRequest("/api/password/reset", {
    method: "POST",
    body: {
      token: String(token || "").trim(),
      newPassword: String(newPassword || ""),
    },
  });
}
