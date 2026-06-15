import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, LogOut, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  launchGooglePlayPurchase,
  persistGooglePlayPurchase,
  waitForGooglePlayEntitlement,
} from "@/lib/google-play-billing";
import {
  COMMITTED_PLAN_KEY,
  COMMITTED_PRODUCT_ID,
  readDeveloperMembershipPreview,
} from "@/lib/membership";
import useUserRole from "@/hooks/useUserRole";
import DashboardMeLifePanel from "@/components/fresh/main-dashboard/dashboard-panels/me/DashboardMeLifePanel";
import DashboardSchedulePanel from "@/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel";
import {
  OPEN_COMMITMENT_BOOKLET_EVENT,
  useCommittedFeatureAccess,
} from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";
import {
  CLARA_COMMITMENT_BOOKLET_PAGES,
  TRIAL_PURCHASE_INTENT,
  readCommitmentBookletIntentFromSession,
} from "@/lib/clara-commitment-framework";

const CLARA_COMMITMENT_PRODUCT_ID = COMMITTED_PRODUCT_ID;
const CLARA_COMMITMENT_UNLOCK_PLAN = COMMITTED_PLAN_KEY;
const COMMITMENT_DECLINE_HOME_EVENT = "clara:commitment-decline-home";
const DIRECT_MONTHLY_PURCHASE_INTENT = "monthly_direct";
const TRIAL_UNAVAILABLE_USER_MESSAGE =
  "The free trial is not available on this Google Play account. You can still continue for ₱249/month.";
const OFFER_LOAD_ERROR_MESSAGE =
  "CLARA could not load the offer right now. Please check your connection and try again.";
const PURCHASE_START_ERROR_MESSAGE = "CLARA could not start the purchase right now. Please try again.";
const GOOGLE_PLAY_ALREADY_SUBSCRIBED_MESSAGE =
  "Google Play says this account is already subscribed. Tap Restore Purchase to connect it to CLARA.";
const RESTORE_TOKEN_NOT_FOUND_MESSAGE =
  "Google Play says this account may already be subscribed, but CLARA could not read the purchase token yet. Please close the app, reopen it, then tap Restore Purchase again.";
const POST_PURCHASE_CONFIRMING_MESSAGE = "Confirming your CLARA access...";
const POST_PURCHASE_CONFIRM_ERROR_MESSAGE =
  "Payment completed. CLARA is still confirming your access. Please tap Restore Purchase if it does not unlock in a few seconds.";
const PURCHASE_LINKED_TO_ANOTHER_ACCOUNT_CODE = "PURCHASE_LINKED_TO_ANOTHER_CLARA_ACCOUNT";
const PURCHASE_LINKED_TO_ANOTHER_ACCOUNT_MESSAGE =
  "This Google Play subscription is already linked to another CLARA account. Please sign in with the original CLARA account that made the purchase.";

function readPlanPreview() {
  return readDeveloperMembershipPreview();
}

function normalizeOfferPurchaseIntent(nextPurchaseIntent) {
  return nextPurchaseIntent === TRIAL_PURCHASE_INTENT ? TRIAL_PURCHASE_INTENT : DIRECT_MONTHLY_PURCHASE_INTENT;
}

function normalizeBillingText(value) {
  return String(value ?? "").trim();
}

function parseBillingBridgeResult(result) {
  if (!result) return {};
  if (typeof result === "string") {
    try {
      return JSON.parse(result);
    } catch {
      return { rawValue: result };
    }
  }
  return result;
}

function getBillingBridge() {
  if (typeof window === "undefined") return null;
  return window?.ClaraBilling || window?.Capacitor?.Plugins?.ClaraBilling || null;
}

function getBridgePurchaseProductId(purchase = {}) {
  return normalizeBillingText(
    purchase?.productId ||
      purchase?.product_id ||
      purchase?.sku ||
      purchase?.product ||
      purchase?.subscriptionId ||
      purchase?.subscription_id
  );
}

function extractBridgePurchases(parsed = {}) {
  return [
    ...(Array.isArray(parsed?.purchases) ? parsed.purchases : []),
    ...(Array.isArray(parsed?.items) ? parsed.items : []),
    ...(Array.isArray(parsed?.purchaseList) ? parsed.purchaseList : []),
    ...(Array.isArray(parsed?.purchaseDataList) ? parsed.purchaseDataList : []),
    ...(Array.isArray(parsed?.subscriptions) ? parsed.subscriptions : []),
    ...(parsed?.purchase ? [parsed.purchase] : []),
    ...(parsed?.item ? [parsed.item] : []),
    ...(parsed?.subscription ? [parsed.subscription] : []),
  ]
    .map(parseBillingBridgeResult)
    .filter(Boolean);
}

