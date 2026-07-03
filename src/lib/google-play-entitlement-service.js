import {
  launchGooglePlayPurchase,
  syncGooglePlayEntitlement,
} from "@/lib/google-play-billing";
import { COMMITTED_PLAN_KEY } from "@/lib/membership";
import { COMMITTED_PRODUCT_ID } from "@/lib/local-google-play-entitlement";

export async function refreshGooglePlayEntitlement({
  localUserId,
  reason = "manual_refresh",
} = {}) {
  return syncGooglePlayEntitlement({ localUserId, reason });
}

export async function purchaseCommittedVersion({
  localUserId,
  userEmail = "",
} = {}) {
  const purchase = await launchGooglePlayPurchase({
    productId: COMMITTED_PRODUCT_ID,
    planKey: COMMITTED_PLAN_KEY,
    userId: localUserId,
    userEmail,
  });

  if (purchase?.cancelled) {
    return {
      state: "cancelled",
      isActive: false,
      isPending: false,
      purchase,
    };
  }

  if (purchase?.pending) {
    return syncGooglePlayEntitlement({
      localUserId,
      reason: "pending_recheck",
    });
  }

  return syncGooglePlayEntitlement({
    localUserId,
    reason: "purchase_completed",
  });
}

export async function restoreCommittedVersion({ localUserId } = {}) {
  return syncGooglePlayEntitlement({
    localUserId,
    reason: "restore_purchase",
  });
}

export { syncGooglePlayEntitlement };
