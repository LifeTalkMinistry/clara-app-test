import { supabase, supabaseAnonKey, supabaseUrl } from "@/lib/supabaseClient";

const PATCH_FLAG = "__claraGooglePlayVerifyAuthRetryInstalled";
const RETRY_HEADER = "x-clara-auth-retry";
const VERIFY_PATH = "/functions/v1/verify-google-play-purchase";

function isVerifyGooglePlayPurchaseRequest(input) {
  const url = typeof input === "string" ? input : input?.url || "";
  return String(url || "").includes(VERIFY_PATH);
}

function hasAlreadyRetried(input, init) {
  const headers = new Headers(init?.headers || input?.headers || {});
  return headers.get(RETRY_HEADER) === "1";
}

async function getFreshSupabaseAccessToken() {
  try {
    const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshedData?.session?.access_token) {
      return refreshedData.session.access_token;
    }
  } catch (error) {
    console.warn("[CLARA Billing] Supabase session force refresh failed before verify retry", error);
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (!sessionError && sessionData?.session?.access_token) {
      return sessionData.session.access_token;
    }
  } catch (error) {
    console.warn("[CLARA Billing] Supabase session lookup failed before verify retry", error);
  }

  return "";
}

function createRetryRequest(input, init, accessToken) {
  const headers = new Headers(init?.headers || input?.headers || {});
  headers.set("content-type", headers.get("content-type") || "application/json");
  if (supabaseAnonKey) headers.set("apikey", supabaseAnonKey);
  headers.set("authorization", `Bearer ${accessToken}`);
  headers.set(RETRY_HEADER, "1");

  const retryInit = {
    ...(init || {}),
    headers,
  };

  if (input instanceof Request) {
    return [input.url, retryInit];
  }

  return [input, retryInit];
}

function installGooglePlayVerifyAuthRetry() {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;
  if (window[PATCH_FLAG]) return;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const response = await nativeFetch(input, init);

    if (
      response?.status !== 401 ||
      !isVerifyGooglePlayPurchaseRequest(input) ||
      hasAlreadyRetried(input, init)
    ) {
      return response;
    }

    const freshToken = await getFreshSupabaseAccessToken();
    if (!freshToken) return response;

    console.info("[CLARA Billing] verify-google-play-purchase returned 401; retrying once with refreshed Supabase session.", {
      endpoint: supabaseUrl ? `${supabaseUrl.replace(/\/+$/, "")}${VERIFY_PATH}` : VERIFY_PATH,
    });

    const [retryInput, retryInit] = createRetryRequest(input, init, freshToken);
    return nativeFetch(retryInput, retryInit);
  };

  window[PATCH_FLAG] = true;
}

installGooglePlayVerifyAuthRetry();
