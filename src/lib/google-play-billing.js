import { CLARA_PRODUCTS, getClaraProductByPlan } from "@/lib/clara-entitlements";

const PACKAGE_NAME = "com.clara.moneytracker";
const GOOGLE_PLAY_PLATFORM = "google_play";
const BILLING_INIT_TIMEOUT_MS = 15000;
const PURCHASE_TIMEOUT_MS = 120000;

const PRODUCT_IDS = {
  entry: CLARA_PRODUCTS.pro.productId,
  core: CLARA_PRODUCTS.program.productId,
  coaching: CLARA_PRODUCTS.coaching.productId,
};

const SUCCESS_STATUSES = new Set(["approved", "active"]);
const BILLING_PRODUCT_IDS = new Set(Object.values(PRODUCT_IDS));
const listeners = new Set();
const purchaseRequests = new Map();

let initPromise = null;
let listenersAttached = false;
let billingState = {
  phase: "idle",
  available: false,
  initialized: false,
  pluginDetected: false,
  canPurchase: false,
  message: "Google Play billing is not ready yet.",
  busyProductId: "",
  lastError: null,
  lastEvent: "",
  products: {},
};

function normalize(value) {
  return String(value ?? "").trim();
}

function normalizeLower(value) {
  return normalize(value).toLowerCase();
}

function createBillingError(message, code = "billing_error", details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function toSerializable(value, depth = 0) {
  if (value == null) return value;
  if (depth > 4) return "[depth-limit]";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toSerializable(item, depth + 1));
  }
  if (typeof value === "object") {
    const output = {};

    Object.keys(value).forEach((key) => {
      if (typeof value[key] !== "function") {
        output[key] = toSerializable(value[key], depth + 1);
      }
    });

    return output;
  }
  return String(value);
}

function debugLog(level, message, payload) {
  const prefix = "[CLARA Billing]";

  if (payload === undefined) {
    console[level]?.(prefix, message);
    return;
  }

  console[level]?.(prefix, message, payload);
}

