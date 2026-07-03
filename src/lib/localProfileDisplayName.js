import { ensureActiveLocalVaultId } from "./localVaultIdentity.js";

const keyForVault = (vaultId) => `clara_local_profile_name_v1:${vaultId}`;

export function readLocalProfileDisplayName(vaultId = ensureActiveLocalVaultId()) {
  if (typeof window === "undefined") return "";
  try {
    return String(window.localStorage?.getItem(keyForVault(vaultId)) || "").trim();
  } catch {
    return "";
  }
}

export function saveLocalProfileDisplayName(name, vaultId = ensureActiveLocalVaultId()) {
  const cleanName = String(name || "").trim();
  if (!cleanName) throw new Error("Please enter a display name.");
  if (typeof window !== "undefined") {
    window.localStorage?.setItem(keyForVault(vaultId), cleanName);
    window.dispatchEvent(
      new CustomEvent("clara:local-profile-name-updated", {
        detail: { vaultId, displayName: cleanName },
      })
    );
  }
  return cleanName;
}