function getBridgePurchaseToken(parsed = {}, matchedPurchase = null) {
  const source = matchedPurchase || parsed || {};
  return normalizeBillingText(
    source?.purchaseToken ||
      source?.token ||
      source?.purchase_token ||
      parsed?.purchaseToken ||
      parsed?.token ||
      parsed?.purchase_token
  );
}

function getBridgeOrderId(parsed = {}, matchedPurchase = null) {
  const source = matchedPurchase || parsed || {};
  return normalizeBillingText(source?.orderId || source?.order_id || parsed?.orderId || parsed?.order_id);
}

function getBridgeSubscriptionFields(parsed = {}, matchedPurchase = null) {
  const source = matchedPurchase || parsed || {};
  return {
    subscriptionId: normalizeBillingText(
      source?.subscriptionId || source?.subscription_id || source?.productId || source?.product_id
    ),
    basePlanId: normalizeBillingText(source?.basePlanId || source?.base_plan_id || source?.basePlan || source?.offerBasePlanId),
    offerId: normalizeBillingText(source?.offerId || source?.offer_id),
    offerToken: normalizeBillingText(
      source?.offerToken ||
        source?.offer_token ||
        source?.subscriptionOfferToken ||
        source?.subscription_offer_token
    ),
    trialOffer: source?.trialOffer === true || source?.trial_offer === true,
  };
}

function normalizeRestorePayloadFromBridge(parsed = {}, methodName = "restore") {
  const purchases = extractBridgePurchases(parsed);
  const matchedPurchase =
    purchases.find((purchase) => getBridgePurchaseProductId(purchase) === CLARA_COMMITMENT_PRODUCT_ID) ||
    (getBridgePurchaseProductId(parsed) === CLARA_COMMITMENT_PRODUCT_ID ? parsed : null) ||
    purchases.find((purchase) => getBridgePurchaseToken(purchase));
  const purchaseToken = getBridgePurchaseToken(parsed, matchedPurchase);

  if (!purchaseToken) return null;

  return {
    ok: true,
    restored: true,
    cancelled: false,
    responseCode: "ITEM_ALREADY_OWNED",
    productId: CLARA_COMMITMENT_PRODUCT_ID,
    purchaseToken,
    orderId: getBridgeOrderId(parsed, matchedPurchase),
    ...getBridgeSubscriptionFields(parsed, matchedPurchase),
    raw: { ...parsed, restored: true, restoredVia: methodName, matchedPurchase },
  };
}

async function restoreGooglePlayCommitmentPurchase({ userId, userEmail }) {
  const bridge = getBillingBridge();
  if (!bridge) {
    throw new Error("Google Play Billing bridge was not found in this app build.");
  }

  const payload = {
    productId: CLARA_COMMITMENT_PRODUCT_ID,
    planKey: CLARA_COMMITMENT_UNLOCK_PLAN,
    productType: "subs",
    userId: normalizeBillingText(userId),
    userEmail: normalizeBillingText(userEmail),
    purchaseContext: "committed_restore",
  };
  const restoreMethods = [
    "restorePurchases",
    "restorePurchase",
    "queryOwnedPurchases",
    "getPurchases",
    "queryPurchases",
    "getOwnedPurchases",
    "getPurchaseHistory",
  ];
  const errors = [];

  for (const methodName of restoreMethods) {
    const method = bridge?.[methodName];
    if (typeof method !== "function") continue;

    try {
      const parsed = parseBillingBridgeResult(await method.call(bridge, payload));
      const restoredPurchase = normalizeRestorePayloadFromBridge(parsed, methodName);
      if (restoredPurchase) return restoredPurchase;
      errors.push(`${methodName}: no purchase token`);
    } catch (error) {
      errors.push(`${methodName}: ${error?.message || error?.debugMessage || "failed"}`);
    }
  }

  const restoreError = new Error(RESTORE_TOKEN_NOT_FOUND_MESSAGE);
  restoreError.responseCode = "ITEM_ALREADY_OWNED";
  restoreError.debugMessage = `Restore methods did not return a purchase token. ${errors.join(" | ")}`;
  throw restoreError;
}

