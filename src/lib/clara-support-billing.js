import { supabase } from "@/lib/supabaseClient";
import { getSupportTier } from "@/lib/clara-support";

const normalize = (value) => String(value ?? "").trim();

function makeError(message, extra = {}) {
  const error = new Error(message);
  Object.assign(error, extra);
  return error;
}

function getBillingBridge() {
  if (typeof window === "undefined") return null;
  return window?.ClaraBilling || window?.Capacitor?.Plugins?.ClaraBilling || null;
}

async function callBridge(methodName, payload) {
  const bridge = getBillingBridge();
  const method = bridge?.[methodName];
  if (typeof method !== "function") {
    throw makeError("Google Play Billing is not available in this build.", {
      code: "BILLING_UNAVAILABLE",
    });
  }
  const result = payload === undefined
    ? await method.call(bridge)
    : await method.call(bridge, payload);
  if (typeof result !== "string") return result || {};
  try {
    return JSON.parse(result);
  } catch {
    return { rawValue: result };
  }
}

export async function purchaseClaraSupport({ tierKey, user }) {
  const tier = getSupportTier(tierKey);
  if (!tier) throw makeError("Unsupported CLARA support tier.", { code: "INVALID_TIER" });
  if (!user?.id) throw makeError("Please sign in before supporting CLARA.", { code: "AUTH_REQUIRED" });

  const connection = await callBridge("connect");
  const connectCode = String(connection?.responseCode ?? "OK").toUpperCase();
  if (connection?.ok === false || !["OK", "0"].includes(connectCode)) {
    throw makeError(connection?.debugMessage || "Google Play Billing is not ready.", {
      code: connectCode || "BILLING_UNAVAILABLE",
    });
  }

  const productQuery = await callBridge("queryProducts", {
    productId: tier.productId,
    productIds: [tier.productId],
    productType: "subs",
    productTypes: { [tier.productId]: "subs" },
  });
  const foundIds = Array.isArray(productQuery?.foundProductIds)
    ? productQuery.foundProductIds.map(normalize)
    : [];
  if (productQuery?.ok === false || (foundIds.length && !foundIds.includes(tier.productId))) {
    throw makeError("This support tier is not available in Google Play yet.", {
      code: "ITEM_UNAVAILABLE",
    });
  }

  const purchase = await callBridge("launchPurchase", {
    productId: tier.productId,
    planKey: `support_${tier.key}`,
    productType: "subs",
    userId: user.id,
    userEmail: user.email || "",
    purchaseIntent: `clara_support_${tier.key}`,
  });

  const responseCode = String(purchase?.responseCode ?? "OK").toUpperCase();
  if (purchase?.cancelled === true || responseCode === "USER_CANCELED" || responseCode === "1") {
    return { status: "cancelled" };
  }

  const purchaseState = String(purchase?.purchaseState ?? "").toUpperCase();
  const pending = purchase?.pending === true || purchaseState === "PENDING" || purchaseState === "2";
  if (pending) return { status: "pending" };

  const token = normalize(purchase?.purchaseToken);
  if (!token) {
    throw makeError("Google Play did not return a completed support purchase.", {
      code: responseCode || "PURCHASE_NOT_COMPLETED",
    });
  }

  const { data, error } = await supabase.functions.invoke("verify-clara-support-purchase", {
    body: {
      tier: tier.key,
      product_id: tier.productId,
      purchase_token: token,
      order_id: normalize(purchase?.orderId) || null,
      package_name: "com.clara.lifeos.app",
    },
  });

  if (error || !data?.ok) {
    throw error || makeError(data?.error || "Support verification failed.", {
      code: data?.code || "VERIFICATION_FAILED",
    });
  }

  return { status: "active", support: data.support || null };
}

export function customSupportAvailability() {
  return {
    enabled: false,
    reason: "Flexible custom-amount payments are not connected yet. Fixed monthly support tiers remain available.",
  };
}
