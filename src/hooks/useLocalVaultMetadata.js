import { useCallback, useEffect, useState } from "react";
import { ensureActiveLocalVaultId } from "../lib/localVaultIdentity.js";
import { getActiveVaultMetadata } from "../lib/localVaultMetadata.js";

export default function useLocalVaultMetadata() {
  const [vaultId] = useState(() => ensureActiveLocalVaultId());
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const nextMetadata = await getActiveVaultMetadata(vaultId);
      setMetadata(nextMetadata);
      return nextMetadata;
    } catch (error) {
      console.warn("[CLARA Vault] Unable to read local vault metadata.", {
        vaultId,
        code: error?.name || "VAULT_METADATA_READ_FAILED",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [vaultId]);

  useEffect(() => {
    refresh();
    if (typeof window === "undefined") return undefined;

    const handleUpdate = () => refresh();
    window.addEventListener("clara:local-vault-link-updated", handleUpdate);
    window.addEventListener("clara:active-local-vault-updated", handleUpdate);

    return () => {
      window.removeEventListener("clara:local-vault-link-updated", handleUpdate);
      window.removeEventListener("clara:active-local-vault-updated", handleUpdate);
    };
  }, [refresh]);

  return { vaultId, metadata, loading, refresh };
}
