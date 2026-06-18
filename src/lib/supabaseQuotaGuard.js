const SUPABASE_QUOTA_BLOCKED_KEY = "clara_supabase_quota_blocked";

const QUOTA_NOTICE =
  "CLARA cannot reach account services right now because the Supabase project is temporarily restricted.";

function stringifyError(error) {
  if (!error) return "";

  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error?.message || error?.error_description || error?.details || error);
  }
}

export function isSupabaseQuotaError(error) {
  const status = Number(
    error?.status ||
      error?.statusCode ||
      error?.status_code ||
      error?.code ||
      error?.context?.status ||
      error?.response?.status ||
      0
  );

  const text = stringifyError(error).toLowerCase();

  return (
    status === 402 ||
    text.includes("exceed_egress_quota") ||
    text.includes("egress_quota") ||
    text.includes("quota") ||
    text.includes("restricted") ||
    text.includes("project is restricted") ||
    text.includes("temporarily restricted")
  );
}

export function markSupabaseQuotaBlocked(error) {
  if (typeof window === "undefined") return false;
  if (!isSupabaseQuotaError(error)) return false;

  try {
    window.sessionStorage.setItem(SUPABASE_QUOTA_BLOCKED_KEY, "1");
  } catch {
    // Session storage can be blocked in private/embedded browsers. The caller still gets true.
  }

  return true;
}

export function isSupabaseQuotaBlocked() {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(SUPABASE_QUOTA_BLOCKED_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearSupabaseQuotaBlocked() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(SUPABASE_QUOTA_BLOCKED_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function getSupabaseQuotaNotice() {
  return QUOTA_NOTICE;
}
