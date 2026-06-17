const PATCH_MARK = "__claraGooglePlayVerificationDiagnosticsPatch";
const VERIFY_FUNCTION_PATH = "/functions/v1/verify-google-play-purchase";

function safeJsonParse(value) {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function hasBearerToken(headers) {
  try {
    if (!headers) return false;
    if (headers instanceof Headers) return Boolean(headers.get("authorization") || headers.get("Authorization"));
    return Boolean(headers.authorization || headers.Authorization);
  } catch {
    return false;
  }
}

function readRequestBody(input, init = {}) {
  if (typeof init?.body === "string") return init.body;
  if (typeof input?.body === "string") return input.body;
  return "";
}

function getRequestHeaders(input, init = {}) {
  return init?.headers || input?.headers || null;
}

function getRequestUrl(input) {
  if (typeof input === "string") return input;
  return input?.url || "";
}

function getHostFromUrl(url) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function logVerificationRequest(input, init = {}) {
  const requestUrl = getRequestUrl(input);
  if (!requestUrl.includes(VERIFY_FUNCTION_PATH)) return false;

  const payload = safeJsonParse(readRequestBody(input, init)) || {};
  const headers = getRequestHeaders(input, init);

  console.info("[CLARA Billing] sending restored purchase to backend verification", {
    functionHost: getHostFromUrl(requestUrl),
    productId: payload.product_id || "",
    packageName: payload.package_name || "",
    hasPurchaseToken: Boolean(String(payload.purchase_token || "").trim()),
    hasOrderId: Boolean(String(payload.order_id || "").trim()),
    userIdExists: Boolean(String(payload.user_id || "").trim()),
    hasAuthorizationHeader: hasBearerToken(headers),
  });

  return true;
}

async function logVerificationResponse(response) {
  try {
    const cloned = response.clone();
    const responseText = await cloned.text();
    const data = safeJsonParse(responseText) || {};

    console.info("[CLARA Billing] backend verification response", {
      ok: response.ok,
      status: response.status,
      code: data.code || "",
      error: data.error || "",
      profileEntitlementConfirmed: data.profile_entitlement_confirmed === true,
      canonicalPlan: data.canonical_plan || data.plan_key || "",
      subscriptionStatus: data.subscription_status || data.status || "",
      hasPurchaseId: Boolean(data.purchase_id),
      hasEnrollmentId: Boolean(data.enrollment_id),
    });
  } catch (error) {
    console.warn("[CLARA Billing] backend verification response diagnostic failed", error);
  }
}

function installVerificationDiagnostics() {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;
  if (window[PATCH_MARK]) return;

  Object.defineProperty(window, PATCH_MARK, {
    value: true,
    enumerable: false,
    configurable: false,
  });

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function claraVerificationFetch(input, init = {}) {
    const shouldLog = logVerificationRequest(input, init);

    try {
      const response = await originalFetch(input, init);
      if (shouldLog) logVerificationResponse(response);
      return response;
    } catch (error) {
      if (shouldLog) {
        console.error("[CLARA Billing] backend verification network failure", {
          message: error?.message || String(error),
        });
      }
      throw error;
    }
  };

  console.info("[CLARA Billing] backend verification diagnostics installed");
}

installVerificationDiagnostics();
