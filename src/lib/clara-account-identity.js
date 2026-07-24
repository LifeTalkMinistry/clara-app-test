const text = (value) => String(value ?? "").trim();

export function getBackendAccountId(user = {}) {
  const explicit =
    text(user?.account_id) ||
    text(user?.server_user_id) ||
    text(user?.user_metadata?.account_id);
  if (explicit) return explicit;

  // Raw backend user objects can expose the server id directly. AuthContext users
  // always carry local_vault_id, so never reinterpret that device-local id as
  // backend account ownership.
  if (!text(user?.local_vault_id) && !user?.is_local_user) {
    return text(user?.id);
  }

  return "";
}