function isTrialUnavailableError(error) {
  const code = String(error?.responseCode || error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  const debugMessage = String(error?.debugMessage || error?.details || "").toLowerCase();
  const combined = `${message} ${debugMessage}`;

  return (
    (code === "ITEM_UNAVAILABLE" && combined.includes("trial")) ||
    combined.includes("trial offer is not available") ||
    combined.includes("no eligible 7-day trial") ||
    combined.includes("free p7d") ||
    combined.includes("free p1w")
  );
}

function isUserCancelledPurchaseError(error) {
  const code = String(error?.responseCode || error?.code || "").toUpperCase();
  const message = String(error?.message || error?.debugMessage || error?.details || "").toLowerCase();
  return code === "USER_CANCELED" || message.includes("user canceled") || message.includes("user cancelled") || message.includes("cancelled");
}

function isGooglePlayAlreadySubscribedError(error) {
  const code = String(error?.responseCode || error?.code || error?.raw?.responseCode || error?.raw?.code || "").toUpperCase();
  const message = String(error?.message || error?.debugMessage || error?.details || error?.raw?.message || error || "").toLowerCase();

  return (
    code === "ITEM_ALREADY_OWNED" ||
    message.includes("already subscribed") ||
    message.includes("already own") ||
    message.includes("already owned") ||
    message.includes("item already owned") ||
    message.includes("already purchased") ||
    message.includes("account is already subscribed")
  );
}

function isLinkedToAnotherClaraAccountError(error) {
  const code = String(error?.responseCode || error?.code || error?.raw?.code || "").toUpperCase();
  const message = String(error?.message || error?.debugMessage || error?.details || error?.raw?.error || error || "").toLowerCase();

  return (
    code === PURCHASE_LINKED_TO_ANOTHER_ACCOUNT_CODE ||
    message.includes("already linked to another user") ||
    message.includes("already linked to another clara account") ||
    message.includes("original clara account")
  );
}

function isConfirmedGooglePlayPurchase(purchaseResult) {
  if (!purchaseResult || purchaseResult.cancelled === true) return false;
  return Boolean(
    purchaseResult.ok === true ||
      purchaseResult.restored === true ||
      purchaseResult.purchaseToken ||
      purchaseResult.purchase_token ||
      purchaseResult.transactionId ||
      purchaseResult.transaction_id ||
      purchaseResult.orderId ||
      purchaseResult.order_id
  );
}

function getFriendlyBillingError(error, context = "purchase") {
  if (isLinkedToAnotherClaraAccountError(error)) return PURCHASE_LINKED_TO_ANOTHER_ACCOUNT_MESSAGE;
  if (isGooglePlayAlreadySubscribedError(error)) return GOOGLE_PLAY_ALREADY_SUBSCRIBED_MESSAGE;
  if (context === "post_purchase_confirm") return POST_PURCHASE_CONFIRM_ERROR_MESSAGE;

  const rawMessage = String(error?.message || error?.debugMessage || error?.details || error || "").toLowerCase();
  if (rawMessage.includes("failed to fetch") || rawMessage.includes("network")) {
    return OFFER_LOAD_ERROR_MESSAGE;
  }

  if (rawMessage.includes("not ready") || rawMessage.includes("billing unavailable")) {
    return "Google Play is not ready yet. Please try again in a moment.";
  }

  return PURCHASE_START_ERROR_MESSAGE;
}

async function openGooglePlayCommitmentPurchase({ userId, userEmail, purchaseIntent }) {
  return launchGooglePlayPurchase({
    productId: CLARA_COMMITMENT_PRODUCT_ID,
    planKey: CLARA_COMMITMENT_UNLOCK_PLAN,
    userId,
    userEmail,
    purchaseIntent,
    trialDays: purchaseIntent === TRIAL_PURCHASE_INTENT ? 7 : undefined,
  });
}

function ClaraCommitmentBookletModal({
  open,
  onClose,
  onDeclineTrial,
  purchaseIntent = TRIAL_PURCHASE_INTENT,
}) {
  const [bookletPage, setBookletPage] = useState(0);
  const [commitmentOfferOpen, setCommitmentOfferOpen] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [postPurchaseConfirming, setPostPurchaseConfirming] = useState(false);
  const [canRestorePurchase, setCanRestorePurchase] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [offerPurchaseIntent, setOfferPurchaseIntent] = useState(() => normalizeOfferPurchaseIntent(purchaseIntent));
  const carouselRef = useRef(null);
  const { user, refreshUser } = useUserRole();
  const isTrialIntent = purchaseIntent === TRIAL_PURCHASE_INTENT;
  const isTrialOffer = offerPurchaseIntent === TRIAL_PURCHASE_INTENT;
  const purchaseButtonLabel = postPurchaseConfirming
    ? "Confirming access..."
    : purchaseBusy
      ? "Opening Google Play..."
      : isTrialOffer
        ? "Start 7-day trial"
        : "Continue for ₱249/month";

  useEffect(() => {
    if (!open) return;

    setBookletPage(0);
    setCommitmentOfferOpen(false);
    setPurchaseBusy(false);
    setPostPurchaseConfirming(false);
    setCanRestorePurchase(false);
    setPurchaseMessage("");
    setOfferPurchaseIntent(normalizeOfferPurchaseIntent(purchaseIntent));

    window.requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({ left: 0, behavior: "auto" });
    });
  }, [open, purchaseIntent]);

  if (!open) return null;

  const activateCommitmentAccess = async (purchaseResult, activePurchaseIntent) => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const activeUserId = user?.id || authUser?.id;
    const purchaseToken =
      purchaseResult?.purchaseToken ||
      purchaseResult?.purchase_token ||
      purchaseResult?.raw?.purchaseToken ||
      purchaseResult?.raw?.purchase_token ||
      purchaseResult?.raw?.matchedPurchase?.purchaseToken ||
      purchaseResult?.raw?.matchedPurchase?.purchase_token ||
      "";
    const orderId =
      purchaseResult?.orderId ||
      purchaseResult?.order_id ||
      purchaseResult?.raw?.orderId ||
      purchaseResult?.raw?.order_id ||
      purchaseResult?.raw?.matchedPurchase?.orderId ||
      purchaseResult?.raw?.matchedPurchase?.order_id ||
      "";

    if (!activeUserId) {
      throw new Error("Please sign in first before starting your CLARA commitment.");
    }
    if (!purchaseToken) {
      throw new Error("Google Play did not return a purchase token, so CLARA did not activate access.");
    }

    await persistGooglePlayPurchase({
      supabase,
      userId: activeUserId,
      planKey: CLARA_COMMITMENT_UNLOCK_PLAN,
      productId: CLARA_COMMITMENT_PRODUCT_ID,
      purchaseToken,
      orderId,
      bridgePayload: {
        ...(purchaseResult?.raw || purchaseResult),
        purchaseIntent: activePurchaseIntent,
      },
    });

    const entitlement = await waitForGooglePlayEntitlement({
      supabase,
      userId: activeUserId,
      expectedPlanKey: CLARA_COMMITMENT_UNLOCK_PLAN,
    });
    if (!["active", "trialing"].includes(entitlement.status)) {
      throw new Error("Your purchase was verified, but membership activation is still syncing.");
    }

    await refreshUser?.();
  };

  const confirmCommittedAccessFromPurchase = async (purchaseResult, activePurchaseIntent) => {
    setCanRestorePurchase(false);
    setPostPurchaseConfirming(true);
    setPurchaseMessage(POST_PURCHASE_CONFIRMING_MESSAGE);
    console.info("[CLARA Billing] Refreshing committed entitlement");

    try {
      await activateCommitmentAccess(purchaseResult, activePurchaseIntent);
      console.info("[CLARA Billing] Committed entitlement confirmed");
      setPurchaseMessage("Commitment active. Unlocking CLARA...");
      onClose();
    } catch (confirmError) {
      console.error("[CLARA Billing] Entitlement refresh failed after successful purchase", confirmError);
      setCanRestorePurchase(!isLinkedToAnotherClaraAccountError(confirmError));
      setPurchaseMessage(getFriendlyBillingError(confirmError, "post_purchase_confirm"));
    } finally {
      setPostPurchaseConfirming(false);
    }
  };

  const handleGooglePlayCommitment = async () => {
    if (purchaseBusy) return;

    const activePurchaseIntent = offerPurchaseIntent;
    const requestingTrial = activePurchaseIntent === TRIAL_PURCHASE_INTENT;

    setPurchaseBusy(true);
    setPostPurchaseConfirming(false);
    setCanRestorePurchase(false);
    setPurchaseMessage("Opening Google Play...");
    console.info("[CLARA Billing] Google Play purchase started");

    try {
      const purchaseResult = await openGooglePlayCommitmentPurchase({
        userId: user?.id,
        userEmail: user?.email,
        purchaseIntent: activePurchaseIntent,
      });

      if (purchaseResult?.cancelled === true) {
        setPurchaseMessage("");
        return;
      }

      if (!isConfirmedGooglePlayPurchase(purchaseResult)) {
        throw new Error("Google Play did not confirm the purchase.");
      }

      console.info("[CLARA Billing] Google Play purchase success returned", {
        responseCode: purchaseResult?.responseCode || "OK",
        restored: purchaseResult?.restored === true,
      });

      await confirmCommittedAccessFromPurchase(purchaseResult, activePurchaseIntent);
    } catch (error) {
      console.error("CLARA Google Play commitment failed:", error);

      if (isUserCancelledPurchaseError(error)) {
        setPurchaseMessage("");
      } else if (requestingTrial && isTrialUnavailableError(error)) {
        setOfferPurchaseIntent(DIRECT_MONTHLY_PURCHASE_INTENT);
        setPurchaseMessage(TRIAL_UNAVAILABLE_USER_MESSAGE);
      } else if (isGooglePlayAlreadySubscribedError(error)) {
        setCanRestorePurchase(true);
        setPurchaseMessage(GOOGLE_PLAY_ALREADY_SUBSCRIBED_MESSAGE);
      } else {
        setPurchaseMessage(getFriendlyBillingError(error, "purchase"));
      }
    } finally {
      setPurchaseBusy(false);
    }
  };

  const handleRestoreGooglePlayCommitment = async () => {
    if (purchaseBusy) return;

    setPurchaseBusy(true);
    setCanRestorePurchase(false);
    setPostPurchaseConfirming(true);
    setPurchaseMessage(POST_PURCHASE_CONFIRMING_MESSAGE);
    console.info("[CLARA Billing] Restore purchase started");

    try {
      const restoredPurchase = await restoreGooglePlayCommitmentPurchase({
        userId: user?.id,
        userEmail: user?.email,
      });

      console.info("[CLARA Billing] Restore purchase found owned Google Play purchase", {
        responseCode: restoredPurchase?.responseCode || "ITEM_ALREADY_OWNED",
        restoredVia: restoredPurchase?.raw?.restoredVia || "unknown",
      });

      await confirmCommittedAccessFromPurchase(restoredPurchase, offerPurchaseIntent);
    } catch (error) {
      console.error("[CLARA Billing] Restore purchase failed:", error);
      setCanRestorePurchase(!isLinkedToAnotherClaraAccountError(error));
      setPurchaseMessage(getFriendlyBillingError(error, "post_purchase_confirm"));
    } finally {
      setPostPurchaseConfirming(false);
      setPurchaseBusy(false);
    }
  };

  const handleDeclineTrial = () => {
    if (purchaseBusy) return;

    setPurchaseMessage("");
    setCanRestorePurchase(false);
    setCommitmentOfferOpen(false);
    onDeclineTrial?.();
  };

  const goToPage = (targetPage) => {
    const nextPage = Math.min(Math.max(targetPage, 0), CLARA_COMMITMENT_BOOKLET_PAGES.length - 1);
    const carousel = carouselRef.current;

    setBookletPage(nextPage);

    if (carousel) {
      carousel.scrollTo({
        left: carousel.clientWidth * nextPage,
        behavior: "smooth",
      });
    }
  };

  const handleCarouselScroll = (event) => {
    const carousel = event.currentTarget;
    if (!carousel.clientWidth) return;

    const currentPage = Math.round(carousel.scrollLeft / carousel.clientWidth);
    const safePage = Math.min(Math.max(currentPage, 0), CLARA_COMMITMENT_BOOKLET_PAGES.length - 1);

    if (safePage !== bookletPage) setBookletPage(safePage);
  };

  const renderBookletPage = (bookletItem, index) => {
    const isFinalPage = index === CLARA_COMMITMENT_BOOKLET_PAGES.length - 1;
    const isDensePage =
      (bookletItem.paragraphs?.length || 0) +
        (bookletItem.bullets?.length || 0) +
        (bookletItem.checks?.length || 0) +
        (bookletItem.closingParagraphs?.length || 0) >
      10;
    const pageTextClass = isDensePage
      ? "mt-4 space-y-2.5 text-[clamp(0.84rem,2.95vw,0.98rem)] font-bold leading-[1.5] text-slate-100/88"
      : "mt-5 space-y-3 text-[clamp(0.92rem,3.05vw,1.03rem)] font-bold leading-[1.62] text-slate-100/88";

    return (
      <article
        key={bookletItem.label}
        className="flex h-full min-h-0 w-full min-w-full snap-center snap-always flex-col justify-center overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(135deg,#108b90_0%,#1d2f6d_44%,#2c1664_100%)] px-[clamp(24px,6vw,32px)] py-[clamp(24px,5.2vw,32px)] text-left shadow-[0_22px_58px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-24px_42px_rgba(0,0,0,0.16)]"
      >
        <div className={isDensePage ? "" : "-translate-y-[3%]"}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/48">
            {index + 1 < 10 ? `0${index + 1}` : index + 1} / {bookletItem.label.toUpperCase()}
          </p>

          <h2 className="mt-3 text-[clamp(1.58rem,6.4vw,2.1rem)] font-black leading-[1.05] tracking-[-0.055em] text-white">
            {bookletItem.title}
          </h2>

          <div className={pageTextClass}>
            {bookletItem.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}

            {bookletItem.bullets ? (
              <ul className="space-y-2">
                {bookletItem.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2.5">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200/70" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {bookletItem.checks ? (
              <ul className="space-y-2">
                {bookletItem.checks.map((check) => (
                  <li key={check} className="flex gap-2.5 text-white/92">
                    <span className="shrink-0 text-cyan-100/72">✓</span>
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {bookletItem.closingParagraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}

            {isFinalPage ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOfferPurchaseIntent(normalizeOfferPurchaseIntent(purchaseIntent));
                  setPurchaseMessage("");
                  setCanRestorePurchase(false);
                  setCommitmentOfferOpen(true);
                }}
                className="mt-4 w-full rounded-full border border-white/18 bg-white/[0.1] px-4 py-3 text-sm font-black text-white/92 transition hover:bg-white/[0.14] active:scale-[0.99]"
              >
                {isTrialIntent ? "Start 7-day trial" : "Start My Commitment"}
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#020817] px-[clamp(18px,5vw,30px)] pt-[max(18px,env(safe-area-inset-top))] pb-[max(18px,env(safe-area-inset-bottom))]"
      onClick={onClose}
    >
      <section
        className="relative mx-auto flex h-[min(88dvh,760px)] w-[92vw] max-w-[470px] flex-col overflow-hidden rounded-[38px] border border-cyan-100/14 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.16),transparent_40%),#081122] px-4 pb-5 pt-5 text-white shadow-[0_28px_86px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.08)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full border border-white/14 bg-white/[0.06] p-2 text-white/58 transition hover:bg-white/[0.1] hover:text-white/88"
          aria-label="Close commitment booklet"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10 shrink-0 pr-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-100/58">CLARA Commitment Booklet</p>
        </div>

        <div
          ref={carouselRef}
          className="relative z-10 mt-5 flex min-h-0 flex-1 snap-x snap-mandatory touch-pan-x overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={handleCarouselScroll}
        >
          {CLARA_COMMITMENT_BOOKLET_PAGES.map(renderBookletPage)}
        </div>

        <div className="relative z-10 mt-4 flex justify-center gap-1.5">
          {CLARA_COMMITMENT_BOOKLET_PAGES.map((bookletItem, index) => (
            <button
              key={bookletItem.label}
              type="button"
              onClick={() => goToPage(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${index === bookletPage ? "w-6 bg-cyan-100/64" : "w-1.5 bg-cyan-100/22"}`}
              aria-label={`Go to ${bookletItem.label}`}
            />
          ))}
        </div>

        {commitmentOfferOpen ? (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-[#020817]/84 px-5 backdrop-blur-sm"
            onClick={() => {
              if (!purchaseBusy) setCommitmentOfferOpen(false);
            }}
          >
            <div
              className="relative w-full max-w-[340px] rounded-[32px] border border-cyan-100/16 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.16),transparent_42%),#081122] px-6 py-6 text-center text-white shadow-[0_24px_70px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.08)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  if (!purchaseBusy) setCommitmentOfferOpen(false);
                }}
                className="absolute right-4 top-4 rounded-full border border-white/14 bg-white/[0.06] p-2 text-white/58 transition hover:bg-white/[0.1] hover:text-white/88"
                aria-label="Close commitment price"
                disabled={purchaseBusy}
              >
                <X className="h-4 w-4" />
              </button>

              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/48">
                {isTrialOffer ? "Trial Offer" : "Monthly Commitment"}
              </p>
              <h3 className="mt-4 text-[1.55rem] font-black leading-tight tracking-[-0.05em] text-white">So? You are ready to commit?</h3>
              <p className="mx-auto mt-3 max-w-[260px] text-sm font-bold leading-6 text-white/68">
                {isTrialOffer
                  ? "Start free first, then continue CLARA’s guided money decision experience for ₱249/month."
                  : "Continue CLARA’s guided money decision experience for ₱249/month."}
              </p>

              <div className="mt-5 rounded-[26px] border border-white/14 bg-white/[0.08] px-5 py-5">
                <p className="text-[2.05rem] font-black leading-tight tracking-[-0.065em] text-white">CLARA Commitment</p>
                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100/48">
                  {isTrialOffer ? "₱249/month after trial" : "₱249/month"}
                </p>
              </div>

              <p className="mt-4 text-xs font-bold leading-5 text-white/52">
                {isTrialOffer
                  ? "After the 7-day trial, ₱249/month. Cancel anytime in Google Play before renewal."
                  : "₱249/month. Cancel anytime in Google Play before renewal."}
              </p>

              {purchaseMessage ? (
                <p className="mt-3 rounded-[18px] border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold leading-5 text-white/62">{purchaseMessage}</p>
              ) : null}

              <div className="mt-5 grid grid-cols-1 gap-2">
                {canRestorePurchase ? (
                  <button
                    type="button"
                    onClick={handleRestoreGooglePlayCommitment}
                    disabled={purchaseBusy}
                    className="rounded-full border border-cyan-100/20 bg-cyan-100/[0.1] px-4 py-3 text-sm font-black text-cyan-50 transition hover:bg-cyan-100/[0.14] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Restore Purchase
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleGooglePlayCommitment}
                  disabled={purchaseBusy}
                  className="rounded-full border border-white/18 bg-white/[0.12] px-4 py-3 text-sm font-black text-white/92 transition hover:bg-white/[0.16] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {purchaseButtonLabel}
                </button>
                <button
                  type="button"
                  onClick={handleDeclineTrial}
                  disabled={purchaseBusy}
                  className="rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-white/42 transition hover:text-white/64 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function LockedPanelPreview({ children, onOpenCommitmentBooklet }) {
  const handleOpenCommitmentBooklet = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenCommitmentBooklet?.();
  };

  return (
    <div
      className="relative min-h-full overflow-hidden rounded-[30px]"
      onClickCapture={handleOpenCommitmentBooklet}
    >
      <div className="pointer-events-none opacity-45 grayscale-[0.85] saturate-[0.65]">{children}</div>
      <div className="absolute inset-0 z-[220] flex items-center justify-center rounded-[30px] bg-black/[0.18] backdrop-blur-[1px]">
        <div className="mx-7 max-w-[280px] rounded-[28px] border border-white/14 bg-[rgba(9,18,36,0.76)] px-5 py-4 text-center text-white shadow-[0_22px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.08] text-white/78">
            <Lock className="h-4.5 w-4.5" />
          </div>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/52">COMMITTED VERSION</p>
          <p className="mt-1 text-lg font-black tracking-[-0.03em] text-white/92">Ready to Commit?</p>
          <p className="mt-1.5 text-xs font-semibold leading-5 text-white/58">Tap to see more.</p>
        </div>
      </div>
    </div>
  );
}

function SettingsLogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("CLARA settings logout failed:", error);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="mt-5 space-y-2 pb-8">
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-rose-300/20 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_34%),rgba(244,63,94,0.08)] px-4 py-4 text-sm font-black text-rose-100 shadow-[0_14px_40px_rgba(244,63,94,0.08)] transition hover:bg-rose-500/15 active:scale-[0.99]"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
      <p className="px-3 text-center text-[10px] font-semibold leading-4 text-white/32">You can log back in anytime using your CLARA account.</p>
    </div>
  );
}

function renderSettingsWithLogout(renderSettings, fallback) {
  const settingsContent = renderSettings?.() ?? fallback;
  if (!settingsContent) return <SettingsLogoutButton />;

  return (
    <>
      {settingsContent}
      <SettingsLogoutButton />
    </>
  );
}

export { COMMITMENT_DECLINE_HOME_EVENT };

export default function DashboardPanelRenderer({
  activePanel = "home",
  renderHome,
  renderMessages,
  renderTask,
  renderSettings,
  renderMe,
  fallback = null,
  onCommitmentDecline,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const previewPlan = readPlanPreview();
  const hasCommittedAccess = useCommittedFeatureAccess({ previewPlan });
  const [commitmentBookletOpen, setCommitmentBookletOpen] = useState(false);
  const [purchaseIntent, setPurchaseIntent] = useState(TRIAL_PURCHASE_INTENT);

  const openCommitmentBooklet = useCallback((nextPurchaseIntent = TRIAL_PURCHASE_INTENT) => {
    setPurchaseIntent(nextPurchaseIntent === TRIAL_PURCHASE_INTENT ? nextPurchaseIntent : TRIAL_PURCHASE_INTENT);
    setCommitmentBookletOpen(true);
  }, []);

  const closeCommitmentBooklet = useCallback(() => {
    setCommitmentBookletOpen(false);
  }, []);

  const handleCommitmentDecline = useCallback(() => {
    setCommitmentBookletOpen(false);
    setPurchaseIntent(TRIAL_PURCHASE_INTENT);

    if (typeof onCommitmentDecline === "function") {
      onCommitmentDecline();
      return;
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(COMMITMENT_DECLINE_HOME_EVENT));
    }
  }, [onCommitmentDecline]);

  const clearConsumedBookletRouteState = useCallback(() => {
    const currentState = location.state || {};
    const hasBookletState =
      currentState.openCommitmentBooklet === true ||
      currentState.purchaseIntent === TRIAL_PURCHASE_INTENT;

    if (!hasBookletState) return;

    const {
      openCommitmentBooklet: _openCommitmentBooklet,
      purchaseIntent: _purchaseIntent,
      ...cleanState
    } = currentState;

    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      },
      {
        replace: true,
        state: Object.keys(cleanState).length > 0 ? cleanState : null,
      }
    );
  }, [location.hash, location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleOpenCommitmentBooklet = (event) => {
      const eventIntent = event?.detail?.purchaseIntent;
      openCommitmentBooklet(eventIntent === TRIAL_PURCHASE_INTENT ? eventIntent : TRIAL_PURCHASE_INTENT);
    };

    window.addEventListener(OPEN_COMMITMENT_BOOKLET_EVENT, handleOpenCommitmentBooklet);
    return () => window.removeEventListener(OPEN_COMMITMENT_BOOKLET_EVENT, handleOpenCommitmentBooklet);
  }, [openCommitmentBooklet]);

  useEffect(() => {
    const sessionIntent = readCommitmentBookletIntentFromSession();
    const locationWantsBooklet = location.state?.openCommitmentBooklet === true;
    const locationIntent =
      location.state?.purchaseIntent === TRIAL_PURCHASE_INTENT
        ? TRIAL_PURCHASE_INTENT
        : TRIAL_PURCHASE_INTENT;

    if (sessionIntent?.intent === TRIAL_PURCHASE_INTENT) {
      clearConsumedBookletRouteState();
      openCommitmentBooklet(TRIAL_PURCHASE_INTENT);
      return;
    }

    if (locationWantsBooklet) {
      clearConsumedBookletRouteState();
      openCommitmentBooklet(locationIntent);
    }
  }, [
    location.key,
    location.state,
    clearConsumedBookletRouteState,
    openCommitmentBooklet,
  ]);

  const booklet = (
    <ClaraCommitmentBookletModal
      open={commitmentBookletOpen}
      onClose={closeCommitmentBooklet}
      onDeclineTrial={handleCommitmentDecline}
      purchaseIntent={purchaseIntent}
    />
  );

  if (activePanel === "me") {
    const content = renderMe?.() ?? <DashboardMeLifePanel />;
    return (
      <>
        {!hasCommittedAccess ? (
          <LockedPanelPreview onOpenCommitmentBooklet={() => openCommitmentBooklet(TRIAL_PURCHASE_INTENT)}>{content}</LockedPanelPreview>
        ) : (
          content
        )}
        {booklet}
      </>
    );
  }

  if (activePanel === "schedule") {
    const content = <DashboardSchedulePanel />;
    return (
      <>
        {!hasCommittedAccess ? (
          <LockedPanelPreview onOpenCommitmentBooklet={() => openCommitmentBooklet(TRIAL_PURCHASE_INTENT)}>{content}</LockedPanelPreview>
        ) : (
          content
        )}
        {booklet}
      </>
    );
  }

  if (activePanel === "messages") return renderMessages?.() ?? fallback;
  if (activePanel === "task") return renderTask?.() ?? fallback;
  if (activePanel === "settings") {
    return (
      <>
        {renderSettingsWithLogout(renderSettings, fallback)}
        {booklet}
      </>
    );
  }

  return (
    <>
      {renderHome?.() ?? fallback}
      {booklet}
    </>
  );
}