function updateBillingState(patch) {
  billingState = {
    ...billingState,
    ...patch,
    products: patch?.products ? { ...billingState.products, ...patch.products } : billingState.products,
  };

  listeners.forEach((listener) => {
    try {
      listener(billingState);
    } catch (error) {
      console.error("[CLARA Billing] State listener error", error);
    }
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isNativeLikeRuntime() {
  if (typeof window === "undefined") return false;

  if (window.Capacitor?.isNativePlatform?.()) return true;
  return Boolean(window.cordova);
}

function getPurchaseRuntime() {
  if (typeof window === "undefined") return null;

  const runtime = window.CdvPurchase || null;
  const store = runtime?.store || window.store || null;

  if (!store) {
    return null;
  }

  return {
    runtime,
    store,
    Platform: runtime?.Platform || {},
    ProductType: runtime?.ProductType || {},
    LogLevel: runtime?.LogLevel || {},
    ErrorCode: runtime?.ErrorCode || {},
  };
}

function normalizeStoreProduct(product) {
  if (!product) return null;

  const pricing = product?.pricing || {};
  const firstOffer = Array.isArray(product?.offers) ? product.offers[0] : null;
  const offerPricing = firstOffer?.pricingPhases?.[0] || firstOffer?.pricing || {};

  return {
    id: normalize(product.id),
    title: normalize(product.title),
    description: normalize(product.description),
    state: normalizeLower(product.state),
    canPurchase: Boolean(product.canPurchase || firstOffer),
    loaded: true,
    pricing: {
      price: normalize(pricing.price || offerPricing.price),
      priceMicros: Number(
        pricing.priceMicros ||
          pricing.price_amount_micros ||
          offerPricing.priceMicros ||
          offerPricing.price_amount_micros ||
          0
      ),
      currency: normalize(pricing.currency || offerPricing.currency),
    },
    offers:
      Array.isArray(product?.offers) && product.offers.length > 0
        ? product.offers.map((offer) => ({
            id: normalize(offer.id),
            token: normalize(offer.token),
          }))
        : [],
  };
}

function updateProductSnapshot(product) {
  const normalized = normalizeStoreProduct(product);
  if (!normalized?.id) return;

  updateBillingState({
    products: {
      [normalized.id]: normalized,
    },
    lastEvent: `product:${normalized.id}`,
  });
}

function extractProductId(source) {
  return normalize(
    source?.productId ||
      source?.product?.id ||
      source?.products?.[0]?.id ||
      source?.purchases?.[0]?.id ||
      source?.id
  );
}

function extractPurchaseMeta(source) {
  const nativePurchase = source?.nativePurchase || source?.purchase || source?.raw || {};
  return {
    productId: extractProductId(source),
    transactionId: normalize(
      source?.transactionId ||
        source?.id ||
        source?.purchaseId ||
        nativePurchase?.orderId
    ),
    orderId: normalize(nativePurchase?.orderId || source?.orderId || source?.order_id),
    purchaseToken: normalize(
      nativePurchase?.purchaseToken ||
        nativePurchase?.token ||
        source?.purchaseToken ||
        source?.token ||
        source?.purchase_token
    ),
    raw: toSerializable(source),
  };
}

function resolvePurchase(productId, result) {
  const request = purchaseRequests.get(productId);
  if (!request || request.settled) return;

  request.settled = true;
  window.clearTimeout(request.timeoutId);
  purchaseRequests.delete(productId);
  updateBillingState({
    busyProductId: "",
    canPurchase: true,
    message: "Google Play billing is ready.",
    lastError: null,
  });
  request.resolve(result);
}

function rejectPurchase(productId, error) {
  const request = purchaseRequests.get(productId);
  if (!request || request.settled) return;

  request.settled = true;
  window.clearTimeout(request.timeoutId);
  purchaseRequests.delete(productId);
  updateBillingState({
    busyProductId: "",
    canPurchase: true,
    lastError: {
      code: error?.code || "purchase_failed",
      message: error?.message || "Google Play purchase failed.",
    },
    message: error?.message || "Google Play purchase failed.",
  });
  request.reject(error);
}

function isCancellationError(error, ErrorCode = {}) {
  const code = error?.code || error?.errorCode;
  const text = normalizeLower(error?.message || error?.msg || error?.toString?.());

  return (
    code === "PAYMENT_CANCELLED" ||
    code === ErrorCode?.PAYMENT_CANCELLED ||
    code === 6777006 ||
    text.includes("cancel") ||
    text.includes("dismissed") ||
    text.includes("user aborted")
  );
}

function isStoreError(value) {
  return Boolean(value && typeof value === "object" && ("isError" in value || "code" in value || "message" in value));
}

function getStoreProduct(productId) {
  const runtime = getPurchaseRuntime();
  if (!runtime?.store?.get) return null;

  try {
    return runtime.store.get(productId, runtime.Platform?.GOOGLE_PLAY || GOOGLE_PLAY_PLATFORM) || runtime.store.get(productId);
  } catch (error) {
    debugLog("warn", "Failed to read product from store", {
      productId,
      error: toSerializable(error),
    });
    return null;
  }
}

function getProductOffer(product) {
  if (!product) return null;

  if (typeof product.getOffer === "function") {
    const offer = product.getOffer();
    if (offer) return offer;
  }

  if (Array.isArray(product.offers) && product.offers.length > 0) {
    return product.offers[0];
  }

  return null;
}

async function finishEntity(entity) {
  if (!entity || typeof entity.finish !== "function") return;

  try {
    await entity.finish();
  } catch (error) {
    debugLog("warn", "Could not finish purchase entity", toSerializable(error));
  }
}

function attachStoreListeners(runtime) {
  if (listenersAttached || !runtime?.store?.when) {
    return;
  }

  listenersAttached = true;
  const { store } = runtime;

  store.error((error) => {
    const serialized = toSerializable(error);
    debugLog("error", "Store error", serialized);

    const productId = extractProductId(error);
    if (productId && purchaseRequests.has(productId)) {
      if (isCancellationError(error, runtime.ErrorCode)) {
        resolvePurchase(productId, {
          ok: false,
          cancelled: true,
          productId,
          raw: serialized,
        });
        return;
      }

      rejectPurchase(
        productId,
        createBillingError(
          error?.message || "Google Play reported a purchase error.",
          error?.code || "store_error",
          serialized
        )
      );
      return;
    }

    updateBillingState({
      lastError: {
        code: error?.code || "store_error",
        message: error?.message || "Google Play reported an error.",
      },
      message: error?.message || billingState.message,
      lastEvent: "store:error",
    });
  });

  store.when().productUpdated((product) => {
    updateProductSnapshot(product);
    debugLog("info", "Product updated", normalizeStoreProduct(product));
  });

  store.when().approved(async (transaction) => {
    const purchaseMeta = extractPurchaseMeta(transaction);
    debugLog("info", "Purchase approved", purchaseMeta);

    resolvePurchase(purchaseMeta.productId, {
      ok: true,
      cancelled: false,
      productId: purchaseMeta.productId,
      purchaseToken: purchaseMeta.purchaseToken,
      orderId: purchaseMeta.orderId,
      transactionId: purchaseMeta.transactionId,
      raw: purchaseMeta.raw,
    });

    await finishEntity(transaction);
    updateBillingState({ lastEvent: `approved:${purchaseMeta.productId}` });
  });

  store.when().verified(async (receipt) => {
    const purchaseMeta = extractPurchaseMeta(receipt);
    debugLog("info", "Purchase verified", purchaseMeta);

    if (purchaseMeta.productId && purchaseRequests.has(purchaseMeta.productId)) {
      resolvePurchase(purchaseMeta.productId, {
        ok: true,
        cancelled: false,
        productId: purchaseMeta.productId,
        purchaseToken: purchaseMeta.purchaseToken,
        orderId: purchaseMeta.orderId,
        transactionId: purchaseMeta.transactionId,
        raw: purchaseMeta.raw,
      });
    }

    await finishEntity(receipt);
    updateBillingState({ lastEvent: `verified:${purchaseMeta.productId}` });
  });

  store.when().unverified((receipt) => {
    const purchaseMeta = extractPurchaseMeta(receipt);
    debugLog("warn", "Purchase unverified", purchaseMeta);
    updateBillingState({
      lastEvent: `unverified:${purchaseMeta.productId}`,
      lastError: {
        code: "receipt_unverified",
        message: "Google Play returned a purchase that could not be verified locally.",
      },
    });
  });
}

async function waitForPurchasePlugin(timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const runtime = getPurchaseRuntime();
    if (runtime) return runtime;
    await wait(250);
  }

  return null;
}

function waitForDeviceReady(timeoutMs) {
  if (typeof document === "undefined") {
    return Promise.resolve("no_document");
  }

  if (!isNativeLikeRuntime()) {
    return Promise.resolve("web_runtime");
  }

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId = 0;

    const finish = (reason) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("deviceready", onReady);
      window.clearTimeout(timeoutId);
      resolve(reason);
    };

    const onReady = () => finish("deviceready");

    document.addEventListener("deviceready", onReady, { once: true });
    timeoutId = window.setTimeout(() => finish("timeout"), timeoutMs);

    if (getPurchaseRuntime()) {
      finish("runtime_detected");
    }
  });
}

