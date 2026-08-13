import { normalizeUser } from "@/lib/clara-backend-client";
import { updateCanonicalClaraDisplayName } from "@/lib/canonical-clara-profile";

export async function updateCurrentBackendProfile({ name } = {}) {
  const cleanName = String(name || "").trim();
  if (!cleanName) throw new Error("Name is required.");

  const profile = await updateCanonicalClaraDisplayName(cleanName);
  const canonicalName = String(profile?.display_name || profile?.full_name || cleanName).trim();
  const user = normalizeUser({
    ...profile,
    name: canonicalName,
    full_name: canonicalName,
    display_name: canonicalName,
  });

  if (!user) {
    const error = new Error("CLARA returned an incomplete profile update.");
    error.code = "INVALID_USER_PROFILE";
    throw error;
  }

  return user;
}
