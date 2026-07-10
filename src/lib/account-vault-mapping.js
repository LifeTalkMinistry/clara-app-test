import { linkLocalVaultToAccount } from "@/lib/accountLinking/linkLocalVaultToAccount";
import {
  ensureActiveLocalVaultId,
  getActiveLocalVaultId,
  setActiveLocalVaultId,
} from "@/lib/localVaultIdentity";
import { getActiveVaultMetadata } from "@/lib/localVaultMetadata";

const ACCOUNT_VAULT_MAP_KEY = "clara_account_vault_map_v1";
const ACTIVE_ACCOUNT_KEY = "clara_active_account_id_v1";

function storage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function clean(value) {
  return String(value || "").trim();
}

function readMap() {
  try {
    const parsed = JSON.parse(storage()?.getItem(ACCOUNT_VAULT_MAP_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  storage()?.setItem(ACCOUNT_VAULT_MAP_KEY, JSON.stringify(map));
}

function createLocalVaultId() {
  const value = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `clara_local_${value}`;
}

async function verifyAndActivateVault({ vaultId, accountId, email }) {
  const previousVaultId = getActiveLocalVaultId();
  setActiveLocalVaultId(vaultId);
  try {
    await linkLocalVaultToAccount({
      expectedVaultId: vaultId,
      accountUserId: accountId,
      accountEmail: email,
    });
    return vaultId;
  } catch (error) {
    if (previousVaultId && previousVaultId !== vaultId) {
      setActiveLocalVaultId(previousVaultId);
    }
    throw error;
  }
}

export function getMappedLocalVaultId(accountId) {
  return clean(readMap()[clean(accountId)]) || null;
}

export function getActiveAccountId() {
  return clean(storage()?.getItem(ACTIVE_ACCOUNT_KEY)) || null;
}

export function clearActiveAccountMarker() {
  storage()?.removeItem(ACTIVE_ACCOUNT_KEY);
}

export async function resolveLocalVaultForAccount({ accountId, email }) {
  const normalizedAccountId = clean(accountId);
  if (!normalizedAccountId) throw new Error("A CLARA account ID is required to resolve local data.");

  const map = readMap();
  const mappedVaultId = clean(map[normalizedAccountId]);
  let vaultId = mappedVaultId;

  if (vaultId) {
    await verifyAndActivateVault({
      vaultId,
      accountId: normalizedAccountId,
      email,
    });
  } else {
    const currentVaultId = getActiveLocalVaultId() || ensureActiveLocalVaultId();
    const metadata = await getActiveVaultMetadata(currentVaultId);
    const linkedAccountId = clean(metadata?.accountUserId);

    if (metadata?.linkStatus === "linked" && linkedAccountId && linkedAccountId !== normalizedAccountId) {
      vaultId = createLocalVaultId();
    } else {
      vaultId = currentVaultId;
    }

    await verifyAndActivateVault({
      vaultId,
      accountId: normalizedAccountId,
      email,
    });

    map[normalizedAccountId] = vaultId;
    writeMap(map);
  }

  storage()?.setItem(ACTIVE_ACCOUNT_KEY, normalizedAccountId);
  if (typeof window !== "undefined") {
    window.dispatchEvent?.(
      new CustomEvent("clara:account-vault-resolved", {
        detail: { accountId: normalizedAccountId, vaultId },
      })
    );
  }

  return vaultId;
}

export { ACCOUNT_VAULT_MAP_KEY, ACTIVE_ACCOUNT_KEY };