export function getGooglePlayProductId(planKey) {
  return PRODUCT_IDS[normalizeLower(planKey)] || "";
}

export function getGooglePlayBillingSnapshot() {
  return billingState;
}

export function subscribeToGooglePlayBilling(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  listeners.add(listener);
  listener(billingState);

  return () => {
    listeners.delete(listener);
  };
}

export async function initializeGooglePlayBilling({
  timeoutMs = BILLING_INIT_TIMEOUT_MS,
  force = false,
} = {}) {
  if (billingState.initialized && !force) {
    return billingState;
  }

  if (initPromise && !force) {
    return initPromise;
  }

  initPromise = (async () => {
    updateBillingState({
      phase: "initializing",
      pluginDetected: billingState.pluginDetected,
      available: false,
      initialized: false,
      canPurchase: false,
      message: "Connecting to Google Play billing...",
      lastError: null,
      lastEvent: "init:start",
    });

    if (typeof window === "undefined") {
      updateBillingState({
        phase: "unavailable",
        available: false,
        initialized: false,
        canPurchase: false,
        pluginDetected: false,
        message: "Google Play billing is only available inside the Android app.",
      });
      return billingState;
    }

    await waitForDeviceReady(Math.min(timeoutMs, 8000));

    const runtime = await waitForPurchasePlugin(timeoutMs);

    if (!runtime) {
      const message = isNativeLikeRuntime()
        ? "Google Play billing plugin was not detected on this build."
        : "Google Play billing is only available inside the Android app installed from Google Play.";

      updateBillingState({
        phase: "unavailable",
        available: false,
        initialized: false,
        canPurchase: false,
        pluginDetected: false,
        message,
        lastError: {
          code: "plugin_unavailable",
          message,
        },
        lastEvent: "init:plugin-missing",
      });
      return billingState;
    }

    const platform = runtime.Platform?.GOOGLE_PLAY || GOOGLE_PLAY_PLATFORM;
    const productTypeFor = (planKey) => {
      const product = getClaraProductByPlan(planKey);
      if (product?.productType === "subscription") {
        return runtime.ProductType?.PAID_SUBSCRIPTION || "paid subscription";
      }
      return runtime.ProductType?.NON_CONSUMABLE || "non consumable";
    };

    runtime.store.verbosity = runtime.LogLevel?.INFO ?? runtime.store.verbosity;
    attachStoreListeners(runtime);

    runtime.store.register(
      Object.entries(PRODUCT_IDS).map(([planKey, id]) => ({
        id,
        type: productTypeFor(planKey),
        platform,
      }))
    );

    try {
      await Promise.race([
        runtime.store.initialize([platform]),
        new Promise((_, reject) =>
          window.setTimeout(
            () => reject(createBillingError("Google Play billing initialization timed out.", "init_timeout")),
            timeoutMs
          )
        ),
      ]);
    } catch (error) {
      const billingError = createBillingError(
        error?.message || "Could not initialize Google Play billing.",
        error?.code || "init_failed",
        toSerializable(error)
      );

      debugLog("error", "Initialization failed", billingError.details || billingError.message);
      updateBillingState({
        phase: billingError.code === "init_timeout" ? "timeout" : "error",
        available: false,
        initialized: false,
        canPurchase: false,
        pluginDetected: true,
        message: billingError.message,
        lastError: {
          code: billingError.code,
          message: billingError.message,
        },
        lastEvent: "init:error",
      });
      return billingState;
    }

    const discoveredProducts = {};
    Object.values(PRODUCT_IDS).forEach((productId) => {
      const product = getStoreProduct(productId);
      if (product) {
        discoveredProducts[productId] = normalizeStoreProduct(product);
      }
    });

    const hasProducts = Object.keys(discoveredProducts).length > 0;
    const message = hasProducts
      ? "Google Play billing is ready."
      : "Google Play billing connected, but the products are not available for this account yet.";

    updateBillingState({
      phase: hasProducts ? "ready" : "unavailable",
      available: hasProducts,
      initialized: true,
      pluginDetected: true,
      canPurchase: hasProducts,
      message,
      products: discoveredProducts,
      lastError: hasProducts
        ? null
        : {
            code: "products_missing",
            message,
          },
      lastEvent: "init:complete",
    });

    debugLog("info", "Initialization completed", {
      packageName: PACKAGE_NAME,
      products: discoveredProducts,
    });

    return billingState;
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

export async function launchGooglePlayPurchase({
  productId,
  planKey,
  userId,
  userEmail,
}) {
  const normalizedProductId = normalize(productId);

  if (!BILLING_PRODUCT_IDS.has(normalizedProductId)) {
    throw createBillingError("This CLARA plan is not mapped to a valid Google Play product.", "invalid_product");
  }

  const initState = await initializeGooglePlayBilling();

  if (!initState.available) {
    throw createBillingError(
      initState.message || "Google Play billing is unavailable on this device.",
      initState.lastError?.code || "billing_unavailable",
      initState.lastError
    );
  }

  if (billingState.busyProductId) {
    throw createBillingError(
      "A Google Play purchase is already in progress. Please finish that one first.",
      "purchase_in_progress"
    );
  }

  const runtime = getPurchaseRuntime();
  if (!runtime?.store) {
    throw createBillingError("Google Play billing runtime is not available.", "runtime_unavailable");
  }

  const product = getStoreProduct(normalizedProductId);
  if (!product) {
    throw createBillingError(
      "This Google Play product could not be found for the current build or tester account.",
      "product_not_found"
    );
  }

  const offer = getProductOffer(product);
  if (!offer && typeof runtime.store.order !== "function") {
    throw createBillingError(
      "Google Play product is loaded, but no purchase offer is available.",
      "offer_unavailable"
    );
  }

  debugLog("info", "Launching purchase", {
    packageName: PACKAGE_NAME,
    planKey,
    productId: normalizedProductId,
    userId: normalize(userId),
    userEmail: normalize(userEmail),
  });

  updateBillingState({
    busyProductId: normalizedProductId,
    canPurchase: false,
    message: "Opening Google Play...",
    lastError: null,
    lastEvent: `purchase:start:${normalizedProductId}`,
  });

  return new Promise(async (resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      rejectPurchase(
        normalizedProductId,
        createBillingError(
          "Google Play did not return a purchase result before timing out.",
          "purchase_timeout"
        )
      );
    }, PURCHASE_TIMEOUT_MS);

    purchaseRequests.set(normalizedProductId, {
      productId: normalizedProductId,
      resolve,
      reject,
      timeoutId,
      settled: false,
      startedAt: Date.now(),
    });

    try {
      let orderResult;

      if (offer && typeof offer.order === "function") {
        orderResult = await offer.order();
      } else {
        orderResult = await runtime.store.order(normalizedProductId);
      }

      if (isStoreError(orderResult)) {
        if (isCancellationError(orderResult, runtime.ErrorCode)) {
          resolvePurchase(normalizedProductId, {
            ok: false,
            cancelled: true,
            productId: normalizedProductId,
            raw: toSerializable(orderResult),
          });
          return;
        }

        rejectPurchase(
          normalizedProductId,
          createBillingError(
            orderResult?.message || "Google Play could not start the purchase flow.",
            orderResult?.code || "order_failed",
            toSerializable(orderResult)
          )
        );
      }
    } catch (error) {
      if (isCancellationError(error, runtime.ErrorCode)) {
        resolvePurchase(normalizedProductId, {
          ok: false,
          cancelled: true,
          productId: normalizedProductId,
          raw: toSerializable(error),
        });
        return;
      }

      rejectPurchase(
        normalizedProductId,
        createBillingError(
          error?.message || "Google Play could not start the purchase flow.",
          error?.code || "order_failed",
          toSerializable(error)
        )
      );
    }
  });
}

export async function restoreGooglePlayPurchases() {
  const initState = await initializeGooglePlayBilling({ force: true });
  if (!initState.pluginDetected) return initState;

  const runtime = getPurchaseRuntime();
  if (!runtime?.store) return initState;

  updateBillingState({
    message: "Checking Google Play purchases...",
    lastEvent: "restore:start",
  });

  try {
    if (typeof runtime.store.restorePurchases === "function") {
      await runtime.store.restorePurchases();
    } else if (typeof runtime.store.update === "function") {
      await runtime.store.update();
    }

    updateBillingState({
      message: "Google Play purchases checked.",
      lastError: null,
      lastEvent: "restore:complete",
    });
  } catch (error) {
    updateBillingState({
      message: error?.message || "Could not check Google Play purchases.",
      lastError: {
        code: error?.code || "restore_failed",
        message: error?.message || "Could not check Google Play purchases.",
      },
      lastEvent: "restore:error",
    });
    throw error;
  }

  return billingState;
}

export async function persistGooglePlayPurchase({
  supabase,
  userId,
  planKey,
  productId,
  purchaseToken,
  orderId,
  bridgePayload,
}) {
  const invokePayload = {
    plan_key: planKey,
    product_id: productId,
    purchase_token: purchaseToken || null,
    order_id: orderId || null,
    package_name: PACKAGE_NAME,
    purchase_payload: bridgePayload || null,
  };

  try {
    const { data, error } = await supabase.functions.invoke("verify-google-play-purchase", {
      body: invokePayload,
    });

    if (!error && data?.ok) {
      return data.enrollment_id || data.purchase_id || null;
    }

    debugLog("warn", "Server verification returned pending", {
      error: error?.message,
      data,
    });
  } catch (error) {
    debugLog("warn", "Server verification unavailable; recording pending purchase", toSerializable(error));
  }

  const payload = {
    user_id: userId,
    plan: planKey,
    plan_key: planKey,
    tier_type: getClaraProductByPlan(planKey)?.tierType || planKey,
    product_id: productId,
    play_product_id: productId,
    purchase_token: purchaseToken || null,
    play_purchase_token: purchaseToken || null,
    order_id: orderId || null,
    source: "google_play",
    purchase_source: "google_play",
    status: "google_play_pending",
    purchase_payload: bridgePayload || null,
  };

  const { data: existing, error: existingError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const { error } = await supabase.from("enrollments").update(payload).eq("id", existing.id);

    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase.from("enrollments").insert([payload]).select("id").single();

  if (error) throw error;
  return data?.id || null;
}

export async function waitForGooglePlayEntitlement({
  supabase,
  userId,
  expectedPlanKey,
  timeoutMs = 15000,
  pollMs = 1500,
}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const [{ data: profile }, { data: enrollment }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const profilePlan = normalizeLower(profile?.plan);
    const enrollmentPlan = normalizeLower(enrollment?.plan_key || enrollment?.plan);
    const enrollmentStatus = normalizeLower(enrollment?.status);

    const unlocked =
      SUCCESS_STATUSES.has(enrollmentStatus) ||
      profile?.program_active === true ||
      profile?.is_enrolled === true ||
      (profilePlan && profilePlan === normalizeLower(expectedPlanKey)) ||
      (enrollmentPlan &&
        enrollmentPlan === normalizeLower(expectedPlanKey) &&
        SUCCESS_STATUSES.has(enrollmentStatus));

    if (unlocked) {
      return {
        status: "active",
        profile: profile || null,
        enrollment: enrollment || null,
      };
    }

    await wait(pollMs);
  }

  return { status: "pending" };
}
