export const ACCOUNT_VAULT_DIRECTORY_KEY = "clara_account_vault_directory_v1";
export const ACCOUNT_VAULT_DIRECTORY_VERSION = 1;

const normalizeId = (value) => String(value ?? "").trim();
const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();
const nowIso = () => new Date().toISOString();

function directoryError(message, code = "ACCOUNT_VAULT_DIRECTORY_CORRUPT") {
  const error = new Error(message);
  error.code = code;
  return error;
}

function defaultStorage() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

function emptyDirectory() {
  return { version: ACCOUNT_VAULT_DIRECTORY_VERSION, accounts: {} };
}

function normalizeEntry(accountKey, entry = {}) {
  const accountId = normalizeId(entry.accountId || accountKey);
  const vaultId = normalizeId(entry.vaultId);
  if (!accountId || accountId !== normalizeId(accountKey) || !vaultId) {
    throw directoryError("The local account-vault directory contains an invalid mapping.");
  }

  return {
    vaultId,
    accountId,
    accountEmail: normalizeEmail(entry.accountEmail) || null,
    createdAt: normalizeId(entry.createdAt) || nowIso(),
    lastUsedAt: normalizeId(entry.lastUsedAt) || nowIso(),
  };
}

function validateDirectory(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyDirectory();
  if (Number(value.version || ACCOUNT_VAULT_DIRECTORY_VERSION) !== ACCOUNT_VAULT_DIRECTORY_VERSION) {
    throw directoryError("The local account-vault directory version is unsupported.");
  }

  const rawAccounts = value.accounts;
  if (!rawAccounts || typeof rawAccounts !== "object" || Array.isArray(rawAccounts)) {
    throw directoryError("The local account-vault directory is malformed.");
  }

  const accounts = {};
  const vaultOwners = new Map();
  for (const [accountKey, rawEntry] of Object.entries(rawAccounts)) {
    const entry = normalizeEntry(accountKey, rawEntry);
    const existingOwner = vaultOwners.get(entry.vaultId);
    if (existingOwner && existingOwner !== entry.accountId) {
      throw directoryError("One local vault is mapped to multiple CLARA accounts.");
    }
    vaultOwners.set(entry.vaultId, entry.accountId);
    accounts[entry.accountId] = entry;
  }

  return { version: ACCOUNT_VAULT_DIRECTORY_VERSION, accounts };
}

export function getAccountVaultDirectory(storage = defaultStorage()) {
  if (!storage) return emptyDirectory();
  const raw = storage.getItem(ACCOUNT_VAULT_DIRECTORY_KEY);
  if (!raw) return emptyDirectory();
  try {
    return validateDirectory(JSON.parse(raw));
  } catch (error) {
    if (error?.code) throw error;
    throw directoryError("The local account-vault directory could not be read safely.");
  }
}

function writeDirectory(directory, storage = defaultStorage()) {
  const validated = validateDirectory(directory);
  storage?.setItem(ACCOUNT_VAULT_DIRECTORY_KEY, JSON.stringify(validated));
  return validated;
}

export function getVaultMappingForAccount(accountId, storage = defaultStorage()) {
  const id = normalizeId(accountId);
  if (!id) return null;
  return getAccountVaultDirectory(storage).accounts[id] || null;
}

export function listAccountVaultMappings(storage = defaultStorage()) {
  return Object.values(getAccountVaultDirectory(storage).accounts);
}

export function findAccountMappingByVaultId(vaultId, storage = defaultStorage()) {
  const id = normalizeId(vaultId);
  if (!id) return null;
  return listAccountVaultMappings(storage).find((entry) => entry.vaultId === id) || null;
}

export function saveVaultMappingForAccount(
  { accountId, accountEmail, vaultId } = {},
  storage = defaultStorage()
) {
  const id = normalizeId(accountId);
  const localVaultId = normalizeId(vaultId);
  if (!id || !localVaultId) {
    throw directoryError(
      "A backend account ID and local vault ID are required.",
      "INVALID_ACCOUNT_VAULT_MAPPING"
    );
  }

  const directory = getAccountVaultDirectory(storage);
  const conflicting = Object.values(directory.accounts).find(
    (entry) => entry.vaultId === localVaultId && entry.accountId !== id
  );
  if (conflicting) {
    throw directoryError("This local vault is already assigned to another CLARA account.");
  }

  const existing = directory.accounts[id];
  if (existing?.vaultId && existing.vaultId !== localVaultId) {
    throw directoryError("This CLARA account already has a different local vault mapping.");
  }

  const timestamp = nowIso();
  directory.accounts[id] = {
    vaultId: localVaultId,
    accountId: id,
    accountEmail: normalizeEmail(accountEmail) || existing?.accountEmail || null,
    createdAt: existing?.createdAt || timestamp,
    lastUsedAt: timestamp,
  };
  writeDirectory(directory, storage);
  return directory.accounts[id];
}

export function removeVaultMappingForAccount(accountId, storage = defaultStorage()) {
  const id = normalizeId(accountId);
  if (!id) return false;
  const directory = getAccountVaultDirectory(storage);
  if (!directory.accounts[id]) return false;
  delete directory.accounts[id];
  writeDirectory(directory, storage);
  return true;
}
