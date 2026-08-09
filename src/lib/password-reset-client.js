import { backendRequest } from "@/lib/clara-backend-client";

export async function completeClaraTemporaryPasswordReset({
  email,
  temporaryPassword,
  newPassword,
}) {
  return backendRequest("/api/password/complete-reset", {
    method: "POST",
    body: {
      email: String(email || "").trim(),
      temporaryPassword: String(temporaryPassword || ""),
      newPassword: String(newPassword || ""),
    },
  });
}
